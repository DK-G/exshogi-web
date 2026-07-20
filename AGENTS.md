# Project Agent Guide

This project is managed from the portfolio workspace at `D:\dev`.
Coding sessions should normally start in this project folder. This file is the
local entrypoint for agents working on this project.

## Shared Portfolio Rules

Use these shared files as the source of truth for cross-project behavior:

- Common guide: `D:\dev\AGENTS.md`
- Shared routines: `D:\dev\docs\skills\`

Keep this file focused on project-specific context. Do not copy the full shared
routine bodies into this project.

## Local Read Order

Read local files in this order:

1. `task.md` for the current work and handoff notes
2. `plan.md` for scope, constraints, and non-goals
3. `roadmap.md` for future work
4. Mobile source files under `D:\dev\repos\exshogi-app` when behavior,
   defaults, protocol, rules, animation, replay, or PvP compatibility is in
   scope
5. `inspection-list.md`, if present, for verification expectations
6. `README.md` for setup and commands

## Routine Invocation

When the user invokes one of these names, read the matching portfolio routine:

- `bynote`: `D:\dev\docs\skills\bynote.md`
- `bythink`: `D:\dev\docs\skills\bythink.md`
- `bycheck`: `D:\dev\docs\skills\bycheck.md`
- `bygit`: `D:\dev\docs\skills\bygit.md`
- `bystitch`: `D:\dev\docs\skills\bystitch.md`
- `bysearch`: `D:\dev\docs\skills\bysearch.md`

If the shared file cannot be read, continue with the same intent using local
primary sources and mention the unavailable shared file in the result.

## Project-Specific Notes

- Main stack: Vite + React DOM + TypeScript web app, pnpm, linked EX Shogi engine packages from `D:\dev\repos\exshogi-app`.
- Main commands: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm preview`.
- Source of truth: the mobile app in `D:\dev\repos\exshogi-app` is canonical. Web must follow mobile behavior unless the user explicitly approves a web-only deviation.
- Cross-device goal: Web browser and smartphone app must be able to join the same PvP server, same room, same protocol, and exchange moves.
- Default timing: non-Invader games default to 3 minutes main time, then 30 seconds per move. Invader defaults to a 15 second phase.
- Default rules/settings: preserve the mobile app's five launch variants, CPU Lv1-5 policy, default trap count, replay/JKF metadata semantics, and PvP room protocol.
- Visual/feel parity: board, pieces, clocks, result, variant effects, trap, disappearance, Kagemusha reveal, Invader phase, sounds/animations should be treated as mobile parity work first, then desktop polish second.
- Important constraints: do not use `react-native-web`; reuse mobile engine/logic packages through existing links; preserve premium desktop browser UX goals; protect any future external input with Model Armor or an equivalent guard.
- Known risks: linked local packages make this project sensitive to changes in `D:\dev\repos\exshogi-app`; when in doubt, inspect mobile files before changing Web defaults or protocol.

## Mobile Source Checklist

Before changing Web behavior in these areas, compare against mobile first:

- Defaults/settings: `D:\dev\repos\exshogi-app/apps/mobile-rn/src/constants/`,
  `D:\dev\repos\exshogi-app/apps/mobile-rn/src/hooks/matching/`,
  `D:\dev\repos\exshogi-app/apps/mobile-rn/src/hooks/play-screen/`
- Rules/engine: `D:\dev\repos\exshogi-app/packages/engine-core/`
- PvP protocol/server: `D:\dev\repos\exshogi-app/workers/src/`,
  `D:\dev\repos\exshogi-app/apps/mobile-rn/src/services/pvp/`
- Replay/records: `D:\dev\repos\exshogi-app/apps/mobile-rn/src/hooks/game-session/`,
  `D:\dev\repos\exshogi-app/packages/notation/`
- UI/effects/audio: `D:\dev\repos\exshogi-app/apps/mobile-rn/src/components/`,
  `D:\dev\repos\exshogi-app/apps/mobile-rn/src/hooks/game-session/`,
  `D:\dev\repos\exshogi-app/apps/mobile-rn/src/assets/`
