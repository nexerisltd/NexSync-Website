import type { YoutubeImportResponseType } from "@beatsync/shared";
import { YoutubeImportSchema } from "@beatsync/shared";
import pLimit from "p-limit";
import { generateAudioFileName, uploadBytes, validateR2Config } from "@/lib/r2";
import { isRemoteMode, ytRemote } from "@/lib/ytRemote";
import { downloadAudio, listEntries, parseYoutubeUrl, YtDlpNotInstalledError } from "@/lib/ytdlp";
import type { PlaylistEntry } from "@/lib/ytdlp";
import { globalManager } from "@/managers";
import { errorResponse, jsonResponse, sendBroadcast } from "@/utils/responses";
import type { BunServer } from "@/utils/websocket";

// Injected so tests can run the whole flow without touching R2 or sockets (no global module mocks needed).
export interface YoutubeImportDeps {
  validateR2Config: typeof validateR2Config;
  generateAudioFileName: typeof generateAudioFileName;
  uploadBytes: typeof uploadBytes;
  sendBroadcast: typeof sendBroadcast;
  jsonResponse: typeof jsonResponse;
  errorResponse: typeof errorResponse;
}

const defaultDeps: YoutubeImportDeps = {
  validateR2Config,
  generateAudioFileName,
  uploadBytes,
  sendBroadcast,
  jsonResponse,
  errorResponse,
};

const MAX_TRACKS = Number(process.env.YT_IMPORT_MAX_TRACKS ?? 50);
const CONCURRENCY = Number(process.env.YT_IMPORT_CONCURRENCY ?? 2);

// One shared limiter for the whole server so many rooms can't overload it.
const downloadLimit = pLimit(CONCURRENCY);
// Uploads to the bucket run on their own limiter so the next download starts while the previous file uploads.
const uploadLimit = pLimit(Number(process.env.YT_IMPORT_UPLOAD_CONCURRENCY ?? 2));
// Caps tracks "in the pipeline" (downloaded but not yet uploaded) so temp files can't pile up on small disks.
const pipelineLimit = pLimit(CONCURRENCY + 2);
// Rooms that currently have a playlist import running (one at a time per room).
const roomsImporting = new Set<string>();

/**
 * POST /upload/youtube-playlist  { roomId, url }
 *
 * Validates the link, lists the playlist, then downloads + uploads the tracks in the
 * background and adds them to the room in playlist order. Progress is reported through
 * the existing STREAM_JOB_UPDATE broadcast (same counter the music search uses).
 */
export const createYoutubeImportHandler =
  (deps: YoutubeImportDeps = defaultDeps) =>
  async (req: Request, server: BunServer) => {
    try {
      if (req.method !== "POST") {
        return deps.errorResponse("Method not allowed", 405);
      }

      if (process.env.YT_IMPORT_DISABLED === "1") {
        return deps.errorResponse("YouTube import is disabled on this server", 403);
      }

      const r2Validation = deps.validateR2Config();
      if (!r2Validation.isValid) {
        console.error("R2 configuration errors:", r2Validation.errors);
        return deps.errorResponse("R2 configuration not complete", 500);
      }

      const body: unknown = await req.json();
      const parseResult = YoutubeImportSchema.safeParse(body);
      if (!parseResult.success) {
        return deps.errorResponse(`Invalid request data: ${parseResult.error.message}`, 400);
      }
      const { roomId, url } = parseResult.data;

      const room = globalManager.getRoom(roomId);
      if (!room) {
        return deps.errorResponse("Room not found. Please join the room before importing.", 404);
      }

      const target = parseYoutubeUrl(url);
      if (!target) {
        return deps.errorResponse("Please paste a valid YouTube or YouTube Music playlist/video link", 400);
      }

      // Remote mode: yt-dlp runs on a cloud worker (Kaggle) because YouTube blocks this server's IP.
      // The worker lists the playlist and reports each track as soon as it is ready.
      if (isRemoteMode()) {
        const job = ytRemote.enqueue({ roomId, url: target.url, server });
        if (!job) {
          return deps.errorResponse("An import is already running for this room. Please wait for it to finish.", 429);
        }
        const remoteResponse: YoutubeImportResponseType = { success: true, queued: 0, truncated: false };
        return deps.jsonResponse(remoteResponse);
      }

      if (roomsImporting.has(roomId)) {
        return deps.errorResponse("An import is already running for this room. Please wait for it to finish.", 429);
      }

      let listing;
      try {
        listing = await listEntries(target, MAX_TRACKS);
      } catch (error) {
        if (error instanceof YtDlpNotInstalledError) {
          console.error(error.message);
          return deps.errorResponse("YouTube import is not set up on this server (yt-dlp missing)", 501);
        }
        console.error("yt-dlp list failed:", error);
        return deps.errorResponse(
          "Could not read that playlist. It may be private, unavailable, or YouTube blocked the server.",
          422
        );
      }

      const { entries, truncated } = listing;
      if (entries.length === 0) {
        return deps.errorResponse("No playable videos found in that link", 422);
      }

      // Re-check right before starting: the list call is async.
      if (roomsImporting.has(roomId)) {
        return deps.errorResponse("An import is already running for this room. Please wait for it to finish.", 429);
      }
      roomsImporting.add(roomId);

      // Fire and forget — the HTTP response returns immediately.
      void importEntries({ roomId, entries, server, deps }).finally(() => roomsImporting.delete(roomId));

      const response: YoutubeImportResponseType = { success: true, queued: entries.length, truncated };
      return deps.jsonResponse(response);
    } catch (error) {
      console.error("Error handling YouTube import:", error);
      return deps.errorResponse("Failed to start YouTube import", 500);
    }
  };

export const handleYoutubeImport = createYoutubeImportHandler();

const broadcastJobCount = (deps: YoutubeImportDeps, server: BunServer, roomId: string) => {
  const room = globalManager.getRoom(roomId);
  if (!room) return;
  deps.sendBroadcast({
    server,
    roomId,
    message: { type: "STREAM_JOB_UPDATE", activeJobCount: room.getActiveStreamJobCount() },
  });
};

async function importEntries({
  roomId,
  entries,
  server,
  deps,
}: {
  roomId: string;
  entries: PlaylistEntry[];
  server: BunServer;
  deps: YoutubeImportDeps;
}) {
  const room = globalManager.getRoom(roomId);
  if (!room) return;

  const jobIds = entries.map((e) => `yt-${e.id}`);
  const startedJobs = new Set<string>();
  for (const jobId of jobIds) {
    if (!room.hasActiveStreamJob(jobId)) {
      room.addStreamJob(jobId);
      startedJobs.add(jobId);
    }
  }
  broadcastJobCount(deps, server, roomId);

  const finishJob = (jobId: string) => {
    const r = globalManager.getRoom(roomId);
    if (r && startedJobs.delete(jobId)) {
      r.removeStreamJob(jobId);
      broadcastJobCount(deps, server, roomId);
    }
  };

  let lastError: string | undefined;
  let imported = 0;

  const withRetry = async <T>(
    label: string,
    entry: PlaylistEntry,
    fn: (attempt: number) => Promise<T>
  ): Promise<T | null> => {
    // One retry per stage: free hosts + YouTube throttling fail transiently.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!globalManager.getRoom(roomId)) return null; // room closed — stop early
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(
          `YouTube import ${label} failed for "${entry.title}" (${entry.id}), attempt ${attempt + 1}:`,
          error
        );
      }
    }
    return null;
  };

  // Pipeline per track: download -> upload -> add to queue the moment it's ready.
  // Tracks no longer wait for earlier ones, and the next download overlaps the previous upload.
  const processEntry = (entry: PlaylistEntry, jobId: string | undefined) =>
    pipelineLimit(async () => {
      let downloaded: Awaited<ReturnType<typeof downloadAudio>> | null = null;
      try {
        downloaded = await withRetry("download", entry, () => downloadLimit(() => downloadAudio(entry.id)));
        if (!downloaded) return;
        const file = downloaded;

        // Name fallback: untitled/non-Latin titles become "YouTube <id>"; if the storage still rejects the key
        // (400 InvalidKey on some providers), the second attempt uses that minimal name.
        const fallbackName = `YouTube ${entry.id}`;
        const url = await withRetry("upload", entry, (attempt) =>
          uploadLimit(async () => {
            const bytes = await Bun.file(file.filePath).arrayBuffer();
            if (!globalManager.getRoom(roomId)) throw new Error("Room closed during import");
            const title = attempt === 0 ? entry.title : fallbackName;
            const fileName = deps.generateAudioFileName(`${title}.${file.extension}`, fallbackName);
            return deps.uploadBytes(bytes, roomId, fileName, file.contentType);
          })
        );

        const currentRoom = globalManager.getRoom(roomId);
        if (url && currentRoom) {
          const sources = currentRoom.addAudioSource({ url });
          imported++;
          deps.sendBroadcast({
            server,
            roomId,
            message: { type: "ROOM_EVENT", event: { type: "SET_AUDIO_SOURCES", sources } },
          });
        }
      } finally {
        await downloaded?.cleanup();
        if (jobId) finishJob(jobId);
      }
    });

  await Promise.all(entries.map((entry, i) => processEntry(entry, jobIds[i])));

  const failed = entries.length - imported;
  const finalRoom = globalManager.getRoom(roomId);
  if (finalRoom) {
    deps.sendBroadcast({
      server,
      roomId,
      message: {
        type: "STREAM_JOB_UPDATE",
        activeJobCount: finalRoom.getActiveStreamJobCount(),
        importSummary: { imported, failed, reason: failed > 0 ? lastError : undefined },
      },
    });
  }

  console.log(`✅ YouTube import finished for room ${roomId}: ${imported}/${entries.length} tracks added`);
}
