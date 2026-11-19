import { describe, expect, it } from 'vitest';
import {
  channelIdFor,
  groupNameFor,
  normalizeName,
  normalizeRoomId,
  normalizeUserId,
} from './validation';

describe('validation', () => {
  it('normalizes names and rejects bad lengths', () => {
    expect(normalizeName('  Ana   Maria  ')).toBe('Ana Maria');
    expect(normalizeName('J')).toBeNull();
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName('x'.repeat(25))).toBeNull();
    expect(normalizeName(42)).toBeNull();
  });

  it('validates user ids strictly', () => {
    expect(normalizeUserId('u_0123456789abcdef')).toBe('u_0123456789abcdef');
    expect(normalizeUserId('u_0123456789ABCDEF')).toBeNull();
    expect(normalizeUserId('0123456789abcdef')).toBeNull();
    expect(normalizeUserId('u_123')).toBeNull();
  });

  it('validates room ids and derives valid channel ids', () => {
    expect(normalizeRoomId('abcdefghij')).toBe('abcdefghij');
    expect(normalizeRoomId('demo-abcdefghij')).toBe('demo-abcdefghij');
    expect(normalizeRoomId('ABC')).toBeNull();
    expect(normalizeRoomId('abcdefghijkl')).toBeNull();
    expect(normalizeRoomId('0123456789')).toBeNull();
    expect(channelIdFor('demo-abcdefghij')).toBe('pr_demo_abcdefghij');
    expect(channelIdFor('abcdefghij')).toBe('pr_abcdefghij');
    expect(groupNameFor('abcdefghij')).toBe('PitchRoast abcdefghij');
  });
});
