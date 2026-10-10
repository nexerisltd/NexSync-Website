// Remote YouTube import: the Kaggle worker pulls a job, lists the playlist, then reports tracks one by one.
// Verifies: tracks are added the moment they are reported (completion order, no waiting for slower ones),
// failures are counted, the "Importing… N left" counter returns to 0, and a worker is launched only when needed.

import type { WSBroadcastType } from "@beatsync/shared";
import { beforeEach, describe, expect, it } from "bun:test";
import { createMockServer } from "@/__tests__/mocks/websocket";
import { checkWorkerAuth, createYtRemote } from "@/lib/ytRemote";
import { globalManager } from "@/managers";

let ROOM_ID = "515151";
let roomCounter = 0;
const broadcasts: WSBroadcastType[] = [];
let launches = 0;
let clock = 1_000_000;
const last = <T>(xs: T[]) => xs[xs.length - 1];

const make = () =>
  createYtRemote({
    sendBroadcast: ({ message }) => {
      broadcasts.push(message);
    },
    launchWorker: () => {
      launches++;
      return Promise.resolve({ ok: true });
    },
    now: () => (clock += 100), // advances on every read so long-poll deadlines can expire
  });

const counts = () => broadcasts.flatMap((m) => (m.type === "STREAM_JOB_UPDATE" ? [m.activeJobCount] : []));
const sourceUrls = () => (globalManager.getRoom(ROOM_ID)?.getAudioSources() ?? []).map((s) => s.url);

describe("remote YouTube import", () => {
  beforeEach(() => {
    broadcasts.length = 0;
    launches = 0;
    clock += 10 * 60_000;
    ROOM_ID = `5151${++roomCounter}`; // fresh room per test
    globalManager.getOrCreateRoom(ROOM_ID);
  });

  it("adds tracks as they are reported and clears the counter", async () => {
    const yt = make();
    const job = yt.enqueue({
      roomId: ROOM_ID,
      url: "https://www.youtube.com/playlist?list=PLtest12345",
      server: createMockServer(),
    });
    expect(job).not.toBeNull();
    expect(last(counts())).toBe(1); // "Importing…" shows immediately
    expect(launches).toBe(1); // worker was offline -> launched

    // second import for the same room is refused while this one is active
    expect(
      yt.enqueue({ roomId: ROOM_ID, url: "https://www.youtube.com/watch?v=abcdefghijk", server: createMockServer() })
    ).toBeNull();

    const claimed = await yt.claimNext(50);
    expect(claimed?.id).toBe(job!.id);
    expect(await yt.claimNext(50)).toBeNull(); // nothing else queued

    expect(yt.handleEvent(job!.id, { type: "listed", total: 3 }).ok).toBe(true);
    expect(last(counts())).toBe(3);

    // track #1 finishes before #0: it is in the room right away
    yt.handleEvent(job!.id, { type: "track", index: 1, publicUrl: "https://cdn.test/room/second.m4a" });
    expect(sourceUrls()).toEqual(["https://cdn.test/room/second.m4a"]);
    expect(last(counts())).toBe(2);

    yt.handleEvent(job!.id, { type: "track", index: 0, publicUrl: "https://cdn.test/room/first.m4a" });
    yt.handleEvent(job!.id, { type: "failed", index: 2, reason: "Video unavailable" });
    yt.handleEvent(job!.id, { type: "done" });

    expect(sourceUrls()).toHaveLength(2);
    expect(last(counts())).toBe(0);
    expect(globalManager.getRoom(ROOM_ID)?.getActiveStreamJobCount()).toBe(0);
    const summary = broadcasts.flatMap((m) =>
      m.type === "STREAM_JOB_UPDATE" && m.importSummary ? [m.importSummary] : []
    );
    expect(summary).toEqual([{ imported: 2, failed: 1, reason: "Video unavailable" }]);

    // room is free for a new import afterwards
    expect(
      yt.enqueue({ roomId: ROOM_ID, url: "https://www.youtube.com/watch?v=abcdefghijk", server: createMockServer() })
    ).not.toBeNull();
  });

  it("ignores a track/failed event that is delivered twice (worker retried the request)", async () => {
    const yt = make();
    const job = yt.enqueue({
      roomId: ROOM_ID,
      url: "https://www.youtube.com/playlist?list=PLtest12345",
      server: createMockServer(),
    });
    await yt.claimNext(50);
    yt.handleEvent(job!.id, { type: "listed", total: 2 });

    const url = `${process.env.S3_PUBLIC_URL ?? "https://cdn.test"}/room-${ROOM_ID}/one.m4a`;
    yt.handleEvent(job!.id, { type: "track", index: 0, publicUrl: url });
    yt.handleEvent(job!.id, { type: "track", index: 0, publicUrl: url }); // duplicate
    yt.handleEvent(job!.id, { type: "failed", index: 1, reason: "boom" });
    yt.handleEvent(job!.id, { type: "failed", index: 1, reason: "boom" }); // duplicate

    expect(sourceUrls()).toHaveLength(1);
    expect(yt.getJob(job!.id)?.imported).toBe(1);
    expect(yt.getJob(job!.id)?.failed).toBe(1);
    expect(last(counts())).toBe(0);
  });

  it("does not launch another worker while one is polling", async () => {
    const yt = make();
    await yt.claimNext(0); // worker heartbeat
    yt.enqueue({ roomId: ROOM_ID, url: "https://www.youtube.com/watch?v=abcdefghijk", server: createMockServer() });
    expect(launches).toBe(0);
  });

  it("reports an unreadable playlist as a failed import", () => {
    const yt = make();
    const job = yt.enqueue({
      roomId: ROOM_ID,
      url: "https://www.youtube.com/playlist?list=PLprivate123",
      server: createMockServer(),
    })!;
    yt.handleEvent(job.id, { type: "done", reason: "Could not read that playlist" });
    const summary = broadcasts.flatMap((m) =>
      m.type === "STREAM_JOB_UPDATE" && m.importSummary ? [m.importSummary] : []
    );
    expect(summary[0]).toEqual({ imported: 0, failed: 1, reason: "Could not read that playlist" });
    expect(last(counts())).toBe(0);
  });

  it("checks the worker secret", () => {
    const old = process.env.YT_WORKER_SECRET;
    delete process.env.YT_WORKER_SECRET;
    expect(checkWorkerAuth(new Request("http://x/worker/next"))).toBe("not_configured");
    process.env.YT_WORKER_SECRET = "s3cret-value";
    expect(checkWorkerAuth(new Request("http://x", { headers: { authorization: "Bearer s3cret-value" } }))).toBe("ok");
    expect(checkWorkerAuth(new Request("http://x", { headers: { authorization: "Bearer wrong-value!" } }))).toBe(
      "unauthorized"
    );
    if (old === undefined) delete process.env.YT_WORKER_SECRET;
    else process.env.YT_WORKER_SECRET = old;
  });
});
