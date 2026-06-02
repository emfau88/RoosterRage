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

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const server = await ensureServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];

  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
    } catch (error) {
      await page.screenshot({ path: path.join(artifactDir, 'rooster-smoke-boot-failure.png') });
      const bodyText = await page.locator('body').innerText().catch(() => '');
      throw new Error(`Test API did not become available.\nErrors: ${JSON.stringify(errors, null, 2)}\nBody: ${bodyText}\n${error.message}`);
    }

    const initial = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.waitForTimeout(2500);
    const afterBoot = await page.evaluate(() => window.__ROOSTER_TEST__.getState());

  await page.evaluate(() => {
    window.__ROOSTER_TEST__.movePlayer(700, 450);
    window.__ROOSTER_TEST__.setShotCount(3);
    window.__ROOSTER_TEST__.forceSpawnEnemy(790, 450);
  });
    const beforeCombat = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.waitForTimeout(2400);
    const afterCombat = await page.evaluate(() => window.__ROOSTER_TEST__.getState());

    await page.screenshot({ path: path.join(artifactDir, 'rooster-smoke.png') });

    assert(errors.length === 0, 'Browser reported console/page errors.', errors);
    assert(!afterBoot.lastError && !afterCombat.lastError, 'Game recorded a runtime error.', {
      afterBoot,
      afterCombat
    });
    assert(afterBoot.frames > initial.frames + 60, 'Game loop appears frozen during boot.', {
      initial,
      afterBoot
    });
    assert(afterBoot.elapsed > initial.elapsed + 1.5, 'Game time did not advance during boot.', {
      initial,
      afterBoot
    });
    assert(afterBoot.enemies > 0, 'Wave system did not spawn enemies.', afterBoot);
    assert(afterCombat.frames > beforeCombat.frames + 60, 'Game loop appears frozen during combat.', {
      beforeCombat,
      afterCombat
    });
    assert(afterCombat.shots >= beforeCombat.shots + 3, 'Triple-shot did not produce multiple projectiles during combat.', {
      beforeCombat,
      afterCombat
    });
    assert(afterCombat.hits > beforeCombat.hits, 'Projectiles did not damage enemies during combat.', {
      beforeCombat,
      afterCombat
    });

    console.log('Rooster smoke test passed.');
    console.log(JSON.stringify({ initial, afterBoot, beforeCombat, afterCombat }, null, 2));
  } finally {
    await stopServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
