import React from 'react';
import {
  LAUNCH_VARIANT_KEYS,
  VARIANT_PRESENTATION,
  type VariantKey,
} from '../../domain/variants';
import {
  CPU_LEVEL_OPTIONS,
  DEFAULT_CPU_LEVEL,
  type CpuLevel,
} from '../../domain/cpuLevels';
import './ModeSelectScreen.css';

type GameMode = 'quick' | 'pvp' | 'pvc';

interface ModeSelectScreenProps {
  gameMode: GameMode;
  onSelect: (variantKey: VariantKey, cpuLevel: CpuLevel) => void;
  onBack: () => void;
}

const MODE_LABELS: Record<GameMode, { title: string; subtitle: string }> = {
  quick: {
    title: '今すぐ遊ぶ',
    subtitle: 'すぐ一局。オンライン準備中はCPU練習として始めます',
  },
  pvp: {
    title: '友だちと遊ぶ',
    subtitle: '遊びたいルールを選んで、部屋づくりや合言葉での合流へ進みます',
  },
  pvc: {
    title: 'CPUと練習',
    subtitle: '誘う前に、気になる変則ルールを一人で試せます',
  },
};

export const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({
  gameMode,
  onSelect,
  onBack,
}) => {
  const mode = MODE_LABELS[gameMode];
  const [cpuLevel, setCpuLevel] = React.useState<CpuLevel>(DEFAULT_CPU_LEVEL);
  const showCpuLevel = gameMode === 'pvc' || gameMode === 'quick';

  return (
    <section className="mode-select-screen">
      <div className="mode-select-header">
        <button className="mode-back-button" onClick={onBack}>
          戻る
        </button>
        <div>
          <p className="mode-kicker">遊び方を選ぶ</p>
          <h2>{mode.title}</h2>
          <p className="mode-subtitle">{mode.subtitle}</p>
        </div>
      </div>

      {showCpuLevel && (
        <div className="cpu-level-panel" aria-label="CPU level">
          <div>
            <p className="mode-kicker">練習相手</p>
            <h3>CPU レベル</h3>
          </div>
          <div className="cpu-level-options">
            {CPU_LEVEL_OPTIONS.map((option) => (
              <button
                key={option.level}
                className={`cpu-level-button ${
                  cpuLevel === option.level ? 'active' : ''
                }`}
                onClick={() => setCpuLevel(option.level)}
              >
                <span>{option.label}</span>
                <small>{option.name}</small>
              </button>
            ))}
          </div>
          <p className="cpu-level-description">
            {CPU_LEVEL_OPTIONS.find((option) => option.level === cpuLevel)?.description}
          </p>
        </div>
      )}

      <div className="variant-grid">
        {LAUNCH_VARIANT_KEYS.map((key) => {
          const meta = VARIANT_PRESENTATION[key];
          return (
            <button
              key={key}
              className="variant-card"
              onClick={() => onSelect(key, cpuLevel)}
            >
              <span className="variant-invite">このルールで囲む</span>
              <span className="variant-name">{meta.label}</span>
              <span className="variant-description">{meta.description}</span>
              <span className="variant-badges">
                {meta.badges.map((badge) => (
                  <span key={badge} className="variant-badge">
                    {badge}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
