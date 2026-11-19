import { Spinner, TagPill } from '../ui';
import type { FeedbackItem } from '../../lib/reducer';
import type { PendingFeedback } from '../../hooks/useChatRoom';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isoTime(timestamp: number): string | undefined {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '?';
}

export default function FeedbackCard({
  item,
  votes,
  voted,
  onVote,
  disabled = false,
}: {
  item: FeedbackItem;
  votes: number;
  voted: boolean;
  onVote: () => void;
  disabled?: boolean;
}) {
  return (
    <article
      className="rounded-2xl border border-ink-700/80 bg-ink-900 p-4"
      data-testid="feedback-item"
      data-tag={item.tag}
      data-feedback-id={item.id}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-accent-400/30 bg-accent-500/10 text-xs font-semibold text-accent-400"
          aria-hidden="true"
        >
          {initialOf(item.authorName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium text-ink-100" dir="auto">
              {item.authorName}
            </span>
            <time
              className="text-[11px] text-ink-500"
              dateTime={isoTime(item.createdAt)}
            >
              {formatTime(item.createdAt)}
            </time>
            <TagPill tag={item.tag} />
          </div>

          <p
            className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-100"
            dir="auto"
            data-testid="feedback-text"
          >
            {item.text}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onVote}
              disabled={disabled}
              aria-pressed={voted}
              aria-label={`${voted ? 'Remove upvote from' : 'Upvote'} feedback by ${item.authorName}`}
              data-testid="vote-button"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                voted
                  ? 'border-accent-400 bg-accent-500/15 text-accent-400'
                  : 'border-ink-700 bg-ink-950 text-ink-300 hover:border-ink-500 hover:text-ink-100'
              }`}
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M10 16V5m0 0-4.5 4.5M10 5l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="tabular-nums" data-testid="vote-count">
                {votes}
              </span>
              <span>{voted ? 'Upvoted' : 'Upvote'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PendingFeedbackCard({
  item,
  onRetry,
  onRemove,
}: {
  item: PendingFeedback;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const failed = item.status === 'failed';

  return (
    <article
      className={`rounded-2xl border p-4 ${
        failed ? 'border-tag-fix/50 bg-tag-fix/5' : 'border-ink-700/80 bg-ink-900 opacity-80'
      }`}
      data-testid="pending-feedback"
      data-status={item.status}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink-700 bg-ink-950 text-xs font-semibold text-ink-300"
          aria-hidden="true"
        >
          You
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink-100">You</span>
            <TagPill tag={item.event.tag} />
          </div>
          <p
            className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-100"
            dir="auto"
          >
            {item.event.text}
          </p>

          {failed ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-tag-fix">
                Failed to send{item.error ? `: ${item.error}` : '.'}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-full border border-ink-700 px-2.5 py-1 text-xs font-medium text-ink-100 hover:border-ink-500"
                  data-testid="retry-send"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded-full border border-tag-fix/40 px-2.5 py-1 text-xs font-medium text-tag-fix hover:bg-tag-fix/10"
                  data-testid="remove-send"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <Spinner label="Sending…" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
