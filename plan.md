# EX Shogi Web - Project Plan

EX将棋のブラウザ版です。モバイル版の資産（エンジン、ロジック）を最大限に再利用しながら、WebならではのプレミアムなUI/UXを提供します。

## 要求事項 (Requirements)
- モバイル版の将棋エンジン (`nshogi-engine`) を WebAssembly で動作させる。
- 共有パッケージ (`packages/shared` 等) を使用した状態管理。
- デスクトップブラウザに最適化された、リッチでスムーズなUI。
- プレミアムな質感（アニメーション、グラスモーフィズム等）。

## 制約 (Constraints)
- `react-native-web` は使用せず、React DOM で構築する。
- 外部入力（チャット等）がある場合は Model Armor で保護する。

## ゴール (Goals)
- [ ] モバイル版と同等の棋力での対局。
- [ ] スムーズな駒操作と高品質な視覚効果。
- [ ] ローカルファーストな設計。
