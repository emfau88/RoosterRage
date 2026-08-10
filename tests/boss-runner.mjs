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
    const encounterEvents = await page.evaluate(() => window.__ROOSTER_TEST__.getEncounterEvents());
    const ttk = state.telemetry.ttkByEnemyType.boss?.averageMs ?? null;
    assert(errors.length === 0, 'Browser reported errors in boss scenario.', errors);
    assert(state.telemetry.outcome === 'victory', 'Representative build did not defeat the boss.', state.telemetry);
    assert(ttk !== null && ttk >= 55000 && ttk <= 75000, 'Boss TTK is outside 55-75 seconds.', {
      ttk,
      summary: state.telemetry
    });
    assert(state.telemetry.chestsFound === 1 && state.telemetry.chestChoices === 1,
      'Boss reward lane did not resolve.', state.telemetry);
    assert(state.telemetry.enemiesSpawned >= 13, 'Boss phases did not spawn their intended capped adds.', state.telemetry);
    assert(state.telemetry.maxEnemiesAlive <= 7, 'Boss encounter exceeded boss plus six simultaneous adds.', state.telemetry);
    const sequenceStarts = encounterEvents.filter((event) => event.type === 'bossSequenceStepStarted');
    const phaseOneAttacks = sequenceStarts
      .filter((event) => event.phase === 1 && ['fan', 'fireball'].includes(event.step))
      .map((event) => event.step);
    assert(phaseOneAttacks.slice(0, 2).join(',') === 'fan,fireball',
      'Phase one did not teach fan before fireball.', phaseOneAttacks);
    assert(encounterEvents.filter((event) => event.type === 'bossProjectilesCleared').length === 2,
      'Boss phase transitions did not clear prior projectiles.', encounterEvents);
    assert(sequenceStarts.some((event) => event.phase === 3 && event.step === 'dash'),
      'Final boss phase never executed its charge step.', sequenceStarts);

    const report = {
      generatedAt: new Date().toISOString(),
      outcome: state.telemetry.outcome,
      bossTtkMs: ttk,
      elapsedMs: state.telemetry.elapsedMs,
      enemiesSpawned: state.telemetry.enemiesSpawned,
      damageTaken: state.telemetry.damageTaken,
      damageTakenBySource: state.telemetry.damageTakenBySource,
      sequenceStarts,
      enemyProjectiles: {
        average: state.telemetry.averageEnemyProjectiles,
        peak: state.telemetry.peakEnemyProjectiles,
        peakHazards: state.telemetry.peakEnemyHazards,
        hitsTaken: state.telemetry.projectileHitsTaken,
        damageTaken: state.telemetry.projectileDamageTaken,
        deaths: state.telemetry.projectileDeaths
      },
      combatSources: state.telemetry.combatSources,
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
