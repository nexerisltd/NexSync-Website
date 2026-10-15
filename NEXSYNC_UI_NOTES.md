# NexSync UI update — Liquid Glass × Fluent + Dev Collab

> **v4 (room page = join page language):** room page ekhon join / sync page-er moto-i: ekoi `glass-strong` recipe (desktop-e rounded-3xl card), ekoi nx-btn blue, ekoi muted text + mono stat.
> - `.nx-panel` (lg+) = `.glass-strong`-er hubohu recipe. Blue-tint panel, pill, chip, glow bad.
> - Top bar: logo + green ping dot + "Room 000000 · N people listening"; Offset/RTT/OL quiet mono text (join page-er calibrating card-er moto).
> - Queue row: shada number, playing row-e shudhu halka highlight + blue left mark. Player-e icon tile (fake colourful cover bad).
> - Ja nai: theme toggle, bell, heart (kono kaj nei). Real cover art ar shob track-er duration nai (server metadata pathay na).


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
