import { describe, expect, it } from 'vitest';
import {
  buildFeedback,
  buildSyncRequest,
  buildTimer,
  buildVote,
  isFeedbackTag,
  parseRoomEvent,
  serializeEvent,
  type RoomEvent,
} from './protocol';

const ID = '0123456789abcdef';
const OTHER_ID = 'fedcba9876543210';

describe('feedback events', () => {
  it('builds trimmed feedback with a 16-hex id', () => {
    const event = buildFeedback('hook', '  Strong opening  ', ID);
    expect(event).toEqual({ pr: 1, k: 'fb', id: ID, tag: 'hook', text: 'Strong opening' });
  });

  it('rejects bad tags, empty text and overlong text', () => {
    expect(buildFeedback('other', 'text', ID)).toBeNull();
    expect(buildFeedback('hook', '   ', ID)).toBeNull();
    expect(buildFeedback('hook', 'x'.repeat(501), ID)).toBeNull();
    expect(buildFeedback('hook', 'ok', 'not-an-id')).toBeNull();
  });

  it('counts characters, not UTF-16 code units', () => {
    const emoji = '🚀';
    expect(buildFeedback('fix', emoji.repeat(500), ID)).not.toBeNull();
    expect(buildFeedback('fix', emoji.repeat(501), ID)).toBeNull();
  });

  it('parses a serialized event', () => {
    const event = buildFeedback('clarity', 'Clear enough', ID);
    expect(event).not.toBeNull();
    expect(parseRoomEvent(serializeEvent(event!))).toEqual(event);
  });

  it('accepts extra unknown fields but validates known ones strictly', () => {
    expect(parseRoomEvent({ pr: 1, k: 'fb', id: ID, tag: 'fix', text: 'ok', extra: 1 })).toEqual({
      pr: 1,
      k: 'fb',
      id: ID,
      tag: 'fix',
      text: 'ok',
    });
    expect(parseRoomEvent({ pr: 1, k: 'fb', id: ID, tag: 'nope', text: 'ok' })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'fb', id: 'xyz', tag: 'fix', text: 'ok' })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'fb', id: ID, tag: 'fix', text: '' })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'fb', id: ID, tag: 'fix', text: '   ' })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'fb', id: ID, tag: 'fix', text: 'x'.repeat(501) })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'fb', id: ID, tag: 'fix', text: 12 })).toBeNull();
  });

  it('ignores unknown versions and kinds', () => {
    expect(parseRoomEvent({ pr: 2, k: 'fb', id: ID, tag: 'fix', text: 'ok' })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'shrug', id: ID })).toBeNull();
    expect(parseRoomEvent({ k: 'fb', id: ID, tag: 'fix', text: 'ok' })).toBeNull();
  });

  it('ignores malformed input', () => {
    expect(parseRoomEvent('')).toBeNull();
    expect(parseRoomEvent('{oops')).toBeNull();
    expect(parseRoomEvent('null')).toBeNull();
    expect(parseRoomEvent('[]')).toBeNull();
    expect(parseRoomEvent('x'.repeat(5000))).toBeNull();
    expect(parseRoomEvent(null)).toBeNull();
    expect(parseRoomEvent(42)).toBeNull();
  });
});

describe('vote events', () => {
  it('builds and parses votes', () => {
    expect(buildVote(ID, true)).toEqual({ pr: 1, k: 'vote', target: ID, on: true });
    expect(parseRoomEvent({ pr: 1, k: 'vote', target: ID, on: false })).toEqual({
      pr: 1,
      k: 'vote',
      target: ID,
      on: false,
    });
  });

  it('rejects invalid votes', () => {
    expect(buildVote('nope', true)).toBeNull();
    expect(buildVote(ID, 'yes' as unknown as boolean)).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'vote', target: ID, on: 'yes' })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'vote', target: OTHER_ID })).toBeNull();
  });
});

describe('timer events', () => {
  it('builds and parses a timer', () => {
    expect(buildTimer(1_700_000_000_000, 120)).toEqual({
      pr: 1,
      k: 'timer',
      startAt: 1_700_000_000_000,
      durSec: 120,
    });
    expect(parseRoomEvent({ pr: 1, k: 'timer', startAt: 1_700_000_000_000, durSec: 120 })).toEqual({
      pr: 1,
      k: 'timer',
      startAt: 1_700_000_000_000,
      durSec: 120,
    });
  });

  it('rejects invalid timers', () => {
    expect(buildTimer(-1, 10)).toBeNull();
    expect(buildTimer(0, 0)).toBeNull();
    expect(buildTimer(0, 4000)).toBeNull();
    expect(buildTimer(9_000_000_000_000_000, 10)).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'timer', startAt: Number.NaN, durSec: 10 })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'timer', startAt: 0, durSec: Number.POSITIVE_INFINITY })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'timer', startAt: 9_000_000_000_000_000, durSec: 10 })).toBeNull();
  });
});

describe('isFeedbackTag', () => {
  it('accepts exactly the three tags', () => {
    expect(isFeedbackTag('hook')).toBe(true);
    expect(isFeedbackTag('clarity')).toBe(true);
    expect(isFeedbackTag('fix')).toBe(true);
    expect(isFeedbackTag('Hook')).toBe(false);
    expect(isFeedbackTag('')).toBe(false);
  });
});

describe('control events', () => {
  const AUTHOR = 'u_aaaaaaaaaaaaaaaa';
  const VOTER = 'u_bbbbbbbbbbbbbbbb';

  const snapshot = {
    pr: 1,
    k: 'state',
    at: 5000,
    fb: [{ id: ID, tag: 'hook', text: 'Earlier note', by: AUTHOR, bn: 'Ana', at: 900 }],
    v: [{ target: ID, by: VOTER, bn: 'Ben' }],
    tm: { startAt: 800, durSec: 60 },
  };

  it('builds and parses a sync request', () => {
    const sync = buildSyncRequest(1234);
    expect(sync).toEqual({ pr: 1, k: 'sync', at: 1234 });
    expect(parseRoomEvent(sync)).toEqual(sync);
    expect(parseRoomEvent(serializeEvent(sync))).toEqual(sync);
  });

  it('round-trips a state snapshot', () => {
    expect(parseRoomEvent(snapshot)).toEqual(snapshot);
    expect(parseRoomEvent(serializeEvent(snapshot as RoomEvent))).toEqual(snapshot);
    expect(parseRoomEvent({ ...snapshot, tr: true })).toEqual({ ...snapshot, tr: true });
  });

  it('rejects malformed snapshots', () => {
    expect(parseRoomEvent({ ...snapshot, at: -1 })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, at: 9_000_000_000_000_000 })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, fb: 'nope' })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, v: 'nope' })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, fb: [{ ...snapshot.fb[0], by: 'bad' }] })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, fb: [{ ...snapshot.fb[0], text: '' }] })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, fb: [{ ...snapshot.fb[0], at: -5 }] })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, fb: [{ ...snapshot.fb[0], at: 9_000_000_000_000_000 }] })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, v: [{ target: 'bad', by: VOTER }] })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, v: [{ target: ID, by: VOTER, bn: 'A' }] })).toEqual({
      ...snapshot,
      v: [{ target: ID, by: VOTER, bn: 'Reviewer' }],
    });
    expect(parseRoomEvent({ ...snapshot, tm: { startAt: 0, durSec: 0 } })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, tm: { startAt: 0, durSec: 4000 } })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, tm: { startAt: 9_000_000_000_000_000, durSec: 10 } })).toBeNull();
    expect(parseRoomEvent({ ...snapshot, tr: 'yes' })).toEqual(snapshot);
  });

  it('rejects out-of-range sync timestamps', () => {
    expect(parseRoomEvent({ pr: 1, k: 'sync', at: -1 })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'sync', at: 9_000_000_000_000_000 })).toBeNull();
    expect(parseRoomEvent({ pr: 1, k: 'sync', at: 8_640_000_000_000_000 })).toEqual({
      pr: 1,
      k: 'sync',
      at: 8_640_000_000_000_000,
    });
  });

  it('drops duplicate feedback and votes instead of failing', () => {
    const duplicated = {
      ...snapshot,
      fb: [snapshot.fb[0], snapshot.fb[0]],
      v: [snapshot.v[0], snapshot.v[0]],
    };
    expect(parseRoomEvent(duplicated)).toEqual(snapshot);
  });
});
