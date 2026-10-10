# YouTube / YT Music Playlist Import — Setup Guide (A–Z)

Ei feature diye room-er **Import YouTube playlist** box-e playlist link paste korle, playlist-er shob gaan
server download kore R2 te upload kore, ar room-er queue te playlist-er order-e add kore dey.
Left sidebar-er niche, "Upload audio" box-er thik pashe notun box ta pabe.

> **Free / no-card deploy (Vercel + Render + Supabase)** chaile `NEXSYNC_FREE_DEPLOY.md` dekho.
> Ei file-er Cloudflare R2 ongsho shudhu tader jonno jara card diye R2 use korte chay.

Supported links: `youtube.com/playlist?list=…`, `music.youtube.com/playlist?list=…`,
`watch?v=…&list=…`, ar single video link (`youtu.be/…`, `watch?v=…`, `/shorts/…`).

---

## 0. Ki ki change hoyeche

| File | Ki |
| --- | --- |
| `apps/server/src/lib/ytdlp.ts` | **Notun** — yt-dlp wrapper + link validation |
| `apps/server/src/routes/youtubeImport.ts` | **Notun** — `POST /upload/youtube-playlist` |
| `apps/server/src/index.ts` | Route register kora |
| `packages/shared/types/HTTPRequest.ts` | Request/response schema |
| `apps/client/src/components/YoutubePlaylistImport.tsx` | **Notun** — UI box |
| `apps/client/src/components/dashboard/Left.tsx` | UI box ta sidebar-e boshano |
| `apps/client/src/lib/api.ts` | `importYoutubePlaylist()` |
| `Dockerfile` | yt-dlp + Deno install kora |
| `apps/server/.env.example` | Shob env variable-er list |
| `apps/server/src/__tests__/ytdlp.test.ts`, `youtubeImport.test.ts`, `helpers_fakeYtdlp.ts` | Tests |

Zip-er file gulo **repo-er root-e** unzip kore overwrite koro (folder structure same ache).

---

## 1. Tools install koro (tomar PC te)

Tomar lagbe: **Bun**, **yt-dlp**, **Deno** (yt-dlp YouTube-er JS challenge solve korar jonno Deno use kore).

**Windows (PowerShell):**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
winget install yt-dlp.yt-dlp
winget install DenoLand.Deno
```

**macOS:**
```bash
brew install oven-sh/bun/bun yt-dlp deno
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://bun.sh/install | bash
curl -fsSL https://deno.land/install.sh | sh
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

Terminal **notun kore khule** check koro:
```bash
bun --version
yt-dlp --version
deno --version
```
Tinta-i version dekhale ready.

> `ffmpeg` **lagbe na** (default-e m4a/AAC audio nameya, jeta shob browser-e cholbe).
> Mp3 chaile `YT_AUDIO_FORMAT=mp3` set koro + ffmpeg install koro.

---

## 2. Cloudflare R2 setup (audio file rakhar jaiga)

Beatsync shob audio Cloudflare R2 te rakhe, tai eta **must**. (R2-te free tier ache, kintu signup-er shomoy
payment method chaite pare.)

1. https://dash.cloudflare.com → **R2 Object Storage** → **Create bucket** (nam: `beatsync-audio`).
2. **Public access:** bucket → **Settings** → **Public access** → `r2.dev` subdomain **Enable** koro
   (production-e nijer domain connect kora better). Ekta URL pabe, jemon `https://pub-xxxx.r2.dev`
   → eta tomar `S3_PUBLIC_URL` (shesh-e `/` dibe na).
3. **CORS:** bucket → **Settings** → **CORS Policy** → **Add** → ei JSON paste koro:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   (production-e `"*"` er bodole tomar site-er URL dio.)
4. **API token:** R2 page → **Manage API Tokens** → **Create API token** → permission **Object Read & Write**,
   bucket = `beatsync-audio`. Create korle pabe:
   - Access Key ID → `S3_ACCESS_KEY_ID`
   - Secret Access Key → `S3_SECRET_ACCESS_KEY`
   - Endpoint (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) → `S3_ENDPOINT`

   Secret key ekbar-i dekhabe, copy kore rakho.

---

## 3. Local-e run kora

**Server env** — `apps/server/.env.example` copy kore `apps/server/.env` banao, R2 value gulo bosao:
```env
S3_BUCKET_NAME=beatsync-audio
S3_PUBLIC_URL=https://pub-xxxx.r2.dev
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

**Client env** — `apps/client/.env` banao:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

Repo-er root-e:
```bash
bun install
bun dev
```
Browser-e http://localhost:3000 kholo → room create koro → left sidebar-er niche **Import YouTube playlist**
box-e ekta playlist link paste kore **Import** daba. Gaan gulo ek ek kore queue-te ashbe, ar upore
"Importing… N left" dekhabe.

Tests chalate chaile: `cd apps/server && bun test src/__tests__/ytdlp.test.ts src/__tests__/youtubeImport.test.ts`
(real yt-dlp lage na, fake use kore).

---

## 4. Production-e deploy (first time)

Setup-ta duita part: **Server** (Docker, yt-dlp shoho) ar **Client** (Vercel).

### 4a. Server (VPS — recommended)

Ekta chhoto Ubuntu VPS nao (1 GB RAM+ cholbe; Hetzner / DigitalOcean / Vultr etc.).

```bash
# VPS e (ekbar)
curl -fsSL https://get.docker.com | sh

git clone <tomar-repo-url> beatsync && cd beatsync
nano server.env          # R2 value gulo bosao (section 3 er moto, KEY=VALUE, ek line e ekta)
docker build -t beatsync-server .
docker run -d --name beatsync --restart unless-stopped -p 8080:8080 --env-file server.env beatsync-server
curl http://localhost:8080/health      # ok dekhale server cholche
```

**HTTPS/WSS lagbe** (Vercel-er https site thekey `ws://` cholbe na). Domain-er `api.tomardomain.com` A-record
VPS IP te pointing kore Caddy install koro (`sudo apt install caddy`), `/etc/caddy/Caddyfile`:
```
api.tomardomain.com {
    reverse_proxy localhost:8080
}
```
`sudo systemctl reload caddy` — Caddy nijei HTTPS certificate nibe.

> Alternative: Render.com e "Web Service" → Docker → ei repo select koro, env variable gulo Render-er
> Environment tab-e dao. Kintu ata nicher "YouTube block" note ta pore nio.

### 4b. Client (Vercel)

1. https://vercel.com → **Add New Project** → GitHub repo import koro (repo-te `vercel.json` already ache).
   Build fail korle Project Settings → **Root Directory** = `apps/client` kore dekho.
2. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://api.tomardomain.com
   NEXT_PUBLIC_WS_URL=wss://api.tomardomain.com/ws
   ```
3. Deploy. Tarpor R2 CORS-e `AllowedOrigins` e Vercel URL dite parbe.

### 4c. Code update korle
```bash
# VPS e
cd beatsync && git pull
docker build -t beatsync-server . && docker rm -f beatsync
docker run -d --name beatsync --restart unless-stopped -p 8080:8080 --env-file server.env beatsync-server
```
Docker build prottebar latest yt-dlp nameya, tai yt-dlp **update** korte holeo ei rebuild-i jothesto.
YouTube prai kichu din por por break kore, tokhon rebuild korlei thik hoy.

---

## 5. Optional settings (server env)

| Variable | Default | Kaj |
| --- | --- | --- |
| `YT_IMPORT_MAX_TRACKS` | `50` | Ek playlist theke max koyta gaan import hobe |
| `YT_IMPORT_CONCURRENCY` | `2` | Ekshathe koyta gaan download hobe (server-wide) |
| `YT_IMPORT_MAX_FILE_SIZE` | `80M` | Er cheye boro file skip hobe |
| `YT_AUDIO_FORMAT` | `m4a` | `mp3` dile ffmpeg lagbe |
| `YTDLP_BIN` | `yt-dlp` | yt-dlp PATH-e na thakle full path |
| `YTDLP_EXTRA_ARGS` | — | Extra flag, jemon `--cookies /app/cookies.txt` |
| `YT_IMPORT_DISABLED` | — | `1` dile feature bondho |

---

## 6. Jodi kaj na kore

| Shomossha | Karon / Fix |
| --- | --- |
| "YouTube import is not set up on this server" (501) | Server-e `yt-dlp` nai. Section 1 / Docker rebuild koro. |
| "Could not read that playlist…" (422) | Playlist private/unlisted-er moto, ba YouTube server IP block korse. Server log-e (`docker logs beatsync`) asol error dekho. |
| Log-e "Sign in to confirm you're not a bot" | VPS/Render-er IP YouTube block kore. Fix: browser theke `cookies.txt` export kore `YTDLP_EXTRA_ARGS=--cookies /app/cookies.txt` dao (`-v $PWD/cookies.txt:/app/cookies.txt` diye mount). **Alada/dummy Google account** use koro — automated download-e account flag hote pare. Ba server ta ghorer PC/residential IP-te chalao. |
| Kono gaan load hoy na, log-e "No supported JavaScript runtime" | Deno install nai. Docker image-e deya ache; local-e section 1 dekho. |
| Safari/iPhone-e gaan baje na | Kichu video-te m4a thake na, tai webm nameche. `YT_AUDIO_FORMAT=mp3` + ffmpeg use koro. |
| Box ta disabled / "Must be an admin" | Room "admin-only" mode-e ache. Admin hole ba permission "everyone" korle cholbe (existing upload-er moto-i). |
| "An import is already running for this room" | Ek room-e ekshathe ekta import cholte pare. Shesh hoyar por abar dao. |

---

## 7. Dhyan rakhar kotha

- Room-er last user chole gele 60s por room ar tar R2 file gulo **auto delete** hoy (Beatsync-er original behaviour).
- YouTube-er Terms of Service e audio download allowed na. Nijer/friends-der private use-er jonno common,
  kintu **public product (shobar jonno) hishebe launch korle legal risk ache** — shei
  case-e licensed source use korar kotha bhabo.
- Ei feature server-er CPU/bandwidth khay. Public deploy-e `YT_IMPORT_MAX_TRACKS` ar `YT_IMPORT_CONCURRENCY` kom rakho,
  prayojone `YT_IMPORT_DISABLED=1` dao.
