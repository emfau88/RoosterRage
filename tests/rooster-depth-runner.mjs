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

async function openGame(browser, serverUrl, seed, rooster = 'ace') {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${serverUrl}?seed=${seed}&profile=average&arena=open-yard`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getRoosterCatalog);
  await page.evaluate((roosterId) => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster(roosterId);
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
    api.setPlayerLevel(20);
    api.setPlayerHp(999);
  }, rooster);
  return { page, errors };
}

async function verifyCatalogAndExclusivity(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'depth-catalog', 'ace');
  try {
    const catalog = await page.evaluate(() => ({
      roosters: window.__ROOSTER_TEST__.getRoosterCatalog(),
      upgrades: window.__ROOSTER_TEST__.getUpgradeCatalog()
    }));
    assert(catalog.roosters.length === 3, 'Expected exactly three production roosters.', catalog.roosters);
    assert(catalog.roosters.every((rooster) => (
      rooster.archetypes.length === 3
      && rooster.classPassives.length === 2
      && rooster.primaryEvolution?.id
    )), 'Rooster depth catalog is incomplete.', catalog.roosters);
    assert(new Set(catalog.roosters.flatMap((rooster) => rooster.archetypes.map((item) => item.id))).size === 9,
      'Archetype ids are not unique.', catalog.roosters);

    for (const rooster of catalog.roosters) {
      for (const archetype of rooster.archetypes) {
        const supported = archetype.upgrades.filter((id) => (rooster.upgradeAffinities[id] ?? 1) > 1);
        assert(supported.length >= 3,
          `${archetype.id} is not supported by at least three soft affinities.`, { archetype, supported });
      }
    }

    const classUpgrades = catalog.upgrades.filter((upgrade) => upgrade.classId);
    assert(classUpgrades.length === 12,
      'Expected three class weapon ranks, six class passives, and three class EVOs.', classUpgrades);
    assert(errors.length === 0, 'Browser errors in rooster catalog gate.', errors);
    return catalog.roosters;
  } finally {
    await page.close();
  }
}

async function verifyClassOfferExclusivity(browser, serverUrl, rooster, allRoosters) {
  const { page, errors } = await openGame(browser, serverUrl, `exclusive-${rooster.id}`, rooster.id);
  try {
    const available = await page.evaluate(() => window.__ROOSTER_TEST__.getAvailableUpgradeIds());
    const own = [...rooster.classPassives];
    const foreign = allRoosters
      .filter((candidate) => candidate.id !== rooster.id)
      .flatMap((candidate) => [...candidate.classPassives, candidate.primaryEvolution.id]);
    assert(own.every((id) => available.includes(id)),
      `${rooster.id} cannot receive both class passives.`, { available, own });
    assert(foreign.every((id) => !available.includes(id)),
      `${rooster.id} received a foreign class upgrade.`, { available, foreign });
    assert(!available.includes(rooster.primaryEvolution.id),
      `${rooster.id} primary EVO appeared before its recipe.`, available);
    assert(errors.length === 0, `Browser errors in ${rooster.id} exclusivity gate.`, errors);
    return { rooster: rooster.id, own, foreignBlocked: foreign.length };
  } finally {
    await page.close();
  }
}

async function verifySupportPath(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'support-path', 'storm');
  try {
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.spawnEnemyType('slime', 1100, 450, { hp: 9999, speed: 0, damage: 0, xpOverride: 0 });
      api.applyUpgradeById('support-chick');
    });
    const rankOne = await page.evaluate(() => window.__ROOSTER_TEST__.getAbilityState().supportChick);
    await page.evaluate(() => window.__ROOSTER_TEST__.applyUpgradeById('support-chick'));
    await page.waitForTimeout(520);
    const projectileRank = await page.evaluate(() => window.__ROOSTER_TEST__.getProjectileSnapshot()
      .filter((projectile) => projectile.source === 'support-chick'));
    await page.evaluate(() => window.__ROOSTER_TEST__.applyUpgradeById('support-chick'));
    await page.waitForTimeout(520);
    const debuffRank = await page.evaluate(() => window.__ROOSTER_TEST__.getProjectileSnapshot()
      .filter((projectile) => projectile.source === 'support-chick'));
    await page.evaluate(() => window.__ROOSTER_TEST__.applyUpgradeById('support-chick'));
    const rankFour = await page.evaluate(() => window.__ROOSTER_TEST__.getAbilityState().supportChick);
    await page.evaluate(() => window.__ROOSTER_TEST__.applyUpgradeById('support-chick'));
    const rankFive = await page.evaluate(() => window.__ROOSTER_TEST__.getAbilityState().supportChick);
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.applyUpgradeById('faster-eggs');
      window.__ROOSTER_TEST__.applyUpgradeById('evo-chick-squadron');
    });
    const evolved = await page.evaluate(() => window.__ROOSTER_TEST__.getAbilityState().supportChick);

    assert(rankOne.count === 1, 'Support rank 1 must start with one companion.', rankOne);
    assert(projectileRank.length >= 2 && projectileRank.some((projectile) => projectile.pierceRemaining >= 1),
      'Support rank 2 did not add the projectile upgrade.', projectileRank);
    assert(debuffRank.some((projectile) => projectile.slowRatio < 1),
      'Support rank 3 did not add the debuff projectile.', debuffRank);
    assert(rankFour.count === 2 && rankFive.count === 3,
      'Support ranks 4 and 5 did not add companions.', { rankFour, rankFive });
    assert(evolved.evolved && evolved.count === 4,
      'Chick Squadron did not create the full evolved squadron.', evolved);
    assert(errors.length === 0, 'Browser errors in Support Chick depth gate.', errors);
    return { rankOne, projectileRank: projectileRank.length, debuffRank: debuffRank.length, rankFour, rankFive, evolved };
  } finally {
    await page.close();
  }
}

async function verifyArchetypeScenario(browser, serverUrl, rooster, archetype) {
  const { page, errors } = await openGame(browser, serverUrl, archetype.id, rooster.id);
  try {
    await page.evaluate((ids) => {
      ids.forEach((id) => window.__ROOSTER_TEST__.applyUpgradeById(id));
      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI * 2 * index) / 6;
        window.__ROOSTER_TEST__.spawnEnemyType(
          'slime',
          700 + Math.cos(angle) * 145,
          450 + Math.sin(angle) * 145,
          { hp: 18, speed: 0, damage: 0, xpOverride: 0 }
        );
      }
    }, archetype.upgrades);
    const damageBefore = await page.evaluate(() => window.__ROOSTER_TEST__.getTelemetry().effectiveDamage);
    await page.waitForTimeout(1500);
    const normal = await page.evaluate((before) => ({
      damage: window.__ROOSTER_TEST__.getTelemetry().effectiveDamage - before,
      kills: window.__ROOSTER_TEST__.getState().kills
    }), damageBefore);

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.spawnEnemyType('elite-brute', 860, 450, {
        hp: 650,
        speed: 0,
        damage: 0,
        ability: null,
        xpOverride: 0
      });
    });
    const eliteBefore = await page.evaluate(() => window.__ROOSTER_TEST__.getTelemetry().effectiveDamage);
    await page.waitForTimeout(2100);
    const eliteDamage = await page.evaluate((before) => (
      window.__ROOSTER_TEST__.getTelemetry().effectiveDamage - before
    ), eliteBefore);

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.spawnEnemyType('boss', 880, 450, {
        hp: 1800,
        speed: 0,
        damage: 0,
        entryProtectionMs: 0,
        ability: null,
        heavyProjectile: null,
        bossPhases: [],
        xpOverride: 0
      });
    });
    const bossBefore = await page.evaluate(() => window.__ROOSTER_TEST__.getTelemetry().effectiveDamage);
    await page.waitForTimeout(2500);
    const result = await page.evaluate((before) => {
      const telemetry = window.__ROOSTER_TEST__.getTelemetry();
      const state = window.__ROOSTER_TEST__.getState();
      return {
        bossDamage: telemetry.effectiveDamage - before,
        sources: telemetry.combatSources.filter((source) => source.effectiveDamage > 0).map((source) => source.source),
        frameP95: telemetry.frameTimes.p95Ms,
        droppedObjects: telemetry.droppedObjects,
        hp: state.playerHp,
        lastError: state.lastError,
        gameEnded: state.gameEnded
      };
    }, bossBefore);

    assert(normal.damage > 0 && normal.kills > 0,
      `${archetype.id} failed its wave scenario.`, normal);
    assert(eliteDamage > 0, `${archetype.id} failed its elite scenario.`, { eliteDamage });
    assert(result.bossDamage > 0, `${archetype.id} failed its boss scenario.`, result);
    assert(!result.lastError && !result.gameEnded && result.hp > 0,
      `${archetype.id} did not survive the scenario gate.`, result);
    assert(result.frameP95 <= 34 && result.droppedObjects === 0,
      `${archetype.id} exceeded the mobile scenario budget.`, result);
    assert(errors.length === 0, `Browser errors in ${archetype.id}.`, errors);
    return {
      rooster: rooster.id,
      archetype: archetype.id,
      normalDamage: normal.damage,
      eliteDamage,
      bossDamage: result.bossDamage,
      sources: result.sources,
      frameP95: result.frameP95
    };
  } finally {
    await page.close();
  }
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const roosters = await verifyCatalogAndExclusivity(browser, serverState.url);
    const exclusivity = [];
    const scenarios = [];
    for (const rooster of roosters) {
      exclusivity.push(await verifyClassOfferExclusivity(browser, serverState.url, rooster, roosters));
      for (const archetype of rooster.archetypes) {
        scenarios.push(await verifyArchetypeScenario(browser, serverState.url, rooster, archetype));
      }
    }
    const supportPath = await verifySupportPath(browser, serverState.url);
    const report = { generatedAt: new Date().toISOString(), roosters, exclusivity, supportPath, scenarios };
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'rooster-depth-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster depth gate passed.');
    console.log(JSON.stringify({
      archetypes: scenarios.length,
      passives: roosters.reduce((sum, rooster) => sum + rooster.classPassives.length, 0),
      primaryEvolutions: roosters.map((rooster) => rooster.primaryEvolution.id),
      supportPath,
      scenarios
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
