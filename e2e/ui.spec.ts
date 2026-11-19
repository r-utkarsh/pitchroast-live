import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

test.setTimeout(180_000);

const ORIGIN = 'http://localhost:5173';

async function expectNoHorizontalScroll(page: Page) {
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
}

async function feedbackTexts(page: Page): Promise<string[]> {
  return page.getByTestId('feedback-text').allTextContents();
}

async function waitForLiveRoom(page: Page, title: string) {
  await expect(page.getByTestId('room-title')).toHaveText(title);
  await expect(page.getByTestId('room-panel')).toHaveAttribute('data-ready', 'true', {
    timeout: 40_000,
  });
  await expect(page.getByTestId('chat-status')).toHaveText('Live', { timeout: 40_000 });
}

test('create, share, roast, upvote, refresh, export, recover and adapt', async ({ browser }) => {
  const suffix = Math.random().toString(36).slice(2, 6);
  const title = `Moonlight ${suffix}`;
  const pitch = 'A calm place to plan your week in five minutes.';
  const msg1 = `The hook lands, but the pricing is unclear (${suffix}).`;
  const msg2 = `The onboarding copy is dense (${suffix}).`;
  const msg3 = `The name is memorable (${suffix}).`;
  const mobileMsg = `Sent from a small screen (${suffix}).`;
  const recoveryMsg = `Back after the network hiccup (${suffix}).`;

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const contextC = await browser.newContext();
  await contextA.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });

  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto('/');
    await expect(pageA.getByTestId('try-demo')).toBeVisible();
    await expect(pageA.getByRole('heading', { name: /get roasted/i })).toBeVisible();

    await pageA.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(pageA);
    await pageA.setViewportSize({ width: 1280, height: 800 });

    await pageA.getByTestId('create-title').fill(title);
    await pageA.getByTestId('create-url').fill('example.com/moonlight');
    await pageA.getByTestId('create-pitch').fill(pitch);
    await pageA.getByTestId('create-submit').click();

    await expect(pageA).toHaveURL(/\/r\/[a-z2-7]{10}\?d=/);
    const roomUrl = pageA.url();

    await expect(pageA.getByTestId('gate-title')).toContainText(title);
    await pageA.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(pageA);
    await expect(pageA.getByLabel('Display name')).toBeVisible();
    await pageA.getByTestId('name-input').focus();
    await pageA.keyboard.press('Tab');
    await expect(pageA.getByTestId('name-submit')).toBeFocused();
    const focusRing = await pageA
      .getByTestId('name-submit')
      .evaluate((element) => getComputedStyle(element).boxShadow);
    expect(focusRing).not.toBe('none');
    await pageA.getByTestId('name-input').fill('Alice');
    await pageA.getByTestId('name-submit').click();
    await waitForLiveRoom(pageA, title);
    await expect(pageA.getByLabel('Add feedback')).toBeVisible();

    await pageB.goto(roomUrl);
    await expect(pageB.getByTestId('gate-title')).toContainText(title);
    await pageB.getByTestId('name-input').fill('Bob');
    await pageB.getByTestId('name-submit').click();
    await waitForLiveRoom(pageB, title);

    // The creator can start a roast round; it syncs to every reviewer.
    await expect(pageB.getByTestId('start-roast')).toHaveCount(0);
    await pageA.getByTestId('start-roast').click();
    await expect(pageA.getByTestId('roast-countdown')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('roast-countdown')).toBeVisible({ timeout: 10_000 });
    await expect(pageB.getByTestId('roast-countdown')).toHaveText(/^(5:00|4:\d{2})$/);

    // "/" focuses the composer from anywhere outside a field.
    await pageA.getByTestId('room-panel').click({ position: { x: 4, y: 4 } });
    await pageA.keyboard.press('/');
    await expect(pageA.getByTestId('composer-text')).toBeFocused();

    // Composer limits and duplicate prevention.
    const composerA = pageA.getByTestId('composer-text');
    const sendA = pageA.getByTestId('composer-send');
    await composerA.fill('   ');
    await expect(sendA).toBeDisabled();
    await composerA.fill('x'.repeat(501));
    await expect(sendA).toBeDisabled();
    await expect(pageA.getByTestId('composer-counter')).toHaveText('501/500');
    await composerA.fill(msg1);
    await pageA.getByTestId('tag-fix').click();
    await expect(sendA).toBeEnabled();
    await sendA.dblclick();

    const item1B = pageB.getByTestId('feedback-item').filter({ hasText: msg1 });
    await expect(item1B).toBeVisible({ timeout: 10_000 });
    await expect(item1B).toContainText('Alice');
    await expect(pageB.getByTestId('feedback-item').filter({ hasText: msg1 })).toHaveCount(1);

    // Upvote, un-upvote, then restore with a self-upvote from the author.
    await item1B.getByTestId('vote-button').click();
    await expect(item1B.getByTestId('vote-count')).toHaveText('1', { timeout: 10_000 });
    await expect(item1B.getByTestId('vote-button')).toHaveAttribute('aria-pressed', 'true');

    const item1A = pageA.getByTestId('feedback-item').filter({ hasText: msg1 });
    await expect(item1A.getByTestId('vote-count')).toHaveText('1', { timeout: 10_000 });
    await expect(item1A.getByTestId('vote-button')).toHaveAttribute('aria-pressed', 'false');

    await item1B.getByTestId('vote-button').click();
    await expect(item1B.getByTestId('vote-count')).toHaveText('0', { timeout: 10_000 });
    await expect(item1A.getByTestId('vote-count')).toHaveText('0', { timeout: 10_000 });

    await item1A.getByTestId('vote-button').click();
    await expect(item1A.getByTestId('vote-count')).toHaveText('1', { timeout: 10_000 });
    await expect(item1B.getByTestId('vote-count')).toHaveText('1', { timeout: 10_000 });
    await expect(item1A.getByTestId('vote-button')).toHaveAttribute('aria-pressed', 'true');

    // Two more tagged messages for the filter and sort checks.
    await pageB.getByTestId('tag-fix').click();
    await pageB.getByTestId('composer-text').fill(msg2);
    await pageB.getByTestId('composer-send').click();
    await expect(pageA.getByTestId('feedback-item').filter({ hasText: msg2 })).toBeVisible({
      timeout: 10_000,
    });

    await pageB.getByTestId('tag-hook').click();
    await pageB.getByTestId('composer-text').fill(msg3);
    await pageB.getByTestId('composer-send').click();

    const item3A = pageA.getByTestId('feedback-item').filter({ hasText: msg3 });
    const item3B = pageB.getByTestId('feedback-item').filter({ hasText: msg3 });
    await expect(item3A).toBeVisible({ timeout: 10_000 });
    await expect(item3B).toBeVisible({ timeout: 10_000 });

    await item3A.getByTestId('vote-button').click();
    await expect(item3A.getByTestId('vote-count')).toHaveText('1', { timeout: 10_000 });
    await expect(item3B.getByTestId('vote-count')).toHaveText('1', { timeout: 10_000 });

    // A third reviewer joins after the messages were sent. Nexconn history starts
    // at join time, so the room's sync/snapshot handshake has to backfill them.
    const pageC = await contextC.newPage();
    await pageC.goto(roomUrl);
    await pageC.getByTestId('name-input').fill('Cleo');
    await pageC.getByTestId('name-submit').click();
    await expect(pageC.getByTestId('room-panel')).toHaveAttribute('data-ready', 'true', {
      timeout: 40_000,
    });
    await expect(pageC.getByTestId('feedback-item').filter({ hasText: msg1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(pageC.getByTestId('feedback-item').filter({ hasText: msg2 })).toBeVisible();
    const item3C = pageC.getByTestId('feedback-item').filter({ hasText: msg3 });
    await expect(item3C).toBeVisible();
    await expect(item3C.getByTestId('vote-count')).toHaveText('1');

    await item3C.getByTestId('vote-button').click();
    await expect(item3C.getByTestId('vote-count')).toHaveText('2', { timeout: 10_000 });
    await expect(item3A.getByTestId('vote-count')).toHaveText('2', { timeout: 10_000 });

    // Filters show the right subsets, including the empty state.
    await pageA.getByTestId('filter-fix').click();
    await expect(pageA.getByTestId('feedback-item')).toHaveCount(2);
    await expect(item1A).toBeVisible();
    await expect(item3A).toHaveCount(0);

    await pageA.getByTestId('filter-hook').click();
    await expect(pageA.getByTestId('feedback-item')).toHaveCount(1);
    await expect(item3A).toBeVisible();

    await pageA.getByTestId('filter-clarity').click();
    await expect(pageA.getByTestId('feedback-item')).toHaveCount(0);
    await expect(pageA.getByText('No Clarity feedback yet.')).toBeVisible();

    await pageA.getByTestId('filter-all').click();
    await expect(pageA.getByTestId('feedback-item')).toHaveCount(3);

    // Top feedback sorts by votes, then time; toggling off restores chronology.
    await expect.poll(() => feedbackTexts(pageA)).toEqual([msg1, msg2, msg3]);
    await pageA.getByTestId('sort-toggle').click();
    await expect(pageA.getByTestId('sort-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => feedbackTexts(pageA)).toEqual([msg3, msg1, msg2]);
    await pageA.getByTestId('sort-toggle').click();
    await expect.poll(() => feedbackTexts(pageA)).toEqual([msg1, msg2, msg3]);

    // Clipboard and file export carry the exact right sections and votes.
    await pageA.getByTestId('copy-markdown').click();
    await expect(pageA.getByTestId('copy-markdown')).toHaveText('Copied!');
    const clipboard = await pageA.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(`# PitchRoast feedback: ${title}`);
    expect(clipboard).toContain('## Fix (2)');
    expect(clipboard).toContain(`${msg1} (+1) by Alice`);
    expect(clipboard).toContain('## Hook (1)');
    expect(clipboard).toContain(`${msg3} (+2) by Bob`);

    const downloadPromise = pageA.waitForEvent('download');
    await pageA.getByTestId('download-markdown').click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();
    const markdown = await readFile(path as string, 'utf8');
    expect(markdown).toContain(`# PitchRoast feedback: ${title}`);
    expect(markdown).toContain('## Fix (2)');
    expect(markdown).toContain(`${msg1} (+1) by Alice`);
    expect(markdown).toContain(`${msg3} (+2) by Bob`);

    // A refresh restores identity, history and vote state.
    await pageA.reload();
    await expect(pageA.getByTestId('name-input')).toHaveCount(0);
    await waitForLiveRoom(pageA, title);
    await expect(pageA.getByTestId('feedback-item')).toHaveCount(3, { timeout: 20_000 });
    const item3After = pageA.getByTestId('feedback-item').filter({ hasText: msg3 });
    await expect(item3After.getByTestId('vote-count')).toHaveText('2', { timeout: 10_000 });

    // The composer stays usable at 375x812; 320px has no horizontal overflow.
    await pageA.setViewportSize({ width: 320, height: 700 });
    await expectNoHorizontalScroll(pageA);
    await pageA.setViewportSize({ width: 375, height: 812 });
    await expectNoHorizontalScroll(pageA);
    await pageA.getByTestId('tag-clarity').click();
    await pageA.getByTestId('composer-text').fill(mobileMsg);
    await expect(pageA.getByTestId('composer-send')).toBeEnabled();
    await pageA.getByTestId('composer-send').click();
    await expect(pageA.getByTestId('feedback-item').filter({ hasText: mobileMsg })).toBeVisible({
      timeout: 10_000,
    });
    await expect(pageB.getByTestId('feedback-item').filter({ hasText: mobileMsg })).toBeVisible({
      timeout: 10_000,
    });
    await pageA.screenshot({ path: 'test-results/ui-375.png', fullPage: true });

    // "Open as another reviewer" must force a fresh name gate.
    const popupPromise = contextA.waitForEvent('page');
    await pageA.getByTestId('open-as-reviewer').click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/as=new/);
    await expect(popup.getByTestId('name-input')).toBeVisible();
    await expect(popup.getByTestId('gate-title')).toContainText(title);
    await popup.close();

    await pageA.setViewportSize({ width: 1280, height: 800 });
    await expectNoHorizontalScroll(pageA);
    await pageA.screenshot({ path: 'test-results/ui-1280.png', fullPage: true });

    // Offline then online: the banner appears, clears, and live delivery resumes.
    await contextB.setOffline(true);
    await expect(pageB.getByText(/you are offline/i)).toBeVisible({ timeout: 10_000 });
    await contextB.setOffline(false);
    await expect(pageB.getByText(/you are offline/i)).toHaveCount(0, { timeout: 10_000 });
    await expect(pageB.getByTestId('chat-status')).toHaveText('Live', { timeout: 60_000 });

    await pageC.getByTestId('composer-text').fill(recoveryMsg);
    await pageC.getByTestId('composer-send').click();
    await expect(pageB.getByTestId('feedback-item').filter({ hasText: recoveryMsg })).toBeVisible({
      timeout: 20_000,
    });

    await pageA.goto('/');
    await expect(pageA.getByTestId('recent-room').filter({ hasText: title })).toBeVisible();

    await pageA.goto('/demo');
    await expect(pageA).toHaveURL(/\/r\/demo-[a-z2-7]{10}\?d=/);
    await expect(pageA.getByTestId('room-title')).toHaveText('Nebula Notes');

    await pageA.goto('/does-not-exist');
    await expect(pageA.getByTestId('not-found')).toBeVisible();

    await pageA.goto('/r/abcdefghij?d=not-a-valid-payload');
    await expect(pageA.getByTestId('broken-room')).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
    await contextC.close();
  }
});

test('works when browser storage is unavailable', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const denied = () => {
      throw new Error('Storage is blocked');
    };
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get: denied });
    Object.defineProperty(window, 'localStorage', { configurable: true, get: denied });
  });

  const page = await context.newPage();

  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/r\/demo-[a-z2-7]{10}\?d=/);
    await expect(page.getByTestId('gate-title')).toContainText('Nebula Notes');
    await page.getByTestId('name-input').fill('Private Mode');
    await page.getByTestId('name-submit').click();
    await waitForLiveRoom(page, 'Nebula Notes');

    await page.goto('/');
    await expect(page.getByTestId('recent-room')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('token rate limit shows a friendly retry', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('/');
    await page.getByTestId('create-title').fill('Rate limit room');
    await page.getByTestId('create-url').fill('example.com/rate-limit');
    await page.getByTestId('create-pitch').fill('A room that survives a busy server.');
    await page.getByTestId('create-submit').click();
    await expect(page.getByTestId('gate-title')).toBeVisible();

    await page.route('**/api/token', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too many requests' }),
      }),
    );

    await page.getByTestId('name-input').fill('Rate Tester');
    await page.getByTestId('name-submit').click();
    await expect(page.getByText(/too many connection attempts/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('retry-connect')).toBeVisible();

    await page.unroute('**/api/token');
    await page.getByTestId('retry-connect').click();
    await expect(page.getByTestId('room-panel')).toHaveAttribute('data-ready', 'true', {
      timeout: 40_000,
    });
    await expect(page.getByTestId('chat-status')).toHaveText('Live', { timeout: 40_000 });
  } finally {
    await context.close();
  }
});
