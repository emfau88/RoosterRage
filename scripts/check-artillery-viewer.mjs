import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const dir=path.resolve('docs/qa/artillery-mascot-v1'),browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1160,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(dir,'artillery-vergleich.html')).href);
  await page.locator('#pause:enabled').waitFor();
  await page.locator('#pause').click();
  for(const direction of ['south','east','west','north']) {
    await page.locator('#direction').selectOption(direction);
    await page.locator('#step').click();
    await page.locator('.pair').screenshot({path:path.join(dir,`comparison-isolated-${direction}.png`)});
  }
  await page.locator('#mode').selectOption('idle');
  await page.locator('#size').selectOption('64');
  await page.locator('#step').click();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(dir,'viewer-check.json'),JSON.stringify({offline:true,directions:4,portraitOverflow:false,errors},null,2)+'\n');
}finally{await browser.close();}
