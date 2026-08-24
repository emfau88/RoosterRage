import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from '../tests/helpers/test-runtime.mjs';

const outputDir = path.join(projectRoot, 'art-source', 'map', 'previews');
const arenas = ['open-yard', 'vertical-run', 'square-coop'];

async function captureArena(browser, serverUrl, arenaId) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(
      `${serverUrl}?arena=${arenaId}&challenge=standard&seed=arena-preview-${arenaId}&profile=manual`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState);
    await page.click('[data-run-start]');
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().choosingRooster === false);
    const preview = await page.evaluate(() => {
      const api = window.__ROOSTER_TEST__;
      api.pauseWaves();
      api.clearEnemies();
      api.clearXpOrbs();
      api.clearProjectiles();
      document.querySelectorAll('.hud, .overlay, .wave-banner, .upgrade-confirmation, .multi-kill, .joystick')
        .forEach((element) => { element.style.display = 'none'; });
      return api.prepareArenaPreview();
    });
    if (preview.arenaId !== arenaId) {
      throw new Error(`Expected ${arenaId}, received ${preview.arenaId}.`);
    }
    await page.waitForTimeout(180);
    await page.locator('canvas').screenshot({
      path: path.join(outputDir, `arena-preview-${arenaId}.png`)
    });
    return preview;
  } finally {
    await page.close();
  }
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true });
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const arenaId of arenas) {
      results.push(await captureArena(browser, serverState.url, arenaId));
    }
    console.log('Arena previews captured.');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
