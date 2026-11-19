import { describe, expect, it } from 'vitest';
import { buildDigest, formatCollected } from './digest';
import type { IncomingEvent } from './reducer';
import { reduceEvents } from './reducer';

const A = 'u_aaaaaaaaaaaaaaaa';
const B = 'u_bbbbbbbbbbbbbbbb';
const FB_FIX = '1111111111111111';
const FB_DARK = '2222222222222222';
const FB_HOOK = '3333333333333333';

function fb(id: string, tag: 'hook' | 'clarity' | 'fix', text: string, at: number, senderId = A, senderName = 'Ana'): IncomingEvent {
  return { event: { pr: 1, k: 'fb', id, tag, text }, senderId, senderName, sentAt: at };
}

function vote(target: string, on: boolean, at: number, senderId = A, senderName = 'Ana'): IncomingEvent {
  return { event: { pr: 1, k: 'vote', target, on }, senderId, senderName, sentAt: at };
}

describe('formatCollected', () => {
  it('formats local time as YYYY-MM-DD HH:mm', () => {
    expect(formatCollected(new Date(2026, 10, 19, 9, 30))).toBe('2026-11-19 09:30');
    expect(formatCollected(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02 00:05');
  });
});

describe('buildDigest', () => {
  it('follows the exact SPEC structure and sorts by votes then time', () => {
    const state = reduceEvents([
      fb(FB_FIX, 'fix', 'Fix the button', 100, A, 'Ana'),
      fb(FB_DARK, 'fix', 'Add dark mode', 150, B, 'Ben'),
      fb(FB_HOOK, 'hook', 'Catchy title', 200, A, 'Ana'),
      vote(FB_FIX, true, 210, A, 'Ana'),
      vote(FB_FIX, true, 220, B, 'Ben'),
      vote(FB_HOOK, true, 230, B, 'Ben'),
    ]);

    const digest = buildDigest({
      title: 'Cloud Notes',
      pitch: 'Write notes that sync.',
      url: 'https://example.com',
      state,
      now: new Date(2026, 10, 19, 9, 30),
    });

    expect(digest).toBe(
      [
        '# PitchRoast feedback: Cloud Notes',
        'Write notes that sync.  Link: https://example.com',
        'Collected: 2026-11-19 09:30 | 3 comments | 2 reviewers',
        '## Fix (2)',
        '- [ ] Fix the button (+2) by Ana',
        '- [ ] Add dark mode (+0) by Ben',
        '## Hook (1)',
        '- [ ] Catchy title (+1) by Ana',
        '',
      ].join('\n'),
    );
  });

  it('skips empty sections and collapses newlines in items', () => {
    const state = reduceEvents([fb(FB_FIX, 'fix', 'Fix\nthe  button', 100)]);
    const digest = buildDigest({
      title: 'T',
      pitch: 'P',
      url: 'https://e.co',
      state,
      now: new Date(2026, 10, 19, 9, 30),
    });

    expect(digest).toContain('## Fix (1)\n- [ ] Fix the button (+0) by Ana');
    expect(digest).not.toContain('## Clarity');
    expect(digest).not.toContain('## Hook');
    expect(digest).toContain('1 comments | 1 reviewers');
  });

  it('is stable with no comments', () => {
    const digest = buildDigest({
      title: 'Empty',
      pitch: 'Nothing yet',
      url: 'https://e.co',
      state: { feedback: [], votes: {}, reviewers: [], timer: null },
      now: new Date(2026, 10, 19, 9, 30),
    });
    expect(digest).toBe(
      [
        '# PitchRoast feedback: Empty',
        'Nothing yet  Link: https://e.co',
        'Collected: 2026-11-19 09:30 | 0 comments | 0 reviewers',
        '',
      ].join('\n'),
    );
  });
});
