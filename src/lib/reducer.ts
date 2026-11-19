import type {
  FeedbackTag,
  RoomEvent,
  SnapshotFeedback,
  SnapshotVote,
  StateEvent,
} from './protocol';

export interface Reviewer {
  userId: string;
  name: string;
}

export interface FeedbackItem {
  id: string;
  tag: FeedbackTag;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

export interface TimerState {
  startAt: number;
  durSec: number;
}

export interface RoomState {
  feedback: FeedbackItem[];
  /** votes[feedbackId][userId] = true|false; the last vote per voter wins. */
  votes: Record<string, Record<string, boolean>>;
  reviewers: Reviewer[];
  timer: TimerState | null;
}

export interface IncomingEvent {
  event: RoomEvent;
  senderId: string;
  senderName?: string;
  sentAt: number;
}

export function emptyRoomState(): RoomState {
  return { feedback: [], votes: {}, reviewers: [], timer: null };
}

function upsertReviewer(reviewers: Reviewer[], userId: string, name: string): Reviewer[] {
  const index = reviewers.findIndex((reviewer) => reviewer.userId === userId);
  if (index === -1) {
    return [...reviewers, { userId, name }];
  }
  if (!name || reviewers[index]?.name === name) return reviewers;
  const next = reviewers.slice();
  next[index] = { ...next[index], name };
  return next;
}

export function applyEvent(state: RoomState, incoming: IncomingEvent): RoomState {
  const { event, senderId } = incoming;
  const senderName = typeof incoming.senderName === 'string' ? incoming.senderName.trim() : '';
  const sentAt = Number.isFinite(incoming.sentAt) ? incoming.sentAt : 0;

  let next: RoomState = {
    ...state,
    reviewers: upsertReviewer(state.reviewers, senderId, senderName),
  };

  if (event.k === 'fb') {
    if (next.feedback.some((item) => item.id === event.id)) return next;

    const item: FeedbackItem = {
      id: event.id,
      tag: event.tag,
      text: event.text,
      authorId: senderId,
      authorName: senderName || 'Reviewer',
      createdAt: sentAt,
    };

    next = {
      ...next,
      feedback: [...next.feedback, item].sort((a, b) => a.createdAt - b.createdAt),
    };
    return next;
  }

  if (event.k === 'vote') {
    const forTarget = next.votes[event.target] ?? {};
    return {
      ...next,
      votes: {
        ...next.votes,
        [event.target]: { ...forTarget, [senderId]: event.on },
      },
    };
  }

  if (event.k === 'sync') {
    return next;
  }

  if (event.k === 'state') {
    const known = new Set(next.feedback.map((item) => item.id));
    const added = event.fb
      .filter((item) => !known.has(item.id))
      .map<FeedbackItem>((item) => ({
        id: item.id,
        tag: item.tag,
        text: item.text,
        authorId: item.by,
        authorName: item.bn,
        createdAt: item.at,
      }));

    let reviewers = next.reviewers;
    for (const item of event.fb) reviewers = upsertReviewer(reviewers, item.by, item.bn);

    let votes = next.votes;
    if (event.v.length > 0) {
      const copy: Record<string, Record<string, boolean>> = { ...votes };
      for (const item of event.v) {
        copy[item.target] = { ...(copy[item.target] ?? {}), [item.by]: true };
        reviewers = upsertReviewer(reviewers, item.by, item.bn);
      }
      votes = copy;
    }

    const timer =
      event.tm && (!next.timer || event.tm.startAt > next.timer.startAt)
        ? { startAt: event.tm.startAt, durSec: event.tm.durSec }
        : next.timer;

    return {
      feedback: added.length > 0 ? [...next.feedback, ...added].sort((a, b) => a.createdAt - b.createdAt) : next.feedback,
      votes,
      reviewers,
      timer,
    };
  }

  return {
    ...next,
    timer: { startAt: event.startAt, durSec: event.durSec },
  };
}

export function reduceEvents(events: readonly IncomingEvent[]): RoomState {
  let state = emptyRoomState();
  for (const incoming of events) {
    state = applyEvent(state, incoming);
  }
  return state;
}

export function voteCount(state: RoomState, feedbackId: string): number {
  const target = state.votes[feedbackId];
  if (!target) return 0;
  return Object.values(target).filter(Boolean).length;
}

export function hasVoted(state: RoomState, feedbackId: string, userId: string): boolean {
  return state.votes[feedbackId]?.[userId] === true;
}

export function reviewerCount(state: RoomState): number {
  return state.reviewers.length;
}

const SNAPSHOT_ITEM_BUDGET = 8_000;
const SNAPSHOT_CHAR_LIMIT = 11_000;
const SNAPSHOT_MAX_ITEMS = 200;

/**
 * Build a compact snapshot for a new joiner. Newest feedback is kept first;
 * very large rooms are truncated and flagged with `tr`.
 */
export function buildSnapshot(state: RoomState, now = Date.now()): StateEvent | null {
  if (state.feedback.length === 0 && !state.timer) return null;

  const nameFor = (userId: string): string =>
    state.reviewers.find((reviewer) => reviewer.userId === userId)?.name || 'Reviewer';

  const byNewest = [...state.feedback].sort((a, b) => b.createdAt - a.createdAt);
  let chosen: SnapshotFeedback[] = [];
  let truncated = false;

  for (const item of byNewest) {
    if (chosen.length >= SNAPSHOT_MAX_ITEMS) {
      truncated = true;
      break;
    }
    chosen.push({
      id: item.id,
      tag: item.tag,
      text: item.text,
      by: item.authorId,
      bn: item.authorName,
      at: item.createdAt,
    });
    if (JSON.stringify(chosen).length > SNAPSHOT_ITEM_BUDGET) {
      chosen.pop();
      truncated = true;
      break;
    }
  }

  chosen.reverse();

  const finalize = (items: SnapshotFeedback[]): StateEvent => {
    const votes: SnapshotVote[] = [];
    for (const item of items) {
      for (const [by, on] of Object.entries(state.votes[item.id] ?? {})) {
        if (on) votes.push({ target: item.id, by, bn: nameFor(by) });
      }
    }

    const event: StateEvent = {
      pr: 1,
      k: 'state',
      at: Math.floor(now),
      fb: items,
      v: votes,
    };
    if (state.timer) event.tm = { startAt: state.timer.startAt, durSec: state.timer.durSec };
    if (truncated) event.tr = true;
    return event;
  };

  let event = finalize(chosen);
  while (JSON.stringify(event).length > SNAPSHOT_CHAR_LIMIT && chosen.length > 0) {
    chosen = chosen.slice(1);
    truncated = true;
    event = finalize(chosen);
  }

  if (event.fb.length === 0 && !event.tm) return null;
  return event;
}
