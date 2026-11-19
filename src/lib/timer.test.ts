import { describe, expect, it } from 'vitest';
import {
  ROAST_DURATION_SEC,
  formatCountdown,
  isRoastEnded,
  roastEndsAt,
  roastRemainingMs,
} from './timer';

const START = 1_700_000_000_000;
const TIMER = { startAt: START, durSec: ROAST_DURATION_SEC };

describe('roast timer helpers', () => {
  it('has a five-minute round', () => {
    expect(ROAST_DURATION_SEC).toBe(300);
  });

  it('computes the end, remaining time and ended state', () => {
    expect(roastEndsAt(null)).toBeNull();
    expect(roastRemainingMs(null, START)).toBeNull();
    expect(isRoastEnded(null, START)).toBe(false);

    expect(roastEndsAt(TIMER)).toBe(START + 300_000);
    expect(roastRemainingMs(TIMER, START)).toBe(300_000);
    expect(roastRemainingMs(TIMER, START + 299_500)).toBe(500);
    expect(roastRemainingMs(TIMER, START + 300_000)).toBe(0);
    expect(roastRemainingMs(TIMER, START + 400_000)).toBe(0);

    expect(isRoastEnded(TIMER, START + 299_999)).toBe(false);
    expect(isRoastEnded(TIMER, START + 300_000)).toBe(true);
  });

  it('formats a rounded-up countdown', () => {
    expect(formatCountdown(300_000)).toBe('5:00');
    expect(formatCountdown(299_200)).toBe('5:00');
    expect(formatCountdown(298_000)).toBe('4:58');
    expect(formatCountdown(61_000)).toBe('1:01');
    expect(formatCountdown(1)).toBe('0:01');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-500)).toBe('0:00');
  });
});
