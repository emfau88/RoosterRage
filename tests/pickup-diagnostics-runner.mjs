import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const server = await ensureTestServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ acceptDownloads: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 830 }, acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
      phaser = value;
      const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function(...args) { window.__diagGame = this; return boot.apply(this, args); };
    } });
  });
  await page.goto(`${server.url}?seed=pickup-diagnostics&arena=open-yard`);
  await page.waitForFunction(() => window.__diagGame?.scene.getScene('GameScene')?.pickupDiagnostics);
  await page.evaluate(() => {
    const s = window.__diagGame.scene.getScene('GameScene');
    s.chooseRooster('ace'); s.waveSystem.active = false; s.pickups.scheduleIndex = 7;
    s.bot.enabled = false; s.lastShotAt = Infinity;
    s.player.hp = s.player.maxHp;
    s.pickups.spawn('heal', s.player.sprite.x, s.player.sprite.y);
  });
  await page.waitForFunction(() => window.__diagGame.scene.getScene('GameScene')
    .pickupDiagnostics.exportReport().json.includes('deferred-full-health'));
  await page.evaluate(() => {
    const s = window.__diagGame.scene.getScene('GameScene');
    s.player.hp = s.player.maxHp - 10;
  });
  await page.waitForFunction(() => window.__diagGame.scene.getScene('GameScene').pickups.collected.heal === 1);
  await page.evaluate(() => window.__diagGame.scene.getScene('GameScene').openSettings());
  const downloadReady = page.waitForEvent('download', { timeout: 5000 });
  await page.locator('[data-pickup-report]').click();
  const download = await downloadReady;
  const downloaded = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  const fallback = JSON.parse(await page.locator('[data-pickup-report-fallback] textarea').inputValue());
  assert.deepEqual(downloaded, fallback);
  assert.equal(downloaded.format, 'rooster-rage-pickup-diagnostics-v1');
  assert.equal(downloaded.current.arena, 'open-yard');
  assert(downloaded.build && downloaded.current.zoom > 0);
  assert(downloaded.events.some(event => event.type === 'spawned' && event.pickup.kind === 'heal'));
  assert(downloaded.events.some(event => event.type === 'deferred-full-health'));
  assert(downloaded.events.some(event => event.type === 'effect-applied' && event.pickup.kind === 'heal'));
  assert(downloaded.samples.some(sample => sample.items.some(item => item.kind === 'heal')));
  assert.equal(downloaded.current.collected.heal, 1);
  results.push({ mode: 'direct-download', arena: downloaded.current.arena, zoom: downloaded.current.zoom,
    events: downloaded.events.length, samples: downloaded.samples.length });
  await page.close();

  const iframePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const iframeErrors = [];
  iframePage.on('pageerror', error => iframeErrors.push(error.message));
  await iframePage.addInitScript(() => {
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
      phaser = value;
      const boot = value.Game.prototype.boot;
      value.Game.prototype.boot = function(...args) { window.__diagGame = this; return boot.apply(this, args); };
    } });
  });
  await iframePage.setContent(`<iframe sandbox="allow-scripts allow-same-origin" style="width:390px;height:844px;border:0" src="${server.url}?seed=pickup-iframe&arena=vertical-run"></iframe>`);
  const frame = iframePage.frames().find(item => item.url().includes('vertical-run'))
    ?? await iframePage.waitForEvent('framenavigated', { predicate: item => item.url().includes('vertical-run') });
  await frame.waitForFunction(() => window.__diagGame?.scene.getScene('GameScene')?.pickupDiagnostics);
  await frame.evaluate(() => {
    const s = window.__diagGame.scene.getScene('GameScene');
    s.chooseRooster('ace'); s.waveSystem.active = false; s.pickups.scheduleIndex = 7;
    s.bot.enabled = false; s.lastShotAt = Infinity;
    s.pickups.spawn('magnet', s.player.sprite.x, s.player.sprite.y);
  });
  await frame.waitForFunction(() => window.__diagGame.scene.getScene('GameScene').pickups.collected.magnet === 1);
  await frame.evaluate(() => window.__diagGame.scene.getScene('GameScene').openSettings());
  await frame.locator('[data-pickup-report]').click();
  const iframeReport = JSON.parse(await frame.locator('[data-pickup-report-fallback] textarea').inputValue());
  const actual = await frame.evaluate(() => {
    const s = window.__diagGame.scene.getScene('GameScene');
    return { arena: s.arena.id, zoom: s.cameras.main.zoom,
      active: s.pickups.isMagnetActive(), bundle: [...document.scripts].find(script => script.type === 'module')?.src.split('/').at(-1) };
  });
  assert.equal(iframeReport.current.arena, actual.arena);
  assert.equal(iframeReport.current.zoom, Math.round(actual.zoom * 100) / 100);
  assert.equal(iframeReport.build, actual.bundle);
  assert(actual.active);
  assert(iframeReport.events.some(event => event.type === 'effect-applied' && event.pickup.kind === 'magnet'));
  const firstRun = iframeReport.current.run;
  const feedZoom = iframeReport.current.logicalZoom;
  await frame.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set('arena', 'open-yard');
    history.replaceState(null, '', url);
    window.__diagGame.scene.getScene('GameScene').scene.restart({ roosterId: 'ace' });
  });
  await frame.waitForFunction((run) => {
    const s = window.__diagGame.scene.getScene('GameScene');
    return s.pickupDiagnostics?.run > run && s.arena.id === 'open-yard';
  }, firstRun);
  const yardReport = JSON.parse(await frame.evaluate(() =>
    window.__diagGame.scene.getScene('GameScene').pickupDiagnostics.exportReport().json));
  assert.equal(feedZoom, 0.54);
  assert.equal(yardReport.current.logicalZoom, 0.85);
  assert.equal(yardReport.current.arena, 'open-yard');
  assert(yardReport.events.some(event => event.run === firstRun && event.arena === 'vertical-run'));
  await frame.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set('arena', 'vertical-run');
    history.replaceState(null, '', url);
    window.__diagGame.scene.getScene('GameScene').scene.restart({ roosterId: 'ace' });
  });
  await frame.waitForFunction((run) => {
    const s = window.__diagGame.scene.getScene('GameScene');
    return s.pickupDiagnostics?.run > run && s.arena.id === 'vertical-run';
  }, yardReport.current.run);
  const feedAgain = JSON.parse(await frame.evaluate(() =>
    window.__diagGame.scene.getScene('GameScene').pickupDiagnostics.exportReport().json));
  assert.equal(feedAgain.current.logicalZoom, 0.54);
  assert.deepEqual(errors, []);
  assert.deepEqual(iframeErrors, []);
  results.push({ mode: 'iframe-text-fallback-and-map-switch', arena: actual.arena, zoom: actual.zoom,
    logicalZooms: [feedZoom, yardReport.current.logicalZoom, feedAgain.current.logicalZoom],
    bundle: actual.bundle, events: feedAgain.events.length });
  await iframePage.close();
  await fs.writeFile('test-results/pickup-diagnostics-verification.json', JSON.stringify(results, null, 2));
  console.log('Pickup diagnostics passed: real health refusal and collection, download and text fallback, portrait iframe, map zoom and build identity.');
} finally { await browser.close(); await stopTestServer(server.server); }
