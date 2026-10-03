import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'docs/qa/portal-feedback'); await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.wav':'audio/wav'};
const browser=await chromium.launch(); const checks=[];
try {
  for (const version of ['before','after']) {
    const dist=path.join(root,version==='before'?'test-results/portal-feedback-polish/before-release':'dist-release');
    const server=http.createServer(async(req,res)=>{
      try { const file=path.resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname.replace(/^\/$/,'/index.html')));
        if(path.relative(dist,file).startsWith('..')) {res.writeHead(403).end();return;}
        res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'});res.end(await fs.readFile(file));
      }catch{res.writeHead(404).end();}
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try {
      for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
        const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:viewport.width<500});
        await context.addInitScript(()=>{
          let phaser; Object.defineProperty(window,'Phaser',{configurable:true,get:()=>phaser,set(value){
            phaser=value;const boot=value.Game.prototype.boot;value.Game.prototype.boot=function(...a){window.__polishGame=this;return boot.apply(this,a);};
          }});
        });
        const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
        page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
        const shot=async(name)=>{await page.waitForTimeout(120);await page.screenshot({path:path.join(out,`${name}-${viewport.width}-${version}.png`)});};
        await page.goto(`http://127.0.0.1:${server.address().port}/?seed=feedback-compare&arena=square-coop`);
        await page.waitForSelector('[data-run-start]'); await page.locator('[data-hub-tab="roosters"]').click();
        await shot('portraits');
        await page.locator('[data-hub-tab="play"]').click();
        await page.locator('[data-run-start]').click();
        await page.evaluate(()=>{
          const s=window.__polishGame.scene.getScene('GameScene');s.gamePause.request('capture',{freezeTime:false,freezeTweens:false});
          s.player.sprite.body.reset(700,450);s.hud.combatMessages.clear();s.cameras.main.centerOn(700,450);
          for(const [i,k] of ['heal','bomb','magnet'].entries())s.pickups.spawn(k,625+i*75,530);
        });
        await shot('pickups');
        await page.evaluate(()=>{
          const s=window.__polishGame.scene.getScene('GameScene');
          for(const [i,config] of [s.waveSystem.makeEliteRunner(),s.waveSystem.makeChampionCharger()].entries()){
            const e=s.spawnEnemy(config);e.sprite.body.reset(630+i*140,355);e.update(s.player);
          }
        });
        await shot('elite');
        await page.evaluate(()=>{
          const s=window.__polishGame.scene.getScene('GameScene');
          const prop=s.arena.obstacles.find(o=>o.destructible&&o.sprite.active&&o.kind==='crate');
          s.cameras.main.centerOn(prop.sprite.x,prop.sprite.y);s.hud.combatMessages.clear();
          s.arena.damageObstacle(prop,prop.maxHp,'primary:artillery');
        });
        await shot('destruction');
        await page.evaluate(()=>{
          const s=window.__polishGame.scene.getScene('GameScene');
          const offers=['critical-yolk','ricochet-eggs','second-wind'].map(id=>s.upgradeSystem.presentUpgrade(s.upgradeSystem.upgrades.find(u=>u.id===id),s.player));
          s.hud.showUpgradeChoices(offers,{type:'level'});
        });
        await shot('icons');
        await page.evaluate(()=>{const s=window.__polishGame.scene.getScene('GameScene');s.hud.showUpgradeChoices(s.upgradeSystem.getRewardChoices(4,s.player,'boss'),{type:'chest',kind:'boss'});});
        await shot('reward');
        await page.evaluate(()=>{
          const s=window.__polishGame.scene.getScene('GameScene');const report=s.runState.getRunReport();
          Object.assign(report,{kills:127,elapsedMs:245000,hits:98,shots:145,maxEnemiesAlive:43,deathCause:'elite-runner',
            metaReward:{earnedKernels:35,runKernels:20,firstClearKernels:10,masteryKernels:5,balance:110,masteryLevel:2,masteryXp:65},
            newUnlocks:[{type:'mastery',id:'ace-mastery-2',level:2}]});
          s.hud.showEndScreen('Run complete','Your rewards are ready.',report);
        });
        await page.waitForTimeout(900);
        await shot('result');
        if(version==='after') {
          assert.equal(await page.locator('.run-report__details').getAttribute('open'),null);
          assert(await page.locator('.run-report__meta-reward').isVisible());
          await page.locator('.run-report__details summary').click();
          assert(await page.locator('.run-report__table-wrap').isVisible());
        }
        const elites=await page.evaluate(()=>{const w=window.__polishGame.scene.getScene('GameScene').waveSystem;
          return [w.makeEliteRunner(),w.makeChampionCharger()].map(c=>Object.fromEntries(['type','hp','speed','damage','xp','scale','radius','bodyOffsetX','bodyOffsetY'].map(k=>[k,c[k]]).concat([
            ['dash',[c.ability.cooldown,c.ability.telegraphMs,c.ability.speed,c.ability.duration]],
            ['aura',c.aura? [c.aura.radius,c.aura.multiplier]:null]])));});
        checks.push({version,viewport,errors,elites});assert.deepEqual(errors,[]);
        await context.close();
      }
    } finally {await new Promise(r=>server.close(r));}
  }
  await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(checks,null,2));
  assert.deepEqual(checks[0].elites,checks[2].elites,'Elite mechanics changed with the art pass');
  console.log('Matched release screenshots captured, desktop and portrait.');
} finally {await browser.close();}
