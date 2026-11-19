import type { TimerState } from './reducer';

/** Phase 5 stretch: one fixed five-minute roast round. */
export const ROAST_DURATION_SEC = 300;

export function roastEndsAt(timer: TimerState | null): number | null {
  if (!timer) return null;
  return timer.startAt + timer.durSec * 1000;
}

export function roastRemainingMs(timer: TimerState | null, now: number): number | null {
  const endsAt = roastEndsAt(timer);
  if (endsAt === null) return null;
  return Math.max(0, endsAt - now);
}

export function isRoastEnded(timer: TimerState | null, now: number): boolean {
  const endsAt = roastEndsAt(timer);
  return endsAt !== null && now >= endsAt;
}

/** Countdown text in m:ss form, rounded up so 4:59.2 still reads 5:00. */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
