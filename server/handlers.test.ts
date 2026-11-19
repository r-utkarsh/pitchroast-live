import { describe, expect, it } from 'vitest';
import type { ApiRequest, ApiResponse } from './http';
import joinHandler from './handlers/join';
import tokenHandler from './handlers/token';

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

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function makeRequest(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': nextIp() },
    body: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

describe('token handler guards', () => {
  it('rejects non-POST requests', async () => {
    const { res, state } = makeResponse();
    await tokenHandler(makeRequest({ method: 'GET' }), res);
    expect(state.statusCode).toBe(405);
    expect(state.headers.Allow).toBe('POST');
  });

  it('rejects invalid JSON and invalid identities before calling Nexconn', async () => {
    const malformed = makeResponse();
    await tokenHandler(makeRequest({ body: '{nope' }), malformed.res);
    expect(malformed.state.statusCode).toBe(400);

    const missing = makeResponse();
    await tokenHandler(makeRequest({ body: {} }), missing.res);
    expect(missing.state.statusCode).toBe(400);

    const badId = makeResponse();
    await tokenHandler(
      makeRequest({ body: { userId: 'u_0123456789ABCDEF', name: 'Ana' } }),
      badId.res,
    );
    expect(badId.state.statusCode).toBe(400);

    const badName = makeResponse();
    await tokenHandler(
      makeRequest({ body: { userId: 'u_0123456789abcdef', name: 'A' } }),
      badName.res,
    );
    expect(badName.state.statusCode).toBe(400);
  });

  it('rate limits with a friendly 429 and a Retry-After header', async () => {
    const ip = nextIp();
    let last = makeResponse();

    for (let i = 0; i < 20; i += 1) {
      last = makeResponse();
      await tokenHandler(
        makeRequest({ headers: { 'x-forwarded-for': ip }, body: '{nope' }),
        last.res,
      );
      expect(last.state.statusCode).toBe(400);
    }

    const limited = makeResponse();
    await tokenHandler(
      makeRequest({ headers: { 'x-forwarded-for': ip }, body: '{nope' }),
      limited.res,
    );
    expect(limited.state.statusCode).toBe(429);
    expect(limited.state.headers['Retry-After']).toBeDefined();
    expect(limited.state.body).toEqual({ error: 'Too many requests. Slow down a little.' });
  });
});

describe('join handler guards', () => {
  it('rejects non-POST requests', async () => {
    const { res, state } = makeResponse();
    await joinHandler(makeRequest({ method: 'GET' }), res);
    expect(state.statusCode).toBe(405);
  });

  it('rejects malformed room and user ids before calling Nexconn', async () => {
    const badRoom = makeResponse();
    await joinHandler(
      makeRequest({ body: { userId: 'u_0123456789abcdef', roomId: 'ABCDEFGHIJ' } }),
      badRoom.res,
    );
    expect(badRoom.state.statusCode).toBe(400);

    const badUser = makeResponse();
    await joinHandler(
      makeRequest({ body: { userId: 'nope', roomId: 'abcdefghij' } }),
      badUser.res,
    );
    expect(badUser.state.statusCode).toBe(400);
  });
});
