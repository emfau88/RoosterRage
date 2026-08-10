import {
  ensureTestServer,
  loadPlaywright,
  stopTestServer
} from './helpers/test-runtime.mjs';

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}\n${JSON.stringify(details ?? {}, null, 2)}`);
  }
}

async function run() {
  const { server, url } = await ensureTestServer();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  let originalSettings = null;

  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getAudioSettings);
    const manifest = await page.evaluate(() => window.__ROOSTER_TEST__.getAudioManifest());
    const requiredAssets = [
      'menu-theme', 'run-theme', 'boss-theme', 'menu-coop',
      'egg-launch-ace', 'egg-launch-artillery', 'egg-launch-storm', 'egg-impact-1',
      'level-up', 'evolution', 'upgrade-select', 'chest-latch', 'chest-open', 'chest-reward', 'victory',
      'spitter-shot', 'brute-stomp', 'summoner-charge', 'boss-phase', 'boss-fireball'
    ];
    assert(requiredAssets.every((key) => manifest.includes(key)),
      'Production audio manifest is incomplete.', { requiredAssets, manifest });

    await page.click('[data-hub-settings]');
    assert(await page.locator('[data-audio-volume]').count() === 5,
      'Audio settings must also be reachable from the hub.');
    await page.click('.settings-close');
    assert(await page.locator('.rooster-card').count() === 3,
      'Closing hub settings should return to rooster selection.');
    await page.evaluate(() => window.__ROOSTER_TEST__.selectRooster('ace'));
    originalSettings = await page.evaluate(() => window.__ROOSTER_TEST__.getAudioSettings());

    await page.click('[data-settings]');
    const controls = await page.locator('[data-audio-volume]').count();
    assert(controls === 5, 'Audio settings should expose five independent volume controls.', { controls });

    await page.locator('[data-audio-volume="master"]').evaluate((input) => {
      input.value = '0.4';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('[data-audio-volume="music"]').evaluate((input) => {
      input.value = '0.25';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const changed = await page.evaluate(() => window.__ROOSTER_TEST__.getAudioSettings());
    assert(changed.master === 0.4 && changed.music === 0.25, 'Audio sliders did not update their buses.', changed);
    assert(changed.sfx === originalSettings.sfx, 'Changing music or master altered the SFX bus.', {
      originalSettings,
      changed
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.getAudioSettings);
    const persisted = await page.evaluate(() => window.__ROOSTER_TEST__.getAudioSettings());
    assert(persisted.master === 0.4 && persisted.music === 0.25, 'Audio settings were not persisted.', persisted);

    const state = await page.evaluate(() => window.__ROOSTER_TEST__.getState().audio);
    assert(typeof state.unlocked === 'boolean' && state.maxGlobalVoices === 7,
      'Audio runtime state is incomplete.', state);
    assert(errors.length === 0, 'Browser reported errors during audio settings test.', errors);
    console.log('Rooster audio settings test passed.');
    console.log(JSON.stringify({ assets: manifest.length, controls, settings: persisted, runtime: state }, null, 2));
  } finally {
    if (originalSettings) {
      await page.evaluate((settings) => {
        const api = window.__ROOSTER_TEST__;
        if (!api?.setAudioVolume) return;
        ['master', 'sfx', 'ui', 'music', 'ambience'].forEach((key) => api.setAudioVolume(key, settings[key]));
      }, originalSettings).catch(() => {});
    }
    await page.close();
    await browser.close();
    await stopTestServer(server);
  }
}

run().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
