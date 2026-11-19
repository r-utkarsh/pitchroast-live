import { describe, expect, it } from 'vitest';
import { SEND_LIMIT, SEND_WINDOW_MS, takeSendSlot } from './cooldown';

describe('takeSendSlot', () => {
  it('allows five messages per ten seconds', () => {
    let timestamps: number[] = [];
    for (let i = 0; i < SEND_LIMIT; i += 1) {
      const result = takeSendSlot(timestamps, 1000 + i);
      expect(result.allowed).toBe(true);
      timestamps = result.timestamps;
    }

    const denied = takeSendSlot(timestamps, 1005);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) {
      expect(denied.retryAfterMs).toBe(SEND_WINDOW_MS - 5);
    }
  });

  it('allows again after the window slides', () => {
    let timestamps: number[] = [];
    for (let i = 0; i < SEND_LIMIT; i += 1) {
      const result = takeSendSlot(timestamps, 1000);
      timestamps = result.timestamps;
    }

    expect(takeSendSlot(timestamps, 1000 + SEND_WINDOW_MS - 1).allowed).toBe(false);
    expect(takeSendSlot(timestamps, 1000 + SEND_WINDOW_MS).allowed).toBe(true);
  });

  it('drops stale timestamps and supports custom limits', () => {
    const result = takeSendSlot([0, 1, 2], 20_000, 2, 1000);
    expect(result.allowed).toBe(true);
    expect(result.timestamps).toEqual([20_000]);

    const denied = takeSendSlot([19_500, 19_700], 19_800, 2, 1000);
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.retryAfterMs).toBe(700);
  });
});
