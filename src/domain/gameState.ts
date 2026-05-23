import {
  assignHiddenTrueKing,
  ensurePieceUids,
  setupStandardShogi,
  type GameState,
  type VariantSpec,
} from '@exshogi/engine-core';

export function createInitialGameState(spec?: VariantSpec): GameState {
  const state: GameState = {
    board: {
      width: 9,
      height: 9,
      cells: new Array(81).fill(null).map(() => ({})),
    },
    hands: { sente: {}, gote: {} },
    sideToMove: 'sente',
    variantState: buildInitialVariantState(spec),
  };

  setupStandardShogi(state);

  if (
    spec?.winCondition?.type === 'capture-role' &&
    spec.hiddenRole?.assign === 'random-per-game'
  ) {
    assignHiddenTrueKing(state);
  }

  ensurePieceUids(state.board);
  return state;
}

function buildInitialVariantState(spec?: VariantSpec): GameState['variantState'] {
  if (!spec) return undefined;

  return {
    ...(spec.turnModel === 'multi-move'
      ? { multiMove: { movedPieceUids: [] } }
      : {}),
    ...(spec.trap
      ? {
          trap: {
            charges: { sente: {}, gote: {} },
            kingHits: { sente: 0, gote: 0 },
          },
        }
      : {}),
    ...(spec.disappearance
      ? {
          disappearance: {
            history: [],
            kingGuard: { sente: 1, gote: 1 },
          },
          rngSeed: Math.floor(Math.random() * 65536),
        }
      : {}),
  };
}
