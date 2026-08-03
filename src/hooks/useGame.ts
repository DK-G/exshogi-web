import { useState, useCallback, useMemo } from 'react';
import { 
  generateMovesForCoord, 
  generateMoves,
  filterMovesByConstraints,
  applyMoveWithWinCheck, 
  isKingInCheck,
  isCaptureMove,
  type GameState,
  type Coord,
  type Move,
  type Side,
  type TrapChargeBySide,
  type VariantEffect,
} from '@exshogi/engine-core';
import { createInitialGameState } from '../domain/gameState';
import {
  DEFAULT_VARIANT_KEY,
  createVariantSpec,
  type VariantKey,
} from '../domain/variants';
import type { PieceType } from '../components/Board/types';

interface UseGameOptions {
  onLocalMove?: (move: Move, usi: string) => void;
  onMoveApplied?: (side: Side) => void;
}

export interface GameResult {
  winner: Side | 'draw';
  reason: string;
  endedAt: string;
}

export interface UIPiece {
  type: PieceType;
  player: 'b' | 'w'; // b: sente, w: gote
  isPromoted?: boolean;
}

const PIECE_TYPE_MAP: Record<string, PieceType> = {
  'FU': 'P', 'KY': 'L', 'KE': 'N', 'GI': 'S', 'KI': 'G', 'KA': 'B', 'HI': 'R', 'OU': 'K',
  'TO': 'P', 'NY': 'L', 'NK': 'N', 'NG': 'S', 'UM': 'B', 'RY': 'R'
};

export const useGame = (
  variantKey: VariantKey = DEFAULT_VARIANT_KEY,
  options: UseGameOptions = {},
) => {
  const variantSpec = useMemo(() => createVariantSpec(variantKey), [variantKey]);
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(variantSpec),
  );
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ move: Move; promoteOnly: boolean } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [moveEffects, setMoveEffects] = useState<VariantEffect[][]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());

  const applyMove = useCallback((move: Move, label?: string, notifyLocal = false) => {
    const movingSide = gameState.sideToMove;
    const moveLabel = label ?? generateMoveLabel(gameState, move);
    const applied = applyMoveWithWinCheck(gameState, variantSpec, move);
    setGameState(advanceTurnAfterMove(applied.next, variantSpec));
    setMoveHistory(prev => [...prev, moveLabel]);
    setMoveEffects(prev => [...prev, applied.effects ?? []]);
    options.onMoveApplied?.(movingSide);
    if (notifyLocal) {
      options.onLocalMove?.(move, moveToUsi(move));
    }
    setSelectedCoord(null);
    setValidMoves([]);
    if (applied.winner) {
      setResult({
        winner: applied.winner,
        reason: applied.reason ?? 'game-end',
        endedAt: new Date().toISOString(),
      });
    }
  }, [gameState, options, variantSpec]);

  // Convert engine board to UI board
  const uiBoard = useMemo(() => {
    const board: (UIPiece | null)[][] = Array(9).fill(null).map(() => Array(9).fill(null));
    const promotedTypes = ['TO', 'NY', 'NK', 'NG', 'UM', 'RY'];

    gameState.board.cells.forEach((cell, index) => {
      if (cell.piece) {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const eType = cell.piece.type;
        board[row][col] = {
          type: PIECE_TYPE_MAP[eType] || eType,
          player: cell.piece.side === 'sente' ? 'b' : 'w',
          isPromoted: promotedTypes.includes(eType)
        };
      }
    });
    return board;
  }, [gameState]);

  // Convert engine hands to UI hands
  const capturedPieces = useMemo(() => {
    const mapHand = (hand: Record<string, number>) => {
      const mapped: Record<string, number> = {};
      Object.entries(hand).forEach(([type, count]) => {
        const uiType = PIECE_TYPE_MAP[type] || type;
        mapped[uiType] = (mapped[uiType] || 0) + count;
      });
      return mapped;
    };

    return {
      sente: mapHand(gameState.hands.sente),
      gote: mapHand(gameState.hands.gote)
    };
  }, [gameState]);

  const captureTargets = useMemo(() => {
    if (!variantSpec.constraints?.mustCapture) return [];
    const constrained = filterMovesByConstraints(
      gameState,
      variantSpec,
      filterMultiMoveUsedPieces(
        gameState,
        variantSpec,
        generateMoves(gameState, gameState.sideToMove),
      ),
      gameState.sideToMove,
    );
    const keys = new Set<string>();
    const targets: [number, number][] = [];
    constrained.filter((move) => isCaptureMove(gameState, move)).forEach((move) => {
      const key = `${move.to.rank},${move.to.file}`;
      if (keys.has(key)) return;
      keys.add(key);
      targets.push([move.to.rank - 1, 9 - move.to.file]);
    });
    return targets;
  }, [gameState, variantSpec]);

  const trapMarkers = useMemo(() => {
    const charges = gameState.variantState?.trap?.charges;
    if (!charges) return [];
    return (['sente', 'gote'] as const).flatMap((side) =>
      Object.entries(charges[side] ?? {}).map(([coordKey, count]) => {
        const [file, rank] = coordKey.split(',').map(Number);
        return {
          row: rank - 1,
          col: 9 - file,
          side,
          count,
        };
      }),
    );
  }, [gameState.variantState?.trap?.charges]);

  const phaseMovedCells = useMemo(() => {
    const movedUids = new Set(gameState.variantState?.multiMove?.movedPieceUids ?? []);
    if (movedUids.size === 0) return [];
    const cells: [number, number][] = [];
    gameState.board.cells.forEach((cell, index) => {
      if (!cell.piece?.uid || !movedUids.has(cell.piece.uid)) return;
      cells.push([Math.floor(index / 9), index % 9]);
    });
    return cells;
  }, [gameState.board.cells, gameState.variantState?.multiMove?.movedPieceUids]);

  const disappearanceMarkers = useMemo(() => {
    const markers: Array<{
      row: number;
      col: number;
      kind: 'forecast' | 'confirmed' | 'vanished' | 'immune';
      label?: string;
    }> = [];
    const forecast = gameState.variantState?.disappearance?.forecast;
    if (forecast) {
      const kind = forecast.type === 'D' && forecast.revealed ? 'confirmed' : 'forecast';
      forecast.announcedSquares.forEach((coord) => {
        const cell = gameState.board.cells[(coord.rank - 1) * gameState.board.width + (gameState.board.width - coord.file)];
        if (!cell?.piece) return;
        markers.push({
          row: coord.rank - 1,
          col: gameState.board.width - coord.file,
          kind,
          label: forecast.type,
        });
      });
    }

    const latestEffects = moveEffects.at(-1) ?? [];
    latestEffects.forEach((effect) => {
      if (effect.type !== 'disappearance' && effect.type !== 'disappearance_immune') return;
      markers.push({
        row: effect.coord.rank - 1,
        col: gameState.board.width - effect.coord.file,
        kind: effect.type === 'disappearance_immune' ? 'immune' : 'vanished',
        label: effect.type === 'disappearance_immune' ? '免' : '消',
      });
    });

    return markers;
  }, [
    gameState.board.cells,
    gameState.board.width,
    gameState.variantState?.disappearance?.forecast,
    moveEffects,
  ]);

  const syncFromUsiHistory = useCallback((history: string[]) => {
    let nextState = createInitialGameState(variantSpec);
    const labels: string[] = [];
    const effectRows: VariantEffect[][] = [];
    let nextResult: GameResult | null = null;

    for (const usi of history) {
      const move = parseUsi(usi, nextState.sideToMove);
      labels.push(generateMoveLabel(nextState, move));
      const applied = applyMoveWithWinCheck(nextState, variantSpec, move);
      effectRows.push(applied.effects ?? []);
      nextState = advanceTurnAfterMove(applied.next, variantSpec);
      if (applied.winner) {
        nextResult = {
          winner: applied.winner,
          reason: applied.reason ?? 'game-end',
          endedAt: new Date().toISOString(),
        };
        break;
      }
    }

    setGameState(nextState);
    setMoveHistory(labels);
    setMoveEffects(effectRows);
    setResult(nextResult);
    setSelectedCoord(null);
    setValidMoves([]);
    setPendingPromotion(null);
  }, [variantSpec]);

  const selectCell = useCallback((row: number, col: number) => {
    if (result) return;

    const coord: Coord = { file: 9 - col, rank: row + 1 };
    console.log('[useGame] selectCell:', row, col, coord);
    
    // If a move is already valid for this target
    const targetMove = validMoves.find(m => 
      m.kind === 'move' && m.to.file === coord.file && m.to.rank === coord.rank
    );

    if (targetMove) {
      console.log('[useGame] targetMove found:', targetMove);
      // Check if there are multiple options for this target (promote vs no-promote)
      const movesToTarget = validMoves.filter(m => 
        m.kind === 'move' && m.to.file === coord.file && m.to.rank === coord.rank
      );

      const canPromote = movesToTarget.some(m => m.promote);
      const mustPromote = movesToTarget.every(m => m.promote);

      if (canPromote && !mustPromote) {
        setPendingPromotion({ move: targetMove, promoteOnly: false });
        return;
      }

      // Execute move (default to promotion if must, or the selected one)
      const finalMove = mustPromote ? movesToTarget.find(m => m.promote)! : targetMove;
      
      console.log('[useGame] executing move:', finalMove);
      applyMove(finalMove, undefined, true);
      return;
    }

    // Otherwise, select the piece
    const cellIndex = row * 9 + col;
    const piece = gameState.board.cells[cellIndex].piece;
    console.log('[useGame] piece at index:', cellIndex, piece);

    if (piece && piece.side === gameState.sideToMove) {
      if (piece.uid && gameState.variantState?.multiMove?.movedPieceUids.includes(piece.uid)) {
        setSelectedCoord(null);
        setValidMoves([]);
        return;
      }
      setSelectedCoord(coord);
      const moves = filterMovesByConstraints(
        gameState,
        variantSpec,
        filterMultiMoveUsedPieces(
          gameState,
          variantSpec,
          generateMovesForCoord(gameState, gameState.sideToMove, coord),
        ),
        gameState.sideToMove,
      );
      console.log('[useGame] valid moves found:', moves.length);
      setValidMoves(moves);
    } else {
      setSelectedCoord(null);
      setValidMoves([]);
    }
  }, [applyMove, gameState, result, validMoves, variantSpec]);

  return {
    board: uiBoard,
    capturedPieces,
    captureTargets,
    trapMarkers,
    phaseMovedCells,
    disappearanceMarkers,
    turn: gameState.sideToMove,
    selectedCell: selectedCoord ? [selectedCoord.rank - 1, 9 - selectedCoord.file] as [number, number] : null,
    validMoves: validMoves.map(m => [m.to.rank - 1, 9 - m.to.file] as [number, number]),
    selectCell,
    gameState,
    executeMove: (move: Move) => {
      if (result) return;
      applyMove(move, undefined, true);
    },
    executeUsiMove: (usi: string) => {
      if (result) return;
      const move = parseUsi(usi, gameState.sideToMove);
      applyMove(move);
    },
    pendingPromotion,
    confirmPromotion: (promote: boolean) => {
      if (!pendingPromotion) return;
      if (result) return;
      const finalMove = { ...pendingPromotion.move, promote };
      applyMove(finalMove, undefined, true);
      setPendingPromotion(null);
    },
    cancelPromotion: () => {
      setPendingPromotion(null);
      setSelectedCoord(null);
      setValidMoves([]);
    },
    moveHistory,
    moveEffects,
    startedAt,
    result,
    finishRemoteGame: (winner: Side | 'draw', reason: string, endedAt?: string) => {
      if (result) return;
      setResult({
        winner,
        reason,
        endedAt: endedAt ?? new Date().toISOString(),
      });
      setSelectedCoord(null);
      setValidMoves([]);
      setPendingPromotion(null);
    },
    syncFromUsiHistory,
    setTrapCharges: (charges: TrapChargeBySide) => {
      setGameState((prev) => ({
        ...prev,
        variantState: {
          ...prev.variantState,
          trap: {
            charges: {
              sente: { ...charges.sente },
              gote: { ...charges.gote },
            },
            kingHits: prev.variantState?.trap?.kingHits ?? { sente: 0, gote: 0 },
          },
        },
      }));
      setSelectedCoord(null);
      setValidMoves([]);
      setPendingPromotion(null);
    },
    endInvaderPhase: (reason: 'manual' | 'timeout' = 'manual') => {
      if (result || variantSpec.turnModel !== 'multi-move') return;
      const endingSide = gameState.sideToMove;
      if (variantSpec.multiMove?.endCheckLose && isKingInCheck(gameState, endingSide)) {
        setResult({
          winner: otherSide(endingSide),
          reason: 'phase-end-check',
          endedAt: new Date().toISOString(),
        });
        setSelectedCoord(null);
        setValidMoves([]);
        setPendingPromotion(null);
        return;
      }
      setGameState({
        ...gameState,
        sideToMove: otherSide(endingSide),
        variantState: {
          ...gameState.variantState,
          multiMove: { movedPieceUids: [] },
        },
      });
      setMoveHistory((prev) => [
        ...prev,
        `${endingSide === 'sente' ? '▲' : '△'}フェーズ終了${reason === 'timeout' ? '(時間)' : ''}`,
      ]);
      setMoveEffects((prev) => [...prev, []]);
      setSelectedCoord(null);
      setValidMoves([]);
      setPendingPromotion(null);
    },
    resign: (side: Side = gameState.sideToMove) => {
      if (result) return;
      setResult({
        winner: side === 'sente' ? 'gote' : 'sente',
        reason: 'resignation',
        endedAt: new Date().toISOString(),
      });
      setSelectedCoord(null);
      setValidMoves([]);
      setPendingPromotion(null);
    },
    timeout: (side: Side = gameState.sideToMove) => {
      if (result) return;
      setResult({
        winner: side === 'sente' ? 'gote' : 'sente',
        reason: 'timeout',
        endedAt: new Date().toISOString(),
      });
      setSelectedCoord(null);
      setValidMoves([]);
      setPendingPromotion(null);
    },
    abort: () => {
      if (result) return;
      setResult({
        winner: 'draw',
        reason: 'abort',
        endedAt: new Date().toISOString(),
      });
      setSelectedCoord(null);
      setValidMoves([]);
      setPendingPromotion(null);
    },
  };
};

const PIECE_LABELS: Record<string, string> = {
  'FU': '歩', 'KY': '香', 'KE': '桂', 'GI': '銀', 'KI': '金', 'KA': '角', 'HI': '飛', 'OU': '玉',
  'TO': 'と', 'NY': '成香', 'NK': '成桂', 'NG': '成銀', 'UM': '馬', 'RY': '龍'
};

const KANJI_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

const generateMoveLabel = (state: GameState, move: Move): string => {
  const prefix = move.side === 'sente' ? '▲' : '△';
  const toFile = move.to.file;
  const toRank = KANJI_DIGITS[move.to.rank];
  
  let pieceLabel: string;
  if (move.kind === 'drop') {
    pieceLabel = PIECE_LABELS[move.dropPieceId!] + '打';
  } else {
    const fromCell = state.board.cells[(move.from!.rank - 1) * 9 + (9 - move.from!.file)];
    pieceLabel = PIECE_LABELS[fromCell.piece!.type];
    if (move.promote) pieceLabel += '成';
  }

  return `${prefix}${toFile}${toRank}${pieceLabel}`;
};

const parseUsi = (usi: string, side: Side): Move => {
  if (usi.includes('*')) {
    const [pieceCode, toStr] = usi.split('*');
    const to = { file: parseInt(toStr[0]), rank: toStr.charCodeAt(1) - 96 };
    const pieceIdMap: Record<string, string> = { 'P': 'FU', 'L': 'KY', 'N': 'KE', 'S': 'GI', 'G': 'KI', 'B': 'KA', 'R': 'HI' };
    return { 
      kind: 'drop', 
      side, 
      to, 
      dropPieceId: pieceIdMap[pieceCode.toUpperCase()] 
    };
  } else {
    const from = { file: parseInt(usi[0]), rank: usi.charCodeAt(1) - 96 };
    const to = { file: parseInt(usi[2]), rank: usi.charCodeAt(3) - 96 };
    const promote = usi.endsWith('+');
    return { 
      kind: 'move', 
      side, 
      from, 
      to, 
      promote 
    };
  }
};

const PIECE_TO_USI: Record<string, string> = {
  FU: 'P',
  KY: 'L',
  KE: 'N',
  GI: 'S',
  KI: 'G',
  KA: 'B',
  HI: 'R',
};

export const moveToUsi = (move: Move): string => {
  const to = `${move.to.file}${String.fromCharCode(96 + move.to.rank)}`;
  if (move.kind === 'drop') {
    const piece = PIECE_TO_USI[move.dropPieceId ?? ''] ?? move.dropPieceId ?? '';
    return `${piece}*${to}`;
  }
  const from = `${move.from!.file}${String.fromCharCode(96 + move.from!.rank)}`;
  return `${from}${to}${move.promote ? '+' : ''}`;
};

const otherSide = (side: Side): Side => (side === 'sente' ? 'gote' : 'sente');

const advanceTurnAfterMove = (state: GameState, spec: ReturnType<typeof createVariantSpec>): GameState => {
  if (spec.turnModel === 'multi-move') {
    return state;
  }
  return {
    ...state,
    sideToMove: otherSide(state.sideToMove),
  };
};

const filterMultiMoveUsedPieces = (
  state: GameState,
  spec: ReturnType<typeof createVariantSpec>,
  moves: Move[],
): Move[] => {
  if (spec.turnModel !== 'multi-move') return moves;
  const moved = new Set(state.variantState?.multiMove?.movedPieceUids ?? []);
  if (moved.size === 0) return moves;
  return moves.filter((move) => {
    if (move.kind !== 'move') return true;
    const cell = state.board.cells[(move.from!.rank - 1) * state.board.width + (state.board.width - move.from!.file)];
    return !cell.piece?.uid || !moved.has(cell.piece.uid);
  });
};
