import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
const mode = process.argv.includes('--soak')
  ? 'soak'
  : process.argv.includes('--telegraphs') ? 'telegraphs' : 'matrix';
const challengeIds = ['standard', 'rush-hour', 'featherweight', 'royal-gauntlet'];
const arenaIds = ['open-yard', 'vertical-run', 'square-coop'];
const viewports = [
  { id: 'desktop', width: 960, height: 540 },
  { id: 'portrait', width: 390, height: 844 },
  { id: 'landscape', width: 844, height: 390 }
];
const soakDurationMs = Math.max(600000, Number(process.env.ACCEPTANCE_SOAK_MS ?? 600000));

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
  }
}

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function openGame(browser, serverUrl, seed, viewport = viewports[1], params = {}) {
  const page = await browser.newPage({ viewport });
  const errors = trackErrors(page);
  const url = new URL(serverUrl);
  url.searchParams.set('seed', seed);
  url.searchParams.set('profile', params.profile ?? 'average');
  if (params.arena) url.searchParams.set('arena', params.arena);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
  return { page, errors };
}

async function selectChallenge(page, challengeId) {
  await page.evaluate((id) => {
    const api = window.__ROOSTER_TEST__;
    api.unlockAllMeta();
    api.selectMetaChallenge(id);
    api.restart();
  }, challengeId);
  await page.waitForFunction((id) => (
    window.__ROOSTER_TEST__?.getChallengeState().id === id
  ), challengeId, { timeout: 5000 });
}

async function verifyChallengeScenario(browser, serverUrl, rooster, challengeId, archetype) {
  const { page, errors } = await openGame(
    browser,
    serverUrl,
    `phase-17-${rooster.id}-${challengeId}`
  );
  try {
    await selectChallenge(page, challengeId);
    await page.evaluate(({ roosterId, upgrades }) => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster(roosterId);
      upgrades.forEach((id) => api.applyUpgradeById(id));
      api.setPlayerCombatModifiers({ armor: 1000, regenPerSecond: 20 });
      api.enableBot('average');
    }, { roosterId: rooster.id, upgrades: archetype.upgrades });
    await page.waitForTimeout(2600);
    const snapshot = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getState(),
      challenge: window.__ROOSTER_TEST__.getChallengeState(),
      arena: window.__ROOSTER_TEST__.getArenaState(),
      loadout: window.__ROOSTER_TEST__.getLoadout(),
      enemies: window.__ROOSTER_TEST__.getEnemySnapshot()
    }));
    assert(snapshot.state.frames >= 90 && snapshot.state.shots > 0
      && snapshot.state.telemetry.enemiesSpawned > 0,
    `${rooster.id}/${challengeId} did not enter active combat.`, snapshot.state);
    assert(snapshot.challenge.id === challengeId && snapshot.state.challengeId === challengeId,
      `${rooster.id}/${challengeId} lost its challenge identity.`, snapshot);
    assert(snapshot.state.roosterId === rooster.id && snapshot.loadout.active.length >= 1,
      `${rooster.id}/${challengeId} lost its rooster or build.`, snapshot);
    assert(!snapshot.state.gameEnded && !snapshot.state.lastError && snapshot.state.playerHp > 0,
      `${rooster.id}/${challengeId} failed its survivability/runtime check.`, snapshot.state);
    assert(snapshot.state.telemetry.frameTimes.p95Ms <= 34
      && snapshot.state.telemetry.droppedObjects === 0,
    `${rooster.id}/${challengeId} exceeded the portrait performance budget.`, snapshot.state.telemetry);
    assert(errors.length === 0, `Browser errors in ${rooster.id}/${challengeId}.`, errors);
    return {
      rooster: rooster.id,
      challenge: challengeId,
      archetype: archetype.id,
      arena: snapshot.arena.id,
      frames: snapshot.state.frames,
      enemiesSpawned: snapshot.state.telemetry.enemiesSpawned,
      shots: snapshot.state.shots,
      hits: snapshot.state.hits,
      frameP95: snapshot.state.telemetry.frameTimes.p95Ms
    };
  } finally {
    await page.close();
  }
}

async function verifyChallengeMatrix(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'phase-17-catalog');
  let roosters;
  try {
    roosters = await page.evaluate(() => window.__ROOSTER_TEST__.getRoosterCatalog());
    assert(roosters.length === 3 && roosters.every((rooster) => rooster.archetypes.length === 3),
      'The acceptance catalog must contain three roosters and nine archetypes.', roosters);
    assert(errors.length === 0, 'Browser errors while reading the acceptance catalog.', errors);
  } finally {
    await page.close();
  }

  const results = [];
  for (const rooster of roosters) {
    for (let index = 0; index < challengeIds.length; index += 1) {
      results.push(await verifyChallengeScenario(
        browser,
        serverUrl,
        rooster,
        challengeIds[index],
        rooster.archetypes[index % rooster.archetypes.length]
      ));
    }
  }
  assert(new Set(results.map((entry) => entry.archetype)).size === 9,
    'The challenge matrix did not exercise all nine archetypes.', results);
  return results;
}

async function verifyArenaScenario(browser, serverUrl, roosterId, arenaId) {
  const { page, errors } = await openGame(
    browser,
    serverUrl,
    `phase-17-${roosterId}-${arenaId}`,
    viewports[0],
    { arena: arenaId }
  );
  try {
    await page.evaluate((id) => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster(id);
      api.setPlayerCombatModifiers({ armor: 1000 });
      api.enableBot('average');
    }, roosterId);
    await page.waitForTimeout(1300);
    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(state.arenaId === arenaId && state.roosterId === roosterId
      && state.frames >= 45 && state.telemetry.enemiesSpawned > 0,
    `${roosterId}/${arenaId} did not run on the requested topology.`, state);
    assert(!state.lastError && errors.length === 0,
      `Runtime error in ${roosterId}/${arenaId}.`, { state, errors });
    return {
      rooster: roosterId,
      arena: arenaId,
      frames: state.frames,
      frameP95: state.telemetry.frameTimes.p95Ms
    };
  } finally {
    await page.close();
  }
}

async function verifyArenaMatrix(browser, serverUrl) {
  const results = [];
  for (const rooster of ['ace', 'artillery', 'storm']) {
    for (const arena of arenaIds) {
      results.push(await verifyArenaScenario(browser, serverUrl, rooster, arena));
    }
  }
  return results;
}

async function verifyViewportLoad(browser, serverUrl, viewport) {
  const { page, errors } = await openGame(
    browser,
    serverUrl,
    `phase-17-load-${viewport.id}`,
    viewport,
    { profile: 'offense' }
  );
  try {
    const initialFrames = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('artillery');
      api.pauseWaves();
      api.setPlayerCombatModifiers({ armor: 1000 });
      api.spawnLoadScenario(110, 260);
      return api.getState().frames;
    });
    await page.waitForTimeout(2600);
    const snapshot = await page.evaluate(() => {
      const state = window.__ROOSTER_TEST__.getState();
      const hud = document.querySelector('.hud').getBoundingClientRect();
      return {
        state,
        hud: { left: hud.left, right: hud.right, top: hud.top, bottom: hud.bottom },
        documentWidth: document.documentElement.scrollWidth
      };
    });
    assert(snapshot.state.frames - initialFrames >= 90 && !snapshot.state.lastError,
      `${viewport.id} load scenario froze or errored.`, snapshot.state);
    assert(snapshot.state.telemetry.peakObjects.enemies >= 100
      && snapshot.state.telemetry.peakObjects.projectiles >= 200,
    `${viewport.id} load scenario did not reach maximum pressure.`, snapshot.state.telemetry);
    assert(snapshot.state.telemetry.frameTimes.p95Ms <= 34,
      `${viewport.id} load scenario exceeded 34 ms p95.`, snapshot.state.telemetry.frameTimes);
    assert(snapshot.hud.left >= 0 && snapshot.hud.right <= viewport.width
      && snapshot.documentWidth <= viewport.width,
    `${viewport.id} load scenario overflowed the viewport.`, snapshot);
    assert(errors.length === 0, `Browser errors under ${viewport.id} load.`, errors);
    await fs.mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactDir, `acceptance-load-${viewport.id}.png`) });
    return {
      viewport: viewport.id,
      frameTimes: snapshot.state.telemetry.frameTimes,
      peaks: snapshot.state.telemetry.peakObjects,
      pools: snapshot.state.pools
    };
  } finally {
    await page.close();
  }
}

async function verifyTelegraphAvoidance(browser, serverUrl) {
  const { page, errors } = await openGame(
    browser,
    serverUrl,
    'phase-17-danger-zone',
    viewports[1],
    { profile: 'average' }
  );
  try {
    const warning = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('storm');
      api.pauseWaves();
      api.clearEnemies();
      api.clearProjectiles();
      api.movePlayer(700, 450);
      api.enableBot('average');
      const id = api.spawnEnemyType('bomber', 750, 450, {
        hp: 1,
        speed: 0,
        damage: 0,
        xpOverride: 0
      });
      api.damageEnemyById(id, 1);
      return api.getState();
    });
    assert(warning.enemyDangerZones === 1,
      'Bomber death did not expose its visible warning as a danger zone.', warning);
    await page.waitForTimeout(650);
    const escaped = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const distance = Math.hypot(escaped.player.x - 750, escaped.player.y - 450);
    assert(distance > 70 && escaped.telemetry.damageTaken === 0,
      'Average movement did not leave the announced bomber radius.', { escaped, distance });

    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.clearProjectiles();
      api.movePlayer(700, 450);
      api.spawnEnemyType('elite-runner', 450, 450, {
        hp: 9999,
        speed: 0,
        damage: 25,
        xpOverride: 0
      });
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__.getState().enemyDangerZones > 0);
    await page.waitForTimeout(320);
    const dash = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    const dashOffset = Math.abs(dash.player.y - 450);
    assert(dashOffset > 52 && dash.telemetry.damageTaken === 0,
      'Average movement did not leave the announced elite dash line.', { dash, dashOffset });
    await page.evaluate(() => window.__ROOSTER_TEST__.disableBot());
    await page.waitForTimeout(2000);
    const expired = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(expired.enemyDangerZones === 0,
      'Expired enemy warning zones accumulated without bot cleanup.', expired);
    assert(errors.length === 0, 'Browser errors in telegraph-avoidance gate.', errors);
    return {
      bomberDistance: distance,
      dashOffset,
      damageTaken: dash.telemetry.damageTaken,
      frames: dash.frames
    };
  } finally {
    await page.close();
  }
}

async function runMatrix(browser, serverUrl) {
  const challengeMatrix = await verifyChallengeMatrix(browser, serverUrl);
  const arenaMatrix = await verifyArenaMatrix(browser, serverUrl);
  const viewportLoad = [];
  for (const viewport of viewports) {
    viewportLoad.push(await verifyViewportLoad(browser, serverUrl, viewport));
  }
  const telegraphAvoidance = await verifyTelegraphAvoidance(browser, serverUrl);
  return { challengeMatrix, arenaMatrix, viewportLoad, telegraphAvoidance };
}

async function runSoak(browser, serverUrl) {
  const { page, errors } = await openGame(
    browser,
    serverUrl,
    'phase-17-ten-minute-soak',
    viewports[1],
    { profile: 'average' }
  );
  const samples = [];
  try {
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('storm');
      api.pauseWaves();
      api.setPlayerCombatModifiers({ armor: 1000 });
      api.spawnLoadScenario(100, 240);
    });
    const startedAt = Date.now();
    let cycle = 0;
    let previousFrames = -1;
    while (Date.now() - startedAt < soakDurationMs) {
      await page.waitForTimeout(10000);
      cycle += 1;
      const sample = await page.evaluate((index) => {
        const api = window.__ROOSTER_TEST__;
        const before = api.getState();
        const load = api.spawnLoadScenario(100 - (index % 3) * 10, 240 - (index % 2) * 40);
        const after = api.getState();
        return {
          cycle: index,
          frames: after.frames,
          lastError: after.lastError,
          frameTimes: after.telemetry.frameTimes,
          peaks: after.telemetry.peakObjects,
          droppedObjects: after.telemetry.droppedObjects,
          pools: load.pools,
          activeBeforeRecycle: before.pools.total.active
        };
      }, cycle);
      assert(sample.frames > previousFrames && !sample.lastError,
        `The soak froze or errored at cycle ${cycle}.`, sample);
      assert(sample.pools.total.created <= 380,
        `Object pools grew after warm-up at cycle ${cycle}.`, sample.pools);
      previousFrames = sample.frames;
      samples.push(sample);
      if (cycle % 3 === 0) {
        console.log(`Soak ${(Date.now() - startedAt) / 60000 | 0} min: ${cycle} recycle cycles, ${sample.frames} frames.`);
      }
    }
    const final = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.clearProjectiles();
      return api.getState();
    });
    assert(Date.now() - startedAt >= 600000,
      'The required real ten-minute soak duration was not reached.', { elapsedMs: Date.now() - startedAt });
    assert(final.telemetry.frameTimes.p95Ms <= 34 && !final.lastError,
      'The ten-minute soak exceeded its frame/runtime budget.', final.telemetry);
    assert(final.pools.total.created <= 380 && final.pools.total.reused > 1000,
      'The ten-minute soak did not demonstrate bounded reuse.', final.pools);
    assert(errors.length === 0, 'Browser errors during ten-minute soak.', errors);
    await fs.mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactDir, 'acceptance-soak-final.png') });
    return {
      durationMs: Date.now() - startedAt,
      cycles: cycle,
      samples,
      final: {
        frames: final.frames,
        frameTimes: final.telemetry.frameTimes,
        peaks: final.telemetry.peakObjects,
        pools: final.pools,
        droppedObjects: final.telemetry.droppedObjects
      }
    };
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
    const report = {
      generatedAt: new Date().toISOString(),
      mode,
      result: mode === 'soak'
        ? await runSoak(browser, serverState.url)
        : mode === 'telegraphs'
          ? await verifyTelegraphAvoidance(browser, serverState.url)
          : await runMatrix(browser, serverState.url)
    };
    await fs.writeFile(
      path.join(artifactDir, `acceptance-${mode}-report.json`),
      JSON.stringify(report, null, 2)
    );
    if (mode === 'soak') {
      console.log('Rooster ten-minute soak gate passed.');
      console.log(JSON.stringify({
        durationMs: report.result.durationMs,
        cycles: report.result.cycles,
        frameTimes: report.result.final.frameTimes,
        pools: report.result.final.pools.total
      }, null, 2));
    } else if (mode === 'matrix') {
      console.log('Rooster vertical-slice acceptance matrix passed.');
      console.log(JSON.stringify({
        challengeScenarios: report.result.challengeMatrix.length,
        archetypes: new Set(report.result.challengeMatrix.map((entry) => entry.archetype)).size,
        arenaScenarios: report.result.arenaMatrix.length,
        telegraphAvoidance: report.result.telegraphAvoidance,
        viewports: report.result.viewportLoad.map((entry) => ({
          id: entry.viewport,
          p95Ms: entry.frameTimes.p95Ms,
          peakObjects: entry.peaks.total
        }))
      }, null, 2));
    } else {
      console.log('Rooster telegraph-avoidance gate passed.');
      console.log(JSON.stringify(report.result, null, 2));
    }
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
