import { isValidRoomId, isValidUserId, normalizeName } from './validation';

export interface Identity {
  userId: string;
  name: string;
}

export interface RecentRoom {
  roomId: string;
  title: string;
  updatedAt: number;
}

const KEYS = {
  identity: 'pr.identity',
  lastName: 'pr.lastName',
  recentRooms: 'pr.recentRooms',
} as const;

type StoreKind = 'session' | 'local';

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory: Record<StoreKind, Map<string, string>> = {
  session: new Map(),
  local: new Map(),
};

const resolved: Partial<Record<StoreKind, Store>> = {};

function memoryStore(kind: StoreKind): Store {
  const map = memory[kind];
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function resolveStore(kind: StoreKind): Store {
  try {
    if (typeof window === 'undefined') return memoryStore(kind);
    const storage = kind === 'session' ? window.sessionStorage : window.localStorage;
    const probe = `__pr_probe_${kind}`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
    };
  } catch {
    return memoryStore(kind);
  }
}

function store(kind: StoreKind): Store {
  const existing = resolved[kind];
  if (existing) return existing;
  const created = resolveStore(kind);
  resolved[kind] = created;
  return created;
}

function readJson<T>(kind: StoreKind, key: string): T | null {
  try {
    const raw = store(kind).getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(kind: StoreKind, key: string, value: unknown): void {
  try {
    store(kind).setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail (quota, private mode); the app keeps working in memory for this session.
  }
}

export function readIdentity(): Identity | null {
  const value = readJson<unknown>('session', KEYS.identity);
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const name = normalizeName(record.name);
  if (!isValidUserId(record.userId) || !name) return null;
  return { userId: record.userId, name };
}

export function writeIdentity(identity: Identity): boolean {
  const name = normalizeName(identity.name);
  if (!isValidUserId(identity.userId) || !name) return false;
  writeJson('session', KEYS.identity, { userId: identity.userId, name });
  return true;
}

export function clearIdentity(): void {
  try {
    store('session').removeItem(KEYS.identity);
  } catch {
    // ignore
  }
}

export function readLastName(): string {
  try {
    const raw = store('local').getItem(KEYS.lastName);
    return normalizeName(raw ?? '') ?? '';
  } catch {
    return '';
  }
}

export function writeLastName(name: string): void {
  const normalized = normalizeName(name);
  if (!normalized) return;
  try {
    store('local').setItem(KEYS.lastName, normalized);
  } catch {
    // ignore
  }
}

function isValidRecentRoom(value: unknown): value is RecentRoom {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isValidRoomId(record.roomId) &&
    typeof record.title === 'string' &&
    record.title.length > 0 &&
    record.title.length <= 80 &&
    typeof record.updatedAt === 'number' &&
    Number.isFinite(record.updatedAt)
  );
}

export function readRecentRooms(): RecentRoom[] {
  const value = readJson<unknown>('local', KEYS.recentRooms);
  if (!Array.isArray(value)) return [];
  return value.filter(isValidRecentRoom).slice(0, 5);
}

export function addRecentRoom(input: { roomId: string; title: string; updatedAt?: number }): RecentRoom[] {
  if (!isValidRoomId(input.roomId)) return readRecentRooms();
  const title = input.title.trim().slice(0, 80);
  if (!title) return readRecentRooms();

  const entry: RecentRoom = {
    roomId: input.roomId,
    title,
    updatedAt:
      typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt)
        ? input.updatedAt
        : Date.now(),
  };

  const existing = readRecentRooms().filter((room) => room.roomId !== entry.roomId);
  const next = [entry, ...existing].slice(0, 5);
  writeJson('local', KEYS.recentRooms, next);
  return next;
}

export function removeRecentRoom(roomId: string): RecentRoom[] {
  const next = readRecentRooms().filter((room) => room.roomId !== roomId);
  writeJson('local', KEYS.recentRooms, next);
  return next;
}

/** Test-only: clear both the fallback maps and cached storage handles. */
export function __resetStorageForTests(): void {
  memory.session.clear();
  memory.local.clear();
  delete resolved.session;
  delete resolved.local;
}
