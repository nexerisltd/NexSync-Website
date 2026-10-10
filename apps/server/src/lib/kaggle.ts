import ytWorkerSource from "@/worker/yt_worker.py" with { type: "text" };

/**
 * Starts the YouTube worker on Kaggle by pushing a tiny PRIVATE notebook (pushing = Kaggle runs it).
 * Same trick as the NexTGSF bot. The notebook holds only NEXSYNC_SERVER + NEXSYNC_WORKER_SECRET
 * (no bucket keys: uploads go through presigned URLs from this server).
 *
 * Env: KAGGLE_USERNAME, KAGGLE_API_TOKEN (or KAGGLE_KEY for an old kaggle.json key)
 */
const API = () => process.env.KAGGLE_API ?? "https://www.kaggle.com/api/v1";
const user = () => (process.env.KAGGLE_USERNAME ?? "").trim();
const token = () => (process.env.KAGGLE_API_TOKEN ?? "").trim();
const legacyKey = () => (process.env.KAGGLE_KEY ?? "").trim();
const slug = () => (process.env.KAGGLE_YT_SLUG ?? "nexsync-yt-worker").trim();

export const kaggleConfigured = () => Boolean(user() && (token() || legacyKey()));

const authHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  h.Authorization = token()
    ? `Bearer ${token()}`
    : `Basic ${Buffer.from(`${user()}:${legacyKey()}`).toString("base64")}`;
  return h;
};

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

export const buildNotebookSource = (env: Record<string, string>): string =>
  [
    "# NexSync YouTube worker (auto-generated, PRIVATE). Never make this notebook public: it holds your worker secret.",
    "import os, sys, subprocess, base64, json",
    `ENV = json.loads(base64.b64decode("${b64(JSON.stringify(env))}").decode())`,
    `CODE = base64.b64decode("${b64(ytWorkerSource)}").decode()`,
    'open("/tmp/yt_worker.py", "w").write(CODE)',
    // yt-dlp[default] pulls yt-dlp-ejs (YouTube JS challenge solver). Latest version on every start = fewer breakages.
    'print("pip rc =", subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "yt-dlp[default]", "requests"]).returncode)',
    "env = dict(os.environ); env.update(ENV)",
    'sys.exit(subprocess.run([sys.executable, "/tmp/yt_worker.py"], env=env).returncode)',
    "",
  ].join("\n");

export async function pushKaggleWorker(env: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  if (!kaggleConfigured()) return { ok: false, error: "KAGGLE_USERNAME / KAGGLE_API_TOKEN not set" };
  const body = {
    slug: `${user()}/${slug()}`,
    newTitle: slug(),
    text: buildNotebookSource(env),
    language: "python",
    kernelType: "script",
    isPrivate: true,
    enableGpu: false,
    enableInternet: true,
  };
  try {
    const res = await fetch(`${API()}/kernels/push`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Kaggle rejected the token (check KAGGLE_USERNAME / KAGGLE_API_TOKEN)" };
    }
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `Kaggle said ${res.status}: ${text.slice(0, 200)}` };
    try {
      const err = (JSON.parse(text) as { error?: string }).error;
      if (err) return { ok: false, error: `Kaggle refused the notebook: ${String(err).slice(0, 200)}` };
    } catch {
      // non-JSON 200 response: treat as success
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Network error talking to Kaggle: ${error instanceof Error ? error.message : error}` };
  }
}
