import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const profiles = ['novice', 'average', 'offense', 'evasive'];
let gameUrl;

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
  }
}

async function openScenario(browser, { seed, profile = 'average', rooster = 'ace' }) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const url = new URL(gameUrl);
  url.searchParams.set('seed', seed);
  url.searchParams.set('profile', profile);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
  await page.evaluate(({ selectedRooster, selectedProfile }) => {
    window.__ROOSTER_TEST__.selectRooster(selectedRooster);
    window.__ROOSTER_TEST__.pauseWaves();
    window.__ROOSTER_TEST__.enableBot(selectedProfile);
    window.__ROOSTER_TEST__.setPlayerLevel(4);
  }, { selectedRooster: rooster, selectedProfile: profile });
  return { page, errors };
}

async function captureDeterministicScenario(browser, seed, profile) {
  const { page, errors } = await openScenario(browser, { seed, profile });
  try {
    const result = await page.evaluate(() => ({
      initial: window.__ROOSTER_TEST__.getDeterminismSnapshot(),
      choices: window.__ROOSTER_TEST__.getUpgradeChoices(),
      safeSpawns: Array.from({ length: 8 }, () => window.__ROOSTER_TEST__.spawnSafeEnemyType())
        .map((spawn) => spawn && ({ x: spawn.x, y: spawn.y, distance: Math.round(spawn.distance) })),
      final: window.__ROOSTER_TEST__.getDeterminismSnapshot()
    }));
    assert(errors.length === 0, `Browser errors for deterministic ${profile} scenario.`, errors);
    return result;
  } finally {
    await page.close();
  }
}

async function testDeterminism(browser) {
  const scenarios = {};
  for (const profile of profiles) {
    const first = await captureDeterministicScenario(browser, 'phase-8-foundation', profile);
    const second = await captureDeterministicScenario(browser, 'phase-8-foundation', profile);
    assert(
      JSON.stringify(first) === JSON.stringify(second),
      `Seeded ${profile} profile is not deterministic.`,
      { first, second }
    );
    scenarios[profile] = first;
  }
  const alternate = await captureDeterministicScenario(browser, 'phase-8-alternate', 'average');
  assert(
    JSON.stringify(scenarios.average.safeSpawns) !== JSON.stringify(alternate.safeSpawns),
    'Different seeds produced identical spawn probes.',
    { baseline: scenarios.average.safeSpawns, alternate: alternate.safeSpawns }
  );
  return scenarios;
}

async function testTelemetryAndLoad(browser) {
  const { page, errors } = await openScenario(browser, {
    seed: 'phase-8-load',
    profile: 'offense',
    rooster: 'artillery'
  });
  try {
    const damageProbe = await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      const id = window.__ROOSTER_TEST__.spawnEnemyType('slime', 860, 450, {
        speed: 0,
        damage: 0,
        hp: 10,
        xp: 0
      });
      window.__ROOSTER_TEST__.damageEnemyById(id, 25);
      return window.__ROOSTER_TEST__.getTelemetry();
    });
    assert(damageProbe.damageBySource['test-api'] === 25, 'Damage source telemetry is missing.', damageProbe);
    assert(damageProbe.overkillBySource['test-api'] === 15, 'Overkill telemetry is incorrect.', damageProbe);
    assert(damageProbe.killsBySource['test-api'] === 1, 'Kill source telemetry is incorrect.', damageProbe);
    assert(damageProbe.ttkByEnemyType.slime?.count === 1, 'TTK telemetry is missing.', damageProbe);

    const fxBudget = await page.evaluate(() => window.__ROOSTER_TEST__.exerciseFxBudget(140));
    assert(fxBudget.saturated.active === fxBudget.saturated.limit, 'FX budget did not saturate at its limit.', fxBudget);
    assert(fxBudget.saturated.dropped === 50, 'FX budget did not count dropped effects.', fxBudget);
    assert(fxBudget.released.active === 0, 'FX budget leaked active effects.', fxBudget);

    const firstLoad = await page.evaluate(() => window.__ROOSTER_TEST__.spawnLoadScenario(100, 240));
    assert(firstLoad.enemies === 100, '100-enemy load scenario was not created.', firstLoad);
    assert(firstLoad.projectiles === 240, 'High-projectile load scenario was not created.', firstLoad);
    await page.waitForTimeout(1800);
    const loadedState = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(!loadedState.lastError && errors.length === 0, 'Load scenario produced runtime errors.', { loadedState, errors });
    assert(loadedState.telemetry.peakObjects.enemies >= 100, 'Enemy peak telemetry missed the load scenario.', loadedState.telemetry);
    assert(loadedState.telemetry.peakObjects.projectiles >= 200, 'Projectile peak telemetry missed the load scenario.', loadedState.telemetry);
    assert(loadedState.telemetry.frameTimes.p95Ms <= 34, 'Load scenario exceeded the 34ms p95 frame budget.', loadedState.telemetry.frameTimes);

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
    });
    const secondLoad = await page.evaluate(() => window.__ROOSTER_TEST__.spawnLoadScenario(100, 120));
    assert(secondLoad.pools.enemy.reused >= 100, 'Enemy pool did not reuse released objects.', secondLoad.pools);
    assert(secondLoad.pools.projectile.reused >= 120, 'Projectile pool did not reuse released objects.', secondLoad.pools);

    const hordeLoad = {};
    for (const enemyCount of [75, 110, 150]) {
      const spawned = await page.evaluate((count) => {
        window.__ROOSTER_TEST__.resetFrameTelemetry();
        return window.__ROOSTER_TEST__.spawnLoadScenario(count, 0, 'kornkrabbler');
      }, enemyCount);
      assert(spawned.enemies === enemyCount, `${enemyCount}-enemy horde scenario was not created.`, spawned);
      await page.waitForTimeout(1400);
      const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
      assert(!state.lastError && errors.length === 0,
        `${enemyCount}-enemy horde scenario produced runtime errors.`, { state, errors });
      assert(state.telemetry.frameTimes.p95Ms <= 34,
        `${enemyCount}-enemy horde exceeded the 34ms p95 frame budget.`, state.telemetry.frameTimes);
      assert(state.telemetry.peakMicroFodder >= enemyCount,
        `${enemyCount}-enemy horde was not recorded as micro-fodder.`, state.telemetry);
      hordeLoad[enemyCount] = {
        frameTimes: state.telemetry.frameTimes,
        pools: state.pools,
        peakMicroFodder: state.telemetry.peakMicroFodder
      };
    }
    return { damageProbe, fxBudget, firstLoad, loadedState, secondLoad, hordeLoad };
  } finally {
    await page.close();
  }
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const { server, url } = await ensureTestServer();
  gameUrl = url;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      deterministicScenarios: await testDeterminism(browser),
      telemetryAndLoad: await testTelemetryAndLoad(browser)
    };
    await fs.writeFile(
      path.join(artifactDir, 'foundation-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('Rooster foundation gate passed.');
    console.log(JSON.stringify({
      profiles: Object.keys(report.deterministicScenarios),
      frameTimes: report.telemetryAndLoad.loadedState.telemetry.frameTimes,
      peaks: report.telemetryAndLoad.loadedState.telemetry.peakObjects,
      reuse: report.telemetryAndLoad.secondLoad.pools.total,
      hordeLoad: report.telemetryAndLoad.hordeLoad
    }, null, 2));
  } finally {
    await stopTestServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
