import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from './helpers/test-runtime.mjs';

const artifactDir = path.join(projectRoot, 'test-results');
let gameUrl;

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

async function openGame(browser, label, roosterId = 'ace', viewport = { width: 960, height: 540 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
  } catch (error) {
    await page.screenshot({ path: path.join(artifactDir, `mechanics-${label}-boot-failure.png`) });
    throw new Error(`Test API did not become available for ${label}.\nErrors: ${JSON.stringify(errors, null, 2)}\n${error.message}`);
  }
  const selected = await page.evaluate((id) => window.__ROOSTER_TEST__.selectRooster(id), roosterId);
  if (!selected) {
    throw new Error(`Could not select rooster ${roosterId} for ${label}.`);
  }
  await page.waitForFunction(() => window.__ROOSTER_TEST__.getState().frames > 2);
  return { page, errors };
}

async function testUpgrades(browser) {
  const { page, errors } = await openGame(browser, 'upgrades');
  try {
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.setPlayerHp(50);
    });

    const before = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats());
    const upgradeIds = [
      'heal',
      'double-shot',
      'triple-shot',
      'fire-eggs',
      'faster-eggs',
      'max-hp',
      'move-speed',
      'armor',
      'regen',
      'xp-magnet',
      'piercing-eggs',
      'bigger-eggs',
      'orbit-eggs',
      'golden-egg',
      'molotov-egg',
      'lightning-comb',
      'support-chick',
      'rocket-egg',
      'void-nest',
      'laser-comb',
      'swift-shells',
      'critical-yolk',
      'ricochet-eggs',
      'shell-shock',
      'second-wind'
    ];
    for (const id of upgradeIds) {
      const applied = await page.evaluate((upgradeId) => window.__ROOSTER_TEST__.applyUpgradeById(upgradeId), id);
      assert(applied, `Upgrade ${id} was not found.`);
    }
    const after = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats());

    assert(errors.length === 0, 'Browser reported errors during upgrade mechanics test.', errors);
    assert(after.hp > before.hp, 'Heal/Max HP did not increase current HP.', { before, after });
    assert(after.maxHp > before.maxHp, 'Max HP did not increase max HP.', { before, after });
    assert(after.shotCount === 3, 'Double/Triple Shot did not set shotCount to 3.', after);
    assert(after.fireEggs && after.projectileDamage > before.projectileDamage, 'Fire Eggs did not increase damage.', { before, after });
    assert(after.fireRate < before.fireRate, 'Faster Eggs did not reduce fireRate.', { before, after });
    assert(after.speed > before.speed, 'Move Speed did not increase speed.', { before, after });
    assert(after.armor > before.armor, 'Armor did not increase armor.', { before, after });
    assert(after.regenPerSecond > before.regenPerSecond, 'Regen did not increase regen.', { before, after });
    assert(after.xpMagnetRadius > before.xpMagnetRadius, 'XP Magnet did not increase pickup radius.', { before, after });
    assert(after.projectilePierce > before.projectilePierce, 'Piercing Eggs did not increase pierce.', { before, after });
    assert(after.projectileSizeBonus > before.projectileSizeBonus, 'Bigger Eggs did not increase projectile size.', { before, after });
    assert(after.projectileSpeedBonus === 70, 'Swift Shells did not increase basic projectile speed.', { before, after });
    assert(
      Math.abs(after.critChance - before.critChance - 0.1) < 0.0001,
      'Critical Yolk did not increase critical chance by 10 percentage points.',
      { before, after }
    );
    assert(after.projectileRicochets === 1, 'Ricochet Eggs did not add a bounce.', { before, after });
    assert(after.projectileKnockback === 1, 'Shell Shock did not add knockback.', { before, after });
    assert(after.secondWindCharges === 1, 'Second Wind did not add a revive charge.', { before, after });
    assert(after.orbitEggs === 1, 'Orbit Eggs did not create an orbit egg.', { before, after });
    assert(after.supportChickens === 1, 'Support Chick did not create a companion.', { before, after });
    assert(after.goldenEggRank === 1, 'Golden Egg did not unlock active ability.', { before, after });
    assert(after.molotovEggRank === 1, 'Molotov Egg did not unlock area ability.', { before, after });
    assert(after.lightningCombRank === 1, 'Lightning Comb did not unlock active ability.', { before, after });
    assert(after.rocketEggRank === 1, 'Rocket Egg did not unlock active ability.', { before, after });
    assert(after.voidNestRank === 1, 'Void Nest did not unlock area ability.', { before, after });
    assert(after.laserCombRank === 1, 'Laser Comb did not unlock active ability.', { before, after });

    const choices = await page.evaluate(() => window.__ROOSTER_TEST__.getUpgradeChoices());
    assert(!choices.includes('double-shot') && !choices.includes('triple-shot'), 'Maxed shot upgrades should not be offered again.', choices);

    const catalog = await page.evaluate(() => window.__ROOSTER_TEST__.getUpgradeCatalog());
    assert(catalog.length === 45, 'Upgrade catalog should contain 34 base upgrades and 11 EVOs.', catalog);
    assert(catalog.every((upgrade) => upgrade.category && upgrade.rarity), 'Every upgrade needs category and rarity metadata.', catalog);

    return { name: 'upgrades', status: 'passed', before, after, choices, catalogSize: catalog.length };
  } finally {
    await page.close();
  }
}

async function testUpgradeOffers(browser) {
  const { page, errors } = await openGame(browser, 'upgrade-offers');
  try {
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.setPlayerLevel(2);
      window.__ROOSTER_TEST__.setPlayerHp(100);
    });
    const guaranteeBefore = await page.evaluate(() => window.__ROOSTER_TEST__.shouldGuaranteeSpectacle());
    const choices = await page.evaluate(() => window.__ROOSTER_TEST__.getUpgradeChoiceDetails());
    const availableAtFullHp = await page.evaluate(() => window.__ROOSTER_TEST__.getAvailableUpgradeIds());
    const spectacleCategories = new Set(['active', 'orbit', 'summon']);
    assert(guaranteeBefore, 'A spectacle upgrade should be guaranteed before the player owns one.');
    assert(choices.some((choice) => spectacleCategories.has(choice.category)), 'Early offer contains no spectacle upgrade.', choices);
    assert(choices.every((choice) => choice.rankLabel && /Rang|Sofort/.test(choice.rankLabel)), 'Cards need rank labels.', choices);
    assert(choices.every((choice) => /\d/.test(choice.description)), 'Cards should communicate concrete numeric effects.', choices);
    assert(!availableAtFullHp.includes('heal'), 'Heal should not be offered at full HP.', availableAtFullHp);
    assert(choices.some((choice) => choice.id === 'primary-ace-rank'), 'R2 start-weapon progress should be guaranteed at level 2.', choices);

    const startWeaponCadence = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.applyUpgradeById('primary-ace-rank');
      api.setPlayerLevel(3);
      const levelThree = api.getAvailableUpgradeIds().includes('primary-ace-rank');
      api.setPlayerLevel(4);
      const levelFour = api.getAvailableUpgradeIds().includes('primary-ace-rank');
      api.applyUpgradeById('primary-ace-rank');
      api.setPlayerLevel(5);
      const levelFive = api.getAvailableUpgradeIds().includes('primary-ace-rank');
      api.setPlayerLevel(6);
      const levelSix = api.getAvailableUpgradeIds().includes('primary-ace-rank');
      return { levelThree, levelFour, levelFive, levelSix };
    });
    assert(
      !startWeaponCadence.levelThree
      && startWeaponCadence.levelFour
      && !startWeaponCadence.levelFive
      && startWeaponCadence.levelSix,
      'Start-weapon R2/R3/R4 level cadence is not enforced.',
      startWeaponCadence
    );
    const deadeyeCadence = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.clearProjectiles();
      api.movePlayer(400, 450);
      api.spawnEnemyType('slime', 1050, 450, { speed: 0, damage: 0, hp: 9999, xpOverride: 0 });
      for (let index = 0; index < 4; index += 1) api.triggerPrimaryAttack();
      return api.getProjectileSnapshot().map((projectile) => ({
        forceCritical: projectile.forceCritical,
        criticalPierceBonus: projectile.criticalPierceBonus,
        criticalRicochetBonus: projectile.criticalRicochetBonus
      }));
    });
    assert(
      deadeyeCadence.length === 6
      && deadeyeCadence.some((projectile) => projectile.forceCritical)
      && deadeyeCadence.filter((projectile) => projectile.forceCritical).every((projectile) => (
        projectile.criticalPierceBonus === 1
        && projectile.criticalRicochetBonus === 1
      )),
      'Deadeye Shell should guarantee the fourth attack and preserve its one-time bonuses.',
      deadeyeCadence
    );

    await page.evaluate(() => window.__ROOSTER_TEST__.previewUpgradeOverlay());
    await page.screenshot({ path: path.join(artifactDir, 'upgrade-cards-phase-5.png') });

    const spectacle = choices.find((choice) => spectacleCategories.has(choice.category));
    await page.evaluate((id) => window.__ROOSTER_TEST__.applyUpgradeById(id), spectacle.id);
    const guaranteeAfter = await page.evaluate(() => window.__ROOSTER_TEST__.shouldGuaranteeSpectacle());
    assert(!guaranteeAfter, 'Spectacle guarantee should stop after choosing a spectacle upgrade.');
    assert(errors.length === 0, 'Browser reported errors during upgrade offer test.', errors);
    return { name: 'upgrade offers', status: 'passed', choices, spectacle: spectacle.id, startWeaponCadence, deadeyeCadence };
  } finally {
    await page.close();
  }
}

async function testNewUpgradeMechanics(browser) {
  const { page, errors } = await openGame(browser, 'new-upgrade-mechanics');
  try {
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.applyUpgradeById('swift-shells');
      window.__ROOSTER_TEST__.applyUpgradeById('critical-yolk');
      window.__ROOSTER_TEST__.applyUpgradeById('ricochet-eggs');
      window.__ROOSTER_TEST__.applyUpgradeById('shell-shock');
      window.__ROOSTER_TEST__.setPlayerCombatModifiers({ critChance: 1 });
      window.__ROOSTER_TEST__.spawnEnemyType('slime', 840, 450, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.spawnEnemyType('slime', 960, 450, { speed: 0, damage: 0, hp: 999 });
    });
    await page.waitForTimeout(1450);
    const enemies = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot())
      .then((items) => items.filter((enemy) => enemy.maxHp === 999));
    assert(enemies.length === 2, 'Upgrade mechanics test lost a controlled enemy.', enemies);
    assert(enemies.every((enemy) => enemy.hp <= 959), 'Critical ricochet should deal 40 damage to both enemies.', enemies);
    assert(enemies.some((enemy) => enemy.x > 840), 'Shell Shock did not move the first enemy away from the player.', enemies);

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.applyUpgradeById('second-wind');
      window.__ROOSTER_TEST__.setPlayerHp(10);
      window.__ROOSTER_TEST__.damagePlayer(999);
    });
    const revived = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats());
    assert(revived.hp === 40 && revived.secondWindCharges === 0, 'Second Wind did not revive at 40% HP.', revived);
    await page.evaluate(() => window.__ROOSTER_TEST__.damagePlayer(999));
    const afterSecondLethalHit = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats());
    assert(afterSecondLethalHit.hp === 0, 'Second Wind should only prevent one lethal hit.', afterSecondLethalHit);
    assert(errors.length === 0, 'Browser reported errors during new upgrade mechanics test.', errors);
    return { name: 'new upgrade mechanics', status: 'passed', enemies, revived, afterSecondLethalHit };
  } finally {
    await page.close();
  }
}

async function measureRoosterPrimary(browser, roosterId, waitMs) {
  const { page, errors } = await openGame(browser, `rooster-${roosterId}`, roosterId);
  try {
    const catalog = await page.evaluate(() => window.__ROOSTER_TEST__.getRoosterCatalog());
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.spawnEnemyType('slime', 840, 450, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.spawnEnemyType('slime', 890, 450, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.spawnEnemyType('slime', 940, 450, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.resetAutoShotCooldown();
    });
    await page.waitForTimeout(waitMs);
    const stats = await page.evaluate(() => window.__ROOSTER_TEST__.getPlayerStats());
    const visual = await page.evaluate(() => window.__ROOSTER_TEST__.getRoosterVisualState());
    const directions = await page.evaluate(() => ({
      west: window.__ROOSTER_TEST__.previewRoosterDirection('west'),
      east: window.__ROOSTER_TEST__.previewRoosterDirection('east'),
      northWest: window.__ROOSTER_TEST__.previewRoosterDirection('north-west'),
      northEast: window.__ROOSTER_TEST__.previewRoosterDirection('north-east'),
      north: window.__ROOSTER_TEST__.previewRoosterDirection('north'),
      southWest: window.__ROOSTER_TEST__.previewRoosterDirection('south-west'),
      southEast: window.__ROOSTER_TEST__.previewRoosterDirection('south-east'),
      south: window.__ROOSTER_TEST__.previewRoosterDirection('south')
    }));
    const enemies = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot())
      .then((items) => items.filter((enemy) => enemy.maxHp === 999));
    await page.waitForTimeout(50);
    await page.screenshot({ path: path.join(artifactDir, `rooster-${roosterId}-south.png`) });
    await page.evaluate(() => window.__ROOSTER_TEST__.previewRoosterDirection('north'));
    await page.waitForTimeout(50);
    await page.screenshot({ path: path.join(artifactDir, `rooster-${roosterId}-north.png`) });
    assert(errors.length === 0, `Browser reported errors for rooster ${roosterId}.`, errors);
    assert(enemies.length === 3, `Controlled targets missing for rooster ${roosterId}.`, enemies);
    return { roosterId, catalog, stats, visual, directions, enemies };
  } finally {
    await page.close();
  }
}

async function testRoosterClasses(browser) {
  const ace = await measureRoosterPrimary(browser, 'ace', 1100);
  const artillery = await measureRoosterPrimary(browser, 'artillery', 1350);
  const storm = await measureRoosterPrimary(browser, 'storm', 900);
  const catalog = ace.catalog;
  assert(catalog.length === 3, 'Exactly three rooster classes should be available.', catalog);
  assert(new Set(catalog.map((rooster) => rooster.id)).size === 3, 'Rooster IDs must be unique.', catalog);
  assert(ace.stats.maxHp === 100 && ace.stats.critChance === 0.08, 'Ace start profile is incorrect.', ace.stats);
  assert(artillery.stats.maxHp === 115 && artillery.stats.projectileDamage === 30, 'Artillery start profile is incorrect.', artillery.stats);
  assert(storm.stats.maxHp === 85 && storm.stats.fireRate === 620, 'Storm start profile is incorrect.', storm.stats);
  assert(ace.enemies.filter((enemy) => enemy.hp < 999).length === 1, 'Ace primary should focus one target.', ace.enemies);
  assert(artillery.enemies.filter((enemy) => enemy.hp < 999).length >= 2, 'Artillery primary did not deal splash damage.', artillery.enemies);
  assert(storm.enemies.filter((enemy) => enemy.hp < 999).length >= 2, 'Storm primary did not chain to another target.', storm.enemies);
  assert(ace.visual.texture === 'rooster-ace-walk', 'Ace is not using its own sprite sheet.', ace.visual);
  assert(artillery.visual.texture === 'rooster-artillery-walk', 'Boombardier is not using its own sprite sheet.', artillery.visual);
  assert(storm.visual.texture === 'rooster-storm-walk', 'Stormcrest is not using its own sprite sheet.', storm.visual);
  assert(new Set([ace.visual.texture, artillery.visual.texture, storm.visual.texture]).size === 3,
    'Rooster classes must not share a player texture.', { ace: ace.visual, artillery: artillery.visual, storm: storm.visual });
  [ace, artillery, storm].forEach((result) => {
    assert(result.visual.textureSize.width === 1024 && result.visual.textureSize.height === 1024,
      `${result.roosterId} sprite sheet has the wrong production dimensions.`, result.visual);
    assert(result.visual.frameSize.width === 256 && result.visual.frameSize.height === 256
      && result.visual.frameTotal >= 16,
    `${result.roosterId} sprite sheet does not expose the expected 4x4 frame grid.`, result.visual);
    const authoredEast = result.roosterId === 'storm';
    assert(result.directions.west.flipX === authoredEast
      && result.directions.east.flipX === !authoredEast,
      `${result.roosterId} horizontal directions are not true mirrored counterparts.`, result.directions);
    assert(result.directions.west.frame >= 4 && result.directions.west.frame <= 7
      && result.directions.east.frame >= 4 && result.directions.east.frame <= 7,
    `${result.roosterId} did not stay on the clean canonical side-animation row.`, result.directions);
    assert(result.directions.west.displayScale.x === result.visual.scale
      && result.directions.west.displayScale.y === result.visual.scale
      && result.directions.east.displayScale.x === result.visual.scale
      && result.directions.east.displayScale.y === result.visual.scale,
    `${result.roosterId} side movement still changes apparent sprite size.`, result.directions);
    ['west', 'east', 'south', 'northWest', 'northEast', 'north', 'southWest', 'southEast']
      .forEach((direction) => {
        const state = result.directions[direction];
        assert(state.displayScale.x === result.visual.scale
          && state.displayScale.y === result.visual.scale
          && state.angle === 0,
        `${result.roosterId} ${direction} movement still introduces transform jitter.`, state);
      });
    ['southWest', 'southEast', 'south'].forEach((direction) => {
      const state = result.directions[direction];
      assert(state.frame >= 0 && state.frame <= 3 && state.flipX === false,
      `${result.roosterId} ${direction} movement does not use the true south row.`, state);
    });
    ['northWest', 'northEast', 'north'].forEach((direction) => {
      const state = result.directions[direction];
      assert(state.frame >= 12 && state.frame <= 15 && state.flipX === false,
      `${result.roosterId} ${direction} movement does not use the true north row.`, state);
    });
  });
  assert(ace.visual.markers === 0 && !ace.visual.markerTypes.includes('ace-ring'),
    'The obsolete Ace ground ring is still active.', ace.visual);
  assert(artillery.visual.markers === 2, 'Artillery visual identity markers are missing.', artillery.visual);
  assert(storm.visual.markers === 3, 'Storm visual identity markers are missing.', storm.visual);
  assert(artillery.visual.upgradeAffinities['rocket-egg'] > 1, 'Artillery rocket affinity is missing.', artillery.visual);
  assert(storm.visual.upgradeAffinities['lightning-comb'] > 1, 'Storm lightning affinity is missing.', storm.visual);
  return { name: 'rooster classes', status: 'passed', ace, artillery, storm };
}

async function testTripleShotTrajectory(browser) {
  const { page, errors } = await openGame(browser, 'triple-shot');
  try {
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.setShotCount(3);
      window.__ROOSTER_TEST__.spawnEnemyType('slime', 900, 450, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.triggerPrimaryAttack();
    });
    await page.waitForTimeout(120);
    const projectiles = await page.evaluate(() => window.__ROOSTER_TEST__.getProjectileSnapshot());
    assert(errors.length === 0, 'Browser reported errors during triple-shot test.', errors);
    assert(projectiles.length >= 3, 'Triple Shot did not spawn at least three projectiles.', projectiles);
    const sideProjectiles = projectiles.filter((projectile) => projectile.laneOffset !== 0);
    assert(sideProjectiles.length >= 2, 'Triple Shot side projectiles were not present.', projectiles);
    assert(sideProjectiles.every((projectile) => projectile.homing === true), 'Side projectiles should home toward valid targets.', sideProjectiles);
    assert(sideProjectiles.every((projectile) => projectile.targetOffset === 0), 'Side projectiles should converge toward enemy centers.', sideProjectiles);
    assert(sideProjectiles.every((projectile) => projectile.vx > 100), 'Side projectiles appear to reverse or stall.', sideProjectiles);
    return { name: 'triple-shot trajectory', status: 'passed', projectiles };
  } finally {
    await page.close();
  }
}

async function testWaveCuration(browser) {
  const { page, errors } = await openGame(browser, 'wave-curation');
  try {
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.pauseWaves();
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
    });
    const catalog = await page.evaluate(() => window.__ROOSTER_TEST__.getWaveCatalog());
    const expectedTypes = [
      { slime: 30, kornkrabbler: 18 },
      { slime: 26, kornkrabbler: 24, runner: 12 },
      { slime: 24, kornkrabbler: 32, runner: 17, brute: 4, 'elite-runner': 1 },
      { slime: 36, kornkrabbler: 37, runner: 14, spitter: 5 },
      { slime: 40, kornkrabbler: 47, runner: 16, 'fan-spitter': 5, brute: 4 },
      { slime: 36, kornkrabbler: 56, runner: 23, 'champion-charger': 1, 'fan-spitter': 6, brute: 9, 'elite-runner': 1 },
      { slime: 53, kornkrabbler: 71, bomber: 20, 'fan-spitter': 5, support: 5, summoner: 2 },
      { slime: 57, kornkrabbler: 84, runner: 23, 'champion-charger': 1, spitter: 6, support: 6, summoner: 2, 'elite-spitter': 1 },
      { slime: 77, kornkrabbler: 98, brute: 20, 'fan-spitter': 6, support: 6, summoner: 2, 'elite-brute': 1 },
      { boss: 1 }
    ];
    const expectedXpBudgets = [90, 114, 138, 165, 195, 228, 340, 384, 448, 0];
    assert(catalog.length === 10, 'Wave catalog should contain exactly ten waves.', catalog);
    catalog.forEach((wave, index) => {
      assert(wave.queue.length === wave.count, `Wave ${wave.wave} queue length does not match its budget.`, wave);
      assert(wave.targetDuration[0] >= 22 && wave.targetDuration[1] <= 76, `Wave ${wave.wave} has an invalid duration target.`, wave);
      assert(wave.pressureCurve.length >= 1, `Wave ${wave.wave} is missing a pressure curve.`, wave);
      assert(wave.mobileActiveCap <= wave.targetPeak, `Wave ${wave.wave} mobile cap exceeds target peak.`, wave);
      assert(JSON.stringify(wave.typeCounts) === JSON.stringify(expectedTypes[index]), `Wave ${wave.wave} composition changed unexpectedly.`, wave);
      assert(Math.abs(wave.allocatedXp - expectedXpBudgets[index]) < 0.001,
        `Wave ${wave.wave} XP allocation drifted away from its fixed budget.`, wave);
    });
    assert(JSON.stringify(catalog[0].xpCurve.segmentShares) === JSON.stringify([0.3, 0.44, 0.1, 0.16]),
      'Wave one does not use the approved XP-only frontload curve.', catalog[0].xpCurve);
    assert(catalog.slice(1).every((wave) => wave.xpCurve.segmentShares === null),
      'XP frontloading leaked into a later wave.', catalog.map((wave) => wave.xpCurve));
    assert(catalog[9].bossWave && catalog[9].queue[0] === 'boss', 'Wave 10 must be the boss finale.', catalog[9]);

    const microDirections = {};
    const microId = await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.movePlayer(900, 450);
      return window.__ROOSTER_TEST__.spawnEnemyType('kornkrabbler', 700, 450, { speed: 0, damage: 0 });
    });
    for (const [direction, point] of Object.entries({
      right: [900, 450],
      left: [500, 450],
      up: [700, 250],
      down: [700, 650]
    })) {
      await page.evaluate(([x, y]) => window.__ROOSTER_TEST__.movePlayer(x, y), point);
      await page.waitForTimeout(50);
      microDirections[direction] = await page.evaluate((id) => (
        window.__ROOSTER_TEST__.getEnemySnapshot().find((enemy) => enemy.id === id)
      ), microId);
      assert(
        microDirections[direction]?.animation === `enemy-kornkrabbler-run-${direction}`,
        `Kornkrabbler did not select its ${direction} locomotion row.`,
        microDirections
      );
    }
    assert(microDirections.down.maxHp >= 6 && microDirections.down.maxHp <= 10,
      'Kornkrabbler HP is outside the micro-fodder corridor.', microDirections.down);
    assert(!microDirections.down.hpBarVisible,
      'Kornkrabbler must not allocate visible per-unit HP bars.', microDirections.down);

    const bundledMicroXp = await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearXpOrbs();
      const ids = Array.from({ length: 5 }, (_, index) => (
        window.__ROOSTER_TEST__.spawnEnemyType('kornkrabbler', 1000 + index * 3, 700, { speed: 0, damage: 0 })
      ));
      const enemies = window.__ROOSTER_TEST__.getEnemySnapshot();
      const expected = Math.floor(enemies.reduce((sum, enemy) => sum + enemy.xpValue, 0));
      ids.forEach((id) => window.__ROOSTER_TEST__.damageEnemyById(id, 999));
      return { expected, orbs: window.__ROOSTER_TEST__.getXpSnapshot() };
    });
    assert(bundledMicroXp.orbs.length <= 2,
      'Micro-fodder emitted one XP orb per kill instead of bundled drops.', bundledMicroXp);
    assert(bundledMicroXp.orbs.reduce((sum, orb) => sum + orb.value, 0) === bundledMicroXp.expected,
      'Bundled micro-fodder XP did not match its fractional internal budget.', bundledMicroXp);

    const safeSpawns = await page.evaluate(() => {
      window.__ROOSTER_TEST__.movePlayer(50, 50);
      return Array.from({ length: 10 }, () => window.__ROOSTER_TEST__.spawnSafeEnemyType());
    });
    assert(safeSpawns.every((spawn) => spawn.distance >= 280), 'An edge spawn violated player protection distance.', safeSpawns);

    const clusteredXp = await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearXpOrbs();
      return window.__ROOSTER_TEST__.spawnXpCluster(20, 3, 1180, 720);
    });
    assert(clusteredXp.length <= 2, 'Nearby XP drops were not spatially consolidated.', clusteredXp);
    assert(
      clusteredXp.reduce((sum, orb) => sum + orb.value, 0) === 60,
      'XP consolidation changed the total reward.',
      clusteredXp
    );

    const cappedXp = await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearXpOrbs();
      const state = window.__ROOSTER_TEST__.spawnXpField(120, 2);
      window.__ROOSTER_TEST__.clearXpOrbs();
      return state;
    });
    assert(cappedXp.active === cappedXp.softCap && cappedXp.softCap === 72,
      'Desktop XP-orb field did not stop at its soft cap.', cappedXp);
    assert(Math.abs(cappedXp.value - 240) < 0.001,
      'XP-orb cap discarded reward value instead of merging it.', cappedXp);

    const bossId = await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      const bossId = window.__ROOSTER_TEST__.spawnEnemyType('boss', 700, 450, {
        speed: 0,
        damage: 0,
        hp: 10000,
        entryProtectionMs: 0,
        heavyAttackDelay: 999999
      });
      window.__ROOSTER_TEST__.damageEnemyById(bossId, 3600);
      return bossId;
    });
    await page.waitForTimeout(80);
    const phaseOne = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot());
    const bossAfterPhaseOne = phaseOne.find((enemy) => enemy.id === bossId);
    assert(bossAfterPhaseOne?.bossPhaseIndex === 1, 'Boss did not enter its first health phase.', phaseOne);
    assert(phaseOne.filter((enemy) => enemy.type === 'slime').length === 6, 'Boss phase two did not summon six slimes.', phaseOne);
    assert(bossAfterPhaseOne.invulnerableUntil > bossAfterPhaseOne.bossSequenceReadyAt - 1,
      'Boss phase transition did not provide its protected recovery window.', bossAfterPhaseOne);

    await page.waitForTimeout(1200);
    await page.evaluate((id) => window.__ROOSTER_TEST__.damageEnemyById(id, 3300), bossId);
    await page.waitForTimeout(80);
    const phaseTwo = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot());
    const bossAfterPhaseTwo = phaseTwo.find((enemy) => enemy.id === bossId);
    assert(bossAfterPhaseTwo?.bossPhaseIndex === 2, 'Boss did not enter its final health phase.', phaseTwo);
    const finalSteps = bossAfterPhaseTwo.bossSequences[2].steps;
    assert(finalSteps.map((step) => step.kind).join(',')
      === 'fan,recovery,dash,recovery,fireball,recovery,add-pulse,recovery',
    'Final boss attack sequence is incomplete or unordered.', finalSteps);
    assert(finalSteps[0].count === 7 && finalSteps[0].telegraphMs >= 650,
      'Final boss fan does not expose its long seven-shot telegraph.', finalSteps[0]);
    assert(phaseTwo.filter((enemy) => enemy.type === 'runner').length === 4, 'Final boss phase did not summon four runners.', phaseTwo);
    assert(phaseTwo.filter((enemy) => enemy.type === 'spitter').length === 2, 'Final boss phase did not summon two spitters.', phaseTwo);
    assert(phaseTwo.filter((enemy) => enemy.id !== bossId).length === 6,
      'Final boss transition exceeded its six-add cap.', phaseTwo);
    assert(
      phaseTwo.filter((enemy) => enemy.id !== bossId).every((enemy) => Math.hypot(enemy.x - 700, enemy.y - 450) >= 190),
      'A boss add spawned inside the protected player radius.',
      phaseTwo
    );
    await page.evaluate(() => window.__ROOSTER_TEST__.movePlayer(400, 450));
    await page.screenshot({ path: path.join(artifactDir, 'boss-final-phase.png') });
    assert(errors.length === 0, 'Browser reported errors during wave curation test.', errors);
    return { name: 'wave curation', status: 'passed', catalog, safeSpawns, phaseTwo };
  } finally {
    await page.close();
  }
}

async function testEnemyAbilities(browser) {
  const { page, errors } = await openGame(browser, 'enemy-abilities');
  try {
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.spawnEnemyType('spitter', 900, 450, { speed: 0, damage: 0, hp: 999 });
    });
    await page.waitForTimeout(70);
    const spitterTelegraph = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(spitterTelegraph.enemyTelegraphs >= 1, 'Spitter did not telegraph its shot.', spitterTelegraph);
    assert(spitterTelegraph.enemyProjectiles === 0, 'Spitter fired before its telegraph completed.', spitterTelegraph);
    await page.waitForTimeout(260);
    const afterSpitter = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getState(),
      projectiles: window.__ROOSTER_TEST__.getEnemyProjectileSnapshot()
    }));
    assert(afterSpitter.state.enemyProjectiles >= 1, 'Spitter did not fire a projectile.', afterSpitter);
    assert(afterSpitter.projectiles.every((projectile) => !projectile.heavy
      && projectile.dangerLineWidth === 1
      && projectile.dangerStrokeAlpha <= 0.4
      && projectile.trailScaleX >= projectile.trailScaleY * 2.5
      && projectile.trailOffset > 0),
    'Normal Spitter projectiles do not use the restrained ring and directional trail.', afterSpitter);

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.spawnEnemyType('fan-spitter', 900, 450, { speed: 0, damage: 0, hp: 999 });
    });
    await page.waitForTimeout(70);
    const fanTelegraph = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(fanTelegraph.enemyTelegraphs >= 1, 'Fan Spitter did not telegraph its burst.', fanTelegraph);
    assert(fanTelegraph.enemyProjectiles === 0, 'Fan Spitter fired before its telegraph completed.', fanTelegraph);
    await page.screenshot({ path: path.join(artifactDir, 'fan-spitter-telegraph.png') });
    await page.waitForTimeout(280);
    const afterFan = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getState(),
      projectiles: window.__ROOSTER_TEST__.getEnemyProjectileSnapshot()
    }));
    assert(afterFan.state.enemyProjectiles >= 3, 'Fan Spitter did not fire a fan burst.', afterFan);
    assert(afterFan.projectiles.every((projectile) => !projectile.heavy
      && projectile.dangerLineWidth === 1
      && projectile.dangerStrokeAlpha <= 0.4
      && projectile.trailScaleX >= projectile.trailScaleY * 2.5),
    'Fan Spitter projectiles do not preserve the normal-projectile hierarchy.', afterFan);
    await page.screenshot({ path: path.join(artifactDir, 'fan-spitter-projectiles.png') });

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.spawnEnemyType('fan-spitter', 900, 450, { speed: 0, damage: 0, hp: 999 });
    });
    await page.waitForTimeout(70);
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.spawnEnemyType('slime', 900, 450, { speed: 0, damage: 0, hp: 999 });
    });
    await page.waitForTimeout(360);
    const afterRecycledFan = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(
      errors.length === 0,
      'A recycled Fan Spitter fired its stale delayed attack.',
      { errors, afterRecycledFan }
    );
    assert(
      afterRecycledFan.enemyProjectiles === 0,
      'A stale Fan Spitter timer emitted projectiles from a recycled enemy.',
      afterRecycledFan
    );

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.setPlayerHp(100);
      const id = window.__ROOSTER_TEST__.spawnEnemyType('bomber', 725, 450, { speed: 0, damage: 0, hp: 20 });
      window.__ROOSTER_TEST__.damageEnemyById(id, 999);
    });
    await page.waitForTimeout(560);
    const afterBomber = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(afterBomber.playerHp < 100, 'Bomber explosion did not damage nearby player.', afterBomber);

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.spawnEnemyType('boss', 940, 450, {
        speed: 0,
        damage: 0,
        hp: 9999,
        entryProtectionMs: 0
      });
    });
    await page.waitForTimeout(120);
    const bossFanTelegraph = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getState(),
      events: window.__ROOSTER_TEST__.getEncounterEvents()
    }));
    const fanSequenceEvents = bossFanTelegraph.events.filter((event) => (
      event.type === 'bossSequenceStepStarted'
    ));
    assert(bossFanTelegraph.state.enemyTelegraphs >= 1
      && fanSequenceEvents.at(-1)?.step === 'fan',
    'Boss sequence did not begin with its fan telegraph.', bossFanTelegraph);
    await page.waitForTimeout(480);
    await page.evaluate(() => window.__ROOSTER_TEST__.clearProjectiles());
    await page.waitForTimeout(1900);
    const bossTelegraph = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getState(),
      events: window.__ROOSTER_TEST__.getEncounterEvents()
    }));
    const bossSequenceEvents = bossTelegraph.events.filter((event) => (
      event.type === 'bossSequenceStepStarted'
    ));
    assert(bossTelegraph.state.enemyTelegraphs >= 1
      && bossTelegraph.events.some((event) => event.type === 'bossSequenceStepStarted'
        && event.step === 'recovery')
      && bossTelegraph.events.some((event) => event.type === 'bossSequenceStepStarted'
        && event.step === 'chase')
      && bossSequenceEvents.at(-1)?.step === 'fireball',
    'Boss did not sequence recovery and chase before its heavy fireball.', bossTelegraph);
    assert(bossTelegraph.state.enemyProjectiles === 0, 'Boss fireball launched before its telegraph completed.', bossTelegraph);
    await page.screenshot({ path: path.join(artifactDir, 'boss-fireball-telegraph.png') });
    await page.waitForFunction(() => window.__ROOSTER_TEST__.getEnemyProjectileSnapshot()
      .some((projectile) => projectile.texture === 'boss-fireball'), null, { timeout: 1200 });
    const { bossProjectiles, bossPosition } = await page.evaluate(() => ({
      bossProjectiles: window.__ROOSTER_TEST__.getEnemyProjectileSnapshot(),
      bossPosition: window.__ROOSTER_TEST__.getEnemySnapshot().find((enemy) => enemy.type === 'boss')
    }));
    const bossFireball = bossProjectiles.find((projectile) => projectile.texture === 'boss-fireball');
    assert(bossFireball, 'Boss did not create a visible fireball projectile.', bossProjectiles);
    assert(bossFireball.heavy
      && bossFireball.dangerLineWidth === 4
      && bossFireball.dangerStrokeAlpha >= 0.95
      && bossFireball.trailOffset === 0,
    'Boss fireball lost its dominant heavy-projectile warning treatment.', bossFireball);
    assert(bossFireball.vx < -100, 'Boss fireball does not appear to fly toward the player.', bossFireball);
    assert(bossPosition && bossFireball.x < bossPosition.x,
      'Boss fireball should spawn outside the boss and move left toward the player.', { bossFireball, bossPosition });
    await page.screenshot({ path: path.join(artifactDir, 'boss-fireball-projectile.png') });
    assert(errors.length === 0, 'Browser reported errors during enemy ability test.', errors);
    return {
      name: 'enemy abilities',
      status: 'passed',
      spitterTelegraph,
      afterSpitter,
      fanTelegraph,
      afterFan,
      afterRecycledFan,
      afterBomber,
      bossFanTelegraph,
      bossTelegraph,
      bossFireball
    };
  } finally {
    await page.close();
  }
}

async function testActiveUpgradeAbilities(browser) {
  const { page, errors } = await openGame(browser, 'active-upgrades');
  try {
    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.spawnEnemyType('brute', 900, 450, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.spawnEnemyType('brute', 1060, 420, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.spawnEnemyType('spitter', 1030, 510, { speed: 0, damage: 0, hp: 999 });
      window.__ROOSTER_TEST__.applyUpgradeById('orbit-eggs');
      window.__ROOSTER_TEST__.applyUpgradeById('golden-egg');
      window.__ROOSTER_TEST__.applyUpgradeById('molotov-egg');
      window.__ROOSTER_TEST__.applyUpgradeById('lightning-comb');
      window.__ROOSTER_TEST__.applyUpgradeById('support-chick');
      window.__ROOSTER_TEST__.applyUpgradeById('fire-eggs');
      window.__ROOSTER_TEST__.applyUpgradeById('rocket-egg');
      window.__ROOSTER_TEST__.applyUpgradeById('void-nest');
      window.__ROOSTER_TEST__.applyUpgradeById('laser-comb');
    });
    await page.waitForTimeout(850);
    const inFlight = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(inFlight.molotovProjectiles >= 1, 'Molotov Egg did not create a visible flight projectile.', inFlight);
    assert(inFlight.rocketProjectiles >= 1, 'Rocket Egg did not create a visible rocket projectile.', inFlight);
    assert(inFlight.supportChickens >= 1, 'Support Chick did not stay active.', inFlight);
    assert(inFlight.specialShots >= 3, 'Active upgrades did not fire enough special attacks.', inFlight);
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(errors.length === 0, 'Browser reported errors during active upgrade test.', errors);
    assert(state.orbitEggs >= 1, 'Orbit Eggs did not stay active.', state);
    assert(state.supportChickens >= 1, 'Support Chick did not stay active.', state);
    assert(state.specialShots >= 4, 'Golden/Lightning/Rocket/Laser abilities did not fire special attacks.', state);
    assert(state.hazardZones >= 1, 'Molotov Egg did not create a hazard zone.', state);
    assert(state.voidZones >= 1, 'Void Nest did not create a pull/damage zone.', state);
    assert(state.abilitySynergies.rocketFire, 'Fire Eggs did not empower Rocket Egg.', state.abilitySynergies);
    assert(state.abilitySynergies.orbitLightning, 'Orbit Eggs did not empower Lightning Comb.', state.abilitySynergies);
    assert(state.abilitySynergies.molotovVoid, 'Molotov Egg did not empower Void Nest.', state.abilitySynergies);
    assert(
      state.audio.activeVoices <= state.audio.maxGlobalVoices + 2,
      'Global audio voice budget was exceeded.',
      state.audio
    );
    return { name: 'active upgrade abilities', status: 'passed', inFlight, state };
  } finally {
    await page.close();
  }
}

async function testMobileProjectileHierarchy(browser) {
  const { page, errors } = await openGame(
    browser,
    'mobile-projectile-hierarchy',
    'ace',
    { width: 390, height: 844 }
  );
  try {
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.pauseWaves();
      api.clearEnemies();
      api.clearProjectiles();
      api.spawnEnemyType('fan-spitter', 700, 190, { speed: 0, damage: 0, hp: 9999 });
    });
    await page.waitForTimeout(370);
    const result = await page.evaluate(() => ({
      state: window.__ROOSTER_TEST__.getState(),
      projectiles: window.__ROOSTER_TEST__.getEnemyProjectileSnapshot()
    }));
    assert(result.state.cameraZoom <= 0.9,
      'Mobile projectile hierarchy test did not use the portrait camera zoom.', result);
    assert(result.projectiles.length >= 3
      && result.projectiles.every((projectile) => !projectile.heavy
        && projectile.dangerLineWidth === 1
        && projectile.dangerStrokeAlpha <= 0.4
        && projectile.trailScaleX >= projectile.trailScaleY * 2.5),
    'Mobile fan projectiles lost the restrained ring and directional trail.', result);
    await page.screenshot({ path: path.join(artifactDir, 'fan-spitter-projectiles-mobile.png') });
    assert(errors.length === 0, 'Browser errors during mobile projectile visual hierarchy test.', errors);
    return {
      name: 'mobile enemy projectile hierarchy',
      status: 'passed',
      viewport: result.state.viewport,
      cameraZoom: result.state.cameraZoom,
      projectileCount: result.projectiles.length
    };
  } finally {
    await page.close();
  }
}

async function inspectTargetAcquisitionGate(browser, label, viewport) {
  const { page, errors } = await openGame(browser, `target-gate-${label}`, 'ace', viewport);
  try {
    const result = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.pauseWaves();
      api.clearEnemies();
      api.clearProjectiles();
      const baseState = api.getState();
      const initial = api.getTargetAcquisitionState();
      const bounds = initial.bounds;
      const centerY = bounds.y + bounds.height / 2;
      const insideId = api.spawnEnemyType('slime', bounds.x + bounds.width - 36, centerY, {
        speed: 0,
        damage: 0,
        hp: 9999
      });
      const outsideIds = [0, 1, 2].map((index) => api.spawnEnemyType(
        'slime',
        bounds.x + bounds.width + 72 + index * 8,
        centerY + index * 8,
        { speed: 0, damage: 0, hp: 9999 }
      ));
      api.triggerPrimaryAttack();
      api.applyUpgradeById('molotov-egg');
      api.triggerActiveAbility('molotov-egg');
      const mixed = api.getTargetAcquisitionState();
      const molotovTarget = api.getAreaEffectState().molotovTargets[0] ?? null;
      api.clearEnemies();
      api.clearProjectiles();
      const outsideOnlyId = api.spawnEnemyType(
        'slime',
        bounds.x + bounds.width + 90,
        centerY,
        { speed: 0, damage: 0, hp: 9999 }
      );
      const shotsWithOnlyOutsideTarget = api.triggerPrimaryAttack();
      const outsideOnly = api.getTargetAcquisitionState();
      return {
        baseState,
        initial,
        insideId,
        outsideIds,
        mixed,
        molotovTarget,
        outsideOnlyId,
        shotsWithOnlyOutsideTarget,
        outsideOnly
      };
    });
    const { baseState, initial, insideId, outsideIds, mixed, molotovTarget, outsideOnly } = result;
    assert(initial.bounds.width > initial.bounds.visibleWidth * 1.99
      && initial.bounds.width < initial.bounds.visibleWidth * 2.01
      && initial.bounds.height > initial.bounds.visibleHeight * 1.99
      && initial.bounds.height < initial.bounds.visibleHeight * 2.01,
    `${label}: acquisition rectangle is not exactly camera view plus a half-screen margin per side.`, result);
    assert(Math.abs(initial.bounds.visibleWidth - baseState.viewport.width / baseState.cameraZoom) < 2
      && Math.abs(initial.bounds.visibleHeight - baseState.viewport.height / baseState.cameraZoom) < 2,
    `${label}: acquisition rectangle does not follow the logical camera viewport.`, result);
    assert(mixed.targetableIds.includes(insideId)
      && outsideIds.every((id) => !mixed.targetableIds.includes(id)),
    `${label}: inside/outside targets were not separated at the camera-relative boundary.`, result);
    assert(mixed.nearestId === insideId
      && mixed.projectileTargetIds.length >= 1
      && mixed.projectileTargetIds.every((id) => id === insideId),
    `${label}: primary fire selected an enemy outside the acquisition rectangle.`, result);
    assert(molotovTarget
      && molotovTarget.x < initial.bounds.x + initial.bounds.width,
    `${label}: cluster targeting preferred an off-screen group outside the acquisition rectangle.`, result);
    assert(result.shotsWithOnlyOutsideTarget === 0
      && outsideOnly.nearestId === null
      && outsideOnly.targetableIds.length === 0,
    `${label}: a new shot was fired when only an out-of-range enemy existed.`, result);
    assert(errors.length === 0, `${label}: browser errors during target acquisition test.`, errors);
    return {
      label,
      viewport,
      cameraZoom: baseState.cameraZoom,
      visibleWorld: {
        width: initial.bounds.visibleWidth,
        height: initial.bounds.visibleHeight
      },
      acquisitionWorld: {
        width: initial.bounds.width,
        height: initial.bounds.height
      }
    };
  } finally {
    await page.close();
  }
}

async function testTargetAcquisitionGate(browser) {
  const desktop = await inspectTargetAcquisitionGate(browser, 'desktop', { width: 960, height: 540 });
  const portrait = await inspectTargetAcquisitionGate(browser, 'portrait-mobile', { width: 390, height: 844 });
  return { name: 'camera-relative target acquisition', status: 'passed', desktop, portrait };
}

async function testStrandedEnemyRecovery(browser) {
  const { page, errors } = await openGame(
    browser,
    'stranded-enemy-recovery',
    'ace',
    { width: 390, height: 844 }
  );
  try {
    const recovery = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.pauseWaves();
      api.clearEnemies();
      api.clearProjectiles();
      const bounds = api.getTargetAcquisitionState().bounds;
      const enemyId = api.spawnEnemyType(
        'slime',
        bounds.x - 600,
        bounds.y + bounds.height / 2,
        { speed: 0, damage: 0, hp: 9999, xpOverride: 0 }
      );
      const before = api.getTargetAcquisitionState();
      const beforeGrace = api.forceStrandedEnemyCleanup(9000);
      const afterGrace = api.forceStrandedEnemyCleanup(10001);
      const after = api.getTargetAcquisitionState();
      return { bounds, enemyId, before, beforeGrace, afterGrace, after };
    });
    assert(recovery.enemyId && !recovery.before.targetableIds.includes(recovery.enemyId),
      'Recovery fixture did not begin outside the camera-relative acquisition bounds.', recovery);
    assert(recovery.beforeGrace.recovered === 0,
      'A stranded enemy was moved before the ten-second grace period.', recovery);
    assert(recovery.afterGrace.recovered === 1
      && recovery.after.targetableIds.includes(recovery.enemyId)
      && recovery.afterGrace.cleanup.recoveries === 1,
    'The final stranded enemy was not restored to the targetable play area.', recovery);

    const crowdGuard = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      const bounds = api.getTargetAcquisitionState().bounds;
      for (let index = 0; index < 4; index += 1) {
        api.spawnEnemyType(
          'slime',
          bounds.x - 600 - index * 40,
          bounds.y + 120 + index * 70,
          { speed: 0, damage: 0, hp: 9999, xpOverride: 0 }
        );
      }
      return {
        result: api.forceStrandedEnemyCleanup(20000),
        state: api.getTargetAcquisitionState()
      };
    });
    assert(crowdGuard.result.recovered === 0
      && crowdGuard.state.activeEnemyIds.length === 4
      && crowdGuard.state.targetableIds.length === 0,
    'Cleanup recovery modified a live group above its conservative three-enemy limit.', crowdGuard);
    assert(errors.length === 0, 'Browser errors during stranded-enemy recovery test.', errors);
    return { name: 'stranded enemy recovery', status: 'passed', recovery, crowdGuard };
  } finally {
    await page.close();
  }
}

async function testAreaEffectReadability(browser) {
  const { page, errors } = await openGame(browser, 'area-effect-readability');
  try {
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.pauseWaves();
      api.clearEnemies();
      api.clearProjectiles();
      api.movePlayer(700, 450);
      api.spawnEnemyType('brute', 900, 450, { speed: 0, damage: 0, hp: 9999 });
      ['molotov-egg', 'void-nest', 'laser-comb'].forEach((id) => api.applyUpgradeById(id));
      api.triggerActiveAbility('molotov-egg');
      api.triggerActiveAbility('void-nest');
      api.triggerActiveAbility('laser-comb');
    });
    const charge = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(charge.laserVisuals >= 1, 'Laser charge visual did not start.', charge);
    assert(charge.molotovProjectiles === 1, 'Rank-one Molotov should launch one projectile.', charge);
    assert(charge.voids[0]?.maxLife === 4200
      && charge.voids[0]?.radius === 132
      && charge.voids[0]?.alpha >= 0.5
      && charge.voids[0]?.portalWidth > charge.voids[0]?.portalHeight * 1.55
      && charge.voids[0]?.pullSamples.outer < charge.voids[0]?.pullSamples.middle
      && charge.voids[0]?.pullSamples.middle < charge.voids[0]?.pullSamples.inner,
    'Void Nest did not start its perspective-correct 4.2 second pull presentation.', charge);

    await page.waitForTimeout(210);
    const beam = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(beam.laserVisuals >= 1, 'Laser disappeared before its readable beam phase.', beam);
    await page.screenshot({ path: path.join(artifactDir, 'laser-readability-runtime.png') });

    await page.waitForTimeout(700);
    const settled = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(settled.laserVisuals === 0, 'Laser visuals outlived their bounded afterglow.', settled);
    assert(settled.hazards[0]?.maxLife === 3000
      && settled.hazards[0]?.radius === 90
      && settled.hazards[0]?.texture === 'molotov-ground-r1'
      && settled.hazards[0]?.animation === null
      && settled.hazards[0]?.flameCount === 3
      && Math.abs(settled.hazards[0]?.groundWidth - 187.2) < 0.01
      && Math.abs(settled.hazards[0]?.groundHeight - 117) < 0.01,
    'Molotov did not enter the modular rank-one ground-fire presentation.', settled);
    assert(settled.voids[0]?.frame === 14 && settled.voids[0]?.alpha >= 0.5,
      'Void Nest did not hold its readable portal frame.', settled);
    assert(settled.burningEnemies[0]?.overlay === 'enemy-burn-overlay-sheet'
      && settled.burningEnemies[0]?.animation === 'enemy-burn-overlay-loop'
      && settled.burningEnemies[0]?.remainingMs > 2500,
    'Molotov contact did not apply the three-second animated burn status.', settled);
    await page.screenshot({ path: path.join(artifactDir, 'aoe-readability-runtime.png') });

    await page.waitForTimeout(80);
    const settledMotion = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    const beforeFlames = settled.hazards[0].flamePositions;
    const afterFlames = settledMotion.hazards[0].flamePositions;
    assert(beforeFlames.every((flame, index) => (
      flame.x === afterFlames[index].x
      && flame.y === afterFlames[index].y
      && Math.abs(flame.scaleX - afterFlames[index].scaleX) < 0.04
      && Math.abs(flame.scaleY - afterFlames[index].scaleY) < 0.08
    )) && beforeFlames.some((flame, index) => (
      Math.abs(flame.scaleY - afterFlames[index].scaleY) > 0.001
    )), 'Molotov flame emitters jittered or failed to animate continuously.', {
      beforeFlames,
      afterFlames
    });

    await page.waitForTimeout(1370);
    const sustained = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(sustained.hazards.length === 1 && sustained.voids.length === 1,
      'Area effects vanished before their new readable hold windows.', sustained);

    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearProjectiles();
      for (let rank = 2; rank <= 4; rank += 1) api.applyUpgradeById('molotov-egg');
      api.triggerActiveAbility('molotov-egg');
    });
    const firstThrow = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(firstThrow.molotovProjectiles === 1,
      'Rank-four Molotov launched both projectiles simultaneously.', firstThrow);
    await page.waitForTimeout(300);
    const secondThrow = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(secondThrow.molotovProjectiles === 2,
      'Rank-four Molotov did not launch its delayed second projectile.', secondThrow);
    await page.waitForTimeout(720);
    const rankFour = await page.evaluate(() => window.__ROOSTER_TEST__.getAreaEffectState());
    assert(rankFour.hazards.length === 2
      && rankFour.hazards.every((zone) => (
        zone.maxLife === 4000
        && zone.radius === 112
        && zone.texture === 'molotov-ground-r4'
        && zone.flameCount === 6
      )),
    'Rank-four Molotov did not create two compact four-second fields.', rankFour);
    await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.clearEnemies();
      api.clearProjectiles();
      api.spawnEnemyType('runner', 1000, 450, { damage: 0, hp: 9999 });
    });
    await page.waitForTimeout(120);
    const predictiveAim = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      const enemy = api.getEnemySnapshot()[0];
      api.triggerActiveAbility('molotov-egg');
      const target = api.getAreaEffectState().molotovTargets[0];
      return {
        enemy,
        target,
        leadDot: (target.x - enemy.x) * enemy.velocityX + (target.y - enemy.y) * enemy.velocityY
      };
    });
    assert(predictiveAim.leadDot > 0,
      'Molotov did not lead a moving target along its travel direction.', predictiveAim);
    assert(errors.length === 0, 'Browser reported errors during area-effect readability test.', errors);
    return {
      name: 'area effect readability',
      status: 'passed',
      charge,
      beam,
      settled,
      settledMotion,
      sustained,
      rankFour,
      predictiveAim
    };
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
    const results = [];
    results.push(await testUpgrades(browser));
    results.push(await testUpgradeOffers(browser));
    results.push(await testNewUpgradeMechanics(browser));
    results.push(await testRoosterClasses(browser));
    results.push(await testTripleShotTrajectory(browser));
    results.push(await testWaveCuration(browser));
    results.push(await testEnemyAbilities(browser));
    results.push(await testMobileProjectileHierarchy(browser));
    results.push(await testActiveUpgradeAbilities(browser));
    results.push(await testAreaEffectReadability(browser));
    results.push(await testTargetAcquisitionGate(browser));
    results.push(await testStrandedEnemyRecovery(browser));
    const report = {
      generatedAt: new Date().toISOString(),
      results
    };
    await fs.writeFile(path.join(artifactDir, 'mechanics-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster mechanics test passed.');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await stopTestServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
