# EX Shogi Web - Roadmap

EX将棋 Web 版は、モバイル版 `mobile/exshogi` のルール、PvP、棋譜、観戦の資産を共有し、ブラウザとスマホが同じサーバ上の同じ対局に参加できることを最終目標にする。

## Target Experience
- ブラウザ上で全5バリアント（とるいち / 影武者 / インベーダー / 罠 / 神隠し）を遊べる。
- PvC 練習として全5バリアントをCPU相手に遊べる。
- Web とスマホが同じ PvP サーバ、同じルーム、同じ対局状態を共有できる。
- フレンドマッチとして鍵付きロビーを作成し、鍵を知る相手だけが参加できる。
- 公開ロビーから対局を選び、観戦者として入室できる。
- 観戦者は対局を壊さず、状態同期と終局表示を利用できる。Web版ではリアクションは扱わない。

## Current State
- [x] Vite + React + TypeScript の初期化
- [x] `mobile/exshogi` の engine packages への link 設定
- [x] 標準将棋ベースの盤面、駒、持ち駒、成りモーダルの試作
- [x] Web Worker + WASM CPU 手生成の試作
- [x] `npm run build` / `pnpm build` が通る状態に戻す
- [x] Standard 固定の暫定実装を、5バリアント前提へ置き換える方針を固定する
- [x] モバイル版 PvP サーバ/プロトコルとの接続方針を固定する

## Phase 0: Shared Contract Alignment
- [x] 共通サーバの正を決める（Cloudflare Workers 版を正、Node `packages/pvp-server` はローカル/フォールバック扱い）
- [x] Web/モバイル共通の `RoomPreset`、`RoomSummary`、`RoomSnapshot`、WS message 型を整理する
- [x] 5バリアント定義を Web から参照できる共通配置にする
- [x] Web 側 TypeScript 設定と linked package のビルド境界を修正する
- [x] 現在の標準将棋ローカル対局がビルド可能な最小状態を作る

## Phase 1: Browser Core Gameplay
- [x] `ModeSelectScreen` を実装し、5バリアントのみ選択できるようにする
- [ ] `useGameLoop` を Web 用に再設計し、`VariantSpec` を常に受け取る構造にする
- [ ] 成り、打ち、二歩、打ち歩詰め、勝敗判定を Web UI から確認できるようにする
- [ ] とるいち、影武者、インベーダー、罠、神隠しの runtime state を盤面UIに反映する
- [ ] 対局終了、リザルト、棋譜メタデータの最小表示を実装する

## Phase 1.5: Browser PvC Practice
- [x] 全5バリアントで CPU 相手に対局開始できる導線を用意する
- [x] CPU レベル Lv1-5 を Web UI / 実思考 / 棋譜メタデータで一致させる（Result 上の JKF 互換プレビューまで実装）
- [x] モバイル版の PvC 方針に合わせ、JS 主軸・WASM 非ブロッカーの fallback を用意する
- [x] PvC 投了後に Result へ進めるようにする
- [x] PvC 終局後に最小棋譜確認と棋譜メタデータ表示へ進めるようにする
- [x] PvC 中の10分切れ負け時計と中断 Result を実装する
- [x] オンライン待機中に PvC 練習へ退避し、対戦開始時に戻れる将来導線を設計する

## Phase 2: Shared PvP Server Integration
- [x] Web 用 `PvpClient` を実装し、モバイル版と同じ `/auth/guest`、`/rooms`、`/rooms/:id/join`、WS 接続を使う
- [x] PvP バリアント選択後に Web ロビー一覧/作成/参加の入口へ進める
- [ ] Web とスマホのクロス参加を検証する（Web同士の Cloudflare smoke は通過、スマホ実機は未検証）
- [x] READY、start、move、resign、game_end、reconnect の最小フローを接続する
- [x] ルーム状態 `seq` と `RoomSnapshot` による再同期を実装する
- [x] 2ブラウザ smoke を自動化する
- [ ] 2ブラウザ + 1スマホの混在 smoke を手動チェックリスト化する

## Phase 3: Friend Match / Locked Lobby
- [ ] ロビー作成画面でバリアント、時間、先後、観戦可否、鍵を設定できるようにする（鍵は実装済み）
- [x] 鍵付きルームは一覧で鍵付き表示にし、参加時に鍵入力を要求する
- [x] 鍵付き/非公開ルームで観戦を禁止または明示制御する
- [ ] ロビー画面で参加者、READY、退出/解散、開始待ちを表示する
- [ ] 罠バリアントの事前セットアップフェーズを Web から操作できるようにする

## Phase 4: Lobby Spectating
- [x] 公開ロビー一覧から満席/対局中ルームを観戦として開ける
- [x] 観戦者用 WS auth（`mode: spectator`）で接続し、着手権限を持たない UI にする
- [x] 対局者、バリアント、残り時間、着手履歴、終局理由を観戦画面に表示する
- [x] 観戦中の接続失敗、終了済み、ルーム削除時のフォールバックを実装する
- [x] Web版ではリアクション送受信を非対応とする

## Phase 5: Replay / Records Compatibility
- [x] PvP 終局後に JKF または互換棋譜メタデータを表示できるようにする
- [x] 5バリアントの特殊イベントを Web の棋譜/履歴に表示する
- [ ] モバイル保存棋譜と Web 表示のスキーマ差分を整理する
- [ ] 棋譜URLから観戦/再生へ遷移する将来導線を設計する

## Phase 6: Web UX / Production Readiness
- [ ] ブランド方針を「また、誘える将棋」に合わせ、盤外UIを温かく誘いやすい方向へ刷新する
- [ ] Home / Lobby / Result / Share のコピーを「友だちと遊ぶ」「部屋をつくる」「もう一局誘う」などの誘いやすい語彙へ寄せる
- [ ] デスクトップ優先の盤面、ロビー、観戦レイアウトを仕上げる
- [ ] モバイルブラウザでも最低限プレイ/観戦できるレスポンシブ対応を行う
- [ ] アニメーション、SE、バリアント固有演出を Web 版に移植する
- [ ] `/healthz` / `/readyz` を含む接続状態表示とエラー表示を整える
- [ ] Web の deploy target、環境変数、CORS、WebSocket origin 方針を確定する

## Acceptance Criteria
- [ ] Web とスマホが同じサーバの同じルームで対局できる
- [ ] 全5バリアントで Web から PvP / PvC の対局開始、着手、終局まで確認できる
- [ ] 鍵付きロビーを作成し、鍵なし参加を拒否できる
- [ ] 公開ロビーから観戦に入り、対局進行と終局を追える
- [ ] 観戦者は着手できない
- [ ] `npm run build` または `pnpm build` と lint が通る
