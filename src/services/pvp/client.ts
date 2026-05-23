import { PVP_HTTP_BASE_URL, PVP_WS_BASE_URL } from './config';
import type {
  AuthMode,
  AuthState,
  ClientMessage,
  ReactionType,
  RoomSnapshot,
  RoomSummary,
  ServerMessage,
  Side,
} from './types';
import type { VariantKey } from '../../domain/variants';

export class PvpClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'PvpClientError';
  }
}

export interface CreateRoomParams {
  variantId: VariantKey;
  timeLimitMs?: number;
  byoYomiMs?: number;
  private?: boolean;
  isPrivate?: boolean;
  password?: string;
  trapCount?: number;
  senteTrapCount?: number;
  goteTrapCount?: number;
  allowSpectators?: boolean;
}

export interface RoomSeatBinding {
  roomId: string;
  seatToken: string;
  seat: Side;
  expiresAt?: number;
}

export class PvpClient {
  constructor(
    private readonly baseUrl: string = PVP_HTTP_BASE_URL,
    private readonly wsUrl: string = PVP_WS_BASE_URL,
  ) {}

  async authenticateGuest(): Promise<AuthState> {
    const json = await this.request<{ token: string; userId: string; expiresAt: number; displayName?: string }>(
      '/auth/guest',
      { method: 'POST' },
      'auth_failed',
    );
    return {
      token: json.token,
      userId: json.userId,
      expiresAt: Number(json.expiresAt),
      displayName: json.displayName,
    };
  }

  async listRooms(auth?: AuthState): Promise<RoomSummary[]> {
    return this.request<RoomSummary[]>(
      '/rooms',
      { method: 'GET', headers: auth ? authHeaders(auth) : undefined },
      'list_rooms_failed',
    );
  }

  async createRoom(auth: AuthState, params: CreateRoomParams): Promise<RoomSeatBinding> {
    const json = await this.request<RoomSeatBinding>(
      '/rooms',
      {
        method: 'POST',
        headers: authHeaders(auth, true),
        body: JSON.stringify({
          ...params,
          private: params.private ?? params.isPrivate ?? false,
          isPrivate: params.isPrivate ?? params.private ?? false,
        }),
      },
      'create_room_failed',
    );
    return json;
  }

  async joinRoom(auth: AuthState, roomId: string, password?: string): Promise<RoomSeatBinding> {
    const json = await this.request<{ seatToken: string; seat: Side; expiresAt?: number }>(
      `/rooms/${encodeURIComponent(roomId)}/join`,
      {
        method: 'POST',
        headers: authHeaders(auth, true),
        body: JSON.stringify({ password }),
      },
      'join_room_failed',
    );
    return { roomId, ...json };
  }

  async fetchRoom(auth: AuthState, roomId: string, seatToken?: string): Promise<RoomSnapshot> {
    return this.request<RoomSnapshot>(
      `/rooms/${encodeURIComponent(roomId)}`,
      {
        method: 'GET',
        headers: {
          ...authHeaders(auth),
          ...(seatToken ? { 'X-Seat-Token': seatToken } : {}),
        },
      },
      'room_fetch_failed',
    );
  }

  async leaveRoom(auth: AuthState, roomId: string): Promise<void> {
    await this.request<void>(
      `/rooms/${encodeURIComponent(roomId)}/leave`,
      { method: 'POST', headers: authHeaders(auth) },
      'leave_room_failed',
    );
  }

  connectRoom(options: PvpRoomConnectionOptions): PvpRoomConnection {
    return new PvpRoomConnection({
      ...options,
      wsUrl: `${this.wsUrl}/rooms/${encodeURIComponent(options.roomId)}/ws`,
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    fallbackCode: string,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      throw await buildError(res, fallbackCode);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}

export interface PvpRoomConnectionOptions {
  roomId: string;
  authToken: string;
  seatToken?: string;
  mode?: AuthMode;
  lastSeq?: number;
  onOpen?: () => void;
  onAuthenticated?: () => void;
  onState?: (snapshot: RoomSnapshot) => void;
  onMessage?: (message: ServerMessage) => void;
  onError?: (error: Error, message?: ServerMessage) => void;
  onClose?: (event: CloseEvent) => void;
}

interface ResolvedPvpRoomConnectionOptions extends PvpRoomConnectionOptions {
  wsUrl: string;
}

export class PvpRoomConnection {
  private ws: WebSocket | null = null;
  private lastSeq: number;
  private closedByClient = false;
  private heartbeatTimer: number | null = null;

  constructor(private readonly options: ResolvedPvpRoomConnectionOptions) {
    this.lastSeq = options.lastSeq ?? -1;
    this.connect();
  }

  sendReady(ready: boolean) {
    this.send({ type: 'ready', payload: { ready } });
  }

  sendStart() {
    this.send({ type: 'start', payload: { ts: Date.now() } });
  }

  sendMove(move: string) {
    this.send({ type: 'move', payload: { move } });
  }

  sendTrapSetup(selections: Array<{ row: number; col: number }>) {
    this.send({ type: 'trap_setup', payload: { selections } });
  }

  sendResign() {
    this.send({ type: 'resign', payload: { ts: Date.now() } });
  }

  sendReaction(type: ReactionType, moveIndex: number) {
    this.send({ type: 'reaction', payload: { type, moveIndex } });
  }

  sendHeartbeat() {
    this.send({ type: 'heartbeat', payload: { ts: Date.now() } });
  }

  close() {
    this.closedByClient = true;
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  getLastSeq() {
    return this.lastSeq;
  }

  private connect() {
    this.ws = new WebSocket(this.options.wsUrl);
    this.ws.addEventListener('open', () => {
      this.options.onOpen?.();
      this.sendAuth();
      this.heartbeatTimer = window.setInterval(() => this.sendHeartbeat(), 20_000);
    });
    this.ws.addEventListener('message', (event) => this.handleMessage(event));
    this.ws.addEventListener('error', () => {
      this.options.onError?.(new Error('WebSocket error'));
    });
    this.ws.addEventListener('close', (event) => {
      if (this.heartbeatTimer !== null) {
        window.clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      this.options.onClose?.(event);
      if (!this.closedByClient) {
        this.options.onError?.(
          new Error(`WebSocket closed: ${event.code} ${event.reason}`),
        );
      }
    });
  }

  private sendAuth() {
    this.send({
      type: 'auth',
      payload: {
        mode: this.options.mode ?? 'player',
        seatToken: this.options.seatToken,
        authToken: this.options.authToken,
        lastSeq: this.lastSeq >= 0 ? this.lastSeq : undefined,
      },
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      if (typeof message.seq === 'number' && message.seq > this.lastSeq) {
        this.lastSeq = message.seq;
      }
      if (message.type === 'ack') {
        this.options.onAuthenticated?.();
      }
      if (message.type === 'state') {
        this.options.onState?.(message.payload);
      }
      if (message.type === 'error') {
        this.options.onError?.(
          new Error(message.payload.message ?? message.payload.code),
          message,
        );
      }
      this.options.onMessage?.(message);
    } catch (error) {
      this.options.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private send(message: Omit<ClientMessage, 'msgId'>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const withId: ClientMessage = {
      msgId: createMsgId(message.type),
      ...message,
    } as ClientMessage;
    this.ws.send(JSON.stringify(withId));
  }
}

export const pvpClient = new PvpClient();

const authHeaders = (auth: AuthState, json = false): HeadersInit => ({
  Authorization: `Bearer ${auth.token}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

const buildError = async (res: Response, fallbackCode: string) => {
  try {
    const json = (await res.json()) as { error?: string; message?: string; code?: string };
    const code = json.code ?? json.error ?? fallbackCode;
    return new PvpClientError(json.message ?? `${fallbackCode}:${code}`, res.status, code);
  } catch {
    return new PvpClientError(`${fallbackCode}:${res.status}`, res.status, fallbackCode);
  }
};

const createMsgId = (type: string) =>
  `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
