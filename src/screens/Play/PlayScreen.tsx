import React, { useEffect } from 'react';
import { Board } from '../../components/Board/Board';
import { KomaDai } from '../../components/Board/KomaDai';
import { PromotionModal } from '../../components/Board/PromotionModal';
import { GameInfoSidebar } from '../../components/GameInfo/GameInfoSidebar';
import { useGame } from '../../hooks/useGame';
import { nshogiEngineService } from '../../engine/NshogiEngineService';
import { gameStateToSfen } from '@exshogi/engine-core';
import './PlayScreen.css';

interface PlayScreenProps {
  gameMode: 'quick' | 'pvp' | 'pvc' | null;
}

export const PlayScreen: React.FC<PlayScreenProps> = ({ gameMode }) => {
  const { 
    board, 
    capturedPieces, 
    turn, 
    selectedCell, 
    validMoves, 
    selectCell,
    gameState,
    executeUsiMove,
    pendingPromotion,
    confirmPromotion,
    cancelPromotion,
    moveHistory
  } = useGame();

  // CPU Move logic (Always active for PvC, active as placeholder for Quick)
  useEffect(() => {
    if (turn === 'gote' && (gameMode === 'pvc' || gameMode === 'quick')) {
      const thinkAndMove = async () => {
        const sfen = gameStateToSfen(gameState);
        try {
          const bestMoveUsi = await nshogiEngineService.pickBestMove(sfen);
          executeUsiMove(bestMoveUsi);
        } catch (err) {
          console.error('[PlayScreen] CPU thinking failed:', err);
        }
      };
      const timer = setTimeout(thinkAndMove, 800);
      return () => clearTimeout(timer);
    }
  }, [turn, gameState, executeUsiMove, gameMode]);

  return (
    <div className="play-arena">
      {gameMode === 'quick' && (
        <div className="matchmaking-overlay">
          <div className="matchmaking-content">
            <span className="pulse-dot"></span>
            対戦相手を探しています... (CPUと練習中)
          </div>
        </div>
      )}

      <div className="arena-main-content">
        <div className="board-stack">
          <Board 
            board={board}
            onCellClick={selectCell}
            selectedCell={selectedCell}
            validMoves={validMoves}
            capturedPieces={capturedPieces}
          />
        </div>
      </div>

      <div className="arena-sidebar">
        <GameInfoSidebar 
          sente={{ name: 'Player', rank: '10K', time: '10:00' }}
          gote={{ name: gameMode === 'pvc' ? 'NSHOGI (CPU)' : 'GOTE', rank: 'CPU', time: '10:00' }}
          turn={turn}
          moveHistory={moveHistory}
        />
      </div>

      {pendingPromotion && (
        <PromotionModal 
          onConfirm={confirmPromotion} 
          onCancel={cancelPromotion} 
        />
      )}
    </div>
  );
};
