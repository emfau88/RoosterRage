import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ensureTestServer, loadPlaywright, stopTestServer, projectRoot } from '../../../tests/helpers/test-runtime.mjs';
const output=import.meta.dirname,still=process.argv.includes('--still');
const resume=process.argv.includes('--resume');
const renderSources=['study.js','effects.js','index.html','baseline/EnemyProjectile.js','baseline/HazardZone.js','baseline/LaserCombAbility.js'];
const latestRenderChange=Math.max(...await Promise.all(renderSources.map(async file=>(await fs.stat(path.join(output,file))).mtimeMs)));
const selection=process.argv.find(a=>a.startsWith('--effect='))?.split('=')[1];
const effects=selection?[selection]:['boss','laser','molotov','overlap'];
const diff=()=>crypto.createHash('sha256').update(execFileSync('git',['diff','--binary','--','.',':(exclude)docs/qa/**'],{cwd:projectRoot,stdio:['ignore','pipe','ignore'],maxBuffer:16*1024*1024})).digest('hex');
const baseline=JSON.parse(await fs.readFile(path.join(output,'baseline.json'),'utf8'));
assert.equal(diff(),baseline.productionDiffSHA256,'Production edits occurred since the preview started');
for(const [file,hash] of Object.entries(baseline.sourceHashes))assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(projectRoot,file))).digest('hex'),hash);
const server=await ensureTestServer();
const browser=await loadPlaywright().chromium.launch({headless:true,
  executablePath:process.env.ROOSTER_CHROMIUM??'C:/Users/madde/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',
  args:['--disable-features=NetworkChangeNotifierWin']});
const results=[];
const frame=async(page,ms)=>{await page.evaluate(ms=>window.combatStudy.setTime(ms),ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
try{
  for(const effect of effects)for(const renderer of ['webgl','canvas']){
    const errors=[],page=await browser.newPage({viewport:{width:1280,height:664}});
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(`${server.url}docs/qa/combat-effects-study/?effect=${effect}&renderer=${renderer}&capture`);
    await page.waitForFunction(()=>window.combatStudy?.ready,{timeout:20000});
    const times=effect==='boss'?[0,340,700,1300,1780,2050,2480,3900,4900,5500,6400]:effect==='laser'?[0,240,380,540,900,2420,4380,4550,4900,6990,7900]:effect==='molotov'?[0,340,500,1600,3200,3950,4700,6500,7900,10400,11000,11800]:[0,380,1100,1700,2100,3200,4000,5100,5500];
    const samples=[];
    for(const ms of times){await frame(page,ms);const snapshot=await page.evaluate(()=>window.combatStudy.describe());
      assert(snapshot.panels.every(p=>p.finite));assert(snapshot.panels.every(p=>p.fields.every(f=>f.uniform)),'Flame frames were squashed');
      samples.push(snapshot);
      if(renderer==='webgl'||[times[3],times.at(-2)].includes(ms))await page.screenshot({path:path.join(output,`${effect}-${renderer}-${ms}.png`)});
    }
    const hold=effect==='laser'?4380:effect==='boss'?1300:1600;
    await frame(page,hold);const frozen=await page.screenshot();await page.waitForTimeout(100);
    assert(frozen.equals(await page.screenshot()),'Paused timestamp moves');
    await frame(page,hold+80);assert(!frozen.equals(await page.screenshot()),'Effect did not animate');
    // Repeated seeking must release old scenes/particles, including baseline timed objects.
    await frame(page,hold);const count=(await page.evaluate(()=>window.combatStudy.describe())).objects;
    for(let i=0;i<4;i++){await frame(page,times.at(-1));await frame(page,hold);assert.equal((await page.evaluate(()=>window.combatStudy.describe())).objects,count);}
    const ranks=[];
    if(effect==='laser'||effect==='molotov')for(const rank of ['1','2','3','4','evo']){
      await page.evaluate(rank=>window.combatStudy.setRank(rank),rank);await frame(page,effect==='laser'?410:1750);
      const state=await page.evaluate(()=>window.combatStudy.describe());assert(state.panels.every(p=>p.finite));
      if(effect==='molotov')assert(state.panels[1].fields.every(f=>f.radius===(rank==='evo'?136:[0,90,108,124,112][Number(rank)])));
      if(renderer==='webgl')await page.screenshot({path:path.join(output,`${effect}-rank-${rank}.png`)});ranks.push(state);
    }
    await page.evaluate(()=>window.combatStudy.setRank('auto'));
    if(!still&&renderer==='webgl'){
      const duration=(await page.evaluate(()=>window.combatStudy.describe())).cycle,frames=Math.round(duration/1000*30);
      const dir=path.join(projectRoot,'test-results/combat-effects-study',`${effect}-frames`);await fs.mkdir(dir,{recursive:true});
      let reused=0;
      for(let i=0;i<frames;i++){
        const file=path.join(dir,`frame-${String(i).padStart(4,'0')}.jpg`);
        // A closed shared dev server can interrupt a long capture. Reuse only frames
        // captured after the latest change to every preview source, then complete the film.
        const previous=resume?await fs.stat(file).catch(()=>null):null;
        if(previous&&previous.mtimeMs>=latestRenderChange&&previous.size>0){reused++;continue;}
        await frame(page,i*1000/30);await page.screenshot({path:file,type:'jpeg',quality:96});
        if(i%90===0)console.log(`${effect}: ${i}/${frames} frames`);
      }
      if(reused)console.log(`${effect}: retained ${reused} current-source frames from interrupted export`);
      const mp4=path.join(output,`${effect}-before-after.mp4`);
      execFileSync('ffmpeg',['-y','-v','error','-framerate','30','-i',path.join(dir,'frame-%04d.jpg'),'-frames:v',String(frames),'-an','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
      execFileSync('ffmpeg',['-y','-v','error','-i',mp4,'-filter_complex','fps=20,scale=1120:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(output,`${effect}-before-after.gif`)]);
    }
    assert.deepEqual(errors,[]);results.push({effect,renderer,status:'passed',frozen:true,animated:true,seekingStable:true,errors,samples,ranks});await page.close();
    console.log(`${effect}/${renderer}: frames, lifecycle, ranks, frozen clock, repeated seeking and assets passed`);
  }
  const page=await browser.newPage({viewport:{width:1280,height:760}});
  await page.goto(`${server.url}docs/qa/combat-effects-study/?effect=laser`);await page.waitForFunction(()=>window.combatStudy?.ready);
  await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=await page.evaluate(()=>window.combatStudy.describe().elapsed);
  await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.combatStudy.describe().elapsed),paused);
  await page.locator('#speed').selectOption('0.5');assert.equal(await page.evaluate(()=>window.combatStudy.describe().speed),.5);
  await page.getByRole('button',{name:'Abspielen',exact:true}).click();await page.waitForTimeout(150);assert((await page.evaluate(()=>window.combatStudy.describe().elapsed))>paused);
  await page.locator('#scrub').fill('4380');assert.equal(await page.evaluate(()=>window.combatStudy.describe().elapsed),4380);
  await page.locator('#rank').selectOption('evo');assert.equal(await page.evaluate(()=>window.combatStudy.describe().rank),'evo');
  for(const name of ['Molotov','Boss-Feuerball','Zusammenspiel']){await page.getByRole('link',{name,exact:true}).click();await page.waitForFunction(()=>window.combatStudy?.ready);}
  await page.close();assert.equal(diff(),baseline.productionDiffSHA256);
  await fs.writeFile(path.join(output,`${selection?selection+'-':''}verification${still?'-stills':''}.json`),JSON.stringify({generatedAt:new Date().toISOString(),status:'passed',previewOnly:true,productionDiffUnchanged:true,sourceHashes:baseline.sourceHashes,controls:['pause','resume','half speed','scrub','rank selection','navigation'],results},null,2)+'\n');
}finally{await browser.close();await stopTestServer(server.server);}
