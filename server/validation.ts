const USER_ID_RE = /^u_[a-f0-9]{16}$/;
const ROOM_ID_RE = /^(?:demo-)?[a-z2-7]{10}$/;

/** Trim, collapse repeated whitespace and enforce 2-24 characters. */
export function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 24) return null;
  return name;
}

export function normalizeUserId(value: unknown): string | null {
  return typeof value === 'string' && USER_ID_RE.test(value) ? value : null;
}

export function normalizeRoomId(value: unknown): string | null {
  return typeof value === 'string' && ROOM_ID_RE.test(value) ? value : null;
}

/**
 * Nexconn group channel IDs allow letters, digits and (in practice) underscores.
 * Room IDs are base32 plus an optional "demo-" prefix, so map "-" to "_".
 */
export function channelIdFor(roomId: string): string {
  return `pr_${roomId.replace(/-/g, '_')}`;
}
