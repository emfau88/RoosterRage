import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureTestServer, loadPlaywright, stopTestServer, projectRoot } from './helpers/test-runtime.mjs';

const output=path.join(projectRoot,'test-results/combat-effects-integration');await fs.mkdir(output,{recursive:true});
const server=await ensureTestServer(),browser=await loadPlaywright().chromium.launch({headless:true,args:['--disable-features=NetworkChangeNotifierWin']});
const reports=[];
try {
  for(const renderer of ['WEBGL','CANVAS']) {
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.addInitScript(renderer=>{
      let phaser;Object.defineProperty(window,'Phaser',{configurable:true,get:()=>phaser,set(value){phaser=value;
        const boot=value.Game.prototype.boot;value.Game.prototype.boot=function(...args){this.config.renderType=value[renderer];window.__combatGame=this;return boot.apply(this,args);};}});
    },renderer);
    await page.goto(`${server.url}?seed=combat-integration&profile=manual&arena=open-yard`);
    await page.waitForFunction(()=>window.__combatGame?.scene.getScene('GameScene')?.player);
    const parity=await page.evaluate(async()=>{
      const s=window.__s=window.__combatGame.scene.getScene('GameScene');s.chooseRooster('ace');s.waveSystem.active=false;s.bot.enabled=false;s.lastShotAt=Infinity;
      s.enemies.forEach(e=>e.destroy());s.enemies=[];s.player.hp=s.player.maxHp=99999;
      window.__delay=ms=>new Promise(r=>s.time.delayedCall(ms,r));
      const [oldH,newH,oldL,newL,oldP,newP]=await Promise.all([
        import('/docs/qa/combat-effects-study/baseline/HazardZone.js'),import('/src/entities/HazardZone.js'),
        import('/docs/qa/combat-effects-study/baseline/LaserCombAbility.js'),import('/src/systems/abilities/LaserCombAbility.js'),
        import('/docs/qa/combat-effects-study/baseline/EnemyProjectile.js'),import('/src/entities/EnemyProjectile.js')
      ]);
      window.__classes={oldH:oldH.HazardZone,newH:newH.HazardZone,oldL:oldL.LaserCombAbility,newL:newL.LaserCombAbility,newP:newP.EnemyProjectile};
      const rows=[];
      for(const stage of [1,2,3,4,5]) {
        const rank=Math.min(4,stage),evolved=stage===5,r=evolved?136:[0,90,108,124,112][rank];
        const source={x:s.player.sprite.x+220,y:s.player.sprite.y};
        const runH=Class=>{
          const proxy=Object.create(s),hits=[],burns=[];proxy.time={now:0};
          proxy.enemies=[[0,0],[r-1,0],[r+1,0],[0,r-1],[0,r+1]].map(([x,y],id)=>({id,sprite:{active:true,x:source.x+x,y:source.y+y},applyBurn:(...args)=>burns.push([id,...args])}));
          proxy.damageEnemy=(enemy,damage,_x,_y,options)=>hits.push([proxy.time.now,enemy.id,damage,options.source]);
          const zone=new Class(proxy,source.x,source.y,rank,evolved);
          for(let now=16;now<=zone.maxLife+32;now+=16){proxy.time.now=now;zone.update(16);}
          const data={hits,burns,active:zone.active,radius:zone.radius,damage:zone.damage,tickMs:zone.tickMs,maxLife:zone.maxLife};zone.destroy();return data;
        };
        const previousH=runH(oldH.HazardZone),currentH=runH(newH.HazardZone);
        const targets=[[190,0],[300,31.9],[300,40.1],[800,0],[1300,0]];
        const runL=Class=>{
          const proxy=Object.create(s),hits=[];
          proxy.player={getMuzzlePosition:()=>source};proxy.playFx=()=>{};proxy.telemetry={addShot(){}};proxy.debugStats={specialShots:0};
          proxy.enemies=targets.map(([x,y],id)=>({id,sprite:{active:true,x:source.x+x,y:source.y+y}}));
          proxy.findNearestEnemy=()=>proxy.enemies[0];proxy.damageEnemy=(e,damage,_x,_y,options)=>hits.push([e.id,damage,options.source]);
          const laser=new Class(proxy);laser.rank=rank;laser.evolved=evolved;laser.activate(1000);return {laser,hits};
        };
        const previousL=runL(oldL.LaserCombAbility),currentL=runL(newL.LaserCombAbility);
        const beforeCharge=[previousL.hits.length,currentL.hits.length];
        await window.__delay(780);
        rows.push({stage,hazardEqual:JSON.stringify(previousH)===JSON.stringify(currentH),hazard:currentH,
          laserEqual:JSON.stringify(previousL.hits)===JSON.stringify(currentL.hits),laserHits:currentL.hits,beforeCharge,
          cooldownEqual:previousL.laser.nextAt===currentL.laser.nextAt,laserClean:currentL.laser.activeVisuals.size===0});
      }
      const proxy=Object.create(s);proxy.objectPools={release:item=>item.deactivate()};
      const previous=new oldP.EnemyProjectile(proxy),current=new newP.EnemyProjectile(proxy);
      const p={x:s.player.sprite.x-180,y:s.player.sprite.y-100};
      const config={texture:'boss-fireball',radius:19,speed:238,life:4200,damage:22,scale:1.55,pulse:true,heavy:true,tint:false};
      previous.reset(p.x,p.y,.4,config);current.reset(p.x,p.y,.4,config);
      const states=[];
      for(let step=0;step<20;step++) {
        previous.update(25);current.update(25);
        const snap=e=>({life:e.life,damage:e.damage,speed:e.speed,scale:e.sprite.scaleX,radius:e.sprite.body.radius,offsetX:e.sprite.body.offset.x,offsetY:e.sprite.body.offset.y,vx:e.sprite.body.velocity.x,vy:e.sprite.body.velocity.y});
        states.push(JSON.stringify(snap(previous))===JSON.stringify(snap(current)));
      }
      current.destroy({impact:true});current.reset(p.x,p.y,0,{texture:'enemy-shot'});
      const reuse=current.sprite.alpha===1&&current.fireballVisual===null;previous.dispose();current.dispose();
      await window.__delay(700);
      return {rows,fireballPhysicsUnchanged:states.every(Boolean),ordinaryProjectileReuse:reuse};
    });
    for(const row of parity.rows){assert(row.hazardEqual,`hazard R${row.stage}`);assert(row.laserEqual,`laser R${row.stage}`);assert(row.cooldownEqual&&row.laserClean);assert.deepEqual(row.beforeCharge,[0,0]);}
    assert(parity.fireballPhysicsUnchanged&&parity.ordinaryProjectileReuse);
    // All five field stages on actual ground, with player/enemy scale references.
    for(const stage of [1,2,3,4,5]) {
      await page.evaluate(stage=>{
        const s=window.__s,p=s.player.sprite;s.hazardZones.forEach(z=>z.destroy());s.hazardZones=[];
        s.enemies.forEach(e=>e.destroy());s.enemies=[];
        const rank=Math.min(4,stage),evolved=stage===5;
        s.molotovEgg.createImpact(p.x+175,p.y,rank,evolved);
        s.entities.spawnEnemyAt({...s.waveSystem.makeBrute(),hp:999999,speed:0,damage:0},p.x+320,p.y-30);
      },stage);
      await page.waitForTimeout(250);
      await page.screenshot({path:path.join(output,`molotov-${renderer}-${stage}.png`)});
    }
    await page.evaluate(()=>{
      const s=window.__s;s.laserComb.rank=4;s.laserComb.evolved=true;s.laserComb.activate(s.time.now);
    });
    await page.waitForTimeout(220);await page.screenshot({path:path.join(output,`laser-${renderer}.png`)});
    const collision=await page.evaluate(async()=>{
      const s=window.__s,p=s.player.sprite;const before=s.player.hp;s.player.invulnerableUntil=0;
      const shot=s.enemyAttacks.spawnBossFireball(p.x-230,p.y,0,{damage:22,muzzleDistance:0});
      window.__shot=shot;await window.__delay(240);
      return {before,visual:!!shot.fireballVisual,body:shot.sprite.body.radius};
    });
    assert(collision.visual);await page.screenshot({path:path.join(output,`boss-${renderer}-flight.png`)});
    await page.waitForFunction(()=>window.__shot.destroyed);
    const after=await page.evaluate(()=>window.__s.player.hp);assert.equal(collision.before-after,22);
    await page.waitForTimeout(70);await page.screenshot({path:path.join(output,`boss-${renderer}-impact.png`)});
    const pause=await page.evaluate(()=>{
      const s=window.__s;s.gamePause.request('combat-qa');return {clock:s.time.now,frames:s.hazardZones.flatMap(z=>z.heatSpots.map(f=>f.sprite.frame.name))};
    });
    await page.waitForTimeout(180);
    assert.deepEqual(await page.evaluate(()=>({clock:window.__s.time.now,frames:window.__s.hazardZones.flatMap(z=>z.heatSpots.map(f=>f.sprite.frame.name))})),pause);
    const oldRefs=await page.evaluate(()=>{
      const s=window.__s;window.__oldFields=[...s.hazardZones];window.__oldLasers=[...s.laserComb.activeVisuals];s.gamePause.release('combat-qa');s.scene.restart();return true;
    });
    await page.waitForFunction(()=>window.__combatGame.scene.getScene('GameScene')?.isChoosingRooster);
    assert(await page.evaluate(()=>window.__oldFields.every(z=>!z.active)&&window.__oldLasers.every(v=>!v.active)));
    assert.deepEqual(errors,[]);reports.push({renderer,parity,collision,after,pause:true,restart:true,errors});await page.close();
    console.log(`${renderer}: all 5 laser/Molotov ranks match archived damage/timing, fireball physics + real contact, pool reuse, pause, restart and visual captures passed`);
  }
  await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({status:'passed',reports},null,2)+'\n');
}finally{await browser.close();await stopTestServer(server.server);}
