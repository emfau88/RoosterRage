import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs/qa/portal-art-pass');
await fs.mkdir(output, { recursive: true });
const distributions = { before: path.join(root, 'test-results/portal-art-pass/before-release'), after: path.join(root, 'dist-release') };
const save = JSON.parse(await fs.readFile(path.join(root, 'docs/qa/portal-package-0/advanced-save.json'), 'utf8'));
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.mp3':'audio/mpeg' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const [,version,...segments] = pathname.split('/');
    if (!distributions[version]) { response.writeHead(404).end(); return; }
    const file = path.resolve(distributions[version], segments.join('/') || 'index.html');
    const relative = path.relative(distributions[version], file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403).end(); return; }
    const contents = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    response.end(contents);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const report = { baselineCommit:'65ffe0f17e771437e50c80fb2eb3d19834cccb9c', renderer:'production-webgl', cases:[], routes:[], sourceHashes:{} };

async function open(version, arena, viewport, rooster='ace') {
  const context = await browser.newContext({ viewport, deviceScaleFactor:1, hasTouch:viewport.width < 900 });
  await context.addInitScript(state => {
    localStorage.setItem('rooster-rage:meta:v2', JSON.stringify(state));
    let phaser;
    Object.defineProperty(window, 'Phaser', { configurable:true, get:() => phaser, set(value) {
      phaser=value; const boot=value.Game.prototype.boot;
      value.Game.prototype.boot=function(...args) { window.__artPassGame=this; return boot.apply(this,args); };
    } });
  }, save);
  const page = await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{ if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${url}/${version}/?seed=portal-art-identical&arena=${arena}`);
  await page.waitForSelector('.henhouse-panel');
  await page.waitForFunction(()=>document.body.dataset.roosterLoadState==='ready');
  await page.locator('[data-hub-tab="roosters"]').click();
  await page.locator(`.rooster-card--${rooster} + .rooster-card__choose`).click();
  await page.locator('[data-run-start]').click();
  await page.waitForFunction(()=>!document.querySelector('.overlay')?.classList.contains('is-visible'));
  await page.evaluate(()=>{
    const s=window.__artPassGame.scene.getScene('GameScene');
    s.gamePause.request('art-comparison'); s.waveSystem.paused=true;
    for(const list of ['enemies','projectiles','xpOrbs','hazardZones','enemyProjectiles']) {
      s[list]?.forEach(item=>item.destroy()); s[list]=[];
    }
    s.cameras.main.stopFollow();
    s.player.sprite.anims.stop(); s.player.sprite.setFrame(0); s.player.sprite.clearTint();
    s.player.sprite.body.stop(); s.player.invulnerableUntil=Infinity;
    s.arena.update(true); s.player.updateGroundMarker();
    s.hud.combatMessages?.clear?.();
    document.querySelectorAll('.wave-banner,.upgrade-confirmation,.multi-kill,.joystick').forEach(e=>e.style.display='none');
  });
  assert(!await page.evaluate(()=>Boolean(window.__ROOSTER_TEST__)), 'Development API shipped');
  return { context,page,errors };
}

async function position(page, x, y, { overview=false, props=false, combat=false }={}) {
  return page.evaluate(({x,y,overview,props,combat})=>{
    const s=window.__artPassGame.scene.getScene('GameScene');
    const center=s.arena.getCenter();
    const px=x??center.x, py=y??center.y;
    s.player.sprite.setPosition(px,py); s.player.sprite.body.reset(px,py);
    s.arena.update(true); s.player.updateGroundMarker();
    s.cameras.main.centerOn(px,py); s.cameras.main.preRender();
    if(overview) {
      document.querySelectorAll('.hud,.overlay,.wave-banner,.joystick').forEach(e=>e.style.display='none');
    }
    if(props) {
      s.arena.obstacles.forEach(obstacle=>s.arena.disableObstacle(obstacle));
      const items=[['crate',-150,-80,68,68],['bale',130,-70,118,52],['crate',120,120,68,68],['bale',-140,130,118,52]];
      for(const [kind,dx,dy,width,height] of items) s.arena.createObstacle({id:`fixture-${kind}-${dx}`,x:px+dx,y:py+dy,width,height,kind,hp:90});
    }
    if(combat) {
      const kinds=['makeKornkrabbler','makeRunner','makeSlime','makeBrute','makeSpitter'];
      for(let i=0;i<18;i++) {
        const angle=i*Math.PI*2/18, distance=100+(i%3)*55;
        const e=s.entities.spawnEnemyAt({...s.waveSystem[kinds[i%kinds.length]](), speed:0,damage:0,hp:999},px+Math.cos(angle)*distance,py+Math.sin(angle)*distance);
        e.sprite.anims.stop(); e.sprite.setFrame(0); e.sprite.body.stop();
      }
    }
    const obstacle=o=>({id:o.id,x:o.x,y:o.y,width:o.width,height:o.height,kind:o.kind,hp:o.hp,solid:!!o.solid,
      body:o.sprite.body?{width:o.sprite.body.width,height:o.sprite.body.height}:null});
    return { arena:s.arena.id, cameraZoom:s.cameras.main.zoom, baseScale:s.player.baseScale,radius:s.player.sprite.body.radius,
      player:{x:px,y:py}, bounds:s.arena.bounds, worldBounds:s.arena.worldBounds,
      obstacles:s.arena.obstacles.filter(o=>o.sprite.active).map(obstacle),
      chunks:s.arena.chunkRecords.map(c=>({key:c.key,x:c.chunkX,y:c.chunkY,ground:c.ground.texture.key,tint:c.ground.tintTopLeft})) };
  }, {x,y,...{overview,props,combat}});
}

async function screenshot(page,name) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(output,`${name}.png`)});
}

try {
  const fixtures=[];
  for(const arena of ['open-yard','vertical-run','square-coop']) {
    for(const viewport of [{width:960,height:540},{width:390,height:844}]) fixtures.push({arena,viewport,kind:'game'});
    fixtures.push({arena,viewport:{width:1400,height:900},kind:'overview'});
  }
  fixtures.push({arena:'open-yard',viewport:{width:960,height:540},kind:'props'});
  for(const rooster of ['ace','artillery','storm']) fixtures.push({arena:'open-yard',viewport:{width:960,height:540},kind:'combat',rooster});
  for(const fixture of fixtures) {
    const name=`${fixture.arena}-${fixture.kind}-${fixture.viewport.width}-${fixture.rooster??'ace'}`;
    const measurements={};
    for(const version of ['before','after']) {
      const {context,page,errors}=await open(version,fixture.arena,fixture.viewport,fixture.rooster);
      measurements[version]=await position(page,null,null,{overview:fixture.kind==='overview',props:fixture.kind==='props',combat:fixture.kind==='combat'});
      await screenshot(page,`${version}-${name}`);
      assert.deepEqual(errors,[],`${version} ${name} browser errors`);
      await context.close();
    }
    const geometry=state=>{const {chunks,...rest}=state;return {...rest,chunks:chunks.map(({ground,tint,...chunk})=>chunk)};};
    assert.deepEqual(geometry(measurements.after),geometry(measurements.before),`Geometry changed: ${name}`);
    report.cases.push({name,fixture,...measurements,geometryUnchanged:true});
    console.log(`Compared ${name}`);
  }
  for(const arena of ['open-yard','vertical-run']) {
    const route={arena,versions:{}};
    for(const version of ['before','after']) {
      const {context,page,errors}=await open(version,arena,{width:960,height:540});
      const initial=await position(page,null,null), steps=[];
      for(let step=0;step<6;step++) {
        const dx=arena==='open-yard'?step*420:0, dy=step*360;
        steps.push(await position(page,initial.player.x+dx,initial.player.y+dy));
        await screenshot(page,`${version}-${arena}-route-${step}`);
      }
      const returned=await position(page,initial.player.x,initial.player.y);
      assert.deepEqual(returned.chunks,initial.chunks, 'Ground variant changes on revisit');
      assert.deepEqual(errors,[], 'Streaming route browser errors');
      route.versions[version]={steps,returnStable:true};
      await context.close();
    }
    assert.deepEqual(route.versions.after.steps.map(({chunks,...rest})=>rest),route.versions.before.steps.map(({chunks,...rest})=>rest),'Route collision geometry changed');
    report.routes.push(route);
    console.log(`Compared route ${arena}`);
  }
  // Compare shared-rim pixels in the actual production-created canvas textures.
  const {context,page,errors}=await open('after','open-yard',{width:960,height:540});
  report.groundRims=await page.evaluate(()=>{
    const s=window.__artPassGame.scene.getScene('GameScene'), keys=['a','b','c'].map(v=>`portal-ground-farm-${v}`);
    const images=keys.map(key=>s.textures.get(key).getSourceImage());
    const data=images.map(image=>image.getContext('2d').getImageData(0,0,image.width,image.height).data);
    let differences=0;
    for(let y=0;y<700;y++) for(let x=0;x<700;x++) if(x<25||y<25||x>=675||y>=675) {
      const offset=(y*700+x)*4;
      for(let c=0;c<4;c++) if(data[0][offset+c]!==data[1][offset+c]||data[0][offset+c]!==data[2][offset+c]) differences++;
    }
    return {size:[700,700],sharedBorderPixels:25,differences,retainedRawGpuTextures: ['a','b','c'].filter(v=>s.textures.exists(`portal-ground-source-${v}`)).length,
      retainedOriginalGround:s.textures.exists('arena-ground-farm'),
      activeWMarkers:s.arena.obstacles.filter(o=>o.breakableMarker?.visible).length,
      extraFinalGpuBytes:3*700*700*4};
  });
  assert.equal(report.groundRims.differences,0,'Generated tiles do not share their seam rim');
  assert.equal(report.groundRims.retainedRawGpuTextures,0,'Raw source GPU textures were retained');
  assert.equal(report.groundRims.activeWMarkers,0,'Removed W markers are visible');
  assert.deepEqual(errors,[]);
  await context.close();
  for(const file of ['src/config/mapArt.js','src/systems/ArenaSystem.js','src/systems/assets/HarvestGroundVariants.js','src/systems/assets/ArenaRenderer.js','src/systems/assets/AssetLoader.js']) {
    report.sourceHashes[file]=crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
  }
  await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({cases:report.cases.length,routes:report.routes.length,geometryUnchanged:true,groundRims:report.groundRims}));
} finally {
  await browser.close(); await new Promise(resolve=>server.close(resolve));
}
