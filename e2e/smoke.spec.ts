import { expect, test } from '@playwright/test';

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

function randomRoomId(): string {
  let id = 'smoke';
  while (id.length < 10) {
    id += BASE32[Math.floor(Math.random() * BASE32.length)];
  }
  return id;
}

test('two reviewers exchange feedback and a late joiner gets the earlier message', async ({ browser }) => {
  const roomId = randomRoomId();
  const nameA = `Alice${Math.floor(Math.random() * 1000)}`;
  const nameB = `Bob${Math.floor(Math.random() * 1000)}`;
  const message = `The hook is strong but the pitch is vague (${roomId}).`;

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const contextC = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto(`/__smoke?room=${roomId}&name=${nameA}`);
    await pageB.goto(`/__smoke?room=${roomId}&name=${nameB}`);

    await expect(pageA.getByTestId('smoke-ready')).toBeVisible({ timeout: 40_000 });
    await expect(pageB.getByTestId('smoke-ready')).toBeVisible({ timeout: 40_000 });
    await expect(pageA.getByTestId('smoke-status')).toHaveText('connected');

    await pageA.getByTestId('smoke-text').fill(message);
    await pageA.getByTestId('smoke-send').click();

    await expect(pageB.getByTestId('smoke-message').filter({ hasText: message })).toBeVisible({
      timeout: 5_000,
    });

    // C was not a member when A sent, so Nexconn group history cannot return
    // the message. The sync handshake asks A/B for a snapshot instead.
    const late = await contextC.newPage();
    await late.goto(`/__smoke?room=${roomId}&name=Cleo`);
    await expect(late.getByTestId('smoke-ready')).toBeVisible({ timeout: 40_000 });
    await expect(late.getByTestId('smoke-message').filter({ hasText: message })).toBeVisible({
      timeout: 15_000,
    });
    await expect(late.getByTestId('smoke-message').filter({ hasText: message })).toContainText(nameA);
  } finally {
    await contextA.close();
    await contextB.close();
    await contextC.close();
  }
});
