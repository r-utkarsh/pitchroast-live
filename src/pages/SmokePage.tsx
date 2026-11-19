import { useEffect, useRef, useState } from 'react';
import { createChatAdapter, type ChatAdapter, type ChatMessage, type ChatStatus } from '../lib/chat';
import {
  buildFeedback,
  buildSyncRequest,
  parseRoomEvent,
  type RoomEvent,
} from '../lib/protocol';
import {
  applyEvent,
  buildSnapshot,
  emptyRoomState,
  voteCount,
  type RoomState,
} from '../lib/reducer';
import { readIdentity, writeIdentity, type Identity } from '../lib/session';
import { generateUserId, isValidRoomId, normalizeName } from '../lib/validation';

const TAG_LABEL: Record<string, string> = {
  hook: 'Hook',
  clarity: 'Clarity',
  fix: 'Fix',
};

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => a.sentAt - b.sentAt);
}

export default function SmokePage() {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  const nameParam = params.get('name');

  const [identity] = useState<Identity>(() => {
    const existing = readIdentity();
    const fallbackName = normalizeName(nameParam ?? '') ?? 'Smoke Reviewer';
    const next = existing ?? { userId: generateUserId(), name: fallbackName };
    writeIdentity(next);
    return next;
  });

  const roomId = roomParam && isValidRoomId(roomParam) ? roomParam : '';
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [state, setState] = useState<RoomState>(emptyRoomState);
  const stateRef = useRef<RoomState>(state);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adapterRef = useRef<ChatAdapter | null>(null);
  const replyTimerRef = useRef<number | null>(null);
  const lastReplyAtRef = useRef(0);

  useEffect(() => {
    if (!roomId) return;
    const adapter = createChatAdapter();
    adapterRef.current = adapter;
    let cancelled = false;

    const ingest = (event: RoomEvent, message: ChatMessage) => {
      if (cancelled) return;
      const next = applyEvent(stateRef.current, {
        event,
        senderId: message.senderId,
        senderName: message.senderName,
        sentAt: message.sentAt,
      });
      stateRef.current = next;
      setState(next);
    };

    const replyWithSnapshot = () => {
      const now = Date.now();
      if (now - lastReplyAtRef.current < 1000) return;
      lastReplyAtRef.current = now;

      if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = window.setTimeout(() => {
        replyTimerRef.current = null;
        if (cancelled) return;
        const snapshot = buildSnapshot(stateRef.current);
        if (!snapshot) return;
        void adapterRef.current?.send(snapshot).catch(() => undefined);
      }, 150 + Math.floor(Math.random() * 300));
    };

    const unsubscribeMessage = adapter.onMessage((message) => {
      const event = parseRoomEvent(message.text);
      if (!event) return;
      ingest(event, message);
      if (event.k === 'sync' && message.senderId !== identity.userId) {
        replyWithSnapshot();
      }
    });

    const unsubscribeStatus = adapter.onStatus((next) => {
      if (!cancelled) setStatus(next);
    });

    void (async () => {
      try {
        await adapter.connect(identity);
        await adapter.join(roomId);
        const history = await adapter.history();
        if (cancelled) return;
        for (const message of sortMessages(history)) {
          const event = parseRoomEvent(message.text);
          if (event) ingest(event, message);
        }
        setReady(true);
        void adapter.send(buildSyncRequest()).catch(() => undefined);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      }
    })();

    return () => {
      cancelled = true;
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
        replyTimerRef.current = null;
      }
      unsubscribeMessage();
      unsubscribeStatus();
      adapterRef.current = null;
      void adapter.disconnect();
    };
  }, [identity, roomId]);

  async function handleSend() {
    const adapter = adapterRef.current;
    if (!adapter || sending) return;
    const event = buildFeedback('hook', draft);
    if (!event) {
      setError('Enter between 1 and 500 characters.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      const message = await adapter.send(event);
      if (!stateRef.current.feedback.some((item) => item.id === event.id)) {
        const next = applyEvent(stateRef.current, {
          event,
          senderId: message.senderId,
          senderName: message.senderName,
          sentAt: message.sentAt,
        });
        stateRef.current = next;
        setState(next);
      }
      setDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">PitchRoast smoke room</h1>
        <p className="text-sm text-ink-300">
          Room <code className="text-accent-400">{roomId || 'invalid'}</code> · You are {identity.name}
        </p>
        <p className="text-sm">
          Status: <span data-testid="smoke-status">{status}</span>
          {ready ? <span data-testid="smoke-ready"> · ready</span> : null}
        </p>
        {error ? (
          <p className="text-sm text-tag-fix" data-testid="smoke-error">
            {error}
          </p>
        ) : null}
      </header>

      <section className="space-y-2" aria-label="Feedback">
        {state.feedback.length === 0 ? (
          <p className="text-sm text-ink-300">No feedback yet.</p>
        ) : (
          state.feedback.map((item) => (
            <article
              key={item.id}
              data-testid="smoke-message"
              className="rounded-xl border border-ink-700 bg-ink-900 p-3"
            >
              <p className="text-xs text-ink-300">
                {item.authorName} · {TAG_LABEL[item.tag] ?? item.tag} ·{' '}
                {new Date(item.createdAt).toLocaleTimeString()} · {voteCount(state, item.id)} votes
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{item.text}</p>
            </article>
          ))
        )}
      </section>

      <section className="space-y-2">
        <label className="block text-sm" htmlFor="smoke-text">
          Feedback
        </label>
        <textarea
          id="smoke-text"
          data-testid="smoke-text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-ink-700 bg-ink-900 p-3 text-sm"
        />
        <button
          type="button"
          data-testid="smoke-send"
          onClick={() => void handleSend()}
          disabled={!ready || sending || draft.trim().length === 0}
          className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send feedback'}
        </button>
      </section>
    </main>
  );
}
