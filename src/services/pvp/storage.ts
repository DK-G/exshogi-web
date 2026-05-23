import type { PvpMatchSession } from './session';

const SESSION_KEY = 'exshogi-web:pvp-session:v1';

export const savePvpSession = (session: PvpMatchSession) => {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Session restore is opportunistic; failing to persist should not break play.
  }
};

export const loadPvpSession = (): PvpMatchSession | null => {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PvpMatchSession;
  } catch {
    return null;
  }
};

export const clearPvpSession = () => {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
};
