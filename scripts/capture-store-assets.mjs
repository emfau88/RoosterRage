import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureTestServer,
  loadPlaywright,
  projectRoot,
  stopTestServer
} from '../tests/helpers/test-runtime.mjs';

const mode = process.argv.includes('--trailer')
  ? 'trailer'
  : process.argv.includes('--readme')
    ? 'readme'
    : 'screenshots';
const marketingDir = path.join(projectRoot, 'docs', 'marketing');
const screenshotDir = path.join(marketingDir, 'screenshots');
const trailerDir = path.join(marketingDir, 'trailer');

const builds = {
  ace: [
    ['ace-deadeye-drill', 3],
    ['evo-sunshot-array', 1],
    ['golden-egg', 3],
    ['fire-eggs', 1],
    ['evo-solar-scramble', 1]
  ],
  artillery: [
    ['artillery-reinforced-breech', 3],
    ['evo-siegebreaker-shell', 1],
    ['rocket-egg', 3],
    ['bigger-eggs', 1],
    ['evo-broodstorm', 1]
  ],
  storm: [
    ['storm-static-plumage', 3],
    ['evo-tempest-crown', 1],
    ['lightning-comb', 3],
    ['critical-yolk', 1],
    ['evo-thunder-roost', 1]
  ]
};

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function openGame(page, serverUrl, seed) {
  const url = new URL(serverUrl);
  url.searchParams.set('seed', seed);
  url.searchParams.set('profile', 'average');
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState, null, { timeout: 5000 });
}

async function showHub(page) {
  await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.unlockAllMeta();
    api.recordMetaRun({
      outcome: 'victory',
      kills: 691,
      elapsedMs: 456000,
      rooster: { id: 'storm', name: 'Stormcrest' }
    });
    api.recordMetaRun({
      outcome: 'victory',
      kills: 748,
      elapsedMs: 449000,
      rooster: { id: 'ace', name: 'Barnyard Ace' }
    });
    api.unlockAllMeta();
  });
  await page.waitForTimeout(500);
}

async function showCombat(page, { rooster, wave, build, challenge = 'standard', waitMs = 6200 }) {
  await page.evaluate((challengeId) => {
    const api = window.__ROOSTER_TEST__;
    api.unlockAllMeta();
    api.selectMetaChallenge(challengeId);
  }, challenge);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState);
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().choosingRooster);
  await page.evaluate(({ roosterId, waveNumber, upgrades }) => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster(roosterId);
    api.pauseWaves();
    api.clearEnemies();
    api.clearProjectiles();
    api.setPlayerCombatModifiers({ armor: 30, regenPerSecond: 8 });
    upgrades.forEach(([id, ranks]) => {
      for (let rank = 0; rank < ranks; rank += 1) api.applyUpgradeById(id);
    });
    api.enableBot('average');
    api.startWave(waveNumber);
  }, { roosterId: rooster, waveNumber: wave, upgrades: build });
  await page.waitForTimeout(waitMs);
}

async function captureScreenshots(browser, serverUrl) {
  await fs.mkdir(screenshotDir, { recursive: true });

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const desktopPage = await desktop.newPage();
  const desktopErrors = trackErrors(desktopPage);
  await openGame(desktopPage, serverUrl, 'store-hub');
  await showHub(desktopPage);
  await desktopPage.screenshot({ path: path.join(screenshotDir, '01-hennenhuette-desktop.png') });
  await showCombat(desktopPage, {
    rooster: 'storm',
    wave: 8,
    build: builds.storm,
    challenge: 'rush-hour',
    waitMs: 7000
  });
  await desktopPage.screenshot({ path: path.join(screenshotDir, '02-stormcrest-swarm-desktop.png') });
  await showCombat(desktopPage, {
    rooster: 'ace',
    wave: 10,
    build: builds.ace,
    challenge: 'royal-gauntlet',
    waitMs: 4200
  });
  await desktopPage.screenshot({ path: path.join(screenshotDir, '03-brood-king-desktop.png') });
  if (desktopErrors.length) throw new Error(`Desktop capture errors:\n${desktopErrors.join('\n')}`);
  await desktop.close();

  const portrait = await browser.newContext({ viewport: { width: 720, height: 1280 } });
  const portraitPage = await portrait.newPage();
  const portraitErrors = trackErrors(portraitPage);
  await openGame(portraitPage, serverUrl, 'store-portrait');
  await showCombat(portraitPage, {
    rooster: 'artillery',
    wave: 9,
    build: builds.artillery,
    challenge: 'featherweight',
    waitMs: 7200
  });
  await portraitPage.screenshot({ path: path.join(screenshotDir, '04-boombardier-mobile-portrait.png') });
  if (portraitErrors.length) throw new Error(`Portrait capture errors:\n${portraitErrors.join('\n')}`);
  await portrait.close();

  console.log(`Captured four store screenshots in ${screenshotDir}.`);
}

async function captureReadmeScreenshots(browser, serverUrl) {
  await fs.mkdir(screenshotDir, { recursive: true });
  const targets = [
    {
      name: 'desktop',
      viewport: { width: 1440, height: 810 },
      seed: 'readme-hub-desktop',
      file: '05-run-preparation-desktop.png'
    },
    {
      name: 'mobile portrait',
      viewport: { width: 390, height: 844 },
      seed: 'readme-hub-mobile',
      file: '06-run-preparation-mobile-portrait.png'
    }
  ];

  for (const target of targets) {
    const context = await browser.newContext({ viewport: target.viewport });
    const page = await context.newPage();
    const errors = trackErrors(page);
    await openGame(page, serverUrl, target.seed);
    await showHub(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState().choosingRooster);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, target.file) });
    if (errors.length) throw new Error(`${target.name} README capture errors:\n${errors.join('\n')}`);
    await context.close();
  }

  console.log(`Captured current desktop and mobile README screenshots in ${screenshotDir}.`);
}

async function captureTrailer(browser, serverUrl) {
  await fs.mkdir(trailerDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: path.join(projectRoot, 'test-results', 'marketing-video'), size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  const errors = trackErrors(page);
  await openGame(page, serverUrl, 'trailer-master');
  await showHub(page);
  await page.waitForTimeout(4000);
  await showCombat(page, { rooster: 'ace', wave: 5, build: builds.ace, waitMs: 9000 });
  await showCombat(page, { rooster: 'artillery', wave: 8, build: builds.artillery, waitMs: 9000 });
  await showCombat(page, { rooster: 'storm', wave: 10, build: builds.storm, waitMs: 10000 });
  const video = page.video();
  await page.close();
  await video.saveAs(path.join(trailerDir, 'rooster-rage-35s-gameplay-reel.webm'));
  await context.close();
  if (errors.length) throw new Error(`Trailer capture errors:\n${errors.join('\n')}`);
  console.log(`Captured the 35-second gameplay reel in ${trailerDir}.`);
}

async function run() {
  const serverState = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    if (mode === 'trailer') await captureTrailer(browser, serverState.url);
    else if (mode === 'readme') await captureReadmeScreenshots(browser, serverState.url);
    else await captureScreenshots(browser, serverState.url);
  } finally {
    await browser.close();
    await stopTestServer(serverState.server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
