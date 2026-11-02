import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ensureTestServer, loadPlaywright, stopTestServer } from './helpers/test-runtime.mjs';

const server = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch();
const folder = 'test-results/approved-effects';
await fs.mkdir(folder, { recursive: true });
const reports = [];
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${m.text()} at ${m.location().url}`); });
    await page.addInitScript(renderer => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value; const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) {
          this.config.renderType = value[renderer]; window.__effectsGame = this;
          return boot.apply(this, args);
        };
      } });
    }, renderer);
    await page.goto(`${server.url}?arena=open-yard&seed=approved-effects&profile=manual`);
    await page.waitForFunction(() => window.__effectsGame?.scene.getScene('GameScene')?.player);
    await page.evaluate(() => {
      const s = window.__s = window.__effectsGame.scene.getScene('GameScene');
      s.chooseRooster('ace'); s.waveSystem.active = false; s.bot.enabled = false;
      s.lastShotAt = Infinity; s.player.maxHp = s.player.hp = 999999;
      for (const e of s.enemies) e.destroy(); s.enemies = [];
      window.__delay = ms => new Promise(resolve => s.time.delayedCall(ms, resolve));
    });
    const stages = [];
    for (let stage = 1; stage <= 5; stage++) {
      const result = await page.evaluate(async stage => {
        const s = window.__s;
        for (const e of s.enemies) e.destroy(); s.enemies = [];
        const radius = [82,100,118,132,158][stage-1], damage = [48,64,80,96,112][stage-1];
        const x = s.player.sprite.x + 300, y = s.player.sprite.y;
        // Keep the central probe away from the exact floating-point boundary
        // of the upper cluster (whose offset equals its damage radius).
        const targets = [[0,8], ...Array.from({length:3},(_,i)=>{
          const angle = i * Math.PI * 2 / 3 - Math.PI / 2;
          return [Math.cos(angle)*radius*.52,Math.sin(angle)*radius*.4];
        }), [radius+20,0]].map(([dx,dy]) => s.entities.spawnEnemyAt({ ...s.waveSystem.makeSlime(),
          hp:100000, damage:0, xp:0, speed:0, showHpBar:false }, x+dx,y+dy));
        const expected = targets.map(enemy => {
          const dx=enemy.sprite.x-x,dy=enemy.sprite.y-y;
          let hits = Math.hypot(dx,dy)<=radius ? damage : 0;
          if(stage===3||stage===4)for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3-Math.PI/2;
            if(Math.hypot(dx-Math.cos(a)*radius*.52,dy-Math.sin(a)*radius*.4)<=radius*.4)
              hits+=Math.round(damage*.24);
          }
          return hits;
        });
        const baseline = s.events.listenerCount('postupdate');
        s.rocketEgg.createExplosion(x,y,damage,radius,stage===5,Math.min(4,stage));
        const effect = [...s.rocketEgg.activeImpactVisuals].at(-1);
        await window.__delay(95);
        const first = effect.describe();
        s.gamePause.request('impact-pause');
        const held = JSON.stringify(effect.describe());
        await new Promise(resolve=>setTimeout(resolve,160));
        const pauseHeld = held===JSON.stringify(effect.describe());
        s.gamePause.release('impact-pause');
        await window.__delay(100);
        const second = effect.describe();
        const snapshots = Array.from({length:12},(_,i)=>{
          effect.draw((i+.25)/12*effect.bursts[0].duration);
          return effect.describe();
        });
        await window.__delay(effect.spec.duration+80);
        return {stage,first,second,pauseHeld,expected,actual:targets.map(e=>100000-e.hp),
          snapshots,remaining:s.rocketEgg.activeImpactVisuals.size,
          listeners:s.events.listenerCount('postupdate'),baseline,
          destroyed:!effect.active&&!effect.scene&&!effect.graphics.scene,
          frames:s.impactFrameChecks,error:s.debugStats.lastError};
      },stage);
      assert.deepEqual(result.actual,result.expected,`${renderer} stage ${stage}: damage changed`);
      assert(result.pauseHeld && result.second.age > result.first.age);
      assert.equal(new Set(result.snapshots.flatMap(s=>s.visibleFrames.slice(0,1))).size,12);
      assert(result.snapshots.flatMap(s=>s.volumeScales).every(s=>s.x===s.y),'Squashed volume');
      assert(result.frames.length===24 && result.frames.every(f=>f.sourceUnclipped&&f.normalizedUnclipped),'Cropped frame');
      assert(result.destroyed && result.remaining===0 && result.listeners===result.baseline,'Impact leaked');
      assert.equal(result.error,null);
      stages.push(result);
    }

    // Inspect the production effect in the real scene, at native figure scale.
    await page.evaluate(() => {
      const s=window.__s;
      for(const e of s.enemies)e.destroy();s.enemies=[];
      for(const o of s.arena.obstacles)o.sprite.setVisible(false);
      s.cameras.main.stopFollow();s.cameras.main.removeBounds();
      s.cameras.main.setZoom(s.game.roosterDisplay?.renderScale??1);
      const c={x:s.player.sprite.x,y:s.player.sprite.y};s.cameras.main.centerOn(c.x,c.y);
      s.player.sprite.setVisible(false);s.player.groundMarker.setVisible(false);
      const points=[[240,340],[720,340],[1200,340],[390,760],[1030,760]];
      window.__reviewEffects=points.map(([px,py],i)=>{
        const x=c.x+px-720,y=c.y+py-475;
        const e=s.entities.spawnEnemyAt({...s.waveSystem.makeSupport(),aura:null,ability:null,speed:0,showHpBar:false},x-170,y);
        e.sprite.setY(y-e.sprite.displayHeight*.28).stop().setFrame(0);
        s.rocketEgg.createExplosion(x,y,0,[82,100,118,132,158][i],i===4,Math.min(i+1,4));
        s.add.text(x,y+115,['R1','R2','R3','R4','EVO'][i],{fontSize:'24px',color:'#fff2cb',backgroundColor:'#152019'}).setOrigin(.5).setDepth(30);
        return [...s.rocketEgg.activeImpactVisuals].at(-1);
      });
      s.gamePause.request('visual-review');
      const style=document.createElement('style');style.textContent='body > :not(#game-root){display:none!important}';document.head.append(style);
    });
    for(const ms of [40,180,360,650,1100]){
      await page.evaluate(ms=>window.__reviewEffects.forEach(e=>e.draw(ms)),ms);
      await page.screenshot({path:`${folder}/impacts-${renderer}-${ms}.png`});
    }
    // Worst overlap: three EVO rockets at a single spot, 90 ms apart.
    await page.evaluate(()=>{
      const s=window.__s;
      for(const e of [...s.rocketEgg.activeImpactVisuals])e.destroy();
      for(const o of s.children.list)if(o.type==='Text')o.setVisible(false);
      const x=s.player.sprite.x,y=s.player.sprite.y;
      s.add.text(x,y+160,'EVO · 3 Einschläge / 90 ms Abstand',{fontSize:'24px',color:'#fff2cb',backgroundColor:'#152019'}).setOrigin(.5).setDepth(30);
      for(let i=0;i<3;i++)s.rocketEgg.createExplosion(x,y,0,158,true,4);
      window.__salvo=[...s.rocketEgg.activeImpactVisuals];
    });
    for(const ms of [230,430,800]){
      await page.evaluate(ms=>window.__salvo.forEach((e,i)=>e.draw(ms-i*90)),ms);
      await page.screenshot({path:`${folder}/salvo-${renderer}-${ms}.png`});
    }
    const cleanup=await page.evaluate(()=>{
      const s=window.__s;
      for(let i=0;i<20;i++)s.rocketEgg.createExplosion(s.player.sprite.x,s.player.sprite.y,0,158,true,4);
      window.__endEffects=[...s.rocketEgg.activeImpactVisuals];
      const count=window.__endEffects.length;s.gamePause.release('visual-review');s.scene.restart();return {count};
    });
    await page.waitForFunction(()=>window.__effectsGame.scene.getScene('GameScene')?.isChoosingRooster);
    assert.equal(cleanup.count,12);
    assert(await page.evaluate(()=>window.__endEffects.every(e=>!e.active&&!e.scene)),'Restart leaked effects');
    reports.push({renderer,stages,cleanup,errors});
    await fs.writeFile(`${folder}/verification.json`,JSON.stringify(reports,null,2));
    assert.deepEqual(errors,[]);
    console.log(`${renderer}: all 5 impacts, 24 uncropped frames, uniform scales, exact damage/cluster timing, pause, budget and restart cleanup passed.`);
    await page.close();
  }
  await fs.writeFile(`${folder}/verification.json`,JSON.stringify(reports,null,2));
} finally { await browser.close(); await stopTestServer(server.server); }
