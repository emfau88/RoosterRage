import fs from 'node:fs/promises';
import path from 'node:path';

const assert = (condition, message, data) => {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(data)}`);
};

export async function captureCombat({ open, output }) {
  const results = { method: 'Instrumented WebGL production fixtures; no distributed test API. These are not natural runs.', geometry: [], layouts: [], priority: null, health: null, hazards: null };
  const bounds = JSON.parse(await fs.readFile(path.join(output, 'sprite-bounds.json'), 'utf8'));
  for (const viewport of [{width:960,height:540},{width:844,height:390},{width:390,height:844}]) {
    const item = await open(viewport, null, { arena:'vertical-run', seed:'portal-geometry' }, true, viewport.width===390?2:1);
    const { page } = item;
    // These isolated QA fixtures use the class selection API after unlocking.
    await page.evaluate(() => {
      const s=window.__baselineGame.scene.getScene('GameScene');
      s.meta.state.unlockedRoosters=['ace','artillery','storm'];
      s.chooseRooster('ace'); s.gamePause.request('combat-geometry'); s.hud.combatMessages.clear();
    });
    await page.waitForTimeout(600);
    for (const rooster of ['ace','artillery','storm']) {
      const measured=await page.evaluate(rooster => {
        const s=window.__baselineGame.scene.getScene('GameScene');s.roosterClasses.select(rooster);s.player.updateGroundMarker();s.updateHud();
        const p=s.player, canvas=s.game.canvas, camera=s.cameras.main;
        return {rooster,scale:p.baseScale,zoom:camera.zoom,cssPerRenderPixel:canvas.getBoundingClientRect().height/canvas.height,
          radius:p.sprite.body.radius*p.sprite.scaleX,bodyOffset:{x:p.sprite.body.offset.x,y:p.sprite.body.offset.y},
          groundMarker:{width:p.groundMarker.width,height:p.groundMarker.height,depth:p.groundMarker.depth},
          hasWorldHp:!!(p.hpBarBack||p.hpBarFill||p.hpBarBorder),hudHp:s.hud.root.querySelector('[data-hp-value]').getAttribute('aria-label')};
      },rooster);
      assert(!measured.hasWorldHp && measured.hudHp.includes('HP'),'Player health must be HUD-only',measured);
      assert(Math.abs(measured.radius-58*{ace:0.25,artillery:0.275,storm:0.255}[rooster])<0.001,'Player collision footprint changed',measured);
      const poses=bounds.frames.filter(f=>f.rooster===rooster).map(f=>({pose:f.pose,frame:f.frame,heightCss:(f.bounds[3]-f.bounds[1])*measured.scale*measured.zoom*measured.cssPerRenderPixel}));
      results.geometry.push({viewport,...measured,poses,minHeightCss:Math.min(...poses.map(p=>p.heightCss)),maxHeightCss:Math.max(...poses.map(p=>p.heightCss))});
      await page.screenshot({path:path.join(output,`feed-${viewport.width}-${rooster}.png`)});
    }
    assert(!item.errors.length,'Browser errors',item.errors);
    await item.context.close();
  }

  const item=await open({width:960,height:540},null,{seed:'combat-layout'}), {page}=item;
  await page.evaluate(() => {
    const s=window.__baselineGame.scene.getScene('GameScene');s.chooseRooster('ace');s.gamePause.request('combat-layout');
    s.spawnEnemy(s.waveSystem.makeBoss());s.updateHud();s.hud.combatMessages.clear();
    s.hud.renderLoadout({active:Array.from({length:5},(_,i)=>({id:`a${i}`,name:'Golden Egg',sourceId:'golden-egg',rank:4,maxRank:4})),activeSlots:5,
      passive:Array.from({length:4},(_,i)=>({id:`p${i}`,name:'Armor',sourceId:'armor',rank:3,maxRank:3})),passiveSlots:4});
  });
  const viewports=[[1920,1080],[1440,900],[1366,768],[1280,720],[1216,684],[1077,606],[967,604],[960,540],[907,510],[821,462],[800,450],[844,390],[1100,700],[1099,699],[900,600],[899,601],[720,600],[719,599],[390,844],[320,568]];
  for (const [width,height] of viewports) {
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    await page.evaluate(() => {
      const s=window.__baselineGame.scene.getScene('GameScene'), h=s.hud;
      h.combatMessages.clear();h.showMultiKill({label:'KILL CHAIN',count:15});
      h.showUpgradeConfirmation({id:'golden-egg',name:'Golden Egg',nextRank:4,changeItems:['Damage +20%']});
      h.showEncounterBanner('BROOD KING · PHASE 3','Keep clear of the heavy attack.','boss',4000);
    });
    await page.waitForTimeout(60);
    const layout=await page.evaluate(() => {
      const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const active=[...document.querySelectorAll('.combat-messages > .is-visible')];
      const message=rect(active[0]);
      const mandatory=[...document.querySelectorAll('.hud > *, .joystick')].filter(n=>getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden').map(n=>({class:n.className,...rect(n)}));
      return {viewport:{width:innerWidth,height:innerHeight},message,active:active.map(n=>n.className),mandatory,
        overlap:mandatory.filter(r=>r.width&&r.height&&Math.min(r.right,message.right)>Math.max(r.left,message.left)&&Math.min(r.bottom,message.bottom)>Math.max(r.top,message.top))};
    });
    assert(layout.active.length===1 && layout.active[0].includes('wave-banner'),'Warnings must have exclusive priority',layout);
    assert(!layout.overlap.length && layout.message.bottom<height*0.5 && layout.message.left>=0 && layout.message.right<=width,'Message obscures required HUD or central dodge area',layout);
    results.layouts.push(layout);
    if([960,844,390,320].includes(width))await page.screenshot({path:path.join(output,`boss-layout-${width}.png`)});
  }

  await page.setViewportSize({width:960,height:540});
  await page.evaluate(() => {
    const h=window.__baselineGame.scene.getScene('GameScene').hud;h.combatMessages.clear();
    h.showMultiKill({label:'DOUBLE KILL',count:2});h.showUpgradeConfirmation({id:'golden-egg',name:'Golden Egg',nextRank:3});
    h.showEncounterBanner('PHASE 2','Dodge the fan.','boss',250);
    h.showMultiKill({label:'KILL CHAIN',count:8});h.updateMultiKillCount(12);
  });
  await page.waitForFunction(()=>document.querySelector('.upgrade-confirmation.is-visible'));
  await page.screenshot({path:path.join(output,'upgrade-receipt.png')});
  await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').hud.setOverlayVisible(true));
  await page.waitForTimeout(2100);
  const paused=await page.evaluate(()=>{const h=window.__baselineGame.scene.getScene('GameScene').hud;return {active:h.combatMessages.active,pending:[...h.combatMessages.pending.keys()],display:getComputedStyle(h.combatMessages.dock).display};});
  assert(!paused.active && paused.pending.includes('upgrade') && paused.display==='none','Overlay must preserve pending receipts',paused);
  await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').hud.hideOverlay());
  await page.waitForFunction(()=>document.querySelector('.upgrade-confirmation.is-visible'));
  await page.waitForFunction(()=>document.querySelector('.multi-kill.is-visible'));
  const kill=await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').hud.getMultiKillState());
  assert(kill.count==='12×'&&kill.label==='KILL CHAIN','Queued kill messages must aggregate',kill);
  results.priority={paused,kill};await page.screenshot({path:path.join(output,'kill-chain.png')});
  await page.evaluate(()=>{
    const h=window.__baselineGame.scene.getScene('GameScene').hud;
    const r=h.combatMessages.dock.getBoundingClientRect();h.combatMessages.clear();
    h.combatMessages.setPlayerRect({left:r.left,top:r.top,right:r.right,bottom:r.bottom});
    h.showUpgradeConfirmation({id:'golden-egg',name:'Golden Egg',nextRank:4});
  });
  await page.waitForTimeout(2600);
  const held=await page.evaluate(()=>{
    const h=window.__baselineGame.scene.getScene('GameScene').hud;
    return {held:h.combatMessages.playerHeld,active:h.combatMessages.active?.kind,visible:h.getUpgradeFeedbackState().visible};
  });
  assert(held.held&&held.active==='upgrade'&&!held.visible,'Player overlap must defer the receipt without losing it',held);
  await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').hud.showEncounterBanner('PHASE 3','Dodge the heavy attack.','boss',250));
  assert(await page.evaluate(()=>document.querySelector('.wave-banner.is-visible')&&window.__baselineGame.scene.getScene('GameScene').hud.combatMessages.dock.style.visibility!=='hidden'),'Priority warning must interrupt player deferral');
  await page.waitForTimeout(300);
  await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').hud.combatMessages.setPlayerRect(null));
  assert(await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').hud.getUpgradeFeedbackState().visible),'Receipt must resume after player leaves its screen region');
  results.priority.playerOverlap=held;

  results.health=await page.evaluate(() => {
    const s=window.__baselineGame.scene.getScene('GameScene');
    const ordinary=s.entities.spawnEnemyAt(s.waveSystem.makeSlime(),s.player.sprite.x+140,s.player.sprite.y);
    const fresh=ordinary.hpBarBack.visible;ordinary.takeDamage(1);const damaged=ordinary.hpBarBack.visible;
    ordinary.hpBarVisibleUntil=s.time.now-1;ordinary.updateHpBarVisibility();const expired=ordinary.hpBarBack.visible;
    ordinary.reset(ordinary.sprite.x,ordinary.sprite.y,s.waveSystem.makeSlime());const pooled=ordinary.hpBarBack.visible;
    const elite=s.entities.spawnEnemyAt({...s.waveSystem.makeSlime(),elite:true},s.player.sprite.x-140,s.player.sprite.y);
    const boss=s.enemies.find(e=>e.boss);
    const micro=s.entities.spawnEnemyAt(s.waveSystem.makeKornkrabbler(),s.player.sprite.x,s.player.sprite.y+180);micro.takeDamage(1);
    return {fresh,damaged,expired,pooled,elite:elite.hpBarBack.visible,boss:boss.hpBarBack.visible,micro:micro.hpBarBack.visible};
  });
  const h=results.health;
  assert(!h.fresh&&h.damaged&&!h.expired&&!h.pooled&&h.elite&&h.boss&&!h.micro,'Enemy health visibility regression',h);
  await page.evaluate(()=>window.__baselineGame.scene.getScene('GameScene').openSettings());
  const control=page.locator('[data-effect="enemyHealthBarsAlways"]');
  assert(await control.locator('strong').textContent()==='AUTO','Adaptive health must be the default');
  await control.click();
  const always=await page.evaluate(()=>{
    const s=window.__baselineGame.scene.getScene('GameScene');const e=s.enemies.find(e=>!e.elite&&!e.boss&&!e.champion&&e.showHpBar);
    e.updateHpBarVisibility();return {visible:e.hpBarBack.visible,saved:JSON.parse(localStorage.getItem('rooster-rage:effects:v1')).enemyHealthBarsAlways};
  });
  assert(always.visible&&always.saved&&await control.locator('strong').textContent()==='ALWAYS','Always health setting must apply and persist',always);
  await page.screenshot({path:path.join(output,'enemy-hp-settings.png')});
  await control.click();await page.locator('.settings-close').click();
  results.health.setting=always;
  results.hazards=await page.evaluate(()=>{
    const s=window.__baselineGame.scene.getScene('GameScene'),p=s.player.sprite;
    s.hud.combatMessages.clear();s.gamePause.release('combat-layout');
    s.gamePause.request('hazard-fixture',{freezeTweens:false});
    s.enemies.forEach(e=>e.destroy());s.enemies=[];
    const e=s.entities.spawnEnemyAt(s.waveSystem.makeBrute(),p.x+130,p.y+110);
    s.activeAbilities.createMolotovImpact(p.x+110,p.y+110,4,false);
    s.hazardZones.forEach(z=>z.update(500));
    s.combatFeedback.showEnemyTelegraph(e,s.player,{}, {heavy:true,radial:true,radius:150,duration:1800});
    const projectile=s.enemyAttacks.spawnBossFireball(p.x+300,p.y+70,Math.PI);
    projectile.sprite.body.stop();
    s.effects.set('screenShake',false);s.effects.set('screenFlash',false);
    s.combatFeedback.shake(140,0.003);
    s.combatFeedback.showPlayerDamage(p.x,p.y,1,{heavy:true});
    return {ownField:s.hazardZones.at(-1).renderStyle,ownDepth:s.hazardZones.at(-1).rim.depth,
      heavyRing:{color:projectile.dangerRing.strokeColor,depth:projectile.dangerRing.depth,visible:projectile.dangerRing.visible},
      telegraphs:s.combatFeedback.activeTelegraphs,shake:s.cameras.main.shakeEffect.isRunning,flash:s.cameras.main.flashEffect.isRunning};
  });
  assert(results.hazards.ownDepth<results.hazards.heavyRing.depth && results.hazards.heavyRing.visible && !results.hazards.shake && !results.hazards.flash,'Hazard dominance or effect setting regression',results.hazards);
  await page.waitForTimeout(500);await page.screenshot({path:path.join(output,'hazards-simultaneous.png')});
  results.hazards.voidComparison=await page.evaluate(()=>{
    const s=window.__baselineGame.scene.getScene('GameScene'),p=s.player.sprite;
    s.voidNest.unlock(4);s.voidNest.activate(s.time.now);
    const e=s.enemies[0];
    s.combatFeedback.showEnemyTelegraph(e,s.player,{}, {heavy:true,radial:true,radius:150,duration:1800});
    const shot=s.enemyAttacks.spawnProjectile(p.x+300,p.y+40,Math.PI,{color:0xc18aff,radius:9,warningColor:0xff5268});
    shot.sprite.body.stop();
    return {own:s.voidZones.at(-1).renderStyle,ownDepth:s.voidZones.at(-1).outer.depth,enemyRingDepth:shot.dangerRing.depth,enemyRingColor:shot.dangerRing.strokeColor};
  });
  assert(results.hazards.voidComparison.ownDepth<results.hazards.voidComparison.enemyRingDepth,'Void field masks enemy warning');
  await page.waitForTimeout(400);await page.screenshot({path:path.join(output,'hazards-void-simultaneous.png')});
  assert(!item.errors.length,'Browser errors',item.errors);
  await item.context.close();
  await fs.writeFile(path.join(output,'combat-checks.json'),JSON.stringify(results,null,2)+'\n');
  const edge=await open({width:390,height:844},null,{arena:'square-coop',seed:'combat-player-edge'});
  await edge.page.evaluate(()=>{
    const s=window.__baselineGame.scene.getScene('GameScene');s.meta.state.unlockedRoosters=['ace','artillery','storm'];s.chooseRooster('artillery');
    s.player.sprite.setPosition(420,134);s.player.updateGroundMarker();s.gamePause.request('edge-fixture');s.hud.combatMessages.clear();
  });
  await edge.page.waitForTimeout(500);
  const edgeState=await edge.page.evaluate(()=>{
    const s=window.__baselineGame.scene.getScene('GameScene');s.updateHud();s.hud.showMultiKill({label:'KILL CHAIN',count:4});
    return {held:s.hud.combatMessages.playerHeld,rect:s.hud.combatMessages.playerRect};
  });
  assert(edgeState.held,'Natural Coop top-edge case must defer the kill banner',edgeState);
  await edge.page.screenshot({path:path.join(output,'coop-player-edge-clear.png')});
  results.priority.coopEdge=edgeState;
  assert(!edge.errors.length,'Browser errors at player edge',edge.errors);await edge.context.close();
  await fs.writeFile(path.join(output,'combat-checks.json'),JSON.stringify(results,null,2)+'\n');
  console.log('Production combat checks passed: 20 layouts, all 192 authored frames, HUD-only HP, priority/overlay queue and pooled enemy bars.');
}
