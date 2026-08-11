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
  if (!condition) throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
}

async function openGame(browser, serverUrl, suffix, arena = 'open-yard', rooster = 'ace') {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${serverUrl}?seed=phase-13-${suffix}&profile=average&arena=${arena}`, {
    waitUntil: 'domcontentloaded'
  });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getEncounterEvents);
  await page.evaluate((selectedRooster) => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster(selectedRooster);
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
    api.movePlayer(700, 450);
    api.setPlayerCombatModifiers({ maxHp: 999, projectileDamage: 1, fireRate: 999999 });
    api.setPlayerHp(999);
    api.resetAutoShotCooldown();
  }, rooster);
  return { page, errors };
}

async function verifyCatalog(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'catalog');
  try {
    const result = await page.evaluate(() => ({
      roles: window.__ROOSTER_TEST__.getEnemyRoleMatrix(),
      standards: window.__ROOSTER_TEST__.getEncounterStandards(),
      waves: window.__ROOSTER_TEST__.getWaveCatalog()
    }));
    const roleIds = result.roles.map((role) => role.id);
    assert(JSON.stringify(roleIds) === JSON.stringify([
      'fodder', 'runner', 'tank', 'shooter', 'area-denial', 'exploder', 'support', 'summoner'
    ]), 'Enemy role matrix is incomplete.', result.roles);
    assert(result.standards.normalTelegraphMs >= 300
      && result.standards.heavyTelegraphMs >= 500
      && result.standards.normalProjectileBudget === 12
      && result.standards.playerProtectionRadius >= 140,
    'Encounter reaction standards are below the roadmap gate.', result.standards);
    result.waves.slice(0, 4).forEach((wave) => assert(
      wave.primaryRoles.length <= 2,
      `Early wave ${wave.wave} exceeds two primary danger roles.`,
      wave
    ));
    result.waves.slice(4, 9).forEach((wave) => assert(
      wave.primaryRoles.length <= 3,
      `Late wave ${wave.wave} exceeds three primary danger roles.`,
      wave
    ));
    result.waves.slice(3, 9).forEach((wave) => {
      const normalShooters = (wave.roleCounts.shooter ?? 0) + (wave.roleCounts['area-denial'] ?? 0);
      const fullSizeEnemies = wave.count - (wave.roleCounts['micro-fodder'] ?? 0);
      const shooterShare = normalShooters / fullSizeEnemies;
      assert(shooterShare >= 0.05 && shooterShare <= 0.1,
        `Wave ${wave.wave} normal shooter share is outside the 5-10% full-size pressure target.`,
        { shooterShare, wave });
    });
    assert(result.waves.some((wave) => wave.roleCounts.support > 0)
      && result.waves.some((wave) => wave.roleCounts.summoner > 0),
    'Support and summoner roles are absent from curated waves.', result.waves);
    assert(errors.length === 0, 'Browser errors in encounter catalog gate.', errors);
    return result;
  } finally {
    await page.close();
  }
}

async function verifyStateDrivenEnemyArt(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'state-driven-art');
  try {
    const initial = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const ids = {};
      [
        'brute', 'spitter', 'fan-spitter', 'bomber',
        'support', 'summoner', 'elite-brute', 'elite-spitter',
        'runner', 'elite-runner', 'champion-charger', 'boss'
      ]
        .forEach((type, index) => {
          const movementOnly = [
            'runner', 'brute', 'spitter', 'fan-spitter', 'bomber',
            'elite-runner', 'elite-spitter', 'champion-charger', 'boss'
          ]
            .includes(type);
          ids[type] = api.spawnEnemyType(type, 840 + (index % 4) * 90, 220 + Math.floor(index / 4) * 120, {
            speed: 0,
            damage: 0,
            hp: 9999,
            ...(movementOnly ? { ability: null, heavyAttackDelay: 999999 } : {})
          });
        });
      return { ids, enemies: api.getEnemySnapshot() };
    });
    const byType = Object.fromEntries(initial.enemies.map((enemy) => [enemy.type, enemy]));
    assert(byType.support.texture === 'enemy-support-run'
      && byType.summoner.texture === 'enemy-summoner-run',
    'Support and summoner still reuse a tinted spitter texture.', byType);
    assert(byType.runner.texture === 'enemy-runner-run'
      && byType.brute.texture === 'enemy-brute-run'
      && byType.spitter.texture === 'enemy-spitter-run'
      && byType['fan-spitter'].texture === 'enemy-fan-spitter-run'
      && byType.bomber.texture === 'enemy-bomber-run'
      && byType['elite-runner'].texture === 'enemy-elite-runner-run'
      && byType['elite-spitter'].texture === 'enemy-elite-spitter-run'
      && byType['champion-charger'].texture === 'enemy-elite-runner-run'
      && byType.boss.texture === 'enemy-boss-run',
    'Movement-bulk enemies did not enter their directional sheets.', byType);
    ['elite-brute']
      .forEach((type) => assert(
        byType[type].animation?.endsWith('-move') && byType[type].animationState === 'move',
        `${type} did not enter a dedicated movement state.`, byType[type]
      ));
    const directionalPrefixes = {
      runner: 'enemy-runner-run',
      brute: 'enemy-brute-run',
      support: 'enemy-support-run',
      summoner: 'enemy-summoner-run',
      spitter: 'enemy-spitter-run',
      'fan-spitter': 'enemy-fan-spitter-run',
      bomber: 'enemy-bomber-run',
      'elite-runner': 'enemy-elite-runner-run',
      'elite-spitter': 'enemy-elite-spitter-run',
      'champion-charger': 'enemy-elite-runner-run',
      boss: 'enemy-boss-run'
    };
    const directionalAnimations = {};
    for (const [direction, point] of Object.entries({
      left: [-1000, 340],
      right: [3000, 340],
      up: [930, -1000],
      down: [930, 2000]
    })) {
      await page.evaluate(([x, y]) => window.__ROOSTER_TEST__.movePlayer(x, y), point);
      await page.waitForTimeout(55);
      directionalAnimations[direction] = await page.evaluate((types) => Object.fromEntries(
        window.__ROOSTER_TEST__.getEnemySnapshot()
          .filter((enemy) => types.includes(enemy.type))
          .map((enemy) => [enemy.type, enemy.animation])
      ), Object.keys(directionalPrefixes));
    }
    for (const [direction, animations] of Object.entries(directionalAnimations)) {
      Object.entries(directionalPrefixes).forEach(([type, prefix]) => assert(
        animations[type] === `${prefix}-${direction}`,
        `${type} is missing its ${direction} movement row.`, directionalAnimations
      ));
    }
    const actionBruteId = await page.evaluate(() => window.__ROOSTER_TEST__.spawnEnemyType(
      'brute', 1080, 520, {
        speed: 0,
        damage: 0,
        hp: 9999,
        ability: {
          kind: 'slam',
          label: 'Animation Gate',
          cooldown: 999999,
          telegraphMs: 620,
          heavy: true,
          radius: 120,
          damage: 0,
          color: 0xff6a32
        }
      }
    ));
    await page.waitForTimeout(100);
    const bruteWindup = await page.evaluate((id) => window.__ROOSTER_TEST__.getEnemySnapshot()
      .find((enemy) => enemy.id === id), actionBruteId);
    assert(bruteWindup.animation === 'enemy-brute-windup'
      && bruteWindup.animationState === 'windup',
    'Directional Brute locomotion prevented its action sheet from taking over.', bruteWindup);
    const combatActionIds = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      return {
        spitter: api.spawnEnemyType('spitter', 1080, 360, { speed: 0, damage: 0, hp: 9999 }),
        'fan-spitter': api.spawnEnemyType('fan-spitter', 1160, 440, { speed: 0, damage: 0, hp: 9999 }),
        'elite-spitter': api.spawnEnemyType('elite-spitter', 1080, 600, { speed: 0, damage: 0, hp: 9999 })
      };
    });
    await page.waitForTimeout(100);
    const combatActionStates = await page.evaluate((ids) => Object.fromEntries(
      window.__ROOSTER_TEST__.getEnemySnapshot()
        .filter((enemy) => Object.values(ids).includes(enemy.id))
        .map((enemy) => [enemy.type, enemy])
    ), combatActionIds);
    const combatActionTextures = {
      spitter: 'enemy-spitter-pulse',
      'fan-spitter': 'enemy-fan-spitter-recoil',
      'elite-spitter': 'enemy-elite-spitter-pulse'
    };
    Object.entries(combatActionTextures).forEach(([type, texture]) => assert(
      combatActionStates[type]?.texture === texture
        && combatActionStates[type]?.animation === `enemy-${type}-windup`
        && combatActionStates[type]?.animationState === 'windup',
      `${type} directional locomotion prevented its action sheet from taking over.`,
      combatActionStates[type]
    ));
    await page.screenshot({ path: path.join(artifactDir, 'enemy-directional-art-runtime.png') });
    await page.waitForTimeout(650);
    const resolved = await page.evaluate(() => ({
      enemies: window.__ROOSTER_TEST__.getEnemySnapshot(),
      events: window.__ROOSTER_TEST__.getEncounterEvents()
    }));
    assert(resolved.events.some((event) => event.type === 'enemyAbilityFired'
      && event.enemyType === 'summoner'),
    'Summoner state animation completed without resolving its brood call.', resolved);
    assert(errors.length === 0, 'Browser errors in state-driven enemy-art gate.', errors);
    return {
      supportTexture: byType.support.texture,
      summonerTexture: byType.summoner.texture,
      movementBulkTextures: Object.fromEntries(
        Object.keys(directionalPrefixes).map((type) => [type, byType[type].texture])
      ),
      bruteActionTransition: bruteWindup.animation,
      combatActionTransitions: Object.fromEntries(
        Object.entries(combatActionStates).map(([type, enemy]) => [type, enemy.animation])
      ),
      initialStates: Object.fromEntries(Object.entries(byType).map(([type, enemy]) => [type, enemy.animation])),
      directionalAnimations
    };
  } finally {
    await page.close();
  }
}

async function verifyNormalProjectileBudget(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'projectile-budget');
  try {
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      for (let index = 0; index < 10; index += 1) {
        api.spawnEnemyType('fan-spitter', 940 + (index % 2) * 100, 180 + index * 55, {
          speed: 0,
          damage: 0,
          hp: 9999
        });
      }
    });
    await page.waitForTimeout(950);
    const result = await page.evaluate(() => ({
      telemetry: window.__ROOSTER_TEST__.getTelemetry(),
      events: window.__ROOSTER_TEST__.getEncounterEvents(),
      projectiles: window.__ROOSTER_TEST__.getEnemyProjectileSnapshot().length
    }));
    const deferred = result.events.filter((event) => event.type === 'enemyAbilityDeferred').length;
    assert(result.telemetry.peakEnemyProjectiles <= 12 && result.projectiles <= 12,
      'Normal encounter projectile budget was exceeded.', result);
    assert(deferred > 0 && result.telemetry.enemyAttacksDeferred > 0,
      'Projectile pressure did not defer overlapping normal volleys.', result);
    assert(errors.length === 0, 'Browser errors in projectile budget gate.', errors);
    return {
      budget: 12,
      peak: result.telemetry.peakEnemyProjectiles,
      deferred
    };
  } finally {
    await page.close();
  }
}

async function verifyElite(browser, serverUrl, eliteType) {
  const { page, errors } = await openGame(browser, serverUrl, eliteType);
  try {
    const eliteId = await page.evaluate((type) => {
      const api = window.__ROOSTER_TEST__;
      return api.spawnEnemyType(type, 900, 450, { speed: 0, damage: 0, hp: 1000 });
    }, eliteType);
    await page.waitForTimeout(80);
    const aura = await page.evaluate((id) => {
      const api = window.__ROOSTER_TEST__;
      const allyId = api.spawnEnemyType('slime', 940, 450, { speed: 0, damage: 0, hp: 1000 });
      return { elite: api.getEnemySnapshot().find((enemy) => enemy.id === id), allyId };
    }, eliteId);
    await page.waitForTimeout(80);
    const auraApplied = await page.evaluate(({ type, allyId }) => {
      const api = window.__ROOSTER_TEST__;
      const allyBefore = api.getEnemySnapshot().find((enemy) => enemy.id === allyId);
      api.damageEnemyById(allyId, 100);
      return {
        allyBefore,
        allyAfter: api.getEnemySnapshot().find((enemy) => enemy.id === allyId),
        type
      };
    }, { type: eliteType, allyId: aura.allyId });
    if (eliteType === 'elite-runner') {
      assert(auraApplied.allyBefore.auraSpeedMultiplier >= 1.2, 'Runner elite haste aura is inactive.', auraApplied);
    } else if (eliteType === 'elite-brute') {
      assert(auraApplied.allyBefore.damageReduction >= 0.22
        && auraApplied.allyAfter.hp === 922,
      'Brute elite armor aura did not mitigate 22% damage.', auraApplied);
    } else {
      await page.waitForTimeout(420);
      const healed = await page.evaluate((id) => window.__ROOSTER_TEST__.getEnemySnapshot()
        .find((enemy) => enemy.id === id)?.hp, aura.allyId);
      assert(healed > auraApplied.allyAfter.hp, 'Spitter elite regeneration aura did not heal its ally.', {
        healed,
        ...auraApplied
      });
    }

    await page.waitForTimeout(700);
    const ability = await page.evaluate((id) => ({
      elite: window.__ROOSTER_TEST__.getEnemySnapshot().find((enemy) => enemy.id === id),
      events: window.__ROOSTER_TEST__.getEncounterEvents(),
      banner: document.querySelector('.wave-banner')?.textContent ?? ''
    }), eliteId);
    const telegraph = ability.events.find((event) => event.type === 'enemyTelegraphShown'
      && event.enemyType === eliteType);
    const fired = ability.events.find((event) => event.type === 'enemyAbilityFired'
      && event.enemyType === eliteType);
    assert(telegraph && fired, `${eliteType} did not telegraph and fire its own ability.`, ability);
    assert(telegraph.duration >= (telegraph.heavy ? 500 : 300),
      `${eliteType} telegraph is below its reaction standard.`, telegraph);
    assert(ability.banner.includes(aura.elite.name), `${eliteType} announcement does not name the encounter.`, ability);

    const reward = await page.evaluate(async (id) => {
      const api = window.__ROOSTER_TEST__;
      api.damageEnemyById(id, 99999);
      const before = api.getPickupState();
      api.collectPickup('elite-chest');
      await new Promise((resolve) => setTimeout(resolve, 850));
      const progression = api.getProgressionState();
      api.resumeIfUpgradeOpen();
      return { before, progression, telemetry: api.getTelemetry() };
    }, eliteId);
    assert(reward.before.items.some((item) => item.kind === 'elite-chest'),
      `${eliteType} did not drop its guaranteed physical chest.`, reward);
    assert(reward.progression.currentSelection?.type === 'chest',
      `${eliteType} chest did not enter reward selection.`, reward);
    assert(errors.length === 0, `Browser errors for ${eliteType}.`, errors);
    return {
      type: eliteType,
      name: aura.elite.name,
      aura: aura.elite.aura.kind,
      ability: fired.ability,
      telegraphMs: telegraph.duration
    };
  } finally {
    await page.close();
  }
}

async function verifyProtectionAndBoss(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'boss');
  try {
    await page.evaluate(() => window.__ROOSTER_TEST__.spawnEnemyType('spitter', 780, 450, {
      speed: 0,
      damage: 0,
      hp: 999
    }));
    await page.waitForTimeout(480);
    const protection = await page.evaluate(() => ({
      projectiles: window.__ROOSTER_TEST__.getEnemyProjectileSnapshot(),
      events: window.__ROOSTER_TEST__.getEncounterEvents()
    }));
    assert(protection.projectiles.length === 0
      && protection.events.some((event) => event.type === 'enemyProjectileSuppressed'),
    'Enemy projectile spawned inside the player protection radius.', protection);

    const explosionBefore = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.setPlayerHp(999);
      const id = api.spawnEnemyType('bomber', 725, 450, { speed: 0, damage: 0, hp: 20 });
      api.damageEnemyById(id, 999);
      return { hp: api.getPlayerStats().hp, events: api.getEncounterEvents() };
    });
    await page.waitForTimeout(180);
    const explosionDuring = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats().hp);
    assert(explosionBefore.hp === 999 && explosionDuring === 999
      && explosionBefore.events.some((event) => event.type === 'deathExplosionTelegraphed'
        && event.duration >= 500),
    'Bomber death explosion damaged before its heavy telegraph completed.', {
      explosionBefore,
      explosionDuring
    });
    await page.waitForTimeout(380);
    const explosionAfter = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats().hp);
    assert(explosionAfter < 999, 'Telegraphed bomber explosion did not resolve.', { explosionAfter });

    const bossId = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.clearProjectiles();
      return api.spawnEnemyType('boss', 980, 450, {
        speed: 0,
        damage: 0,
        hp: 10000,
        ability: null,
        heavyAttackDelay: 999999
      });
    });
    const protectedHp = await page.evaluate((id) => {
      const api = window.__ROOSTER_TEST__;
      api.damageEnemyById(id, 1000);
      return api.getEnemySnapshot().find((enemy) => enemy.id === id)?.hp;
    }, bossId);
    assert(protectedHp === 10000, 'Boss entry shield did not block early damage.', { protectedHp });
    await page.waitForTimeout(1400);
    const phases = await page.evaluate((id) => {
      const api = window.__ROOSTER_TEST__;
      api.damageEnemyById(id, 3600);
      return true;
    }, bossId);
    assert(phases, 'Boss phase damage probe failed.');
    await page.waitForTimeout(1050);
    await page.evaluate((id) => window.__ROOSTER_TEST__.damageEnemyById(id, 3300), bossId);
    await page.waitForTimeout(100);
    const boss = await page.evaluate((id) => ({
      state: window.__ROOSTER_TEST__.getEnemySnapshot().find((enemy) => enemy.id === id),
      events: window.__ROOSTER_TEST__.getEncounterEvents(),
      bossHudVisible: document.querySelector('[data-boss]')?.classList.contains('is-visible'),
      bossHudText: document.querySelector('[data-boss]')?.textContent ?? '',
      bossHudRect: (() => {
        const rect = document.querySelector('[data-boss]')?.getBoundingClientRect();
        return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
      })()
    }), bossId);
    assert(boss.state?.bossPhaseIndex === 2, 'Boss did not reach its third combat section.', boss);
    assert(boss.events.filter((event) => event.type === 'bossPhaseStarted').length === 2,
      'Boss phase telemetry does not expose both transitions.', boss);
    assert(boss.events.filter((event) => event.type === 'bossProjectilesCleared').length === 2
      && boss.events.filter((event) => event.type === 'bossAddsCleared').length === 2,
    'Boss transitions did not clear old projectiles and adds.', boss);
    assert(boss.state.bossSequences[2].steps.map((step) => step.kind).includes('dash')
      && boss.state.bossSequences[2].steps.map((step) => step.kind).includes('add-pulse'),
    'Final boss phase is missing its ordered dash/add sequence.', boss.state);
    assert(boss.bossHudVisible && boss.bossHudText.includes('THE BROOD KING'),
      'Named boss HP HUD is not visible.', boss);
    assert(boss.bossHudRect.left >= 0 && boss.bossHudRect.right <= 390 && boss.bossHudRect.top >= 0,
      'Boss HUD exceeds the portrait-mobile viewport.', boss.bossHudRect);
    assert(errors.length === 0, 'Browser errors in protection/boss gate.', errors);
    return {
      entryShieldHp: protectedHp,
      explosionTelegraphResolved: explosionAfter < 999,
      phase: boss.state.bossPhaseIndex + 1,
      phaseEvents: boss.events.filter((event) => event.type === 'bossPhaseStarted')
    };
  } finally {
    await page.close();
  }
}

async function verifyEncounterMatrix(browser, serverUrl) {
  const rows = [];
  for (const arena of ['open-yard', 'vertical-run', 'square-coop']) {
    for (const rooster of ['ace', 'artillery', 'storm']) {
      const { page, errors } = await openGame(browser, serverUrl, `${arena}-${rooster}`, arena, rooster);
      try {
        await page.evaluate(() => window.__ROOSTER_TEST__.spawnEnemyType('elite-spitter', 980, 450, {
          speed: 0,
          damage: 0,
          hp: 9999
        }));
        await page.waitForTimeout(520);
        const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
        assert(!state.lastError && state.enemyTelegraphs >= 0 && errors.length === 0,
          `Encounter matrix failed for ${arena}/${rooster}.`, { state, errors });
        rows.push({ arena, rooster, hp: state.playerHp, projectiles: state.enemyProjectiles });
      } finally {
        await page.close();
      }
    }
  }
  return rows;
}

async function verifyChampion(browser, serverUrl) {
  const { page, errors } = await openGame(browser, serverUrl, 'champion');
  try {
    const id = await page.evaluate(() => window.__ROOSTER_TEST__.spawnEnemyType(
      'champion-charger', 900, 450, { damage: 0, hp: 900 }
    ));
    await page.waitForTimeout(760);
    const combat = await page.evaluate((championId) => ({
      enemy: window.__ROOSTER_TEST__.getEnemySnapshot().find((enemy) => enemy.id === championId),
      events: window.__ROOSTER_TEST__.getEncounterEvents(),
      banner: document.querySelector('.wave-banner')?.textContent ?? ''
    }), id);
    assert(combat.enemy?.champion && combat.enemy.type === 'champion-charger',
      'Stormclaw did not enter the champion layer.', combat);
    assert(combat.events.some((event) => event.type === 'enemyTelegraphShown'
      && event.enemyType === 'champion-charger' && event.duration >= 500),
    'Stormclaw Charge is missing its heavy readable telegraph.', combat.events);
    assert(combat.banner.includes('Stormclaw Champion'),
      'Champion arrival is not announced.', combat.banner);
    const reward = await page.evaluate((championId) => {
      const api = window.__ROOSTER_TEST__;
      api.damageEnemyById(championId, 99999);
      return api.getPickupState();
    }, id);
    assert(reward.items.some((item) => item.kind === 'golden-chest'),
      'Champion did not drop its guaranteed Golden Chest.', reward);
    assert(errors.length === 0, 'Browser errors in champion gate.', errors);
    return { type: combat.enemy.type, telegraphMs: 520, reward: 'golden-chest' };
  } finally {
    await page.close();
  }
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      catalog: await verifyCatalog(browser, serverState.url),
      projectileBudget: await verifyNormalProjectileBudget(browser, serverState.url),
      stateDrivenArt: await verifyStateDrivenEnemyArt(browser, serverState.url),
      elites: [],
      champion: null,
      protectionAndBoss: null,
      matrix: null
    };
    for (const type of ['elite-runner', 'elite-brute', 'elite-spitter']) {
      report.elites.push(await verifyElite(browser, serverState.url, type));
    }
    report.champion = await verifyChampion(browser, serverState.url);
    report.protectionAndBoss = await verifyProtectionAndBoss(browser, serverState.url);
    report.matrix = await verifyEncounterMatrix(browser, serverState.url);
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, 'encounter-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster encounter gate passed.');
    console.log(JSON.stringify({
      roles: report.catalog.roles.map((role) => role.id),
      standards: report.catalog.standards,
      projectileBudget: report.projectileBudget,
      stateDrivenArt: report.stateDrivenArt,
      elites: report.elites,
      champion: report.champion,
      boss: report.protectionAndBoss,
      matrixCases: report.matrix.length
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
