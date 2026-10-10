import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Creates a fake `yt-dlp` executable (a tiny bun script) for tests, and points YTDLP_BIN at it.
 * It "lists" a 5-entry playlist (one private, one that fails to download, one slow) and
 * "downloads" by writing a small file, so no network or real yt-dlp is needed.
 */
export function installFakeYtdlp(): () => void {
  const dir = mkdtempSync(path.join(tmpdir(), "fake-ytdlp-"));
  const bin = path.join(dir, "yt-dlp");
  writeFileSync(
    bin,
    `#!${process.execPath}
const fs = require("fs");
const args = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  if (args.includes("--flat-playlist")) {
    const url = args[args.length - 1];
    if (url.includes("PLprivate")) { console.error("ERROR: Playlist does not exist"); process.exit(1); }
    console.log(JSON.stringify({
      id: "PLtest12345",
      entries: [
        { id: "aaaaaaaaaaa", title: "First (slow)" },
        { id: "bbbbbbbbbbb", title: "Second" },
        { id: "failVideo01", title: "Broken" },
        { id: "ccccccccccc", title: "[Private video]" },
        { id: "ddddddddddd", title: "Fourth" },
      ],
    }));
    return;
  }
  const template = args[args.indexOf("-o") + 1];
  const id = args[args.length - 1].split("v=")[1];
  if (id === "failVideo01") { console.error("ERROR: Video unavailable"); process.exit(1); }
  if (id === "aaaaaaaaaaa") await sleep(300); // finishes last, but must still be added first
  fs.writeFileSync(template.replace("%(id)s", id).replace("%(ext)s", "m4a"), "audio-" + id);
})();
`
  );
  chmodSync(bin, 0o755);
  process.env.YTDLP_BIN = bin;
  return () => rmSync(dir, { recursive: true, force: true });
}
