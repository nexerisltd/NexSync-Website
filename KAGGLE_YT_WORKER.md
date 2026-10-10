# YouTube import via Kaggle (Render-e YouTube block hole)

Render-er IP YouTube block kore ("Failed to extract any player response" / "not a bot"). Ei setup-e **yt-dlp Kaggle-e chole**,
Render server shudhu kaj dey ar track gulo room-e add kore. Supabase storage ager moto-i thakbe.

    Website --(import link)--> Render server <--(pull job, 8s por por)-- Kaggle notebook (yt-dlp)
                                    ^                                          |
                                    |  /worker/event (track ready)             |  PUT audio (presigned URL) --> Supabase
                                    +------------------------------------------+

- Kaggle notebook-e **shudhu 2 ta secret** thake (server URL + worker secret). Supabase key Kaggle-e jay na:
  upload hoy server-er deya presigned URL diye (website ye bhabe upload kore, sheibhabe).
- Protita track alada pipeline-e: download -> upload -> sathe sathe queue-te. Ekta slow hole onno gulo atke na.
  Notun track ashle browser nijei load shuru kore (max 3 track memory-te).

## Setup
1. **Kaggle:** account + **Phone verify** (na hole notebook-e Internet on hoy na). Settings -> API -> **Create New Token**.
2. **Render -> Environment** (nijer server-e):

| Key | Value |
|---|---|
| `YT_IMPORT_MODE` | `remote` |
| `YT_WORKER_SECRET` | ekta lomba random string (jemon 40 char) |
| `KAGGLE_USERNAME` | tomar Kaggle username |
| `KAGGLE_API_TOKEN` | Step 1-er token |
| `SERVER_PUBLIC_URL` | `https://nexsync-website.onrender.com` (Render nijei `RENDER_EXTERNAL_URL` dey, tai optional) |
| `KAGGLE_IDLE_MIN` | `15` (import-er por worker koto minute jege thakbe) |

3. Deploy koro. Website theke playlist link dao. **Prothom bar 1-3 minute lage** (Kaggle machine boot + pip install).
   Tarpor 15 minute warm thake: ei somoy notun import kichu second-e shuru hoy.
4. Kaggle -> Your Work -> Notebooks -> `nexsync-yt-worker` -> Logs-e dekhbe `yt-dlp <version>`, `job ...: N track(s)`, `[i] ready: ...`.

## Nijer haate chalate chao (auto-launch chara)
`KAGGLE_*` set na korle server worker start korbe na. Tokhon Kaggle-e ekta notebook (Internet ON) khule:
```python
!pip install -q -U "yt-dlp[default]" requests
import os
os.environ["NEXSYNC_SERVER"] = "https://nexsync-website.onrender.com"
os.environ["NEXSYNC_WORKER_SECRET"] = "<YT_WORKER_SECRET-er value>"
os.environ["IDLE_SECONDS"] = "1800"
!python /path/to/yt_worker.py   # apps/server/src/worker/yt_worker.py file ta upload kore path dao
```

## Shomossha hole
| Lakkhon | Karon / Somadhan |
|---|---|
| Toast: "No cloud worker picked up the import" | Worker start hoy nai. Render log-e `Could not start the Kaggle worker: ...` dekho (token/username/phone verify) |
| Kaggle log: `server rejected NEXSYNC_WORKER_SECRET` | Render-er `YT_WORKER_SECRET` ar notebook-er secret mile nai. Notebook auto-generate hoy, tai Render-e secret bodle abar import dao |
| Kaggle log-e `Failed to extract any player response` | Ei Kaggle IP-o YouTube block kortese ba yt-dlp purano. Notebook protibar latest yt-dlp install kore; tarpor-o hole `YT_COOKIES_FILE` (cookies.txt) diye try koro |
| Prothom import-e onek deri | Kaggle cold start (1-3 min). `KAGGLE_IDLE_MIN` barale beshi khon warm thake |

## Shotorkota
- Ami eta Kaggle ba YouTube-er sathe live test kori nai (amar environment-e ei duto-te access nai). Server logic, worker pipeline
  ar Kaggle push payload **test + fake server diye** check kora; Kaggle-e prothom run-e choto-khoto jinish hote pare, log pathaio.
- Kaggle push API-r format tomar bot-er `kaggle_runner.py` theke hubohu neya (ota tomar kache kaj kore).
- Kaggle-er IP-o kono kono somoy YouTube block kore; guarantee nai.
- Kaggle-er Terms mainly ML/data-science-er jonno. Bhari/24-7 use korle account suspend hote pare; alada account bhalo.
- Notebook **Private** rakho (ota-e `YT_WORKER_SECRET` ache). Free Render worker poll-er karone jege thake (worker cholar somoy), 750 ghonta/mash-e eta thik.
