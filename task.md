# EX Shogi Web - Task List

このファイルは現時点の実作業チェックリストです。大枠は `roadmap.md` に従い、ここでは実装可能な粒度、検証方法、実機依存の有無を分けて管理します。

## 現在の作業方針（2026-06-03）
- [/] Web は ExShogi モバイル版の追従実装として扱い、モバイル側のクローズドテスト準備を正本にする。
  - [ ] モバイル側で確定した PvP protocol、RoomPreset、CPU Lv1-5、時間設定、罠数、JKF metadata の差分を Web 側へ反映する。
  - [ ] Web 独自の装飾・Replay/Records 拡張より、ブラウザとスマホが同一 PvP サーバ・同一ルームで対局できることを優先する。
- [/] 次の優先確認はクロスデバイス PvP と全5バリアントの最低限プレイ確認。
  - [ ] Web 作成ルームへスマホ実機から参加できることを確認する。
  - [ ] スマホ作成ルームへ Web から参加できることを確認する。
  - [ ] 全5バリアントの PvP / PvC を対局開始から終局まで確認する。
- [ ] Web Production Readiness は、同一 protocol 確認後にデスクトップ/モバイルブラウザ UX と deploy 表記を詰める。

## Git公開準備
- [x] `.env`、secret、credential、Terraform state を `.gitignore` に追加し、公開差分への混入を予防する

## 0. Shared Contract Alignment
- [x] 共通サーバの正を決める（Cloudflare Workers 版を正、Node `packages/pvp-server` はローカル/フォールバック扱い）
- [x] Web の PvP 設定を `VITE_EXSHOGI_PVP_BASE_URL` / `VITE_EXSHOGI_PVP_WS_URL` と `globalThis.EXSHOGI_PVP_*` で上書き可能にする
- [x] `mobile/exshogi` の `RoomPreset` / `RoomSummary` / `RoomSnapshot` / WS message を Web 用型へ整理する
- [x] 5バリアント定義を Web から参照できる共通配置にする
- [x] Standard 固定の暫定実装を 5バリアント前提へ置き換える方針を決める
- [x] linked engine packages が Web 側 TypeScript 設定でビルドできるようにする

## 1. Browser Core Gameplay
- [x] Home から PvC / PvP / Quick の入口へ進める
- [x] `ModeSelectScreen` で5バリアントを選択できる
- [x] `PlayScreen` が `VariantSpec` を受け取り、選択バリアントで初期化される
- [x] Web UI から駒選択、移動、成り、持ち駒表示、着手履歴表示ができる
- [x] 共有エンジンの `applyMoveWithWinCheck` を使って着手適用と終局を扱う
- [x] 終局 Result と最小棋譜プレビューを表示する
- [ ] 成り、打ち、二歩、打ち歩詰め、詰み/ステイルメイトを5バリアントで手動確認する
- [x] とるいちの捕獲必須 UI 表示を改善する
- [x] 影武者の真王情報を終局後 UI で分かりやすく表示する
- [x] インベーダーのフェーズ UI（残り時間、フェーズ開始/終了）を Web で操作可能にする
- [x] 罠の事前セットアップ UI を Web で操作可能にする
- [x] 神隠しの予告/発生/免疫イベントを盤面 UI へ反映する

## 1.5 Browser PvC Practice
- [x] 全5バリアントで PvC を開始できる
- [x] CPU レベル Lv1-5 の選択 UI を実装する
- [x] CPU レベルを実思考設定と棋譜メタデータへ反映する
- [x] WASM CPU が失敗/タイムアウトしても JS fallback で対局を継続する
- [x] PvC の投了、時間切れ、中断 Result を実装する
- [x] PvC 終局後に JKF 互換プレビューを表示する
- [x] Quick Start のオンライン待機中に PvC 練習へ退避できる導線を実装する
- [x] CPU fallback 発生時の UI 表示を整理する
- [ ] Lv1-5 の体感差を Web 上で最低限確認する

## 2. Shared PvP Server And Lobby
- [x] Web 用 `PvpClient` を実装する（guest auth / create / join / fetch / leave）
- [x] WebSocket 接続クラスを実装する（auth / ready / start / move / resign / heartbeat）
- [x] Web版ではリアクション送受信を非対応にする
- [x] PvP バリアント選択後にロビー一覧へ進める
- [x] 公開ロビー一覧を表示する
- [x] ルーム作成、参加、退出、READY、START を実装する
- [x] START 後に `PlayScreen` へ遷移し、move / resign / game_end を WebSocket と接続する
- [x] 再接続時に `RoomSnapshot` から盤面を復元する
- [x] 2クライアント Cloudflare smoke を自動化する
- [x] Cloudflare 本番に対して auth/create/join/ready/start/move/resign/game_end smoke を通す
- [ ] 2つのブラウザセッションで同一ルームへ合流し、交互に指せることを手動確認する
- [x] PvP のエラー表示、切断時表示、再接続時表示を整理する
- [x] PvP 終局後の Result からロビーへ戻る導線を調整する

## 3. Friend Match / Locked Lobby
- [x] ルーム作成時にルームキーを設定できる
- [x] 鍵付きルームは一覧で鍵付き表示にする
- [x] ルームキー入力で既存ルームに参加できる
- [x] 直接 roomId + password で非公開ルームへ参加できる
- [x] 鍵付き/非公開ルームの観戦可否をサーバ仕様に合わせる
- [x] 観戦可否トグルをルーム作成 UI に用意する
- [x] ルーム作成画面で時間、先後、罠数などの詳細設定を整理する
- [x] ルーム作成のデフォルト持ち時間をインベーダー15秒フェーズ、他バリアント3分+秒読み30秒にする
- [x] ロビー画面で参加者、READY、退出/解散、開始待ちを見やすくする
- [x] 罠バリアントの事前セットアップフェーズをロビー/対局開始フローへ接続する

## 4. Lobby Spectating
- [x] 公開ロビー一覧から満席/対局中ルームを観戦として開ける
- [x] 観戦者用 WS auth（`mode: spectator`）で接続する
- [x] 観戦者は着手、投了、罠設定ができない
- [x] 観戦中に対局者、バリアント、残り時間、着手履歴、終局理由を表示する
- [x] 観戦中の接続失敗、終了済み、ルーム削除時のフォールバックを実装する
- [x] 非公開/鍵付きルームの観戦可否をサーバ仕様と一致させる
- [ ] 観戦中の初期 snapshot と以後の move の重複適用を実機に近い操作で確認する
- [x] 観戦画面の終局後導線を整理する

## 5. Replay / Records Compatibility
- [x] PvP 終局後に JKF または互換棋譜メタデータを表示する
- [x] PvP / 観戦の棋譜メタデータに roomId、座席、記録元、USI 履歴を含める
- [x] アプリ版に合わせ、着手ごとの `effects` を JKF `moves[].effects` に保持する
- [x] 影武者の真王情報をアプリ版と同じ `trueKingSente` / `trueKingGote` metadata に寄せる
- [x] Result の棋譜プレビューで effects 件数と effect type を確認できる
- [ ] モバイル保存棋譜と Web 表示のスキーマ差分を整理する（実装前に案確認）
- [ ] 棋譜 URL から観戦/再生へ遷移する将来導線を設計する（実装前に案確認）
- [ ] Web 側の簡易リプレイ画面を設計する（実装前に案確認）

## 6. Web UX / Production Readiness
- [ ] デスクトップ優先の盤面、ロビー、観戦レイアウトを仕上げる
- [ ] モバイルブラウザでも最低限プレイ/観戦できるレスポンシブ対応を行う
- [ ] 駒移動、捕獲、成り、罠、神隠しのアニメーション方針をアプリ版に合わせて整理する
- [ ] SE の扱いを決める（Web 版で実装するか、初期リリースでは非対応にするか）
- [x] `/healthz` / `/readyz` 相当の接続状態表示を用意する
- [x] deploy target、環境変数、CORS、WebSocket origin 方針を確定する
- [x] README の起動手順と環境変数を実態に合わせて更新する

## 7. Verification Tasks
- [x] `npm run build` が通る
- [x] `npm run lint` が通る
- [x] Cloudflare smoke で Web 同士の基本 PvP が通る
- [x] Cloudflare smoke で鍵付き/非公開/観戦可否の基本仕様が通る
- [ ] 全5バリアントの PvC を対局開始から終局まで確認する
- [ ] 全5バリアントの PvP を対局開始から終局まで確認する
- [ ] 公開ロビーから観戦し、着手同期と終局表示を確認する
- [ ] 鍵付きロビーで鍵なし参加が拒否され、正しい鍵で参加できることを確認する

## 8. Device-Dependent Checks
- [ ] Web 作成ルームへスマホ実機から参加できることを確認する
- [ ] スマホ作成ルームへ Web から参加できることを確認する
- [ ] Web 2ブラウザ + スマホ 1台の混在 smoke を確認する
- [ ] スマホブラウザで盤面、ロビー、観戦が最低限操作できることを確認する

## Current Constraints / Notes
- Web版では観戦リアクションは扱わない。
- 本将棋/Standard は正式モードにしない。
- Web版は MVP として、棋譜再生・詳細な棋譜管理・モバイル保存棋譜の完全互換などのリッチ機能を制限する。Result の JKF 互換プレビューと最低限のメタデータ確認を優先し、完全な Replay / Records 互換は将来設計扱いにする。
- モバイル保存棋譜との差分整理、棋譜 URL、リプレイ画面は実装前に案を確認する。
- 実機が必要な検証は `Device-Dependent Checks` に残し、実機なしで進められる実装タスクとは分ける。
- 今後は `D:\dev\repos\exshogi-web` 直下で会話を起動してもよい。ただし仕様の正は `D:\dev\repos\exshogi-app` のモバイル版とし、Web はモバイル版への追従実装として扱う。
- デフォルト時間は通常3分、切れたら一手30秒。インベーダーは1フェーズ15秒。
- スマホアプリとブラウザが同一 PvP サーバ・同一ルーム・同一 protocol で対戦できることを最重要の互換条件にする。

## 2026-05-18 差異縮小メモ
- Web の着手候補選択で共有エンジンの `filterMovesByConstraints` を通すようにし、とるいちの捕獲必須制約が UI 操作にも反映されるようにした。
- 盤面に捕獲必須対象、罠マーカー、インベーダーの移動済み駒を表示する基礎 UI を追加した。
- 対局上部にバリアント状態ストリップを追加し、罠の王ヒット数、神隠し履歴/王免疫、直近 effect を表示するようにした。
- 影武者は終局 Result で真王情報を表示する基礎 UI を追加した。
- 罠の事前セットアップ操作、インベーダーのフェーズ残り時間/開始終了操作、神隠し予告 UI は未完了のまま。

## 2026-05-18 Web 起点準備メモ
- `AGENTS.md` に、モバイル版を正として Web を追従させる方針、比較対象ファイル、デフォルト時間、PvP 互換条件を明記した。
- `README.md` を Vite テンプレートから EX Shogi Web 用の起動・検証・モバイル追従手順へ置き換えた。
- Web の PvP ルーム作成デフォルトを通常3分+秒読み30秒、インベーダー15秒フェーズとして明文化した。

## 2026-05-18 CPU fallback UI メモ
- PvC/Quick の対局中に CPU の WASM 状態、思考中/待機、CPU Lv と search depth を表示する `cpu-engine-strip` を追加した。
- WASM 失敗/タイムアウト時は JS fallback の発生回数と直近理由を対局中 UI と Result に表示するようにした。
- 棋譜メタデータ側の `engineMode` / `fallbackCount` は既存実装のまま継続利用する。

## 2026-05-20 インベーダーフェーズ UI メモ
- 通常バリアントは着手後に `sideToMove` を交代し、インベーダーはフェーズ終了まで同じ手番を維持するようにした。
- インベーダー対局中にフェーズ残り15秒、手番、移動済み駒数、手動フェーズ終了ボタンを表示するようにした。
- フェーズ終了時は移動済み駒リストをリセットして相手フェーズへ移る。フェーズ終了時に自玉が王手なら `phase-end-check` で敗北扱いにする。
- 現行 PvP server protocol は `move` 単位で手番を進めるため、インベーダーの PvP フェーズ同期は別途 protocol/server 側の調整が必要。

## 2026-05-20 罠セットアップ UI メモ
- 罠バリアントの対局開始時にセットアップパネルを表示し、盤面クリックで既定3個の罠を配置できるようにした。
- 同一マス複数配置を許可し、選択中の罠数を盤面マーカーと状態ストリップへ表示する。
- PvC/Quick では確定時に相手側の罠をランダム生成し、共有エンジンの `variantState.trap.charges` へ反映する。
- PvP では `trap_setup` WS message を送信できるようにした。現行サーバの public room state は `trapSetup` 詳細を返さないため、Web 側はセッションの罠数または既定3個で操作する。

## 2026-05-20 神隠し UI メモ
- `variantState.disappearance.forecast` を使い、予告タイプ、発生までの手数、公開マスを対局中パネルへ表示するようにした。
- 予告中の公開マスは盤面上に紫系マーカーで表示し、Type D の全開示後は濃い confirmed 表示に切り替える。
- 直近 `disappearance` / `disappearance_immune` effect を盤面上に消失/免疫マーカーとして表示する。
- モバイル版と同じく、予告マスから駒が移動して空になった場合は予告ハイライトを出さない。

## 2026-05-20 ロビー状態 UI メモ
- 入室中パネルに部屋状態、開始までの進行ステップ、座席別の参加/READY/自席表示を追加した。
- ホスト以外は START を押せない表示にし、両者 READY 後はホスト開始待ちを明示する。
- READY トグルの送信値をローカル state ではなく最新 snapshot の `ready` 状態から決めるようにし、再接続や state 同期後も解除できるようにした。
- ホスト席では退出ボタンを `解散/退出` 表示にした。現行 API は明示的な解散 endpoint ではなく leave 操作を使う。

## 2026-05-20 罠 PvP セットアップフロー メモ
- 罠ルームで START 後にサーバ状態が `setup` になった場合、ロビーから対局画面へ遷移して罠配置 UI を開くようにした。
- WebSocket の `trap_setup` 送信後は、相手の配置完了待ちパネルを表示し、サーバ状態が `playing` になるまで盤面着手を受け付けないようにした。
- `playing` 到達後に通常の PvP 着手操作へ移行する。現行 public room state には相手側 trap selections が含まれないため、Web クライアント単体では相手罠の盤面表示までは同期できない。

## 2026-05-20 PvP 接続状態 UI メモ
- Play 画面で PvP WebSocket の connecting / connected / disconnected / error を状態ストリップと通知パネルに表示するようにした。
- disconnected / error では再接続ボタンから同一 session で WebSocket を張り直せるようにした。
- PvP は room status が `playing` かつ WebSocket 接続済みの場合のみ通常着手を受け付けるようにした。

## 2026-05-20 PvP 終局後導線メモ
- PvP の Play 画面から退出する場合は、保存済み PvP session を破棄して同じバリアントの PvP ロビーへ戻るようにした。
- Result の主ボタンは PvP では `ロビーへ戻る`、PvC / Quick では `トップへ` と表示を分けた。

## 2026-05-20 観戦終局後導線メモ
- 観戦中に `game_end` を受信した場合、サーバの `checkmate` / `disconnect` 理由もローカル Result に反映するようにした。
- 観戦 Result の主ボタンは `観戦ロビーへ戻る` と表示し、保存済み PvP session を破棄して同じバリアントのロビーへ戻る。

## 2026-05-20 PvP 疎通状態表示メモ
- PvP ロビーに HTTP URL、WebSocket URL、backend 種別、auth / rooms API の疎通結果を表示する状態パネルを追加した。
- 専用 `/healthz` / `/readyz` endpoint の有無に依存せず、Web が実際に使う guest auth と room list の成功を `ready` 相当として扱う。
- 手動の `疎通確認` ボタンで、現在の設定先に対して再チェックできるようにした。

## 2026-05-20 README 起動手順更新メモ
- README に PvP backend / HTTP URL / WebSocket URL の環境変数、runtime override、PvP 疎通状態表示の扱いを追記した。
- 現在の作業環境では `pnpm` が PATH に無いため、検証済みの `npm run ...` を主導線として記載し、pnpm は利用可能な場合の同等コマンドとして補足した。
- 現在の Web 実装面として PvC / Quick、PvP ロビー、観戦、5バリアント UI、JKF 互換 Result プレビューを整理した。

## 2026-05-20 Deploy / Origin 方針メモ
- Production は Vite static web build と Cloudflare Workers PvP server を同一 `www.exshogi.com` origin で扱う方針にした。
- PvP 既定値は `https://www.exshogi.com` / `wss://www.exshogi.com` の Cloudflare target とし、local / LAN 検証時だけ環境変数または runtime override で express-compatible server に向ける。
- CORS と WebSocket origin は production web origin と明示した local development origin のみ許可し、認証付き room API で wildcard CORS に依存しない方針にした。

## 2026-05-20 exshogi 差異確認メモ
- 正は `D:\dev\repos\exshogi-app` の現在の作業ツリーとする。特に `apps/mobile-rn/src/constants/settings.ts`、`apps/mobile-rn/src/constants/pvc-setup.ts`、`apps/mobile-rn/src/hooks/useLocalClock.ts`、`apps/mobile-rn/src/storage/game/types.ts`、`workers/src/types.ts` を参照する。
- ルール定義は Web が `@exshogi/engine-core` を link しており、5バリアントの `VariantSpec`、CPU Lv1-5、デフォルトバリアントは概ね一致している。差異対応は UI/運用層を優先する。
- Web の PvC / Quick 時計は `src/screens/Play/PlayScreen.tsx` で `10分切れ負け` 固定になっている。正は通常 `3分 + 秒読み30秒`、インベーダーは `15秒フェーズ`。Web ロビーの作成プリセットは正に寄っているが、対局画面のローカル時計は未追従。
- Web の秒読み表示・外部クロック同期は、モバイル側の `useLocalClock.ts` / `DigitalClock.tsx` の最新挙動に未追従。モバイル側は byoyomi phase、低時間表示、Invader 秒表示、PvP 外部クロック補正を持つ。
- Web の Invader PvP は、現行 server message の `move` 単位で `turnSeat` を反転する前提が残る。正はフェーズ終了まで同じ手番を維持するため、Web とスマホの混在 PvP では protocol/server 側を含めたフェーズ同期が必要。
- Web の棋譜は MVP 制限として `src/domain/kifu.ts` の `buildSimpleJkf` ベースのプレビュー中心に留める。正の `StoredResult` は `timeControls`、`senteTrapCount` / `goteTrapCount`、`moveTimestamps`、`reactions`、`phaseLogs`、`handSnapshots`、`moveStates`、`engineProfile` などを保持するが、Web では完全な Replay / Records 互換を当面の必須条件にしない。差分整理は「制限事項の明文化」と「将来接続時の設計案」までを優先する。
- Web の罠設定は単一 `trapCount` 中心。正の保存型は `senteTrapCount` / `goteTrapCount` を持つため、独立罠数の完全互換は未達。PvP server public state も相手側 trap selections を返さないため、Web 単体では相手罠の盤面表示まで同期できない。
- Web では観戦リアクションを扱わない方針のまま。Workers 側は `reaction` message と rate limit を持つため、非対応を維持するなら Web 側の型/API表示で誤解が出ないよう整理する。
- 次に差異を縮める優先順は、1) Web ローカル時計を `3分 + 秒読み30秒` / Invader `15秒` に合わせる、2) Invader PvP のフェーズ同期を正に寄せる、3) 棋譜/StoredResult 差分を MVP 制限事項として整理する、4) 独立罠数と trap setup state の扱いを整理する。

## 2026-06-09 Codex stage2 メモ
- `PlayScreen` の PvC / Quick ローカル時計をモバイル既定値へ合わせ、通常バリアントは `3分 + 秒読み30秒`、インベーダーは `15秒フェーズ` の表示と進行に更新した。
- 秒読み突入後は active side を秒表示へ切り替え、着手後に 30 秒へ戻すようにした。30 秒未満の main time と 10 秒未満の byoyomi は sidebar で警告色にする。
- インベーダーは active side のみ `0.1秒` 単位でフェーズ秒表示し、非 active side は `---` を表示する。PvP の protocol/server 側フェーズ同期は引き続き未対応で、今回の修正対象外。
