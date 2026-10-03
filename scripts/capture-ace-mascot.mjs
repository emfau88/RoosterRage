import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'docs/qa/ace-mascot-v1');
const distributions={before:path.join(root,'test-results/ace-mascot-v1/before-release'),after:path.join(root,'dist-release')};
const save=JSON.parse(await fs.readFile(path.join(root,'docs/qa/portal-package-0/advanced-save.json'),'utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
  try {
    const [,version,...segments]=new URL(req.url,'http://localhost').pathname.split('/');
    if(!distributions[version]) {res.writeHead(404).end();return;}
    const file=path.resolve(distributions[version],segments.join('/')||'index.html');
    if(path.relative(distributions[version],file).startsWith('..')) {res.writeHead(403).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await fs.readFile(file));
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
const report={baselineCommit:'124f853',renderer:'production-webgl',cases:[],animationChecks:[]};
const requestedAssets=new WeakMap();

async function open(version,arena,viewport,video=false) {
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:viewport.width<900,
    ...(video?{recordVideo:{dir:path.join(root,'test-results/ace-mascot-v1/video'),size:viewport}}:{})});
  await context.addInitScript(state=>{
    localStorage.setItem('rooster-rage:meta:v2',JSON.stringify(state));
    let phaser;
    // Observation hook lives only in the test context, never the shipped app.
    Object.defineProperty(window,'Phaser',{configurable:true,get:()=>phaser,set(value){
      phaser=value;const boot=value.Game.prototype.boot;
      value.Game.prototype.boot=function(...args){window.__aceReviewGame=this;return boot.apply(this,args);};
    }});
  },save);
  const page=await context.newPage(),errors=[];
  const assets=[];requestedAssets.set(page,assets);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{
    if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);
    const file=new URL(r.url()).pathname.split('/').pop();
    if(/^rooster-(ace|artillery|storm)-(final|mascot)-(idle|walk)-.*\.webp$/.test(file)) assets.push(file);
  });
  await page.goto(`${url}/${version}/?arena=${arena}&seed=ace-mascot-review`);
  await page.waitForSelector('.henhouse-panel');
  await page.waitForFunction(()=>document.body.dataset.roosterLoadState==='ready');
  await page.locator('[data-hub-tab="roosters"]').click();
  await page.locator('.rooster-card--ace + .rooster-card__choose').click();
  await page.locator('[data-run-start]').click();
  await page.waitForFunction(()=>!document.querySelector('.overlay')?.classList.contains('is-visible'));
  assert.equal(await page.evaluate(()=>Boolean(window.__ROOSTER_TEST__)),false);
  await page.evaluate(()=>{
    const s=window.__aceReviewGame.scene.getScene('GameScene');
    const style=document.createElement('style');style.textContent='*{transition:none!important;animation:none!important}';document.head.append(style);
    s.waveSystem.paused=true;s.gamePause.request('ace-review');
    for(const list of ['enemies','projectiles','xpOrbs','hazardZones','enemyProjectiles']) {s[list]?.forEach(x=>x.destroy());s[list]=[];}
    const {x,y}=s.arena.getCenter();
    s.player.sprite.setPosition(x,y);s.player.sprite.body.reset(x,y);
    s.player.sprite.setTexture('rooster-ace-idle',0).setFlipX(false).clearTint();
    // Start from the same neutral pose, outside any transient start-shot recoil.
    s.tweens.killTweensOf(s.player.sprite);
    s.player.sprite.setScale(s.player.baseScale).setAngle(0).setAlpha(1);
    s.player.sprite.body.updateFromGameObject();
    s.player.sprite.anims.stop();s.player.sprite.body.stop();s.player.invulnerableUntil=Infinity;
    s.cameras.main.stopFollow();s.cameras.main.centerOn(x,y);s.cameras.main.preRender();
    s.arena.update(true);s.player.updateGroundMarker();
    document.querySelectorAll('.wave-banner,.upgrade-confirmation,.multi-kill,.joystick').forEach(e=>e.style.display='none');
  });
  return {context,page,errors};
}
async function snapshot(page) {
  const state=await page.evaluate(()=>{
    const s=window.__aceReviewGame.scene.getScene('GameScene'),p=s.player,sp=p.sprite,b=sp.body;
    return {zoom:s.cameras.main.zoom,scale:[sp.scaleX,sp.scaleY],origin:[sp.originX,sp.originY],
      player:[sp.x,sp.y],body:{radius:b.radius,width:b.width,height:b.height,offset:[b.offset.x,b.offset.y]},
      stats:{speed:p.speed,fireRate:p.fireRate,damage:p.projectileDamage,maxHp:p.maxHp},
      arena:s.arena.id,obstacles:s.arena.obstacles.filter(o=>o.sprite.active).map(o=>({id:o.id,x:o.x,y:o.y,width:o.width,height:o.height,kind:o.kind})),
      textureSizes:['ace','artillery','storm'].map(id=>({id,...Object.fromEntries(['idle','walk'].map(mode=>{const img=s.textures.get(`rooster-${id}-${mode}`).getSourceImage();return [mode,[img.width,img.height]];}))}))};
  });
  state.assets=['ace','artillery','storm'].map(id=>({id,...Object.fromEntries(['idle','walk'].map(mode=>[mode,requestedAssets.get(page).find(file=>new RegExp(`^rooster-${id}-(final|mascot)-${mode}-`).test(file))]))}));
  return state;
}
async function dense(page) {
  await page.evaluate(()=>{
    const s=window.__aceReviewGame.scene.getScene('GameScene'),p=s.player.sprite;
    const kinds=['makeKornkrabbler','makeRunner','makeSlime','makeBrute','makeSpitter'];
    for(let i=0;i<32;i++) {
      const a=i*Math.PI*2/32,d=80+(i%4)*43;
      const e=s.entities.spawnEnemyAt({...s.waveSystem[kinds[i%5]](),speed:0,damage:0,hp:999},p.x+Math.cos(a)*d,p.y+Math.sin(a)*d);
      e.sprite.anims.stop();e.sprite.setFrame(0);e.sprite.body.stop();
    }
  });
}
async function shot(page,name) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(output,`${name}.png`)});
}
async function verifyAnimations(page) {
  const samples=[];
  for(const [direction,key] of [['south','s'],['west','a'],['east','d'],['north','w']]) {
    await page.evaluate(()=>{
      const s=window.__aceReviewGame.scene.getScene('GameScene');s.gamePause.release('ace-review');
      const {x,y}=s.arena.getCenter();s.player.sprite.body.reset(x,y);
    });
    await page.keyboard.down(key);await page.waitForTimeout(350);
    const walk=await page.evaluate(()=>{
      const s=window.__aceReviewGame.scene.getScene('GameScene'),p=s.player.sprite;
      return {key:p.anims.currentAnim?.key,frame:p.frame.name,flip:p.flipX,origin:[p.originX,p.originY],scale:[p.scaleX,p.scaleY]};
    });
    await page.keyboard.up(key);await page.waitForTimeout(450);
    const idle=await page.evaluate(()=>{
      const p=window.__aceReviewGame.scene.getScene('GameScene').player.sprite;
      return {key:p.anims.currentAnim?.key,frame:p.frame.name,flip:p.flipX,origin:[p.originX,p.originY],scale:[p.scaleX,p.scaleY]};
    });
    assert.equal(walk.key,`rooster-ace-walk-${direction}`);assert.equal(idle.key,`rooster-ace-idle-${direction}`);
    assert.equal(walk.flip,direction==='east');assert.equal(idle.flip,direction==='east');
    assert.deepEqual(walk.origin,[0.5,0.5]);assert.deepEqual(idle.origin,walk.origin);assert.deepEqual(idle.scale,walk.scale);
    samples.push({direction,walk,idle});
  }
  return samples;
}

try {
  for(const arena of ['open-yard','vertical-run','square-coop']) for(const [view,viewport] of [
    ['desktop',{width:960,height:540}],['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]
  ]) {
    const name=`${arena}-${view}`,states={};
    for(const version of ['before','after']) {
      const video=version==='after'&&arena==='open-yard'&&view==='desktop';
      const {context,page,errors}=await open(version,arena,viewport,video);
      states[version]=await snapshot(page);
      assert.equal(states[version].assets.length,3);
      await shot(page,`${version}-${name}`);
      if(arena==='open-yard'&&view!=='landscape') {
        await dense(page);await shot(page,`${version}-dense-${view}`);
        await page.evaluate(()=>{const s=window.__aceReviewGame.scene.getScene('GameScene');s.enemies.forEach(e=>e.destroy());s.enemies=[];});
      }
      if(version==='after') report.animationChecks.push({arena,view,samples:await verifyAnimations(page)});
      assert.deepEqual(errors,[],`${version}-${name} browser errors`);
      const recording=page.video();await context.close();
      if(recording) await recording.saveAs(path.join(output,'ace-production-directions.webm'));
    }
    const withoutAssets=({assets,...rest})=>rest;
    assert.deepEqual(withoutAssets(states.after),withoutAssets(states.before),`Gameplay geometry/stats changed: ${name}`);
    assert.deepEqual(states.after.assets.slice(1),states.before.assets.slice(1),'Other rooster assets changed');
    assert.ok(states.after.assets[0].idle.includes('mascot')&&states.after.assets[0].walk.includes('mascot'));
    report.cases.push({name,viewport,...states,gameplayUnchanged:true});
    console.log(`Compared ${name}`);
  }
  await fs.writeFile(path.join(output,'runtime-checks.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({cases:report.cases.length,animationChecks:report.animationChecks.length*8,gameplayUnchanged:true}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
