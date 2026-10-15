# NexSync UI update — Liquid Glass × Fluent + Dev Collab

> **v3 (reference redesign):** desktop-e 3-ta column + player ekhon rounded floating panel (`.nx-panel`, lg+ only — mobile age-r moto).
> - Top bar: boro logo, rounded stat pill (`.nx-pill`: Room, NTP, Users, Admin, Offset, RTT, OL), ar account dropdown (Copy room link / Leave room).
> - Queue: number chip (`.nx-num`), playing row-e blue highlight (`.nx-row-active`), duration, ar `...` menu (Play/Pause, Remove from queue).
> - Left: room header-e copy-link button, user row-e online dot + Admin/Creator pill, section title (`.nx-section`).
> - Right: underline tab, notun empty state, pill message box + Send button, own message ekhon brand blue.
> - Bottom: now-playing (cover tile + title), transport + progress, nudge + volume.
> - Ja nai: theme toggle, bell, heart (kono kaj nei tai dei nai). Real cover art nai (queue-te thumbnail data nai), tai track name theke gradient tile. Duration shudhu decoded track-er jonno dekhay.

> **v2 (consistency pass):** shob jaygar style ekta design system-e ana hoyeche, over-the-top effect komano hoyeche.
> - Surface 3 type: **Panel** (`glass-flat`: sidebar/top/bottom), **Card** (`nx-card`: upload, import, Dev Collab, rows — blur chhara), **Overlay** (`glass-strong`: dialog/popup/search/toast).
> - Button 1 type: `nx-btn` (brand blue) — white/orange/green button ar nai. Play button, Load default tracks, Start System, Import shob ekoi.
> - Orange/green toggle → brand blue. Purono neutral flat color gulo translucent token-e (`bg-white/5`, `border-white/10`).
> - Sync/loading screen ekhon aurora-r upor glass card (ager moto flat black na).
> - Dev Collab: ghurte thaka ring bad, static soft gradient ring; top-bar ar sidebar-er duplicate credit text bad — ekta entry-i.
> - Sidebar-er niche: "Add music" group (Upload + Import) → tip → Dev Collab.


## Ki notun
- **Design system** (`apps/client/src/app/globals.css`): animated aurora background, `.glass`, `.glass-strong`, `.glass-flat`
  (frosted blur + specular highlight), `.nx-btn` (liquid gradient button), `.nx-glow-border` (animated ring).
  Brand palette ekhon logo-r moto **blue** (ager green chilo). Dialog/popover/dropdown/select/tooltip/toast/card shob glass.
- **Dev Collab card** (join page-e highlighted; room-e sidebar + top bar theke click korle popup): Arabi Islam × MR. ARX,
  profile picture, role, copy-able NexID, link, ar brand (NexEris LTD × NexApp OG).
- **Profile picture live pull**: `/api/team` Team Board-er public profile page (`nexeristm.vercel.app/<username>`) theke
  picture ane, **NexID mile gele-i** niye (Arabi `Nex120239065712`, MR. ARX `Nex382412048038`). Picture bodlale 1 ghonta-r
  moddhe nijei update. Load na hole last known picture, tarpor initials dekhay.
- **Import box**: glass design, **progress bar**, **Paste** button (clipboard theke).
- **Install app** button (top bar): browser PWA install support korle tabei dekhay.
- Accessibility: reduced-motion / reduced-transparency / no-blur browser-e solid readable fallback.

## Member add/change korbe
`apps/client/src/constants.ts` → `TEAM` array (name, role, NexID, username, profileUrl). Karo username bodlale ekhane-i.

## Deploy
Zip overwrite → `git push` → Vercel auto-deploy. Server/Render-e kono change nai.
