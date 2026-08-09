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
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  const { server, url } = await ensureTestServer();
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

    await page.evaluate(() => window.__ROOSTER_TEST__.restart());
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().frames > 5);
    const afterRestart = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.waitForTimeout(500);
    const afterRestartAdvance = await page.evaluate(() => window.__ROOSTER_TEST__.getState());

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
    assert(!afterRestart.lastError && !afterRestartAdvance.lastError, 'Game recorded an error after restart.', {
      afterRestart,
      afterRestartAdvance
    });
    assert(afterRestartAdvance.frames > afterRestart.frames, 'Game loop did not continue after restart.', {
      afterRestart,
      afterRestartAdvance
    });

    const mobileErrors = [];
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    mobilePage.on('pageerror', (error) => mobileErrors.push(error.stack ?? error.message));
    mobilePage.on('console', (message) => {
      if (message.type() === 'error') {
        mobileErrors.push(message.text());
      }
    });
    await mobilePage.goto(url, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForFunction(() => window.__ROOSTER_TEST__?.getState().frames > 30);
    const mobileState = await mobilePage.evaluate(() => window.__ROOSTER_TEST__.getState());
    const mobileCanvas = await mobilePage.locator('canvas').boundingBox();
    const joystickDisplay = await mobilePage.locator('.joystick').evaluate(
      (element) => getComputedStyle(element).display
    );
    await mobilePage.screenshot({ path: path.join(artifactDir, 'rooster-smoke-mobile.png') });
    assert(mobileErrors.length === 0, 'Mobile browser reported console/page errors.', mobileErrors);
    assert(!mobileState.lastError && mobileState.frames > 30, 'Mobile game loop did not start cleanly.', mobileState);
    assert(mobileCanvas?.width >= 380 && mobileCanvas?.height >= 830, 'Mobile canvas does not fill the viewport.', mobileCanvas);
    assert(joystickDisplay !== 'none', 'Mobile joystick is not visible.', { joystickDisplay });
    await mobilePage.close();

    const failureContext = await browser.newContext({ viewport: { width: 640, height: 360 } });
    const failurePage = await failureContext.newPage();
    const failureRequests = [];
    failurePage.on('request', (request) => {
      failureRequests.push(`${request.resourceType()}: ${request.url()}`);
    });
    await failurePage.route('**/*', async (route) => {
      if (
        route.request().resourceType() === 'xhr'
        && route.request().url().includes('arena-ground')
      ) {
        await route.abort();
      } else {
        await route.continue();
      }
    });
    await failurePage.goto(url, { waitUntil: 'domcontentloaded' });
    await failurePage.waitForTimeout(2000);
    const failedLoadState = await failurePage.evaluate(() => ({
      loadState: document.body.dataset.roosterLoadState,
      testApiInstalled: Boolean(window.__ROOSTER_TEST__),
      pageUrl: location.href,
      bodyHtml: document.body.innerHTML.slice(0, 300)
    }));
    await failurePage.screenshot({ path: path.join(artifactDir, 'rooster-asset-error.png') });
    assert(failedLoadState.loadState === 'error', 'Missing asset did not expose a load error state.', {
      failedLoadState,
      failureRequests
    });
    assert(!failedLoadState.testApiInstalled, 'Game initialized despite a required asset load failure.', failedLoadState);
    await failureContext.close();

    console.log('Rooster smoke test passed.');
    console.log(JSON.stringify({ initial, afterBoot, beforeCombat, afterCombat, afterRestart, afterRestartAdvance, mobileState, failedLoadState }, null, 2));
  } finally {
    await stopTestServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
