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
        talentNodes: document.querySelectorAll('.talent-node').length,
        talentTiers: document.querySelectorAll('.talent-tier').length,
        masteryBadges: document.querySelectorAll('.rooster-card__mastery-badge').length,
        archiveSummary: [...document.querySelectorAll('.henhouse-archive-stats small')].map((node) => node.textContent),
        archiveRecords: [...document.querySelectorAll('.henhouse-records .personal-bests > span > small')].map((node) => node.textContent),
        archiveDrawers: [...document.querySelectorAll('.henhouse-drawers summary')].map((node) => node.textContent),
        analyticsInArchive: document.querySelector('[data-hub-view="archive"] [data-analytics-toggle]') !== null,
        currencyText: document.querySelector('.henhouse-kernels')?.textContent,
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
    assert(snapshot.title === 'Hennenhütte', 'The Hennenhütte hub is not visible.', snapshot);
    assert(snapshot.roosterCards === 3 && snapshot.enabledRoosters === 1,
      'Fresh progression must offer only the Ace.', snapshot);
    assert(snapshot.challengeCards === 4 && snapshot.enabledChallenges === 1,
      'Fresh progression must offer only Standard Run.', snapshot);
    assert(snapshot.enemyEntries >= 12 && snapshot.evolutionEntries === 11,
      'The enemy or EVO lexicon is incomplete.', snapshot);
    assert(snapshot.state.version === 2 && snapshot.state.totalRuns === 0
      && snapshot.state.kernels === 0 && snapshot.state.lifetimeKernels === 0
      && Object.keys(snapshot.state.talentRanks).length === 0
      && snapshot.state.unlockedRoosters.join(',') === 'ace',
      'Fresh progression is not deterministic.', snapshot.state);
    assert(snapshot.talentNodes === 6 && snapshot.masteryBadges === 3
      && snapshot.currencyText.includes('0'),
    'The Phase G hub modules are incomplete.', snapshot);
    assert(snapshot.talentTiers === 3
      && snapshot.archiveSummary.join(',') === 'Runs,Siege,Kills'
      && snapshot.archiveRecords.join(',') === 'Meiste Kills,Schnellster Sieg,Längster Run'
      && snapshot.archiveDrawers.join(',') === 'Run-Historie,Gegner-Lexikon,EVO-Lexikon'
      && !snapshot.analyticsInArchive,
    'Talent tiers or the simplified archive hierarchy are incomplete.', snapshot);
    assert(snapshot.layout.left >= 0 && snapshot.layout.right <= 390 && snapshot.layout.bodyOverflow <= 0,
      'The portrait Hennenhütte overflows horizontally.', snapshot.layout);
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

async function verifyTenRunsTalentsAndReset(context, serverUrl) {
  const { page, errors } = await openGame(context, serverUrl, '-ten-runs');
  try {
    const snapshot = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.resetMetaProgress();
      const challenges = ['standard', 'rush-hour', 'featherweight', 'royal-gauntlet'];
      for (let index = 0; index < 10; index += 1) {
        const challengeId = challenges[index % challenges.length];
        api.recordMetaRun({
          kills: 120 + index * 8,
          elapsedMs: 510000 - index * 3500,
          rooster: { id: 'ace', name: 'Barnyard Ace' },
          challenge: { id: challengeId, name: challengeId },
          build: { active: [], passive: [], evolutions: [] }
        });
      }
      const beforePurchases = api.getMetaState();
      const purchases = [];
      ['sturdy-nest', 'swift-spurs', 'polished-yolk'].forEach((id) => {
        for (let rank = 0; rank < 3; rank += 1) purchases.push(api.purchaseMetaTalent(id));
      });
      for (let rank = 0; rank < 2; rank += 1) purchases.push(api.purchaseMetaTalent('wide-wings'));
      purchases.push(api.purchaseMetaTalent('second-choice'));
      purchases.push(api.purchaseMetaTalent('royal-instinct'));
      return {
        beforePurchases,
        purchases,
        afterPurchases: api.getMetaState(),
        hub: api.getMetaHub()
      };
    });
    assert(snapshot.beforePurchases.totalRuns === 10 && snapshot.beforePurchases.history.length === 10,
      'The ten-run progression did not retain the expected bounded history.', snapshot.beforePurchases);
    assert(snapshot.beforePurchases.firstClearClaims.length === 4
      && snapshot.beforePurchases.kernels >= 455,
    'Ten wins did not produce the intended first-clear/talent economy.', snapshot.beforePurchases);
    assert(snapshot.purchases.every((purchase) => purchase.ok)
      && Object.values(snapshot.afterPurchases.talentRanks).reduce((sum, rank) => sum + rank, 0) === 13,
    'The complete six-node talent path could not be purchased in dependency order.', snapshot);
    assert(snapshot.hub.roosters.find((rooster) => rooster.id === 'ace').mastery.level === 5
      && snapshot.hub.roosters.find((rooster) => rooster.id === 'ace').mastery.badgeUnlocked,
    'Ten successful Ace runs did not reach the capped mastery presentation.', snapshot.hub.roosters);

    await page.screenshot({
      path: path.join(artifactDir, 'henhouse-meta-progressed.png'),
      fullPage: true
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
    const applied = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('ace');
      return {
        state: api.getMetaState(),
        stats: api.getPlayerStats(),
        loadout: api.getLoadout(),
        bonuses: api.getMetaRunBonuses()
      };
    });
    assert(applied.state.totalRuns === 10 && applied.state.talentRanks['royal-instinct'] === 1,
      'Talent progression did not persist across reload.', applied.state);
    assert(applied.stats.maxHp === 106 && applied.stats.speed === 219
      && applied.stats.projectileDamage === 21 && applied.stats.xpMagnetRadius === 246
      && Math.abs(applied.stats.critChance - 0.09) < 0.0001
      && applied.loadout.rerollsRemaining === 2,
    'Capped talent bonuses were not applied exactly once to the run.', applied);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
    const reset = await page.evaluate(() => window.__ROOSTER_TEST__.resetMetaProgress());
    assert(reset.version === 2 && reset.kernels === 0 && reset.lifetimeKernels === 0
      && reset.totalRuns === 0 && reset.firstClearClaims.length === 0
      && Object.keys(reset.talentRanks).length === 0
      && Object.values(reset.roosterMastery).every((entry) => entry.xp === 0),
    'Reset did not clear all Phase G progression.', reset);
    assert(errors.length === 0, 'Browser errors in ten-run/talent/reset gate.', errors);
    return { beforePurchases: snapshot.beforePurchases, applied, reset };
  } finally {
    await page.close();
  }
}

async function verifyMigrationAndOldSaves(context, serverUrl) {
  const { page, errors } = await openGame(context, serverUrl, '-migration');
  try {
    await page.evaluate(() => {
      localStorage.removeItem('rooster-rage:meta:v2');
      localStorage.setItem('rooster-rage:meta:v1', JSON.stringify({
        version: 1,
        totalRuns: 5,
        victories: 2,
        totalKills: 420,
        bossDefeats: 2,
        roosterRuns: { ace: 4, artillery: 1 },
        roosterWins: { ace: 2 },
        unlockedRoosters: ['ace', 'artillery', 'storm'],
        unlockedChallenges: ['standard', 'rush-hour'],
        unlockedCosmetics: ['ace-sunrise'],
        selectedChallenge: 'rush-hour',
        selectedCosmetics: { ace: 'ace-sunrise' },
        discoveredEnemies: ['boss'],
        discoveredEvolutions: ['evo-sunshot-array'],
        bests: { highestKills: 190, longestRunMs: 520000, fastestVictoryMs: 470000 },
        history: [{ id: 'legacy-run', roosterName: 'Barnyard Ace', outcome: 'victory', kills: 190, elapsedMs: 470000 }]
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
    const migrated = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getMetaState(),
      stored: JSON.parse(localStorage.getItem('rooster-rage:meta:v2'))
    }));
    assert(migrated.state.version === 2 && migrated.state.totalRuns === 5
      && migrated.state.victories === 2 && migrated.state.totalKills === 420
      && migrated.state.kernels === 80 && migrated.state.lifetimeKernels === 80,
    'The v1 save was not migrated with the deterministic veteran grant.', migrated);
    assert(migrated.state.selectedChallenge === 'rush-hour'
      && migrated.state.selectedCosmetics.ace === 'ace-sunrise'
      && migrated.state.history[0].id === 'legacy-run'
      && migrated.stored.version === 2,
    'Legacy unlock, selection, or history data was lost during migration.', migrated);

    await page.evaluate(() => {
      localStorage.removeItem('rooster-rage:meta:v1');
      localStorage.setItem('rooster-rage:meta:v2', '{not-json');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
    const recovered = await page.evaluate(() => window.__ROOSTER_TEST__.getMetaState());
    assert(recovered.version === 2 && recovered.totalRuns === 0 && recovered.kernels === 0
      && recovered.unlockedRoosters.join(',') === 'ace',
    'Malformed persistent data did not recover to a safe fresh state.', recovered);
    assert(errors.length === 0, 'Browser errors in migration/old-save gate.', errors);
    return { migrated, recovered };
  } finally {
    await page.close();
  }
}

async function verifyChallenge(context, serverUrl, id, expectedArena) {
  const { page, errors } = await openGame(context, serverUrl, `-${id}&challenge=${id}`);
  try {
    await page.evaluate(() => window.__ROOSTER_TEST__.unlockAllMeta());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getMetaHub);
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
  const inFreshContext = async (callback) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      return await callback(context);
    } finally {
      await context.close();
    }
  };
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      fresh: await inFreshContext((context) => verifyFreshHub(context, serverState.url)),
      progression: await inFreshContext((context) => verifyUnlocksAndPersistence(context, serverState.url)),
      tenRuns: await inFreshContext((context) => verifyTenRunsTalentsAndReset(context, serverState.url)),
      migration: await inFreshContext((context) => verifyMigrationAndOldSaves(context, serverState.url)),
      challenges: await inFreshContext((context) => verifyChallenges(context, serverState.url))
    };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'meta-gate.json'), JSON.stringify(report, null, 2));
    console.log('Rooster meta/challenge gate passed.');
    console.log(JSON.stringify({
      roosters: report.progression.state.unlockedRoosters,
      challenges: report.progression.state.unlockedChallenges,
      cosmetics: report.progression.state.unlockedCosmetics,
      history: report.progression.state.history.length,
      tenRunKernels: report.tenRuns.beforePurchases.kernels,
      migratedVeteranKernels: report.migration.migrated.state.kernels,
      lexicon: {
        enemies: report.fresh.enemyEntries,
        evolutions: report.fresh.evolutionEntries
      }
    }, null, 2));
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
