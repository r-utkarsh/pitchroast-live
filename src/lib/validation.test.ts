import { describe, expect, it } from 'vitest';
import {
  buildRoomPath,
  channelIdForRoom,
  createRoomPayload,
  decodeRoomPayload,
  encodeRoomPayload,
  generateDemoRoomId,
  generateRoomId,
  generateUserId,
  isValidRoomId,
  isValidUserId,
  normalizeName,
  normalizePitch,
  normalizeTitle,
  normalizeUrl,
  validateRoomPayload,
} from './validation';

function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

describe('normalizeName', () => {
  it('trims and collapses repeated whitespace', () => {
    expect(normalizeName('  Ana   Maria  ')).toBe('Ana Maria');
    expect(normalizeName('Ana\tMaria')).toBe('Ana Maria');
  });

  it('rejects invalid names', () => {
    expect(normalizeName(' A ')).toBeNull();
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName('x'.repeat(25))).toBeNull();
    expect(normalizeName(42)).toBeNull();
    expect(normalizeName(null)).toBeNull();
  });
});

describe('normalizeTitle and normalizePitch', () => {
  it('enforces limits', () => {
    expect(normalizeTitle('  My project ')).toBe('My project');
    expect(normalizeTitle('   ')).toBeNull();
    expect(normalizeTitle('x'.repeat(81))).toBeNull();
    expect(normalizePitch(' One line ')).toBe('One line');
    expect(normalizePitch('')).toBeNull();
    expect(normalizePitch('x'.repeat(141))).toBeNull();
  });
});

describe('normalizeUrl', () => {
  it('accepts http and https and adds a missing scheme', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('  https://example.com/pitch  ')).toBe('https://example.com/pitch');
    expect(normalizeUrl('http://localhost:5173/demo')).toBe('http://localhost:5173/demo');
  });

  it('rejects unsafe schemes and malformed values', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('data:text/html,<h1>x</h1>')).toBeNull();
    expect(normalizeUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeUrl('ftp://example.com')).toBeNull();
    expect(normalizeUrl('https://')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('https://example.com/\u0000')).toBeNull();
    expect(normalizeUrl(`https://example.com/${'a'.repeat(300)}`)).toBeNull();
    expect(normalizeUrl(7)).toBeNull();
  });
});

describe('generated identifiers', () => {
  it('generates valid user IDs', () => {
    for (let i = 0; i < 20; i += 1) {
      const id = generateUserId();
      expect(id).toMatch(/^u_[a-f0-9]{16}$/);
      expect(isValidUserId(id)).toBe(true);
    }
    expect(isValidUserId('u_0123456789abcdef')).toBe(true);
    expect(isValidUserId('u_0123456789ABCDEF')).toBe(false);
    expect(isValidUserId('u_123')).toBe(false);
  });

  it('generates valid base32 room IDs', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const id = generateRoomId();
      expect(id).toMatch(/^[a-z2-7]{10}$/);
      expect(isValidRoomId(id)).toBe(true);
      seen.add(id);
    }
    expect(seen.size).toBeGreaterThan(45);
  });

  it('builds demo room IDs and Nexconn channel IDs', () => {
    const demo = generateDemoRoomId();
    expect(demo.startsWith('demo-')).toBe(true);
    expect(isValidRoomId(demo)).toBe(true);
    expect(channelIdForRoom('abcdefghij')).toBe('pr_abcdefghij');
    expect(channelIdForRoom(demo)).toBe(`pr_${demo.replace('-', '_')}`);
  });

  it('builds room paths', () => {
    expect(buildRoomPath('abcdefghij', 'XYZ')).toBe('/r/abcdefghij?d=XYZ');
  });
});

describe('room payload', () => {
  it('creates, encodes and decodes a payload', () => {
    const payload = createRoomPayload({
      title: '  Emoji rocket 🚀 ',
      url: 'example.com/pitch',
      pitch: 'A  one-line pitch',
      createdAt: 1_700_000_000_000,
    });

    expect(payload).toEqual({
      v: 1,
      t: 'Emoji rocket 🚀',
      u: 'https://example.com/pitch',
      p: 'A  one-line pitch',
      c: 1_700_000_000_000,
    });

    const encoded = encodeRoomPayload(payload as NonNullable<typeof payload>);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeRoomPayload(encoded)).toEqual(payload);
    expect(validateRoomPayload(payload)).toEqual(payload);
  });

  it('rejects invalid payloads when decoding', () => {
    const valid = {
      v: 1,
      t: 'Title',
      u: 'https://example.com',
      p: 'Pitch',
      c: 1_700_000_000_000,
    };

    expect(decodeRoomPayload('not base64!!')).toBeNull();
    expect(decodeRoomPayload('')).toBeNull();
    expect(decodeRoomPayload('a'.repeat(5000))).toBeNull();
    expect(decodeRoomPayload(encodeRaw({ ...valid, v: 2 }))).toBeNull();
    expect(decodeRoomPayload(encodeRaw({ ...valid, t: 'x'.repeat(81) }))).toBeNull();
    expect(decodeRoomPayload(encodeRaw({ ...valid, p: 'x'.repeat(141) }))).toBeNull();
    expect(decodeRoomPayload(encodeRaw({ ...valid, u: 'javascript:alert(1)' }))).toBeNull();
    expect(decodeRoomPayload(encodeRaw({ v: 1, t: 'Title' }))).toBeNull();
    expect(decodeRoomPayload(encodeRaw(null))).toBeNull();
    expect(decodeRoomPayload(encodeRaw([valid]))).toBeNull();
  });

  it('rejects timestamps that cannot be shown as a date', () => {
    const valid = {
      v: 1,
      t: 'Title',
      u: 'https://example.com',
      p: 'Pitch',
      c: 1_700_000_000_000,
    };

    expect(validateRoomPayload({ ...valid, c: -1 })).toBeNull();
    expect(validateRoomPayload({ ...valid, c: Number.NaN })).toBeNull();
    expect(validateRoomPayload({ ...valid, c: 9_000_000_000_000_000 })).toBeNull();
    expect(validateRoomPayload({ ...valid, c: 'now' })).toBeNull();
    expect(validateRoomPayload({ ...valid, c: 8_640_000_000_000_000 })).toEqual({
      ...valid,
      c: 8_640_000_000_000_000,
    });
  });

  it('rejects invalid UTF-8 bytes', () => {
    const binary = String.fromCharCode(0xff, 0xfe, 0xfd);
    const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    expect(decodeRoomPayload(encoded)).toBeNull();
  });
});
