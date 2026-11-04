import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ensureTestServer, loadPlaywright, stopTestServer, projectRoot } from '../../../tests/helpers/test-runtime.mjs';

const output = import.meta.dirname, still = process.argv.includes('--still'), results = [];
const selection = process.argv.find(arg => arg.startsWith('--view='))?.split('=')[1];
const views = selection ? [selection] : ['a', 'b', 'compare', 'current'];
assert(views.every(v => ['a', 'b', 'compare', 'current', 'approved'].includes(v)));
// Captured QA images/reports are expected outputs, including on subsequent runs.
const hashDiff = () => crypto.createHash('sha256').update(execFileSync('git', ['diff', '--binary', '--', '.', ':(exclude)docs/qa/**'], {
  cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024
})).digest('hex');
const baseline = hashDiff();
const server = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch({ headless: true,
  ...(process.env.ROOSTER_CHROMIUM ? { executablePath: process.env.ROOSTER_CHROMIUM } : {}),
  args: ['--disable-features=NetworkChangeNotifierWin'] });
try {
  for (const view of views) for (const renderer of ['webgl', 'canvas']) {
    const errors = [], page = await browser.newPage({ viewport: { width: 1280, height: 700 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${server.url}docs/qa/void-effects-study/?view=${view}&renderer=${renderer}&capture`);
    await page.waitForFunction(() => window.voidStudy?.ready);
    const initial = await page.evaluate(() => window.voidStudy.describe());
    const samples = [];
    for (const ms of [0, 350, 550, 850, 1900, 3300, 5700, 6100, 6450, 7000, 7300, 7900, 8399]) {
      await page.evaluate(ms => window.voidStudy.setTime(ms), ms);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(() => window.voidStudy.describe());
      assert.equal(state.objects, initial.objects, 'Display objects accumulated');
      assert(state.effects.every(e => e.finite), 'Non-finite transform');
      assert(state.effects.every(e => e.kind === 'current' || e.particleScalesUniform), 'Airborne particles stretched');
      assert(state.effects.every(e => e.radius === (e.evolved ? 225 : 190)), 'Preview changed ability radius');
      if (ms >= 7900) assert(state.effects.every(e => !e.active), 'Effect did not fully expire');
      if ([550, 1900, 3300, 6100, 7300, 7900].includes(ms)) await page.screenshot({ path: path.join(output, `${view}-${renderer}-${ms}.png`) });
      samples.push({ time: ms, effects: state.effects });
    }
    await page.evaluate(() => window.voidStudy.setTime(1900));
    const held = await page.screenshot(); await page.waitForTimeout(100);
    assert(held.equals(await page.screenshot()), 'Inspection timestamp was not frozen');
    await page.evaluate(() => window.voidStudy.setTime(2150));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert(!held.equals(await page.screenshot()), 'Effect is static');
    if (!still && renderer === 'webgl' && ['a', 'b', 'approved'].includes(view)) {
      const frameDir = path.join(projectRoot, 'test-results/void-effects-study', `${view}-frames`);
      await fs.mkdir(frameDir, { recursive: true });
      for (let i = 0; i < 252; i++) {
        await page.evaluate(ms => window.voidStudy.setTime(ms), i * 1000 / 30);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: path.join(frameDir, `frame-${String(i).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 96 });
        if (i % 63 === 0) console.log(`${view}: captured ${i}/252`);
      }
      const video = path.join(output, `${view}-in-motion.mp4`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', '30', '-i', path.join(frameDir, 'frame-%03d.jpg'), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video]);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-filter_complex', 'fps=20,scale=1120:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', path.join(output, `${view}-in-motion.gif`)]);
    }
    await page.evaluate(() => window.voidStudy.play()); await page.waitForTimeout(350);
    assert.equal((await page.evaluate(() => window.voidStudy.describe())).objects, initial.objects);
    assert.deepEqual(errors, []); await page.close();
    results.push({ view, renderer, objects: initial.objects, errors, stableObjectCount: true, frozenInspection: true, expiredAt7900: true, samples });
    console.log(`${view} / ${renderer}: lifecycle, stable objects, animated/frozen frames and asset requests passed.`);
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 780 } });
  await page.goto(`${server.url}docs/qa/void-effects-study/?view=a`);
  await page.waitForFunction(() => window.voidStudy?.ready);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const before = await page.evaluate(() => window.voidStudy.describe().elapsed);
  await page.waitForTimeout(150); assert.equal(await page.evaluate(() => window.voidStudy.describe().elapsed), before);
  await page.locator('#speed').selectOption('0.5'); assert.equal(await page.evaluate(() => window.voidStudy.describe().speed), .5);
  await page.getByRole('button', { name: 'Abspielen', exact: true }).click(); await page.waitForTimeout(150);
  assert((await page.evaluate(() => window.voidStudy.describe().elapsed)) > before);
  await page.locator('#scrub').fill('3300'); assert.equal(await page.evaluate(() => window.voidStudy.describe().elapsed), 3300);
  for (const name of ['B · Void-Spalt', 'EVO direkt vergleichen', 'Bisheriger Effekt']) {
    await page.getByRole('link', { name, exact: true }).click(); await page.waitForFunction(() => window.voidStudy?.ready);
  }
  await page.close();
  assert.equal(hashDiff(), baseline, 'Tracked production files changed');
  await fs.writeFile(path.join(output, selection === 'approved' ? 'verification-approved.json' : still ? 'verification-stills.json' : 'verification.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), status: 'passed', previewOnly: true, gameplayModified: false,
    trackedDiffUnchanged: true, trackedDiffScope: 'tracked files outside docs/qa', trackedDiffSha256: baseline, controls: ['pause', 'half speed', 'resume', 'scrub', 'view navigation'], results
  }, null, 2));
} finally { await browser.close(); await stopTestServer(server.server); }
