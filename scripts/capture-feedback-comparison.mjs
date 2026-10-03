import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureTestServer, loadPlaywright, projectRoot, stopTestServer } from '../tests/helpers/test-runtime.mjs';

const { chromium } = loadPlaywright();
const server = await ensureTestServer();
const browser = await chromium.launch();
const output = path.join(projectRoot, 'docs', 'qa', 'pickup-hit-feedback');
await fs.mkdir(output, { recursive: true });
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1560, height: 850 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${server.url}feedback-comparison.html`);
  await page.getByRole('status').getByText('Beide Szenen laufen.', { exact: false }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2600);
  const pickupStates = await Promise.all(page.frames().filter((frame) => frame !== page.mainFrame()).map((frame) =>
    frame.evaluate(() => window.__ROOSTER_TEST__.getPickupState().items)));
  assert.equal(pickupStates.length, 2);
  assert(pickupStates.every((items) => items.length === 3));
  assert(pickupStates[0].every((item) => item.field === null && item.beam === null));
  assert(pickupStates[1].every((item) => item.field && item.beam));
  await page.screenshot({ path: path.join(output, 'pickup-before-after.png') });

  await page.getByRole('button', { name: 'Brennende Gegner' }).click();
  await page.getByRole('status').getByText('Beide Szenen laufen.', { exact: false }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1800);
  const burnStates = await Promise.all(page.frames().filter((frame) => frame !== page.mainFrame()).map((frame) =>
    frame.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState().burningEnemies)));
  assert.equal(burnStates.length, 2);
  assert(burnStates.every((enemies) => enemies.length === 3));
  assert(burnStates[0].every((enemy) => enemy.overlayKind === 'ground-glow' && enemy.flameCount === 0));
  assert(burnStates[1].every((enemy) => enemy.overlayKind === 'body-flames' && enemy.flameCount >= 2));
  await page.screenshot({ path: path.join(output, 'burn-before-after.png') });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(`${server.url}?seed=feedback-compare-mobile&arena=square-coop&profile=manual`);
  await mobile.waitForFunction(() => window.__ROOSTER_TEST__?.getState);
  await mobile.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster('ace'); api.disableBot(); api.pauseWaves();
    api.clearEnemies(); api.clearProjectiles(); api.clearXpOrbs(); api.clearPickups();
    api.setPlayerCombatModifiers({ fireRate: 100000000 });
    api.movePlayerTo(700, 540); api.setPlayerHp(60);
    for (const [kind, x] of [['heal', 610], ['bomb', 700], ['magnet', 790]]) api.spawnPickup(kind, x, 430);
  });
  await mobile.waitForTimeout(1700);
  await mobile.screenshot({ path: path.join(output, 'pickup-portrait.png') });
  await mobile.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.clearPickups();
    const ids = [
      api.spawnEnemyType('slime', 610, 425, { speed: 0, damage: 0, hp: 9999 }),
      api.spawnEnemyType('brute', 700, 425, { speed: 0, damage: 0, hp: 9999 }),
      api.spawnEnemyType('elite-brute', 790, 425, { speed: 0, damage: 0, hp: 9999, aura: null, ability: null })
    ];
    ids.forEach((id) => api.igniteEnemyById(id, 3000, 3));
  });
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: path.join(output, 'burn-portrait.png') });
  assert.deepEqual(errors, []);
  console.log(`Feedback comparison captured: ${output}`);
} finally {
  await browser.close();
  await stopTestServer(server.server);
}
