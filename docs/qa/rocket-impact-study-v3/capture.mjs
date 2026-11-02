import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ensureTestServer,loadPlaywright,stopTestServer,projectRoot} from '../../../tests/helpers/test-runtime.mjs';

const output=import.meta.dirname,still=process.argv.includes('--still'),report=[];
const selectedView=process.argv.find(arg=>arg.startsWith('--view='))?.split('=')[1];
const selectedViews=selectedView?[selectedView]:['all','compare','salvo'];
assert(selectedViews.every(view=>['all','compare','salvo'].includes(view)),'Invalid view filter');
const trackedDiff=()=>crypto.createHash('sha256').update(execFileSync('git',['diff','--binary'],{cwd:projectRoot,stdio:['ignore','pipe','ignore']})).digest('hex');
const baseline=trackedDiff();
const server=await ensureTestServer();
const browser=await loadPlaywright().chromium.launch({headless:true,
  ...(process.env.ROOSTER_CHROMIUM?{executablePath:process.env.ROOSTER_CHROMIUM}:{})});
try{
  for(const view of selectedViews)for(const renderer of ['webgl','canvas']){
    const errors=[],viewport={width:1440,height:view==='salvo'?650:950};
    const context=await browser.newContext({viewport});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
    await page.goto(`${server.url}docs/qa/rocket-impact-study-v3/?view=${view}&renderer=${renderer}&capture`);
    await page.waitForFunction(()=>window.impactStudy?.ready);
    const original=await page.evaluate(()=>window.impactStudy.describe());
    assert.equal(original.frameChecks.length,24);
    assert(original.frameChecks.every(f=>f.sourceUnclipped&&f.normalizedUnclipped),'A source or registered frame is clipped');
    const frames=new Map(),samples=[];
    for(const ms of [0,35,55,85,110,140,185,215,245,280,320,355,390,510,650,800,1030,1260,1600,2200,2700]){
      await page.evaluate(ms=>window.impactStudy.setTime(ms),ms);
      await page.waitForTimeout(35);
      const state=await page.evaluate(()=>window.impactStudy.describe());
      assert.equal(state.objects,original.objects,'Preview leaks display objects across frames');
      assert(state.effects.every(e=>e.volumeScales.every(s=>Math.abs(s.x-s.y)<1e-9)),'Fire or smoke art is stretched');
      assert(state.effects.every(e=>e.peakOpaqueWidth<=[110,150,130,170,230][e.stage==='evo'?4:Number(e.stage.slice(1))-1]),'Opaque core exceeds the visual size budget');
      state.effects.forEach(e=>{if(!frames.has(e.stage))frames.set(e.stage,new Set());e.visibleFrames.forEach(f=>frames.get(e.stage).add(f));});
      samples.push({time:ms,effects:state.effects});
      if([110,185,280,390,650,1260].includes(ms))await page.screenshot({path:path.join(output,`${view}-${renderer}-${ms}.png`)});
      if(ms===2700)assert(state.effects.every(e=>!e.active&&e.visibleFrames.length===0),'Effects did not expire');
    }
    for(const [id,values]of frames)assert(values.size>=6,`${id}: insufficient painted animation frames`);
    await page.evaluate(()=>window.impactStudy.setTime(280));
    const held=await page.screenshot();await page.waitForTimeout(100);
    assert(held.equals(await page.screenshot()),'Manual review frame does not hold');
    // Fixed simulation timestamps produce a reproducible, perfectly looping review.
    if(renderer==='webgl'&&!still){
      const frameDir=path.join(projectRoot,'test-results/rocket-impact-study-v3',`${view}-frames`);
      await fs.mkdir(frameDir,{recursive:true});
      for(let i=0;i<90;i++){
        await page.evaluate(ms=>window.impactStudy.setTime(ms),75+i*1000/30);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.screenshot({path:path.join(frameDir,`frame-${String(i).padStart(3,'0')}.png`)});
      }
      const normal=path.join(output,`${view}-in-motion.mp4`),input=path.join(frameDir,'frame-%03d.png');
      execFileSync('ffmpeg',['-y','-v','error','-framerate','30','-i',input,'-an','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',normal]);
      execFileSync('ffmpeg',['-y','-v','error','-i',normal,'-filter_complex','fps=25,scale=1200:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(output,`${view}-in-motion.gif`)]);
    }
    // Also exercise normal playback, with a bounded object count.
    await page.evaluate(()=>window.impactStudy.play());
    await page.waitForTimeout(350);
    const final=await page.evaluate(()=>window.impactStudy.describe());assert.equal(final.objects,original.objects);
    assert.deepEqual(errors,[]);await context.close();
    report.push({view,renderer,objects:original.objects,errors,unclippedFrames:original.frameChecks.length,paintedFrames:Object.fromEntries([...frames].map(([id,v])=>[id,[...v]])),samples,
      elapsedPlayback:final.elapsed,expiredAt2700:true,stableObjectCount:true,uniformVolumeScaling:true,opaqueCoreWithinBudget:true});
    console.log(`${view} / ${renderer}: painted frames, expiry, frozen inspection, stable object count and capture passed.`);
  }
  // Verify actual visible controls in the interactive page (capture mode hides these).
  const page=await browser.newPage({viewport:{width:1440,height:1012}});
  await page.goto(`${server.url}docs/qa/rocket-impact-study-v3/?view=all`);
  await page.waitForFunction(()=>window.impactStudy?.ready);
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const before=await page.evaluate(()=>window.impactStudy.describe());await page.waitForTimeout(150);
  const after=await page.evaluate(()=>window.impactStudy.describe());assert.equal(before.elapsed,after.elapsed);assert(after.paused);
  await page.locator('#speed').selectOption('0.5');assert.equal(await page.evaluate(()=>window.impactStudy.describe().speed),.5);
  await page.getByRole('button',{name:'Abspielen',exact:true}).click();await page.waitForTimeout(150);
  assert((await page.evaluate(()=>window.impactStudy.describe().elapsed))>after.elapsed);
  await page.getByRole('link',{name:'R4 & EVO vergleichen'}).click();await page.waitForFunction(()=>window.impactStudy?.describe().view==='compare');
  await page.getByRole('link',{name:'Salvenprüfung'}).click();await page.waitForFunction(()=>window.impactStudy?.describe().view==='salvo');
  await page.close();
  assert.equal(trackedDiff(),baseline,'Tracked game source changed during preview');
  if(selectedView){
    const previous=JSON.parse(await fs.readFile(path.join(output,'verification.json'),'utf8'));
    report.unshift(...previous.results.filter(result=>result.view!==selectedView));
  }
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({generatedAt:new Date().toISOString(),
    status:'passed',story:'Open isolated study → load local assets → animate proportionate compact impacts → compare rejected draft and three-hit EVO overlap.',
    gameplayModified:false,trackedSourceUnchanged:true,controls:['pause','half speed','resume','comparison navigation','salvo navigation'],results:report},null,2));
}finally{await browser.close();await stopTestServer(server.server);}
