import { buildSimpleJkf, stringifyJkf, type JkfRoot } from '@exshogi/notation';
import type { Side } from '@exshogi/engine-core';
import type { CpuLevelConfig } from './cpuLevels';
import type { VariantKey } from './variants';

export interface WebKifuMetadata {
  gameId: string;
  mode: string;
  variantKey: VariantKey;
  cpuLevel?: CpuLevelConfig;
  winner?: Side | 'draw';
  reason?: string;
  startedAt: string;
  endedAt?: string;
  moveCount: number;
  engineMode?: string;
  fallbackCount?: number;
  timeControl?: string;
  clocks?: Record<'sente' | 'gote', number>;
  roomId?: string;
  recordSource?: 'local' | 'pvp' | 'spectator';
  seat?: Side | 'spectator';
  usiMoves?: string[];
  moveEffects?: unknown[][];
  trueKingSente?: unknown;
  trueKingGote?: unknown;
  phaseLogCount?: number;
}

export interface WebKifuPreview {
  jkf: JkfRoot;
  serialized: string;
  headerRows: Array<{ label: string; value: string }>;
  moveRows: Array<{ index: number; sente: string; gote: string; effects: string[] }>;
}

export const buildWebKifuPreview = (
  metadata: WebKifuMetadata,
  moveHistory: string[],
): WebKifuPreview => {
  const jkf = buildSimpleJkf({
    variantKey: metadata.variantKey,
    history: moveHistory,
    winner: metadata.winner === 'draw' ? undefined : metadata.winner,
    reason: metadata.reason,
    metadata: {
      gameId: metadata.gameId,
      mode: metadata.mode,
      cpuLevel: metadata.cpuLevel?.level ?? '',
      cpuLabel: metadata.cpuLevel?.label ?? '',
      engineMode: metadata.engineMode ?? 'wasm',
      fallbackCount: metadata.fallbackCount ?? 0,
      timeControl: metadata.timeControl ?? '',
      clocks: metadata.clocks ?? '',
      roomId: metadata.roomId ?? '',
      recordSource: metadata.recordSource ?? '',
      seat: metadata.seat ?? '',
      usiMoves: metadata.usiMoves?.join(' ') ?? '',
      trueKingSente: metadata.trueKingSente ?? '',
      trueKingGote: metadata.trueKingGote ?? '',
      phaseLogCount: metadata.phaseLogCount ?? 0,
      startedAt: metadata.startedAt,
      endedAt: metadata.endedAt ?? '',
      moveCount: metadata.moveCount,
    },
    moves: moveHistory.map((line, index) => ({
      comments: buildMoveComments(line, metadata.usiMoves?.[index]),
      effects: metadata.moveEffects?.[index],
    })),
  });

  return {
    jkf,
    serialized: stringifyJkf(jkf),
    headerRows: [
      { label: 'Game ID', value: metadata.gameId },
      { label: '形式', value: metadata.mode },
      { label: 'CPU', value: metadata.cpuLevel?.label ?? '-' },
      { label: 'Engine', value: metadata.engineMode ?? 'wasm' },
      { label: 'Room', value: metadata.roomId ?? '-' },
      { label: 'Source', value: metadata.recordSource ?? 'local' },
      { label: 'Seat', value: formatSeat(metadata.seat) },
      { label: 'USI', value: `${metadata.usiMoves?.length ?? 0} 手` },
      { label: 'Effects', value: `${metadata.moveEffects?.flat().length ?? 0} 件` },
      { label: 'Phase Logs', value: `${metadata.phaseLogCount ?? 0} 件` },
      { label: '持ち時間', value: metadata.timeControl ?? '-' },
      { label: '開始', value: formatDateTime(metadata.startedAt) },
      { label: '終了', value: metadata.endedAt ? formatDateTime(metadata.endedAt) : '-' },
    ],
    moveRows: buildMoveRows(moveHistory, metadata.moveEffects),
  };
};

const buildMoveComments = (line: string, usi?: string) =>
  [usi ? `${line} / USI ${usi}` : line];

const buildMoveRows = (moveHistory: string[], moveEffects: unknown[][] = []) => {
  const rows: Array<{ index: number; sente: string; gote: string; effects: string[] }> = [];
  for (let index = 0; index < moveHistory.length; index += 2) {
    rows.push({
      index: Math.floor(index / 2) + 1,
      sente: moveHistory[index] ?? '',
      gote: moveHistory[index + 1] ?? '',
      effects: [
        ...summarizeEffects(moveEffects[index]),
        ...summarizeEffects(moveEffects[index + 1]),
      ],
    });
  }
  return rows;
};

const summarizeEffects = (effects?: unknown[]) =>
  (effects ?? []).map((effect) => {
    if (effect && typeof effect === 'object' && 'type' in effect) {
      return String((effect as { type: unknown }).type);
    }
    return String(effect);
  });

const formatSeat = (seat?: Side | 'spectator') => {
  if (seat === 'sente') return '先手';
  if (seat === 'gote') return '後手';
  if (seat === 'spectator') return '観戦';
  return '-';
};

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
