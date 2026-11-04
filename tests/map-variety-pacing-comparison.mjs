// Investigate the observed opening-pacing outlier without changing game sources.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { loadPlaywright, projectRoot } from './helpers/test-runtime.mjs';

const browser = await loadPlaywright().chromium.launch({ headless: true, args: ['--disable-features=NetworkChangeNotifierWin'] });
const results = [];
try {
  for (const baseline of [true, false]) {
    const server = await createServer({ root: projectRoot, logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0 }, plugins: baseline ? [{
        name: 'test-original-wave-roster', enforce: 'pre', transform(code, id) {
          if (!id.replaceAll('\\', '/').endsWith('/src/systems/WaveSystem.js')) return;
          const target = 'addMapVarietyToWave(wave, index + 1, scene.rng.seed, scene.arena.id)';
          assert(code.includes(target), 'Baseline override no longer matches production call');
          return code.replace(target, 'wave');
        }
      }] : [] });
    await server.listen();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?seed=early-vertical-run-artillery-portrait-1&arena=vertical-run&profile=average`);
      await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState);
      await page.evaluate(() => {
        const api = window.__ROOSTER_TEST__; api.unlockAllMeta(); api.selectMetaChallenge('standard');
        window.__previousApi = api; api.restart();
      });
      await page.waitForFunction(() => window.__ROOSTER_TEST__ && window.__ROOSTER_TEST__ !== window.__previousApi);
      await page.evaluate(() => { const api = window.__ROOSTER_TEST__; api.selectRooster('artillery'); api.enableBot('average'); });
      await page.waitForFunction(() => Number.isFinite(window.__ROOSTER_TEST__.getTelemetry().progression.firstUpgradeAtMs), null, { timeout: 60000 });
      const result = await page.evaluate(() => ({ firstUpgradeAtMs: window.__ROOSTER_TEST__.getTelemetry().progression.firstUpgradeAtMs,
        waveOne: window.__ROOSTER_TEST__.getWaveCatalog()[0] }));
      assert.deepEqual(errors, []);
      assert.equal(result.waveOne.count, baseline ? 24 : 25);
      results.push({ baseline, ...result });
      console.log(`${baseline ? 'Original roster' : 'Map variety'}: ${(result.firstUpgradeAtMs / 1000).toFixed(2)}s`);
    } finally { await page.close(); await server.close(); }
  }
  await fs.writeFile(path.join(projectRoot, 'test-results/map-variety/pacing-comparison.json'), JSON.stringify(results, null, 2));
} finally { await browser.close(); }
