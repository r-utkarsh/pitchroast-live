export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
  setHeader(name: string, value: string): unknown;
}

const MAX_BODY_BYTES = 2048;
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 20;

const buckets = new Map<string, number[]>();

export function clientIp(req: ApiRequest): string {
  const raw = req.headers['x-forwarded-for'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const first = (value || '').split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

export function takeRateLimit(
  req: ApiRequest,
  endpoint: string,
  limit = DEFAULT_LIMIT,
): { ok: true } | { ok: false; retryAfter: number } {
  const key = `${endpoint}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((time) => now - time < WINDOW_MS);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    buckets.set(key, recent);
    return { ok: false, retryAfter };
  }

  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > 5000) {
    for (const [bucketKey, times] of buckets) {
      if (times.every((time) => now - time >= WINDOW_MS)) buckets.delete(bucketKey);
    }
  }

  return { ok: true };
}

export function sendError(
  res: ApiResponse,
  status: number,
  error: string,
  retryAfter?: number,
): void {
  res.setHeader('Cache-Control', 'no-store');
  if (retryAfter !== undefined) res.setHeader('Retry-After', String(retryAfter));
  res.status(status).json({ error });
}

export function sendOk(res: ApiResponse, body: unknown): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(body);
}

export function requirePost(req: ApiRequest, res: ApiResponse): boolean {
  if (req.method === 'POST') return true;
  res.setHeader('Allow', 'POST');
  sendError(res, 405, 'Method not allowed');
  return false;
}

export function applyRateLimit(req: ApiRequest, res: ApiResponse, endpoint: string): boolean {
  const result = takeRateLimit(req, endpoint);
  if (result.ok) return true;
  sendError(res, 429, 'Too many requests. Slow down a little.', result.retryAfter);
  return false;
}

export type ParsedBody =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: number; error: string };

export function parseJsonBody(req: ApiRequest, maxBytes = MAX_BODY_BYTES): ParsedBody {
  let raw: unknown = req.body;
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, status: 400, error: 'Expected a JSON body' };
  }

  if (typeof raw === 'string') {
    if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
      return { ok: false, status: 413, error: 'Request body is too large' };
    }
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ok: false, status: 400, error: 'Invalid JSON' };
    }
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, status: 400, error: 'Expected a JSON object' };
  }

  const size = Buffer.byteLength(JSON.stringify(raw), 'utf8');
  if (size > maxBytes) {
    return { ok: false, status: 413, error: 'Request body is too large' };
  }

  return { ok: true, value: raw as Record<string, unknown> };
}
