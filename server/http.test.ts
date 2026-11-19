import { describe, expect, it } from 'vitest';
import type { ApiRequest, ApiResponse } from './http';
import {
  clientIp,
  parseJsonBody,
  requirePost,
  sendError,
  takeRateLimit,
} from './http';

function makeResponse() {
  const state = {
    statusCode: 0,
    body: null as unknown,
    headers: {} as Record<string, string>,
  };

  const res: ApiResponse = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(body) {
      state.body = body;
      return body;
    },
    setHeader(name, value) {
      state.headers[name] = value;
      return res;
    },
  };

  return { res, state };
}

function makeRequest(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: 'POST',
    headers: {},
    body: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

describe('requirePost', () => {
  it('allows POST and rejects every other method with 405', () => {
    const allowed = makeResponse();
    expect(requirePost(makeRequest(), allowed.res)).toBe(true);
    expect(allowed.state.statusCode).toBe(0);

    for (const method of ['GET', 'PUT', undefined]) {
      const { res, state } = makeResponse();
      expect(requirePost(makeRequest({ method }), res)).toBe(false);
      expect(state.statusCode).toBe(405);
      expect(state.headers.Allow).toBe('POST');
      expect(state.body).toEqual({ error: 'Method not allowed' });
    }
  });
});

describe('parseJsonBody', () => {
  it('accepts object and JSON-string bodies', () => {
    expect(parseJsonBody(makeRequest({ body: { userId: 'u_0123456789abcdef' } }))).toEqual({
      ok: true,
      value: { userId: 'u_0123456789abcdef' },
    });
    expect(parseJsonBody(makeRequest({ body: '{"a":1}' }))).toEqual({
      ok: true,
      value: { a: 1 },
    });
  });

  it('rejects missing, malformed, non-object and oversized bodies', () => {
    expect(parseJsonBody(makeRequest({ body: undefined }))).toMatchObject({ ok: false, status: 400 });
    expect(parseJsonBody(makeRequest({ body: '' }))).toMatchObject({ ok: false, status: 400 });
    expect(parseJsonBody(makeRequest({ body: '{oops' }))).toMatchObject({
      ok: false,
      status: 400,
      error: 'Invalid JSON',
    });
    expect(parseJsonBody(makeRequest({ body: [1, 2] }))).toMatchObject({ ok: false, status: 400 });
    expect(parseJsonBody(makeRequest({ body: 'null' }))).toMatchObject({ ok: false, status: 400 });
    expect(parseJsonBody(makeRequest({ body: `{"x":"${'a'.repeat(3000)}"}` }))).toMatchObject({
      ok: false,
      status: 413,
    });
    expect(parseJsonBody(makeRequest({ body: { x: 'a'.repeat(3000) } }))).toMatchObject({
      ok: false,
      status: 413,
    });
  });

  it('honors a custom size limit', () => {
    expect(parseJsonBody(makeRequest({ body: '{"a":1}' }), 4)).toMatchObject({
      ok: false,
      status: 413,
    });
  });
});

describe('rate limiting', () => {
  it('allows 20 requests per endpoint and IP, then answers 429 with a retry hint', () => {
    const req = makeRequest({
      headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}` },
    });
    const endpoint = `test-${Math.random().toString(36).slice(2)}`;

    for (let i = 0; i < 20; i += 1) {
      expect(takeRateLimit(req, endpoint)).toEqual({ ok: true });
    }

    const denied = takeRateLimit(req, endpoint);
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.retryAfter).toBeGreaterThan(0);
      expect(denied.retryAfter).toBeLessThanOrEqual(60);
    }

    expect(takeRateLimit(req, `${endpoint}-other`)).toEqual({ ok: true });
  });

  it('keys limits by the first x-forwarded-for address and falls back to the socket', () => {
    expect(
      clientIp(makeRequest({ headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' } })),
    ).toBe('198.51.100.7');
    expect(
      clientIp(makeRequest({ headers: { 'x-forwarded-for': ['198.51.100.8', '10.0.0.2'] } })),
    ).toBe('198.51.100.8');
    expect(clientIp(makeRequest({ headers: {}, socket: { remoteAddress: '127.0.0.9' } }))).toBe(
      '127.0.0.9',
    );
    expect(clientIp(makeRequest({ headers: {}, socket: undefined }))).toBe('unknown');
  });
});

describe('sendError', () => {
  it('sets no-store, the retry hint and the error shape', () => {
    const { res, state } = makeResponse();
    sendError(res, 429, 'Too many requests', 12);

    expect(state.statusCode).toBe(429);
    expect(state.headers['Cache-Control']).toBe('no-store');
    expect(state.headers['Retry-After']).toBe('12');
    expect(state.body).toEqual({ error: 'Too many requests' });
  });
});
