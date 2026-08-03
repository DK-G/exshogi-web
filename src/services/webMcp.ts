import { gameStateToSfen, type GameState } from '@exshogi/engine-core';

export interface WebMcpGameState {
  variantKey: string;
  gameMode: string;
  turn: string;
  isFinished: boolean;
  winner: string | null;
  board: unknown;
  capturedPieces: unknown;
  gameState: GameState;
}

let currentGetStateFn: (() => WebMcpGameState | null) | null = null;

export function registerWebMcp(getStateFn: () => WebMcpGameState) {
  if (typeof window === 'undefined') return;

  currentGetStateFn = getStateFn;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).__webMcpRegistered) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigatorAny = navigator as any;
  if ('modelContext' in navigatorAny && navigatorAny.modelContext?.registerTools) {
    try {
      navigatorAny.modelContext.registerTools([
        {
          name: 'exshogi_get_game_info',
          description: 'Retrieve the current game mode, selected variant rules, active turn, and whether the game has finished.',
          parameters: { type: 'object', properties: {} },
          execute: async () => {
            const state = currentGetStateFn?.();
            if (!state) {
              return { error: 'No active game session found.' };
            }
            return {
              variantKey: state.variantKey,
              gameMode: state.gameMode,
              turn: state.turn,
              isFinished: state.isFinished,
              winner: state.winner,
            };
          }
        },
        {
          name: 'exshogi_get_board_state',
          description: 'Retrieve the detailed board layout (piece placement), captured pieces for both players, and the SFEN representation of the board.',
          parameters: { type: 'object', properties: {} },
          execute: async () => {
            const state = currentGetStateFn?.();
            if (!state) {
              return { error: 'No active game session found.' };
            }
            let sfen = '';
            try {
              sfen = gameStateToSfen(state.gameState, state.gameState.sideToMove);
            } catch (e) {
              console.warn('[WebMCP] Failed to generate SFEN:', e);
            }
            return {
              board: state.board,
              capturedPieces: state.capturedPieces,
              turn: state.turn,
              isFinished: state.isFinished,
              sfen: sfen,
            };
          }
        }
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__webMcpRegistered = true;
      console.log('[WebMCP] Successfully registered read-only tools.');
    } catch (e) {
      console.error('[WebMCP] Failed to register tools:', e);
    }
  } else {
    console.log('[WebMCP] Not supported in this browser environment (no navigator.modelContext).');
  }
}

export function unregisterWebMcp() {
  currentGetStateFn = null;
}
