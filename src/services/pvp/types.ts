import type { VariantKey } from '../../domain/variants';

export type Side = 'sente' | 'gote';
export type RoomStatus = 'waiting' | 'setup' | 'playing' | 'finished';
export type AuthMode = 'player' | 'spectator';
export type ReactionType = 'good' | 'wow' | 'lol' | 'nice' | 'oops';

export type AuthState = {
  token: string;
  userId: string;
  expiresAt: number;
  displayName?: string;
};

export type RoomTimePreset = {
  scheme: 'sudden-death' | 'byoyomi' | 'fischer' | string;
  label: string;
  controls: {
    scheme: string;
    baseMinutes: number;
    incrementSeconds?: number;
    byoYomiSeconds?: number;
    invaderPhaseMs?: number;
  };
  presetId?: string;
};

export type PracticeSide = 'auto' | Side;

export type RoomPreset = {
  roomId: string;
  variantKey: VariantKey;
  timePreset: RoomTimePreset;
  practiceSide: PracticeSide;
  password?: string;
  practice?: boolean;
  allowSpectators?: boolean;
};

export type RoomSummary = {
  roomId: string;
  status: RoomStatus;
  seats: {
    sente?: { displayName?: string };
    gote?: { displayName?: string };
  };
  variantId: VariantKey;
  createdAt: number;
  timeLimitMs: number;
  byoYomiMs: number;
  trapCount: number;
  isPremium: boolean;
  playerCount: number;
  hasPassword: boolean;
  isHostReady?: boolean;
};

export type GameResult = {
  winner: Side | 'draw';
  reason: 'checkmate' | 'resignation' | 'timeout' | 'disconnect' | 'abort';
  timestamp: number;
};

export type RoomSnapshot = {
  roomId: string;
  status: RoomStatus;
  variantId: VariantKey;
  timeLimitMs: number;
  byoYomiMs: number;
  private: boolean;
  seats: {
    sente?: { occupied: boolean; ready: boolean };
    gote?: { occupied: boolean; ready: boolean };
  };
  moves: string[];
  clocks: Record<Side, number>;
  turnSeat?: Side;
  result?: GameResult;
  closedAt?: number;
  hasPassword?: boolean;
};

export type ClientMessage =
  | {
      msgId: string;
      type: 'auth';
      payload: {
        mode?: AuthMode;
        seatToken?: string;
        authToken?: string;
        lastSeq?: number;
      };
    }
  | { msgId: string; type: 'move'; payload: { move: string } }
  | {
      msgId: string;
      type: 'trap_setup';
      payload: { selections: Array<{ row: number; col: number }> };
    }
  | { msgId: string; type: 'ready'; payload: { ready: boolean } }
  | { msgId: string; type: 'reaction'; payload: { type: ReactionType; moveIndex: number } }
  | { msgId: string; type: 'start'; payload?: { ts: number } }
  | { msgId: string; type: 'resign'; payload?: { ts: number } }
  | { msgId: string; type: 'heartbeat'; payload?: { ts: number } };

export type ServerMessage =
  | { seq: number; type: 'state'; payload: RoomSnapshot }
  | {
      seq: number;
      type: 'move';
      payload: {
        move: string;
        seat: Side;
        clocks: Record<Side, number>;
        moveNumber: number;
      };
    }
  | { seq: number; type: 'game_end'; payload: GameResult }
  | { seq: number; type: 'ack'; ackMsgId: string }
  | {
      seq: number;
      type: 'error';
      payload: { message: string; code: string; reason?: string };
      ackMsgId?: string;
    }
  | {
      seq: number;
      type: 'reaction';
      payload: { type: ReactionType; moveIndex: number; seat?: Side };
    };
