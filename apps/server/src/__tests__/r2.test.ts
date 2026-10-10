import { describe, expect, it } from "bun:test";
import { createKey, extractKeyFromUrl, generateAudioFileName, getPublicAudioUrl, toStorageSafeName } from "@/lib/r2";

describe("R2 Pure Functions", () => {
  describe("createKey", () => {
    it("should create a key with room prefix", () => {
      expect(createKey("123", "audio.mp3")).toBe("room-123/audio.mp3");
    });

    it("should handle special characters in fileName", () => {
      expect(createKey("456", "my song (1).mp3")).toBe("room-456/my song (1).mp3");
    });
  });

  describe("getPublicAudioUrl", () => {
    it("should return a URL with encoded filename", () => {
      const url = getPublicAudioUrl("123", "song.mp3");
      expect(url).toContain("/room-123/");
      expect(url).toContain("song.mp3");
    });

    it("should encode special characters in filename", () => {
      const url = getPublicAudioUrl("123", "my song #1.mp3");
      expect(url).toContain(encodeURIComponent("my song #1.mp3"));
    });
  });

  describe("extractKeyFromUrl", () => {
    it("should extract key from a public URL", () => {
      const key = extractKeyFromUrl("https://cdn.example.com/room-123/song.mp3");
      expect(key).toBe("room-123/song.mp3");
    });

    it("should decode URL-encoded filenames", () => {
      const key = extractKeyFromUrl("https://cdn.example.com/room-123/my%20song%20%231.mp3");
      expect(key).toBe("room-123/my song #1.mp3");
    });

    it("should return null for invalid URLs", () => {
      const key = extractKeyFromUrl("not-a-url");
      expect(key).toBeNull();
    });
  });

  describe("generateAudioFileName", () => {
    it("should preserve the file extension", () => {
      const name = generateAudioFileName("track.wav");
      expect(name).toEndWith(".wav");
    });

    it("should sanitize the filename", () => {
      const name = generateAudioFileName("path/to/song.mp3");
      expect(name).not.toContain("/");
    });

    it("should truncate very long names", () => {
      const longName = "a".repeat(500) + ".mp3";
      const name = generateAudioFileName(longName);
      // 400 chars max for name + delimiter + timestamp + extension
      expect(name.length).toBeLessThan(500);
    });

    it("should fallback to 'audio' for names that sanitize to empty", () => {
      // Characters that get fully stripped by sanitize
      const name = generateAudioFileName(".mp3");
      expect(name).toMatch(/^audio___/);
    });
  });

  describe("storage-safe names (Supabase InvalidKey regression)", () => {
    const SAFE = /^[A-Za-z0-9 _\-.()',!]+$/;

    it("removes characters that S3-compatible providers reject", () => {
      const name = toStorageSafeName("Song (Official Video) [4K] #1 {live} 100% ~best~ `x` ^y");
      expect(name).toMatch(SAFE);
      expect(name).toContain("Song (Official Video)");
      expect(name).not.toMatch(/[[\]{}#%~`^]/);
    });

    it("strips accents and falls back for titles with no Latin characters", () => {
      expect(toStorageSafeName("Café Déjà Vu")).toBe("Cafe Deja Vu");
      expect(toStorageSafeName("আমি তোমাকে ভালোবাসি 🎵", "YouTube abc")).toBe("YouTube abc");
      expect(toStorageSafeName("🎵🎵", "audio")).toBe("audio");
    });

    it("keeps Unicode letters when S3_ALLOW_UNICODE_KEYS=1", () => {
      process.env.S3_ALLOW_UNICODE_KEYS = "1";
      try {
        expect(toStorageSafeName("আমি তোমাকে [live]")).toBe("আমি তোমাকে live");
      } finally {
        delete process.env.S3_ALLOW_UNICODE_KEYS;
      }
    });

    it("never produces the name/timestamp delimiter inside the name and keeps the object key valid", () => {
      const key = generateAudioFileName("a___b [x] | y.m4a", "YouTube id");
      const [name] = key.split("___");
      expect(name).toBe("a_b x y");
      expect(key).toEndWith(".m4a");
      expect(key).toMatch(/^[A-Za-z0-9 _\-.()',!*]+$/);
    });

    it("gives two tracks with the same name different keys", () => {
      expect(generateAudioFileName("same.m4a")).not.toBe(generateAudioFileName("same.m4a"));
    });

    it("treats a name without an extension as an mp3 title", () => {
      expect(generateAudioFileName("Just A Title")).toMatch(/^Just A Title___.*\.mp3$/);
    });
  });
});
