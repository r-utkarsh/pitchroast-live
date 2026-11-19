import type { ApiRequest, ApiResponse } from '../http';
import { applyRateLimit, parseJsonBody, requirePost, sendError, sendOk } from '../http';
import { MissingEnvError, readNexconnEnv } from '../env';
import { ensureGroupMembership } from '../nexconn';
import { channelIdFor, normalizeRoomId, normalizeUserId } from '../validation';

export default async function joinHandler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!requirePost(req, res)) return;
  if (!applyRateLimit(req, res, 'join')) return;

  const body = parseJsonBody(req);
  if (!body.ok) {
    sendError(res, body.status, body.error);
    return;
  }

  const userId = normalizeUserId(body.value.userId);
  const roomId = normalizeRoomId(body.value.roomId);
  if (!userId || !roomId) {
    sendError(res, 400, 'Invalid userId or roomId.');
    return;
  }

  const channelId = channelIdFor(roomId);

  try {
    const env = readNexconnEnv();
    const result = await ensureGroupMembership(env, channelId, userId);
    if (!result.ok) {
      sendError(res, 502, 'Could not join the chat room. Please retry.');
      return;
    }
    sendOk(res, { channelId });
  } catch (error) {
    if (error instanceof MissingEnvError) {
      console.error(`[join] server is missing ${error.variable}`);
      sendError(res, 500, 'The server is not configured for chat.');
      return;
    }
    console.error('[join] unexpected error:', error instanceof Error ? error.message : 'unknown');
    sendError(res, 500, 'Something went wrong.');
  }
}
