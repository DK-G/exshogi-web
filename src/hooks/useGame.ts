import { useState, useCallback, useMemo } from 'react';
import { 
  setupStandardShogi, 
  generateMovesForCoord, 
  applyMoveWithWinCheck, 
  otherSide,
  SHOGI_STANDARD_SPEC,
  type GameState,
  type Coord,
  type Move,
  type Side,
  type Piece as EnginePiece
} from '@exshogi/engine-core';

export interface UIPiece {
  type: string;
  player: 'b' | 'w'; // b: sente, w: gote
}

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>(() => setupStandardShogi());
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ move: Move; promoteOnly: boolean } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Piece type mapping from engine to UI
  const PIECE_TYPE_MAP: Record<string, string> = {
    'FU': 'P', 'KY': 'L', 'KE': 'N', 'GI': 'S', 'KI': 'G', 'KA': 'B', 'HI': 'R', 'OU': 'K',
    'TO': 'P', 'NY': 'L', 'NK': 'N', 'NG': 'S', 'UM': 'B', 'RY': 'R'
  };

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
        } as any;
      }
    });
    return board;
  }, [gameState, PIECE_TYPE_MAP]);

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
  }, [gameState, PIECE_TYPE_MAP]);

  const selectCell = useCallback((row: number, col: number) => {
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
      const moveLabel = generateMoveLabel(gameState, finalMove);
      const { next: newState } = applyMoveWithWinCheck(gameState, SHOGI_STANDARD_SPEC, finalMove);
      console.log('[useGame] new sideToMove:', newState.sideToMove);
      setGameState(newState);
      setMoveHistory(prev => [...prev, moveLabel]);
      setSelectedCoord(null);
      setValidMoves([]);
      return;
    }

    // Otherwise, select the piece
    const cellIndex = row * 9 + col;
    const piece = gameState.board.cells[cellIndex].piece;
    console.log('[useGame] piece at index:', cellIndex, piece);

    if (piece && piece.side === gameState.sideToMove) {
      setSelectedCoord(coord);
      const moves = generateMovesForCoord(gameState, gameState.sideToMove, coord);
      console.log('[useGame] valid moves found:', moves.length);
      setValidMoves(moves);
    } else {
      setSelectedCoord(null);
      setValidMoves([]);
    }
  }, [gameState, validMoves]);

  return {
    board: uiBoard,
    capturedPieces,
    turn: gameState.sideToMove,
    selectedCell: selectedCoord ? [selectedCoord.rank - 1, 9 - selectedCoord.file] as [number, number] : null,
    validMoves: validMoves.map(m => [m.to.rank - 1, 9 - m.to.file] as [number, number]),
    selectCell,
    gameState,
    executeMove: (move: Move) => {
      const { next: newState } = applyMoveWithWinCheck(gameState, SHOGI_STANDARD_SPEC, move);
      setGameState(newState);
      setSelectedCoord(null);
      setValidMoves([]);
    },
    executeUsiMove: (usi: string) => {
      const move = parseUsi(usi, gameState.sideToMove);
      const { next: newState } = applyMoveWithWinCheck(gameState, SHOGI_STANDARD_SPEC, move);
      setGameState(newState);
      setSelectedCoord(null);
      setValidMoves([]);
    },
    pendingPromotion,
    confirmPromotion: (promote: boolean) => {
      if (!pendingPromotion) return;
      const finalMove = { ...pendingPromotion.move, promote };
      const moveLabel = generateMoveLabel(gameState, finalMove);
      const { next: newState } = applyMoveWithWinCheck(gameState, SHOGI_STANDARD_SPEC, finalMove);
      setGameState(newState);
      setMoveHistory(prev => [...prev, moveLabel]);
      setPendingPromotion(null);
      setSelectedCoord(null);
      setValidMoves([]);
    },
    cancelPromotion: () => {
      setPendingPromotion(null);
      setSelectedCoord(null);
      setValidMoves([]);
    },
    moveHistory
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
  
  let pieceLabel = '';
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
