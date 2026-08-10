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

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function openGame(context, serverUrl, suffix = '') {
  const page = await context.newPage();
  const errors = trackErrors(page);
  await page.goto(`${serverUrl}?seed=phase-16${suffix}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
  return { page, errors };
}

async function verifyFreshHub(context, serverUrl) {
  const { page, errors } = await openGame(context, serverUrl, '-fresh');
  try {
    await page.evaluate(() => window.__ROOSTER_TEST__.resetMetaProgress());
    await page.waitForTimeout(50);
    const snapshot = await page.evaluate(() => {
      const panel = document.querySelector('.henhouse-panel').getBoundingClientRect();
      const overlay = document.querySelector('.overlay');
      const hub = window.__ROOSTER_TEST__.getMetaHub();
      return {
        title: document.querySelector('.henhouse-panel h1')?.textContent,
        roosterCards: document.querySelectorAll('.rooster-card').length,
        enabledRoosters: document.querySelectorAll('.rooster-card:not(:disabled)').length,
        challengeCards: document.querySelectorAll('.challenge-card').length,
        enabledChallenges: document.querySelectorAll('.challenge-card:not(:disabled)').length,
        enemyEntries: hub.lexicon.enemies.length,
        evolutionEntries: hub.lexicon.evolutions.length,
        state: window.__ROOSTER_TEST__.getMetaState(),
        layout: {
          left: panel.left,
          right: panel.right,
          width: panel.width,
          scrollHeight: overlay.scrollHeight,
          clientHeight: overlay.clientHeight,
          bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        }
      };
    });
    assert(snapshot.title === 'Hennenhuette', 'The Hennenhuette hub is not visible.', snapshot);
    assert(snapshot.roosterCards === 3 && snapshot.enabledRoosters === 1,
      'Fresh progression must offer only the Ace.', snapshot);
    assert(snapshot.challengeCards === 4 && snapshot.enabledChallenges === 1,
      'Fresh progression must offer only Standard Run.', snapshot);
    assert(snapshot.enemyEntries >= 12 && snapshot.evolutionEntries === 11,
      'The enemy or EVO lexicon is incomplete.', snapshot);
    assert(snapshot.state.totalRuns === 0 && snapshot.state.unlockedRoosters.join(',') === 'ace',
      'Fresh progression is not deterministic.', snapshot.state);
    assert(snapshot.layout.left >= 0 && snapshot.layout.right <= 390 && snapshot.layout.bodyOverflow <= 0,
      'The portrait Hennenhuette overflows horizontally.', snapshot.layout);
    assert(snapshot.layout.scrollHeight > snapshot.layout.clientHeight,
      'The portrait hub should provide a vertically scrollable layout.', snapshot.layout);
    assert(errors.length === 0, 'Browser errors in the fresh hub.', errors);
    await fs.mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactDir, 'henhouse-portrait.png'), fullPage: true });
    return snapshot;
  } finally {
    await page.close();
  }
}

async function verifyUnlocksAndPersistence(context, serverUrl) {
  const { page, errors } = await openGame(context, serverUrl, '-unlock');
  try {
    const recorded = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const newUnlocks = api.recordMetaRun({
        build: {
          active: [],
          passive: [],
          evolutions: [{ id: 'evo-sunshot-array', name: 'Sunshot Array' }]
        }
      });
      return { newUnlocks, state: api.getMetaState(), hub: api.getMetaHub() };
    });
    assert(recorded.state.totalRuns === 1 && recorded.state.victories === 1
      && recorded.state.totalKills === 180 && recorded.state.bossDefeats === 1,
    'A completed run was not recorded correctly.', recorded);
    assert(recorded.state.history.length === 1
      && recorded.state.bests.highestKills === 180
      && recorded.state.bests.fastestVictoryMs === 480000,
    'History or personal bests are incorrect.', recorded.state);
    assert(recorded.state.unlockedRoosters.length === 3
      && recorded.state.unlockedChallenges.length === 4
      && recorded.state.unlockedCosmetics.includes('ace-sunrise'),
    'A clear unlock target did not unlock after the run.', recorded.state);
    assert(recorded.newUnlocks.length >= 6,
      'The run did not return a complete unlock summary.', recorded.newUnlocks);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
    const persisted = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getMetaState(),
      enabledRoosters: document.querySelectorAll('.rooster-card:not(:disabled)').length,
      enabledChallenges: document.querySelectorAll('.challenge-card:not(:disabled)').length,
      historyRows: document.querySelectorAll('.history-list li').length,
      selected: window.__ROOSTER_TEST__.selectMetaCosmetic('ace', 'ace-sunrise')
    }));
    assert(persisted.state.totalRuns === 1 && persisted.state.history.length === 1,
      'Meta progression did not persist across reload.', persisted);
    assert(persisted.enabledRoosters === 3 && persisted.enabledChallenges === 4
      && persisted.historyRows === 1 && persisted.selected,
    'The unlocked hub did not render the persisted state.', persisted);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
    const cosmetic = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('ace');
      return {
        visual: api.getRoosterVisualState(),
        selected: api.getMetaState().selectedCosmetics.ace
      };
    });
    assert(cosmetic.selected === 'ace-sunrise' && cosmetic.visual.tint === 0xffe29a,
      'The selected cosmetic is not persisted or applied.', cosmetic);
    assert(errors.length === 0, 'Browser errors in unlock/persistence gate.', errors);
    return recorded;
  } finally {
    await page.close();
  }
}

async function verifyChallenge(context, serverUrl, id, expectedArena) {
  const { page, errors } = await openGame(context, serverUrl, `-${id}&challenge=${id}`);
  try {
    const snapshot = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('ace');
      api.pauseWaves();
      return {
        state: api.getState(),
        challenge: api.getChallengeState(),
        player: api.getPlayerStats(),
        wave: api.getWaveCatalog()[0],
        probe: api.getChallengeProbe(),
        waveLabel: document.querySelector('[data-wave] [data-value]')?.textContent
      };
    });
    assert(snapshot.challenge.id === id && snapshot.state.challengeId === id
      && snapshot.state.arenaId === expectedArena,
    `${id} did not select its curated arena.`, snapshot);
    assert(snapshot.waveLabel.includes(snapshot.challenge.name),
      `${id} is not visible in the combat HUD.`, snapshot);
    assert(errors.length === 0, `Browser errors in ${id}.`, errors);
    return snapshot;
  } finally {
    await page.close();
  }
}

async function verifyChallenges(context, serverUrl) {
  const rush = await verifyChallenge(context, serverUrl, 'rush-hour', 'vertical-run');
  const feather = await verifyChallenge(context, serverUrl, 'featherweight', 'square-coop');
  const royal = await verifyChallenge(context, serverUrl, 'royal-gauntlet', 'open-yard');

  assert(rush.wave.targetDuration.join(',') === '18,23'
    && rush.probe.modified.slime.speed === Math.round(rush.probe.raw.slime.speed * 1.12),
  'Rush Hour did not apply its explicit pacing modifiers.', rush);
  assert(feather.player.maxHp === 72 && feather.player.speed === 235
    && feather.player.projectileDamage === 23,
  'Featherweight did not apply its explicit player tradeoff.', feather.player);
  assert(feather.probe.modified.slime.damage === Math.round(feather.probe.raw.slime.damage * 1.15),
    'Featherweight did not increase enemy damage.', feather.probe);
  assert(royal.probe.modified.slime.hp === Math.round(royal.probe.raw.slime.hp * 1.18)
    && royal.probe.modified.elite.hp === Math.round(royal.probe.raw.elite.hp * 1.18 * 1.22)
    && royal.probe.modified.boss.ability.damage
      === Math.round(royal.probe.raw.boss.abilityDamage * 1.12)
    && royal.probe.modified.boss.heavyProjectile.damage
      === Math.round(royal.probe.raw.boss.heavyDamage * 1.12)
    && royal.probe.modified.wave.targetDuration.join(',') === '23,32',
  'Royal Gauntlet did not apply its enemy/elite pressure modifiers.', royal.probe);

  const { page, errors } = await openGame(context, serverUrl, '-standard&challenge=standard');
  try {
    const base = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('ace');
      return api.getPlayerStats();
    });
    assert(base.maxHp === 100 && base.speed === 210 && base.projectileDamage === 20,
      'Horizontal meta progression changed Standard Run combat stats.', base);
    assert(errors.length === 0, 'Browser errors in Standard Run baseline.', errors);
    return { rush, feather, royal, base };
  } finally {
    await page.close();
  }
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      fresh: await verifyFreshHub(context, serverState.url),
      progression: await verifyUnlocksAndPersistence(context, serverState.url),
      challenges: await verifyChallenges(context, serverState.url)
    };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'meta-gate.json'), JSON.stringify(report, null, 2));
    console.log('Rooster meta/challenge gate passed.');
    console.log(JSON.stringify({
      roosters: report.progression.state.unlockedRoosters,
      challenges: report.progression.state.unlockedChallenges,
      cosmetics: report.progression.state.unlockedCosmetics,
      history: report.progression.state.history.length,
      lexicon: {
        enemies: report.fresh.enemyEntries,
        evolutions: report.fresh.evolutionEntries
      }
    }, null, 2));
  } finally {
    await context.close();
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
