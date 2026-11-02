import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ensureTestServer, loadPlaywright, stopTestServer, projectRoot } from '../../../tests/helpers/test-runtime.mjs';

const output = import.meta.dirname;
const impact = process.argv.includes('--impacts');
const name = impact ? 'impacts' : 'rockets';
const viewport = { width: 1280, height: impact ? 930 : 800 };
const server = await ensureTestServer();
const browser = await loadPlaywright().chromium.launch({ headless: true,
  ...(process.env.ROOSTER_CHROMIUM ? { executablePath: process.env.ROOSTER_CHROMIUM } : {}) });
const errors = [];
try {
  for (const renderer of ['WEBGL', 'CANVAS']) {
    const context = await browser.newContext({ viewport,
      ...(renderer === 'WEBGL' && !process.argv.includes('--still')
        ? { recordVideo: { dir: path.join(projectRoot, 'test-results/rocket-build-polish/video'), size: viewport } } : {}) });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(renderer => {
      let phaser;
      Object.defineProperty(window, 'Phaser', { configurable: true, get: () => phaser, set(value) {
        phaser = value;
        const boot = value.Game.prototype.boot;
        value.Game.prototype.boot = function(...args) {
          this.config.renderType = value[renderer]; window.__previewGame = this;
          return boot.apply(this, args);
        };
      } });
    }, renderer);
    await page.goto(`${server.url}?arena=square-coop&seed=rocket-preview&profile=manual`);
    await page.waitForFunction(() => window.__ROOSTER_TEST__?.selectRooster);
    await page.evaluate(async impact => {
      const { RocketProjectile } = await import('/src/entities/RocketProjectile.js');
      const api = window.__ROOSTER_TEST__;
      api.selectRooster('ace'); api.pauseWaves(); api.disableBot(); api.clearEnemies(); api.clearProjectiles();
      api.advancePickupSchedule(10, 1); api.clearPickups();
      const s = window.__previewGame.scene.getScene('GameScene');
      s.lastShotAt = Infinity;
      s.children.list.forEach(child => child.setVisible?.(false));
      const scale = s.game.roosterDisplay?.renderScale ?? 1;
      s.cameras.main.setZoom(scale).centerOn(700, 450);
      const hud = document.createElement('style');
      hud.textContent = '.hud,.overlay,.wave-banner,.upgrade-confirmation,.multi-kill,.touch-joystick,.game-hint{display:none!important}';
      document.head.append(hud);
      s.add.rectangle(700, 450, 1500, 1100, 0x151b22).setDepth(2);
      const text = (x,y,value,size,color='#f0e9da') => s.add.text(x,y,value,{
        fontFamily:'Arial',fontSize:`${size}px`,color,fontStyle:size>=20?'bold':'normal'
      }).setDepth(20);
      text(110,78,impact?'RAKETEN · EINSCHLÄGE':'RAKETEN · TRIEBWERK & FLUG',28);
      text(110,116,'Lokale Vorschau · R1 bis EVO · noch nicht veröffentlicht',16,'#aeb9c4');
      if(impact){
        const specs=[
          {rank:1,radius:82,damage:48,label:'R1 · Eierschalen-Rakete'},
          {rank:2,radius:100,damage:64,label:'R2 · Verstärkte Rakete'},
          {rank:3,radius:118,damage:80,label:'R3 · Cluster-Sprengkopf'},
          {rank:4,radius:132,damage:96,label:'R4 · Schwere Salve'},
          {rank:4,radius:158,damage:112,label:'EVO · Broodstorm',evolved:true}
        ];
        specs.forEach((spec,i)=>{
          spec.x=270+(i%3)*430; spec.y=i<3?345:705;
          s.add.rectangle(spec.x,spec.y,400,310,0x202831).setDepth(2.1);
          text(spec.x-180,spec.y-136,spec.label,18,spec.evolved?'#ffd179':'#f0e9da');
          const note=spec.rank>=3&&!spec.evolved?'Detonation + 3 Cluster':'Eigene Detonationsgrafik';
          text(spec.x-180,spec.y-108,note,13,'#aeb9c4');
          text(spec.x-180,spec.y+128,`${spec.damage} Schaden · ${spec.radius} Radius`,13,'#aeb9c4');
        });
        text(960,605,'IMPACT-VERGLEICH',20);
        text(960,645,'Eine Detonation je Stufe\nGleiche Darstellungsgröße\n\nR4/EVO-Salven können mehrere\nsolcher Einschläge erzeugen.',15,'#aeb9c4');
        const burst=()=>specs.forEach(spec=>s.rocketEgg.createExplosion(spec.x,spec.y+15,spec.damage,spec.radius,!!spec.evolved,spec.rank));
        burst(); s.time.addEvent({delay:1400,loop:true,callback:burst});
        window.__rocketPreview={scene:s,rows:specs};
        return;
      }
      text(250,162,'DETAIL  2×',13,'#aeb9c4');
      text(600,162,'FLUG  1×  ·  Rauch bleibt in der Flugbahn',13,'#aeb9c4');
      const rows = [];
      for (let i=0; i<5; i++) {
        const y=237+i*115, rank=Math.min(i+1,4), evolved=i===4;
        s.add.rectangle(700,y+1,1190,100,0x202831).setDepth(2.1);
        s.add.rectangle(905,y+3,720,2,0x36434e).setDepth(2.2).setAlpha(0.45);
        text(125,y-22,evolved?'EVO':`R${rank}`,24,evolved?'#ffd179':'#f0e9da');
        text(125,y+10,evolved?'3 Raketen':rank===4?'2 Raketen':'1 Rakete',13,'#aeb9c4');
        const target={sprite:{x:2000,y,active:true}};
        const detail=new RocketProjectile(s,370,y,target,rank,evolved);
        detail.sprite.setDisplaySize(detail.sprite.displayWidth*2,detail.sprite.displayHeight*2);
        detail.shadow.setVisible(false); detail.speed=0; detail.life=Infinity;
        detail.exhaust.nextEmissionAt=Infinity;
        s.rocketProjectiles.push(detail);
        rows.push({rank,evolved,y,detail,next:0,target:{sprite:{x:1500,y,active:true}}});
      }
      const started=s.time.now;
      s.events.on('update',()=>{
        for(const row of rows){
          row.target.sprite.y=row.y+Math.sin((s.time.now-started)*.0016)*30;
          if(s.time.now>=row.next){
            const p=new RocketProjectile(s,555,row.y,row.target,row.rank,row.evolved);
            p.previewFlight=true; s.rocketProjectiles.push(p);
            row.next=s.time.now+2800;
          }
        }
        for(const p of s.rocketProjectiles){if(p.previewFlight && p.sprite.x>1275)p.destroy();}
      });
      window.__rocketPreview={scene:s,rows};
    },impact);
    await page.waitForTimeout(impact?1510:1650);
    await page.screenshot({ path:path.join(output,`${name}-${renderer.toLowerCase()}.png`) });
    if(renderer==='WEBGL' && !process.argv.includes('--still')) await page.waitForTimeout(11000);
    const video = page.video();
    const stats = await page.evaluate(() => ({ renderer: window.__previewGame.renderer.type,
      fx: window.__rocketPreview.scene.objectPools.getStats().fx,
      error: window.__rocketPreview.scene.debugStats.lastError }));
    await context.close();
    if(video){
      const input=await video.path();
      execFileSync('ffmpeg',['-y','-v','error','-sseof','-10','-i',input,'-an','-r','30',
        '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,`${name}-in-motion.mp4`)]);
      const gifInput=path.join(output,`${name}-in-motion.mp4`);
      execFileSync('ffmpeg',['-y','-v','error','-i',gifInput,
        ...(impact?['-vf','setpts=2*PTS','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,'impacts-slow-motion.mp4')]:['-f','null','-'])]);
      execFileSync('ffmpeg',['-y','-v','error','-i',impact?path.join(output,'impacts-slow-motion.mp4'):gifInput,
        '-filter_complex','fps=20,scale=1000:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
        '-loop','0',path.join(output,`${name}-in-motion.gif`)]);
    }
    console.log(JSON.stringify({renderer,stats,errors}));
  }
  if(errors.length)throw new Error(errors.join('\n'));
} finally { await browser.close(); await stopTestServer(server.server); }
