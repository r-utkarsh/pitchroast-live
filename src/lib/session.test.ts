import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetStorageForTests,
  addRecentRoom,
  clearIdentity,
  ensureBrowserStorage,
  isRoomCreator,
  markRoomCreator,
  readIdentity,
  readLastName,
  readRecentRooms,
  removeRecentRoom,
  writeIdentity,
  writeLastName,
} from './session';

const ID = 'u_0123456789abcdef';

beforeEach(() => {
  __resetStorageForTests();
});

describe('identity', () => {
  it('starts empty and round-trips a valid identity', () => {
    expect(readIdentity()).toBeNull();
    expect(writeIdentity({ userId: ID, name: '  Ana   Maria ' })).toBe(true);
    expect(readIdentity()).toEqual({ userId: ID, name: 'Ana Maria' });
    clearIdentity();
    expect(readIdentity()).toBeNull();
  });

  it('rejects invalid identities', () => {
    expect(writeIdentity({ userId: 'nope', name: 'Ana' })).toBe(false);
    expect(writeIdentity({ userId: ID, name: 'A' })).toBe(false);
    expect(readIdentity()).toBeNull();
  });
});

describe('last name', () => {
  it('remembers only a valid name', () => {
    expect(readLastName()).toBe('');
    writeLastName('  Ana  ');
    expect(readLastName()).toBe('Ana');
    writeLastName('   ');
    expect(readLastName()).toBe('Ana');
  });
});

describe('room creator flag', () => {
  it('marks only valid rooms and only for this session', () => {
    expect(isRoomCreator('abcdefghij')).toBe(false);
    markRoomCreator('abcdefghij');
    expect(isRoomCreator('abcdefghij')).toBe(true);
    expect(isRoomCreator('klmnopqrst')).toBe(false);

    markRoomCreator('bad');
    expect(isRoomCreator('bad')).toBe(false);
  });
});

describe('storage fallback', () => {
  it('keeps identity, name and rooms in memory when browser storage is blocked', () => {
    const blocked = {
      get sessionStorage(): never {
        throw new Error('Storage is blocked');
      },
      get localStorage(): never {
        throw new Error('Storage is blocked');
      },
    };

    Object.defineProperty(globalThis, 'window', { configurable: true, value: blocked });
    try {
      __resetStorageForTests();
      expect(writeIdentity({ userId: ID, name: 'Private Mode' })).toBe(true);
      expect(readIdentity()).toEqual({ userId: ID, name: 'Private Mode' });
      writeLastName('Private Mode');
      expect(readLastName()).toBe('Private Mode');
      addRecentRoom({ roomId: 'abcdefghij', title: 'Memory room' });
      expect(readRecentRooms().map((room) => room.title)).toEqual(['Memory room']);
    } finally {
      __resetStorageForTests();
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it('installs a working in-memory Storage when the browser blocks access', () => {
    const blocked = {
      get sessionStorage(): never {
        throw new Error('Storage is blocked');
      },
      get localStorage(): never {
        throw new Error('Storage is blocked');
      },
    };

    Object.defineProperty(globalThis, 'window', { configurable: true, value: blocked });
    try {
      ensureBrowserStorage();
      window.localStorage.setItem('key', 'value');
      expect(window.localStorage.getItem('key')).toBe('value');
      expect(window.localStorage.length).toBe(1);
      expect(window.localStorage.key(0)).toBe('key');
      window.localStorage.removeItem('key');
      expect(window.localStorage.getItem('key')).toBeNull();
      window.sessionStorage.setItem('other', '1');
      expect(window.sessionStorage.getItem('other')).toBe('1');
      window.sessionStorage.clear();
      expect(window.sessionStorage.length).toBe(0);
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});

describe('recent rooms', () => {
  it('keeps at most five, newest first, deduplicated', () => {
    for (let i = 0; i < 6; i += 1) {
      addRecentRoom({ roomId: `abcdefghi${'jklmnopq'[i]}`, title: `Room ${i}`, updatedAt: 1000 + i });
    }

    const rooms = readRecentRooms();
    expect(rooms).toHaveLength(5);
    expect(rooms[0]?.title).toBe('Room 5');
    expect(rooms[4]?.title).toBe('Room 1');

    addRecentRoom({ roomId: rooms[4]!.roomId, title: 'Moved to front', updatedAt: 2000 });
    const updated = readRecentRooms();
    expect(updated).toHaveLength(5);
    expect(updated[0]?.title).toBe('Moved to front');
  });

  it('ignores invalid rooms', () => {
    expect(addRecentRoom({ roomId: 'bad', title: 'Nope' })).toEqual([]);
    expect(addRecentRoom({ roomId: 'abcdefghij', title: '   ' })).toEqual([]);
    expect(readRecentRooms()).toEqual([]);
  });

  it('removes a room', () => {
    addRecentRoom({ roomId: 'abcdefghij', title: 'Keep' });
    addRecentRoom({ roomId: 'klmnopqrst', title: 'Remove' });
    const remaining = removeRecentRoom('klmnopqrst');
    expect(remaining.map((room) => room.title)).toEqual(['Keep']);
    expect(readRecentRooms().map((room) => room.title)).toEqual(['Keep']);
  });

  it('round-trips an optional payload and keeps it on update', () => {
    addRecentRoom({ roomId: 'abcdefghij', title: 'Payload room', payload: 'abc_-123' });
    expect(readRecentRooms()[0]?.payload).toBe('abc_-123');

    addRecentRoom({ roomId: 'abcdefghij', title: 'Renamed' });
    expect(readRecentRooms()[0]).toMatchObject({ title: 'Renamed', payload: 'abc_-123' });

    addRecentRoom({
      roomId: 'klmnopqrst',
      title: 'Too long payload',
      payload: 'x'.repeat(2001),
    });
    expect(readRecentRooms().find((room) => room.roomId === 'klmnopqrst')?.payload).toBeUndefined();
  });
});
