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

async function startRunFromHub(page, rooster = 'ace') {
  await page.locator('[data-hub-tab="roosters"]').click();
  await page.locator(`.rooster-card--${rooster}`).click();
  const startButton = page.locator('[data-run-start]');
  await startButton.scrollIntoViewIfNeeded();
  await startButton.click();
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

    const roosterCards = await page.locator('.rooster-card').count();
    const roosterPortraits = await page.locator('.rooster-card__portrait-image').evaluateAll((images) => (
      images.map((image) => ({ src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight }))
    ));
    await page.screenshot({ path: path.join(artifactDir, 'rooster-class-selection.png') });
    assert(roosterCards === 3, 'Pre-run selection should show three rooster classes.', { roosterCards });
    assert(roosterPortraits.length === 3 && new Set(roosterPortraits.map((portrait) => portrait.src)).size === 3,
      'Rooster cards must use three distinct portrait assets.', roosterPortraits);
    assert(roosterPortraits.every((portrait) => portrait.width === 512 && portrait.height === 512),
      'Rooster portraits were not loaded at their production dimensions.', roosterPortraits);
    await startRunFromHub(page);
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().frames > 2);
    const initial = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.keyboard.down('d');
    await page.waitForFunction(
      (startX) => window.__ROOSTER_TEST__?.getState().player.x > startX + 20,
      initial.player.x,
      { timeout: 3000 }
    );
    await page.keyboard.up('d');
    const afterKeyboardMove = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.waitForFunction(
      (startElapsed) => window.__ROOSTER_TEST__?.getState().elapsed > startElapsed + 1.5,
      initial.elapsed,
      { timeout: 8000 }
    );
    const afterBoot = await page.evaluate(() => window.__ROOSTER_TEST__.getState());

  await page.evaluate(() => {
    window.__ROOSTER_TEST__.movePlayer(700, 450);
    window.__ROOSTER_TEST__.setShotCount(3);
    window.__ROOSTER_TEST__.forceSpawnEnemy(790, 450);
  });
    const beforeCombat = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.waitForFunction(
      (startFrames) => window.__ROOSTER_TEST__?.getState().frames > startFrames + 60,
      beforeCombat.frames,
      { timeout: 10000 }
    );
    const afterCombat = await page.evaluate(() => window.__ROOSTER_TEST__.getState());

    await page.evaluate(() => window.__ROOSTER_TEST__.restart());
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().choosingRooster);
    await startRunFromHub(page);
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().frames > 5);
    const afterRestart = await page.evaluate(() => window.__ROOSTER_TEST__.getState());
    await page.waitForFunction(
      (startFrames) => window.__ROOSTER_TEST__?.getState().frames > startFrames,
      afterRestart.frames,
      { timeout: 3000 }
    );
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
    assert(
      afterKeyboardMove.player.x > initial.player.x + 20,
      'Desktop keyboard input did not move the player.',
      { initial: initial.player, afterKeyboardMove: afterKeyboardMove.player }
    );
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
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('pageerror', (error) => mobileErrors.push(error.stack ?? error.message));
    mobilePage.on('console', (message) => {
      if (message.type() === 'error') {
        mobileErrors.push(message.text());
      }
    });
    await mobilePage.goto(url, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForFunction(() => window.__ROOSTER_TEST__?.getState);
    await mobilePage.locator('[data-hub-tab="roosters"]').click();
    await mobilePage.locator('.rooster-card--storm').scrollIntoViewIfNeeded();
    await mobilePage.screenshot({ path: path.join(artifactDir, 'rooster-class-selection-mobile.png') });
    await mobilePage.locator('.rooster-card--ace').click();
    await mobilePage.locator('[data-run-start]').click();
    await mobilePage.waitForFunction(() => window.__ROOSTER_TEST__?.getState().frames > 30);
    const mobileState = await mobilePage.evaluate(() => window.__ROOSTER_TEST__.getState());
    await mobilePage.mouse.move(70, 700);
    await mobilePage.mouse.down();
    await mobilePage.mouse.move(125, 700, { steps: 5 });
    await mobilePage.waitForFunction(
      (startX) => window.__ROOSTER_TEST__?.getState().player.x > startX + 20,
      mobileState.player.x,
      { timeout: 5000 }
    );
    await mobilePage.mouse.up();
    const mobileAfterTouch = await mobilePage.evaluate(() => window.__ROOSTER_TEST__.getState());
    const mobileCanvas = await mobilePage.locator('canvas').boundingBox();
    const mobileCanvasBacking = await mobilePage.locator('canvas').evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height
    }));
    const mobileHud = await mobilePage.locator('.hud').boundingBox();
    const joystickDisplay = await mobilePage.locator('.joystick').evaluate(
      (element) => getComputedStyle(element).display
    );
    await mobilePage.screenshot({ path: path.join(artifactDir, 'rooster-smoke-mobile.png') });
    assert(mobileErrors.length === 0, 'Mobile browser reported console/page errors.', mobileErrors);
    assert(!mobileState.lastError && mobileState.frames > 30, 'Mobile game loop did not start cleanly.', mobileState);
    assert(mobileCanvas?.width >= 380 && mobileCanvas?.height >= 830, 'Mobile canvas does not fill the viewport.', mobileCanvas);
    assert(mobileState.rendering.renderScale === 2, 'Mobile renderer did not select the Retina scale.', mobileState.rendering);
    assert(
      mobileCanvasBacking.width >= mobileCanvas.width * 1.9
      && mobileCanvasBacking.height >= mobileCanvas.height * 1.9,
      'Mobile canvas backing store is not rendered at Retina resolution.',
      { mobileCanvas, mobileCanvasBacking }
    );
    assert(joystickDisplay !== 'none', 'Mobile joystick is not visible.', { joystickDisplay });
    assert(mobileState.cameraZoom <= 0.9, 'Portrait camera is not zoomed out enough.', mobileState);
    assert(mobileHud?.height <= 125, 'Portrait HUD obscures too much of the arena.', mobileHud);
    assert(
      mobileAfterTouch.player.x > mobileState.player.x + 20,
      'Mobile touch-drag input did not move the player.',
      { before: mobileState.player, after: mobileAfterTouch.player }
    );
    await mobilePage.setViewportSize({ width: 844, height: 390 });
    await mobilePage.waitForFunction(() => {
      const state = window.__ROOSTER_TEST__?.getState();
      return state?.viewport.width === 844 && state?.viewport.height === 390;
    });
    const rotatedMobileState = await mobilePage.evaluate(() => window.__ROOSTER_TEST__.getState());
    assert(
      rotatedMobileState.rendering.renderScale === 2
      && rotatedMobileState.rendering.renderWidth === 1688
      && rotatedMobileState.rendering.renderHeight === 780,
      'Retina backing store did not follow a mobile orientation change.',
      rotatedMobileState.rendering
    );
    assert(rotatedMobileState.cameraZoom === 1, 'Rotated mobile camera did not restore landscape zoom.', rotatedMobileState);
    await mobileContext.close();

    const landscapeContext = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      isMobile: true
    });
    const landscapePage = await landscapeContext.newPage();
    const landscapeErrors = [];
    landscapePage.on('pageerror', (error) => landscapeErrors.push(error.stack ?? error.message));
    await landscapePage.goto(url, { waitUntil: 'domcontentloaded' });
    await landscapePage.waitForFunction(() => window.__ROOSTER_TEST__?.getState);
    const landscapeHubPanel = await landscapePage.locator('.henhouse-panel').boundingBox();
    const landscapeStartButton = await landscapePage.locator('[data-run-start]').boundingBox();
    await landscapePage.screenshot({ path: path.join(artifactDir, 'rooster-class-selection-landscape.png') });
    assert(landscapeHubPanel?.height >= 370,
      'Landscape hub leaves avoidable vertical space unused.', landscapeHubPanel);
    assert(landscapeStartButton?.y + landscapeStartButton?.height <= 390,
      'Landscape run CTA is outside the initial viewport.', landscapeStartButton);
    await startRunFromHub(landscapePage);
    await landscapePage.waitForFunction(() => window.__ROOSTER_TEST__?.getState().frames > 30);
    const landscapeState = await landscapePage.evaluate(() => window.__ROOSTER_TEST__.getState());
    const landscapeCanvas = await landscapePage.locator('canvas').boundingBox();
    const landscapeHud = await landscapePage.locator('.hud').boundingBox();
    const landscapeJoystick = await landscapePage.locator('.joystick').evaluate(
      (element) => getComputedStyle(element).display
    );
    await landscapePage.locator('[data-fullscreen]').click();
    await landscapePage.waitForTimeout(100);
    await landscapePage.screenshot({ path: path.join(artifactDir, 'rooster-smoke-mobile-landscape.png') });
    assert(landscapeErrors.length === 0, 'Landscape browser reported page errors.', landscapeErrors);
    assert(landscapeCanvas?.width >= 830 && landscapeCanvas?.height >= 380, 'Landscape canvas does not fill the viewport.', landscapeCanvas);
    assert(landscapeHud?.height <= 90, 'Landscape HUD obscures too much of the arena.', landscapeHud);
    assert(landscapeJoystick !== 'none', 'Landscape joystick is not visible.', { landscapeJoystick });
    assert(landscapeState.cameraZoom === 1, 'Landscape camera should use the default zoom.', landscapeState);
    await landscapeContext.close();

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
    console.log(JSON.stringify({ initial, afterKeyboardMove, afterBoot, beforeCombat, afterCombat, afterRestart, afterRestartAdvance, mobileState, mobileAfterTouch, landscapeState, failedLoadState }, null, 2));
  } finally {
    await stopTestServer(server);
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
