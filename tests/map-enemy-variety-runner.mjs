import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { WAVE_DEFINITIONS } from '../src/data/waveDefinitions.js';
import { ensureTestServer, loadPlaywright, stopTestServer, projectRoot } from './helpers/test-runtime.mjs';

const folder=path.join(projectRoot,'test-results/map-variety');
await fs.mkdir(folder,{recursive:true});
const server=await ensureTestServer(),browser=await loadPlaywright().chromium.launch({headless:true,args:['--disable-features=NetworkChangeNotifierWin']});
const reports=[];
async function open(arena,renderer='WEBGL',portrait=false) {
  const page=await browser.newPage({viewport:portrait?{width:390,height:844}:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} at ${m.location().url}`);});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(renderer=>{
    let phaser;
    Object.defineProperty(window,'Phaser',{configurable:true,get:()=>phaser,set(value){
      phaser=value;const boot=value.Game.prototype.boot;
      value.Game.prototype.boot=function(...args){this.config.renderType=value[renderer];window.__varietyGame=this;return boot.apply(this,args);};
    }});
  },renderer);
  await page.goto(`${server.url}?seed=map-variety-integration&arena=${arena}&profile=manual`);
  await page.waitForFunction(()=>window.__varietyGame?.scene.getScene('GameScene')?.player);
  await page.evaluate(()=>{
    const s=window.__s=window.__varietyGame.scene.getScene('GameScene');
    s.chooseRooster('ace');s.waveSystem.active=false;s.bot.enabled=false;s.lastShotAt=Infinity;
    s.player.maxHp=s.player.hp=999999;
    window.__clear=()=>{for(const e of s.enemies)e.destroy();s.enemies=[];};window.__clear();
    window.__delay=ms=>new Promise(r=>s.time.delayedCall(ms,r));
  });
  await page.waitForTimeout(150);
  return {page,errors};
}
try {
  for(const arena of ['open-yard','vertical-run','square-coop']) {
    const {page,errors}=await open(arena);
    const catalog=await page.evaluate(()=>{
      const s=window.__s,before=JSON.stringify(s.rng.getState()),first=s.waveSystem.getWaveCatalog();
      const stable=JSON.stringify(first)===JSON.stringify(s.waveSystem.getWaveCatalog());
      const unchangedRng=before===JSON.stringify(s.rng.getState());
      const queues=s.waveSystem.waves.map(w=>s.waveSystem.buildSpawnQueue(w).map(e=>({type:e.type,skin:e.variantSkin,extra:e.mapVarietyExtra,xp:e.xpOverride,ability:e.ability})));
      return {first,stable,unchangedRng,queues};
    });
    assert(catalog.stable&&catalog.unchangedRng);
    for(const [i,w] of catalog.first.entries()) {
      const base=WAVE_DEFINITIONS[i];assert.equal(w.queue.length,w.count);
      if(!base.bossWave)assert(Math.abs(w.allocatedXp-base.xpCurve.budget)<1e-7);
      else {assert.equal(w.count,1);assert.deepEqual(w.queue,['boss']);assert.equal(w.variety,null);}
    }
    // Exercise the actual director + wave lifecycle through all nine ordinary
    // waves. Remove spawned actors as a deterministic completion probe; separate
    // pacing tests below exercise real kills, movement and collected XP.
    const transitions=await page.evaluate(async()=>{
      const s=window.__s,w=s.waveSystem;window.__clear();w.start();
      const completed=[];
      while(w.currentWave<10) {
        const number=w.currentWave,expected=w.waves[number-1].count;let spawned=0,steps=0;
        while(w.currentWave===number&&steps++<400) {
          w.director.nextSpawnAt=s.time.now;
          w.update(s.time.now,s.enemies.length);
          if(w.currentWave===number){spawned=w.director.spawnedCount;window.__clear();}
          if(w.transitionPending)await window.__delay(30);
        }
        completed.push({number,expected,spawned,next:w.currentWave,steps});
        if(w.currentWave===number)throw new Error(`Stuck on wave ${number}`);
      }
      w.active=false;window.__clear();return completed;
    });
    assert.equal(transitions.length,9);
    for(const row of transitions){assert.equal(row.spawned,row.expected);assert.equal(row.next,row.number+1);}
    assert.deepEqual(errors,[]);reports.push({arena,catalog,transitions});await page.close();
    console.log(`${arena}: catalog, XP totals, seeded read stability and nine wave transitions passed`);
  }

  const {page,errors}=await open('open-yard');
  const mechanics=await page.evaluate(async()=>{
    const s=window.__s,p=s.player.sprite,delay=window.__delay;
    const origin={x:p.x,y:p.y},rows=[];
    const spawn=(kind,x,y)=>s.entities.spawnEnemyAt({...s.waveSystem.makeEnemyFromSpec({kind}),hp:999999,damage:0,xpOverride:0},x,y);
    let e=spawn('map-rammer',p.x-340,p.y);e.nextAbilityAt=0;
    await delay(150);rows.push({test:'rammer-range',ok:!e.abilityCharging});
    e.sprite.body.reset(p.x-180,p.y);e.nextAbilityAt=0;await delay(70);
    rows.push({test:'rammer-warning',ok:e.abilityCharging&&Math.abs(e.sprite.body.velocity.x)<1});
    const angle=e.abilityAimAngle,position={x:e.sprite.x,y:e.sprite.y};
    p.body.reset(p.x,p.y-105);await delay(200);
    rows.push({test:'warning-stops-and-locks-aim',ok:Math.hypot(e.sprite.x-position.x,e.sprite.y-position.y)<1&&e.abilityAimAngle===angle});
    s.gamePause.request('map-variety-test');window.__pausedEnemy=e;
    return {rows,angle,clock:s.time.now,telegraphs:s.combatFeedback.activeTelegraphs};
  });
  await page.waitForTimeout(240);
  const frozen=await page.evaluate(()=>({clock:window.__s.time.now,charging:window.__pausedEnemy.abilityCharging,telegraphs:window.__s.combatFeedback.activeTelegraphs}));
  assert.equal(frozen.clock,mechanics.clock);assert(frozen.charging);assert.equal(frozen.telegraphs,mechanics.telegraphs);
  await page.evaluate(()=>window.__s.gamePause.release('map-variety-test'));
  await page.waitForFunction(()=>window.__pausedEnemy.dashUntil>window.__s.time.now);
  const dash=await page.evaluate(()=>({angle:window.__pausedEnemy.dashVelocity.angle(),speed:window.__pausedEnemy.dashVelocity.length(),state:window.__pausedEnemy.getAnimationState()}));
  assert(Math.abs(dash.angle-mechanics.angle)<.01);assert.equal(dash.speed,400);assert.equal(dash.state,'resolve');
  const recovery=await page.evaluate(async()=>{const s=window.__s,e=window.__pausedEnemy;await window.__delay(Math.max(0,e.dashUntil-s.time.now)+100);return {state:e.getAnimationState(),speed:e.sprite.body.velocity.length()};});
  assert.equal(recovery.state,'recovery');assert(recovery.speed<1);
  const rest=await page.evaluate(async()=>{
    const s=window.__s,p=s.player.sprite,delay=window.__delay,rows=[];window.__clear();
    const spawn=(kind,x,y)=>s.entities.spawnEnemyAt({...s.waveSystem.makeEnemyFromSpec({kind}),hp:999999,damage:0,xpOverride:0},x,y);
    let e=spawn('map-stomper',p.x-250,p.y);e.nextAbilityAt=0;await delay(150);
    rows.push({test:'stomp-range',ok:!e.abilityCharging});
    e.sprite.body.reset(p.x-60,p.y);e.nextAbilityAt=0;await delay(80);
    rows.push({test:'stomp-warning',ok:e.abilityCharging&&e.sprite.body.velocity.length()<1});
    const hp=s.player.hp;p.body.reset(e.sprite.x+160,e.sprite.y);await delay(800);
    rows.push({test:'stomp-dodge',ok:s.player.hp===hp});
    e.nextAbilityAt=Infinity;e.speed=0;p.body.reset(e.sprite.x+45,e.sprite.y);s.player.invulnerableUntil=0;
    const hitHp=s.player.hp;s.enemyAttacks.performSlam(e,s.player,e.ability);
    rows.push({test:'stomp-damage',ok:hitHp-s.player.hp===12});
    s.player.invulnerableUntil=0;p.body.reset(e.sprite.x,e.sprite.y+65);
    const outsideHp=s.player.hp;s.enemyAttacks.performSlam(e,s.player,e.ability);
    rows.push({test:'stomp-matches-projected-warning',ok:s.player.hp===outsideHp});
    window.__clear();await delay(700);
    const listeners=s.events.listenerCount('postupdate');
    for(let i=0;i<6;i++) {
      const old=spawn('map-rammer',p.x-170,p.y);old.nextAbilityAt=0;await delay(70);
      const activation=old.activationId;window.__clear();
      const reused=spawn('map-rammer',p.x-170,p.y);reused.nextAbilityAt=Infinity;reused.speed=0;
      rows.push({test:`pool-reuse-${i}`,ok:reused===old&&reused.activationId!==activation});
      await delay(50);
      rows.push({test:`cancelled-danger-zone-${i}`,ok:!s.enemyDangerZones.some(zone=>zone.source==='telegraph:map-rammer:dash'&&zone.expiresAt>s.time.now)});
      await delay(760);
      rows.push({test:`cancelled-cast-${i}`,ok:reused.dashUntil<s.time.now&&!reused.abilityCharging});window.__clear();
    }
    await delay(600);
    rows.push({test:'effect-cleanup',ok:s.events.listenerCount('postupdate')===listeners&&s.combatFeedback.activeTelegraphs===0});
    return rows;
  });
  for(const row of [...mechanics.rows,...rest])assert(row.ok,row.test);
  assert.deepEqual(errors,[]);reports.push({mechanics:{...mechanics,frozen,dash,recovery,rest}});await page.close();
  console.log('Abilities: range, 700ms tell, locked dash, pause, recovery, projected stomp hit/miss, death/reuse and effect cleanup passed');

  for(const renderer of ['WEBGL','CANVAS'])for(const arena of ['open-yard','vertical-run','square-coop']) {
    const portrait=renderer==='CANVAS';const {page,errors}=await open(arena,renderer,portrait);
    const art=await page.evaluate(async()=>{
      const s=window.__s,p=s.player.sprite;window.__clear();
      const small=s.scale.width/s.cameras.main.zoom<700,dx=small?72:140;
      const variants=[
        {kind:'map-rammer',x:-dx,y:-30},{kind:'map-stomper',x:dx,y:-30},
        {kind:'kornkrabbler',skin:'alley',x:-dx,y:75},{kind:'kornkrabbler',skin:'coop',x:dx,y:75},
        {kind:'kornkrabbler',skin:'alley',x:-dx*.4,y:110},{kind:'kornkrabbler',skin:'coop',x:dx*.4,y:110}
      ].map(({x,y,...spec})=>{
        const e=s.entities.spawnEnemyAt({...s.waveSystem.makeEnemyFromSpec(spec),speed:0,damage:0,hp:99999},p.x+x,p.y+y);
        e.nextAbilityAt=Infinity;return e;
      });
      window.__variants=variants;
      await window.__delay(200);
      return variants.map(e=>({type:e.type,texture:e.sprite.texture.key,scaleX:e.sprite.scaleX,scaleY:e.sprite.scaleY,frameWidth:e.sprite.frame.realWidth,origin:e.sprite.originX,bodyWidth:e.sprite.body.width}));
    });
    for(const row of art){assert.equal(row.scaleX,row.scaleY);assert.equal(row.frameWidth,256);assert.equal(row.origin,.5);assert(row.bodyWidth>0);}
    await page.screenshot({path:path.join(folder,`${arena}-${renderer}-native.png`)});
    await page.evaluate(()=>{
      const s=window.__s,[rammer,stomper]=window.__variants;
      s.enemyAttacks.beginAbility(rammer,s.player);
      // Place the player in the real small stomp trigger area, then let the
      // production windup/action animation and damage routines run normally.
      s.player.sprite.body.reset(stomper.sprite.x-55,stomper.sprite.y);
      s.enemyAttacks.beginAbility(stomper,s.player);
    });
    await page.waitForTimeout(350);await page.screenshot({path:path.join(folder,`${arena}-${renderer}-warning.png`)});
    await page.waitForTimeout(430);await page.screenshot({path:path.join(folder,`${arena}-${renderer}-impact.png`)});
    assert.deepEqual(errors,[]);reports.push({arena,renderer,portrait,art,errors});await page.close();
    console.log(`${arena}/${renderer}: actual-game native art, warning and impact captured`);
  }
  await fs.writeFile(path.join(folder,'integration-report.json'),JSON.stringify({generatedAt:new Date().toISOString(),status:'passed',reports},null,2)+'\n');
}catch(error){
  await fs.writeFile(path.join(folder,'integration-failure.json'),JSON.stringify({error:String(error.stack),reports},null,2)+'\n');
  throw error;
}finally{await browser.close();await stopTestServer(server.server);}
