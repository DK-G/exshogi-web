export interface CpuLevelConfig {
  level: CpuLevel;
  name: string;
  label: string;
  description: string;
  search: {
    depth: number;
    movetimeMs: number;
    topK: number;
    temperature: number;
  };
}

export type CpuLevel = 1 | 2 | 3 | 4 | 5;

export const DEFAULT_CPU_LEVEL: CpuLevel = 3;

export const CPU_LEVELS: Record<CpuLevel, CpuLevelConfig> = {
  1: {
    level: 1,
    name: 'Beginner',
    label: 'Lv1',
    description: '弱め。大きな隙も残す練習相手。',
    search: { depth: 1, movetimeMs: 200, topK: 4, temperature: 0.6 },
  },
  2: {
    level: 2,
    name: 'Novice',
    label: 'Lv2',
    description: '簡単な攻めを見ながら、ときどきミスをする。',
    search: { depth: 2, movetimeMs: 350, topK: 3, temperature: 0.4 },
  },
  3: {
    level: 3,
    name: 'Intermediate',
    label: 'Lv3',
    description: '標準的な練習相手。まずはここから。',
    search: { depth: 3, movetimeMs: 500, topK: 2, temperature: 0.25 },
  },
  4: {
    level: 4,
    name: 'Advanced',
    label: 'Lv4',
    description: '堅実に指す強めの相手。',
    search: { depth: 4, movetimeMs: 700, topK: 2, temperature: 0.1 },
  },
  5: {
    level: 5,
    name: 'Expert',
    label: 'Lv5',
    description: '最善手寄り。容赦なく咎める。',
    search: { depth: 5, movetimeMs: 900, topK: 1, temperature: 0 },
  },
};

export const CPU_LEVEL_OPTIONS = Object.values(CPU_LEVELS);
