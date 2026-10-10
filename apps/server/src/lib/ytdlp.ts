import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Thin wrapper around the `yt-dlp` CLI used to import YouTube / YouTube Music
 * playlists into a room. Arguments are always passed as an array (never through a
 * shell) and URLs are rebuilt from validated IDs, so user input can't inject flags.
 */

const ytdlpBin = () => process.env.YTDLP_BIN ?? "yt-dlp";
const LIST_TIMEOUT_MS = 90_000;
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;
const MAX_FILE_SIZE = process.env.YT_IMPORT_MAX_FILE_SIZE ?? "80M";

const ALLOWED_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{10,80}$/;

export interface YoutubeTarget {
  kind: "playlist" | "video";
  id: string;
  url: string;
}

/**
 * Validates a user supplied link and returns a canonical URL.
 * - Any link carrying a `list=` param (playlist page, music.youtube.com playlist,
 *   watch?v=..&list=..) is treated as a playlist.
 * - Otherwise a single video (watch?v=, youtu.be/, /shorts/) is accepted.
 */
export function parseYoutubeUrl(raw: string): YoutubeTarget | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!ALLOWED_HOSTS.has(u.hostname.toLowerCase())) return null;

  const list = u.searchParams.get("list");
  if (list) {
    if (!PLAYLIST_ID_RE.test(list)) return null;
    return { kind: "playlist", id: list, url: `https://www.youtube.com/playlist?list=${list}` };
  }

  let videoId: string | null = null;
  if (u.hostname === "youtu.be") {
    videoId = u.pathname.split("/")[1] ?? null;
  } else if (u.pathname === "/watch") {
    videoId = u.searchParams.get("v");
  } else if (u.pathname.startsWith("/shorts/")) {
    videoId = u.pathname.split("/")[2] ?? null;
  }

  if (videoId && VIDEO_ID_RE.test(videoId)) {
    return { kind: "video", id: videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
  }
  return null;
}

export interface PlaylistEntry {
  id: string;
  title: string;
}

export class YtDlpNotInstalledError extends Error {
  constructor() {
    super(`yt-dlp not found (looked for "${ytdlpBin()}"). Install yt-dlp on the server.`);
    this.name = "YtDlpNotInstalledError";
  }
}

// Extra flags from the env (e.g. "--cookies /app/cookies.txt"), split on whitespace.
function extraArgs(): string[] {
  const raw = process.env.YTDLP_EXTRA_ARGS?.trim();
  return raw ? raw.split(/\s+/) : [];
}

async function run(args: string[], timeoutMs: number): Promise<string> {
  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn([ytdlpBin(), ...extraArgs(), ...args], {
      stdout: "pipe",
      stderr: "pipe",
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new YtDlpNotInstalledError();
    throw error;
  }

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout as ReadableStream).text(),
    new Response(proc.stderr as ReadableStream).text(),
    proc.exited,
  ]);

  if (code !== 0) {
    const lastLine = stderr.trim().split("\n").filter(Boolean).pop();
    throw new Error(lastLine ?? `yt-dlp exited with code ${code}`);
  }
  return stdout;
}

const UNAVAILABLE_TITLES = new Set(["[Private video]", "[Deleted video]"]);

/** Lists the videos of a playlist (or the single video) without downloading anything. */
export async function listEntries(
  target: YoutubeTarget,
  max: number
): Promise<{ entries: PlaylistEntry[]; truncated: boolean }> {
  // Ask for one more than we need so we can tell whether the playlist was cut off.
  const stdout = await run(
    ["--flat-playlist", "--dump-single-json", "--no-warnings", "--playlist-end", String(max + 1), "--", target.url],
    LIST_TIMEOUT_MS
  );

  const json = JSON.parse(stdout) as {
    id?: string;
    title?: string;
    entries?: ({ id?: string; title?: string } | null)[];
  };

  const raw = json.entries ?? [{ id: json.id, title: json.title }];
  const seen = new Set<string>();
  const entries: PlaylistEntry[] = [];
  for (const e of raw) {
    if (!e?.id || !VIDEO_ID_RE.test(e.id) || seen.has(e.id)) continue;
    if (e.title && UNAVAILABLE_TITLES.has(e.title)) continue;
    seen.add(e.id);
    entries.push({ id: e.id, title: e.title?.trim() ?? e.id });
  }

  const truncated = entries.length > max;
  return { entries: entries.slice(0, max), truncated };
}

const CONTENT_TYPES: Record<string, string> = {
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
  webm: "audio/webm",
  opus: "audio/ogg",
  ogg: "audio/ogg",
};

export interface DownloadedAudio {
  filePath: string;
  extension: string;
  contentType: string;
  cleanup: () => Promise<void>;
}

/**
 * Downloads the audio of one video into a temp dir.
 * Default is m4a (AAC) which every browser can decode and needs no ffmpeg.
 * Set YT_AUDIO_FORMAT=mp3 to transcode to mp3 (requires ffmpeg on the server).
 */
export async function downloadAudio(videoId: string): Promise<DownloadedAudio> {
  if (!VIDEO_ID_RE.test(videoId)) throw new Error("Invalid video id");

  const dir = await mkdtemp(path.join(tmpdir(), "beatsync-yt-"));
  const cleanup = () => rm(dir, { recursive: true, force: true });

  try {
    const asMp3 = process.env.YT_AUDIO_FORMAT === "mp3";
    const formatArgs = asMp3
      ? ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
      : ["-f", "bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio"];

    await run(
      [
        ...formatArgs,
        "--no-playlist",
        "--no-warnings",
        "--max-filesize",
        MAX_FILE_SIZE,
        "-o",
        path.join(dir, "%(id)s.%(ext)s"),
        "--",
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      DOWNLOAD_TIMEOUT_MS
    );

    const files = (await readdir(dir)).filter((f) => !f.endsWith(".part") && !f.endsWith(".ytdl"));
    const file = files[0];
    if (!file) throw new Error("yt-dlp produced no audio file (file may exceed the size limit)");

    const extension = path.extname(file).slice(1).toLowerCase() || "m4a";
    return {
      filePath: path.join(dir, file),
      extension,
      contentType: CONTENT_TYPES[extension] ?? "audio/mpeg",
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
