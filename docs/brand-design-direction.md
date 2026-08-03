# EX Shogi Web Brand Design Direction

## Core Concept

EX Shogi のブランドコンセプトは **「また、誘える将棋」** とする。

Web 版はスマートフォン版と同じ PvP ルームへ入れる入口であり、単なる高級感よりも「友だちを誘いやすい」「もう一局と言いやすい」温度を優先する。

## Design Principle

**盤上は本格、盤外は誘いやすい。**

- 盤面、駒、時計、勝負所の演出は将棋らしい重みを維持する。
- Home、ModeSelect、PvP Lobby、Result、共有導線は温かく柔らかい空気に寄せる。
- 黒漆・金箔はブランドの格を出す補助要素であり、画面全体を支配する主役にはしない。
- 「高級な和風ゲーム」ではなく、「本格的な盤を囲みつつ、気軽に誘える変則将棋」として見せる。

## Visual Direction

### Keep

- 榧の盤面、和紙調の駒、墨色の文字など、将棋としての説得力。
- 金箔のハイライト、漆赤の危険表現、バリアントごとの演出色。
- 対局中の緊張感と特殊ルールの視覚的な強さ。

### Shift

- 背景の主役を黒漆から、明るい和紙・淡い木目・暖かい余白へ寄せる。
- 金箔ボタンは最重要 CTA や勝利演出に限定し、通常操作は柔らかい面で支える。
- 暗いパネルや強い影は、対局中やモーダルなど集中が必要な場面に限定する。
- Web 独自のデスクトップ感は、威圧感ではなく「余裕のある盤を囲む場」として出す。

## Tone And Copy

Web 版のコピーは「開始」より「誘う」「囲む」「もう一局」を重視する。

Preferred:

- 友だちと遊ぶ
- 部屋をつくる
- 合言葉で合流
- もう一局誘う
- 観戦する
- 棋譜を見せる

Avoid as primary labels:

- 対人戦開始
- PvP MATCH
- ZEN ARCHIVE EDITION
- 高級 / プレミアム / 荘厳 を前面化した表現

英字は補助ラベルとして使う。公開ブランドでは `EX将棋` を主表記、`EX SHOGI` を副表記にする。

## Palette Guidance

Base:

- Warm paper: `#FFF8F0` / `#FCFAF2`
- Soft surface: `#FFFBF5`
- Kaya wood: `#E8D2A1` / `#E3C08D`
- Sumi ink: `#1C1C1C`

Accent:

- Kinpaku gold: `#D4AF37`
- Urushi red: `#A4161A`
- Lacquer black: `#0D0D0D`
- Success green: `#4F7942`

Variant accents remain secondary:

- Toruichi: red thread / capture urgency
- Kagemusha: muted purple / hidden role
- Invader: orange / phase energy
- Trap: urushi red / reveal and danger
- Kamikakushi: purple / forecast and disappearance

## Screen-Level Rules

Home:

- First impression should feel approachable, not ceremonial.
- Use the EX将棋 logo lockup, but place it in a warm play invitation rather than a luxury title card.

Mode Select:

- Present variants as invitations to different play moods.
- Keep rule information concise and scannable.

PvP Lobby:

- Treat the lobby as a small shared room.
- Room key, participant state, ready state, and invite/copy actions should be visually friendly and easy to explain.

Play:

- Preserve current board and piece seriousness.
- Use warm UI chrome around the board; reserve dark lacquer surfaces for clocks, danger, and focus states.

Result:

- The primary loop is not only victory confirmation; it is "again, invite, share".
- Make rematch/share/invite routes stronger than passive return routes.

## Cross-Platform Alignment

Mobile remains the source of truth for rules, protocol, and gameplay behavior.

For branding, Web and Mobile should share:

- Product concept: 「また、誘える将棋」
- Public name: `EX将棋`
- Board/piece seriousness
- Warm off-board surfaces
- Variant accent meanings
- Result-to-invite loop

Web may use desktop density and layout freedom, but should not diverge into a colder, heavier, luxury-only visual identity.
