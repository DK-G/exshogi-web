import { evaluateMoves, type GameState, type Move } from '@exshogi/engine-core';
import type { CpuLevelConfig } from './cpuLevels';
import type { VariantKey } from './variants';
import { createVariantSpec } from './variants';

export interface CpuFallbackResult {
  move: Move | null;
  reason: string;
}

export const pickFallbackCpuMove = (
  gameState: GameState,
  variantKey: VariantKey,
  cpuLevel: CpuLevelConfig,
  reason: string,
): CpuFallbackResult => {
  const variantSpec = createVariantSpec(variantKey);
  const depth = cpuLevel.level >= 5 ? 2 : cpuLevel.level >= 3 ? 1 : 0;
  const scoredMoves = evaluateMoves(
    gameState,
    variantSpec,
    gameState.sideToMove,
    undefined,
    depth,
  );

  if (scoredMoves.length === 0) {
    return { move: null, reason };
  }

  const direction = gameState.sideToMove === 'sente' ? 1 : -1;
  const sorted = [...scoredMoves].sort(
    (left, right) => (right.score - left.score) * direction,
  );
  const poolSize = Math.max(1, Math.min(cpuLevel.search.topK, sorted.length));
  const pool = sorted.slice(0, poolSize);
  const index = chooseIndex(pool.length, cpuLevel.search.temperature);

  return {
    move: pool[index]?.move ?? pool[0].move,
    reason,
  };
};

const chooseIndex = (length: number, temperature: number) => {
  if (length <= 1 || temperature <= 0) return 0;
  const randomness = Math.min(1, Math.max(0, temperature));
  return Math.floor(Math.random() * Math.max(1, Math.ceil(length * randomness)));
};
