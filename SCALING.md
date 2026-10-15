# NexSync — Capacity & Hosting Notes

## Load-test result (same machine for server + 2000 simulated listeners, 1 vCPU)
| Scenario | Before | After this update |
| --- | --- | --- |
| 2000 listeners over 100 rooms | all connected, RTT 0.18 ms, server 75 MB | same (no regression): RTT 0.15 ms, 75 MB |
| 2000 listeners in **one** room | server **942 MB**, avg RTT **301 ms**, max **7.4 s** (POOR) | server **86 MB**, avg RTT **0.74 ms**, max 100 ms (EXCELLENT) |
| 4000 listeners in one room | – | first 3000 in (room limit), 1000 refused with 503 as designed; server 87 MB, RTT 0.39 ms |

Ei test-e audio/chat nai — shudhu connect + time-sync (NTP) + room events. Real internet-e latency/bandwidth alada.
Tomar server-ke nijei test korte: `cd apps/server && bun run scripts/load-test-demo.ts --clients 2000 --rooms 100 --skip-audio --host wss://<tomar-server>`
(`--rooms 100` er bodole `--room 000001` dile ek room-er stress test).

## Ki bodlano hoyeche (server)
- **Boro room (>100 jon):** CLIENT_CHANGE-e shob user-er list pathano hoto (O(n²) bytes). Ekhon admin + prothom 50 jon + nijer nam, ar `totalClients` (asol sonkha). UI "+N more listening" dekhay.
- CLIENT_CHANGE broadcast room boro hole 0.5s → 5s porjonto slow (join storm-e ekbar-i jay).
- Spatial audio 100 jon-er beshi room-e chalu hoy na (ager moto 10 Hz-e shobar gain pathate thakto).
- Websocket message max 256 KB (ager default 16 MB).
- Server full hole 503 (`MAX_TOTAL_CLIENTS`, `MAX_CLIENTS_PER_ROOM`).
- Kom log: per-message/connection log ar proti-request log bondho (`VERBOSE_LOGS=1` dile abar chalu).
- Idle server-e khali backup ar bar bar upload bondho. Kaggle worker 5 min idle-e bondho (ager 15) — Render-ke kom jagay.

## Server settings (env)
| Variable | Default | Matlob |
| --- | --- | --- |
| `MAX_TOTAL_CLIENTS` | 5000 | Pura server-e max connection |
| `MAX_CLIENTS_PER_ROOM` | 3000 | Ek room-e max |
| `LARGE_ROOM_THRESHOLD` / `LARGE_ROOM_LIST_SIZE` | 100 / 50 | Kobe "boro room" mode, list koto lamba |
| `MAX_SPATIAL_CLIENTS` | 100 | Spatial audio-r room limit |
| `MAX_WS_PAYLOAD_BYTES` | 262144 | Max message size |
| `BACKUP_INTERVAL_MS` | 60000 | Backup-er gap |
| `VERBOSE_LOGS` | off | `1` = shob log |
Free host-e (512 MB / 0.1 CPU) `MAX_TOTAL_CLIENTS=200` rakho.

## Hosting (2000+ jon-er jonno)
Free Render (0.1 CPU, 512 MB, 5 GB bandwidth) e 2000 jon **hobe na** — code noy, machine chhoto. Dhaponi:
1. **Hugging Face Spaces (Docker)** — free, card chhara, 2 vCPU / 16 GB, WebSocket cholbe, 48h idle-e sleep.
2. **Nijer PC + Cloudflare Tunnel** — free, unlimited, residential IP.
3. **VPS $4-6/month ba Oracle Always Free (card verify)** — production-er jonno stabilo.
Ekta server instance-e shob room thake (memory-te), tai ekadhik instance-e bhag kora jabe na — ekta boro instance nao.
