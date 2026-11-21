import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import StatusIndicator from '../components/StatusIndicator';
import Icon from '../components/icons';
import Composer from '../components/room/Composer';
import ExportCard from '../components/room/ExportCard';
import FeedbackCard, { PendingFeedbackCard } from '../components/room/FeedbackCard';
import NameGate from '../components/room/NameGate';
import ProjectCard from '../components/room/ProjectCard';
import ReviewersCard from '../components/room/ReviewersCard';
import {
  Avatar,
  Banner,
  Button,
  FilterChip,
  SkeletonRows,
  TAG_META,
} from '../components/ui';
import useChatRoom, { type UseChatRoomResult } from '../hooks/useChatRoom';
import useIdentity from '../hooks/useIdentity';
import useMediaQuery from '../hooks/useMediaQuery';
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
  onWrite,
}: {
  filter: Filter;
  onShowAll: () => void;
  onWrite: () => void;
}) {
  return (
    <div className="rounded-card border border-dashed border-ink-700 bg-ink-900/40 px-4 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-ink-700 bg-ink-900">
        <Icon name="flame" className="h-5 w-5 text-flame" filled />
      </div>
      <p className="mt-3 text-[15px] font-bold text-ink-100">
        {filter === 'all'
          ? 'No feedback yet. Be the first to roast.'
          : `No ${TAG_META[filter].label} feedback yet.`}
      </p>
      <p className="mt-1 text-xs text-ink-500">
        {filter === 'all'
          ? 'Pick a tag, write one honest line, hit send.'
          : 'Try another tag or show everything.'}
      </p>
      {filter !== 'all' ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onShowAll}>
          Show all feedback
        </Button>
      ) : (
        <Button size="sm" className="mt-4" onClick={onWrite}>
          Write the first roast
        </Button>
      )}
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
  const desktop = useMediaQuery('(min-width: 768px)');

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
  const hasBanners = Boolean(
    room.connectionError || room.notice || actionError || !room.historyAvailable,
  );

  function focusComposer() {
    setFilter('all');
    const composer = document.getElementById('composer-text');
    if (composer instanceof HTMLTextAreaElement) composer.focus();
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader wide>
        <span className="hidden h-8 items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-1.5 pr-3 text-xs text-ink-300 sm:inline-flex">
          <Avatar name={identity.name} size="sm" />
          <span className="max-w-[150px] truncate">Reviewing as {identity.name}</span>
        </span>
        <StatusIndicator status={room.status} />
      </AppHeader>

      <main className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col px-4 py-4 sm:px-8 md:py-5">
        {hasBanners ? (
          <div className="shrink-0 space-y-2 pb-3">
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
        ) : null}

        <div className="shrink-0 pb-3">
          <ProjectCard
            title={payload.t}
            pitch={payload.p}
            url={payload.u}
            roomId={roomId}
            reviewerCount={room.state.reviewers.length}
            isDemo={isDemo}
            copiedLink={copied === 'link'}
            onCopyLink={() => void handleCopyLink()}
            onOpenAnother={handleOpenAnother}
            onDownload={handleDownload}
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_20rem]">
          <section
            className="flex min-h-0 min-w-0 flex-col gap-3"
            aria-label="Live feedback"
            data-testid="room-panel"
            data-ready={room.ready ? 'true' : 'false'}
          >
            {timer || isCreator ? (
              <div
                className={`flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-card border px-3 py-2 ${
                  roastEnded ? 'border-tag-fix/30 bg-tag-fix/10' : 'border-ink-800 bg-ink-900'
                }`}
                data-testid="roast-timer"
              >
                <div className="flex items-center gap-2">
                  <Icon name="clock" className="h-4 w-4 text-ink-500" />
                  <div>
                    <p className="text-xs font-semibold text-ink-100">
                      {roastEnded
                        ? 'Roast ended'
                        : roastActive
                          ? 'Roast round in progress'
                          : 'Ready to roast?'}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {roastEnded
                        ? 'Feedback is locked. Start a new round to keep going.'
                        : roastActive
                          ? 'Add your sharpest notes before the clock runs out.'
                          : 'Start a 5-minute round so reviewers focus on the pitch.'}
                    </p>
                  </div>
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

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div
                className="flex w-full items-center gap-1.5 overflow-x-auto md:w-auto"
                role="group"
                aria-label="Filter feedback"
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
                    icon={TAG_META[tag].icon}
                    testId={`filter-${tag}`}
                  >
                    {TAG_META[tag].label}
                  </FilterChip>
                ))}
              </div>

              <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                <span className="text-xs text-ink-500 md:hidden">
                  {counts.all} {counts.all === 1 ? 'comment' : 'comments'}
                </span>
                <div className="flex items-center gap-4 text-[13px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setTop(false)}
                    aria-pressed={!top}
                    className={`relative pb-1 transition-colors ${
                      !top
                        ? 'text-ink-100 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent-500'
                        : 'text-ink-500 hover:text-ink-300'
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    onClick={() => setTop((value) => !value)}
                    aria-pressed={top}
                    data-testid="sort-toggle"
                    title="Sort by upvotes"
                    className={`relative pb-1 transition-colors ${
                      top
                        ? 'text-ink-100 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent-500'
                        : 'text-ink-500 hover:text-ink-300'
                    }`}
                  >
                    Top feedback
                  </button>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={feedRef}
                onScroll={handleFeedScroll}
                className="h-full overflow-y-auto pr-1"
                data-testid="feedback-list"
                aria-busy={room.historyLoading}
              >
                {showSkeleton ? (
                  <SkeletonRows />
                ) : isEmpty ? (
                  <EmptyState
                    filter={filter}
                    onShowAll={() => setFilter('all')}
                    onWrite={focusComposer}
                  />
                ) : (
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const voted = hasVoted(room.state, item.id, identity.userId);
                      return (
                        <li key={item.id}>
                          <FeedbackCard
                            item={item}
                            votes={voteCount(room.state, item.id)}
                            voted={voted}
                            disabled={!canInteract}
                            onVote={() => void room.toggleVote(item.id, voted)}
                          />
                        </li>
                      );
                    })}
                    {pendingItems.map((item) => (
                      <li key={item.event.id}>
                        <PendingFeedbackCard
                          item={item}
                          onRetry={() => void room.retryFeedback(item.event.id)}
                          onRemove={() => room.removeFailed(item.event.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {newCount > 0 ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <Button
                    size="sm"
                    className="pointer-events-auto rounded-full px-4 shadow-float"
                    data-testid="new-messages"
                    onClick={() => {
                      scrollToBottom(true);
                      setNewCount(0);
                    }}
                  >
                    <Icon name="arrowUp" className="h-3.5 w-3.5" />
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

          {desktop ? (
            <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
              <ReviewersCard reviewers={room.state.reviewers} feedback={room.state.feedback} />
              <ExportCard
                digest={digestText()}
                copiedMarkdown={copied === 'markdown'}
                onCopyMarkdown={() => void handleCopyMarkdown()}
                onDownload={handleDownload}
              />
            </aside>
          ) : null}
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
    return <NameGate title={payload.t} lastName={lastName} onClaim={handleClaim} />;
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
