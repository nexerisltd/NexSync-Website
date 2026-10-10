// Tests the YouTube link validation and the yt-dlp wrapper (against a fake yt-dlp executable, no network).

import { afterAll, describe, expect, it } from "bun:test";
import { installFakeYtdlp } from "@/__tests__/helpers_fakeYtdlp";
import { downloadAudio, listEntries, parseYoutubeUrl, YtDlpNotInstalledError } from "@/lib/ytdlp";

const isWindows = process.platform === "win32";
const removeFake = installFakeYtdlp();
afterAll(removeFake);

describe("parseYoutubeUrl", () => {
  it("treats any link with list= as a playlist and canonicalises it", () => {
    expect(parseYoutubeUrl("https://music.youtube.com/playlist?list=PLabcdefghij123&si=xyz")).toEqual({
      kind: "playlist",
      id: "PLabcdefghij123",
      url: "https://www.youtube.com/playlist?list=PLabcdefghij123",
    });
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdefghij123")?.kind).toBe("playlist");
  });

  it("accepts single videos", () => {
    expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=3")?.url).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(parseYoutubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.kind).toBe("video");
  });

  it("rejects other hosts, bad ids and non-urls", () => {
    expect(parseYoutubeUrl("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYoutubeUrl("https://youtube.com.evil.com/playlist?list=PLabcdefghij123")).toBeNull();
    expect(parseYoutubeUrl("https://www.youtube.com/playlist?list=--exec%20rm")).toBeNull();
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseYoutubeUrl("file:///etc/passwd")).toBeNull();
    expect(parseYoutubeUrl("not a url")).toBeNull();
  });
});

describe.skipIf(isWindows)("yt-dlp wrapper (fake binary)", () => {
  it("lists entries, dropping private ones, and reports truncation", async () => {
    const target = parseYoutubeUrl("https://www.youtube.com/playlist?list=PLtest12345");
    if (!target) throw new Error("expected a valid target");

    const all = await listEntries(target, 10);
    expect(all.entries.map((e) => e.id)).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb", "failVideo01", "ddddddddddd"]);
    expect(all.truncated).toBe(false);

    const cut = await listEntries(target, 2);
    expect(cut.entries).toHaveLength(2);
    expect(cut.truncated).toBe(true);
  });

  it("downloads audio to a temp file and cleans it up", async () => {
    const audio = await downloadAudio("bbbbbbbbbbb");
    expect(audio.extension).toBe("m4a");
    expect(audio.contentType).toBe("audio/mp4");
    expect(await Bun.file(audio.filePath).text()).toBe("audio-bbbbbbbbbbb");
    await audio.cleanup();
    expect(await Bun.file(audio.filePath).exists()).toBe(false);
  });

  it("rejects ids that are not 11 safe characters (no flag injection)", async () => {
    const outcome = await downloadAudio("--exec=evil").then(
      () => "resolved",
      (error: Error) => error.message
    );
    expect(outcome).toBe("Invalid video id");
  });

  it("reports a clear error when yt-dlp is not installed", async () => {
    const original = process.env.YTDLP_BIN;
    process.env.YTDLP_BIN = "/definitely/not/here/yt-dlp";
    try {
      const target = parseYoutubeUrl("https://www.youtube.com/playlist?list=PLtest12345");
      if (!target) throw new Error("expected a valid target");
      const error = await listEntries(target, 5).then(
        () => null,
        (e: unknown) => e
      );
      expect(error).toBeInstanceOf(YtDlpNotInstalledError);
    } finally {
      process.env.YTDLP_BIN = original;
    }
  });
});
