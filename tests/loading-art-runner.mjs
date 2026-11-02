import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const server = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch();
const folder = 'test-results/loading-art';
await fs.mkdir(folder,{recursive:true});
const results=[];
try {
  for(const [width,height] of [[1280,800],[960,540],[390,844],[844,390],[320,568]]){
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let release;
    const held=new Promise(resolve=>{release=resolve;});
    await page.route(/enemy-slime[^/]*\.webp/,async route=>{await held;await route.continue();});
    await page.goto(server.url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>{
      const art=document.querySelector('.menu-loading-flock'),logo=document.querySelector('.menu-loading-logo');
      return art?.complete&&art.naturalWidth>0&&logo?.complete&&logo.naturalWidth>0;
    });
    const state=await page.evaluate(()=>{
      const rect=selector=>{
        const e=document.querySelector(selector),r=e.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,fit:getComputedStyle(e).objectFit};
      };
      return {art:rect('.menu-loading-flock'),card:rect('.boot-loader__card'),bar:rect('.boot-loader__track'),
        complete:document.querySelector('.boot-loader').classList.contains('is-complete'),
        src:document.querySelector('.menu-loading-flock').src,
        width:document.querySelector('.menu-loading-flock').naturalWidth,
        height:document.querySelector('.menu-loading-flock').naturalHeight};
    });
    for(const name of ['art','card','bar']){
      const r=state[name];assert(r.left>=0&&r.top>=0&&r.right<=width+1&&r.bottom<=height+1,
        `${width}x${height}: clipped ${name}: ${JSON.stringify(r)}`);
    }
    assert.equal(state.art.fit,'contain');assert.equal(state.complete,false);
    assert.equal(state.width/state.height,1.5);assert(state.src.includes('loading-rooster-trio-v2'));
    await page.screenshot({path:`${folder}/loader-${width}x${height}.png`});
    release();
    await page.waitForSelector('.henhouse-panel');
    await page.waitForFunction(()=>!document.querySelector('.boot-loader')||document.querySelector('.boot-loader').classList.contains('is-complete'));
    assert.deepEqual(errors,[]);
    results.push({width,height,...state,errors});await page.close();
  }
  await fs.writeFile(`${folder}/verification.json`,JSON.stringify(results,null,2));
  console.log('Loading art passed: complete new trio, no cropping, five desktop/portal/mobile sizes, actual loading completes to hub.');
} finally {await browser.close();await stopTestServer(server.server);}
