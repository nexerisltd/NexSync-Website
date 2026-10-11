# NexSync UI update — Liquid Glass × Fluent + Dev Collab

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
