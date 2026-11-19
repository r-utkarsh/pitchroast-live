import { describe, expect, it } from 'vitest';
import type { IncomingEvent } from './reducer';
import {
  applyEvent,
  buildSnapshot,
  emptyRoomState,
  hasVoted,
  reduceEvents,
  reviewerCount,
  voteCount,
} from './reducer';
import { parseRoomEvent } from './protocol';

const A = 'u_aaaaaaaaaaaaaaaa';
const B = 'u_bbbbbbbbbbbbbbbb';
const C = 'u_cccccccccccccccc';

const FB1 = '1111111111111111';
const FB2 = '2222222222222222';

function feedback(id: string, at: number, senderId = A, senderName = 'Ana'): IncomingEvent {
  return {
    event: { pr: 1, k: 'fb', id, tag: 'hook', text: `note ${id}`, },
    senderId,
    senderName,
    sentAt: at,
  };
}

function vote(target: string, on: boolean, at: number, senderId = B, senderName = 'Ben'): IncomingEvent {
  return { event: { pr: 1, k: 'vote', target, on }, senderId, senderName, sentAt: at };
}

describe('reduceEvents', () => {
  it('returns an empty state', () => {
    expect(emptyRoomState()).toEqual({ feedback: [], votes: {}, reviewers: [], timer: null });
  });

  it('orders feedback chronologically even when events arrive out of order', () => {
    const state = reduceEvents([feedback(FB2, 200), feedback(FB1, 100)]);
    expect(state.feedback.map((item) => item.id)).toEqual([FB1, FB2]);
  });

  it('deduplicates feedback by id', () => {
    const state = reduceEvents([feedback(FB1, 100), feedback(FB1, 150, B, 'Ben')]);
    expect(state.feedback).toHaveLength(1);
    expect(state.feedback[0]?.authorId).toBe(A);
  });

  it('applies the last vote per voter and counts true votes', () => {
    let state = reduceEvents([feedback(FB1, 100)]);
    state = applyEvent(state, vote(FB1, true, 110, B, 'Ben'));
    state = applyEvent(state, vote(FB1, true, 120, C, 'Cleo'));
    state = applyEvent(state, vote(FB1, false, 130, B, 'Ben'));

    expect(voteCount(state, FB1)).toBe(1);
    expect(hasVoted(state, FB1, B)).toBe(false);
    expect(hasVoted(state, FB1, C)).toBe(true);

    state = applyEvent(state, vote(FB1, true, 140, B, 'Ben'));
    expect(voteCount(state, FB1)).toBe(2);
  });

  it('keeps votes for unknown targets and applies them later', () => {
    let state = reduceEvents([vote(FB2, true, 100, B, 'Ben')]);
    expect(voteCount(state, FB2)).toBe(1);

    state = applyEvent(state, feedback(FB2, 50));
    expect(voteCount(state, FB2)).toBe(1);
  });

  it('allows self votes', () => {
    let state = reduceEvents([feedback(FB1, 100, A, 'Ana')]);
    state = applyEvent(state, vote(FB1, true, 110, A, 'Ana'));
    expect(voteCount(state, FB1)).toBe(1);
  });

  it('tracks unique reviewers, including voters, and upgrades names', () => {
    let state = reduceEvents([feedback(FB1, 100, A, 'Ana')]);
    state = applyEvent(state, vote(FB1, true, 110, B, ''));
    state = applyEvent(state, vote(FB1, false, 120, A, ''));
    state = applyEvent(state, vote(FB1, true, 130, B, 'Ben'));

    expect(reviewerCount(state)).toBe(2);
    expect(state.reviewers).toEqual([
      { userId: A, name: 'Ana' },
      { userId: B, name: 'Ben' },
    ]);
  });

  it('keeps the last timer', () => {
    const state = reduceEvents([
      { event: { pr: 1, k: 'timer', startAt: 100, durSec: 60 }, senderId: A, senderName: 'Ana', sentAt: 100 },
      { event: { pr: 1, k: 'timer', startAt: 200, durSec: 90 }, senderId: A, senderName: 'Ana', sentAt: 200 },
    ]);
    expect(state.timer).toEqual({ startAt: 200, durSec: 90 });
  });
});

describe('state snapshots', () => {
  function seed() {
    return reduceEvents([
      feedback(FB1, 100, A, 'Ana'),
      vote(FB1, true, 110, B, 'Ben'),
      feedback(FB2, 120, B, 'Ben'),
    ]);
  }

  it('round-trips the room state through a snapshot', () => {
    const state = seed();
    const snapshot = buildSnapshot(state, 5000);
    expect(snapshot).not.toBeNull();

    const parsed = parseRoomEvent(JSON.stringify(snapshot));
    expect(parsed).toEqual(snapshot);

    const restored = applyEvent(emptyRoomState(), {
      event: parsed!,
      senderId: C,
      senderName: 'Cleo',
      sentAt: 6000,
    });

    expect(restored.feedback).toEqual(state.feedback);
    expect(voteCount(restored, FB1)).toBe(1);
    expect(hasVoted(restored, FB1, B)).toBe(true);
    expect(restored.feedback[0]?.authorName).toBe('Ana');
    expect(restored.reviewers.some((reviewer) => reviewer.userId === A && reviewer.name === 'Ana')).toBe(
      true,
    );
    expect(restored.reviewers.some((reviewer) => reviewer.userId === B && reviewer.name === 'Ben')).toBe(
      true,
    );
  });

  it('merges a snapshot without duplicating known feedback', () => {
    const state = seed();
    const snapshot = buildSnapshot(state, 5000)!;
    const merged = applyEvent(state, {
      event: snapshot,
      senderId: C,
      senderName: 'Cleo',
      sentAt: 6000,
    });

    expect(merged.feedback).toHaveLength(2);
    expect(merged.feedback.map((item) => item.id)).toEqual([FB1, FB2]);
    expect(voteCount(merged, FB1)).toBe(1);
  });

  it('keeps the later timer and ignores a sync event for state', () => {
    const state = reduceEvents([
      { event: { pr: 1, k: 'timer', startAt: 200, durSec: 60 }, senderId: A, senderName: 'Ana', sentAt: 200 },
    ]);
    const snapshot = buildSnapshot(state, 3000)!;

    const merged = applyEvent(emptyRoomState(), {
      event: snapshot,
      senderId: B,
      senderName: 'Ben',
      sentAt: 3000,
    });
    expect(merged.timer).toEqual({ startAt: 200, durSec: 60 });

    const unchanged = applyEvent(merged, {
      event: { pr: 1, k: 'sync', at: 3001 },
      senderId: C,
      senderName: 'Cleo',
      sentAt: 3001,
    });
    expect(unchanged.feedback).toEqual(merged.feedback);
    expect(unchanged.votes).toEqual(merged.votes);
    expect(unchanged.timer).toEqual(merged.timer);
  });

  it('truncates oversized rooms and still parses', () => {
    const events: IncomingEvent[] = Array.from({ length: 40 }, (_, index) => ({
      event: {
        pr: 1,
        k: 'fb',
        id: index.toString(16).padStart(16, '0'),
        tag: 'fix',
        text: `note ${index} ${'x'.repeat(400)}`,
      },
      senderId: A,
      senderName: 'Ana',
      sentAt: index * 10,
    }));

    const state = reduceEvents(events);
    const snapshot = buildSnapshot(state, 5000);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.tr).toBe(true);
    expect(JSON.stringify(snapshot).length).toBeLessThanOrEqual(11_000);
    expect(parseRoomEvent(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(snapshot!.fb.length).toBeGreaterThan(0);
    expect(snapshot!.fb.length).toBeLessThan(40);
    expect(snapshot!.fb.at(-1)?.id).toBe('0000000000000027');
  });
});
