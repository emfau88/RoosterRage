import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'docs/qa/portal-elites-v2');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),checks=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.wav':'audio/wav'};
try{
  for(const version of ['before','after']){
    const dist=path.join(root,version==='before'?'test-results/elite-variety/before-release':'dist-release');
    const server=http.createServer(async(req,res)=>{try{
      const file=path.resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname.replace(/^\/$/,'/index.html')));
      if(path.relative(dist,file).startsWith('..')){res.writeHead(403).end();return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'});res.end(await fs.readFile(file));
    }catch{res.writeHead(404).end();}});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
      const page=await browser.newPage({viewport}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
      await page.addInitScript(()=>{let phaser;Object.defineProperty(window,'Phaser',{configurable:true,get:()=>phaser,set(v){
        phaser=v;const boot=v.Game.prototype.boot;v.Game.prototype.boot=function(...a){window.__eliteGame=this;return boot.apply(this,a);};
      }});});
      await page.goto(`http://127.0.0.1:${server.address().port}/?seed=elite-compare&arena=square-coop`);
      await page.locator('[data-run-start]').click();
      const configs=await page.evaluate(()=>{
        const s=window.__eliteGame.scene.getScene('GameScene');s.lastShotAt=Infinity;
        s.waveSystem.pause?.();s.gamePause.request('capture',{freezeTime:false,freezeTweens:false});
        s.player.sprite.body.reset(700,450);s.cameras.main.centerOn(700,450);s.hud.combatMessages.clear();
        s.enemies.forEach(e=>e.destroy());s.enemies=[];
        const configs=[s.waveSystem.makeEliteRunner(),s.waveSystem.makeEliteBrute(),s.waveSystem.makeEliteSpitter()];
        configs.forEach((config,i)=>{const e=s.entities.spawnEnemyAt({...config,ability:null,aura:null},625+i*75,535);e.sprite.setVelocity(0,0);
          e.facing='left';e.updateDirectionalAnimation({x:-1,y:0});});
        return configs.slice(1).map(c=>{const {label,...ability}=c.ability;return {type:c.type,hp:c.hp,speed:c.speed,damage:c.damage,xp:c.xp,
          scale:c.scale,radius:c.radius,bodyOffsetX:c.bodyOffsetX,bodyOffsetY:c.bodyOffsetY,aura:c.aura,ability};});
      });
      await page.waitForTimeout(300);await page.screenshot({path:path.join(out,`game-${viewport.width}-${version}.png`)});
      checks.push({version,viewport,configs,errors});assert.deepEqual(errors,[]);await page.close();
    }}finally{await new Promise(r=>server.close(r));}
  }
  assert.deepEqual(checks[0].configs,checks[2].configs,'Elite damage, collision, aura or attack parameters changed');
  await fs.writeFile(path.join(out,'release-checks.json'),JSON.stringify(checks,null,2));
  console.log('Elite comparison captured in two release builds; numeric combat parameters identical.');
}finally{await browser.close();}
