# NexSync YouTube worker. Runs on Kaggle (or any machine whose IP YouTube accepts).
#
# It never receives connections. It only *pulls* jobs from your NexSync server:
#   GET  {SERVER}/worker/next?wait=8      -> next import job (or null)
#   POST {SERVER}/upload/get-presigned-url -> upload URL for the bucket (Supabase / R2), same as the website uses
#   POST {SERVER}/worker/event            -> progress: listed / track / failed / done
#
# So the notebook only needs 2 secrets: NEXSYNC_SERVER and NEXSYNC_WORKER_SECRET.
# No bucket keys ever leave your server.
#
# Pipeline per job: every track is download -> upload -> "track" event on its own. The next track starts
# downloading while the previous one uploads, and each finished track is announced at once, so the room
# can start loading it while the rest of the playlist is still importing.
import os
import re
import shutil
import sys
import tempfile
import threading
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor

import requests
import yt_dlp

SERVER = os.environ["NEXSYNC_SERVER"].rstrip("/")
SECRET = os.environ["NEXSYNC_WORKER_SECRET"]
IDLE_SECONDS = int(os.getenv("IDLE_SECONDS", "300"))          # exit after this long without a job (while it waits, its polling keeps a free Render instance awake)
MAX_RUN_SECONDS = int(os.getenv("MAX_RUN_SECONDS", str(10 * 3600)))
DL_CONCURRENCY = int(os.getenv("DL_CONCURRENCY", "3"))
UP_CONCURRENCY = int(os.getenv("UP_CONCURRENCY", "2"))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_MB", "80")) * 1024 * 1024
COOKIES_FILE = os.getenv("YT_COOKIES_FILE", "")               # optional Netscape cookies.txt

HEADERS = {"Authorization": f"Bearer {SECRET}"}
CONTENT_TYPES = {"m4a": "audio/mp4", "mp4": "audio/mp4", "webm": "audio/webm", "opus": "audio/ogg",
                 "ogg": "audio/ogg", "mp3": "audio/mpeg", "aac": "audio/aac"}
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def api(method, path, retries=3, **kw):
    """HTTP call to the NexSync server with retries (Render free may be waking up)."""
    last = None
    timeout = kw.pop("timeout", 40)
    for attempt in range(retries):
        try:
            r = requests.request(method, SERVER + path, headers=HEADERS, timeout=timeout, **kw)
            if r.status_code < 500:
                return r
            last = RuntimeError(f"{path} -> HTTP {r.status_code}")
        except requests.RequestException as e:
            last = e
        time.sleep(2 * (attempt + 1))
    raise last


def event(job_id, **payload):
    try:
        body = {"jobId": job_id, **{k: v for k, v in payload.items() if v is not None}}
        r = api("POST", "/worker/event", json=body)
        if r.status_code >= 400:
            log("event rejected:", payload.get("type"), r.status_code, r.text[:120])
        return r.status_code < 400
    except Exception as e:
        log("event failed:", payload.get("type"), e)
        return False


def js_runtimes():
    """YouTube needs a JavaScript runtime for some videos. Enable whichever exists on this machine."""
    found = {}
    for name in ("deno", "node", "bun", "quickjs"):
        if shutil.which(name):
            found[name] = {}
    return found or {"deno": {}}


def base_opts():
    o = {"quiet": True, "no_warnings": True, "noplaylist": True, "socket_timeout": 30, "retries": 5,
         "fragment_retries": 5, "js_runtimes": js_runtimes()}
    if COOKIES_FILE and os.path.isfile(COOKIES_FILE):
        o["cookiefile"] = COOKIES_FILE
    return o


def list_entries(url, max_tracks):
    """Return ([{id,title}], truncated). Works for playlists, YT Music playlists and single videos."""
    o = base_opts()
    o.update({"extract_flat": "in_playlist", "noplaylist": False, "playlistend": max_tracks + 1,
              "skip_download": True})
    with yt_dlp.YoutubeDL(o) as ydl:
        info = ydl.extract_info(url, download=False)
    raw = info.get("entries") if info.get("_type") == "playlist" else [info]
    entries = []
    for e in raw or []:
        if not e:
            continue
        vid = e.get("id")
        if not vid or not VIDEO_ID_RE.match(vid):
            continue
        entries.append({"id": vid, "title": (e.get("title") or vid)[:150]})
    return entries[:max_tracks], len(entries) > max_tracks


def download(video_id, workdir):
    o = base_opts()
    o.update({
        "format": "bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio",
        "outtmpl": os.path.join(workdir, "%(id)s.%(ext)s"),
        "max_filesize": MAX_FILE_SIZE,
    })
    with yt_dlp.YoutubeDL(o) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
    files = [f for f in os.listdir(workdir) if not f.endswith((".part", ".ytdl"))]
    if not files:
        raise RuntimeError("no audio file produced (maybe larger than the size limit)")
    # if more than one file shows up, the audio is the biggest one
    files.sort(key=lambda f: os.path.getsize(os.path.join(workdir, f)), reverse=True)
    return os.path.join(workdir, files[0])


def safe_title(title, video_id):
    """ASCII-only title that every S3-compatible bucket accepts (Supabase rejects [ ] # % emoji, Bangla... with
    400 InvalidKey). Falls back to "YouTube <id>" when nothing readable is left."""
    t = unicodedata.normalize("NFKD", title or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^A-Za-z0-9 _.\-()',!]", " ", t)
    t = re.sub(r"_{2,}", "_", t)
    t = re.sub(r"\s+", " ", t).strip(" ._-")[:120]
    return t if re.search(r"[A-Za-z0-9]", t) else f"YouTube {video_id}"


def http_error(resp):
    """Short readable error from an S3-style XML error body (so the toast says InvalidKey, not '<?xml ...')."""
    body = resp.text or ""
    code = re.search(r"<Code>(.*?)</Code>", body, re.S)
    msg = re.search(r"<Message>(.*?)</Message>", body, re.S)
    if code or msg:
        detail = ": ".join(x.group(1).strip() for x in (code, msg) if x)
    else:
        detail = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)).strip()
    return f"HTTP {resp.status_code} {detail}"[:200]


def upload(room_id, title, path, video_id, retries=2):
    """Upload one file. Tries the real title first; if the bucket refuses the name (4xx) it retries with an
    ASCII-safe title and finally with a plain "YouTube <id>" name, so one odd title never loses the track."""
    ext = os.path.splitext(path)[1].lstrip(".").lower() or "m4a"
    ctype = CONTENT_TYPES.get(ext, "audio/mpeg")
    names = []
    for n in (title, safe_title(title, video_id), f"YouTube {video_id}"):
        if n not in names:
            names.append(n)
    last = None
    for name in names:
        for attempt in range(retries):
            retry_same_name = True
            try:
                r = api("POST", "/upload/get-presigned-url", json={
                    "roomId": room_id, "fileName": f"{name}.{ext}", "contentType": ctype})
                if r.status_code != 200:
                    raise RuntimeError(f"presign {http_error(r)}")
                data = r.json()
                with open(path, "rb") as f:
                    put = requests.put(data["uploadUrl"], data=f, headers={"Content-Type": ctype}, timeout=300)
                if put.status_code >= 300:
                    if 400 <= put.status_code < 500 and put.status_code != 429:
                        retry_same_name = False           # the bucket refused this name/request: try the next name
                    raise RuntimeError(f"bucket upload {http_error(put)}")
                return data["publicUrl"]
            except Exception as e:
                last = e
                log(f"  upload attempt failed ({str(e)[:140]})")
                if not retry_same_name:
                    break
                time.sleep(2 * (attempt + 1))
    raise last


def run_job(job):
    job_id, room_id = job["id"], job["roomId"]
    log(f"job {job_id}: listing {job['url']}")
    try:
        entries, truncated = list_entries(job["url"], int(job.get("maxTracks", 50)))
    except Exception as e:
        log("listing failed:", e)
        event(job_id, type="done", reason=f"Could not read that playlist: {str(e)[:200]}")
        return
    if not entries:
        event(job_id, type="done", reason="No playable videos found in that link")
        return
    event(job_id, type="listed", total=len(entries), truncated=truncated)
    log(f"job {job_id}: {len(entries)} track(s)")

    dl_sem, up_sem = threading.Semaphore(DL_CONCURRENCY), threading.Semaphore(UP_CONCURRENCY)
    state = {"ok": 0, "last_error": None}
    lock = threading.Lock()

    def one(i, entry):
        workdir = tempfile.mkdtemp(prefix="nx_")
        try:
            path = None
            for attempt in range(2):                      # one retry: YouTube throttles now and then
                try:
                    with dl_sem:
                        path = download(entry["id"], workdir)
                    break
                except Exception as e:
                    state["last_error"] = str(e)
                    log(f"  [{i}] download failed ({attempt + 1}/2): {str(e)[:160]}")
            if not path:
                event(job_id, type="failed", index=i, reason=(state["last_error"] or "download failed")[:250])
                return
            try:
                with up_sem:                              # download slot is already free: next track can start
                    url = upload(room_id, entry["title"], path, entry["id"])
            except Exception as e:
                state["last_error"] = str(e)
                log(f"  [{i}] upload failed: {str(e)[:160]}")
                event(job_id, type="failed", index=i, reason=str(e)[:250])
                return
            if event(job_id, type="track", index=i, publicUrl=url):
                with lock:
                    state["ok"] += 1
                log(f"  [{i}] ready: {entry['title']}")
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    with ThreadPoolExecutor(max_workers=DL_CONCURRENCY + UP_CONCURRENCY) as pool:
        for i, entry in enumerate(entries):
            pool.submit(one, i, entry)
    reason = None if state["ok"] == len(entries) else state["last_error"]
    event(job_id, type="done", reason=(reason or "")[:250] or None)
    log(f"job {job_id}: finished, {state['ok']}/{len(entries)} ok")


def main():
    started = time.time()
    last_job = time.time()
    log("yt-dlp", yt_dlp.version.__version__, "| js runtimes:", ", ".join(js_runtimes()), "| server:", SERVER)
    while True:
        if time.time() - started > MAX_RUN_SECONDS:
            log("max run time reached, exiting")
            return 0
        if time.time() - last_job > IDLE_SECONDS:
            log(f"idle for {IDLE_SECONDS}s, exiting (the server starts a new worker when needed)")
            return 0
        try:
            r = api("GET", "/worker/next?wait=8", timeout=30)
            if r.status_code == 401:
                log("server rejected NEXSYNC_WORKER_SECRET - check it matches YT_WORKER_SECRET on the server")
                return 2
            job = r.json().get("job") if r.status_code == 200 else None
        except Exception as e:
            log("poll error:", e)
            time.sleep(5)
            continue
        if not job:
            time.sleep(1)
            continue
        try:
            run_job(job)
        except Exception as e:                            # never die because of one bad job
            log("job crashed:", e)
            event(job["id"], type="done", reason=f"worker error: {str(e)[:200]}")
        last_job = time.time()


if __name__ == "__main__":
    sys.exit(main())
