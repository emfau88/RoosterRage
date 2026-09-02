import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from '../tests/helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'docs', 'qa', 'rooster-final-v1', 'in-game');
const roosters = [
  { id: 'ace', label: 'Ace / Ass', upgrade: 'golden-egg' },
  { id: 'artillery', label: 'Bummbert', upgrade: 'rocket-egg' },
  { id: 'storm', label: 'Blitzkamm', upgrade: 'lightning-comb' }
];
const viewports = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'mobile', width: 390, height: 844 }
];

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function captureRooster(browser, serverUrl, rooster, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = trackErrors(page);
  const url = new URL(serverUrl);
  url.searchParams.set('roosterVisual', 'final');
  url.searchParams.set('seed', `final-${rooster.id}-${viewport.id}`);
  url.searchParams.set('profile', 'manual');

  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 8000 });
  await page.evaluate(({ roosterId, upgradeId }) => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster(roosterId);
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
    api.movePlayer(700, 450);
    api.setPlayerCombatModifiers({ maxHp: 999, armor: 999, regenPerSecond: 20 });
    api.setPlayerHp(999);
    api.applyUpgradeById(upgradeId);

    const ring = [
      [-210, -95], [-150, -155], [-55, -185], [55, -185], [150, -155], [210, -95],
      [235, 10], [205, 120], [120, 175], [0, 195], [-120, 175], [-205, 120],
      [-235, 10], [-120, -80], [125, -75]
    ];
    ring.forEach(([dx, dy], index) => api.spawnEnemyType(
      index === 7 ? 'brute' : 'slime',
      700 + dx,
      450 + dy,
      { speed: 0, damage: 0, hp: 9999, xpOverride: 0 }
    ));
  }, { roosterId: rooster.id, upgradeId: rooster.upgrade });

  // Hold an actual movement input long enough to expose the walk cycle in the
  // same render/update path used by live play, while combat continues around it.
  await page.keyboard.down('d');
  await page.waitForTimeout(rooster.id === 'storm' ? 350 : 430);
  const visualState = await page.evaluate(() => window.__ROOSTER_TEST__.getRoosterVisualState());
  const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
  const fileName = `${rooster.id}-final-${viewport.id}-combat.png`;
  await page.screenshot({ path: path.join(artifactDir, fileName) });
  await page.keyboard.up('d');
  await context.close();

  if (errors.length) {
    throw new Error(`${rooster.label} (${viewport.id}) browser errors:\n${errors.join('\n')}`);
  }

  return {
    rooster: rooster.id,
    label: rooster.label,
    viewport: viewport.id,
    dimensions: { width: viewport.width, height: viewport.height },
    file: fileName,
    choosingRooster: state.choosingRooster,
    visualState
  };
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const rooster of roosters) {
      for (const viewport of viewports) {
        results.push(await captureRooster(browser, serverState.url, rooster, viewport));
      }
    }
    const report = {
      generatedAt: new Date().toISOString(),
      url: `${serverState.url}?roosterVisual=final`,
      results
    };
    await fs.writeFile(
      path.join(artifactDir, 'capture-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(`Captured ${results.length} final in-game checks in ${artifactDir}.`);
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
