import { randomUUID, timingSafeEqual } from "node:crypto";
import { globalManager } from "@/managers";
import { kaggleConfigured, pushKaggleWorker } from "@/lib/kaggle";
import { sendBroadcast } from "@/utils/responses";
import type { BunServer } from "@/utils/websocket";

/**
 * Remote YouTube import (YT_IMPORT_MODE=remote).
 *
 * Render's IP is often blocked by YouTube, so yt-dlp runs on another machine (a Kaggle notebook) that
 * *pulls* jobs from this server. This file is the job queue + progress bookkeeping. Tracks are added to
 * the room the moment the worker reports them, in completion order, so nothing waits for a slow track.
 */

export type RemoteStatus = "queued" | "running" | "done";

export interface RemoteJob {
  id: string;
  roomId: string;
  url: string;
  status: RemoteStatus;
  createdAt: number;
  lastEventAt: number;
  total: number;
  imported: number;
  failed: number;
  lastError?: string;
  /** stream-job ids currently counted for this job (drives the "Importing… N left" counter) */
  pending: Set<string>;
  /** track indexes that already reported track/failed, so a retried HTTP request can't count a track twice */
  handled: Set<number>;
  server: BunServer;
}

export interface RemoteDeps {
  sendBroadcast: typeof sendBroadcast;
  launchWorker: () => Promise<{ ok: boolean; error?: string }>;
  now: () => number;
}

const WORKER_ONLINE_MS = 30_000; // worker polls every ~8s
const QUEUE_TIMEOUT_MS = Number(process.env.YT_QUEUE_TIMEOUT_MS ?? 12 * 60_000); // nobody picked the job up
const STALL_TIMEOUT_MS = Number(process.env.YT_STALL_TIMEOUT_MS ?? 15 * 60_000); // worker went silent mid-job
const LAUNCH_COOLDOWN_MS = 5 * 60_000;

export const workerSecret = () => (process.env.YT_WORKER_SECRET ?? "").trim();
export const publicServerUrl = () =>
  (process.env.SERVER_PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? "").trim().replace(/\/$/, "");
export const isRemoteMode = () => process.env.YT_IMPORT_MODE === "remote";
export const MAX_TRACKS = () => Number(process.env.YT_IMPORT_MAX_TRACKS ?? 50);

export function checkWorkerAuth(req: Request): "ok" | "unauthorized" | "not_configured" {
  const secret = workerSecret();
  if (!secret) return "not_configured";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "unauthorized";
}

export function createYtRemote(deps?: Partial<RemoteDeps>) {
  const d: RemoteDeps = {
    sendBroadcast,
    launchWorker: async () => {
      const server = publicServerUrl();
      if (!kaggleConfigured()) return { ok: false, error: "Kaggle is not configured" };
      if (!server || !workerSecret()) return { ok: false, error: "SERVER_PUBLIC_URL / YT_WORKER_SECRET missing" };
      return pushKaggleWorker({
        NEXSYNC_SERVER: server,
        NEXSYNC_WORKER_SECRET: workerSecret(),
        IDLE_SECONDS: String(Math.round(Number(process.env.KAGGLE_IDLE_MIN ?? 15) * 60)),
        ...(process.env.YT_DL_CONCURRENCY ? { DL_CONCURRENCY: process.env.YT_DL_CONCURRENCY } : {}),
      });
    },
    now: () => Date.now(),
    ...deps,
  };

  const jobs = new Map<string, RemoteJob>();
  const roomJob = new Map<string, string>(); // roomId -> active job id
  let lastSeen = 0;
  let lastLaunch = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const workerOnline = () => d.now() - lastSeen < WORKER_ONLINE_MS;

  const broadcastCount = (job: RemoteJob, summary?: { imported: number; failed: number; reason?: string }) => {
    const room = globalManager.getRoom(job.roomId);
    if (!room) return;
    d.sendBroadcast({
      server: job.server,
      roomId: job.roomId,
      message: {
        type: "STREAM_JOB_UPDATE",
        activeJobCount: room.getActiveStreamJobCount(),
        ...(summary ? { importSummary: summary } : {}),
      },
    });
  };

  const addPending = (job: RemoteJob, id: string) => {
    const room = globalManager.getRoom(job.roomId);
    if (!room || job.pending.has(id)) return;
    job.pending.add(id);
    if (!room.hasActiveStreamJob(id)) room.addStreamJob(id);
  };

  const clearPending = (job: RemoteJob, id: string) => {
    if (!job.pending.delete(id)) return;
    globalManager.getRoom(job.roomId)?.removeStreamJob(id);
  };

  const finish = (job: RemoteJob, reason?: string) => {
    if (job.status === "done") return;
    job.status = "done";
    for (const id of [...job.pending]) clearPending(job, id);
    if (roomJob.get(job.roomId) === job.id) roomJob.delete(job.roomId);
    const failed = Math.max(job.failed, Math.max(job.total - job.imported, 0), reason && job.imported === 0 ? 1 : 0);
    broadcastCount(job, { imported: job.imported, failed, reason: reason ?? job.lastError });
    console.log(`✅ Remote YouTube import ${job.id} finished for room ${job.roomId}: ${job.imported}/${job.total}`);
    setTimeout(() => jobs.delete(job.id), 10 * 60_000).unref?.();
  };

  const ensureWorker = async () => {
    if (workerOnline() || d.now() - lastLaunch < LAUNCH_COOLDOWN_MS) return;
    lastLaunch = d.now();
    const res = await d.launchWorker();
    if (res.ok) console.log("🚀 Kaggle YouTube worker started (first job begins in ~1-3 min)");
    else {
      console.warn("Could not start the Kaggle worker:", res.error);
      lastLaunch = 0; // allow a retry on the next import
    }
  };

  const tick = () => {
    const t = d.now();
    for (const job of jobs.values()) {
      if (job.status === "queued") {
        if (t - job.createdAt > QUEUE_TIMEOUT_MS) {
          finish(job, "No cloud worker picked up the import. Is the Kaggle worker running?");
        } else if (!workerOnline() && t - job.createdAt > 90_000) void ensureWorker();
      } else if (job.status === "running" && t - job.lastEventAt > STALL_TIMEOUT_MS) {
        finish(job, "The cloud worker stopped responding.");
      }
    }
    if (jobs.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  return {
    isWorkerOnline: workerOnline,
    ensureWorker,
    tick,

    /** Queue an import. Returns null when this room already has one running. */
    enqueue({ roomId, url, server }: { roomId: string; url: string; server: BunServer }): RemoteJob | null {
      if (roomJob.has(roomId)) return null;
      const job: RemoteJob = {
        id: randomUUID().slice(0, 12),
        roomId,
        url,
        status: "queued",
        createdAt: d.now(),
        lastEventAt: d.now(),
        total: 0,
        imported: 0,
        failed: 0,
        pending: new Set(),
        handled: new Set(),
        server,
      };
      jobs.set(job.id, job);
      roomJob.set(roomId, job.id);
      addPending(job, `yt-remote-${job.id}`); // shows "Importing…" immediately, even while the worker boots
      broadcastCount(job);
      timer ??= setInterval(tick, 20_000);
      timer.unref?.();
      void ensureWorker();
      return job;
    },

    /** Long-poll used by the worker: resolves with the oldest queued job, or null after waitMs. */
    async claimNext(waitMs: number): Promise<RemoteJob | null> {
      lastSeen = d.now();
      const deadline = d.now() + waitMs;
      for (;;) {
        const next = [...jobs.values()]
          .filter((j) => j.status === "queued")
          .sort((a, b) => a.createdAt - b.createdAt)[0];
        if (next) {
          next.status = "running";
          next.lastEventAt = d.now();
          return next;
        }
        if (d.now() >= deadline) return null;
        await Bun.sleep(400);
        lastSeen = d.now();
      }
    },

    handleEvent(
      jobId: string,
      ev:
        | { type: "listed"; total: number; truncated?: boolean }
        | { type: "track"; index: number; publicUrl: string }
        | { type: "failed"; index: number; reason?: string }
        | { type: "done"; reason?: string }
    ): { ok: boolean; error?: string } {
      const job = jobs.get(jobId);
      if (!job) return { ok: false, error: "Unknown job" };
      job.lastEventAt = d.now();
      if (job.status === "done") return { ok: false, error: "Job already finished" };

      switch (ev.type) {
        case "listed": {
          job.total = ev.total;
          clearPending(job, `yt-remote-${job.id}`);
          for (let i = 0; i < ev.total; i++) addPending(job, `yt-${job.id}-${i}`);
          broadcastCount(job);
          return { ok: true };
        }
        case "track": {
          if (job.handled.has(ev.index)) return { ok: true }; // duplicate delivery (worker retried the request)
          job.handled.add(ev.index);
          const room = globalManager.getRoom(job.roomId);
          if (room) {
            const sources = room.addAudioSource({ url: ev.publicUrl });
            job.imported++;
            d.sendBroadcast({
              server: job.server,
              roomId: job.roomId,
              message: { type: "ROOM_EVENT", event: { type: "SET_AUDIO_SOURCES", sources } },
            });
          }
          clearPending(job, `yt-${job.id}-${ev.index}`);
          broadcastCount(job);
          return { ok: true };
        }
        case "failed": {
          if (job.handled.has(ev.index)) return { ok: true };
          job.handled.add(ev.index);
          job.failed++;
          if (ev.reason) job.lastError = ev.reason;
          clearPending(job, `yt-${job.id}-${ev.index}`);
          broadcastCount(job);
          return { ok: true };
        }
        case "done": {
          finish(job, ev.reason);
          return { ok: true };
        }
      }
    },

    getJob: (id: string) => jobs.get(id),
  };
}

export const ytRemote = createYtRemote();
