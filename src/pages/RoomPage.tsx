import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import StatusIndicator from '../components/StatusIndicator';
import Composer from '../components/room/Composer';
import FeedbackCard, { PendingFeedbackCard } from '../components/room/FeedbackCard';
import NameGate from '../components/room/NameGate';
import ProjectCard from '../components/room/ProjectCard';
import {
  Banner,
  Button,
  FilterChip,
  SkeletonRows,
  TAG_META,
} from '../components/ui';
import useChatRoom, { type UseChatRoomResult } from '../hooks/useChatRoom';
import useIdentity from '../hooks/useIdentity';
import { buildDigest } from '../lib/digest';
import { FEEDBACK_TAGS, type FeedbackTag } from '../lib/protocol';
import { hasVoted, voteCount, type RoomState } from '../lib/reducer';
import { addRecentRoom, isRoomCreator, type Identity } from '../lib/session';
import { formatCountdown, roastRemainingMs } from '../lib/timer';
import {
  buildRoomPath,
  decodeRoomPayload,
  isValidRoomId,
  type RoomPayload,
} from '../lib/validation';
import BrokenRoomPage from './BrokenRoomPage';

const BASE_TITLE = 'PitchRoast Live — live feedback for your pitch';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the hidden-textarea fallback.
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

type Filter = 'all' | FeedbackTag;

function filterCounts(state: RoomState): Record<Filter, number> {
  const counts: Record<Filter, number> = {
    all: state.feedback.length,
    hook: 0,
    clarity: 0,
    fix: 0,
  };
  for (const item of state.feedback) counts[item.tag] += 1;
  return counts;
}

function EmptyState({
  filter,
  onShowAll,
}: {
  filter: Filter;
  onShowAll: () => void;
}) {
  return (
    <div className="grid h-full min-h-[15rem] place-items-center px-4 py-10 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-ink-700 bg-ink-950">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent-400" aria-hidden="true">
            <path
              d="M12 3c2.6 3.3 4.5 5.2 4.5 8.2a4.5 4.5 0 0 1-9 0c0-1.5.7-2.6 1.9-4.1.4 1.5 1.1 2.2 1.9 2.6-.4-2.6 0-4.5.7-6.7Z"
              fill="currentColor"
            />
            <path
              d="M6 20h12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-ink-100">
          {filter === 'all'
            ? 'No feedback yet. Be the first to roast.'
            : `No ${TAG_META[filter].label} feedback yet.`}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Pick a tag, then leave one sharp note.
        </p>
        {filter !== 'all' ? (
          <Button variant="secondary" size="sm" className="mt-4" onClick={onShowAll}>
            Show all feedback
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RoomScreen({
  roomId,
  encoded,
  payload,
  identity,
  isCreator,
  room,
}: {
  roomId: string;
  encoded: string;
  payload: RoomPayload;
  identity: Identity;
  isCreator: boolean;
  room: UseChatRoomResult;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [top, setTop] = useState(false);
  const [copied, setCopied] = useState<'link' | 'markdown' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const feedRef = useRef<HTMLDivElement>(null);
  const lastTotalRef = useRef(0);
  const copiedTimerRef = useRef<number | null>(null);

  const counts = useMemo(() => filterCounts(room.state), [room.state]);

  const timer = room.state.timer;
  const remainingMs = roastRemainingMs(timer, now);
  const roastEnded = timer !== null && remainingMs === 0;
  const roastActive = timer !== null && !roastEnded;

  const items = useMemo(
    () =>
      room.state.feedback
        .filter((item) => filter === 'all' || item.tag === filter)
        .slice()
        .sort((a, b) => {
          if (!top) return a.createdAt - b.createdAt;
          const diff = voteCount(room.state, b.id) - voteCount(room.state, a.id);
          return diff !== 0 ? diff : a.createdAt - b.createdAt;
        }),
    [filter, room.state, top],
  );

  const pendingItems = useMemo(
    () => room.pending.filter((item) => filter === 'all' || item.event.tag === filter),
    [filter, room.pending],
  );

  const showSkeleton =
    room.state.feedback.length === 0 &&
    (room.historyLoading ||
      (!room.ready && room.status !== 'failed' && room.status !== 'kicked'));
  const isEmpty = items.length === 0 && pendingItems.length === 0;
  const canInteract = room.ready && room.status === 'connected';

  const roomUrl = `${window.location.origin}${buildRoomPath(roomId, encoded)}`;
  const isDemo = roomId.startsWith('demo-');

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!timer) return;
    setNow(Date.now());
    if (roastEnded) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer, roastEnded]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }
      const composer = document.getElementById('composer-text');
      if (composer instanceof HTMLTextAreaElement && !composer.disabled) {
        event.preventDefault();
        composer.focus();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  function flashCopied(kind: 'link' | 'markdown') {
    setCopied(kind);
    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => {
      copiedTimerRef.current = null;
      setCopied(null);
    }, 2000);
  }

  function scrollToBottom(smooth: boolean) {
    const element = feedRef.current;
    if (!element) return;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
    });
  }

  useEffect(() => {
    const total = room.state.feedback.length;
    const previous = lastTotalRef.current;
    lastTotalRef.current = total;

    if (total > previous) {
      if (nearBottom) {
        scrollToBottom(previous !== 0);
        setNewCount(0);
      } else {
        setNewCount((count) => count + (total - previous));
      }
    }
  }, [room.state.feedback.length, nearBottom]);

  function handleFeedScroll() {
    const element = feedRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const near = distance < 80;
    setNearBottom(near);
    if (near) setNewCount(0);
  }

  function digestText(): string {
    return buildDigest({
      title: payload.t,
      pitch: payload.p,
      url: payload.u,
      state: room.state,
    });
  }

  async function handleCopyLink() {
    setActionError(null);
    const ok = await copyText(roomUrl);
    if (ok) {
      flashCopied('link');
    } else {
      setActionError('Copy is unavailable in this browser. Select the room URL and copy it manually.');
    }
  }

  async function handleCopyMarkdown() {
    setActionError(null);
    const ok = await copyText(digestText());
    if (ok) {
      flashCopied('markdown');
    } else {
      setActionError('Copy is unavailable in this browser. Use "Download .md" instead.');
    }
  }

  function handleDownload() {
    setActionError(null);
    try {
      const blob = new Blob([digestText()], { type: 'text/markdown;charset=utf-8' });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `pitchroast-${roomId}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch {
      setActionError('The Markdown file could not be downloaded in this browser.');
    }
  }

  function handleOpenAnother() {
    const url = new URL(roomUrl);
    url.searchParams.set('as', 'new');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  const connectionTone =
    room.status === 'failed' || room.status === 'kicked' || room.status === 'disconnected'
      ? 'error'
      : 'info';
  const canRetry =
    room.status === 'failed' || room.status === 'kicked' || room.status === 'disconnected';
  const hasBanners = Boolean(room.connectionError || room.notice || actionError || !room.historyAvailable);

  return (
    <div className="min-h-screen">
      <AppHeader>
        <StatusIndicator status={room.status} />
      </AppHeader>

      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:py-6">
        <div className="space-y-2">
          {room.connectionError ? (
            <Banner
              tone={connectionTone}
              action={
                canRetry ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={room.retryConnect}
                    data-testid="retry-connect"
                  >
                    Retry
                  </Button>
                ) : undefined
              }
            >
              {room.connectionError}
            </Banner>
          ) : null}

          {!room.historyAvailable ? (
            <Banner tone="info">
              Earlier messages are not available in this room, but new feedback will appear
              live.
            </Banner>
          ) : null}

          {room.notice ? (
            <Banner
              tone={room.notice.tone}
              action={
                <Button variant="ghost" size="sm" onClick={room.dismissNotice}>
                  Dismiss
                </Button>
              }
            >
              {room.notice.text}
            </Banner>
          ) : null}

          {actionError ? (
            <Banner
              tone="error"
              action={
                <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
                  Dismiss
                </Button>
              }
            >
              {actionError}
            </Banner>
          ) : null}
        </div>

        <div
          className={`grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6 ${
            hasBanners ? 'mt-4' : ''
          }`}
        >
          <ProjectCard
            title={payload.t}
            pitch={payload.p}
            url={payload.u}
            roomId={roomId}
            createdAt={payload.c}
            commentCount={room.state.feedback.length}
            reviewerCount={room.state.reviewers.length}
            isDemo={isDemo}
            copiedLink={copied === 'link'}
            copiedMarkdown={copied === 'markdown'}
            onCopyLink={() => void handleCopyLink()}
            onOpenAnother={handleOpenAnother}
            onCopyMarkdown={() => void handleCopyMarkdown()}
            onDownload={handleDownload}
          />

          <section
            className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900 lg:h-[calc(100vh-7.5rem)]"
            aria-label="Live feedback"
            data-testid="room-panel"
            data-ready={room.ready ? 'true' : 'false'}
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-ink-100">Live feedback</h2>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {counts.all} {counts.all === 1 ? 'comment' : 'comments'} ·{' '}
                  {room.state.reviewers.length}{' '}
                  {room.state.reviewers.length === 1 ? 'reviewer' : 'reviewers'}
                </p>
              </div>
            </header>

            {timer || isCreator ? (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 ${
                  roastEnded
                    ? 'border-tag-fix/30 bg-tag-fix/10'
                    : 'border-ink-800 bg-ink-950/40'
                }`}
                data-testid="roast-timer"
              >
                <div>
                  <p className="text-xs font-semibold text-ink-100">
                    {roastEnded
                      ? 'Roast ended'
                      : roastActive
                        ? 'Roast round in progress'
                        : 'Ready to roast?'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {roastEnded
                      ? 'Feedback is locked. Start a new round to keep going.'
                      : roastActive
                        ? 'Add your sharpest notes before the clock runs out.'
                        : 'Start a 5-minute round so reviewers focus on the pitch.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {roastActive ? (
                    <span
                      role="timer"
                      aria-label={`${formatCountdown(remainingMs ?? 0)} remaining`}
                      className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 font-mono text-sm tabular-nums text-accent-300"
                      data-testid="roast-countdown"
                    >
                      {formatCountdown(remainingMs ?? 0)}
                    </span>
                  ) : null}
                  {isCreator && (roastEnded || !timer) ? (
                    <Button
                      size="sm"
                      variant={roastEnded ? 'primary' : 'secondary'}
                      onClick={() => void room.startRoast()}
                      disabled={!canInteract}
                      data-testid="start-roast"
                    >
                      {timer ? 'Start new round' : 'Start 5-min roast'}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div
              className="flex flex-wrap items-center gap-2 border-b border-ink-800 px-4 py-2"
              role="group"
              aria-label="Filter and sort feedback"
            >
              <FilterChip
                selected={filter === 'all'}
                onClick={() => setFilter('all')}
                count={counts.all}
                testId="filter-all"
              >
                All
              </FilterChip>
              {FEEDBACK_TAGS.map((tag) => (
                <FilterChip
                  key={tag}
                  selected={filter === tag}
                  onClick={() => setFilter(tag)}
                  count={counts[tag]}
                  testId={`filter-${tag}`}
                >
                  {TAG_META[tag].label}
                </FilterChip>
              ))}
              <FilterChip
                selected={top}
                onClick={() => setTop((value) => !value)}
                testId="sort-toggle"
              >
                Top feedback
              </FilterChip>
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={feedRef}
                onScroll={handleFeedScroll}
                className="max-h-[55vh] overflow-y-auto p-3 sm:p-4 lg:h-full lg:max-h-none"
                data-testid="feedback-list"
                aria-busy={room.historyLoading}
              >
                {showSkeleton ? (
                  <SkeletonRows />
                ) : isEmpty ? (
                  <EmptyState filter={filter} onShowAll={() => setFilter('all')} />
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const voted = hasVoted(room.state, item.id, identity.userId);
                      return (
                        <FeedbackCard
                          key={item.id}
                          item={item}
                          votes={voteCount(room.state, item.id)}
                          voted={voted}
                          disabled={!canInteract}
                          onVote={() => void room.toggleVote(item.id, voted)}
                        />
                      );
                    })}
                    {pendingItems.map((item) => (
                      <PendingFeedbackCard
                        key={item.event.id}
                        item={item}
                        onRetry={() => void room.retryFeedback(item.event.id)}
                        onRemove={() => room.removeFailed(item.event.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {newCount > 0 ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <Button
                    size="sm"
                    className="pointer-events-auto shadow-lg"
                    data-testid="new-messages"
                    onClick={() => {
                      scrollToBottom(true);
                      setNewCount(0);
                    }}
                  >
                    {newCount} new {newCount === 1 ? 'message' : 'messages'}
                  </Button>
                </div>
              ) : null}
            </div>

            <Composer
              ready={canInteract}
              sending={room.sending}
              locked={roastEnded}
              onSend={room.sendFeedback}
            />
          </section>
        </div>

        <p className="sr-only" aria-live="polite">
          {newCount > 0 ? `${newCount} new messages` : ''}
        </p>
      </main>
    </div>
  );
}

export default function RoomPage() {
  const { roomId: roomIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const validRoomId = typeof roomIdParam === 'string' && isValidRoomId(roomIdParam);
  const roomId = validRoomId ? (roomIdParam as string) : '';
  const encoded = searchParams.get('d');
  const payload = useMemo(() => decodeRoomPayload(encoded), [encoded]);
  const forceNew = searchParams.get('as') === 'new';

  const { identity, lastName, claim } = useIdentity({ forceNew });
  const room = useChatRoom(identity, roomId);

  useEffect(() => {
    document.title = payload ? `PitchRoast Live — ${payload.t}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [payload]);

  useEffect(() => {
    if (!validRoomId || !payload || !encoded) return;
    addRecentRoom({ roomId, title: payload.t, payload: encoded });
  }, [validRoomId, payload, encoded, roomId]);

  if (!validRoomId || !payload || !encoded) {
    return <BrokenRoomPage />;
  }

  function handleClaim(name: string) {
    const result = claim(name);
    if (result.ok && forceNew) {
      const next = new URLSearchParams(searchParams);
      next.delete('as');
      navigate({ pathname: `/r/${roomId}`, search: next.toString() }, { replace: true });
    }
    return result;
  }

  if (!identity) {
    return (
      <NameGate title={payload.t} lastName={lastName} onClaim={handleClaim} />
    );
  }

  return (
    <RoomScreen
      key={`${roomId}:${identity.userId}`}
      roomId={roomId}
      encoded={encoded}
      payload={payload}
      identity={identity}
      isCreator={isRoomCreator(roomId)}
      room={room}
    />
  );
}
