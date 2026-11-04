import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { loadPlaywright, projectRoot } from './helpers/test-runtime.mjs';
import { Y8_SDK_URL, Y8_APP_ID, Y8_GAME_ID } from '../src/systems/Y8System.js';

const distribution = path.join(projectRoot, process.argv[2] ?? 'dist-y8');
const prefix = '/nested/y8/';
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/portal') {
      response.setHeader('Content-Type', 'text/html');
      // The live SDK sets document.domain, which browsers forbid in sandboxed frames.
      // Use a normal iframe for that smoke test; retain strict frames for game fallback QA.
      response.end(`<iframe src="${prefix}" ${new URL(request.url, 'http://localhost').searchParams.has('unsandboxed') ? '' : 'sandbox="allow-scripts allow-same-origin allow-pointer-lock"'}
        allow="autoplay; fullscreen" style="border:0;width:100vw;height:100vh"></iframe>
        <style>html,body{margin:0;overflow:hidden}</style>`);
      return;
    }
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const file = path.resolve(distribution, decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
    const relative = path.relative(distribution, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403).end(); return; }
    const contents = await fs.readFile(file);
    response.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    response.end(contents);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ headless: true, args: ['--disable-features=NetworkChangeNotifierWin'] });
const results = [];

function sdkMock(kind) {
  return `window.__y8Calls = [];
    const api = {
      init(...args) { window.__y8Calls.push(args); ${kind === 'reject' ? 'return Promise.reject(new Error("SDK unavailable"));' : 'args[1].onReady();'} },
      showAd(options) {
        window.__y8AdCalls = (window.__y8AdCalls || 0) + 1;
        if (${JSON.stringify(kind)} === 'ad-error') return Promise.reject(new Error('No ad'));
        if (${JSON.stringify(kind)} === 'no-fill') { options.adBreakDone({ breakStatus: 'noAdPreloaded' }); return; }
        options.beforeAd();
        window.__y8AdPlaying = true;
        setTimeout(() => { window.__y8AdPlaying = false; options.afterAd(); options.adBreakDone({ breakStatus: 'viewed' }); }, 300);
      },
      onAuth(callback) { callback(null, ${kind === 'auth-error' ? 'new Error("Auth unavailable")' : 'null'}); }
    };
    window.y8 = { sdk: () => api, emitReadyEvent: () => window.dispatchEvent(new Event('y8sdk.ready')) };
    ${kind === 'preloaded' ? '' : 'setTimeout(() => { window.y8.emitReadyEvent(); window.y8.emitReadyEvent(); }, 100);'}`;
}

async function check(kind, viewport, blockedStorage = false) {
  console.log(`Y8 production iframe: ${kind}, ${viewport.width}x${viewport.height}, storage blocked=${blockedStorage}`);
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
  if (blockedStorage) await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Disabled', 'SecurityError'); } });
  });
  if (kind === 'preloaded') await context.addInitScript({ content: sdkMock(kind) });
  let sdkRequests = 0, kongregateRequests = 0;
  await context.route(Y8_SDK_URL, async route => {
    sdkRequests++;
    if (kind === 'real') await route.continue();
    else if (kind === 'blocked') await route.abort();
    else await route.fulfill({ contentType: 'application/javascript', body: kind === 'no-event' ? '// SDK without a ready event' : sdkMock(kind) });
  });
  const page = await context.newPage();
  const pageErrors = [], missingFiles = [];
  page.on('pageerror', error => pageErrors.push(error.stack ?? error.message));
  page.on('request', request => { if (request.url().includes('kongregate_api.js')) kongregateRequests++; });
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) missingFiles.push(response.url());
  });
  try {
    await page.goto(`${origin}/portal${kind === 'real' ? '?unsandboxed' : ''}`, { waitUntil: 'domcontentloaded' });
    const frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.waitForSelector('.henhouse-panel', { timeout: 15000 });
    assert.equal(await frame.evaluate(() => typeof window.__ROOSTER_TEST__), 'undefined');
    assert.equal(await frame.locator('.rooster-card').count(), 3);
    const start = frame.locator('[data-run-start]');
    await start.scrollIntoViewIfNeeded();
    const startBounds = await start.boundingBox();
    assert(startBounds && startBounds.x >= 0 && startBounds.y >= 0 &&
      startBounds.x + startBounds.width <= viewport.width + 1 && startBounds.y + startBounds.height <= viewport.height + 1,
    'Start button is clipped in the portal frame');
    await start.click();
    await frame.waitForFunction(() => !document.querySelector('.overlay')?.classList.contains('is-visible'));
    await frame.locator('[data-settings]').click();
    await frame.waitForSelector('.settings-panel');
    await frame.locator('.settings-close').click();
    await frame.waitForFunction(() => !document.querySelector('.settings-panel'));
    const expectedState = ['blocked', 'reject', 'no-event'].includes(kind) ? 'unavailable' : 'ready';
    await frame.waitForFunction(state => document.body.dataset.y8SdkState === state, expectedState, { timeout: 12000 });
    if (!['blocked', 'no-event', 'real'].includes(kind)) {
      const calls = await frame.evaluate(() => window.__y8Calls);
      assert.equal(calls.length, 1, 'Duplicate SDK initialization');
      assert.deepEqual(calls[0][0], { appId: Y8_APP_ID, autoLogin: true });
      assert.equal(calls[0][1].gameId, Y8_GAME_ID);
      if (kind !== 'reject') assert.equal(await frame.evaluate(() => window.__y8AdCalls), 1, 'Run start did not request an ad');
    }
    assert.equal(sdkRequests, kind === 'preloaded' ? 0 : 1);
    assert.equal(kongregateRequests, 0, 'Y8 requested the Kongregate SDK');
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(missingFiles, []);
    results.push({ kind, viewport, blockedStorage, sdkRequests, sdkState: expectedState, playable: true });
  } finally { await context.close(); }
}

try {
  await check('late', { width: 960, height: 540 });
  await check('preloaded', { width: 960, height: 540 });
  await check('blocked', { width: 390, height: 844 });
  await check('auth-error', { width: 320, height: 568 }, true);
  await check('reject', { width: 960, height: 540 });
  await check('no-event', { width: 960, height: 540 });
  await check('no-fill', { width: 960, height: 540 });
  await check('ad-error', { width: 390, height: 844 });
  if (process.env.ROOSTER_Y8_LIVE_SDK === '1') await check('real', { width: 960, height: 540 });
  await fs.mkdir(path.join(projectRoot, 'test-results'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'test-results/y8-package.json'), JSON.stringify({
    sdk: 'Simulated SDK responses plus optional live CDN smoke; live Y8 authentication still requires portal preview', results
  }, null, 2));
  console.log(`Y8 production checks passed (${results.length} scenarios).`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
