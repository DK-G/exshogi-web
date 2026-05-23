export const MOBILE_SOURCE_ROOT = 'C:\\dev\\portfolio\\mobile\\exshogi';

export const MOBILE_DEFAULT_TIME_CONTROL = {
  scheme: 'byoyomi',
  baseMinutes: 3,
  byoYomiSeconds: 30,
  invaderPhaseMs: 15_000,
} as const;

export const MOBILE_DEFAULT_TRAP_COUNT = 3;
export const MOBILE_TRAP_COUNT_MIN = 0;
export const MOBILE_TRAP_COUNT_MAX_WEB_SETUP = 7;

export const MOBILE_CPU_LEVEL_MIN = 1;
export const MOBILE_CPU_LEVEL_MAX = 5;

export const MOBILE_PARITY_SOURCES = [
  'mobile/exshogi/apps/mobile-rn/src/constants/settings.ts',
  'mobile/exshogi/apps/mobile-rn/src/hooks/matching/useRoomCreationSettings.ts',
  'mobile/exshogi/apps/mobile-rn/src/constants/pvc-setup.ts',
  'mobile/exshogi/workers/src/types.ts',
] as const;
