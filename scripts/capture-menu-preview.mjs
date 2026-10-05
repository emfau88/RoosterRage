import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureTestServer, loadPlaywright, stopTestServer, projectRoot } from '../tests/helpers/test-runtime.mjs';

// Reproducible visual QA in isolated browser contexts; user saves/tabs are untouched.
const { server, url } = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch();
const output = path.join(projectRoot, 'docs/qa/menu-preview-v1');
await fs.mkdir(output, { recursive: true });
try {
  for (const [name, viewport, suffix] of [
    ['before', { width: 1440, height: 900 }, '?menu=classic'],
    ['desktop', { width: 1440, height: 900 }, '?seed=menu-preview'],
    ['mobile', { width: 390, height: 844 }, '?seed=menu-preview'],
    ['loading', { width: 1440, height: 900 }, 'docs/qa/menu-preview-v1/loading.html']
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(new URL(suffix, url).href, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(name === 'loading' ? '.menu-loading-logo' : '.henhouse-panel');
    if (name !== 'loading') await page.waitForFunction(() => document.body.dataset.roosterLoadState === 'ready');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    });
    await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' });
    console.log(`${name}.png: ${viewport.width}x${viewport.height}`);
    await page.close();
  }
} finally {
  await browser.close();
  await stopTestServer(server);
}
