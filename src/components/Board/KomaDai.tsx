import React from 'react';
import { Piece } from './Piece';
import type { PieceType } from './types';
import './KomaDai.css';

interface KomaDaiProps {
  owner: 'sente' | 'gote';
  capturedPieces: Record<string, number>;
}

export const KomaDai: React.FC<KomaDaiProps> = ({ owner, capturedPieces }) => {
  const player = owner === 'sente' ? 'b' : 'w';

  return (
    <div className={`captured-pieces-tray ${owner}`}>
      <div className={`player-indicator ${owner}`}>
        {owner === 'sente' ? '▲' : '△'}
      </div>
      <div className="pieces-row">
        {Object.entries(capturedPieces).map(([type, count]) => (
          count > 0 && (
            <div key={type} className="captured-piece-container">
              <div className="captured-piece-wrapper">
                <Piece 
                  type={type as PieceType} 
                  player={player} 
                />
              </div>
              {count > 1 && <span className="piece-count">{count}</span>}
            </div>
          )
        ))}
        {Object.values(capturedPieces).every(c => c === 0) && (
          <div className="empty-tray-horizontal">駒なし</div>
        )}
      </div>
    </div>
  );
};
