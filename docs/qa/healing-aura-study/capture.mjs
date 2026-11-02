import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ensureTestServer, stopTestServer, projectRoot } from '../../../tests/helpers/test-runtime.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const output = import.meta.dirname;
const frames = path.join(output, 'frames');
const browserPath = 'C:/Users/madde/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const trackedDiff = () => execFileSync('git',['diff','--binary'],{cwd:projectRoot,stdio:['ignore','pipe','ignore']});
const before = sha(trackedDiff());
const server = await ensureTestServer();
const browser = await chromium.launch({executablePath:browserPath,headless:true});
const page = await browser.newPage({viewport:{width:1120,height:614},deviceScaleFactor:1});
const errors = [], failures = [];
page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>failures.push({url:r.url(),failure:r.failure()}));
try {
  await page.goto(`${server.url}docs/qa/healing-aura-study/index.html?capture=1`);
  await page.waitForFunction(()=>window.auraStudy?.ready);
  const setTime = async ms => {
    await page.evaluate(ms=>window.auraStudy.setTime(ms),ms);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  };
  await setTime(1350);
  await page.screenshot({path:path.join(output,'healing-aura-before-after.png')});
  const details = await page.evaluate(()=>window.auraStudy.describe());
  console.log(JSON.stringify({stage:'preview-ready',details,errors,failures}));
  if (process.argv.includes('--still')) process.exitCode=0;
  else {
    await fs.mkdir(frames,{recursive:true});
    const fps = 30, seconds = 8;
    for (let frame=0; frame<fps*seconds; frame++) {
      await setTime(frame*1000/fps);
      await page.screenshot({path:path.join(frames,`frame-${String(frame).padStart(4,'0')}.png`)});
      if (frame%60===0) console.log(`Captured ${frame}/${fps*seconds}`);
    }
    const input = path.join(frames,'frame-%04d.png');
    execFileSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',input,'-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,'healing-aura-before-after.mp4')]);
    execFileSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',input,'-filter_complex','[0:v]fps=24,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(output,'healing-aura-before-after.gif')]);
    await setTime(0);
    const loopStart=sha(await page.screenshot());
    await setTime(8000);
    const loopEnd=sha(await page.screenshot());
    const canvasPage=await browser.newPage({viewport:{width:1120,height:614}});
    canvasPage.on('pageerror',e=>errors.push(e.message));
    await canvasPage.goto(`${server.url}docs/qa/healing-aura-study/index.html?capture=1&renderer=canvas`);
    await canvasPage.waitForFunction(()=>window.auraStudy?.ready);
    await canvasPage.evaluate(()=>window.auraStudy.setTime(1350));
    await canvasPage.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await canvasPage.screenshot({path:path.join(output,'healing-aura-canvas.png')});
    const canvasDetails=await canvasPage.evaluate(()=>window.auraStudy.describe());
    await canvasPage.close();
    const sourceUnchanged=before===sha(trackedDiff());
    const report={...details,canvasRenderer:canvasDetails.renderer,fps,seconds,loopPixelIdentical:loopStart===loopEnd,sourceUnchanged,errors,failures,
      originalSourceSha256:sha(await fs.readFile(path.join(projectRoot,'src/systems/EnemyAuraVisual.js')))};
    await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
    if(errors.length||failures.length||!sourceUnchanged||loopStart!==loopEnd) throw new Error(JSON.stringify(report));
    console.log(JSON.stringify(report));
    const resolvedFrames=path.resolve(frames), resolvedOutput=path.resolve(output);
    if(path.dirname(resolvedFrames)!==resolvedOutput||path.basename(resolvedFrames)!=='frames') throw new Error('Unexpected capture directory');
    await fs.rm(resolvedFrames,{recursive:true});
  }
} finally { await browser.close(); await stopTestServer(server.server); }
