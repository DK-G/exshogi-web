export type PvpBackend = 'cloudflare' | 'express';

type PvpGlobalConfig = {
  EXSHOGI_PVP_BACKEND?: string;
  EXSHOGI_PVP_BASE_URL?: string;
  EXSHOGI_PVP_WS_URL?: string;
};

const CLOUDFLARE_HTTP_URL = 'https://www.exshogi.com';
const CLOUDFLARE_WS_URL = 'wss://www.exshogi.com';

function readGlobalConfig(): PvpGlobalConfig {
  return globalThis as unknown as PvpGlobalConfig;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function resolveBaseUrl(): string {
  const viteUrl = import.meta.env.VITE_EXSHOGI_PVP_BASE_URL as string | undefined;
  const configured = readGlobalConfig().EXSHOGI_PVP_BASE_URL ?? viteUrl;
  return configured && configured.trim()
    ? normalizeUrl(configured)
    : CLOUDFLARE_HTTP_URL;
}

function resolveWsUrl(baseUrl: string): string {
  const viteUrl = import.meta.env.VITE_EXSHOGI_PVP_WS_URL as string | undefined;
  const configured = readGlobalConfig().EXSHOGI_PVP_WS_URL ?? viteUrl;
  if (configured && configured.trim()) return normalizeUrl(configured);
  if (baseUrl.startsWith('https://')) return `wss://${baseUrl.slice('https://'.length)}`;
  if (baseUrl.startsWith('http://')) return `ws://${baseUrl.slice('http://'.length)}`;
  return CLOUDFLARE_WS_URL;
}

function resolveBackend(baseUrl: string): PvpBackend {
  const explicit = (
    readGlobalConfig().EXSHOGI_PVP_BACKEND ??
    (import.meta.env.VITE_EXSHOGI_PVP_BACKEND as string | undefined) ??
    ''
  )
    .trim()
    .toLowerCase();
  if (explicit === 'express') return 'express';
  if (explicit === 'cloudflare') return 'cloudflare';
  return /localhost|127\.0\.0\.1|192\.168\.\d+\.\d+/.test(baseUrl)
    ? 'express'
    : 'cloudflare';
}

export const PVP_HTTP_BASE_URL = resolveBaseUrl();
export const PVP_WS_BASE_URL = resolveWsUrl(PVP_HTTP_BASE_URL);
export const PVP_BACKEND = resolveBackend(PVP_HTTP_BASE_URL);
