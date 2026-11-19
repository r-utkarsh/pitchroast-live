/**
 * Local API smoke test. Starts nothing; expects `npm run dev` to be running.
 * Prints only safe metadata (never tokens, never secrets).
 */
const API = process.env.API_URL || 'http://localhost:8787';

async function waitForApi(timeoutMs = 40_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${API}/api/token`);
      if (res.status > 0) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('API did not become ready in time');
}

function userId() {
  let hex = '';
  for (let i = 0; i < 16; i += 1) hex += Math.floor(Math.random() * 16).toString(16);
  return `u_${hex}`;
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
}

const checks = [];
function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

await waitForApi();

const u1 = userId();
const token1 = await post('/api/token', { userId: u1, name: '  Test   Reviewer ' });
check('POST /api/token validates and returns 200', token1.status === 200, `status ${token1.status}`);
check('token response has userId echo', token1.data?.userId === u1);
check(
  'token response contains a non-empty token',
  typeof token1.data?.token === 'string' && token1.data.token.length > 10,
  typeof token1.data?.token === 'string' ? `${token1.data.token.length} chars` : 'missing',
);

const invalid = await post('/api/token', { userId: 'bad id', name: 'x' });
check('invalid input returns 400 with error', invalid.status === 400 && typeof invalid.data?.error === 'string');

const wrongMethod = await fetch(`${API}/api/token`);
check('GET returns 405', wrongMethod.status === 405, `status ${wrongMethod.status}`);
check('405 sets Allow: POST', wrongMethod.headers.get('allow') === 'POST');

const invalidJson = await post('/api/token', '{not json');
check('invalid JSON returns 400', invalidJson.status === 400);

const oversized = await post('/api/token', { userId: u1, name: 'x'.repeat(3000) });
check('oversized body returns 413 or 400', oversized.status === 413 || oversized.status === 400, `status ${oversized.status}`);

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';
let roomId = 'prt';
while (roomId.length < 10) roomId += BASE32[Math.floor(Math.random() * BASE32.length)];
const join1 = await post('/api/join', { userId: u1, roomId });
check('POST /api/join returns 200', join1.status === 200, `status ${join1.status}`);
check('join returns pr_ channel id', join1.data?.channelId === `pr_${roomId}`, join1.data?.channelId);

const u2 = userId();
const token2 = await post('/api/token', { userId: u2, name: 'Second Reviewer' });
check('second reviewer gets a token', token2.status === 200);
const join2 = await post('/api/join', { userId: u2, roomId });
check('second reviewer joins the existing group', join2.status === 200, `status ${join2.status}`);
const rejoin = await post('/api/join', { userId: u2, roomId });
check('re-joining the same group is safe', rejoin.status === 200, `status ${rejoin.status}`);

const failed = checks.filter((entry) => !entry.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
