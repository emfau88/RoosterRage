import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'http://127.0.0.1:5173/';
const projectRoot = path.resolve(import.meta.dirname, '..');
const artifactDir = path.join(projectRoot, 'test-results');

function loadPlaywright() {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error('APPDATA is not set; cannot locate global Playwright install.');
  }
  const playwrightPackage = path.join(appData, 'npm', 'node_modules', 'playwright', 'package.json');
  const require = createRequire(playwrightPackage);
  return require('playwright');
}

async function isServerReady() {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    if (await isServerReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function ensureServer() {
  if (await isServerReady()) {
    return null;
  }

  const { createServer } = await import('vite');
  const server = await createServer({
    root: projectRoot,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true
    }
  });
  await server.listen();

  if (!(await waitForServer())) {
    await server.close();
    throw new Error('Dev server did not become ready.');
  }

  return server;
}

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

async function stopServer(server) {
  if (!server) {
    return;
  }
  await server.close();
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
  await page.goto(url, { waitUntil: 'domcontentloaded' });
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
      'bigger-eggs'
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

    return { name: 'upgrades', status: 'passed', before, after };
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
    const sideProjectiles = projectiles.filter((projectile) => projectile.targetOffset !== 0);
    assert(sideProjectiles.length >= 2, 'Triple Shot side projectiles were not present.', projectiles);
    assert(sideProjectiles.every((projectile) => projectile.homing === false), 'Side projectiles should not home.', sideProjectiles);
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
    await page.waitForTimeout(300);
    const afterSpitter = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(afterSpitter.enemyProjectiles >= 1, 'Spitter did not fire a projectile.', afterSpitter);

    await page.evaluate(() => {
      window.__ROOSTER_TEST__.clearEnemies();
      window.__ROOSTER_TEST__.clearProjectiles();
      window.__ROOSTER_TEST__.spawnEnemyType('fan-spitter', 900, 450, { speed: 0, damage: 0, hp: 999 });
    });
    await page.waitForTimeout(300);
    const afterFan = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(afterFan.enemyProjectiles >= 3, 'Fan Spitter did not fire a fan burst.', afterFan);

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
    assert(errors.length === 0, 'Browser reported errors during enemy ability test.', errors);
    return { name: 'enemy abilities', status: 'passed', afterSpitter, afterFan, afterBomber };
  } finally {
    await page.close();
  }
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const server = await ensureServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const results = [];
    results.push(await testUpgrades(browser));
    results.push(await testTripleShotTrajectory(browser));
    results.push(await testEnemyAbilities(browser));
    const report = {
      generatedAt: new Date().toISOString(),
      results
    };
    await fs.writeFile(path.join(artifactDir, 'mechanics-report.json'), JSON.stringify(report, null, 2));
    console.log('Rooster mechanics test passed.');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await stopServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
