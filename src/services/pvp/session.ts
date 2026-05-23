import type { AuthState, RoomSnapshot } from './types';
import type { RoomSeatBinding } from './client';

export interface PvpMatchSession {
  auth: AuthState;
  binding?: RoomSeatBinding;
  snapshot: RoomSnapshot;
  lastSeq?: number;
  mode?: 'player' | 'spectator';
  trapCount?: number;
}
