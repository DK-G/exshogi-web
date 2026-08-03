# AGENT_TODAY — exshogi-web — 2026-06-09

- 起点: `repos\exshogi-web\task.md`「2026-05-20 exshogi 差異確認メモ」差異縮小 **優先順 1**（ローカル時計の正への追従）＋ `[/]`「Web はモバイル版の追従実装として扱う」。
- Tier: 0宣言   モード: 宣言
- 自律度: 通常（Tier0。Web はモバイル正本への追従実装）
- effort: **high**
  - 理由: byoyomi phase・低時間表示・Invader 秒表示の追従はタイマ状態が多く、時間制の正しさ（切れ負け/秒読み/フェーズ）に直結。単一領域だが fiddly。
- git 注記:
  - **既存 worktree を再利用**: `D:\dev\worktrees\exshogi-web\clock-parity-web`。branch `codex/clock-parity-web` は **52hae 所有・git 操作可**、`main` HEAD と同一（`dfac721`・unique commit 0・behind 0）＝良基点（stale でなく作業ゼロのプレースホルダ）。
  - node_modules は既設（shared 正準 `shared\node_modules\exshogi-web\repo\node_modules` あり）。
  - `repos` main は origin/main とクリーン同期。本 worktree の旧 `AGENT_TODAY.md` は本日分（2026-06-09）で**上書き再生成**済み。

## 今日のグループ（着手する [ ]）
- [ ] Web ローカル時計を「通常 3分 + 秒読み30秒」「インベーダー 1フェーズ15秒」に合わせる
  - 現状: `src/screens/Play/PlayScreen.tsx` の PvC/Quick ローカル時計が **10分切れ負け固定**（task.md 2026-05-20 メモ 行210）。
- [ ] モバイル正本（`@exshogi` の `apps/mobile-rn/src/hooks/useLocalClock.ts` / `DigitalClock.tsx`）の byoyomi phase・低時間表示・Invader 秒表示の挙動に追従する

## 対象ファイル候補
- `src/screens/Play/PlayScreen.tsx`、時計関連の UI/hooks、`task.md`（worktree 側）
- 参照（読むだけ）: モバイル正本 `apps/mobile-rn/src/hooks/useLocalClock.ts` / `DigitalClock.tsx`（正本ツリーは `C:\dev\portfolio\mobile\exshogi`、参照のみ）

## 完了条件
- PvC/Quick のローカル時計が 3分 + 秒読み30秒（Invader 15秒フェーズ）で動作し、秒読み突入・低時間表示が正本準拠
- `build` / `lint` green
- マージ・push はしない（diff を残して人間レビューへ）

## 検証（bycheck）
- 正本: `C:\dev\portfolio\docs\skills\bycheck.md`（参照のみ）
- 想定コマンド: `npm run build` / `npm run lint`（README/package.json 準拠。`pnpm` が PATH に無い環境は `npm` を主導線）

## リスク・中止条件
- PvP の**外部クロック同期**・**Invader フェーズ同期**は server protocol 絡みで本日スコープ外（差異縮小 優先順 2）。ローカル時計の表示・判定（PvC/Quick）に限定。
- 共有エンジン link（`@exshogi/engine-core`）の型・挙動は変更しない。差異は UI/運用層で吸収。

## モデル・実行制約
- Stage2 は Codex automation が実行する。
- Claude worker / Anthropic API / `ANTHROPIC_API_KEY` は使わない。
- 高難度タスクでも一度に広げず、必要ファイルだけを読んで作業範囲を小さく分割する。
- リポジトリ全体を一括で読まず、今日のグループに必要なファイルだけを読む。

## 先送り（今日はやらない）
- 🔴 クロスデバイス PvP 実機確認（Web 作成ルームへスマホ参加 / 逆 / 混在 smoke）/ 2 ブラウザ手動確認 / 全5バリアント対局確認 — 理由: 実機・手動
- 🟡 棋譜/StoredResult 差分整理・棋譜 URL・簡易リプレイ画面設計（いずれも「実装前に案確認」） — 理由: 人間の案確認待ち
- 次回候補: 差異縮小 優先順 2（Invader PvP フェーズ同期）/ 3（棋譜差分の MVP 制限事項明文化）/ 4（独立罠数・trap setup state）

## 実装担当（Codex）への規約
- この worktree 内だけで実装する（`repos\` や他 worktree は触らない）
- branch: `codex/clock-parity-web`（既存 worktree 再利用。52hae 所有で git 可）。必要なら stage2 で `agent/` ブランチへ切替可。**feature ブランチに commit するが merge・push はしない**
- Tier0 宣言のため通常フロー（`[AI-PROPOSED]` 不要）
- 「今日のグループ」の `[ ]` のみ実装（スコープを広げない）。実機・手動確認項目には着手しない
- 正史 `task.md` の更新は worktree 側で行う（`repos\` の clone は触らない）。完了後に結果概要を `AGENT_RESULT.md` に残す
- 仕様の正は `C:\dev\portfolio\mobile\exshogi`（モバイル版・参照のみ）。Web は追従実装。
