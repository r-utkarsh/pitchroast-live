import {
  AreaCode,
  BaseChannel,
  ConnectionStatusHandler,
  GroupChannel,
  MessageHandler,
  NCEngine,
  SendTextMessageParams,
} from '@nexconn/chat';
import { SEND_LIMIT, SEND_WINDOW_MS, takeSendSlot } from './cooldown';
import { parseRoomEvent, serializeEvent, type RoomEvent } from './protocol';
import { channelIdForRoom, isValidRoomId, isValidUserId, normalizeName } from './validation';

export type ChatStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'kicked'
  | 'failed';

export type ChatErrorCode =
  | 'not-configured'
  | 'not-ready'
  | 'token'
  | 'join'
  | 'connect'
  | 'send'
  | 'history'
  | 'cooldown';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly retryAfterMs: number | undefined;

  constructor(code: ChatErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface ChatIdentity {
  userId: string;
  name: string;
}

export interface ChatMessage {
  /** Nexconn message ID (stable across history and live delivery). */
  id: string;
  senderId: string;
  senderName: string;
  /** Raw text content; parse it with parseRoomEvent. */
  text: string;
  sentAt: number;
  isMine: boolean;
}

export type Unsubscribe = () => void;

export interface ChatAdapter {
  connect(identity: ChatIdentity): Promise<void>;
  join(roomId: string): Promise<void>;
  send(event: RoomEvent): Promise<ChatMessage>;
  history(pageSize?: number): Promise<ChatMessage[]>;
  onMessage(handler: (message: ChatMessage) => void): Unsubscribe;
  onStatus(handler: (status: ChatStatus) => void): Unsubscribe;
  disconnect(): Promise<void>;
}

interface SdkMessageLike {
  messageId?: string;
  senderUserId?: string;
  sentTime?: number;
  content?: {
    text?: unknown;
    senderUserInfo?: { name?: unknown };
  };
  channelIdentifier?: { channelId?: string };
}

const TOKEN_ATTEMPTS = 3;
const HISTORY_PAGES = 5;
const KICKED_CODE = 31010;

let sdkInitialized = false;
let adapterSequence = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function initializeSdk(): void {
  if (sdkInitialized) return;
  const appKey = (import.meta.env.VITE_NEXCONN_APP_KEY as string | undefined)?.trim();
  if (!appKey) {
    throw new ChatError('not-configured', 'Chat is not configured: the App Key is missing.');
  }
  NCEngine.initialize({ appKey, areaCode: AreaCode.SG });
  sdkInitialized = true;
}

function readToken(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const token = (data as Record<string, unknown>).token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

async function requestToken(identity: ChatIdentity): Promise<string> {
  let message = 'Could not get a chat token. Check your connection and retry.';

  for (let attempt = 0; attempt < TOKEN_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: identity.userId, name: identity.name }),
      });
      const data: unknown = await response.json().catch(() => null);
      const token = readToken(data);
      if (response.ok && token) return token;
      message =
        response.status === 429
          ? 'Too many connection attempts. Wait a moment and retry.'
          : 'Could not get a chat token. Check your connection and retry.';
    } catch {
      message = 'Network error while getting a chat token. Check your connection and retry.';
    }

    if (attempt < TOKEN_ATTEMPTS - 1) {
      await delay(400 * 2 ** attempt + Math.floor(Math.random() * 150));
    }
  }

  throw new ChatError('token', message);
}

async function requestJoin(userId: string, roomId: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roomId }),
    });
  } catch {
    throw new ChatError('join', 'Network error while joining the room. Please retry.');
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ChatError('join', 'Could not join this room. Please retry.');
  }

  if (typeof data === 'object' && data !== null) {
    const channelId = (data as Record<string, unknown>).channelId;
    if (typeof channelId === 'string' && channelId.length > 0) return channelId;
  }
  return channelIdForRoom(roomId);
}

class NexconnChatAdapter implements ChatAdapter {
  private identity: ChatIdentity | null = null;
  private channel: GroupChannel | null = null;
  private channelId: string | null = null;
  private status: ChatStatus = 'idle';
  private everConnected = false;
  private statusHandlers = new Set<(status: ChatStatus) => void>();
  private messageHandlers = new Set<(message: ChatMessage) => void>();
  private nameCache = new Map<string, string>();
  private sendTimestamps: number[] = [];
  private statusHandlerId: string | null = null;
  private messageHandlerId: string | null = null;
  private connecting: Promise<void> | null = null;

  async connect(identity: ChatIdentity): Promise<void> {
    const name = normalizeName(identity.name);
    if (!isValidUserId(identity.userId) || !name) {
      throw new ChatError('not-ready', 'Invalid reviewer identity.');
    }

    if (this.status === 'connected' && this.identity?.userId === identity.userId) return;
    if (this.connecting) return this.connecting;

    this.identity = { userId: identity.userId, name };
    this.setStatus('connecting');

    this.connecting = (async () => {
      const token = await requestToken(this.identity as ChatIdentity);
      initializeSdk();
      this.registerHandlers();

      const result = await NCEngine.connect({ token });
      if (!result.isOk) {
        console.warn('[chat] connect failed with code', result.code);
        this.setStatus('failed');
        throw new ChatError('connect', 'Could not connect to chat. Please retry.');
      }

      this.everConnected = true;
      this.setStatus('connected');

      // Make the display name visible to other members (best effort).
      void NCEngine.userModule
        .updateMyUserProfile({ userId: this.identity?.userId, name: this.identity?.name })
        .catch(() => undefined);
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async join(roomId: string): Promise<void> {
    if (!this.identity) throw new ChatError('not-ready', 'Connect before joining a room.');
    if (!isValidRoomId(roomId)) throw new ChatError('join', 'This room link looks broken.');

    const channelId = await requestJoin(this.identity.userId, roomId);
    this.channelId = channelId;
    this.channel = new GroupChannel(channelId);
  }

  async send(event: RoomEvent): Promise<ChatMessage> {
    if (!this.identity) throw new ChatError('not-ready', 'Connect before sending.');
    if (!this.channel) throw new ChatError('not-ready', 'Join a room before sending.');

    const serialized = serializeEvent(event);
    if (!parseRoomEvent(serialized)) {
      throw new ChatError('send', 'That message is not valid.');
    }

    // Human messages share a sliding-window limit; sync/state control messages
    // are app-generated backfill and do not consume the user's quota.
    if (event.k === 'fb' || event.k === 'vote' || event.k === 'timer') {
      const slot = takeSendSlot(this.sendTimestamps, Date.now(), SEND_LIMIT, SEND_WINDOW_MS);
      if (!slot.allowed) {
        throw new ChatError('cooldown', 'Slow down a little.', slot.retryAfterMs);
      }
      this.sendTimestamps = slot.timestamps;
    }

    const result = await this.channel.sendMessage(new SendTextMessageParams({ text: serialized }));
    if (!result.isOk) {
      console.warn('[chat] send failed with code', result.code);
      throw new ChatError('send', 'Message failed to send. Please retry.');
    }

    const mapped = result.data ? this.toChatMessage(result.data as unknown as SdkMessageLike) : null;
    if (mapped) return mapped;

    return {
      id: `local_${Date.now()}`,
      senderId: this.identity.userId,
      senderName: this.identity.name,
      text: serialized,
      sentAt: Date.now(),
      isMine: true,
    };
  }

  async history(pageSize = 100): Promise<ChatMessage[]> {
    if (!this.channel) throw new ChatError('not-ready', 'Join a room before loading history.');

    const size = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const messages = await this.fetchHistory(size);
    if (messages.length > 0) return messages;

    // One quick retry covers the brief gap between a send and remote history indexing.
    await delay(600);
    return this.fetchHistory(size);
  }

  private async fetchHistory(size: number): Promise<ChatMessage[]> {
    if (!this.channel) return [];

    const query = BaseChannel.createMessagesQuery({
      channelIdentifier: this.channel.identifier,
      pageSize: size,
      startTime: Date.now(),
      isAscending: false,
    });

    const collected = new Map<string, SdkMessageLike>();

    for (let page = 0; page < HISTORY_PAGES; page += 1) {
      const result = await query.loadNextPage();
      if (!result.isOk) {
        console.warn('[chat] history failed with code', result.code);
        throw new ChatError('history', 'Earlier messages are not available right now.');
      }

      const batch = (result.data?.data ?? []) as unknown as SdkMessageLike[];
      for (const message of batch) {
        if (typeof message.messageId === 'string' && message.messageId.length > 0) {
          collected.set(message.messageId, message);
        }
      }

      if (batch.length < size) break;
    }

    const raw = [...collected.values()];
    await this.resolveNames(raw);

    return raw
      .map((message) => this.toChatMessage(message))
      .filter((message): message is ChatMessage => message !== null)
      .sort((a, b) => a.sentAt - b.sentAt);
  }

  onMessage(handler: (message: ChatMessage) => void): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onStatus(handler: (status: ChatStatus) => void): Unsubscribe {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  async disconnect(): Promise<void> {
    try {
      await NCEngine.disconnect();
    } catch {
      // Already disconnected or SDK unavailable; nothing else to do.
    }
    this.channel = null;
    this.channelId = null;
    this.unregisterHandlers();
    this.setStatus('disconnected');
  }

  private setStatus(status: ChatStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const handler of this.statusHandlers) handler(status);
  }

  private handleConnection(status: number, code?: number): void {
    if (status === 0) {
      this.everConnected = true;
      this.setStatus('connected');
      return;
    }
    if (status === 1) {
      this.setStatus(this.everConnected ? 'reconnecting' : 'connecting');
      return;
    }
    if (status === 3) {
      this.setStatus('reconnecting');
      return;
    }
    if (code === KICKED_CODE) {
      this.setStatus('kicked');
      return;
    }
    this.setStatus('disconnected');
  }

  private registerHandlers(): void {
    if (this.statusHandlerId !== null) return;
    const suffix = String((adapterSequence += 1));
    this.statusHandlerId = `pr_status_${suffix}`;
    this.messageHandlerId = `pr_messages_${suffix}`;

    NCEngine.addConnectionStatusHandler(
      this.statusHandlerId,
      new ConnectionStatusHandler({
        onConnectionStatusChanged: (event) => {
          this.handleConnection(event.status, event.code);
        },
      }),
    );

    NCEngine.addMessageHandler(
      this.messageHandlerId,
      new MessageHandler({
        onMessageReceived: (event) => {
          void this.handleIncoming(event.messages as unknown as SdkMessageLike[]);
        },
      }),
    );
  }

  private unregisterHandlers(): void {
    if (this.statusHandlerId !== null) {
      NCEngine.removeConnectionStatusHandler(this.statusHandlerId);
      this.statusHandlerId = null;
    }
    if (this.messageHandlerId !== null) {
      NCEngine.removeMessageHandler(this.messageHandlerId);
      this.messageHandlerId = null;
    }
  }

  private async handleIncoming(messages: SdkMessageLike[]): Promise<void> {
    const ours = messages.filter(
      (message) =>
        typeof message.channelIdentifier?.channelId === 'string' &&
        message.channelIdentifier.channelId === this.channelId,
    );
    if (ours.length === 0) return;

    await this.resolveNames(ours);

    for (const message of ours) {
      const mapped = this.toChatMessage(message);
      if (!mapped) continue;
      for (const handler of this.messageHandlers) handler(mapped);
    }
  }

  private async resolveNames(messages: SdkMessageLike[]): Promise<void> {
    for (const message of messages) {
      const name = message.content?.senderUserInfo?.name;
      if (typeof name === 'string' && name.trim() && typeof message.senderUserId === 'string') {
        this.nameCache.set(message.senderUserId, name.trim());
      }
    }

    const unknown = [
      ...new Set(
        messages
          .map((message) => message.senderUserId)
          .filter(
            (userId): userId is string =>
              typeof userId === 'string' &&
              userId.length > 0 &&
              userId !== this.identity?.userId &&
              !this.nameCache.has(userId),
          ),
      ),
    ];
    if (unknown.length === 0) return;

    try {
      const result = await NCEngine.userModule.getUserProfiles(unknown);
      if (result.isOk && Array.isArray(result.data)) {
        for (const profile of result.data) {
          if (
            typeof profile.userId === 'string' &&
            typeof profile.name === 'string' &&
            profile.name.trim()
          ) {
            this.nameCache.set(profile.userId, profile.name.trim());
          }
        }
      }
    } catch {
      // Names are cosmetic; IDs still identify the author.
    }
  }

  private toChatMessage(message: SdkMessageLike): ChatMessage | null {
    const text = typeof message.content?.text === 'string' ? message.content.text : '';
    if (!text || !parseRoomEvent(text)) return null;

    const senderId = typeof message.senderUserId === 'string' ? message.senderUserId : '';
    if (!senderId) return null;

    const sentAt =
      typeof message.sentTime === 'number' && Number.isFinite(message.sentTime)
        ? message.sentTime
        : Date.now();

    const profileName = message.content?.senderUserInfo?.name;
    const cacheName = this.nameCache.get(senderId);
    const senderName =
      senderId === this.identity?.userId
        ? this.identity.name
        : (typeof profileName === 'string' && profileName.trim()) || cacheName || 'Reviewer';

    return {
      id:
        typeof message.messageId === 'string' && message.messageId
          ? message.messageId
          : `${senderId}:${sentAt}`,
      senderId,
      senderName,
      text,
      sentAt,
      isMine: senderId === this.identity?.userId,
    };
  }
}

export function createChatAdapter(): ChatAdapter {
  return new NexconnChatAdapter();
}
