import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ensureTestServer, loadPlaywright, projectRoot, stopTestServer } from './helpers/test-runtime.mjs';

const { chromium } = loadPlaywright();
const server = await ensureTestServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  let phaser;
  Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
    phaser = value;
    const boot = value.Game.prototype.boot;
    value.Game.prototype.boot = function(...args) { window.__pickupGame = this; return boot.apply(this, args); };
  } });
});
const rows = [];
const expectedRadii = { heal: 15, bomb: 11, magnet: 15 };
try {
  await page.goto(`${server.url}?seed=pickup-contact&arena=square-coop&profile=average`);
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getState && window.__pickupGame);
  await page.evaluate(() => {
    const api = window.__ROOSTER_TEST__;
    api.selectRooster('ace'); api.disableBot(); api.pauseWaves(); api.clearEnemies(); api.clearProjectiles();
  });
  for (const rooster of ['ace', 'storm', 'artillery']) {
    for (const kind of ['heal', 'bomb', 'magnet']) {
      for (const [key, dx, dy] of [['d',-105,0], ['a',105,0], ['s',0,-105], ['w',0,105]]) {
        const before = await page.evaluate(({rooster,kind,dx,dy}) => {
          const s = window.__pickupGame.scene.getScene('GameScene');
          s.roosterClasses.select(rooster); s.pickups.items.forEach(p => p.destroy()); s.pickups.items = [];
          s.pickups.spawned[kind] = 0; s.player.hp = s.player.maxHp * 0.4;
          s.player.updateGroundMarker();
          const footOffset = s.player.groundMarker.y - s.player.sprite.y;
          s.player.sprite.body.reset(700+dx,450+dy-footOffset);
          s.player.updateGroundMarker();
          const p = s.pickups.spawn(kind,700,450); window.__contactPickup = p;
          const b = p.sprite.body;
          return {collected:s.pickups.collected[kind], hp:s.player.hp, maxHp:s.player.maxHp,
            center:[b.center.x,b.center.y], anchor:[p.sprite.x,p.sprite.y], radius:b.halfWidth,
            ground:[p.field.x,p.field.y], footOffset, visualY:p.visual.y};
        }, {rooster,kind,dx,dy});
        assert(Math.hypot(before.center[0]-before.ground[0],before.center[1]-before.ground[1]) <= 1.5,
          'Pickup body is not centered on its ground field');
        assert.equal(before.radius, expectedRadii[kind], `${kind} contact radius changed`);
        await page.keyboard.down(key);
        await page.waitForFunction(({kind,n}) => window.__pickupGame.scene.getScene('GameScene').pickups.collected[kind] > n,
          {kind,n:before.collected}, {timeout:2500});
        await page.keyboard.up(key);
        await page.waitForTimeout(60);
        const after = await page.evaluate(kind => {
          const s=window.__pickupGame.scene.getScene('GameScene'),p=window.__contactPickup;
          const duplicate=s.pickups.collect(p);
          return {collected:s.pickups.collected[kind],hp:s.player.hp,duplicate,active:p.sprite.active,
            visualActive:p.visual.active,magnet:s.pickups.isMagnetActive(),title:s.hud.getUpgradeFeedbackState().title};
        },kind);
        assert.equal(after.collected,before.collected+1,'Pickup triggered more than once');
        assert.equal(after.duplicate,false); assert.equal(after.visualActive,false);
        if(kind==='heal') assert.equal(after.hp,Math.min(before.maxHp,before.hp+Math.max(12,Math.round(before.maxHp*.25))));
        if(kind==='magnet') assert(after.magnet);
        rows.push({rooster,kind,direction:key,before,after});
      }
    }
  }
  const passes = [];
  for (const { name: viewport, width, height, speed } of [
    { name: 'desktop', width: 960, height: 720, speed: 210 },
    { name: 'portrait-fast', width: 390, height: 844, speed: 560 }
  ]) {
    await page.setViewportSize({ width, height });
    for (const rooster of ['ace', 'storm', 'artillery']) {
      for (const kind of ['heal', 'bomb', 'magnet']) {
        for (const diagonal of [false, true]) {
          const missDistance = kind === 'bomb' ? 33 : 39;
          const offset = diagonal ? missDistance / Math.SQRT2 : 0;
          const startX = 620 + offset;
          const startY = diagonal ? 530 + offset : 450 + missDistance;
          const stopX = 780 + offset;
          const before = await page.evaluate(({ rooster, kind, speed, startX, startY }) => {
            const s = window.__pickupGame.scene.getScene('GameScene');
            s.roosterClasses.select(rooster);
            s.player.speed = speed;
            s.player.hp = s.player.maxHp * 0.4;
            s.pickups.items.forEach((pickup) => pickup.destroy());
            s.pickups.items = [];
            s.pickups.spawned[kind] = 0;
            s.player.updateGroundMarker();
            const footOffset = s.player.groundMarker.y - s.player.sprite.y;
            const pickup = s.pickups.spawn(kind, 700, 450);
            if (!pickup) throw new Error(`Could not spawn ${kind}`);
            s.player.sprite.body.updateFromGameObject();
            // These paths pass south of the item. Clear the body as well as
            // the lower foot marker so this remains a genuine near miss.
            const bodyOffset = s.player.sprite.body.center.y - s.player.sprite.y;
            s.player.sprite.body.reset(startX, startY + pickup.field.y - 450 - bodyOffset);
            s.player.updateGroundMarker();
            const body = s.player.sprite.body;
            return {
              collected: s.pickups.collected[kind],
              playerRadius: body.halfWidth,
              footOffset,
              bodyToFoot: s.player.groundMarker.y - body.center.y,
              pickupRadius: pickup.sprite.body.halfWidth,
              visualY: pickup.visual.y,
              anchorY: pickup.sprite.y
            };
          }, { rooster, kind, speed, startX, startY });
          assert.equal(before.pickupRadius, expectedRadii[kind]);
          assert(before.playerRadius > 13 && before.playerRadius < 17, 'Unexpected rooster collision footprint');
          assert(before.footOffset > 25 && before.footOffset < 40,
            `Player contact point left its foot anchor: ${JSON.stringify({ viewport, rooster, before })}`);
          await page.keyboard.down('d');
          if (diagonal) await page.keyboard.down('w');
          await page.waitForFunction((targetX) => window.__pickupGame.scene.getScene('GameScene').player.sprite.x >= targetX,
            stopX, { timeout: 3500 });
          await page.keyboard.up('d');
          if (diagonal) await page.keyboard.up('w');
          const after = await page.evaluate((kind) => {
            const s = window.__pickupGame.scene.getScene('GameScene');
            const pickup = s.pickups.items.find((item) => item.kind === kind);
            return {
              collected: s.pickups.collected[kind],
              active: pickup?.sprite.active ?? false,
              anchorY: pickup?.sprite.y,
              visualY: pickup?.visual.y
            };
          }, kind);
          assert.equal(after.collected, before.collected, `${kind} collected on a ${viewport} near miss`);
          assert(after.active, `${kind} disappeared on a near miss`);
          assert.equal(after.anchorY, before.anchorY, 'Physical ground anchor moved with bobbing art');
          passes.push({ viewport, rooster, kind, diagonal, missDistance, speed, before, after });
        }
        if (viewport === 'portrait-fast') {
          const before = await page.evaluate(({ rooster, kind, speed }) => {
            const s = window.__pickupGame.scene.getScene('GameScene');
            s.roosterClasses.select(rooster);
            s.player.speed = speed;
            s.player.hp = s.player.maxHp * 0.4;
            s.pickups.items.forEach((pickup) => pickup.destroy());
            s.pickups.items = [];
            s.pickups.spawned[kind] = 0;
            s.player.updateGroundMarker();
            const footOffset = s.player.groundMarker.y - s.player.sprite.y;
            s.player.sprite.body.reset(620, 450 - footOffset);
            s.player.updateGroundMarker();
            s.pickups.spawn(kind, 700, 450);
            return s.pickups.collected[kind];
          }, { rooster, kind, speed });
          await page.keyboard.down('d');
          await page.waitForFunction(({ kind, before }) =>
            window.__pickupGame.scene.getScene('GameScene').pickups.collected[kind] > before,
          { kind, before }, { timeout: 3000 });
          await page.keyboard.up('d');
          passes.push({ viewport, rooster, kind, intentionalFastContact: true });
        }
      }
    }
  }
  await page.setViewportSize({ width: 960, height: 720 });
  const fullHp = await page.evaluate(async () => {
    const s=window.__pickupGame.scene.getScene('GameScene'); s.pickups.spawned.heal=0;
    s.player.hp=s.player.maxHp; s.player.updateGroundMarker();
    const footOffset=s.player.groundMarker.y-s.player.sprite.y;
    s.player.sprite.body.reset(700,450-footOffset); s.player.updateGroundMarker();
    const p=s.pickups.spawn('heal',700,450);
    await new Promise(r=>setTimeout(r,180));
    const full={active:p.sprite.active,collected:s.pickups.collected.heal,title:s.hud.getUpgradeFeedbackState().title,
      anchor:[p.sprite.x,p.sprite.y],visualY:p.visual.y};
    s.gamePause.request('contact-test');
    const time=s.time.now; const y=p.visual.y;
    await new Promise(r=>setTimeout(r,150));
    const paused={time:s.time.now===time,visual:p.visual.y===y,active:p.sprite.active};
    s.player.hp=s.player.maxHp-10;
    s.gamePause.release('contact-test');
    await new Promise(r=>setTimeout(r,200));
    return {full,paused,after:{active:p.sprite.active,collected:s.pickups.collected.heal,hp:s.player.hp,maxHp:s.player.maxHp}};
  });
  assert(fullHp.full.active); assert.equal(fullHp.full.title,'HP FULL');
  assert(fullHp.paused.time && fullHp.paused.visual && fullHp.paused.active);
  assert.equal(fullHp.after.active,false); assert.equal(fullHp.after.collected,fullHp.full.collected+1);
  assert.equal(fullHp.after.hp,fullHp.after.maxHp); assert.deepEqual(errors,[]);
  const magnetExclusion = await page.evaluate(async () => {
    const s = window.__pickupGame.scene.getScene('GameScene');
    s.pickups.items.forEach((pickup) => pickup.destroy());
    s.pickups.items = [];
    s.pickups.spawned.bomb = 0;
    s.pickups.spawned.magnet = 0;
    const bomb = s.pickups.spawn('bomb', 850, 450);
    const magnet = s.pickups.spawn('magnet', 700, 450);
    const bombCount = s.pickups.collected.bomb;
    s.pickups.collect(magnet);
    await new Promise((resolve) => setTimeout(resolve, 160));
    return { active: bomb.sprite.active, bombCount: s.pickups.collected.bomb,
      before: bombCount, magnetActive: s.pickups.isMagnetActive() };
  });
  assert(magnetExclusion.active && magnetExclusion.magnetActive);
  assert.equal(magnetExclusion.bombCount, magnetExclusion.before,
    'XP magnet pulled or detonated a special pickup');
  await page.evaluate(()=>{
    const s=window.__pickupGame.scene.getScene('GameScene');s.player.sprite.body.reset(700,500);
    const p=s.pickups.spawn('elite-chest',850,450);window.__openingPickup=p;
    if (!s.pickups.collect(p)) throw new Error('Chest not collected');
  });
  await page.waitForTimeout(150);
  const opening=await page.evaluate(()=>{
    const s=window.__pickupGame.scene.getScene('GameScene');s.gamePause.request('contact-modal');
    return {reasons:s.gamePause.getState().reasons,texture:window.__openingPickup.visual.texture.key,time:s.time.now};
  });
  await page.waitForTimeout(650);
  assert(await page.evaluate(time=>{
    const s=window.__pickupGame.scene.getScene('GameScene');return s.time.now===time&&window.__openingPickup.opening&&!s.isChoosingUpgrade;
  },opening.time),'Modal did not freeze the chest opening');
  await page.evaluate(()=>window.__pickupGame.scene.getScene('GameScene').gamePause.release('contact-modal'));
  await page.waitForFunction(()=>window.__pickupGame.scene.getScene('GameScene').isChoosingUpgrade);
  const rewardQueue=await page.evaluate(()=>{
    const s=window.__pickupGame.scene.getScene('GameScene');s.runState.startChestReward('golden');s.runState.startChestReward('boss');s.runState.startLevelUp(2);
    return {first:s.runState.currentSelection,queue:[...s.runState.rewardQueue],levels:s.runState.pendingLevelUps,
      reasons:s.gamePause.getState().reasons};
  });
  assert(opening.reasons.includes('chest-opening')); assert(!rewardQueue.reasons.includes('chest-opening'));
  assert.deepEqual(rewardQueue.queue,['golden','boss']); assert.equal(rewardQueue.levels,2);
  const receipts=[];
  for(let i=0;i<5;i++) {
    const receipt=await page.evaluate(()=>{
      const s=window.__pickupGame.scene.getScene('GameScene'),u=s.runState.pendingUpgradeChoices[0];
      return {id:u.id,rank:s.player.getUpgradeRank(u.id),consumable:u.consumable,type:s.runState.currentSelection.type,kind:s.runState.currentSelection.kind};
    });
    await page.locator('.upgrade-button').first().click();
    const after=await page.evaluate(id=>{const s=window.__pickupGame.scene.getScene('GameScene');return {rank:s.player.getUpgradeRank(id),paused:s.gamePause.isPaused,choosing:s.isChoosingUpgrade};},receipt.id);
    if(!receipt.consumable) assert.equal(after.rank,receipt.rank+1);
    assert.equal(after.choosing,i<4); assert.equal(after.paused,i<4);receipts.push({...receipt,after});
  }
  assert.deepEqual(receipts.map(r=>r.type==='chest'?r.kind:r.type),['elite','golden','boss','level','level']);
  const sounds=await page.evaluate(async()=>{
    const s=window.__pickupGame.scene.getScene('GameScene');s.audio.stopAll();
    const rows=[];
    for(const key of ['enemy-dash','blast-shell-impact','orbit-contact']){
      const sound=s.audio.play(key,{cooldown:0});rows.push({key,cached:s.cache.audio.exists(key),playing:Boolean(sound?.isPlaying)});
      await new Promise(r=>setTimeout(r,300));
    }
    return rows;
  });
  assert(sounds.every(row=>row.cached&&row.playing),'A new attack sound could not actually play');
  await page.evaluate(() => window.__pickupGame.scene.getScene('GameScene').scene.restart());
  await page.waitForFunction(() => window.__ROOSTER_TEST__?.getPickupState
    && window.__ROOSTER_TEST__.getPickupState().items.length === 0);
  const reset = await page.evaluate(() => window.__ROOSTER_TEST__.getPickupState());
  assert.equal(reset.collected.bomb, 0);
  assert.equal(reset.collected.heal, 0);
  assert.equal(reset.collected.magnet, 0);
  assert.equal(reset.magnetActive, false);
  assert.deepEqual(errors,[]);
  await fs.mkdir(path.join(projectRoot,'test-results'),{recursive:true});
  await fs.writeFile(path.join(projectRoot,'test-results/pickup-contact.json'),JSON.stringify({rows,passes,fullHp,magnetExclusion,opening,rewardQueue,receipts,sounds,reset,errors},null,2));
  console.log(`Pickup contact passed: ${rows.length} cardinal crossings, ${passes.length} near-miss/fast cases, full HP, pause, magnet exclusion, restart, exactly once, five queued rewards, three playing attack sounds.`);
} finally { await browser.close(); await stopTestServer(server.server); }
