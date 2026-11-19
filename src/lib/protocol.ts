import {
  FEEDBACK_ID_RE,
  isValidUserId,
  LIMITS,
  MAX_TIMESTAMP,
  normalizeName,
  randomHex,
  textLength,
} from './validation';

export type FeedbackTag = 'hook' | 'clarity' | 'fix';

export const FEEDBACK_TAGS: readonly FeedbackTag[] = ['hook', 'clarity', 'fix'];

export interface FeedbackEvent {
  pr: 1;
  k: 'fb';
  id: string;
  tag: FeedbackTag;
  text: string;
}

export interface VoteEvent {
  pr: 1;
  k: 'vote';
  target: string;
  on: boolean;
}

export interface TimerEvent {
  pr: 1;
  k: 'timer';
  startAt: number;
  durSec: number;
}

/**
 * Asks other members to send a state snapshot. Nexconn group history only
 * contains messages sent while the viewer was already a member, so a new
 * joiner uses this control message to backfill earlier feedback.
 */
export interface SyncEvent {
  pr: 1;
  k: 'sync';
  at: number;
}

export interface SnapshotFeedback {
  id: string;
  tag: FeedbackTag;
  text: string;
  by: string;
  bn: string;
  at: number;
}

export interface SnapshotVote {
  target: string;
  by: string;
  bn: string;
}

export interface StateEvent {
  pr: 1;
  k: 'state';
  at: number;
  fb: SnapshotFeedback[];
  v: SnapshotVote[];
  tm?: { startAt: number; durSec: number };
  /** Present when the snapshot could not include every earlier item. */
  tr?: true;
}

export type RoomEvent = FeedbackEvent | VoteEvent | TimerEvent | SyncEvent | StateEvent;

const MAX_EVENT_JSON = 12_000;
const MAX_TIMER_SECONDS = 3600;
const MAX_SNAPSHOT_FEEDBACK = 200;
const MAX_SNAPSHOT_VOTES = 1000;
const MAX_SNAPSHOT_CHARS = 11_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFeedbackTag(value: unknown): value is FeedbackTag {
  return value === 'hook' || value === 'clarity' || value === 'fix';
}

export function buildFeedback(tag: string, text: string, id?: string): FeedbackEvent | null {
  if (!isFeedbackTag(tag)) return null;
  if (typeof text !== 'string') return null;

  const trimmed = text.trim();
  const length = textLength(trimmed);
  if (length < 1 || length > LIMITS.feedbackMax) return null;

  const feedbackId = id ?? randomHex(8);
  if (!FEEDBACK_ID_RE.test(feedbackId)) return null;

  return { pr: 1, k: 'fb', id: feedbackId, tag, text: trimmed };
}

export function buildVote(target: string, on: boolean): VoteEvent | null {
  if (typeof target !== 'string' || !FEEDBACK_ID_RE.test(target)) return null;
  if (typeof on !== 'boolean') return null;
  return { pr: 1, k: 'vote', target, on };
}

export function buildTimer(startAt: number, durSec: number): TimerEvent | null {
  if (!Number.isFinite(startAt) || startAt < 0 || startAt > MAX_TIMESTAMP) return null;
  if (!Number.isFinite(durSec) || durSec < 1 || durSec > MAX_TIMER_SECONDS) return null;
  return { pr: 1, k: 'timer', startAt: Math.floor(startAt), durSec: Math.floor(durSec) };
}

export function buildSyncRequest(at = Date.now()): SyncEvent {
  return { pr: 1, k: 'sync', at: Math.floor(at) };
}

function parseSnapshotFeedback(value: unknown): SnapshotFeedback | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !FEEDBACK_ID_RE.test(value.id)) return null;
  if (!isFeedbackTag(value.tag)) return null;
  if (typeof value.text !== 'string') return null;
  if (textLength(value.text) < 1 || textLength(value.text) > LIMITS.feedbackMax) return null;
  if (value.text.trim().length === 0) return null;
  if (!isValidUserId(value.by)) return null;
  if (
    typeof value.at !== 'number' ||
    !Number.isFinite(value.at) ||
    value.at < 0 ||
    value.at > MAX_TIMESTAMP
  ) {
    return null;
  }

  return {
    id: value.id,
    tag: value.tag,
    text: value.text,
    by: value.by,
    bn: normalizeName(value.bn) ?? 'Reviewer',
    at: Math.floor(value.at),
  };
}

function parseSnapshotVote(value: unknown): SnapshotVote | null {
  if (!isRecord(value)) return null;
  if (typeof value.target !== 'string' || !FEEDBACK_ID_RE.test(value.target)) return null;
  if (!isValidUserId(value.by)) return null;
  return { target: value.target, by: value.by, bn: normalizeName(value.bn) ?? 'Reviewer' };
}

/** Strictly validate one event. Accepts a JSON string (as sent over chat) or an object. */
export function parseRoomEvent(input: unknown): RoomEvent | null {
  let value: unknown = input;

  if (typeof value === 'string') {
    if (value.length === 0 || value.length > MAX_EVENT_JSON) return null;
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  if (!isRecord(value) || value.pr !== 1) return null;

  if (value.k === 'fb') {
    if (typeof value.id !== 'string' || !FEEDBACK_ID_RE.test(value.id)) return null;
    if (!isFeedbackTag(value.tag)) return null;
    if (typeof value.text !== 'string') return null;
    if (textLength(value.text) < 1 || textLength(value.text) > LIMITS.feedbackMax) return null;
    if (value.text.trim().length === 0) return null;
    return { pr: 1, k: 'fb', id: value.id, tag: value.tag, text: value.text };
  }

  if (value.k === 'vote') {
    if (typeof value.target !== 'string' || !FEEDBACK_ID_RE.test(value.target)) return null;
    if (typeof value.on !== 'boolean') return null;
    return { pr: 1, k: 'vote', target: value.target, on: value.on };
  }

  if (value.k === 'timer') {
    if (
      typeof value.startAt !== 'number' ||
      !Number.isFinite(value.startAt) ||
      value.startAt < 0 ||
      value.startAt > MAX_TIMESTAMP
    ) {
      return null;
    }
    if (
      typeof value.durSec !== 'number' ||
      !Number.isFinite(value.durSec) ||
      value.durSec < 1 ||
      value.durSec > MAX_TIMER_SECONDS
    ) {
      return null;
    }
    return {
      pr: 1,
      k: 'timer',
      startAt: Math.floor(value.startAt),
      durSec: Math.floor(value.durSec),
    };
  }

  if (value.k === 'sync') {
    if (
      typeof value.at !== 'number' ||
      !Number.isFinite(value.at) ||
      value.at < 0 ||
      value.at > MAX_TIMESTAMP
    ) {
      return null;
    }
    return { pr: 1, k: 'sync', at: Math.floor(value.at) };
  }

  if (value.k === 'state') {
    if (
      typeof value.at !== 'number' ||
      !Number.isFinite(value.at) ||
      value.at < 0 ||
      value.at > MAX_TIMESTAMP
    ) {
      return null;
    }
    if (!Array.isArray(value.fb) || value.fb.length > MAX_SNAPSHOT_FEEDBACK) return null;
    if (!Array.isArray(value.v) || value.v.length > MAX_SNAPSHOT_VOTES) return null;

    const fb: SnapshotFeedback[] = [];
    const seen = new Set<string>();
    for (const raw of value.fb) {
      const item = parseSnapshotFeedback(raw);
      if (!item) return null;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      fb.push(item);
    }

    const v: SnapshotVote[] = [];
    const seenVotes = new Set<string>();
    for (const raw of value.v) {
      const item = parseSnapshotVote(raw);
      if (!item) return null;
      const key = `${item.target}:${item.by}`;
      if (seenVotes.has(key)) continue;
      seenVotes.add(key);
      v.push(item);
    }

    let tm: StateEvent['tm'];
    if (value.tm !== undefined) {
      if (!isRecord(value.tm)) return null;
      const { startAt, durSec } = value.tm;
      if (
        typeof startAt !== 'number' ||
        !Number.isFinite(startAt) ||
        startAt < 0 ||
        startAt > MAX_TIMESTAMP
      ) {
        return null;
      }
      if (typeof durSec !== 'number' || !Number.isFinite(durSec)) return null;
      const seconds = Math.floor(durSec);
      if (seconds < 1 || seconds > MAX_TIMER_SECONDS) return null;
      tm = { startAt: Math.floor(startAt), durSec: seconds };
    }

    const event: StateEvent = {
      pr: 1,
      k: 'state',
      at: Math.floor(value.at),
      fb,
      v,
    };
    if (tm) event.tm = tm;
    if (value.tr === true) event.tr = true;
    if (JSON.stringify(event).length > MAX_SNAPSHOT_CHARS) return null;
    return event;
  }

  return null;
}

export function serializeEvent(event: RoomEvent): string {
  return JSON.stringify(event);
}
