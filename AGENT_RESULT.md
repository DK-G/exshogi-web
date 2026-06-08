# AGENT_RESULT — exshogi-web — 2026-06-09
- status: ✅ review-ready
- branch: codex/clock-parity-web
- bycheck: `npm run build` pass / `npm run lint` pass（shared `node_modules` junction 復旧後に実行）
- 変更概要: `src/screens/Play/PlayScreen.tsx` で PvC/Quick ローカル時計を mobile parity へ追従、`src/components/GameInfo/GameInfoSidebar.*` で byoyomi / low-time 表示を追加
- 未解決 / 注意: `corepack pnpm install --store-dir D:/dev/shared/pnpm-store/exshogi-web` は no TTY により modules purge 確認で停止したが、shared `node_modules` 実体が既にあったため build/lint は実行できた。Invader PvP の protocol/server 同期は未着手。
- merge する場合: `git checkout main && git merge codex/clock-parity-web`
