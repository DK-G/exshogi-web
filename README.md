# EX Shogi Web（アーカイブ済み・2026-08-02）

> **このリポジトリは役目を終えました。Web 版の開発は `exshogi-app` モノレポの `apps/web` へ一本化されています。**
>
> - **現行の実装**: `D:\dev\repos\exshogi-app\apps\web`（GitHub: `DK-G/EXshogi`）
> - **ここは読み取り専用**。新しい変更はこのリポジトリではなく `apps/web` へ入れてください。
>
> ## なぜ移したか
>
> Web 版の実装が本リポジトリとモノレポの `apps/web` に分裂し、同じ不具合を二重に抱える状態になっていたため（2026-08-02 に判明）。
> `apps/web` はコンポーネント分割まで進んでおり機能的に上位互換で、共有パッケージ `packages/*` と同一ツリーで整合が取れます。
>
> ## 引き継ぎ状況
>
> - 本リポジトリにのみ存在した**時計の状態別色分け（`timeTone`）は `apps/web` へ移植済み**。それ以外に移植すべき実装は無いことを全ファイル突き合わせで確認済み。
> - アーカイブ時点の未コミット作業は、失われないよう各ブランチへコミットして push 済み（下記）。**いずれも未完成・未検証**です。
>   - `codex/brand-refresh-web` — 全画面のブランド刷新、`docs/brand-design-direction.md`、**`wrangler.jsonc`（Cloudflare 静的配信・カスタムドメイン `play.exshogi.com`・SPA fallback）**。`package.json` の `@exshogi/*` link 先が旧パス `C:/dev/portfolio/...` のままで解決不能なので、移植時は読み替えが必要。
>   - `feat/webmcp-read-only` — `src/services/webMcp.ts`（盤面 read-only 公開）と `DIRECTION.md` / `CHECKS.md`。
>   - `codex/brand-warm-design-docs` — 暖色系デザイン方針の文書。
>   - `codex/clock-parity-web` — 作業ログのみ。
> - **`wrangler.jsonc` は Web 版デプロイの参考資産**です。API Worker が `www.exshogi.com/*` をキャッチオールしているため、Web を別サブドメイン（`play.exshogi.com`）へ置くこの構成はオリジン衝突を避けられます。`apps/web` をデプロイする際はここを出発点にしてください。

---

以下はアーカイブ時点の内容です（歴史的記録）。

Browser implementation of EX Shogi. The canonical product is the mobile app in
`D:\dev\repos\exshogi-app`; this project follows mobile rules,
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
D:\dev\repos\exshogi-app\packages
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

- Defaults/settings: `D:\dev\repos\exshogi-app\apps\mobile-rn\src\constants`
- PvP room creation: `D:\dev\repos\exshogi-app\apps\mobile-rn\src\hooks\matching`
- PvP server/protocol: `D:\dev\repos\exshogi-app\workers\src`
- Engine rules: `D:\dev\repos\exshogi-app\packages\engine-core`
- Replay/JKF: `D:\dev\repos\exshogi-app\packages\notation`
- Effects/UI/audio: `D:\dev\repos\exshogi-app\apps\mobile-rn\src\components`

Record remaining gaps in `task.md` instead of silently diverging from mobile.
