import React from 'react';
import { Piece } from './Piece';
import type { PieceType, Player } from './types';
import './Board.css';
import { KomaDai } from './KomaDai';

interface BoardProps {
  board: (PieceInfo | null)[][];
  onCellClick: (row: number, col: number) => void;
  selectedCell: [number, number] | null;
  validMoves: [number, number][];
  capturedPieces: {
    sente: Record<string, number>;
    gote: Record<string, number>;
  };
}

interface PieceInfo {
  type: PieceType;
  player: Player;
  isPromoted?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  board,
  onCellClick,
  selectedCell,
  validMoves,
  capturedPieces
}) => {
  const files = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  const ranks = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

  return (
    <div className="board-outer-container">
      {/* Integrated Gote KomaDai (Top) */}
      <div className="integrated-komadai gote">
        <KomaDai owner="gote" capturedPieces={capturedPieces?.gote || {}} />
      </div>

      <div className="grid-with-labels">
        {/* Top File Labels (9-1) */}
        <div className="board-row labels-top">
          <div className="coords-files">
            {files.map(n => <div key={n} className="coord-label">{n}</div>)}
          </div>
          <div className="corner-spacer" />
        </div>

        <div className="board-middle-content">
          {/* Main Shogi Board */}
          <div className="shogi-board">
            {board.map((row, rowIndex) => 
              row.map((piece, colIndex) => {
                const isSelected = selectedCell?.[0] === rowIndex && selectedCell?.[1] === colIndex;
                const isValidMove = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);
                
                return (
                  <div 
                    key={`${rowIndex}-${colIndex}`}
                    className={`cell ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''}`}
                    onClick={() => onCellClick(rowIndex, colIndex)}
                  >
                    {piece && (
                      <Piece 
                        type={piece.type} 
                        player={piece.player} 
                        isPromoted={piece.isPromoted}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Rank Labels (一-九) */}
          <div className="coords-ranks right">
            {ranks.map(r => <div key={r} className="coord-label">{r}</div>)}
          </div>
        </div>
      </div>

      {/* Integrated Sente KomaDai (Bottom) */}
      <div className="integrated-komadai sente">
        <KomaDai owner="sente" capturedPieces={capturedPieces?.sente || {}} />
      </div>
    </div>
  );
};
