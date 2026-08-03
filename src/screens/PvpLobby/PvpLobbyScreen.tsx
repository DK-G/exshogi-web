import React from 'react';
import { pvpClient, type PvpRoomConnection, type RoomSeatBinding } from '../../services/pvp/client';
import type { AuthState, RoomSnapshot, RoomSummary } from '../../services/pvp/types';
import { VARIANT_PRESENTATION, type VariantKey } from '../../domain/variants';
import type { PvpMatchSession } from '../../services/pvp/session';
import { clearPvpSession, savePvpSession } from '../../services/pvp/storage';
import {
  MOBILE_DEFAULT_TIME_CONTROL,
  MOBILE_DEFAULT_TRAP_COUNT,
  MOBILE_TRAP_COUNT_MAX_WEB_SETUP,
  MOBILE_TRAP_COUNT_MIN,
} from '../../domain/mobileParity';
import { PVP_BACKEND, PVP_HTTP_BASE_URL, PVP_WS_BASE_URL } from '../../services/pvp/config';
import './PvpLobbyScreen.css';

interface PvpLobbyScreenProps {
  variantKey: VariantKey;
  initialSession?: PvpMatchSession | null;
  onBack: () => void;
  onStartMatch: (session: PvpMatchSession) => void;
}

export const PvpLobbyScreen: React.FC<PvpLobbyScreenProps> = ({
  variantKey,
  initialSession,
  onBack,
  onStartMatch,
}) => {
  const [auth, setAuth] = React.useState<AuthState | null>(initialSession?.auth ?? null);
  const [rooms, setRooms] = React.useState<RoomSummary[]>([]);
  const [binding, setBinding] = React.useState<RoomSeatBinding | null>(initialSession?.binding ?? null);
  const [snapshot, setSnapshot] = React.useState<RoomSnapshot | null>(initialSession?.snapshot ?? null);
  const [activeTrapCount, setActiveTrapCount] = React.useState(initialSession?.trapCount ?? DEFAULT_TRAP_COUNT);
  const connectionRef = React.useRef<PvpRoomConnection | null>(null);
  const [ready, setReady] = React.useState(false);
  const [lockedRoomEnabled, setLockedRoomEnabled] = React.useState(false);
  const [roomPassword, setRoomPassword] = React.useState('');
  const [allowSpectators, setAllowSpectators] = React.useState(true);
  const [timePresetId, setTimePresetId] = React.useState(() =>
    getDefaultTimePresetId(variantKey),
  );
  const [trapCount, setTrapCount] = React.useState(DEFAULT_TRAP_COUNT);
  const [directRoomId, setDirectRoomId] = React.useState('');
  const [directPassword, setDirectPassword] = React.useState('');
  const [joinTarget, setJoinTarget] = React.useState<RoomSummary | null>(null);
  const [joinPassword, setJoinPassword] = React.useState('');
  const [status, setStatus] = React.useState('接続準備中');
  const [error, setError] = React.useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = React.useState<PvpServiceStatus>({
    state: 'checking',
    label: '疎通確認中',
  });
  const variantMeta = VARIANT_PRESENTATION[variantKey];

  const refreshRooms = React.useCallback(async (nextAuth: AuthState = auth!) => {
    setError(null);
    setStatus('ロビー取得中');
    const list = await pvpClient.listRooms(nextAuth);
    setRooms(list.filter((room) => room.variantId === variantKey));
    setStatus('ロビー取得完了');
    setServiceStatus({
      state: 'ready',
      label: 'ready',
      detail: `rooms:${list.length}`,
      checkedAt: Date.now(),
    });
  }, [auth, variantKey]);

  const checkServiceStatus = React.useCallback(async () => {
    try {
      setServiceStatus({
        state: 'checking',
        label: '疎通確認中',
        checkedAt: Date.now(),
      });
      const nextAuth = auth ?? await pvpClient.authenticateGuest();
      if (!auth) setAuth(nextAuth);
      const list = await pvpClient.listRooms(nextAuth);
      setServiceStatus({
        state: 'ready',
        label: 'ready',
        detail: `auth ok / rooms:${list.length}`,
        checkedAt: Date.now(),
      });
    } catch (err) {
      setServiceStatus({
        state: 'down',
        label: 'unavailable',
        detail: err instanceof Error ? err.message : String(err),
        checkedAt: Date.now(),
      });
    }
  }, [auth]);

  React.useEffect(() => {
    let alive = true;
    const boot = async () => {
      try {
        const nextAuth = await pvpClient.authenticateGuest();
        if (!alive) return;
        setAuth(nextAuth);
        await refreshRooms(nextAuth);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('接続失敗');
        setServiceStatus({
          state: 'down',
          label: 'unavailable',
          detail: err instanceof Error ? err.message : String(err),
          checkedAt: Date.now(),
        });
      }
    };
    void boot();
    return () => {
      alive = false;
    };
  }, [refreshRooms]);

  React.useEffect(() => {
    if (!auth || !binding) return;

    const nextConnection = pvpClient.connectRoom({
      roomId: binding.roomId,
      authToken: auth.token,
      seatToken: binding.seatToken,
      mode: 'player',
      lastSeq: initialSession?.binding?.roomId === binding.roomId ? initialSession.lastSeq : undefined,
      onOpen: () => setStatus('WebSocket 接続中'),
      onAuthenticated: () => setStatus('ロビー接続完了'),
      onState: (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setStatus(`ロビー更新: ${nextSnapshot.status}`);
        savePvpSession({
          auth,
          binding,
          snapshot: nextSnapshot,
          lastSeq: nextConnection.getLastSeq(),
        });
        if (nextSnapshot.status === 'playing' || (variantKey === 'trap' && nextSnapshot.status === 'setup')) {
          onStartMatch({
            auth,
            binding,
            snapshot: nextSnapshot,
            lastSeq: nextConnection.getLastSeq(),
            trapCount: activeTrapCount,
          });
        }
      },
      onError: (err) => {
        setError(err.message);
      },
      onClose: () => {
        setStatus('ロビー接続終了');
      },
    });
    connectionRef.current = nextConnection;

    return () => {
      nextConnection.close();
      if (connectionRef.current === nextConnection) {
        connectionRef.current = null;
      }
    };
  }, [activeTrapCount, auth, binding, initialSession, onStartMatch, variantKey]);

  const createRoom = async () => {
    if (!auth) return;
    try {
      setError(null);
      setStatus('ルーム作成中');
      const timePreset = TIME_PRESETS.find((preset) => preset.id === timePresetId) ?? TIME_PRESETS[0];
      const created = await pvpClient.createRoom(auth, {
        variantId: variantKey,
        timeLimitMs: timePreset.timeLimitMs,
        byoYomiMs: timePreset.byoYomiMs,
        isPrivate: !allowSpectators,
        password: lockedRoomEnabled ? roomPassword.trim() : undefined,
        allowSpectators,
        trapCount: variantKey === 'trap' ? trapCount : undefined,
      });
      setBinding(created);
      setActiveTrapCount(variantKey === 'trap' ? trapCount : 0);
      setReady(false);
      const nextSnapshot = await pvpClient.fetchRoom(auth, created.roomId, created.seatToken);
      setSnapshot(nextSnapshot);
      savePvpSession({ auth, binding: created, snapshot: nextSnapshot, trapCount: variantKey === 'trap' ? trapCount : 0 });
      setStatus('ルーム作成完了');
      await refreshRooms(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('ルーム作成失敗');
    }
  };

  const joinRoom = async (roomId: string, password?: string) => {
    if (!auth) return;
    try {
      setError(null);
      setStatus('ルーム参加中');
      const joined = await pvpClient.joinRoom(auth, roomId, password);
      const roomTrapCount = rooms.find((room) => room.roomId === roomId)?.trapCount ?? DEFAULT_TRAP_COUNT;
      setBinding(joined);
      setActiveTrapCount(variantKey === 'trap' ? roomTrapCount : 0);
      setReady(false);
      const nextSnapshot = await pvpClient.fetchRoom(auth, joined.roomId, joined.seatToken);
      setSnapshot(nextSnapshot);
      savePvpSession({ auth, binding: joined, snapshot: nextSnapshot, trapCount: variantKey === 'trap' ? roomTrapCount : 0 });
      setStatus('ルーム参加完了');
      setJoinTarget(null);
      setJoinPassword('');
      setDirectRoomId('');
      setDirectPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('ルーム参加失敗');
    }
  };

  const currentSeatReady = binding?.seat
    ? Boolean(snapshot?.seats[binding.seat]?.ready)
    : ready;
  const canStart =
    snapshot?.seats.sente?.ready === true && snapshot?.seats.gote?.ready === true;
  const isHostSeat = binding?.seat === 'sente';
  const roomStatusCopy = snapshot ? describeRoomStatus(snapshot, binding?.seat) : null;
  const roomProgressSteps = variantKey === 'trap'
    ? [
        { status: 'waiting' as const, label: '入室' },
        { status: 'setup' as const, label: '罠配置' },
        { status: 'playing' as const, label: '対局' },
      ]
    : [
        { status: 'waiting' as const, label: '入室' },
        { status: 'playing' as const, label: '対局' },
      ];

  const toggleReady = () => {
    const nextReady = !currentSeatReady;
    setReady(nextReady);
    connectionRef.current?.sendReady(nextReady);
  };

  const startGame = () => {
    connectionRef.current?.sendStart();
    setStatus('開始要求を送信しました');
  };

  const spectateRoom = async (roomId: string) => {
    if (!auth) return;
    try {
      setError(null);
      setStatus('観戦準備中');
      const nextSnapshot = await pvpClient.fetchRoom(auth, roomId);
      if (nextSnapshot.private) {
        setError('このルームは観戦できません。');
        setStatus('観戦不可');
        return;
      }
      onStartMatch({
        auth,
        snapshot: nextSnapshot,
        mode: 'spectator',
        trapCount: nextSnapshot.variantId === 'trap' ? DEFAULT_TRAP_COUNT : 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('観戦開始失敗');
    }
  };

  const leaveRoom = async () => {
    if (!auth || !binding) return;
    try {
      setError(null);
      setStatus('退出中');
      connectionRef.current?.close();
      await pvpClient.leaveRoom(auth, binding.roomId);
      setBinding(null);
      setSnapshot(null);
      setReady(false);
      clearPvpSession();
      setStatus('退出しました');
      await refreshRooms(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('退出失敗');
    }
  };

  return (
    <section className="pvp-lobby-screen">
      <div className="pvp-lobby-header">
        <button className="mode-back-button" onClick={onBack}>
          戻る
        </button>
        <div>
          <p className="mode-kicker">友だちと遊ぶ</p>
          <h2>{variantMeta.label} の部屋</h2>
          <p>{status}。部屋をつくるか、合言葉で合流できます。</p>
        </div>
        <button className="pvp-refresh-button" onClick={() => auth && refreshRooms(auth)} disabled={!auth}>
          更新
        </button>
      </div>

      <div className={`pvp-service-status ${serviceStatus.state}`}>
        <div>
          <span>PvP service</span>
          <b>{serviceStatus.label}</b>
          <small>{serviceStatus.detail ?? 'auth / rooms API を確認します'}</small>
        </div>
        <div>
          <span>HTTP</span>
          <small>{PVP_HTTP_BASE_URL}</small>
        </div>
        <div>
          <span>WS</span>
          <small>{PVP_WS_BASE_URL}</small>
        </div>
        <div>
          <span>backend</span>
          <small>{PVP_BACKEND}</small>
        </div>
        <button onClick={checkServiceStatus}>
          疎通確認
        </button>
      </div>

      {error && <div className="pvp-error">{error}</div>}

      <div className="pvp-lobby-actions">
        <div className="pvp-create-panel">
          <div className="pvp-panel-heading">
            <p className="mode-kicker">部屋をつくる</p>
            <h3>誘いやすい設定で始める</h3>
          </div>
          <div className="pvp-create-grid">
            <label>
              <span>持ち時間</span>
              <select
                value={timePresetId}
                onChange={(event) => setTimePresetId(event.target.value)}
              >
                {TIME_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>先後</span>
              <select value="sente" disabled>
                <option value="sente">作成者が先手</option>
              </select>
            </label>
            <label className={variantKey === 'trap' ? '' : 'disabled'}>
              <span>罠数</span>
              <input
                type="number"
                min={0}
                max={7}
                value={trapCount}
                disabled={variantKey !== 'trap'}
                onChange={(event) => setTrapCount(clampTrapCount(Number(event.target.value)))}
              />
            </label>
          </div>
          <div className="pvp-create-options">
            <label className="pvp-lock-toggle">
              <input
                type="checkbox"
                checked={lockedRoomEnabled}
                onChange={(event) => setLockedRoomEnabled(event.target.checked)}
              />
              合言葉を使う
            </label>
            <input
              className="pvp-password-input"
              type="password"
              value={roomPassword}
              onChange={(event) => setRoomPassword(event.target.value)}
              disabled={!lockedRoomEnabled}
              placeholder="合言葉"
            />
            <label className="pvp-lock-toggle">
              <input
                type="checkbox"
                checked={allowSpectators}
                onChange={(event) => setAllowSpectators(event.target.checked)}
              />
              観戦可
            </label>
            <button onClick={createRoom} disabled={!auth}>
              {lockedRoomEnabled ? '合言葉つきで部屋をつくる' : '部屋をつくる'}
            </button>
          </div>
          <p className="pvp-create-note">
            デフォルトはモバイル版に合わせ、通常3分、切れたら一手30秒、インベーダーは1フェーズ15秒です。作成者の座席は現行サーバ仕様では先手固定です。
          </p>
        </div>
      </div>

      <div className="pvp-direct-join">
        <input
          value={directRoomId}
          onChange={(event) => setDirectRoomId(event.target.value)}
          placeholder="部屋ID"
        />
        <input
          type="password"
          value={directPassword}
          onChange={(event) => setDirectPassword(event.target.value)}
          placeholder="合言葉"
        />
        <button
          onClick={() => joinRoom(directRoomId.trim(), directPassword)}
          disabled={!auth || !directRoomId.trim()}
        >
          合流する
        </button>
      </div>

      {binding && snapshot && (
        <div className="pvp-active-room">
          <div className="pvp-active-room-header">
            <div>
              <span>入室中</span>
              <b>{binding.roomId}</b>
              <small>{binding.seat === 'sente' ? '先手' : '後手'} / {isHostSeat ? 'ホスト' : 'ゲスト'}</small>
            </div>
            <div className={`pvp-room-status status-${snapshot.status}`}>
              <b>{formatRoomStatus(snapshot.status)}</b>
              <small>{roomStatusCopy}</small>
            </div>
            <div className="pvp-room-meta">
              <small>{snapshot.private ? '観戦不可' : '観戦可'}</small>
              <small>{formatTimeControl(snapshot.timeLimitMs, snapshot.byoYomiMs)}</small>
              {variantKey === 'trap' && <small>罠{activeTrapCount}</small>}
            </div>
          </div>
          <div className="pvp-room-progress" aria-label="開始までの状態">
            {roomProgressSteps.map((step, index) => {
              const active = step.status === snapshot.status;
              const done =
                snapshot.status === 'playing' && step.status !== 'playing' ||
                snapshot.status === 'setup' && step.status === 'waiting';
              return (
                <span key={`${step.status}-${index}`} className={active ? 'active' : done ? 'done' : ''}>
                  {step.label}
                </span>
              );
            })}
          </div>
          <div className="pvp-seat-grid">
            <SeatPanel
              side="sente"
              seat={snapshot.seats.sente}
              isCurrent={binding.seat === 'sente'}
            />
            <SeatPanel
              side="gote"
              seat={snapshot.seats.gote}
              isCurrent={binding.seat === 'gote'}
            />
          </div>
          <div className="pvp-room-controls">
            <button onClick={toggleReady}>
              {currentSeatReady ? '準備を戻す' : '準備できた'}
            </button>
            <button onClick={startGame} disabled={!canStart || !isHostSeat}>
              対局へ
            </button>
            <button className="danger" onClick={leaveRoom}>
              {isHostSeat ? '解散/退出' : '退出'}
            </button>
          </div>
          {!isHostSeat && canStart && (
            <p className="pvp-start-note">部屋をつくった人の開始を待っています。</p>
          )}
        </div>
      )}

      <div className="pvp-room-list">
        {rooms.length === 0 ? (
          <div className="pvp-empty">このバリアントの公開ルームはありません</div>
        ) : (
          rooms.map((room) => (
            <div
              className="pvp-room-card"
              key={room.roomId}
            >
              <span>{room.roomId}</span>
              <b>{room.status}</b>
              <small>
                {room.hasPassword ? '鍵付き' : '公開'} / {formatTimeControl(room.timeLimitMs, room.byoYomiMs)} / 罠{room.trapCount} / {room.playerCount}/2 players
              </small>
              <div className="pvp-room-card-actions">
                <button
                  onClick={() => {
                    if (room.hasPassword) {
                      setJoinTarget(room);
                      setJoinPassword('');
                    } else {
                      void joinRoom(room.roomId);
                    }
                  }}
                  disabled={room.status !== 'waiting'}
                >
                  合流
                </button>
                <button
                  onClick={() => spectateRoom(room.roomId)}
                  disabled={room.status !== 'playing' || room.hasPassword}
                  title={room.hasPassword ? '鍵付きルームは観戦できません' : undefined}
                >
                  観戦する
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {joinTarget && (
        <div className="pvp-password-dialog" role="dialog" aria-modal="true">
          <div>
            <h3>合言葉で合流</h3>
            <p>{joinTarget.roomId}</p>
            <input
              type="password"
              value={joinPassword}
              onChange={(event) => setJoinPassword(event.target.value)}
              autoFocus
              placeholder="合言葉"
            />
            <div className="pvp-dialog-actions">
              <button onClick={() => setJoinTarget(null)}>キャンセル</button>
              <button onClick={() => joinRoom(joinTarget.roomId, joinPassword)}>
                合流する
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

type SnapshotSeat = RoomSnapshot['seats']['sente'];

type PvpServiceStatus = {
  state: 'checking' | 'ready' | 'down';
  label: string;
  detail?: string;
  checkedAt?: number;
};

const SeatPanel: React.FC<{
  side: 'sente' | 'gote';
  seat?: SnapshotSeat;
  isCurrent: boolean;
}> = ({ side, seat, isCurrent }) => {
  const occupied = Boolean(seat?.occupied);
  const ready = Boolean(seat?.ready);
  return (
    <div className={`${ready ? 'ready' : ''} ${isCurrent ? 'current' : ''} ${occupied ? 'occupied' : 'empty'}`}>
      <span>{side === 'sente' ? '先手' : '後手'}{isCurrent ? ' / あなた' : ''}</span>
      <b>{occupied ? '参加中' : '空席'}</b>
      <small>{occupied ? ready ? '準備OK' : '準備中' : '参加待ち'}</small>
    </div>
  );
};

const TIME_PRESETS = [
  { id: 'mobile-3-30', label: '3分 + 秒読み30秒', timeLimitMs: MOBILE_DEFAULT_TIME_CONTROL.baseMinutes * 60 * 1000, byoYomiMs: MOBILE_DEFAULT_TIME_CONTROL.byoYomiSeconds * 1000 },
  { id: 'invader-15', label: 'インベーダー 15秒フェーズ', timeLimitMs: MOBILE_DEFAULT_TIME_CONTROL.invaderPhaseMs, byoYomiMs: 0 },
  { id: 'blitz-3', label: '3分切れ負け', timeLimitMs: 3 * 60 * 1000, byoYomiMs: 0 },
  { id: 'rapid-10', label: '10分切れ負け', timeLimitMs: 10 * 60 * 1000, byoYomiMs: 0 },
  { id: 'standard-10-30', label: '10分 + 秒読み30秒', timeLimitMs: 10 * 60 * 1000, byoYomiMs: 30 * 1000 },
] as const;

const DEFAULT_TRAP_COUNT = MOBILE_DEFAULT_TRAP_COUNT;

const getDefaultTimePresetId = (variantKey: VariantKey) =>
  variantKey === 'invader' ? 'invader-15' : 'mobile-3-30';

const clampTrapCount = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_TRAP_COUNT;
  return Math.max(
    MOBILE_TRAP_COUNT_MIN,
    Math.min(MOBILE_TRAP_COUNT_MAX_WEB_SETUP, Math.round(value)),
  );
};

const formatTimeControl = (timeLimitMs: number, byoYomiMs: number) => {
  const minutes = Math.max(0, Math.round(timeLimitMs / 60_000));
  if (byoYomiMs > 0) {
    return `${minutes}分+${Math.round(byoYomiMs / 1000)}秒`;
  }
  return `${minutes}分切れ負け`;
};

const formatRoomStatus = (status: RoomSnapshot['status']) => {
  if (status === 'waiting') return '開始待ち';
  if (status === 'setup') return 'セットアップ';
  if (status === 'playing') return '対局中';
  return '終了';
};

const describeRoomStatus = (snapshot: RoomSnapshot, currentSeat?: 'sente' | 'gote') => {
  if (snapshot.status === 'setup') return '罠配置フェーズです';
  if (snapshot.status === 'playing') return '対局へ移動します';
  if (snapshot.status === 'finished') return 'このルームは終了しました';

  const senteReady = snapshot.seats.sente?.ready === true;
  const goteReady = snapshot.seats.gote?.ready === true;
  const bothOccupied = snapshot.seats.sente?.occupied && snapshot.seats.gote?.occupied;
  if (!bothOccupied) return '相手の参加を待っています';
  if (!senteReady || !goteReady) {
    if (currentSeat && !snapshot.seats[currentSeat]?.ready) return '準備できたら押してください';
    return '相手の準備を待っています';
  }
  return currentSeat === 'sente' ? '対局へ進めます' : '部屋をつくった人の開始を待っています';
};
