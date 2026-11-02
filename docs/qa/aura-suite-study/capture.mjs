import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ensureTestServer, stopTestServer, projectRoot } from '../../../tests/helpers/test-runtime.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const output=import.meta.dirname,browserPath='C:/Users/madde/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const trackedDiff=()=>sha(execFileSync('git',['diff','--binary'],{cwd:projectRoot,stdio:['ignore','pipe','ignore']}));
const oldStudyPath=path.join(output,'../healing-aura-study/study.js');
const baseline={trackedDiff:trackedDiff(),oldStudy:sha(await fs.readFile(oldStudyPath))};
const still=process.argv.includes('--still'),groups=['healing','defense','royal'];
const server=await ensureTestServer();
let browser;
const reports=[],errors=[],failures=[];
function record(page,label){
  page.on('pageerror',e=>errors.push({label,message:e.message}));
  page.on('requestfailed',r=>failures.push({label,url:r.url(),failure:r.failure()}));
  page.on('response',r=>{if(r.status()>=400)failures.push({label,url:r.url(),status:r.status()});});
}
async function setTime(page,ms){
  await page.evaluate(ms=>window.auraSuite.setTime(ms),ms);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
try{
  browser=await chromium.launch({executablePath:browserPath,headless:true});
  for(const group of groups){
    const page=await browser.newPage({viewport:{width:1120,height:808},deviceScaleFactor:1});record(page,`${group}-webgl`);
    await page.goto(`${server.url}docs/qa/aura-suite-study/index.html?capture=1&group=${group}`);
    await page.waitForFunction(()=>window.auraSuite?.ready);
    await setTime(page,1350);
    await page.screenshot({path:path.join(output,`${group}-before-after.png`)});
    const details=await page.evaluate(()=>window.auraSuite.describe());
    if(details.renderer!=='WEBGL')throw new Error('Expected WebGL');
    if(details.rows.some(row=>row.scales[0]!==row.scales[1]||row.frames[0]!==row.frames[1]))throw new Error('Unequal subjects');
    await setTime(page,5750);
    await page.screenshot({path:path.join(output,`${group}-moving.png`)});
    console.log(JSON.stringify({stage:'preview-ready',...details,errors,failures}));
    if(!still){
      const frames=path.resolve(output,`frames-${group}`);await fs.mkdir(frames,{recursive:true});
      const fps=30,seconds=8;
      for(let frame=0;frame<fps*seconds;frame++){
        await setTime(page,frame*1000/fps);
        await page.screenshot({path:path.join(frames,`frame-${String(frame).padStart(4,'0')}.png`)});
        if(frame%60===0)console.log(`${group}: ${frame}/${fps*seconds}`);
      }
      const input=path.join(frames,'frame-%04d.png');
      execFileSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',input,'-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,`${group}-before-after.mp4`)]);
      execFileSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',input,'-filter_complex','[0:v]fps=24,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(output,`${group}-before-after.gif`)]);
      await setTime(page,0);const loopStart=sha(await page.screenshot());
      await setTime(page,8000);const loopEnd=sha(await page.screenshot());
      const canvas=await browser.newPage({viewport:{width:1120,height:808},deviceScaleFactor:1});record(canvas,`${group}-canvas`);
      await canvas.goto(`${server.url}docs/qa/aura-suite-study/index.html?capture=1&group=${group}&renderer=canvas`);
      await canvas.waitForFunction(()=>window.auraSuite?.ready);await setTime(canvas,1350);
      await canvas.screenshot({path:path.join(output,`${group}-canvas.png`)});
      const canvasDetails=await canvas.evaluate(()=>window.auraSuite.describe());await canvas.close();
      reports.push({...details,canvasRenderer:canvasDetails.renderer,fps,seconds,loopPixelIdentical:loopStart===loopEnd});
      if(loopStart!==loopEnd)throw new Error(`${group}: loop mismatch`);
      if(path.dirname(frames)!==path.resolve(output)||path.basename(frames)!==`frames-${group}`)throw new Error('Unexpected frame directory');
      await fs.rm(frames,{recursive:true});
    }
    await page.close();
  }
  if(!still){
    await fs.writeFile(path.join(output,'playlist.txt'),groups.map(group=>`file '${group}-before-after.mp4'`).join('\n')+'\n');
    execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',path.join(output,'playlist.txt'),'-c','copy','-movflags','+faststart',path.join(output,'all-six-auras-before-after.mp4')]);
    const report={groups:reports,errors,failures,trackedSourceUnchanged:baseline.trackedDiff===trackedDiff(),
      originalHealingStudyUnchanged:baseline.oldStudy===sha(await fs.readFile(oldStudyPath)),
      productionAuraSourceSha256:sha(await fs.readFile(path.join(projectRoot,'src/systems/EnemyAuraVisual.js'))),
      scope:'Isolated art preview only. No gameplay, build, release or deployment changes.'};
    await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
    if(errors.length||failures.length||!report.trackedSourceUnchanged||!report.originalHealingStudyUnchanged)throw new Error(JSON.stringify(report));
    console.log(JSON.stringify({stage:'complete',groups:reports.map(r=>r.group),errors,failures,trackedSourceUnchanged:report.trackedSourceUnchanged,originalHealingStudyUnchanged:report.originalHealingStudyUnchanged}));
  }else if(errors.length||failures.length)throw new Error(JSON.stringify({errors,failures}));
}finally{await browser?.close();await stopTestServer(server.server);}
