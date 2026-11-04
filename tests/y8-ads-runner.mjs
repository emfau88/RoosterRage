import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { loadPlaywright, projectRoot } from './helpers/test-runtime.mjs';
import { Y8_SDK_URL } from '../src/systems/Y8System.js';

// Test-only instrumentation. Neither this hook nor the dev test API ships.
const server = await createServer({ root: projectRoot, mode: 'y8', logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'y8-ad-test-scene',
    transform(code, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/scenes/GameScene.js')) {
        return code.replace('installTestApi(this);', 'installTestApi(this); window.__y8Scene = this;');
      }
    }
  }] });
await server.listen();
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ headless: true, args: ['--disable-features=NetworkChangeNotifierWin'] });
const results = [];

async function check(viewport) {
  const page = await browser.newPage({ viewport, hasTouch: viewport.width < 500 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(Y8_SDK_URL, route => route.fulfill({ contentType: 'application/javascript', body: `
    window.__adRequests = [];
    window.__adMode = 'show';
    const api = {
      init(app, ads) { ads.onReady(); }, onAuth(fn) { fn(null, null); },
      showAd(options) {
        window.__adRequests.push({ type: options.type, name: options.name });
        window.__adCallbacks = options;
        if (window.__adMode === 'no-fill') { options.adBreakDone({ breakStatus: 'noAdPreloaded' }); return; }
        if (window.__adMode === 'error') return Promise.reject(new Error('No ad'));
        if (window.__adMode === 'silent') return;
        options.beforeAd();
        window.dispatchEvent(new Event('blur'));
        return Promise.resolve();
      }
    };
    window.y8 = { sdk: () => api, emitReadyEvent: () => window.dispatchEvent(new Event('y8sdk.ready')) };
    window.y8.emitReadyEvent();
  ` }));
  try {
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
    await page.waitForSelector('[data-run-start]', { timeout: 30000 });
    await page.waitForFunction(() => document.body.dataset.y8SdkState === 'ready');
    await page.evaluate(async () => {
      window.__portal = (await import('/src/systems/Y8System.js')).y8Portal;
      window.__adNow = 0;
      window.__portal.now = () => window.__adNow;
    });
    await page.click('[data-run-start]');
    await page.waitForFunction(() => window.__y8Scene.y8Ads.playing);
    const before = await state(page);
    assert.equal(before.wave, 0, 'Run began before the start ad ended');
    // A suspended WebAudio context may not apply a scheduled gain change
    // until it resumes. It is already silent, and all game sounds are paused.
    assert(before.mute || before.contextState === 'suspended');
    assert.equal(before.physicsPaused, true);
    assert.equal(before.inputEnabled, false);
    assert(before.reasons.includes('y8-ad'));
    assert(!before.reasons.includes('focus'), 'Ad focus change created an extra focus overlay');
    assert.equal(before.playingSounds, 0);
    await page.waitForTimeout(200);
    const during = await state(page);
    assert.equal(during.time, before.time);
    assert.equal(during.elapsed, before.elapsed);
    await endAd(page);
    await page.waitForFunction(() => window.__y8Scene.waveSystem.currentWave === 1);
    await page.waitForFunction(() => !window.__y8Scene.sound.mute);
    assert.equal((await state(page)).mute, false);
    assert((await state(page)).playingSounds > 0, 'Audio did not resume');

    // Clear a real wave through its normal completion path, without waiting
    // three real minutes or making players fight through every test run.
    await clearWave(page, 179999);
    await page.waitForFunction(() => window.__y8Scene.waveSystem.currentWave === 2);
    assert.equal(await page.evaluate(() => window.__adRequests.length), 1, 'Ad shown too soon');
    await clearWave(page, 180000);
    await page.waitForFunction(() => window.__y8Scene.y8Ads.playing);
    const waveAd = await state(page);
    assert.equal(waveAd.wave, 2, 'Next wave started under the ad');
    assert(waveAd.mute || waveAd.contextState === 'suspended', JSON.stringify({ waveAd, errors }));
    assert.equal(waveAd.physicsPaused, true);
    assert.equal(waveAd.playingSounds, 0);
    await page.waitForTimeout(200);
    assert.equal((await state(page)).time, waveAd.time);
    assert.equal((await state(page)).elapsed, waveAd.elapsed);
    await endAd(page);
    await page.waitForFunction(() => window.__y8Scene.waveSystem.currentWave === 3);
    await page.waitForFunction(() => !window.__y8Scene.sound.mute);
    assert.equal((await state(page)).mute, false);
    assert.deepEqual(await page.evaluate(() => window.__adRequests.slice(0, 2)), [
      { type: 'start', name: 'run-start' }, { type: 'next', name: 'wave-transition' }
    ]);

    // An upgrade paused before the ad must remain paused afterwards.
    await page.evaluate(() => {
      window.__y8Scene.startLevelUp();
      window.__y8Scene.sound.setMute(true);
    });
    await page.waitForFunction(() => window.__y8Scene.sound.mute);
    await clearWave(page, 360000);
    await page.waitForFunction(() => window.__y8Scene.y8Ads.playing);
    await endAd(page);
    await page.waitForFunction(() => window.__y8Scene.waveSystem.currentWave === 4);
    await page.waitForFunction(() => window.__y8Scene.sound.mute);
    const upgrade = await state(page);
    assert(upgrade.reasons.includes('upgrade'));
    assert(!upgrade.reasons.includes('y8-ad'));
    assert.equal(upgrade.mute, true, 'Ad changed a previous mute preference');
    await page.evaluate(() => {
      window.__y8Scene.sound.setMute(false);
      while (window.__y8Scene.isChoosingUpgrade) window.__ROOSTER_TEST__.resumeIfUpgradeOpen();
    });
    await page.waitForFunction(() => !window.__y8Scene.sound.mute);

    for (const [index, mode] of ['no-fill', 'error', 'silent'].entries()) {
      await page.evaluate(mode => {
        window.__adMode = mode;
        window.__portal.adRequestTimeoutMs = 100;
      }, mode);
      await clearWave(page, 540000);
      await page.waitForFunction(wave => window.__y8Scene.waveSystem.currentWave === wave, 5 + index);
      const skipped = await state(page);
      assert.equal(skipped.mute, false);
      assert(!skipped.reasons.includes('y8-ad'));
      assert.equal(await page.evaluate(() => window.__y8Scene.y8Ads.pending), false);
    }

    // Restarting a scene/run must not reset the portal's session-wide cap.
    await page.evaluate(() => {
      window.__adMode = 'show';
      window.__adNow = 360001;
      window.__y8Scene.scene.restart({});
    });
    await page.waitForSelector('[data-run-start]');
    const calls = await page.evaluate(() => window.__adRequests.length);
    await page.click('[data-run-start]');
    await page.waitForFunction(() => window.__y8Scene.waveSystem.currentWave === 1);
    assert.equal(await page.evaluate(() => window.__adRequests.length), calls);
    assert.equal((await state(page)).mute, false);
    assert.deepEqual(errors, []);
    results.push({ viewport, startAd: true, waveAd: true, minimumIntervalMs: 180000,
      physicsAndTimeFrozen: true, audioPausedAndRestored: true, upgradePausePreserved: true,
      noFillErrorAndTimeoutRecovered: true, restartCooldownPreserved: true });
    console.log(`Y8 ad gameplay passed: ${viewport.width}x${viewport.height}`);
  } finally { await page.close(); }
}

function state(page) {
  return page.evaluate(() => {
    const s = window.__y8Scene;
    return { wave: s.waveSystem.currentWave, time: s.time.now, elapsed: s.elapsed,
      mute: s.sound.mute, physicsPaused: s.physics.world.isPaused, inputEnabled: s.input.enabled,
      contextState: s.sound.context?.state,
      reasons: s.gamePause.getState().reasons, playingSounds: s.sound.sounds.filter(sound => sound.isPlaying).length };
  });
}
function clearWave(page, now) {
  return page.evaluate(now => {
    window.__adNow = now;
    const s = window.__y8Scene;
    window.__ROOSTER_TEST__.clearEnemies();
    s.waveSystem.waitingForClear = true;
    s.waveSystem.update(s.time.now, 0);
  }, now);
}
function endAd(page) {
  return page.evaluate(() => {
    window.__adCallbacks.afterAd();
    window.__adCallbacks.adBreakDone({ breakStatus: 'viewed' });
    window.dispatchEvent(new Event('focus'));
  });
}

try {
  await check({ width: 960, height: 540 });
  await check({ width: 390, height: 844 });
  await fs.mkdir(path.join(projectRoot, 'test-results'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'test-results/y8-ads.json'), JSON.stringify({
    sdk: 'Simulated Y8 callbacks; actual game, physics, audio and wave transitions', results
  }, null, 2));
} finally { await browser.close(); await server.close(); }
