export interface CooldownAllowed {
  allowed: true;
  timestamps: number[];
}

export interface CooldownDenied {
  allowed: false;
  retryAfterMs: number;
  timestamps: number[];
}

export const SEND_LIMIT = 5;
export const SEND_WINDOW_MS = 10_000;

/**
 * Sliding-window send limiter: max 5 messages per 10 seconds.
 * Returns the timestamps to keep; the caller stores them.
 */
export function takeSendSlot(
  timestamps: readonly number[],
  now: number,
  limit = SEND_LIMIT,
  windowMs = SEND_WINDOW_MS,
): CooldownAllowed | CooldownDenied {
  const recent = timestamps.filter((time) => Number.isFinite(time) && now - time < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
      timestamps: recent,
    };
  }

  return { allowed: true, timestamps: [...recent, now] };
}
