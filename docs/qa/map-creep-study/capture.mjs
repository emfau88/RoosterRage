import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ensureTestServer, loadPlaywright, stopTestServer, projectRoot } from '../../../tests/helpers/test-runtime.mjs';

const output=import.meta.dirname,still=process.argv.includes('--still');
const diff=()=>crypto.createHash('sha256').update(execFileSync('git',['diff','--binary','--','.',':(exclude)docs/qa/**'],{cwd:projectRoot,stdio:['ignore','pipe','ignore'],maxBuffer:16*1024*1024})).digest('hex');
const baseline=JSON.parse(await fs.readFile(path.join(output,'baseline.json'),'utf8'));
assert.equal(diff(),baseline.productionDiffSHA256,'Production changes occurred during preview work');
const server=await ensureTestServer();
const browser=await loadPlaywright().chromium.launch({headless:true,executablePath:'C:/Users/madde/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',args:['--disable-features=NetworkChangeNotifierWin']});
const results=[];
const frame=async(page,ms)=>{await page.evaluate(ms=>window.creepStudy.setTime(ms),ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
try {
  for(const map of ['alley','coop']) for(const renderer of ['webgl','canvas']) {
    const errors=[],page=await browser.newPage({viewport:{width:1280,height:732},deviceScaleFactor:1});
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(`${server.url}docs/qa/map-creep-study/?map=${map}&renderer=${renderer}&capture`);
    await page.waitForFunction(()=>window.creepStudy?.ready,{timeout:20000});
    const samples=[];
    for(const ms of [300,1000,1400,1660,1740,1900,2100,2400,3200,4800,5850,6300]) {
      await frame(page,ms);const snapshot=await page.evaluate(()=>window.creepStudy.describe());
      assert(snapshot.finite);assert(snapshot.uniform,'Sprites were stretched');
      assert(Math.abs(snapshot.panels[0].special.width-snapshot.panels[1].special.width)<1e-6,'Figure scale differs');
      samples.push(snapshot);
      if(renderer==='webgl'&&[300,1400,1900,3200,4800].includes(ms)||renderer==='canvas'&&ms===1900)await page.screenshot({path:path.join(output,`${map}-${renderer}-${ms}.png`)});
    }
    await frame(page,1400);const frozen=await page.screenshot();await page.waitForTimeout(100);assert(frozen.equals(await page.screenshot()),'Frozen clock moved');
    await frame(page,1500);assert(!frozen.equals(await page.screenshot()),'Animation did not advance');
    const count=(await page.evaluate(()=>window.creepStudy.describe())).objects;
    for(let i=0;i<8;i++){await frame(page,i*759);assert.equal((await page.evaluate(()=>window.creepStudy.describe())).objects,count);}
    if(!still&&renderer==='webgl') {
      const fps=24,frames=Math.round(6400/1000*fps),dir=path.join(projectRoot,'test-results/map-creep-study',`${map}-frames`);await fs.mkdir(dir,{recursive:true});
      for(let i=0;i<frames;i++) {
        await frame(page,i*1000/fps);await page.screenshot({path:path.join(dir,`frame-${String(i).padStart(4,'0')}.jpg`),type:'jpeg',quality:96});
        if(i%48===0)console.log(`${map}: ${i}/${frames} frames`);
      }
      const mp4=path.join(output,`${map}-before-after.mp4`);
      execFileSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',path.join(dir,'frame-%04d.jpg'),'-frames:v',String(frames),'-an','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
      execFileSync('ffmpeg',['-y','-v','error','-i',mp4,'-filter_complex','fps=16,scale=1120:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(output,`${map}-before-after.gif`)]);
    }
    assert.deepEqual(errors,[]);results.push({map,renderer,status:'passed',frozen:true,animated:true,stableObjectCount:count,errors,samples});await page.close();console.log(`${map}/${renderer}: frames, scale, frozen clock, seeking and assets passed`);
  }
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto(`${server.url}docs/qa/map-creep-study/`);await page.waitForFunction(()=>window.creepStudy?.ready);
  await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await page.evaluate(()=>window.creepStudy.describe().elapsed);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.creepStudy.describe().elapsed),paused);
  await page.locator('#speed').selectOption('0.5');assert.equal(await page.evaluate(()=>window.creepStudy.describe().speed),.5);
  await page.getByRole('button',{name:'Abspielen',exact:true}).click();await page.waitForTimeout(150);assert((await page.evaluate(()=>window.creepStudy.describe().elapsed))>paused);
  await page.locator('#scrub').fill('1400');assert.equal(await page.evaluate(()=>window.creepStudy.describe().elapsed),1400);
  await page.getByRole('link',{name:'Coop Square',exact:true}).click();await page.waitForFunction(()=>window.creepStudy?.ready&&window.creepStudy.describe().map==='coop');await page.close();
  assert.equal(diff(),baseline.productionDiffSHA256);
  const renderFiles=['study.js','index.html','frame-layout.json',...Object.keys(JSON.parse(await fs.readFile(path.join(output,'frame-layout.json'),'utf8'))).map(key=>`assets/${key}.png`)];
  const sourceHashes=Object.fromEntries(await Promise.all(renderFiles.map(async file=>[file,crypto.createHash('sha256').update(await fs.readFile(path.join(output,file))).digest('hex')])));
  await fs.writeFile(path.join(output,`verification${still?'-stills':''}.json`),JSON.stringify({generatedAt:new Date().toISOString(),status:'passed',previewOnly:true,productionDiffUnchanged:true,controls:['pause','resume','half speed','scrub','map navigation'],sourceHashes,results},null,2)+'\n');
} finally {await browser.close();await stopTestServer(server.server);}
