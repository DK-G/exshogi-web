# EX Shogi Web

Browser implementation of EX Shogi. The canonical product is the mobile app in
`C:\dev\portfolio\mobile\exshogi`; this project follows mobile rules,
defaults, PvP protocol, replay metadata, and effect behavior unless a web-only
deviation is explicitly approved.

## Current Contract

- Mobile app is the source of truth.
- Web must support browser-vs-smartphone PvP through the same Cloudflare Workers
  room server and WebSocket protocol.
- Launch variants are とるいち, 影武者, インベーダー, 罠, 神隠し.
- Non-Invader default time is 3 minutes main time, then 30 seconds per move.
- Invader default is one 15 second phase.
- CPU policy is Lv1-5.
- Default trap count is 3.
- Web does not use `react-native-web`.

## Setup

```powershell
npm install
npm run dev
```

The app uses linked packages from:

```text
C:\dev\portfolio\mobile\exshogi\packages
```

If shared engine behavior changes in the mobile repo, rebuild and recheck this
project.

The repository metadata declares pnpm, but the currently verified local commands
use npm. If pnpm is installed, the equivalent `pnpm dev`, `pnpm build`, and
`pnpm lint` commands can be used.

## Commands

```powershell
npm run build
npm run lint
npm run preview
npm run pvp:smoke
```

`npm run pvp:smoke` targets the configured Cloudflare PvP endpoint. Use these
overrides when testing another server:

```powershell
$env:VITE_EXSHOGI_PVP_BACKEND="cloudflare"
$env:VITE_EXSHOGI_PVP_BASE_URL="https://..."
$env:VITE_EXSHOGI_PVP_WS_URL="wss://..."
npm run pvp:smoke
```

At runtime, the browser can also override PvP endpoints with
`globalThis.EXSHOGI_PVP_BASE_URL`, `globalThis.EXSHOGI_PVP_WS_URL`, and
`globalThis.EXSHOGI_PVP_BACKEND`.

## PvP Configuration

Default production target:

```text
HTTP: https://www.exshogi.com
WS:   wss://www.exshogi.com
```

Environment variables:

- `VITE_EXSHOGI_PVP_BASE_URL`: HTTP base URL for auth, rooms, join, leave, and room fetch.
- `VITE_EXSHOGI_PVP_WS_URL`: WebSocket base URL. If omitted, it is derived from the HTTP URL.
- `VITE_EXSHOGI_PVP_BACKEND`: `cloudflare` or `express`. If omitted, localhost-like URLs are treated as `express`; other URLs are treated as `cloudflare`.

The PvP lobby shows a service status panel with the configured HTTP URL, WS URL,
backend type, and a ready-like check based on the actual guest auth and room list
APIs used by the web client. This is the browser-side equivalent of checking
`/healthz` or `/readyz` when a dedicated endpoint is unavailable.

## Deployment Policy

- Production deploy target is the static Vite web build served under the
  `www.exshogi.com` origin.
- Production PvP target is the Cloudflare Workers room server on the same
  `https://www.exshogi.com` / `wss://www.exshogi.com` origin.
- Local or LAN PvP testing may point `VITE_EXSHOGI_PVP_BASE_URL` and
  `VITE_EXSHOGI_PVP_WS_URL` at an express-compatible server. Localhost-like
  URLs are treated as `express` unless `VITE_EXSHOGI_PVP_BACKEND` overrides it.
- CORS should allow the production web origin and explicit local development
  origins only. Do not rely on wildcard CORS for authenticated room APIs.
- WebSocket origin policy should mirror the HTTP room API policy: allow the
  production web origin and known local development origins, reject unknown
  browser origins, and continue to require auth or seat tokens at WS auth time.
- Browser runtime overrides are for smoke testing and emergency endpoint
  switching; checked-in production defaults should stay on the Cloudflare target.

## Current Web Surface

- PvC and Quick practice with Lv1-5 CPU selection and JS fallback if WASM CPU fails.
- PvP public rooms, keyed rooms, direct room ID join, READY/START, leave, and spectator entry.
- Five launch variants: とるいち, 影武者, インベーダー, 罠, 神隠し.
- Variant UI for capture-required targets, true king reveal, invader phases, trap setup, and disappearance forecasts/effects.
- Result preview with JKF-compatible metadata, room IDs, seat/source metadata, USI history, and variant effects.

## Parity Workflow

Before changing Web behavior, inspect the mobile implementation first:

- Defaults/settings: `C:\dev\portfolio\mobile\exshogi\apps\mobile-rn\src\constants`
- PvP room creation: `C:\dev\portfolio\mobile\exshogi\apps\mobile-rn\src\hooks\matching`
- PvP server/protocol: `C:\dev\portfolio\mobile\exshogi\workers\src`
- Engine rules: `C:\dev\portfolio\mobile\exshogi\packages\engine-core`
- Replay/JKF: `C:\dev\portfolio\mobile\exshogi\packages\notation`
- Effects/UI/audio: `C:\dev\portfolio\mobile\exshogi\apps\mobile-rn\src\components`

Record remaining gaps in `task.md` instead of silently diverging from mobile.
