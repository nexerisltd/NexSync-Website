# NexSync — 100% Free Deploy Guide (no card, no payment)

Ei guide-e tumi NexSync-ke **kono payment chhara** online dite parbe:

| Part | Free service | Card lagbe? |
| --- | --- | --- |
| Website (client) | **Vercel** (Hobby) | Na |
| Realtime server (WebSocket) | **Render** (Free web service) | Na |
| Audio file storage | **Supabase Storage** (Free) | Na |

> **Keno Vercel-e shob na?** NexSync-er server ekta *always-on* WebSocket server, jar memory-te room-er
> shob client ekshathe thake. Vercel Functions-e WebSocket ekhon beta-te ache, kintu protita connection
> alada function instance-e pin hoy ar ekta connection arekta-r memory dekhte pay na, tai room sync bhenge jabe.
> Tai Vercel-e shudhu **website**, server **Render**-e.
>
> **Keno Cloudflare R2 na?** R2-te free tier ache, kintu activate korte credit card / PayPal lage.
> Tumi payment korte chao na, tai Supabase Storage use korbo.

---

## 0. Tomar prosner uttor: 2 din por room ager moto thakbe?

**Na.** `508070` room 10/09-te banale, 10/11-te same link khulle:

- Room ta tokhon **ar thakbe na**. Last user ber hoye jawar **60 second por** server room-ta memory theke muche dey
  ar room-er **shob uploaded audio storage theke delete** kore dey (eta Beatsync-er original design).
- Same link-e dhukle ekta **notun khali room** toiri hobe: queue-te kono gaan nai, loaded audio nai.
- **Admin:** notun room-e **prothom je dhukbe se-i admin** hobe. Tumi prothom dhukle tumi admin, kintu eta
  "ager admin" na, notun room-er admin.
- Free Render server idle thakle ghumay (niche dekho) tai free hosting-e room aro taratari hariye jay.

Room kichu din dhore rakhar (persistent room) feature chaile bolo, ami add kore dibo — kintu free storage
matro 1 GB, tai purono room-er file jomle storage vore jabe.

---

## 1. Code GitHub-e dao

1. https://github.com e login → **New repository** (Private holeo hobe) → nam `nexsync`.
2. Project folder-e (zip-er file overwrite korar por) push koro:
   ```bash
   git init && git add . && git commit -m "NexSync"
   git branch -M main
   git remote add origin https://github.com/<tomar-username>/nexsync.git
   git push -u origin main
   ```
3. **LICENSE file ta delete korbe na** — Beatsync MIT license, original copyright notice rakhte hoy.

---

## 2. Supabase Storage (audio rakhar jaiga)

1. https://supabase.com → **Start your project** → GitHub diye login (card lage na).
2. **New project**: nam `nexsync`, ekta database password dao (save kore rakho), **Region**: tomar
   kache jeta (Bangladesh theke **Singapore** — `ap-southeast-1`). Plan: **Free**.
3. Project toiri hole **Storage** → **New bucket**:
   - Name: `audio`
   - **Public bucket: ON**
   - **Restrict file size**: 50 MB (free plan-er max)
4. **Storage → Settings → S3 Connection** (ba Project Settings → Storage):
   - S3 connection **Enable** koro, tarpor ei duita copy koro: **Endpoint** ar **Region**.
   - **New access key** → **Access key ID** ar **Secret access key** copy koro (secret ekbar-i dekhabe).

Ekhon tomar server env value gulo hobe (Render-e lagbe):

```
S3_BUCKET_NAME=audio
S3_ENDPOINT=<Supabase-er dewa S3 Endpoint>
S3_REGION=<Supabase-er dewa Region, jemon ap-southeast-1>
S3_FORCE_PATH_STYLE=1
S3_ACCESS_KEY_ID=<access key id>
S3_SECRET_ACCESS_KEY=<secret>
S3_PUBLIC_URL=https://<PROJECT_REF>.supabase.co/storage/v1/object/public/audio
```
`<PROJECT_REF>` hocche tomar project-er URL-er prothom ongsho (`https://abcd1234.supabase.co` → `abcd1234`).
`S3_PUBLIC_URL`-er shesh-e `/` dibe na.

---

## 3. Render (server)

1. https://render.com → GitHub diye sign up (card lage na) → **New + → Web Service** → `nexsync` repo select.
2. Settings:
   - **Language:** `Docker` (repo-er `Dockerfile` auto pabe)
   - **Instance Type:** `Free`
   - **Health Check Path:** `/health`
3. **Environment Variables** (Add): section 2-er shob `S3_*` value, ar
   ```
   YT_IMPORT_CONCURRENCY=1
   YT_IMPORT_MAX_TRACKS=30
   ```
   (Free instance-e RAM matro 512 MB, tai ekta ekta kore download.)
4. **Create Web Service**. Prothom build-e 5–10 minute lage (yt-dlp + Deno install hoy).
5. Shesh hole URL pabe, jemon `https://nexsync-server.onrender.com`. Browser-e `/health` khule dekho.

---

## 4. Vercel (website)

1. https://vercel.com → GitHub diye sign up → **Add New → Project** → `nexsync` repo import.
2. Repo-te `vercel.json` ache, tai Root Directory **repo root-e-i rakho**. Framework Preset: **Next.js**.
   (Build fail korle Root Directory `apps/client` kore dekho.)
3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://nexsync-server.onrender.com
   NEXT_PUBLIC_WS_URL=wss://nexsync-server.onrender.com/ws
   ```
   (Render-er asol URL bosao.) Optional: `NEXT_PUBLIC_DISCORD_URL`, `NEXT_PUBLIC_GITHUB_URL` dile UI-te icon ashbe, na dile hide thake.
4. **Deploy**. Tomar site pabe `https://nexsync-xxxx.vercel.app`.

---

## 5. Test koro

1. Vercel URL khule room banao → **prothombar 30–60 second lagte pare** (Render ghumiye thakle jage).
2. Ekta mp3 upload koro (50 MB-er niche) → queue-te ashle storage thik ache.
3. **Import YouTube playlist** box-e ekta playlist link dao (YouTube block dile niche dekho).
4. Arekta phone/tab-e same room code diye dhuke sync check koro.

---

## 6. Free plan-er shimabodhdhota (jene rakho)

| Jinis | Ki hobe |
| --- | --- |
| **Render ghumay** | 15 min kono HTTP request ba WebSocket message na ashle server ghumiye jay; abar khulle ~1 min lage. Keu room-e connected thakle (browser protikkhon ping pathay) server jege thake. |
| **Room hariye jay** | Server ghumale/restart hole shob room muche jay (memory-te thake). |
| **Storage 1 GB, file 50 MB** | Boro FLAC/WAV upload hobe na. Room khali holei file delete hoy, tai shadharonoto jome na. |
| **Supabase pause** | Free project onek din kono activity na thakle pause hote pare. Dashboard theke **Restore/Resume** koro. |
| **Vercel Hobby** | Shudhu personal, **non-commercial** use-er jonno. Business/paid product hole Vercel-er terms dekho. |
| **YouTube import** | Render-er IP-ke YouTube prai "bot" bhabe block kore. Block hole playlist import fail korbe (log-e "Sign in to confirm you're not a bot"). Cookies diye chesta kora jay (`YOUTUBE_IMPORT_SETUP.md` section 6), kintu free host-e guarantee nai. Upload-kora file gulo ei shomossha-y pore na. |
| **Supabase browser upload** | Supabase S3 diye browser theke direct upload ami **test korte pari nai**. Jodi manual upload fail kore (CORS/signature error), browser console-er error pathaw, ami fix kore dibo. |

**Optional: server jaga rakhte** — https://uptimerobot.com (free) diye `https://<render-url>/health` 5 minute por por ping koro. Render free-te mash-e ~750 ghonta pay, ekta service-er jonno 24x7 chale jay.

---

## 7. NexSync branding — ki ki change hoyeche

- App-er nam **NexSync** (browser tab, PWA install name, join page, top bar, share dialog, calibrating screen).
- Tomar **Logo.png** theke toiri: favicon, apple icon, PWA icon (192/512), join page-er bara logo, top bar-er chhoto logo.
- Beatsync-er Discord/GitHub link **hide** kora hoyeche (tomar nijer link dite env variable upore).
- Internal package nam (`@beatsync/shared`) bodlai nai, kaj-er kono khoti nai.

---

## 8. Music search kaj korena? (`PROVIDER_URL`)

Server-er **Search music** feature `PROVIDER_URL` env variable chhara kaj kore na (log-e
`PROVIDER_URL environment variable is required` ashe). Render-e eta set koro, ba search bad diye
shudhu **upload** ar **YouTube import** use koro.
