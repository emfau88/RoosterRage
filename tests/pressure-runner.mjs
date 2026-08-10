import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const roosterIds = ['ace', 'artillery', 'storm'];

function assert(condition, message, details) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
}

async function runRooster(browser, serverUrl, roosterId) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    await page.goto(`${serverUrl}?seed=phase-c-${roosterId}&profile=average&arena=open-yard`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.startWave);
    await page.evaluate((selectedRooster) => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster(selectedRooster);
      api.pauseWaves();
      api.clearEnemies();
      api.clearProjectiles();
      [
        `primary-${selectedRooster}-rank`,
        `primary-${selectedRooster}-rank`,
        `primary-${selectedRooster}-rank`,
        'golden-egg',
        'golden-egg',
        'orbit-eggs',
        'orbit-eggs',
        'faster-eggs',
        'armor',
        'max-hp',
        'regen'
      ].forEach((upgrade) => api.applyUpgradeById(upgrade));
      api.enableBot('average');
      api.startWave(7);
    }, roosterId);

    const startedAt = Date.now();
    while (Date.now() - startedAt < 42000) {
      await page.waitForTimeout(500);
      const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
      const wave = state.telemetry.waves.find((entry) => entry.wave === 7);
      if (state.gameEnded || wave?.outcome === 'completed') break;
    }
    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const wave = state.telemetry.waves.find((entry) => entry.wave === 7);
    const result = {
      roosterId,
      outcome: state.telemetry.outcome,
      waveOutcome: wave?.outcome ?? 'missing',
      elapsedMs: wave?.durationMs ?? 0,
      averageEnemyProjectiles: wave?.averageEnemyProjectiles ?? 0,
      peakEnemyProjectiles: wave?.peakEnemyProjectiles ?? 0,
      peakEnemyHazards: wave?.peakEnemyHazards ?? 0,
      averagePlayerSpeed: state.telemetry.averagePlayerSpeed,
      distanceTravelled: state.telemetry.playerDistanceTravelled,
      damageTaken: wave?.damageTaken ?? 0,
      deathCause: state.telemetry.deathCause,
      deferredAttacks: state.telemetry.enemyAttacksDeferred,
      errors
    };
    assert(wave && errors.length === 0 && !state.lastError,
      `${roosterId} pressure run had a runtime failure.`, result);
    assert(result.peakEnemyProjectiles <= 12 && result.averageEnemyProjectiles <= 10,
      `${roosterId} exceeded normal projectile pressure targets.`, result);
    assert(result.averagePlayerSpeed >= 45,
      `${roosterId} did not show sustained movement under wave pressure.`, result);
    await page.screenshot({ path: path.join(artifactDir, `phase-c-pressure-${roosterId}.png`) });
    return result;
  } finally {
    await page.close();
  }
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const results = await Promise.all(roosterIds.map((id) => runRooster(browser, serverState.url, id)));
    const report = { generatedAt: new Date().toISOString(), viewport: [390, 844], wave: 7, results };
    await fs.writeFile(
      path.join(artifactDir, 'phase-c-pressure-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('Phase C pressure gate passed.');
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
