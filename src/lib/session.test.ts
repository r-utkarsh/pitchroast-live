import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetStorageForTests,
  addRecentRoom,
  clearIdentity,
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
});
