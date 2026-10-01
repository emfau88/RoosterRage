// Serves the built release and writes reproducible QA artifacts. Set
// PORTAL_BASELINE_OUTPUT for later packages to preserve the Package 0 baseline.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(root, process.env.PORTAL_BASELINE_OUTPUT ?? 'docs/qa/portal-package-0');
if(path.relative(root,output).startsWith('..') || path.isAbsolute(path.relative(root,output)))throw new Error('QA output must remain within the repository.');
const dist = path.join(root, 'dist-release');
const mode = process.argv[2] ?? '--views';
const mime = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.webp':'image/webp', '.png':'image/png', '.mp3':'audio/mpeg' };
await fs.mkdir(output, { recursive:true });
const server = http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    const relative = path.relative(dist,file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403).end(); return; }
    res.writeHead(200, { 'Content-Type':mime[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless:true, args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'] });
const advanced = {
  version:2, kernels:250, lifetimeKernels:500, talentRanks:{}, roosterMastery:{},
  totalRuns:8, victories:3, totalKills:1300, bossDefeats:3,
  roosterRuns:{ace:4,artillery:2,storm:2}, roosterWins:{ace:1,artillery:1,storm:1},
  unlockedRoosters:['ace','artillery','storm'], unlockedChallenges:['standard','rush-hour','featherweight','royal-gauntlet'],
  selectedChallenge:'standard', selectedCosmetics:{}, discoveredEnemies:['slime','runner','brute','spitter','boss'],
  discoveredEvolutions:['evo-sunshot-array'], firstClearClaims:['standard'], history:[],
  bests:{highestKills:450,longestRunMs:440000,fastestVictoryMs:440000}
};
const lateSave={...advanced,kernels:45,talentRanks:{'sturdy-nest':3,'swift-spurs':3,'polished-yolk':3,'wide-wings':2,'second-choice':1,'royal-instinct':1},roosterMastery:{ace:{xp:950},artillery:{xp:950},storm:{xp:950}}};
await fs.writeFile(path.join(output,'advanced-save.json'), JSON.stringify(advanced,null,2)+'\n');
await fs.writeFile(path.join(output,'late-save.json'),JSON.stringify(lateSave,null,2)+'\n');
const environments = [];
async function open(viewport, save, query = {}, instrument = true, dpr = 1) {
  const context = await browser.newContext({ viewport, deviceScaleFactor:dpr });
  await context.addInitScript(()=>{
    new MutationObserver(()=>{
      if(!window.__baselineReadyMs && document.body?.dataset.roosterLoadState==='ready')window.__baselineReadyMs=performance.now();
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-rooster-load-state']});
  });
  if (save) await context.addInitScript(state => localStorage.setItem('rooster-rage:meta:v2',JSON.stringify(state)),save);
  if (instrument) await context.addInitScript(() => {
    // Observe the Phaser boot in the browser harness; do not modify distributed bytes.
    let phaser;
    Object.defineProperty(window,'Phaser',{configurable:true,get:()=>phaser,set(value) {
      phaser=value; const boot=value.Game.prototype.boot;
      value.Game.prototype.boot=function(...args) { window.__baselineGame=this; return boot.apply(this,args); };
    }});
  });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`);});
  const target = new URL(url); Object.entries(query).forEach(([key,value])=>target.searchParams.set(key,value));
  await page.goto(target.href,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.henhouse-panel',{timeout:20000});
  await page.waitForFunction(()=>document.body.dataset.roosterLoadState==='ready',{timeout:20000});
  await page.waitForTimeout(900);
  const environment = await page.evaluate(() => {
    const game=window.__baselineGame;
    const canvas=document.querySelector('canvas'); const gl=canvas.getContext('webgl2')??canvas.getContext('webgl');
    const debug=gl?.getExtension('WEBGL_debug_renderer_info');
    return {userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,
      renderer:game?.renderer.type===2?'WebGL':game?.renderer.type,canvas:{width:canvas.width,height:canvas.height},
      glRenderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,
      testApiExposed:!!window.__ROOSTER_TEST__,instrumented:!!game};
  });
  environments.push(environment);
  return {page,context,errors,environment};
}
const sceneCode = () => window.__baselineGame.scene.getScene('GameScene');
// Every prepared state is labeled as a fixture, never as evidence of natural game progression.
async function capture(page,name,manifest,kind='fixture') {
  await page.evaluate(async()=>{
    const panels=[...document.querySelectorAll('.upgrade-panel, .talent-inspector, .henhouse-view.is-active')];
    await Promise.all(panels.flatMap(panel=>panel.getAnimations().map(animation=>animation.finished)));
    await Promise.all([...document.querySelectorAll('.overlay img')].map(img=>img.decode().catch(()=>{})));
  });
  await page.waitForTimeout(100);
  await page.screenshot({path:path.join(output,`${name}.png`)});
  const ui=await page.evaluate(()=>{
    const selectors=['.upgrade-button__heading strong','.upgrade-button__rank','.upgrade-button__changes > span','.upgrade-button__description','.upgrade-button__synergy','.upgrade-button__evolution-hint','[data-run-arena]','.hub-run-summary','.hub-start-button','.rooster-card','[data-boss]','.wave-banner'];
    const nodes=Object.fromEntries(selectors.map(selector=>[selector,[...document.querySelectorAll(selector)].filter(el=>!selector.startsWith('.upgrade-button')||el.closest('.upgrade-panel')).map(el=>{
      const css=getComputedStyle(el),r=el.getBoundingClientRect();
      return {text:el.textContent.trim(),fontSize:css.fontSize,display:css.display,visibility:css.visibility,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
    })]));
    const s=window.__baselineGame.scene.getScene('GameScene');
    return {bodyText:document.body.innerText,nodes,selection:s.runState.currentSelection,
      choices:s.runState.pendingUpgradeChoices?.map(u=>({id:u.id,name:u.name,description:u.description,evolution:u.evolution,evolutionHint:u.evolutionHint,synergyActive:u.synergyActive})),
      build:s.loadout.getSnapshot(),pendingLevels:s.runState.pendingLevelUps,rewardQueue:[...s.runState.rewardQueue]};
  });
  manifest.push({name,kind,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})),ui});
}
async function details() {
  const manifest=[],geometry=[];
  const bounds=JSON.parse(await fs.readFile(path.join(root,'docs/qa/portal-package-0/sprite-alpha-bounds.json'),'utf8'));
  for(const [id,viewport] of Object.entries({desktop:{width:960,height:540},portrait:{width:390,height:844},landscape:{width:844,height:390}})) {
    const {page,context}=await open(viewport,advanced,{seed:'portal-details-baseline'});
    await page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');s.chooseRooster('artillery');s.player.level=6;s.startLevelUp();
      const choices=['primary-artillery-rank','artillery-reinforced-breech','rocket-egg'].map(id=>s.upgradeSystem.upgrades.find(u=>u.id===id));
      if(choices.some(u=>!s.upgradeSystem.isAvailable(u,s.player)))throw new Error('Invalid detail offers');
      s.runState.pendingUpgradeChoices=choices.map(u=>s.upgradeSystem.presentUpgrade(u,s.player));
      s.hud.showUpgradeChoices(s.runState.pendingUpgradeChoices,{type:'level',canReroll:true});
    });
    await page.waitForTimeout(300);
    await capture(page,`${id}-primary-recipe-details`,manifest);
    await context.close();
    const boss=await open(viewport,advanced,{seed:'portal-boss-layout'});
    await boss.page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');s.chooseRooster('ace');
      s.spawnEnemy(s.waveSystem.makeBoss());s.updateHud();s.hud.showWaveBanner(10,s.waveSystem.waves[9]);s.gamePause.request('qa-baseline');
    });
    await boss.page.waitForTimeout(400);
    await capture(boss.page,`${id}-boss-banner-layout`,manifest);
    await boss.context.close();
    for(const arena of ['open-yard','vertical-run','square-coop'])for(const rooster of ['ace','artillery','storm']){
      const item=await open(viewport,advanced,{arena,seed:'portal-geometry'});
      await item.page.evaluate(rooster=>{const s=window.__baselineGame.scene.getScene('GameScene');s.chooseRooster(rooster);s.gamePause.request('qa-baseline');},rooster);
      const data=await item.page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene'),sprite=s.player.sprite,canvas=document.querySelector('canvas');
        return {scale:sprite.scaleY,zoom:s.cameras.main.zoom,renderScale:s.game.roosterDisplay.renderScale,frameHeight:sprite.frame.height,cssPerRenderPixel:canvas.getBoundingClientRect().height/canvas.height};});
      const alpha=bounds.find(b=>b.id===rooster);
      geometry.push({viewportId:id,viewport,arena,rooster,...data,alphaBounds:alpha.alphaBounds,visibleHeightCss:alpha.visibleHeightPixels*data.scale*data.zoom*data.cssPerRenderPixel,method:'South idle frame 0, alpha >= 16; transparent padding excluded. No animation-pose range or human recognition test.'});
      if(arena==='vertical-run' && rooster==='ace')await capture(item.page,`${id}-feed-alley-geometry`,manifest);
      await item.context.close();
    }
    console.log(`Detail and geometry complete: ${id}`);
  }
  await fs.writeFile(path.join(output,'details.json'),JSON.stringify(manifest,null,2)+'\n');
  await fs.writeFile(path.join(output,'geometry.json'),JSON.stringify(geometry,null,2)+'\n');
}
async function views() {
  const manifest=[];
  for (const [id,viewport] of Object.entries({desktop:{width:960,height:540},portrait:{width:390,height:844},landscape:{width:844,height:390},large:{width:1440,height:900}})) {
    for (const [saveId,save] of [['first',null],['advanced',advanced]]) {
      const {page,context,errors}=await open(viewport,save,{seed:'portal-ui-baseline'});
      if(id==='desktop' && saveId==='first')await fs.writeFile(path.join(output,'first-save.json'),JSON.stringify(await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').meta.getState()),null,2)+'\n');
      await capture(page,`${id}-${saveId}-play`,manifest,'isolated-save-ui');
      for(const tab of ['roosters','training','archive']) {
        await page.locator(`[data-hub-tab="${tab}"]`).click();
        await capture(page,`${id}-${saveId}-${tab}`,manifest,'isolated-save-ui');
        if(tab==='training') {
          await page.locator('[data-talent]').first().click();
          await capture(page,`${id}-${saveId}-talent-detail`,manifest,'isolated-save-ui');
          await page.locator('.talent-inspector__close').click();
        }
      }
      await page.locator('[data-hub-settings]').click();
      await capture(page,`${id}-${saveId}-settings`,manifest,'isolated-save-ui');
      if(errors.length) throw new Error(JSON.stringify(errors));
      await context.close();
    }
    const {page,context,errors}=await open(viewport,advanced,{seed:'portal-rewards-baseline'});
    await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').chooseRooster('artillery'));
    await page.waitForTimeout(700);
    await capture(page,`${id}-combat-start`,manifest);
    await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').startLevelUp(3));
    await capture(page,`${id}-queued-level-up`,manifest);
    // Clear each selection via the same method used by the UI, then prepare the next fixture.
    await page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');while(s.isChoosingUpgrade)s.chooseUpgrade(s.runState.pendingUpgradeChoices[0]);s.runState.startChestReward('elite');});
    await capture(page,`${id}-elite-chest`,manifest);
    await page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');s.chooseUpgrade(s.runState.pendingUpgradeChoices[0]);s.runState.startChestReward('boss');});
    await capture(page,`${id}-boss-chest`,manifest);
    await page.evaluate(()=>{
      const s=window.__baselineGame.scene.getScene('GameScene');s.chooseUpgrade(s.runState.pendingUpgradeChoices[0]);s.player.level=20;
      // Reset the fixture's occupied slots before populating a specific valid full build.
      s.player.upgradeRanks.clear();s.player.upgrades=[];s.loadout.initializeStartWeapon(s.roosterClasses.selected);
      for(const id of ['primary-artillery-rank','artillery-reinforced-breech','golden-egg','orbit-eggs','lightning-comb','rocket-egg','armor','bigger-eggs','fire-eggs']){
        const upgrade=s.upgradeSystem.upgrades.find(u=>u.id===id);
        const count=id==='primary-artillery-rank'?3:1;
        for(let i=0;i<count;i++)if(s.upgradeSystem.isAvailable(upgrade,s.player))s.player.applyUpgrade(upgrade,s);
      }
      if(!s.upgradeSystem.isAvailable(s.upgradeSystem.upgrades.find(u=>u.id==='evo-siegebreaker-shell'),s.player))throw new Error('EVO fixture prerequisites incomplete');
      s.startLevelUp(2);s.runState.startChestReward('elite');s.runState.startChestReward('boss');
      if(!s.runState.pendingUpgradeChoices.some(u=>u.evolution))throw new Error('Missing EVO offer');
    });
    await capture(page,`${id}-full-build-evo-queue`,manifest);
    await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').gameOver());
    await page.waitForTimeout(400);
    await capture(page,`${id}-defeat`,manifest);
    if(errors.length)throw new Error(JSON.stringify(errors));
    await context.close();
    const victory=await open(viewport,advanced,{seed:'portal-result-baseline'});
    await victory.page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');s.chooseRooster('storm');s.victory();});
    await victory.page.waitForTimeout(700);
    await capture(victory.page,`${id}-victory`,manifest);
    await victory.context.close();
    await fs.writeFile(path.join(output,'views.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(`Views complete: ${id}`);
  }
}
async function menuMatrix() {
  const manifest=[];
  const viewports=[['small',{width:320,height:568}],['boss-grid-boundary',{width:720,height:600}],['boss-list-boundary',{width:719,height:599}]];
  for(const [id,viewport] of viewports) {
    const {page,context,errors}=await open(viewport,advanced,{seed:'portal-menu-boundary'},true,2);
    await capture(page,`${id}-play`,manifest,'isolated-save-ui');
    await page.locator('[data-hub-tab="roosters"]').click();
    await page.locator('.rooster-card--storm').click();
    await capture(page,`${id}-storm-preview`,manifest,'isolated-save-ui');
    await page.locator('[data-hub-tab="training"]').click();
    await page.locator('[data-talent]').first().click();
    await capture(page,`${id}-talent-detail`,manifest,'isolated-save-ui');
    await page.locator('.talent-inspector__close').click();
    await page.locator('[data-hub-settings]').click();
    await capture(page,`${id}-settings`,manifest,'isolated-save-ui');
    await page.locator('.settings-close').click();
    await page.locator('[data-hub-tab="play"]').click();
    await page.locator('[data-run-start]').click();
    await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').runState.startChestReward('boss'));
    await capture(page,`${id}-boss-chest`,manifest);
    // Exercise the fourth actual production offer through its HTML action.
    await page.locator('.upgrade-button').nth(3).click();
    const resumed=await page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');return !s.isChoosingUpgrade&&!s.gamePause.isPaused;});
    if(!resumed)throw new Error('Fourth production boss offer did not resume');
    manifest.at(-1).fourthOfferSelectedAndResumed=true;
    if(errors.length)throw new Error(JSON.stringify(errors));
    await context.close();
    console.log(`Menu boundary complete: ${id}`);
  }
  await fs.writeFile(path.join(output,'menu-matrix.json'),JSON.stringify(manifest,null,2)+'\n');
}
const runMatrix=[
  {id:'ace-yard',rooster:'ace',arena:'open-yard',seed:'portal-p0-yard-a',viewport:{width:960,height:540}},
  {id:'artillery-coop',rooster:'artillery',arena:'square-coop',seed:'portal-p0-coop-b',viewport:{width:390,height:844}},
  {id:'storm-alley',rooster:'storm',arena:'vertical-run',seed:'portal-p0-alley-c',viewport:{width:844,height:390}}
];
async function runOne(config) {
  const runDir=path.join(output,'runs',config.id);await fs.mkdir(runDir,{recursive:true});
  const save=config.advanced?lateSave:{...advanced,kernels:0,lifetimeKernels:0,talentRanks:{},roosterMastery:{}};
  const strategy=config.strategy??'average';
  const {page,context,errors,environment}=await open(config.viewport,save,{seed:config.seed,profile:strategy,arena:config.arena});
  await page.evaluate(({rooster,strategy})=>{const s=window.__baselineGame.scene.getScene('GameScene');s.bot.enabled=true;s.bot.strategy=strategy;if(!s.chooseRooster(rooster))throw new Error('Class selection failed');},{rooster:config.rooster,strategy});
  const started=Date.now(),samples=[],wavePeaks={},captured=new Set();let ended=false;
  while(Date.now()-started<660000) {
    await page.waitForTimeout(1000);
    const state=await page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');return {
      time:s.time.now,wave:s.waveSystem.currentWave,ended:s.gameEnded,selection:s.runState.currentSelection,
      hp:s.player.hp,maxHp:s.player.maxHp,x:s.player.sprite?.x??s.player.x,y:s.player.sprite?.y??s.player.y,
      enemies:s.enemies.length,enemyProjectiles:s.enemyProjectiles.length,
      hazards:s.getTelemetrySample().enemyHazardsAlive,visibleEnemies:s.getTelemetrySample().visibleEnemies,
      frames:s.debugStats.frames,error:s.debugStats.lastError??null,
      choosing:s.isChoosingUpgrade,camera:{x:s.cameras.main.scrollX,y:s.cameras.main.scrollY,zoom:s.cameras.main.zoom}};});
    samples.push(state);
    if(state.wave && !state.choosing) {
      if(!captured.has(state.wave)) {await page.screenshot({path:path.join(runDir,`wave-${String(state.wave).padStart(2,'0')}.png`)});captured.add(state.wave);console.log(`${config.id}: wave ${state.wave}`);}
      const pressure=state.enemies+state.enemyProjectiles+state.hazards;
      if(state.wave>=7 && pressure>(wavePeaks[state.wave]?.pressure??-1)) {
        wavePeaks[state.wave]={pressure,...state};
        await page.screenshot({path:path.join(runDir,`wave-${state.wave}-peak.png`)});
      }
    }
    if(samples.length%10===0)await fs.writeFile(path.join(runDir,'progress.json'),JSON.stringify({config,latest:state,wallMs:Date.now()-started,errors},null,2));
    if(state.ended){ended=true;break;}
    if(state.error)throw new Error(state.error);
  }
  const report=await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').runState.getRunReport());
  await page.screenshot({path:path.join(runDir,'result.png')});
  const data={config,environment,initialSave:save,method:`Unaccelerated production run; built-in ${strategy} bot; no direct stats, enemies, wave times or upgrades granted. ${config.advanced?'Valid capped talent progression applied by normal game logic.':'Unlock-only save, no talent/mastery bonuses.'} Concurrent contexts: frame times not hardware acceptance.`,wallMs:Date.now()-started,ended,errors,wavePeaks,report,samples};
  await fs.writeFile(path.join(runDir,'report.json'),JSON.stringify(data,null,2)+'\n');
  await context.close();console.log(`${config.id}: ${report.outcome}, ${(data.wallMs/1000).toFixed(1)} seconds`);
  return {id:config.id,outcome:report.outcome,ended,waves:report.waves.map(w=>w.wave),errors};
}
async function measure() {
  const records=[];
  for(const [id,viewport,dpr] of [['desktop',{width:960,height:540},1],['portrait',{width:390,height:844},2]]) {
    const {page,context,environment,errors}=await open(viewport,null,{seed:'portal-p0-performance',profile:'average'},true,dpr);
    const startup=await page.evaluate(()=>({readyMs:window.__baselineReadyMs,readyObservedMs:performance.now(),navigation:performance.getEntriesByType('navigation').map(e=>e.toJSON()),resources:performance.getEntriesByType('resource').map(e=>e.toJSON())}));
    await page.evaluate(()=>{
      window.__baselineRafSamples=[];window.__baselineRafRecording=true;let last;
      function sample(time){if(!window.__baselineRafRecording)return;if(last!==undefined)window.__baselineRafSamples.push(time-last);last=time;requestAnimationFrame(sample);}requestAnimationFrame(sample);
    });
    await page.evaluate(()=>{const s=window.__baselineGame.scene.getScene('GameScene');s.bot.enabled=true;s.bot.strategy='average';s.chooseRooster('ace');});
    await page.waitForTimeout(60000);
    const report=await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').runState.getRunReport());
    const rafSamples=await page.evaluate(()=>{window.__baselineRafRecording=false;return window.__baselineRafSamples;});
    const sorted=[...rafSamples].sort((a,b)=>a-b);
    const raf={samples:sorted.length,averageMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95Ms:sorted[Math.floor((sorted.length-1)*.95)],p99Ms:sorted[Math.floor((sorted.length-1)*.99)],maxMs:sorted.at(-1),over33Ms:sorted.filter(n=>n>33.4).length};
    records.push({id,environment,errors,startup,rawAnimationFrames:raf,rafSamples,report});await context.close();
    console.log(`Dedicated measurement complete: ${id}`);
  }
  await fs.writeFile(path.join(output,'measurements.json'),JSON.stringify(records,null,2)+'\n');
}
async function inventory() {
  const files=[];
  async function walk(dir) {for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else {
      const bytes=await fs.readFile(file);files.push({path:path.relative(dist,file).replaceAll('\\','/'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
    }
  }}await walk(dist);files.sort((a,b)=>a.path.localeCompare(b.path));
  const sourceRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  await fs.writeFile(path.join(output,'release-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),sourceRevision,files:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes,0),budgetBytes:19*1024*1024,entries:files},null,2)+'\n');
}
try {
  await inventory();
  if(mode==='--views')await views();
  else if(mode==='--menu-matrix')await menuMatrix();
  else if(mode==='--details')await details();
  else if(mode==='--runs')await fs.writeFile(path.join(output,'runs-summary.json'),JSON.stringify(await Promise.all(runMatrix.map(runOne)),null,2)+'\n');
  else if(mode==='--late-runs')await fs.writeFile(path.join(output,'late-runs-summary.json'),JSON.stringify(await Promise.all([
    {id:'artillery-coop-late',rooster:'artillery',arena:'square-coop',seed:'portal-p0-coop-late-d',viewport:{width:960,height:540},advanced:true,strategy:'evasive'},
    {id:'storm-alley-late',rooster:'storm',arena:'vertical-run',seed:'portal-p0-alley-late-e',viewport:{width:960,height:540},advanced:true,strategy:'evasive'}
  ].map(runOne)),null,2)+'\n');
  else if(mode==='--measure')await measure();
  else throw new Error('Use --views, --details, --menu-matrix, --runs, --late-runs or --measure');
  await fs.writeFile(path.join(output,`environment-${mode.slice(2)}.json`),JSON.stringify({host:{platform:os.platform(),release:os.release(),arch:os.arch(),cpus:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem()},browserVersion:browser.version(),nodeVersion:process.version,environments},null,2)+'\n');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
