import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadPlaywright, projectRoot } from './helpers/test-runtime.mjs';

const [distributionName = 'dist-release', requestedPrefix = '/nested/game/', marketingFlag] = process.argv.slice(2);
const distributionDirectory = path.join(projectRoot, distributionName);
const gamePrefix = requestedPrefix.endsWith('/') ? requestedPrefix : `${requestedPrefix}/`;
const expectMarketing = marketingFlag === '--marketing';
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp3', 'audio/mpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp']
]);

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
  }
}

async function collectFiles(directory, relativeDirectory = '') {
  const entries = await fs.readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(directory, relativePath));
    else files.push(relativePath);
  }
  return files;
}

async function inspectPackage() {
  const files = await collectFiles(distributionDirectory);
  const sizes = await Promise.all(files.map(async (file) => ({
    file: file.replaceAll('\\', '/'),
    bytes: (await fs.stat(path.join(distributionDirectory, file))).size
  })));
  const totalBytes = sizes.reduce((sum, entry) => sum + entry.bytes, 0);
  const maximumBytes = (expectMarketing ? 21 : 19) * 1024 * 1024;
  const forbiddenRoosters = sizes.filter(({ file }) => (
    /rooster-(ace|artillery|storm)-(next|gameplay|walk-v\d)/i.test(file)
  ));
  const marketingFiles = sizes.filter(({ file }) => file.startsWith('marketing/'));
  const html = await fs.readFile(path.join(distributionDirectory, 'index.html'), 'utf8');

  assert(totalBytes <= maximumBytes,
    `Package exceeds its ${expectMarketing ? 21 : 19} MiB release budget.`, { totalBytes, maximumBytes });
  assert(forbiddenRoosters.length === 0,
    'Release package still contains superseded rooster generations.', forbiddenRoosters);
  if (expectMarketing) {
    assert(marketingFiles.length > 0 && html.includes(`${gamePrefix}marketing/`),
      'Pages package is missing its social preview asset.', marketingFiles);
    assert(html.includes(`${gamePrefix}assets/`),
      'Pages HTML does not use the configured repository path.');
  } else {
    assert(marketingFiles.length === 0 && !html.includes('marketing/'),
      'Game-only package still contains store-only marketing material.', marketingFiles);
    assert(html.includes('./assets/'),
      'Game-only HTML does not use portable relative asset paths.');
  }

  return {
    files: sizes.length,
    totalBytes,
    totalMiB: Number((totalBytes / 1024 / 1024).toFixed(2)),
    largest: sizes.sort((a, b) => b.bytes - a.bytes).slice(0, 5)
  };
}

function portalHostHtml() {
  return `<!doctype html>
    <html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;background:#05090b">
      <iframe title="Rooster Rage portal frame" src="${gamePrefix}"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        allow="autoplay; fullscreen" style="display:block;width:960px;height:540px;border:0"></iframe>
    </body></html>`;
}

async function createPortalServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://127.0.0.1');
      if (requestUrl.pathname === '/portal-host.html') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(portalHostHtml());
        return;
      }
      if (!requestUrl.pathname.startsWith(gamePrefix)) {
        response.writeHead(404).end('Not found');
        return;
      }
      const requested = decodeURIComponent(requestUrl.pathname.slice(gamePrefix.length)) || 'index.html';
      const filePath = path.resolve(distributionDirectory, requested);
      const relative = path.relative(distributionDirectory, filePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const contents = await fs.readFile(filePath);
      response.writeHead(200, {
        'content-type': mimeTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
        'cache-control': 'no-store'
      });
      response.end(contents);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}/portal-host.html`
  };
}

async function verifyPortalFrame(browser, url, blockedStorage) {
  console.log(`Checking production iframe (${blockedStorage ? 'blocked storage' : 'normal storage'}) …`);
  const context = await browser.newContext({ viewport: { width: 1000, height: 580 } });
  if (blockedStorage) {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Storage disabled by portal sandbox', 'SecurityError');
        }
      });
    });
  }
  const page = await context.newPage();
  const errors = [];
  const failedResponses = [];
  const apiRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('kongregate_api.js')) apiRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push({ status: response.status(), url: response.url() });
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const iframe = await page.locator('iframe').elementHandle();
    const frame = await iframe.contentFrame();
    try {
      await frame.waitForSelector('.henhouse-panel', { timeout: 8000 });
    } catch (error) {
      const state = await frame.evaluate(() => ({
        body: document.body.innerText,
        loadState: document.body.dataset.roosterLoadState
      })).catch(() => ({}));
      throw new Error(`Release did not reach the Henhouse.\n${JSON.stringify({ errors, failedResponses, state }, null, 2)}\n${error.message}`);
    }
    console.log(`Henhouse loaded (${blockedStorage ? 'blocked storage' : 'normal storage'}).`);

    const boot = await frame.evaluate(() => ({
      testApiExposed: typeof window.__ROOSTER_TEST__ !== 'undefined',
      roosterCards: document.querySelectorAll('.rooster-card').length,
      canvas: Boolean(document.querySelector('canvas')),
      renderer: (() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return 'missing';
        if (canvas.getContext('webgl2')) return 'webgl2';
        if (canvas.getContext('webgl')) return 'webgl';
        return 'canvas';
      })(),
      loadState: document.body.dataset.roosterLoadState
    }));
    assert(!boot.testApiExposed, 'Release exposed the development test API.', boot);
    assert(boot.roosterCards === 3 && boot.canvas && ['loaded', 'ready'].includes(boot.loadState),
      'Release did not reach a playable Henhouse.', boot);
    assert(boot.renderer.startsWith('webgl'), 'Release did not use its production WebGL renderer.', boot);

    await frame.locator('[data-run-start]').click();
    await frame.waitForFunction(() => !document.querySelector('.overlay')?.classList.contains('is-visible'));
    await frame.locator('[data-settings]').click();
    await frame.waitForSelector('.settings-panel');
    const continueButton = frame.locator('.settings-close');
    assert(await continueButton.isVisible(), 'Continue is not visible in the production iframe.');
    await frame.locator('.settings-panel').press('Escape');
    await frame.waitForFunction(() => !document.querySelector('.settings-panel'));

    assert(errors.length === 0, 'Production iframe reported browser errors.', errors);
    assert(failedResponses.length === 0, 'Production iframe requested missing files.', failedResponses);
    assert(apiRequests.length === 0, 'An ordinary off-platform visit loaded the Kongregate SDK.', apiRequests);
    return { blockedStorage, boot };
  } finally {
    await page.close();
    await context.close();
  }
}

async function verifyKongregateApi(browser, portalUrl, unavailable = false) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 580 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let requests = 0;
  await context.addInitScript(() => {
    Object.defineProperty(document, 'referrer', { configurable: true,
      get: () => 'https://www.kongregate.com/en/games/emfau/roosterrage-survivor' });
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
      phaser = value;
      const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function(...args) { window.__portalTestGame = this; return boot.apply(this, args); };
    } });
  });
  await context.route('https://cdn1.kongregate.com/javascripts/kongregate_api.js', async route => {
    requests++;
    if (unavailable) { await route.abort(); return; }
    await route.fulfill({ contentType: 'application/javascript', body: `
      window.__portalStatCalls = []; window.__portalLoadCalls = 0;
      const api = { services: { getUserId: () => 42, isGuest: () => false, addEventListener() {} },
        stats: { submit: (name, value) => window.__portalStatCalls.push([name, value]) } };
      window.kongregateAPI = { getAPI: () => api, loadAPI: callback => { window.__portalLoadCalls++; callback(); } };
    ` });
  });
  try {
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded' });
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.waitForSelector('.henhouse-panel');
    await frame.locator('[data-run-start]').click();
    await frame.waitForFunction(() => window.__portalTestGame?.scene.getScene('GameScene')?.isChoosingRooster === false);
    if (!unavailable) {
      await frame.waitForFunction(() => window.__portalLoadCalls === 1);
      await frame.evaluate(() => {
        const s = window.__portalTestGame.scene.getScene('GameScene');
        s.telemetry.summary.kills = 123; s.victory(); s.victory();
      });
      let calls = await frame.evaluate(() => window.__portalStatCalls);
      assert(JSON.stringify(calls) === JSON.stringify([['Kills', 123], ['RunsWon', 1]]),
        'The production victory hook submitted incorrect or duplicate stats.', calls);
      await frame.evaluate(() => window.__portalTestGame.scene.getScene('GameScene').scene.restart());
      await frame.waitForSelector('.henhouse-panel');
      await frame.locator('[data-run-start]').click();
      await frame.waitForFunction(() => !window.__portalTestGame.scene.getScene('GameScene').isChoosingRooster);
      await frame.evaluate(() => {
        const s = window.__portalTestGame.scene.getScene('GameScene');
        s.telemetry.summary.kills = 150; s.gameOver(); s.gameOver();
      });
      calls = await frame.evaluate(() => window.__portalStatCalls);
      assert(JSON.stringify(calls) === JSON.stringify([['Kills', 123], ['RunsWon', 1], ['Kills', 150]]),
        'Defeat/restart incorrectly added wins or lost the best kill score.', calls);
      assert(await frame.evaluate(() => window.__portalLoadCalls === 1), 'Scene restart initialized the SDK twice.');
    }
    assert(requests === 1, 'The portal SDK must be requested only once.', requests);
    assert(errors.length === 0, 'Kongregate integration raised gameplay errors.', errors);
    return { sdkUnavailable: unavailable, sdkRequests: requests, playable: true };
  } finally {
    await context.close();
  }
}

async function verifyOriginalRoosterColors(browser, portalUrl) {
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
  await context.addInitScript(() => {
    const skins = { ace: 'ace-sunrise', artillery: 'artillery-ironclad', storm: 'storm-violet' };
    localStorage.setItem('rooster-rage:meta:v2', JSON.stringify({ version: 2,
      unlockedRoosters: Object.keys(skins), unlockedCosmetics: Object.values(skins), selectedCosmetics: skins }));
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
      phaser = value;
      const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function(...args) { window.__colorTestGame = this; return boot.apply(this, args); };
    } });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('iframe').evaluate(iframe => { iframe.style.width = '390px'; iframe.style.height = '844px'; });
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    const colors = [];
    for (const id of ['ace', 'artillery', 'storm']) {
      await frame.waitForSelector('.henhouse-panel');
      assert(await frame.locator('.cosmetic-panel').count() === 0, 'Disabled skins remain visible in the hub.');
      await frame.getByRole('button', { name: 'Roosters', exact: true }).click();
      await frame.locator(`.rooster-card--${id}`).click();
      await frame.locator(`.rooster-card--${id} + .rooster-card__choose`).click();
      await frame.locator('[data-run-start]').click();
      await frame.waitForFunction(() => !window.__colorTestGame.scene.getScene('GameScene').isChoosingRooster);
      const color = await frame.evaluate(() => {
        const s = window.__colorTestGame.scene.getScene('GameScene');
        return { id: s.player.roosterId, tinted: s.player.sprite.isTinted, tint: s.player.sprite.tintTopLeft,
          selectedSkin: s.meta.getSelectedCosmetic(s.player.roosterId) };
      });
      assert(color.id === id && !color.tinted && color.tint === 0xffffff && color.selectedSkin === null,
        'A previously saved skin still tints the production rooster.', color);
      colors.push(color);
      if (id !== 'storm') await frame.evaluate(() => window.__colorTestGame.scene.getScene('GameScene').scene.restart());
    }
    await fs.mkdir(path.join(projectRoot, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(projectRoot, 'test-results/no-skins-storm-portrait.png') });
    assert(errors.length === 0, 'Original-color test raised browser errors.', errors);
    return { viewport: 'portrait', oldSkinsIgnored: colors };
  } finally {
    await context.close();
  }
}

async function run() {
  const packageReport = await inspectPackage();
  console.log(`Release package inspected: ${packageReport.totalMiB} MiB.`);
  const { server, url } = await createPortalServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const normal = await verifyPortalFrame(browser, url, false);
    const withoutStorage = await verifyPortalFrame(browser, url, true);
    const kongregateScenarios = !expectMarketing && distributionName === 'dist-release'
      ? [await verifyKongregateApi(browser, url), await verifyKongregateApi(browser, url, true)] : [];
    const originalColors = await verifyOriginalRoosterColors(browser, url);
    if (!expectMarketing) {
      for (const runner of ['elite-balance', 'pickup-ground-contact', 'pickup-body-contact', 'pickup-sequence', 'pickup-diagnostics', 'bomb-confetti']) {
        console.log(`Checking release gameplay: ${runner} …`);
        await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [path.join(projectRoot, 'tests', `${runner}-runner.mjs`)], {
            cwd: projectRoot,
            env: { ...process.env, ROOSTER_TEST_URL: new URL(gamePrefix, url).href },
            stdio: 'inherit'
          });
          child.once('error', reject);
          child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${runner} release gate failed (${code})`)));
        });
      }
    }
    console.log('Release gate passed.');
    console.log(JSON.stringify({ package: packageReport, scenarios: [normal, withoutStorage], kongregateScenarios, originalColors }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
