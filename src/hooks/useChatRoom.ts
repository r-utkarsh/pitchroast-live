import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChatError,
  createChatAdapter,
  type ChatAdapter,
  type ChatMessage,
  type ChatStatus,
} from '../lib/chat';
import {
  buildFeedback,
  buildSyncRequest,
  buildTimer,
  buildVote,
  parseRoomEvent,
  type FeedbackEvent,
  type FeedbackTag,
  type RoomEvent,
} from '../lib/protocol';
import { applyEvent, buildSnapshot, emptyRoomState, type RoomState } from '../lib/reducer';
import type { Identity } from '../lib/session';
import { ROAST_DURATION_SEC } from '../lib/timer';

export interface PendingFeedback {
  event: FeedbackEvent;
  createdAt: number;
  status: 'sending' | 'failed';
  error?: string;
}

export interface ChatNotice {
  tone: 'info' | 'error' | 'success';
  text: string;
}

export type SendOutcome = 'sent' | 'failed' | 'blocked';

export interface UseChatRoomResult {
  state: RoomState;
  status: ChatStatus;
  ready: boolean;
  historyLoading: boolean;
  historyAvailable: boolean;
  connectionError: string | null;
  notice: ChatNotice | null;
  pending: PendingFeedback[];
  sending: boolean;
  sendFeedback: (tag: FeedbackTag, text: string) => Promise<SendOutcome>;
  retryFeedback: (feedbackId: string) => Promise<void>;
  removeFailed: (feedbackId: string) => void;
  toggleVote: (feedbackId: string, currentlyVoted: boolean) => Promise<void>;
  startRoast: () => Promise<void>;
  retryConnect: () => void;
  dismissNotice: () => void;
}

function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof ChatError && error.message.trim()) return error.message;
  return fallback;
}

function cooldownMessage(error: ChatError): string {
  const seconds = Math.max(1, Math.ceil((error.retryAfterMs ?? 1000) / 1000));
  return `Slow down a little — try again in ${seconds}s.`;
}

function localMessage(identity: Identity, text: string): ChatMessage {
  return {
    id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    senderId: identity.userId,
    senderName: identity.name,
    text,
    sentAt: Date.now(),
    isMine: true,
  };
}

/**
 * Wires the Nexconn adapter to the reducer for one room and one identity.
 * All UI-facing room behavior lives here: history, live events, snapshots,
 * optimistic sends, retries and connection status.
 */
export default function useChatRoom(identity: Identity | null, roomId: string): UseChatRoomResult {
  const [state, setState] = useState<RoomState>(emptyRoomState);
  const stateRef = useRef<RoomState>(state);

  const [status, setStatus] = useState<ChatStatus>('idle');
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<ChatNotice | null>(null);
  const [pending, setPending] = useState<PendingFeedback[]>([]);
  const pendingRef = useRef<PendingFeedback[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const kickedRetriedRef = useRef(false);
  const autoRetriedRef = useRef(false);
  const autoRetryTimerRef = useRef<number | null>(null);

  const clearAutoRetry = useCallback(() => {
    if (autoRetryTimerRef.current !== null) {
      window.clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
  }, []);

  const adapterRef = useRef<ChatAdapter | null>(null);
  const ingestRef = useRef<(event: RoomEvent, message: ChatMessage) => void>(() => undefined);
  const replyTimerRef = useRef<number | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  const updatePending = useCallback(
    (updater: (list: PendingFeedback[]) => PendingFeedback[]) => {
      setPending((current) => {
        const next = updater(current);
        pendingRef.current = next;
        return next;
      });
    },
    [],
  );

  const ingest = useCallback(
    (event: RoomEvent, message: ChatMessage) => {
      const next = applyEvent(stateRef.current, {
        event,
        senderId: message.senderId,
        senderName: message.senderName,
        sentAt: message.sentAt,
      });
      stateRef.current = next;
      setState(next);

      if (event.k === 'fb') {
        updatePending((list) =>
          list.some((item) => item.event.id === event.id)
            ? list.filter((item) => item.event.id !== event.id)
            : list,
        );
      }
    },
    [updatePending],
  );

  useEffect(() => {
    ingestRef.current = ingest;
  }, [ingest]);

  useEffect(() => {
    if (!identity || !roomId) return;

    const sessionKey = `${roomId}:${identity.userId}`;
    if (sessionKeyRef.current !== sessionKey) {
      sessionKeyRef.current = sessionKey;
      const fresh = emptyRoomState();
      stateRef.current = fresh;
      setState(fresh);
      pendingRef.current = [];
      setPending([]);
      sendingRef.current = false;
      setSending(false);
      setNotice(null);
      setHistoryAvailable(true);
      kickedRetriedRef.current = false;
      autoRetriedRef.current = false;
      if (autoRetryTimerRef.current !== null) {
        window.clearTimeout(autoRetryTimerRef.current);
        autoRetryTimerRef.current = null;
      }
    }

    const adapter = createChatAdapter();
    adapterRef.current = adapter;
    let cancelled = false;

    setStatus('connecting');
    setConnectionError(null);
    setHistoryAvailable(true);
    setHistoryLoading(true);
    readyRef.current = false;
    setReady(false);

    const scheduleSnapshot = () => {
      if (replyTimerRef.current !== null) return;
      replyTimerRef.current = window.setTimeout(() => {
        replyTimerRef.current = null;
        if (cancelled || !readyRef.current) return;
        const snapshot = buildSnapshot(stateRef.current);
        if (!snapshot) return;
        void adapter.send(snapshot).catch(() => undefined);
      }, 250);
    };

    const unsubscribeStatus = adapter.onStatus((nextStatus) => {
      if (cancelled) return;
      setStatus(nextStatus === 'idle' ? 'connecting' : nextStatus);

      if (nextStatus === 'connected') {
        clearAutoRetry();
        setConnectionError(null);
      } else if (nextStatus === 'reconnecting') {
        setConnectionError('Reconnecting…');
      } else if (nextStatus === 'disconnected' && readyRef.current) {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (offline) {
          setConnectionError('You are offline. Reconnecting when you are back…');
        } else if (!autoRetriedRef.current) {
          // A stale token also surfaces as a disconnect. Refresh the session once
          // (new adapter, new token) before asking the reviewer to retry.
          autoRetriedRef.current = true;
          setConnectionError('Connection lost. Refreshing the chat session…');
          autoRetryTimerRef.current = window.setTimeout(() => {
            autoRetryTimerRef.current = null;
            if (cancelled) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            setReconnectNonce((value) => value + 1);
          }, 8_000);
        } else {
          setConnectionError('Connection lost. Retry the connection.');
        }
      } else if (nextStatus === 'kicked') {
        if (!kickedRetriedRef.current) {
          kickedRetriedRef.current = true;
          setConnectionError('Your chat session ended. Reconnecting once…');
          setReconnectNonce((value) => value + 1);
        } else {
          setConnectionError('Your chat session ended. Retry the connection.');
        }
      }
    });

    const unsubscribeMessage = adapter.onMessage((message) => {
      if (cancelled) return;
      const event = parseRoomEvent(message.text);
      if (!event) return;

      ingestRef.current(event, message);

      if (event.k === 'sync' && message.senderId !== identity.userId) {
        scheduleSnapshot();
      }
    });

    void (async () => {
      try {
        await adapter.connect(identity);
        if (cancelled) return;

        await adapter.join(roomId);
        if (cancelled) return;

        try {
          const history = await adapter.history();
          if (cancelled) return;
          for (const message of [...history].sort((a, b) => a.sentAt - b.sentAt)) {
            const event = parseRoomEvent(message.text);
            if (event) ingestRef.current(event, message);
          }
          setHistoryAvailable(true);
        } catch {
          if (cancelled) return;
          setHistoryAvailable(false);
        }

        if (cancelled) return;
        readyRef.current = true;
        setReady(true);

        // Group history starts at the viewer's join time. Ask any online member
        // for a snapshot so feedback from before this join is backfilled.
        void adapter.send(buildSyncRequest()).catch(() => undefined);
      } catch (error) {
        if (cancelled) return;
        setStatus('failed');
        setConnectionError(
          friendlyError(error, 'Could not connect to the room. Check your connection and retry.'),
        );
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      clearAutoRetry();
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
        replyTimerRef.current = null;
      }
      unsubscribeMessage();
      unsubscribeStatus();
      if (adapterRef.current === adapter) adapterRef.current = null;
      void adapter.disconnect();
    };
  }, [clearAutoRetry, identity, roomId, reconnectNonce]);

  useEffect(() => {
    const handleOffline = () => {
      clearAutoRetry();
      setConnectionError('You are offline. Reconnecting when you are back…');
    };
    const handleOnline = () => {
      setConnectionError((current) =>
        current?.startsWith('You are offline') ? null : current,
      );
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [clearAutoRetry]);

  const sendFeedback = useCallback(
    async (tag: FeedbackTag, text: string): Promise<SendOutcome> => {
      const event = buildFeedback(tag, text);
      if (!event) {
        setNotice({ tone: 'error', text: 'Feedback must be between 1 and 500 characters.' });
        return 'blocked';
      }
      if (sendingRef.current) return 'blocked';

      const adapter = adapterRef.current;
      if (!adapter || !readyRef.current) {
        setNotice({ tone: 'info', text: 'Still connecting. Try again in a moment.' });
        return 'blocked';
      }

      sendingRef.current = true;
      setSending(true);
      setNotice(null);
      updatePending((list) => [
        ...list,
        { event, createdAt: Date.now(), status: 'sending' },
      ]);

      try {
        const message = await adapter.send(event);
        if (adapterRef.current !== adapter) return 'blocked';
        updatePending((list) => list.filter((item) => item.event.id !== event.id));
        ingestRef.current(event, message);
        return 'sent';
      } catch (error) {
        if (adapterRef.current !== adapter) return 'blocked';
        if (error instanceof ChatError && error.code === 'cooldown') {
          updatePending((list) => list.filter((item) => item.event.id !== event.id));
          setNotice({ tone: 'error', text: cooldownMessage(error) });
          return 'blocked';
        }

        updatePending((list) =>
          list.map((item) =>
            item.event.id === event.id
              ? {
                  ...item,
                  status: 'failed',
                  error: friendlyError(error, 'Message failed to send. Please retry.'),
                }
              : item,
          ),
        );
        return 'failed';
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [updatePending],
  );

  const retryFeedback = useCallback(
    async (feedbackId: string) => {
      const item = pendingRef.current.find((entry) => entry.event.id === feedbackId);
      if (!item || item.status !== 'failed') return;

      const adapter = adapterRef.current;
      if (!adapter || !readyRef.current) {
        setNotice({ tone: 'info', text: 'Still connecting. Try again in a moment.' });
        return;
      }

      updatePending((list) =>
        list.map((entry) =>
          entry.event.id === feedbackId
            ? { ...entry, status: 'sending', error: undefined }
            : entry,
        ),
      );

      try {
        const message = await adapter.send(item.event);
        if (adapterRef.current !== adapter) return;
        updatePending((list) => list.filter((entry) => entry.event.id !== feedbackId));
        ingestRef.current(item.event, message);
      } catch (error) {
        if (adapterRef.current !== adapter) return;
        if (error instanceof ChatError && error.code === 'cooldown') {
          setNotice({ tone: 'error', text: cooldownMessage(error) });
        }
        updatePending((list) =>
          list.map((entry) =>
            entry.event.id === feedbackId
              ? {
                  ...entry,
                  status: 'failed',
                  error: friendlyError(error, 'Message failed to send. Please retry.'),
                }
              : entry,
          ),
        );
      }
    },
    [updatePending],
  );

  const removeFailed = useCallback(
    (feedbackId: string) => {
      updatePending((list) => list.filter((entry) => entry.event.id !== feedbackId));
    },
    [updatePending],
  );

  const toggleVote = useCallback(
    async (feedbackId: string, currentlyVoted: boolean) => {
      if (!identity) return;

      const adapter = adapterRef.current;
      if (!adapter || !readyRef.current) {
        setNotice({ tone: 'info', text: 'Still connecting. Try again in a moment.' });
        return;
      }

      const event = buildVote(feedbackId, !currentlyVoted);
      if (!event) return;

      ingestRef.current(event, localMessage(identity, JSON.stringify(event)));

      try {
        await adapter.send(event);
      } catch (error) {
        if (adapterRef.current !== adapter) return;
        const revert = buildVote(feedbackId, currentlyVoted);
        if (revert) ingestRef.current(revert, localMessage(identity, JSON.stringify(revert)));

        if (error instanceof ChatError && error.code === 'cooldown') {
          setNotice({ tone: 'error', text: cooldownMessage(error) });
        } else {
          setNotice({ tone: 'error', text: 'Your vote did not send. Please retry.' });
        }
      }
    },
    [identity],
  );

  const startRoast = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (!adapter || !readyRef.current) {
      setNotice({ tone: 'info', text: 'Still connecting. Try again in a moment.' });
      return;
    }

    const event = buildTimer(Date.now(), ROAST_DURATION_SEC);
    if (!event) return;

    try {
      const message = await adapter.send(event);
      if (adapterRef.current !== adapter) return;
      ingestRef.current(event, message);
    } catch (error) {
      if (adapterRef.current !== adapter) return;
      setNotice({
        tone: 'error',
        text:
          error instanceof ChatError && error.code === 'cooldown'
            ? cooldownMessage(error)
            : 'The roast timer did not start. Please retry.',
      });
    }
  }, []);

  const retryConnect = useCallback(() => {
    kickedRetriedRef.current = false;
    autoRetriedRef.current = false;
    clearAutoRetry();
    setConnectionError(null);
    setNotice(null);
    setReconnectNonce((value) => value + 1);
  }, [clearAutoRetry]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    state,
    status,
    ready,
    historyLoading,
    historyAvailable,
    connectionError,
    notice,
    pending,
    sending,
    sendFeedback,
    retryFeedback,
    removeFailed,
    toggleVote,
    startRoast,
    retryConnect,
    dismissNotice,
  };
}
