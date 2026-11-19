import crypto from 'node:crypto';
import type { NexconnEnv } from './env';

interface ServerApiEnvelope {
  code?: number;
  result?: unknown;
  errorMessage?: string;
  message?: string;
}

export type NexconnResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: number | null; status?: number; message: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Signature = SHA1(App Secret + Nonce + Timestamp). */
export function signRequest(appSecret: string, nonce: string, timestamp: string): string {
  return crypto.createHash('sha1').update(appSecret + nonce + timestamp).digest('hex');
}

function makeNonce(): string {
  return crypto.randomBytes(9).toString('hex');
}

/**
 * POST a signed request to the Nexconn Server API.
 * Tries the primary base URL, then the regional backup domain.
 */
export async function callServerApi<T>(
  env: NexconnEnv,
  path: string,
  payload: Record<string, unknown>,
): Promise<NexconnResult<T>> {
  let last: NexconnResult<T> = {
    ok: false,
    code: null,
    message: 'No Server API base URL configured',
  };

  for (const baseUrl of env.apiBaseUrls) {
    const timestamp = String(Date.now());
    const nonce = makeNonce();
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'App-Key': env.appKey,
          Nonce: nonce,
          Timestamp: timestamp,
          Signature: signRequest(env.appSecret, nonce, timestamp),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8_000),
      });

      const text = await response.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const envelope = isObject(data) ? (data as ServerApiEnvelope) : null;
        last = {
          ok: false,
          code: typeof envelope?.code === 'number' ? envelope.code : null,
          status: response.status,
          message: `HTTP ${response.status}`,
        };
        continue;
      }

      if (!isObject(data)) {
        last = { ok: false, code: null, message: 'Unexpected response from Nexconn' };
        continue;
      }

      const envelope = data as ServerApiEnvelope;
      const code = typeof envelope.code === 'number' ? envelope.code : null;
      if (code === 0) {
        return { ok: true, value: (envelope.result ?? null) as T };
      }

      const message =
        typeof envelope.errorMessage === 'string'
          ? envelope.errorMessage
          : typeof envelope.message === 'string'
            ? envelope.message
            : 'Request rejected by Nexconn';
      last = { ok: false, code, message };

      // Auth or signature problems will not improve on the backup domain.
      if (code === 401 || code === 403) break;
    } catch (error) {
      last = {
        ok: false,
        code: null,
        message: error instanceof Error ? error.name : 'Network error',
      };
    }
  }

  return last;
}

export interface TokenResult {
  userId?: string;
  accessToken?: string;
}

export function issueAccessToken(
  env: NexconnEnv,
  userId: string,
  name: string,
): Promise<NexconnResult<TokenResult>> {
  return callServerApi<TokenResult>(env, '/v4/auth/access-token/issue', { userId, name });
}

/**
 * Ensure the group channel exists and the user is a member.
 * Create is attempted first (the creator becomes owner and a member);
 * if the group already exists, join adds the user directly.
 */
export async function ensureGroupMembership(
  env: NexconnEnv,
  channelId: string,
  userId: string,
): Promise<NexconnResult<null>> {
  const created = await callServerApi<unknown>(env, '/v4/group-channel/create', {
    channelId,
    name: channelId,
    owner: userId,
  });
  if (created.ok) return { ok: true, value: null };

  const joined = await callServerApi<unknown>(env, '/v4/group-channel/join', {
    channelId,
    userIds: [userId],
  });
  if (joined.ok) return { ok: true, value: null };

  console.error(
    `[nexconn] group membership failed for ${channelId}: create code=${created.code ?? 'none'} (${created.message}), join code=${joined.code ?? 'none'} (${joined.message})`,
  );
  return {
    ok: false,
    code: joined.code ?? created.code,
    message: joined.message,
  };
}
