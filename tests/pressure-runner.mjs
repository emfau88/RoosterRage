import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const roosterIds = (process.env.PRESSURE_ROOSTERS ?? 'ace,artillery,storm').split(',');
const pressureWave = Number(process.env.PRESSURE_WAVE ?? 7);
const WAVE_TIMEOUT_MS = pressureWave === 6 ? 65000 : 55000;

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
    await page.evaluate(({ selectedRooster, wave }) => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster(selectedRooster);
      api.pauseWaves();
      api.clearEnemies();
      api.clearProjectiles();
      const ranks = wave === 6 ? [
        `primary-${selectedRooster}-rank`,
        `primary-${selectedRooster}-rank`,
        'golden-egg', 'orbit-eggs', 'faster-eggs', 'armor', 'max-hp', 'regen'
      ] : [
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
      ];
      ranks.forEach((upgrade) => api.applyUpgradeById(upgrade));
      api.enableBot('average');
      api.startWave(wave);
    }, { selectedRooster: roosterId, wave: pressureWave });

    const startedAt = Date.now();
    while (Date.now() - startedAt < WAVE_TIMEOUT_MS) {
      await page.waitForTimeout(500);
      const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
      const wave = state.telemetry.waves.find((entry) => entry.wave === pressureWave);
      if (state.gameEnded || wave?.outcome === 'completed') break;
    }
    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const wave = state.telemetry.waves.find((entry) => entry.wave === pressureWave);
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
      gameEnded: state.gameEnded,
      timedOut: !state.gameEnded && wave?.outcome !== 'completed',
      errors
    };
    if (result.timedOut) {
      result.remaining = await page.evaluate(() => ({
        enemies: window.__ROOSTER_TEST__.getEnemySnapshot(),
        player: window.__ROOSTER_TEST__.getState().player,
        director: window.__ROOSTER_TEST__.getSpawnDirectorState()
      }));
    }
    assert(wave && errors.length === 0 && !state.lastError,
      `${roosterId} pressure run had a runtime failure.`, result);
    assert(result.waveOutcome === 'completed',
      `${roosterId} did not complete Wave ${pressureWave} before the pressure timeout.`, result);
    assert(result.peakEnemyProjectiles <= 12 && result.averageEnemyProjectiles <= 10,
      `${roosterId} exceeded normal projectile pressure targets.`, result);
    assert(result.averagePlayerSpeed >= 45,
      `${roosterId} did not show sustained movement under wave pressure.`, result);
    const screenshot = pressureWave === 7 ? `phase-c-pressure-${roosterId}.png`
      : `phase-c-pressure-wave-${pressureWave}-${roosterId}.png`;
    await page.screenshot({ path: path.join(artifactDir, screenshot) });
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
    // Measure the introduction with one active game at a time. Multiple
    // simultaneous headless games perturb frame timing and bot trajectories.
    const results = [];
    if (pressureWave === 6) {
      for (const id of roosterIds) results.push(await runRooster(browser, serverState.url, id));
    } else {
      results.push(...await Promise.all(roosterIds.map((id) => runRooster(browser, serverState.url, id))));
    }
    const report = { generatedAt: new Date().toISOString(), viewport: [390, 844], wave: pressureWave, results };
    await fs.writeFile(
      path.join(artifactDir, pressureWave === 7 ? 'phase-c-pressure-report.json' : `pressure-wave-${pressureWave}-report.json`),
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
