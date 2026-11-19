import type { ApiRequest, ApiResponse } from '../http';
import { applyRateLimit, parseJsonBody, requirePost, sendError, sendOk } from '../http';
import { MissingEnvError, readNexconnEnv } from '../env';
import { issueAccessToken } from '../nexconn';
import { normalizeName, normalizeUserId } from '../validation';

const BAD_INPUT = 'userId must be u_ plus 16 lowercase hex characters, and name must be 2-24 characters.';

export default async function tokenHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!requirePost(req, res)) return;
  if (!applyRateLimit(req, res, 'token')) return;

  const body = parseJsonBody(req);
  if (!body.ok) {
    sendError(res, body.status, body.error);
    return;
  }

  const userId = normalizeUserId(body.value.userId);
  const name = normalizeName(body.value.name);
  if (!userId || !name) {
    sendError(res, 400, BAD_INPUT);
    return;
  }

  try {
    const env = readNexconnEnv();
    const result = await issueAccessToken(env, userId, name);

    if (!result.ok || !result.value?.accessToken) {
      console.error(
        '[token] Nexconn refused the token request:',
        result.ok
          ? 'missing accessToken in response'
          : `code=${result.code ?? 'none'} status=${result.status ?? 'none'} message=${result.message}`,
      );
      sendError(res, 502, 'Could not issue a chat token. Please retry.');
      return;
    }

    sendOk(res, { userId, token: result.value.accessToken });
  } catch (error) {
    if (error instanceof MissingEnvError) {
      console.error(`[token] server is missing ${error.variable}`);
      sendError(res, 500, 'The server is not configured for chat.');
      return;
    }
    console.error('[token] unexpected error:', error instanceof Error ? error.message : 'unknown');
    sendError(res, 500, 'Something went wrong.');
  }
}
