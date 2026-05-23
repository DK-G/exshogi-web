import type { VariantSpec } from '@exshogi/engine-core';

export type VariantKey =
  | 'toruichi'
  | 'kagemusha'
  | 'invader'
  | 'trap'
  | 'disappearance';

export interface VariantPresentation {
  label: string;
  description: string;
  badges: string[];
}

const BASE_SPEC: VariantSpec = {
  name: 'EX Shogi',
  key: 'exshogi',
  turnModel: 'sequential',
  constraints: {
    mustCapture: false,
    dropsBlockedWhenMustCapture: false,
    noDoublePawn: true,
    noUchifuzume: true,
  },
  winCondition: { type: 'mate' },
};

const VARIANT_OVERRIDES: Record<VariantKey, Partial<VariantSpec>> = {
  toruichi: {
    name: 'Toruichi Shogi',
    key: 'toruichi',
    constraints: {
      mustCapture: true,
      dropsBlockedWhenMustCapture: true,
      dropAllowedWhenMustCapture: false,
      noDoublePawn: true,
      noUchifuzume: true,
    },
  },
  kagemusha: {
    name: 'Kagemusha Shogi',
    key: 'kagemusha',
    hiddenRole: {
      eligible: 'non-pawn',
      assign: 'random-per-game',
      localReveal: false,
    },
    trueKing: { redeployable: false },
    checkRules: { enabled: false },
    postGameReveal: true,
    winCondition: { type: 'capture-role', role: 'true-king' },
  },
  invader: {
    name: 'Invader Shogi',
    key: 'invader',
    turnModel: 'multi-move',
    multiMove: {
      perTurnLimit: 'eachPieceOnce',
      timeWindowMs: 15000,
      endCheckLose: true,
      endOfTurnLegality: { mustNotBeInCheck: true },
      illegalSelections: { selfCaptureKing: true },
      special: { allowPawnDropSameFileAfterPromotionInSameTurn: true },
      fizzleConsumesSubmove: true,
    },
  },
  trap: {
    name: 'Trap Shogi',
    key: 'trap',
    trap: {
      countRange: { min: 0, max: 7 },
      duplicateAllowed: true,
      selectionTiming: 'pregame',
      triggersOn: 'move-complete',
      persistsAfterTrigger: true,
      kingTriggerLossThreshold: 2,
      captureGoesToHand: true,
      allowInitialSetupSquares: true,
      initialSetupTriggers: false,
    },
  },
  disappearance: {
    name: 'Disappearance Shogi',
    key: 'disappearance',
    disappearance: {
      intervalRange: { min: 4, max: 10 },
      selector: {
        fileRange: { min: 1, max: 9 },
        rankRange: { min: 1, max: 9 },
        allowParityFilter: false,
      },
      noPieceNoOp: true,
      kingImmune: true,
    },
  },
};

export const LAUNCH_VARIANT_KEYS: VariantKey[] = [
  'toruichi',
  'kagemusha',
  'invader',
  'trap',
  'disappearance',
];

export const DEFAULT_VARIANT_KEY: VariantKey = 'toruichi';

export const VARIANT_PRESENTATION: Record<VariantKey, VariantPresentation> = {
  toruichi: {
    label: 'とるいち',
    description: '取れる駒があるときは捕獲が必須になるEX将棋。',
    badges: ['捕獲必須', '標準盤'],
  },
  kagemusha: {
    label: '影武者',
    description: '隠された真王を取ると勝ちになる情報戦バリアント。',
    badges: ['真王', '情報制限'],
  },
  invader: {
    label: 'インベーダー',
    description: '1フェーズ内で各駒が一度ずつ動ける高速バリアント。',
    badges: ['マルチムーブ', '時間制'],
  },
  trap: {
    label: '罠',
    description: '対局前に罠を仕掛け、踏んだ駒を失わせるバリアント。',
    badges: ['事前配置', '罠発動'],
  },
  disappearance: {
    label: '神隠し',
    description: '一定手数ごとに盤上の駒が消える変化型バリアント。',
    badges: ['ランダムイベント', '王免疫'],
  },
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  override?: Record<string, unknown>,
): T {
  if (!override) return target;

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      target[key as keyof T] = clone(value) as T[keyof T];
    } else if (value && typeof value === 'object') {
      const previous = target[key as keyof T];
      const base =
        previous && typeof previous === 'object' ? clone(previous) : {};
      target[key as keyof T] = deepMerge(
        base as Record<string, unknown>,
        value as Record<string, unknown>,
      ) as T[keyof T];
    } else {
      target[key as keyof T] = value as T[keyof T];
    }
  }

  return target;
}

export function createVariantSpec(key: VariantKey): VariantSpec {
  return deepMerge(
    clone(BASE_SPEC) as unknown as Record<string, unknown>,
    VARIANT_OVERRIDES[key] as Record<string, unknown>,
  ) as unknown as VariantSpec;
}
