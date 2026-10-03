import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const base = 'https://emfau88.github.io/RoosterRage/kongregate/';
const local = process.argv.includes('--local');
const expected = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const info = local ? { source: 'local release' }
  : await (await fetch(`${base}build-info.json?verify=${expected}`)).json();
if (!local) assert.equal(info.commit, expected, 'Public deployment must match the tested commit');
const artifactDir = 'test-results/artillery-mascot-v1';
await fs.mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch();
const report = { url: base, info, freshSave: true, cases: [] };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json' };

try {
  for (const [id, blockedStorage] of [['ace', false], ['artillery', false], ['storm', false], ['artillery', true]]) {
    const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
    if (local) {
      // Run the real release on its public origin without uploading or seeding a save.
      await context.route(`${base}**`, async route => {
        const relative = new URL(route.request().url()).pathname.slice(new URL(base).pathname.length) || 'index.html';
        assert.ok(!relative.includes('..'));
        const file = path.join('dist-release', relative);
        await route.fulfill({ body: await fs.readFile(file), contentType: mime[path.extname(file)] ?? 'application/octet-stream' });
      });
    }
    if (blockedStorage) await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
    });
    const page = await context.newPage();
    const assets = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      if (/rooster-(ace|storm|artillery)-mascot-(idle|walk)-/.test(response.url())) assets.push(response.url().split('/').pop());
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.dataset.roosterLoadState === 'ready');
    await page.locator('[data-hub-tab="roosters"]').click();
    assert.equal(await page.locator('.rooster-card[data-unlocked="true"]').count(), 3);
    assert.equal(await page.locator('.rooster-card__choose:enabled').count(), 3);
    if (!blockedStorage) {
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('rooster-rage:meta:v2')));
      assert.deepEqual(state.unlockedRoosters, ['ace'], 'Preview must not grant permanent unlocks');
      assert.equal(state.totalRuns, 0);
      assert.equal(state.kernels, 0);
    }
    await page.locator(`.rooster-card--${id} + .rooster-card__choose`).click();
    await page.locator('[data-run-start]').click();
    await page.waitForFunction(() => !document.querySelector('.overlay')?.classList.contains('is-visible'));
    await page.keyboard.down('d');
    await page.waitForTimeout(450);
    await page.keyboard.up('d');
    assert.ok((await page.locator('.hud').textContent()).includes(id === 'artillery' ? 'Boom' : id === 'storm' ? 'Storm' : 'Ace'));
    await page.screenshot({ path: `${artifactDir}/${local ? 'local' : 'live'}-${id}${blockedStorage ? '-blocked-storage' : ''}.png` });
    for (const rooster of ['ace', 'storm', 'artillery']) for (const mode of ['idle', 'walk']) {
      assert.ok(assets.some(asset => asset.startsWith(`rooster-${rooster}-mascot-${mode}-`)));
    }
    assert.equal(await page.evaluate(() => Boolean(window.__ROOSTER_TEST__)), false);
    assert.deepEqual(errors, []);
    report.cases.push({ id, blockedStorage, started: true, assets, errors });
    await context.close();
  }
  await fs.writeFile(`${artifactDir}/${local ? 'local' : 'live'}-fresh-verification.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
