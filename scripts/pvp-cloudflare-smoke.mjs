const baseUrl = process.argv[2] ?? 'https://www.exshogi.com';
const wsBaseUrl = process.argv[3] ?? baseUrl.replace(/^http/, 'ws');
const WebSocketImpl = await resolveWebSocket();

const timeout = (ms, label) =>
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
  });

async function request(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, init);
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`);
  return json;
}

const authGuest = () => request('/auth/guest', { method: 'POST' });

const createRoom = (token, options = {}) =>
  request('/rooms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      variantId: 'toruichi',
      timeLimitMs: 600000,
      byoYomiMs: 0,
      isPrivate: false,
      allowSpectators: true,
      ...options,
    }),
  });

const joinRoom = (token, roomId, password) =>
  request(`/rooms/${roomId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

function waitFor(ws, predicate, label, ms = 8000) {
  const existing = ws.__messages?.find(predicate);
  if (existing) return Promise.resolve(existing);

  return Promise.race([
    new Promise((resolve, reject) => {
      const onMessage = (event) => {
        const msg = normalizeMessageEvent(event);
        if (predicate(msg)) {
          ws.removeEventListener('message', onMessage);
          resolve(msg);
        }
      };
      ws.addEventListener('message', onMessage);
      ws.addEventListener('error', reject, { once: true });
    }),
    timeout(ms, label),
  ]);
}

async function connect(roomId, authToken, seatToken, label) {
  const ws = new WebSocketImpl(`${wsBaseUrl}/rooms/${roomId}/ws`);
  trackMessages(ws);
  await Promise.race([
    new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    }),
    timeout(8000, `${label}:open`),
  ]);

  const msgId = `auth-${label}-${Date.now()}`;
  ws.send(JSON.stringify({
    msgId,
    type: 'auth',
    payload: { authToken, seatToken, lastSeq: -1 },
  }));
  await waitFor(ws, (m) => m.type === 'ack' && m.ackMsgId === msgId, `${label}:auth`);
  await waitFor(ws, (m) => m.type === 'state', `${label}:state`);
  return ws;
}

async function connectSpectator(roomId, expectError = false, keepOpen = false) {
  const ws = new WebSocketImpl(`${wsBaseUrl}/rooms/${roomId}/ws`);
  trackMessages(ws);
  await Promise.race([
    new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    }),
    timeout(8000, 'spectator:open'),
  ]);

  const msgId = `auth-spectator-${Date.now()}`;
  ws.send(JSON.stringify({
    msgId,
    type: 'auth',
    payload: { mode: 'spectator', lastSeq: -1 },
  }));

  const msg = await waitFor(
    ws,
    (m) => m.type === 'ack' || m.type === 'error',
    'spectator:auth',
  );
  if (!keepOpen) ws.close();

  if (expectError && msg.type !== 'error') {
    throw new Error('private room accepted spectator');
  }
  if (!expectError && msg.type !== 'ack') {
    throw new Error('public room rejected spectator');
  }
  return ws;
}

function trackMessages(ws) {
  ws.__messages = [];
  ws.addEventListener('message', (event) => {
    ws.__messages.push(normalizeMessageEvent(event));
  });
}

function normalizeMessageEvent(event) {
  return JSON.parse(String(event.data));
}

async function resolveWebSocket() {
  if (typeof WebSocket !== 'undefined') return WebSocket;

  try {
    const mod = await import('ws');
    return mod.WebSocket ?? mod.default;
  } catch {
    const mod = await import('file:///C:/dev/portfolio/mobile/exshogi/node_modules/ws/wrapper.mjs');
    return mod.WebSocket ?? mod.default;
  }
}

function send(ws, type, payload = {}) {
  const msgId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  ws.send(JSON.stringify({ msgId, type, payload }));
  return msgId;
}

async function main() {
  console.log(`[pvp-smoke] base=${baseUrl}`);
  await testLockedRoom();

  const user1 = await authGuest();
  const user2 = await authGuest();
  const created = await createRoom(user1.token);
  const joined = await joinRoom(user2.token, created.roomId);
  console.log(`[pvp-smoke] room=${created.roomId} seats=${created.seat}/${joined.seat}`);

  const ws1 = await connect(created.roomId, user1.token, created.seatToken, 'sente');
  const ws2 = await connect(created.roomId, user2.token, joined.seatToken, 'gote');

  send(ws1, 'ready', { ready: true });
  send(ws2, 'ready', { ready: true });
  await waitFor(
    ws1,
    (m) => m.type === 'state' && m.payload?.seats?.sente?.ready && m.payload?.seats?.gote?.ready,
    'all-ready',
  );

  send(ws1, 'start', { ts: Date.now() });
  await waitFor(ws1, (m) => m.type === 'state' && m.payload?.status === 'playing', 'playing-sente');
  await waitFor(ws2, (m) => m.type === 'state' && m.payload?.status === 'playing', 'playing-gote');
  const spectator = await connectSpectator(created.roomId, false, true);

  send(ws1, 'move', { move: '7g7f' });
  await waitFor(ws2, (m) => m.type === 'move' && m.payload?.move === '7g7f', 'move-broadcast');
  await waitFor(spectator, (m) => m.type === 'move' && m.payload?.move === '7g7f', 'spectator-move');

  send(ws2, 'resign', { ts: Date.now() });
  const end = await waitFor(ws1, (m) => m.type === 'game_end', 'game-end');
  await waitFor(spectator, (m) => m.type === 'game_end', 'spectator-game-end');
  ws1.close();
  ws2.close();
  spectator.close();

  console.log('[pvp-smoke] success');
  console.log(JSON.stringify({ roomId: created.roomId, result: end.payload }, null, 2));
}

async function testLockedRoom() {
  const password = `key-${Date.now().toString(36)}`;
  const host = await authGuest();
  const guest = await authGuest();
  const room = await createRoom(host.token, { password });

  let rejected = false;
  try {
    await joinRoom(guest.token, room.roomId, 'wrong-key');
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error('locked room accepted wrong password');

  const joined = await joinRoom(guest.token, room.roomId, password);
  if (!joined.seatToken) throw new Error('locked room did not return seatToken');
  await connectSpectator(room.roomId, false);
  console.log(`[pvp-smoke] locked-room ok room=${room.roomId}`);

  const privateRoom = await createRoom(host.token, { password, isPrivate: true });
  await joinRoom(guest.token, privateRoom.roomId, password);
  await connectSpectator(privateRoom.roomId, true);
  console.log(`[pvp-smoke] private-spectator-policy ok room=${privateRoom.roomId}`);
}

main().catch((error) => {
  console.error('[pvp-smoke] failed', error);
  process.exit(1);
});
