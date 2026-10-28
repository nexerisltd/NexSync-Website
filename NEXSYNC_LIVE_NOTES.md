# NexSync — Live Broadcast (M0 spike)

Admin nijer device-er audio (browser tab ba mic) live shobar kache pathate pare. PRD-r M0/M1-er shuru.

## Kivabe use korbe
1. Admin room-e **Audio Effects** panel-er niche **Live broadcast** card dekhbe (shudhu admin-er jonno).
2. Delay preset (Tight / Balanced / Safe) bachho, tarpor **Share tab audio** ba **Microphone**.
3. Browser dialog-e tab bachho ar **"Share tab audio"** tick dao.
4. Shobar kache **LIVE** badge dekhabe, queue pause hobe; listener-ra ~delay-sec por shunbe.
5. **Stop live** dile (ba browser-e "Stop sharing" dile) queue-te fire jay.

## Requirement
- Admin: desktop **Chrome / Edge** (WebCodecs + MediaStreamTrackProcessor). Firefox/Safari/mobile admin hote parbe na.
- Listener: je browser-e `AudioDecoder` (WebCodecs) ache (recent Chrome/Edge/Firefox).
- Tab audio: Windows/ChromeOS-e system audio-o, Mac-e shudhu tab. DRM content silent hote pare.

## Kivabe kaj kore
- Admin: capture → 48 kHz stereo (Web Audio) → Opus 64 kbps / 20 ms (WebCodecs) → binary WebSocket frame.
- Frame header (14 byte): `type | channels | seq | captureServerTime(ms)` — `packages/shared/liveFrame.ts`.
- Server frame-gulo shudhu broadcaster-er kach theke nei, validate kore, ar room-er baki shobaike relay kore (`ws.publish`).
- Listener `captureServerTime + playoutDelay` somoye baje (ekoi NTP offset + nudge + output latency) — tai listener-ra nijeder moddhe sync.
- Admin-er nijer speaker-e audio **age** shunbe (delay-r kom); eta network stream-er prokriti.

## Server env
| Variable | Default | Matlob |
| --- | --- | --- |
| `MAX_LIVE_ROOMS` | 5 | Ek sathe koyta room live thakte pare |
| `LIVE_MAX_LISTENERS_PER_ROOM` | 50 | Live start korte room-e max connection |

Bandwidth: ~29 MB / listener-ghonta (64 kbps). Free Render-e (5 GB/month) shamanno-i.

## Ja ekhono nai (PRD M1/M2)
- Jitter buffer + clock-drift resampling (ekhon 30 ms-er beshi drift hole snap kore, halka click hote pare)
- Admin-er nijer monitoring-ke delay-te ana, WebRTC/SFU, mobile admin
- Live cholar somoy late joiner-er jonno queue state, listener local mute

## Files
shared: `constants.ts`, `liveFrame.ts`, `types/WSRequest.ts`, `types/WSBroadcast.ts`
server: `RoomManager.ts` (live state), `handlers/startLive.ts`, `stopLive.ts`, `routes/websocketHandlers.ts` (binary relay), `__tests__/liveBroadcast.test.ts`
client: `lib/live/*`, `store/live.ts`, `components/dashboard/LiveControls.tsx`, `websocket/registry.ts`, `WebSocketManager.tsx`
