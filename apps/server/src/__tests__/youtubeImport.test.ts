// Tests POST /upload/youtube-playlist end-to-end with a fake yt-dlp and injected R2/broadcast deps:
// tracks are added to the room in playlist order, failures are skipped, only one import runs per room,
// and the stream-job counter returns to zero. No global module mocks, so it can't affect other test files.

import type { WSBroadcastType } from "@beatsync/shared";
import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { installFakeYtdlp } from "@/__tests__/helpers_fakeYtdlp";
import { createMockServer } from "@/__tests__/mocks/websocket";
import { globalManager } from "@/managers";
import { createYoutubeImportHandler } from "@/routes/youtubeImport";

const isWindows = process.platform === "win32";
const removeFake = installFakeYtdlp();
afterAll(removeFake);

const ROOM_ID = "424242";
const broadcasts: WSBroadcastType[] = [];
const uploaded: { roomId: string; fileName: string; contentType: string }[] = [];

const handler = createYoutubeImportHandler({
  validateR2Config: () => ({ isValid: true, errors: [] }),
  generateAudioFileName: (name: string) => name,
  uploadBytes: (_bytes, roomId, fileName, contentType = "audio/mpeg") => {
    uploaded.push({ roomId, fileName, contentType });
    return Promise.resolve(`https://cdn.test/room-${roomId}/${encodeURIComponent(fileName)}`);
  },
  sendBroadcast: ({ message }) => {
    broadcasts.push(message);
  },
  // Own tiny response helpers: other test files replace @/utils/responses with stubs globally.
  jsonResponse: (data, status = 200) => new Response(JSON.stringify(data), { status }),
  errorResponse: (message, status = 400) => new Response(message, { status }),
});

const post = (body: unknown) =>
  handler(
    new Request("http://localhost/upload/youtube-playlist", { method: "POST", body: JSON.stringify(body) }),
    createMockServer()
  );

const jobCounts = () => broadcasts.flatMap((m) => (m.type === "STREAM_JOB_UPDATE" ? [m.activeJobCount] : []));

async function waitUntilFinished() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const counts = jobCounts();
    if (counts.length > 1 && counts[counts.length - 1] === 0) return;
    await Bun.sleep(25);
  }
  throw new Error("import did not finish in time");
}

describe.skipIf(isWindows)("POST /upload/youtube-playlist", () => {
  beforeEach(() => {
    broadcasts.length = 0;
    uploaded.length = 0;
    globalManager.getOrCreateRoom(ROOM_ID);
  });

  it("rejects non-youtube links and unknown rooms", async () => {
    expect((await post({ roomId: ROOM_ID, url: "https://example.com/x" })).status).toBe(400);
    expect((await post({ roomId: "999999", url: "https://www.youtube.com/playlist?list=PLtest12345" })).status).toBe(
      404
    );
  });

  it("returns 422 when yt-dlp cannot read the playlist", async () => {
    expect((await post({ roomId: ROOM_ID, url: "https://www.youtube.com/playlist?list=PLprivate123" })).status).toBe(
      422
    );
  });

  it("imports tracks as they finish (no head-of-line blocking), skips failures, and clears the job counter", async () => {
    const url = "https://music.youtube.com/playlist?list=PLtest12345";
    const res = await post({ roomId: ROOM_ID, url });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, queued: 4, truncated: false });

    // A second import for the same room is refused while the first is running
    expect((await post({ roomId: ROOM_ID, url })).status).toBe(429);

    await waitUntilFinished();

    const room = globalManager.getRoom(ROOM_ID);
    const urls = (room?.getAudioSources() ?? []).map((s) => decodeURIComponent(s.url));
    expect(urls).toHaveLength(3); // "Broken" failed to download, so it is skipped
    // Tracks are added as soon as they are ready, so the slow first track no longer blocks the others.
    expect(urls.some((u) => u.includes("First (slow).m4a"))).toBe(true);
    expect(urls.some((u) => u.includes("Second.m4a"))).toBe(true);
    expect(urls.some((u) => u.includes("Fourth.m4a"))).toBe(true);
    const slowIdx = urls.findIndex((u) => u.includes("First (slow).m4a"));
    const secondIdx = urls.findIndex((u) => u.includes("Second.m4a"));
    expect(secondIdx).toBeLessThan(slowIdx); // fast track lands before the slow one
    expect(uploaded.every((u) => u.contentType === "audio/mp4" && u.roomId === ROOM_ID)).toBe(true);

    // counter went up to 4 and back down to 0
    expect(jobCounts()[0]).toBe(4);
    expect(room?.getActiveStreamJobCount()).toBe(0);

    // and a new import is allowed again afterwards
    expect((await post({ roomId: ROOM_ID, url })).status).toBe(200);
    await waitUntilFinished();
  });

  it("retries an upload with a plain 'YouTube <id>' name when the bucket rejects the title (InvalidKey)", async () => {
    const roomId = "424243";
    globalManager.getOrCreateRoom(roomId);
    const seen: string[] = [];
    const picky = createYoutubeImportHandler({
      validateR2Config: () => ({ isValid: true, errors: [] }),
      generateAudioFileName: (name: string) => name,
      uploadBytes: (_bytes, rid, fileName) => {
        seen.push(fileName);
        // pretend the bucket refuses any real title, like Supabase does for "[4K]" or Bangla names
        if (!fileName.startsWith("YouTube ")) return Promise.reject(new Error("HTTP 400 InvalidKey"));
        return Promise.resolve(`https://cdn.test/room-${rid}/${encodeURIComponent(fileName)}`);
      },
      sendBroadcast: ({ message }) => {
        broadcasts.push(message);
      },
      jsonResponse: (data, status = 200) => new Response(JSON.stringify(data), { status }),
      errorResponse: (message, status = 400) => new Response(message, { status }),
    });

    broadcasts.length = 0;
    const res = await picky(
      new Request("http://localhost/upload/youtube-playlist", {
        method: "POST",
        body: JSON.stringify({ roomId, url: "https://www.youtube.com/watch?v=bbbbbbbbbbb" }),
      }),
      createMockServer()
    );
    expect(res.status).toBe(200);

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && !broadcasts.some((m) => m.type === "STREAM_JOB_UPDATE" && m.importSummary)) {
      await Bun.sleep(25);
    }

    // the fake yt-dlp lists 3 playable tracks; each one was refused under its real title, then accepted as "YouTube <id>"
    const urls = (globalManager.getRoom(roomId)?.getAudioSources() ?? []).map((src) => decodeURIComponent(src.url));
    expect(urls).toHaveLength(3);
    expect(urls.some((u) => u.includes("YouTube aaaaaaaaaaa.m4a"))).toBe(true);
    expect(urls.some((u) => u.includes("YouTube bbbbbbbbbbb.m4a"))).toBe(true);
    expect(urls.some((u) => u.includes("YouTube ddddddddddd.m4a"))).toBe(true);
    expect(seen).toContain("First (slow).m4a"); // the first try used the real title
  });
});
