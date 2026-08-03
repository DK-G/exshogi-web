# spec.md

> このファイルはAI向けの開発仕様書。READMEとは別物。  
> 新しいセッション開始時はこのファイルを最初に読み込ませること。

-----

## 1. コンセプト

- **概要**: ExShogi（変則将棋アプリ）のブラウザ実装（**exshogi-web**）。モバイルアプリと同じ Cloudflare Workers ルームサーバー・WebSocketプロトコルを通じてブラウザ↔スマートフォン間のPvPを実現する。
- **ブランドコンセプト**: **「また、誘える将棋」**。盤面と駒は本格的な将棋らしさを守り、Home / Lobby / Result / Share など盤外体験は温かく柔らかい「誘いやすさ」を優先する。
- **設計思想 / 譲れない核**: **モバイルアプリ（exshogi-app）が source of truth**。Web版はモバイルのデフォルト・ルール・PvPプロトコル・リプレイ仕様・エフェクト挙動に従う。明示的に承認された Web 専用の差異のみ許容。`react-native-web` は使用しない。
- **ターゲットユーザー**: ブラウザからExShogiをプレイしたいユーザー。
- **現在のフェーズ**: 基本機能（PvC・PvP・5バリアント・リプレイ）実装済み。詳細は [`task.md`](task.md) を参照。
- **ブランド方針**: [`docs/brand-design-direction.md`](docs/brand-design-direction.md) を参照。高級和風は主軸ではなく補助表現とし、Web とアプリが同じ系譜に見える温かい盤外体験へ寄せる。

-----

## 2. 技術スタック

| 領域 | 採用技術 | バージョン | 選定理由 |
|---|---|---|---|
| フロントエンド | Vite + React + TypeScript | - | 高速ビルド、モバイルと同じReact |
| エンジン | `@exshogi/engine-core` / `engine-clocks` / `notation` | - | モバイルと同じパッケージを共有 |
| PvPサーバー | Cloudflare Workers（WebSocket） | - | モバイルと同一サーバー |
| デプロイ | 静的Viteビルド（`www.exshogi.com`） | - | - |
| パッケージマネージャ | npm（pnpmも利用可） | - | - |

-----

## 3. アーキテクチャ

### ディレクトリ構成

```
/src                  # Viteアプリ本体
package.json
vite.config.*
```

### データの流れ

```
ユーザー操作（ブラウザ）
  ↓ @exshogi/engine-core（合法手生成・バリアントルール）
  ↓ WebSocket ↔ Cloudflare Workers PvPサーバー（PvP時）
  ↓ 盤面更新 → UI再描画

PvP環境変数:
  VITE_EXSHOGI_PVP_BACKEND: cloudflare | express
  VITE_EXSHOGI_PVP_BASE_URL: HTTP接続先
  VITE_EXSHOGI_PVP_WS_URL: WebSocket接続先
```

-----

## 4. 制約・禁止事項 ★最重要

- **モバイルアプリが source of truth**: Web側でモバイルと異なる挙動を実装したい場合は、明示的に承認を取ってから行う。黙ってモバイルから逸脱しない。差異が生じた場合は `task.md` に記録する。
- **ブランドの上位原則**: 「盤上は本格、盤外は誘いやすい」。黒漆・金箔・荘厳さを全面化するのではなく、和紙・淡い木目・柔らかい余白を基調にした誘いやすさを優先する。
- **`react-native-web` 使用禁止**: ネイティブ実装は使用しない。
- **本番デプロイターゲット固定**: `www.exshogi.com` を本番デフォルトとする。ブラウザランタイムの上書き（`globalThis.EXSHOGI_PVP_*`）は煙テスト・緊急切り替え専用。checked-in の本番デフォルトを変更しない。
- **CORS/WebSocketオリジン管理**: ワイルドカードCORSは認証ルームAPIに使わない。既知の本番オリジンとローカル開発オリジンのみ許可。
- **パリティチェック**: Web の挙動変更前はモバイル実装を先に確認する（デフォルト・設定: `mobile/exshogi/apps/mobile-rn/src/constants` 等）。

-----

## 5. 命名・コーディング規約

- **言語**: TypeScript。
- **ビルド/バンドル**: Vite。
- **コマンド**:
  - `npm run dev` — 開発サーバー
  - `npm run build` — 本番ビルド
  - `npm run lint` — リント
  - `npm run preview` — ビルドのローカル確認
  - `npm run pvp:smoke` — PvP接続スモークテスト

-----

## 6. 既知の落とし穴

- **モバイルとの仕様乖離**: モバイル側でエンジン・ルール・プロトコルが変更された場合、Web側も追従が必要。追従しない場合は `task.md` に Gap として明記する。
- **PvPエンドポイント切り替え**: `VITE_EXSHOGI_PVP_BASE_URL` を明示しないと localhost 判定で `express` バックエンドとして扱われる。本番スモークテスト時はURLを必ず指定する。
- **WASM CPUのフォールバック**: WASM CPUが失敗した場合は JSフォールバックが動作することを確認済み。

-----

## 7. 決定ログ

- `2026-xx-xx` **モバイル app を source of truth と位置づけ**: 2プラットフォーム間の仕様二重管理を防ぐため、Web版は明示的差異以外はモバイルに従うルールを確立。
- `2026-xx-xx` **react-native-web 不採用**: Web専用のVite + React構成を採用。

-----

## 8. 未解決 / TODO（仕様レベル）

- モバイルとのパリティギャップ一覧（`task.md` 管理）
- PvPサービスステータスパネルの永続的表示仕様
- ゲスト認証・ルームAPIのエラーハンドリング強化


## 検証ツール (Validation Tools)

現在のプロジェクトで実装・導入されている検証ツールは以下の通りです：

- ESLint
- TypeScript
