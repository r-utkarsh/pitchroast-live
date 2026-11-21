import { Avatar, Spinner, TagPill } from '../ui';
import Icon from '../icons';
import type { FeedbackItem } from '../../lib/reducer';
import type { PendingFeedback } from '../../hooks/useChatRoom';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds >= 0 && seconds < 60) return 'just now';
  if (seconds >= 60 && seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isoTime(timestamp: number): string | undefined {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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
      className="flex items-start gap-3 rounded-card border border-ink-800 bg-ink-900 px-3.5 py-3 sm:px-4"
      data-testid="feedback-item"
      data-tag={item.tag}
      data-feedback-id={item.id}
    >
      <Avatar name={item.authorName} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[13px] font-semibold text-ink-100" dir="auto">
            {item.authorName}
          </span>
          <time className="text-xs text-ink-500" dateTime={isoTime(item.createdAt)}>
            {formatTime(item.createdAt)}
          </time>
          <TagPill tag={item.tag} />
        </div>

        <p
          className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink-100"
          dir="auto"
          data-testid="feedback-text"
        >
          {item.text}
        </p>
      </div>

      <button
        type="button"
        onClick={onVote}
        disabled={disabled}
        aria-pressed={voted}
        aria-label={`${voted ? 'Remove upvote from' : 'Upvote'} feedback by ${item.authorName}, ${votes} upvotes`}
        data-testid="vote-button"
        className={`flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:min-w-[52px] sm:w-auto sm:px-2 ${
          voted
            ? 'border-accent-500 bg-accent-500 text-white'
            : 'border-ink-700 bg-ink-950 text-ink-300 hover:border-accent-400 hover:text-ink-100'
        }`}
      >
        <Icon name="chevronUp" className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold leading-none tabular-nums" data-testid="vote-count">
          {votes}
        </span>
      </button>
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
      className={`flex items-start gap-3 rounded-card border px-3.5 py-3 sm:px-4 ${
        failed ? 'border-tag-fix/50 bg-tag-fix/5' : 'border-ink-800 bg-ink-900 opacity-80'
      }`}
      data-testid="pending-feedback"
      data-status={item.status}
    >
      <Avatar name="You" size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-100">You</span>
          <TagPill tag={item.event.tag} />
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink-100" dir="auto">
          {item.event.text}
        </p>

        {failed ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-tag-fix">
              <Icon name="alert" className="h-3.5 w-3.5" />
              Failed to send{item.error ? `: ${item.error}` : '.'}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-700 px-2.5 text-xs font-semibold text-ink-100 hover:border-ink-500"
                data-testid="retry-send"
              >
                <Icon name="refresh" className="h-3 w-3" />
                Retry
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-tag-fix/40 px-2.5 text-xs font-semibold text-tag-fix hover:bg-tag-fix/10"
                data-testid="remove-send"
              >
                <Icon name="x" className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <Spinner label="Sending…" />
          </div>
        )}
      </div>
    </article>
  );
}
