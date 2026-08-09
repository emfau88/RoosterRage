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

async function resolveSelections(page, limit = 20) {
  const states = [];
  for (let index = 0; index < limit; index += 1) {
    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getProgressionState());
    states.push(state);
    if (!state.choosingUpgrade) {
      break;
    }
    await page.evaluate(() => window.__ROOSTER_TEST__.resumeIfUpgradeOpen());
  }
  return states;
}

async function run() {
  const { chromium } = loadPlaywright();
  const serverState = await ensureTestServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  try {
    await page.goto(`${serverState.url}?seed=phase-10-pacing&profile=average`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getProgressionState);
    assert(
      await page.evaluate(() => window.__ROOSTER_TEST__.selectRooster('ace')),
      'Could not select Ace.'
    );
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.pauseWaves();
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
    });

    const multiLevel = await page.evaluate(() => window.__ROOSTER_TEST__.grantXp(280));
    assert(multiLevel.levelsGained === 3, '280 XP must award exactly three levels.', multiLevel);
    assert(multiLevel.choosingUpgrade, 'Multi-level XP did not open a selection.', multiLevel);
    assert(multiLevel.pendingLevelUps === 2, 'Remaining level-ups were not compactly queued.', multiLevel);
    const multiLevelSequence = await resolveSelections(page);
    const afterMultiLevel = await page.evaluate(() => window.__ROOSTER_TEST__.getProgressionState());
    assert(afterMultiLevel.regularChoices === 3, 'Queued selections were not resolved exactly once.', {
      multiLevelSequence,
      afterMultiLevel
    });

    await page.evaluate(() => window.__ROOSTER_TEST__.applyUpgradeById('fire-eggs'));
    const eliteChest = await page.evaluate(() => window.__ROOSTER_TEST__.startChestReward('elite'));
    assert(eliteChest.currentSelection?.type === 'chest', 'Elite reward did not use chest selection.', eliteChest);
    assert(eliteChest.choices.length === 3, 'Elite chest must offer three choices.', eliteChest);
    assert(
      eliteChest.choices.some((choice) => choice.rewardPriority === 'rank-up'),
      'Elite chest did not prioritize an owned upgrade rank.',
      eliteChest
    );
    await resolveSelections(page);

    const bossChest = await page.evaluate(() => window.__ROOSTER_TEST__.startChestReward('boss'));
    assert(bossChest.choices.length === 4, 'Boss chest must offer four choices.', bossChest);
    await resolveSelections(page);

    const beforeCap = await page.evaluate(() => window.__ROOSTER_TEST__.getProgressionState());
    await page.evaluate(() => window.__ROOSTER_TEST__.grantXp(20000));
    const capSequence = await resolveSelections(page);
    const capped = await page.evaluate(() => ({
      progression: window.__ROOSTER_TEST__.getProgressionState(),
      telemetry: window.__ROOSTER_TEST__.getTelemetry()
    }));
    assert(capped.progression.regularChoices === 11, 'Regular choice cap is not 11.', capped);
    assert(!capped.progression.choosingUpgrade, 'Selection remained open after reaching the cap.', capped);
    assert(capped.telemetry.upgradeChoices === 11, 'Telemetry choice count differs from run state.', capped);
    assert(capped.telemetry.chestsFound === 2 && capped.telemetry.chestChoices === 2,
      'Chest telemetry did not record elite and boss rewards.', capped);

    await page.evaluate(() => window.__ROOSTER_TEST__.restart());
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().choosingRooster);
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.selectRooster('ace');
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.startWave(10);
    });
    await page.waitForFunction(() => window.__ROOSTER_TEST__.getEnemySnapshot().some((enemy) => enemy.type === 'boss'));
    const bossSpawn = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getState(),
      boss: window.__ROOSTER_TEST__.getEnemySnapshot().find((enemy) => enemy.type === 'boss')
    }));
    assert(!bossSpawn.state.gameEnded, 'Wave cleared in the same frame as its boss spawn.', bossSpawn);
    await page.evaluate((id) => window.__ROOSTER_TEST__.damageEnemyById(id, 999999), bossSpawn.boss.id);
    await page.waitForFunction(() => window.__ROOSTER_TEST__.getState().choosingUpgrade);
    await resolveSelections(page);
    await page.waitForFunction(() => window.__ROOSTER_TEST__.getState().gameEnded);
    const bossCompletion = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(bossCompletion.telemetry.outcome === 'victory', 'Boss kill did not complete the run.', bossCompletion);
    assert(errors.length === 0, 'Browser reported errors during pacing test.', errors);

    const report = {
      generatedAt: new Date().toISOString(),
      multiLevel,
      afterMultiLevel,
      eliteChest,
      bossChest,
      beforeCap,
      capSteps: capSequence.length,
      final: capped,
      bossSpawn,
      bossCompletion: {
        outcome: bossCompletion.telemetry.outcome,
        kills: bossCompletion.telemetry.kills,
        chestsFound: bossCompletion.telemetry.chestsFound,
        chestsChosen: bossCompletion.telemetry.chestChoices
      }
    };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'pacing-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster pacing test passed.');
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
