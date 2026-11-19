export const LIMITS = {
  titleMax: 80,
  pitchMax: 140,
  urlMax: 300,
  nameMin: 2,
  nameMax: 24,
  feedbackMax: 500,
  roomIdLength: 10,
  payloadMax: 2000,
} as const;

export const USER_ID_RE = /^u_[a-f0-9]{16}$/;
export const ROOM_ID_RE = /^(?:demo-)?[a-z2-7]{10}$/;
export const FEEDBACK_ID_RE = /^[a-f0-9]{16}$/;

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function textLength(value: string): number {
  return Array.from(value).length;
}

function randomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random numbers are unavailable');
  }
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function randomHex(byteLength = 8): string {
  let hex = '';
  for (const byte of randomBytes(byteLength)) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/** u_ + 16 lowercase hex characters. */
export function generateUserId(): string {
  return `u_${randomHex(8)}`;
}

export function isValidUserId(value: unknown): value is string {
  return typeof value === 'string' && USER_ID_RE.test(value);
}

/** 10 random lowercase base32 characters (a-z, 2-7). */
export function generateRoomId(): string {
  let roomId = '';
  for (const byte of randomBytes(LIMITS.roomIdLength)) {
    roomId += BASE32_ALPHABET[byte % 32];
  }
  return roomId;
}

export function generateDemoRoomId(): string {
  return `demo-${generateRoomId()}`;
}

export function isValidRoomId(value: unknown): value is string {
  return typeof value === 'string' && ROOM_ID_RE.test(value);
}

/** Nexconn group channel ID for a room; "-" in demo IDs becomes "_". */
export function channelIdForRoom(roomId: string): string {
  return `pr_${roomId.replace(/-/g, '_')}`;
}

export function buildRoomPath(roomId: string, payload: string): string {
  return `/r/${roomId}?d=${payload}`;
}

/** Trim, collapse repeated whitespace, require 2-24 characters. */
export function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  const length = textLength(name);
  if (length < LIMITS.nameMin || length > LIMITS.nameMax) return null;
  return name;
}

export function normalizeTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  const length = textLength(title);
  if (length < 1 || length > LIMITS.titleMax) return null;
  return title;
}

export function normalizePitch(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const pitch = value.trim();
  const length = textLength(pitch);
  if (length < 1 || length > LIMITS.pitchMax) return null;
  return pitch;
}

/** Accepts http/https only; adds https:// when the scheme is missing. */
export function normalizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let url = value.trim();
  if (!url || url.length > LIMITS.urlMax) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(url)) return null;

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    url = `https://${url}`;
  }
  if (url.length > LIMITS.urlMax) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname) return null;
  return url;
}

export interface RoomPayload {
  v: 1;
  t: string;
  u: string;
  p: string;
  c: number;
}

export function createRoomPayload(input: {
  title: unknown;
  url: unknown;
  pitch: unknown;
  createdAt?: unknown;
}): RoomPayload | null {
  const title = normalizeTitle(input.title);
  const pitch = normalizePitch(input.pitch);
  const url = normalizeUrl(input.url);
  if (!title || !pitch || !url) return null;

  const createdAt =
    typeof input.createdAt === 'number' && Number.isFinite(input.createdAt) && input.createdAt >= 0
      ? Math.floor(input.createdAt)
      : Date.now();

  return { v: 1, t: title, u: url, p: pitch, c: createdAt };
}

export function validateRoomPayload(value: unknown): RoomPayload | null {
  if (!isRecord(value)) return null;
  if (value.v !== 1) return null;

  const title = normalizeTitle(value.t);
  const pitch = normalizePitch(value.p);
  const url = normalizeUrl(value.u);
  const createdAt = value.c;

  if (!title || !pitch || !url) return null;
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt) || createdAt < 0) return null;

  return { v: 1, t: title, u: url, p: pitch, c: Math.floor(createdAt) };
}

export function encodeRoomPayload(payload: RoomPayload): string | null {
  const valid = validateRoomPayload(payload);
  if (!valid) return null;

  try {
    const bytes = new TextEncoder().encode(JSON.stringify(valid));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return null;
  }
}

export function decodeRoomPayload(encoded: unknown): RoomPayload | null {
  if (typeof encoded !== 'string') return null;
  if (!encoded || encoded.length > LIMITS.payloadMax) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return validateRoomPayload(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}
