import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ensureTestServer, stopTestServer, loadPlaywright, projectRoot } from '../tests/helpers/test-runtime.mjs';

const output = path.join(projectRoot, 'docs/qa/portrait-backdrops-v1');
await fs.mkdir(output, { recursive: true });
const { chromium } = loadPlaywright();
const { server, url } = await ensureTestServer();
const browser = await chromium.launch();
const checks = [];
try {
  for (const viewport of [{width:1440,height:900}, {width:390,height:844}, {width:844,height:390}]) {
    const page = await browser.newPage({viewport});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForSelector('[data-hub-tab="roosters"]');
    await page.locator('[data-hub-tab="roosters"]').click();
    await page.locator('.rooster-card__portrait-image').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await page.waitForTimeout(500); // Let the existing panel entrance finish before measuring.
    const backgrounds = await page.locator('.rooster-card__portrait').evaluateAll(elements => elements.map(element => {
      const image = getComputedStyle(element).backgroundImage;
      return {image, asset:image.match(/url\("?([^"\)]+)/)?.[1]};
    }));
    assert.equal(new Set(backgrounds.map(b => b.asset)).size, 3);
    for (const background of backgrounds) {
      assert(background.asset, 'Background missing');
      assert((await page.request.get(background.asset)).ok(), 'Background asset failed to load');
    }
    const geometry = () => page.locator('.rooster-card__portrait-image').evaluateAll(images => images.map(image => {
      const r=image.getBoundingClientRect();return {src:image.src,x:r.x,y:r.y,width:r.width,height:r.height};
    }));
    const before = await geometry();
    const off = await page.addStyleTag({content:'.rooster-card__portrait,.hub-rooster-hero__portrait {background-image:none!important}'});
    await page.screenshot({path:path.join(output,`portraits-${viewport.width}-before.png`)});
    await off.evaluate(element => element.remove());
    await page.waitForTimeout(200);
    await page.screenshot({path:path.join(output,`portraits-${viewport.width}-after.png`)});
    assert.deepEqual(await geometry(), before, 'Portrait size or position changed');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []);
    // The selected hero uses the same separate backdrop when returning to Play.
    await page.locator('[data-hub-tab="play"]').click();
    const hero = await page.locator('.hub-rooster-hero__portrait').evaluate(element => ({rooster:element.dataset.rooster, background:getComputedStyle(element).backgroundImage}));
    assert(hero.background.includes(`${hero.rooster}.webp`));
    checks.push({viewport, backgrounds, geometry:before, hero, errors});
    await page.close();
  }
  await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(checks,null,2));
  console.log('Portrait backdrops passed on desktop, portrait and landscape: three loaded assets, unchanged figure geometry, no overflow or browser errors.');
} finally {
  await browser.close();
  await stopTestServer(server);
}
