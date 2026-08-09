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

async function openGame(browser, label) {
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
    assert(after.critChance === 0.1, 'Critical Yolk did not increase critical chance.', { before, after });
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
    assert(catalog.length === 25, 'Upgrade catalog should contain exactly 25 upgrades.', catalog);
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
    await page.waitForTimeout(180);
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
    await page.waitForTimeout(230);
    const afterFan = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(afterFan.enemyProjectiles >= 3, 'Fan Spitter did not fire a fan burst.', afterFan);
    await page.screenshot({ path: path.join(artifactDir, 'fan-spitter-projectiles.png') });

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.movePlayer(700, 450);
      window.__ROOSTER_TEST__.setPlayerHp(100);
      const id = window.__ROOSTER_TEST__.spawnEnemyType('bomber', 725, 450, { speed: 0, damage: 0, hp: 20 });
      window.__ROOSTER_TEST__.damageEnemyById(id, 999);
    });
    await page.waitForTimeout(200);
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
    results.push(await testTripleShotTrajectory(browser));
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
