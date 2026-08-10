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

async function openGame(browser, label, roosterId = 'ace') {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
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
    assert(catalog.length === 42, 'Upgrade catalog should contain 31 base upgrades and 11 EVOs.', catalog);
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

    await page.evaluate(() => window.__ROOSTER_TEST__.previewUpgradeOverlay());
    await page.screenshot({ path: path.join(artifactDir, 'upgrade-cards-phase-5.png') });

    const spectacle = choices.find((choice) => spectacleCategories.has(choice.category));
    await page.evaluate((id) => window.__ROOSTER_TEST__.applyUpgradeById(id), spectacle.id);
    const guaranteeAfter = await page.evaluate(() => window.__ROOSTER_TEST__.shouldGuaranteeSpectacle());
    assert(!guaranteeAfter, 'Spectacle guarantee should stop after choosing a spectacle upgrade.');
    assert(errors.length === 0, 'Browser reported errors during upgrade offer test.', errors);
    return { name: 'upgrade offers', status: 'passed', choices, spectacle: spectacle.id };
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
    const enemies = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot())
      .then((items) => items.filter((enemy) => enemy.maxHp === 999));
    await page.screenshot({ path: path.join(artifactDir, `rooster-${roosterId}-primary.png`) });
    assert(errors.length === 0, `Browser reported errors for rooster ${roosterId}.`, errors);
    assert(enemies.length === 3, `Controlled targets missing for rooster ${roosterId}.`, enemies);
    return { roosterId, catalog, stats, visual, enemies };
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
  });
  assert(ace.visual.markers === 1, 'Ace visual identity marker is missing.', ace.visual);
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
    });
    await page.waitForTimeout(950);
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
      { slime: 30 },
      { slime: 26, runner: 12 },
      { slime: 24, runner: 17, brute: 4, 'elite-runner': 1 },
      { slime: 31, runner: 14, spitter: 10 },
      { slime: 35, runner: 16, 'fan-spitter': 10, brute: 4 },
      { slime: 28, runner: 24, 'fan-spitter': 14, brute: 9, 'elite-runner': 1 },
      { slime: 40, bomber: 20, 'fan-spitter': 16, support: 5, summoner: 4 },
      { slime: 45, runner: 24, spitter: 15, support: 6, summoner: 5, 'elite-spitter': 1 },
      { slime: 59, brute: 20, 'fan-spitter': 18, support: 6, summoner: 8, 'elite-brute': 1 },
      { boss: 1 }
    ];
    assert(catalog.length === 10, 'Wave catalog should contain exactly ten waves.', catalog);
    catalog.forEach((wave, index) => {
      assert(wave.queue.length === wave.count, `Wave ${wave.wave} queue length does not match its budget.`, wave);
      assert(wave.targetDuration[0] >= 22 && wave.targetDuration[1] <= 76, `Wave ${wave.wave} has an invalid duration target.`, wave);
      assert(wave.pressureCurve.length >= 1, `Wave ${wave.wave} is missing a pressure curve.`, wave);
      assert(wave.mobileActiveCap <= wave.targetPeak, `Wave ${wave.wave} mobile cap exceeds target peak.`, wave);
      assert(JSON.stringify(wave.typeCounts) === JSON.stringify(expectedTypes[index]), `Wave ${wave.wave} composition changed unexpectedly.`, wave);
    });
    assert(catalog[9].bossWave && catalog[9].queue[0] === 'boss', 'Wave 10 must be the boss finale.', catalog[9]);

    const safeSpawns = await page.evaluate(() => {
      window.__ROOSTER_TEST__.movePlayer(50, 50);
      return Array.from({ length: 10 }, () => window.__ROOSTER_TEST__.spawnSafeEnemyType());
    });
    assert(safeSpawns.every((spawn) => spawn.distance >= 280), 'An edge spawn violated player protection distance.', safeSpawns);

    const clusteredXp = await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      return window.__ROOSTER_TEST__.spawnXpCluster(20, 3, 1180, 720);
    });
    assert(clusteredXp.length <= 2, 'Nearby XP drops were not spatially consolidated.', clusteredXp);
    assert(
      clusteredXp.reduce((sum, orb) => sum + orb.value, 0) === 60,
      'XP consolidation changed the total reward.',
      clusteredXp
    );

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
    assert(phaseOne.filter((enemy) => enemy.type === 'slime').length === 12, 'Boss phase one did not summon twelve slimes.', phaseOne);

    await page.evaluate((id) => window.__ROOSTER_TEST__.damageEnemyById(id, 3300), bossId);
    await page.waitForTimeout(80);
    const phaseTwo = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemySnapshot());
    const bossAfterPhaseTwo = phaseTwo.find((enemy) => enemy.id === bossId);
    assert(bossAfterPhaseTwo?.bossPhaseIndex === 2, 'Boss did not enter its final health phase.', phaseTwo);
    assert(bossAfterPhaseTwo.ability.count === 7 && bossAfterPhaseTwo.ability.cooldown === 1700, 'Final boss fan was not upgraded.', bossAfterPhaseTwo);
    assert(bossAfterPhaseTwo.heavyProjectile.cooldown === 3200, 'Final boss fireball cadence was not upgraded.', bossAfterPhaseTwo);
    assert(phaseTwo.filter((enemy) => enemy.type === 'runner').length === 8, 'Final boss phase did not summon runners.', phaseTwo);
    assert(phaseTwo.filter((enemy) => enemy.type === 'spitter').length === 5, 'Final boss phase did not summon spitters.', phaseTwo);
    assert(phaseTwo.filter((enemy) => enemy.type === 'bomber').length === 5, 'Final boss phase did not summon bombers.', phaseTwo);
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
    const afterSpitter = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(afterSpitter.enemyProjectiles >= 1, 'Spitter did not fire a projectile.', afterSpitter);

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
    const afterFan = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(afterFan.enemyProjectiles >= 3, 'Fan Spitter did not fire a fan burst.', afterFan);
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
        entryProtectionMs: 0,
        ability: null,
        heavyAttackDelay: 120
      });
    });
    await page.waitForTimeout(160);
    const bossTelegraph = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(bossTelegraph.enemyTelegraphs >= 1, 'Boss did not telegraph its heavy fireball.', bossTelegraph);
    assert(bossTelegraph.enemyProjectiles === 0, 'Boss fireball launched before its telegraph completed.', bossTelegraph);
    await page.screenshot({ path: path.join(artifactDir, 'boss-fireball-telegraph.png') });
    await page.waitForTimeout(470);
    const bossProjectiles = await page.evaluate(() => window.__ROOSTER_TEST__.getEnemyProjectileSnapshot());
    const bossFireball = bossProjectiles.find((projectile) => projectile.texture === 'boss-fireball');
    assert(bossFireball, 'Boss did not create a visible fireball projectile.', bossProjectiles);
    assert(bossFireball.vx < -100, 'Boss fireball does not appear to fly toward the player.', bossFireball);
    assert(bossFireball.x < 940, 'Boss fireball should spawn outside the boss and move left toward the player.', bossFireball);
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
    results.push(await testActiveUpgradeAbilities(browser));
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
