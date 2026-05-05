import React from 'react';

import type { PieceType, Player } from './types';
export type { PieceType, Player };

interface PieceProps {
  type: PieceType;
  player: Player;
  isPromoted?: boolean;
  isHidden?: boolean; // For Kagemusha Shogi
  isHighlighted?: boolean;
  onClick?: () => void;
}

const getPieceLabel = (type: PieceType, player: Player): string[] => {
  if (type === 'K') return [player === 'b' ? '玉' : '王'];
  
  const labels: Record<string, string[]> = {
    'R': ['飛'],
    'B': ['角'],
    'G': ['金'],
    'S': ['銀'],
    'N': ['桂'],
    'L': ['香'],
    'P': ['歩'],
    '+R': ['龍'],
    '+B': ['馬'],
    '+S': ['成', '銀'],
    '+N': ['成', '桂'],
    '+L': ['成', '香'],
    '+P': ['と'],
  };
  
  return labels[type] || [type];
};

const getPieceScale = (type: PieceType): number => {
  const t = type.startsWith('+') ? type.substring(1) : type;
  if (t === 'P') return 0.86;
  if (t === 'L') return 0.88;
  if (t === 'N') return 0.91;
  if (t === 'S' || t === 'G') return 0.94;
  if (t === 'R' || t === 'B') return 0.97;
  return 1.0;
};

export const Piece: React.FC<PieceProps> = ({
  type,
  player,
  isPromoted,
  isHidden,
  isHighlighted,
  onClick,
}) => {
  const isGote = player === 'w';
  const labels = getPieceLabel(type, player);
  const isPromotedPiece = isPromoted || type.startsWith('+');
  const scale = getPieceScale(type);

  return (
    <div 
      className={`piece-wrapper ${isGote ? 'gote' : 'sente'} ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isGote ? 'rotate(180deg)' : 'none',
      }}
    >
      <div style={{ width: '100%', height: '100%', transform: `scale(${scale})`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg viewBox="0 0 1000 1200" style={{ width: '90%', height: '95%' }}>
          <defs>
            <clipPath id="pieceClip">
              <path d="M490 50 L510 50 L850 200 L950 1100 L50 1100 L150 200 Z" />
            </clipPath>
            <filter id="pieceShadow">
              <feDropShadow dx="0" dy="20" stdDeviation="15" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Piece Body */}
          <path
            d="M490 50 L510 50 L850 200 L950 1100 L50 1100 L150 200 Z"
            fill="var(--color-kaya)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="12"
            filter="url(#pieceShadow)"
          />

          {/* Wood Grain (Mokume) - Enhanced from mobile */}
          <g clipPath="url(#pieceClip)">
            <path d="M220 100 Q280 600 240 1100" fill="none" stroke="#5D4037" strokeOpacity="0.25" strokeWidth="8" />
            <path d="M380 50 Q350 550 400 1150" fill="none" stroke="#5D4037" strokeOpacity="0.2" strokeWidth="10" />
            <path d="M560 50 Q600 650 540 1150" fill="none" stroke="#5D4037" strokeOpacity="0.25" strokeWidth="8" />
            <path d="M740 120 Q700 700 760 1100" fill="none" stroke="#5D4037" strokeOpacity="0.2" strokeWidth="10" />
            <path d="M900 250 Q860 750 920 1050" fill="none" stroke="#5D4037" strokeOpacity="0.25" strokeWidth="6" />
          </g>

          {/* Inner Bevel (from mobile) */}
          <path 
            d="M492 80 L508 80 L825 220 L915 1070 L85 1070 L175 220 Z" 
            fill="none"
            stroke="rgba(0,0,0,0.15)" 
            strokeWidth="5" 
            strokeLinejoin="miter"
          />
          
          {/* Label */}
          {isHidden ? (
            <text
              x="500"
              y="750"
              textAnchor="middle"
              fontSize="450"
              fill="var(--color-lacquer)"
              style={{ fontFamily: 'var(--font-main)', opacity: 0.3 }}
            >
              ?
            </text>
          ) : (
            labels.map((text, i) => {
              // Font size ratio matching mobile (0.48 of cell size)
              // Cell size in units is roughly 1200. 1200 * 0.48 = 576.
              const baseFontSize = 576;
              const isMultiLine = labels.length > 1;
              const fontSize = isMultiLine ? baseFontSize * 0.85 : (type === 'L' ? baseFontSize * 1.08 : baseFontSize);
              
              return (
                <text
                  key={i}
                  x="500"
                  y={!isMultiLine ? 850 : (i === 0 ? 520 : 980)}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fill={isPromotedPiece ? 'var(--color-urushi-red)' : 'var(--color-lacquer)'}
                  style={{ 
                    userSelect: 'none', 
                    fontFamily: 'var(--font-main)',
                    letterSpacing: '-0.05em',
                    transform: `scaleY(${isMultiLine ? 0.85 : 1.1})`,
                    transformOrigin: '500px center'
                  }}
                >
                  {text}
                </text>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
};
