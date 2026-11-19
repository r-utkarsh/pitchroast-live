import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ORIGIN = 'http://localhost:5173';
const OUT_DIR = path.join(process.cwd(), 'submission', 'screenshots');
const suffix = Math.random().toString(36).slice(2, 6);
const title = 'Pulseboard — Monday metrics without the spreadsheet';
const pitch =
  'Pulseboard turns product metrics into a short Monday brief your team actually reads, with the two numbers that changed and why it matters.';
const roomMessages = [
  {
    tag: 'hook',
    text: 'The hero promise is clear: metrics without the spreadsheet. I would click.',
  },
  {
    tag: 'clarity',
    text: 'The demo CTA could say what happens next — “See a sample brief” is clearer than “Try it”.',
  },
  {
    tag: 'fix',
    text: 'Move pricing above the FAQ. Reviewers look for it before they read the long answers.',
  },
  {
    tag: 'fix',
    text: 'Add one proof point under the hero, for example “used by 40 product teams”.',
  },
];

async function waitForLiveRoom(page) {
  await page.getByTestId('room-panel').waitFor();
  await page
    .getByTestId('room-panel')
    .and(page.locator('[data-ready="true"]'))
    .waitFor({ timeout: 45_000 });
  await page.getByTestId('chat-status').filter({ hasText: 'Live' }).waitFor({ timeout: 45_000 });
}

async function join(page, name) {
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('name-submit').click();
  await waitForLiveRoom(page);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, name), animations: 'disabled' });
  console.log(`saved submission/screenshots/${name}`);
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const contextMobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
await contextA.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });

try {
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const landing = await contextA.newPage();

  await landing.goto(ORIGIN);
  await landing.getByTestId('try-demo').waitFor();
  await shot(landing, 'landing-1280x800.png');

  const mobileLanding = await contextMobile.newPage();
  await mobileLanding.goto(ORIGIN);
  await mobileLanding.getByTestId('try-demo').waitFor();
  await shot(mobileLanding, 'landing-375x812.png');
  await mobileLanding.close();

  await pageA.goto(ORIGIN);
  await pageA.getByTestId('create-title').fill(title);
  await pageA.getByTestId('create-url').fill('example.com/pulseboard');
  await pageA.getByTestId('create-pitch').fill(pitch);
  await pageA.getByTestId('create-submit').click();
  await pageA.waitForURL(/\/r\/[a-z2-7]{10}\?d=/);
  const roomUrl = pageA.url();

  await join(pageA, 'Alice Chen');

  await pageB.goto(roomUrl);
  await join(pageB, 'Bob Rivera');

  const send = async (page, message) => {
    await page.getByTestId(`tag-${message.tag}`).click();
    await page.getByTestId('composer-text').fill(message.text);
    await page.getByTestId('composer-send').click();
    await pageA.getByTestId('feedback-item').filter({ hasText: message.text }).waitFor({
      timeout: 15_000,
    });
    await pageB.getByTestId('feedback-item').filter({ hasText: message.text }).waitFor({
      timeout: 15_000,
    });
  };

  await send(pageA, roomMessages[0]);
  await send(pageA, roomMessages[2]);
  await send(pageB, roomMessages[1]);
  await send(pageB, roomMessages[3]);

  const hookB = pageB.getByTestId('feedback-item').filter({ hasText: roomMessages[0].text });
  await hookB.getByTestId('vote-button').click();
  await hookB.getByTestId('vote-count').filter({ hasText: '1' }).waitFor();
  const clarityA = pageA.getByTestId('feedback-item').filter({ hasText: roomMessages[1].text });
  await clarityA.getByTestId('vote-button').click();
  await clarityA.getByTestId('vote-count').filter({ hasText: '1' }).waitFor();

  await pageA.getByTestId('start-roast').click();
  await pageA.getByTestId('roast-countdown').waitFor({ timeout: 15_000 });
  await pageB.getByTestId('roast-countdown').waitFor({ timeout: 15_000 });

  await pageA
    .getByTestId('feedback-list')
    .evaluate((element) => {
      element.scrollTop = 0;
    });
  await shot(pageA, 'room-feedback-1280x800.png');

  // Markdown export: copy confirmation plus the actual downloaded document.
  await pageA.getByTestId('copy-markdown').scrollIntoViewIfNeeded();
  await pageA.getByTestId('copy-markdown').click();
  await pageA.getByTestId('copy-markdown').filter({ hasText: 'Copied!' }).waitFor();
  await shot(pageA, 'markdown-export-1280x800.png');

  const downloadPromise = pageA.waitForEvent('download');
  await pageA.getByTestId('download-markdown').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const markdown = await readFile(downloadPath, 'utf8');
  await writeFile(path.join(process.cwd(), 'submission', 'sample-export.md'), markdown, 'utf8');

  const markdownPage = await contextA.newPage();
  await markdownPage.setViewportSize({ width: 1280, height: 800 });
  const escaped = markdown
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  await markdownPage.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>
      body { margin: 0; padding: 40px; background: #f7f8fb; color: #111827; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      pre { margin: 0 auto; max-width: 900px; padding: 32px; background: #ffffff; border: 1px solid #d8dce6; border-radius: 12px; white-space: pre-wrap; }
    </style></head><body><pre>${escaped}</pre></body></html>`,
  );
  await shot(markdownPage, 'markdown-file-1280x800.png');

  // Mobile room and mobile export reuse Alice's live page so identity and state stay put.
  await pageA.setViewportSize({ width: 375, height: 812 });
  await pageA
    .getByTestId('room-panel')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await pageA.evaluate(() => window.scrollBy(0, -64));
  await pageA
    .getByTestId('feedback-list')
    .evaluate((element) => {
      element.scrollTop = 0;
    });
  await pageA.getByTestId('feedback-item').first().waitFor({ timeout: 15_000 });
  await shot(pageA, 'room-feedback-375x812.png');

  await pageA.evaluate(() => window.scrollTo(0, 0));
  await pageA.getByTestId('copy-markdown').scrollIntoViewIfNeeded();
  await pageA.getByTestId('copy-markdown').click();
  await pageA.getByTestId('copy-markdown').filter({ hasText: 'Copied!' }).waitFor();
  await shot(pageA, 'markdown-export-375x812.png');
  await pageA.setViewportSize({ width: 1280, height: 800 });

  console.log(`room: ${roomUrl}`);
  console.log(`suffix: ${suffix}`);
} finally {
  await browser.close();
}
