import React from 'react';
import './GameInfoSidebar.css';

interface Player {
  name: string;
  rank: string;
  time: string;
  timeTone?: 'normal' | 'byoyomi' | 'low' | 'critical';
}

interface GameInfoSidebarProps {
  sente: Player;
  gote: Player;
  turn: 'sente' | 'gote';
  moveHistory: string[];
}

export const GameInfoSidebar: React.FC<GameInfoSidebarProps> = ({ sente, gote, turn, moveHistory }) => {
  // Group moves into pairs for table display
  const movePairs: [string, string | null][] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push([moveHistory[i], moveHistory[i + 1] || null]);
  }

  return (
    <div className="game-info-sidebar">
      {/* Gote (Top) - Usually displayed at the top in online Shogi */}
      <div className={`player-box gote ${turn === 'gote' ? 'active' : ''}`}>
        <div className="player-main">
          <div className="player-info">
            <div className="status-dot" />
            <span className="name">{gote.name}</span>
            <span className="rank">{gote.rank}</span>
          </div>
          <div className={`timer-display ${gote.timeTone ?? 'normal'}`}>{gote.time}</div>
        </div>
      </div>

      <div className="history-section">
        <div className="move-history-header">
          <span className="col-idx">#</span>
          <span className="col-player">先手</span>
          <span className="col-player">後手</span>
        </div>
        <div className="move-history-container">
          <table className="history-table">
            <tbody>
              {movePairs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-history">対局開始待ち</td>
                </tr>
              ) : (
                movePairs.map((pair, index) => (
                  <tr key={index} className="history-row">
                    <td className="index">{index + 1}</td>
                    <td className={`move-val sente ${index * 2 === moveHistory.length - 1 ? 'last' : ''}`}>
                      {pair[0]}
                    </td>
                    <td className={`move-val gote ${index * 2 + 1 === moveHistory.length - 1 ? 'last' : ''}`}>
                      {pair[1] || ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="sidebar-controls">
          <button className="control-btn" title="First">«</button>
          <button className="control-btn" title="Prev">‹</button>
          <button className="control-btn" title="Next">›</button>
          <button className="control-btn" title="Last">»</button>
          <button className="control-btn" title="Analyze">⟲</button>
        </div>
      </div>

      {/* Sente (Bottom) */}
      <div className={`player-box sente ${turn === 'sente' ? 'active' : ''}`}>
        <div className="player-main">
          <div className="player-info">
            <div className="status-dot" />
            <span className="name">{sente.name}</span>
            <span className="rank">{sente.rank}</span>
          </div>
          <div className={`timer-display ${sente.timeTone ?? 'normal'}`}>{sente.time}</div>
        </div>
      </div>
    </div>
  );
};
