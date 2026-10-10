# NexSync update — YouTube import fix + branding

## Ki fix hoyeche

**1. "3 added, 4 failed — bucket upload HTTP 400: <?xml…" (main bug)**
Supabase Storage kichu character-wala file name (`[ ]`, `#`, `%`, `{ }`, emoji, Bangla/Hindi title) *InvalidKey* bole
reject kore. Tai "Song (Official Video) [4K]" type title fail kortho, plain title pass kortho — tai prottebar
*ekoi* gaan fail hoito. Ekhon:
- Server shob file name-ke storage-safe kore (`toStorageSafeName`): accent bad, `[ ] # % …` space hoye jay,
  non-Latin title hole `YouTube <video-id>` nam hoy. Duita gaan ekoi millisecond-e gele-o key alada (random suffix).
- Cloud worker (Kaggle) ar server-er pipeline: bucket nam reject korle **auto abar try kore** (safe nam → `YouTube <id>`),
  tai ekta odd title-e track haray na.
- Error ekhon porishkar: `InvalidKey: …` dekhay, ager moto raw `<?xml …>` na.
- Cloud worker duplicate event pathale (network retry) track dui bar count/add hoy na.

**2. Single song link**
YouTube Music-er song link-e `&list=RD…` (auto radio) thake, ager version oita-ke 50 gaaner playlist bhabto.
Ekhon `watch?v=…&list=RD…` = **sudhu oi ekta gaan**. Asol playlist (`list=PL…`) agerer moto playlist-i.

**3. Branding**
- Join page-e ar room sidebar-er niche: **Developer:** Arabi Islam × MR. ARX, **Brand:** NexEris LTD × NexApp OG (link soho).
- Page metadata (author/creator/publisher)-o update.

## Deploy korar niyom
1. Zip-er file gulo repo root-e overwrite → `git add . && git commit -m "NexSync: import fix + branding" && git push`
2. **Render** auto-deploy hobe (Logs-e "Your service is live" dekho). **Vercel**-o auto-deploy.
3. **Kaggle worker purono code-e cholte pare:** worker 15 min idle thakle nijei bondho hoy. Tai ekta notun import
   dewar age Kaggle → Notebooks → `nexsync-yt-worker` → **Stop session** koro, tarpor import dao (server notun code diye
   abar start kore).
4. Test: purono je playlist-e fail hoyechilo seta abar import koro. Ekhon 7/7 asha uchit.

## Optional setting
| Variable (Render) | Kaj |
| --- | --- |
| `S3_ALLOW_UNICODE_KEYS=1` | Shudhu **R2 / Backblaze / AWS S3**-e dao. Tahole Bangla/Hindi title file name-e thake. **Supabase-e dio na.** |

## Jodi ekhono kono track fail kore
Toast-e ekhon reason dekhabe. Render → Logs ar Kaggle notebook log-er `upload attempt failed (…)` line-ta pathao.
