import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureTestServer, stopTestServer, loadPlaywright, projectRoot } from './helpers/test-runtime.mjs';
const { chromium } = loadPlaywright();
const {server,url}=await ensureTestServer();
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:960,height:720}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{
  let phaser;Object.defineProperty(window,'Phaser',{configurable:true,get:()=>phaser,set(value){
    phaser=value;const boot=value.Game.prototype.boot;value.Game.prototype.boot=function(...args){window.__eliteGame=this;return boot.apply(this,args);};
  }});
});
const rows=[];
try {
  await page.goto(`${url}?seed=portal-elites&arena=square-coop`);
  await page.waitForFunction(()=>window.__ROOSTER_TEST__?.getEnemySnapshot&&window.__eliteGame);
  await page.evaluate(()=>{
    const api=window.__ROOSTER_TEST__;api.selectRooster('ace');api.disableBot();api.pauseWaves();api.clearEnemies();api.clearProjectiles();
    api.setPlayerCombatModifiers({maxHp:9999,projectileDamage:1,fireRate:999999});api.setPlayerHp(9999);
    window.__eliteGame.scene.getScene('GameScene').lastShotAt=Infinity;
  });
  for(const type of ['elite-brute','elite-spitter','champion-spitter']){
    for(const [direction,dx,dy] of [['left',-230,0],['right',230,0],['up',0,-230],['down',0,230]]){
      const prefix=type==='champion-spitter'?'enemy-elite-spitter':`enemy-${type}`;
      await page.evaluate(({type,dx,dy})=>{
        const api=window.__ROOSTER_TEST__;api.clearEnemies();api.clearProjectiles();api.movePlayer(700+dx,450+dy);
        api.spawnEnemyType(type,700,450,{speed:0,hp:99999,ability:null});
        const s=window.__eliteGame.scene.getScene('GameScene');window.__testedElite=s.enemies.find(e=>e.type===type&&e.sprite.active);
      },{type,dx,dy});
      await page.waitForTimeout(80);
      const move=await page.evaluate(()=>({key:window.__testedElite.sprite.anims.currentAnim.key,state:window.__testedElite.animationState}));
      assert.equal(move.key,`${prefix}-run-${direction}`);assert.equal(move.state,'move');
      await page.evaluate(type=>{
        const s=window.__eliteGame.scene.getScene('GameScene'),e=window.__testedElite;
        const c=s.waveSystem.makeEnemyFromSpec({kind:type});
        e.speed=c.speed;e.ability={...c.ability,cooldown:999999};e.nextAbilityAt=s.time.now+50;
        window.__eliteSamples=[];
        window.__eliteSampler=()=>{
          window.__eliteSamples.push({state:e.animationState,key:e.sprite.anims.currentAnim?.key,frame:e.sprite.frame.name,
            velocity:Math.hypot(e.sprite.body.velocity.x,e.sprite.body.velocity.y),time:s.time.now,paused:s.gamePause.isPaused});
        };s.events.on('postupdate',window.__eliteSampler);
      },type);
      await page.waitForFunction(()=>window.__testedElite.animationState==='windup');
      const paused=await page.evaluate(()=>{
        const s=window.__eliteGame.scene.getScene('GameScene'),e=window.__testedElite;s.gamePause.request('elite-animation-check');
        return {time:s.time.now,frame:e.sprite.frame.name,x:e.sprite.x,y:e.sprite.y,hp:s.player.hp};
      });
      await page.waitForTimeout(250);
      assert.deepEqual(await page.evaluate(()=>{
        const s=window.__eliteGame.scene.getScene('GameScene'),e=window.__testedElite;
        return {time:s.time.now,frame:e.sprite.frame.name,x:e.sprite.x,y:e.sprite.y,hp:s.player.hp};
      }),paused,'Pause advanced an elite pose, attack clock or position');
      await page.evaluate(()=>window.__eliteGame.scene.getScene('GameScene').gamePause.release('elite-animation-check'));
      await page.waitForFunction(()=>window.__testedElite.animationState==='recovery');
      await page.waitForFunction(()=>window.__testedElite.animationState==='move');
      const result=await page.evaluate(()=>{
        const s=window.__eliteGame.scene.getScene('GameScene'),e=window.__testedElite;s.events.off('postupdate',window.__eliteSampler);
        const source=e.type==='champion-spitter'?'champion-spitter-shot':'elite-spitter-shot';
        return {samples:window.__eliteSamples,projectiles:s.enemyProjectiles.filter(p=>p.sprite.active&&p.source===source).length,
          events:s.telemetry.events.filter(event=>event.enemyType===e.type&&['enemyAbilityFired','enemyTelegraphShown'].includes(event.type))};
      });
      for(const state of ['windup','resolve','recovery']){
        const samples=result.samples.filter(s=>s.state===state);assert(samples.length,`${type} skipped ${state}`);
        assert(samples.every(s=>s.key===`${prefix}-${state}-${direction}`),`${type} changed facing during ${state}`);
        assert(new Set(samples.map(s=>s.frame)).size>=2,`${type} ${state} animation did not advance`);
        const settled=samples.filter(s=>!s.paused).slice(2);
        const limit=state==='windup'&&type==='elite-brute'?13.3:state==='recovery'
          ?type==='elite-brute'?23.2:type==='champion-spitter'?21.1:12.2:.1;
        assert(settled.every(s=>s.velocity<=limit),`${type} ignored its planted attack rhythm: ${state}, ${JSON.stringify(settled.map(s=>s.velocity))}`);
      }
      assert(result.events.some(e=>e.type==='enemyAbilityFired'),`${type} never fired`);
      if(type!=='elite-brute')assert.equal(result.projectiles,5,'Chili volley changed its projectile count');
      rows.push({type,direction,paused,states:Object.fromEntries(['windup','resolve','recovery'].map(state=>[state,
        {frames:[...new Set(result.samples.filter(s=>s.state===state).map(s=>s.frame))]}])),projectiles:result.projectiles});
    }
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(projectRoot,'test-results/portal-elites.json'),JSON.stringify({rows,errors},null,2));
  console.log('Portal elites passed: two elites and Chili champion × four directions; movement → windup → impact → recovery, planted attack rhythm, frozen pause frames and five-shot volley.');
}finally{await browser.close();await stopTestServer(server);}
