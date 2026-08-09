import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
  }
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  try {
    await page.goto(`${serverState.url}?seed=phase-10-boss&profile=average`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState);
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.selectRooster('ace');
      window.__ROOSTER_TEST__.enableBot('average');
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      [
        'molotov-egg',
        'golden-egg',
        'double-shot',
        'faster-eggs',
        'faster-eggs',
        'fire-eggs',
        'fire-eggs',
        'support-chick',
        'lightning-comb'
      ].forEach((id) => window.__ROOSTER_TEST__.applyUpgradeById(id));
      window.__ROOSTER_TEST__.setPlayerCombatModifiers({ maxHp: 999 });
      window.__ROOSTER_TEST__.setPlayerHp(999);
      window.__ROOSTER_TEST__.startWave(10);
    });

    const startedAt = Date.now();
    while (Date.now() - startedAt < 90000) {
      await page.waitForTimeout(500);
      const ended = await page.evaluate(() => window.__ROOSTER_TEST__.getState().gameEnded);
      if (ended) break;
    }

    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const ttk = state.telemetry.ttkByEnemyType.boss?.averageMs ?? null;
    assert(errors.length === 0, 'Browser reported errors in boss scenario.', errors);
    assert(state.telemetry.outcome === 'victory', 'Representative build did not defeat the boss.', state.telemetry);
    assert(ttk !== null && ttk >= 45000 && ttk <= 70000, 'Boss TTK is outside 45-70 seconds.', {
      ttk,
      summary: state.telemetry
    });
    assert(state.telemetry.chestsFound === 1 && state.telemetry.chestChoices === 1,
      'Boss reward lane did not resolve.', state.telemetry);
    assert(state.telemetry.enemiesSpawned >= 26, 'Boss phases did not spawn their intended adds.', state.telemetry);

    const report = {
      generatedAt: new Date().toISOString(),
      outcome: state.telemetry.outcome,
      bossTtkMs: ttk,
      elapsedMs: state.telemetry.elapsedMs,
      enemiesSpawned: state.telemetry.enemiesSpawned,
      damageTaken: state.telemetry.damageTaken,
      damageTakenBySource: state.telemetry.damageTakenBySource,
      frameTimes: state.telemetry.frameTimes,
      peakObjects: state.telemetry.peakObjects
    };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'boss-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster boss gate passed.');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
