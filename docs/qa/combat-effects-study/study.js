import Phaser from 'phaser';
import groundUrl from '../../../src/assets/map/arena-ground-farm.webp';
import aceUrl from '../../../src/assets/characters/ace-mascot/rooster-ace-mascot-idle.webp';
import supportUrl from '../../../src/assets/enemies/animations/enemy-support-run.webp';
import slimeUrl from '../../../src/assets/enemies/animations/enemy-slime-hop-v2.webp';
import bossUrl from '../../../src/assets/enemies/animations/enemy-boss-run.webp';
import fireballUrl from '../../../src/assets/projectiles/boss-fireball.webp';
import orangeUrl from '../../../src/assets/fx/molotov-modular/molotov-ground-flame-orange.png';
import blueUrl from '../../../src/assets/fx/molotov-modular/molotov-ground-flame-blue.png';
import embersUrl from '../../../src/assets/fx/molotov-modular/molotov-embers.webp';
import ignitionUrl from '../../../src/assets/fx/molotov-modular/molotov-ignition.webp';
import fxUrl from '../../../src/assets/fx/fx-atlas-v1-sheet.webp';
import emitterUrl from '../../../src/assets/fx/evolutions/evo-dawn-laser-emitter.webp';
import impactUrl from '../../../src/assets/fx/evolutions/evo-dawn-laser-impact.webp';
import { EnemyProjectile } from './baseline/EnemyProjectile.js';
import { HazardZone } from './baseline/HazardZone.js';
import { LaserCombAbility } from './baseline/LaserCombAbility.js';
import { FireballConcept, LaserConcept, MolotovConcept, clamp } from './effects.js';

const query=new URLSearchParams(location.search),effect=['boss','laser','molotov','overlap'].includes(query.get('effect'))?query.get('effect'):'boss';
const cycle=effect==='molotov'?12000:effect==='boss'?6500:effect==='overlap'?5600:8000;
const controls={elapsed:0,manual:null,paused:false,speed:1,rank:query.get('rank')??'auto'};
const names={boss:'Boss-Feuerball · lebendiges Comicfeuer',laser:'Laser · Energie in Bewegung',molotov:'Molotov · lebendige Flammen, mehr Boden sichtbar',overlap:'Zusammenspiel · mehrere Effekte im Kampf'};
document.getElementById('title').textContent=names[effect];
document.querySelector(`[data-effect="${effect}"]`).setAttribute('aria-current','page');
document.getElementById('rank').value=controls.rank;document.getElementById('rank').disabled=effect==='boss'||effect==='overlap';
document.getElementById('scrub').max=cycle-1;
if(query.has('capture'))document.body.classList.add('capture');

// An isolated deterministic clock drives the unchanged baseline class. No game clock is touched.
class Timeline {
  constructor(){this.now=0;this.calls=[];this.tweens=[];}
  delayedCall(delay,fn){this.calls.push({at:this.now+delay,fn});}
  add(config){
    const targets=Array.isArray(config.targets)?config.targets:[config.targets];
    const values=[];
    for(const target of targets)for(const key of ['alpha','scale','scaleX','scaleY','rotation']){
      if(config[key]===undefined)continue;
      if(key==='scale')for(const axis of ['scaleX','scaleY'])values.push({target,key:axis,start:target[axis],end:config.scale});
      else values.push({target,key,start:target[key],end:config[key]});
    }
    this.tweens.push({config,at:this.now,values});
  }
  updateTweens(time){
    for(const tween of [...this.tweens]){
      const duration=tween.config.duration??0,ratio=clamp((time-tween.at)/(duration||1));
      const elapsed=time-tween.at,done=elapsed>=duration*(tween.config.yoyo?2:1);
      let u=tween.config.yoyo&&elapsed>duration?1-clamp((elapsed-duration)/duration):ratio;
      if(tween.config.ease==='Quad.Out')u=1-(1-u)**2;
      if(tween.config.ease==='Sine.Out')u=Math.sin(u*Math.PI/2);
      for(const v of tween.values)if(v.target.active)v.target[v.key]=v.start+(v.end-v.start)*u;
      if(done){this.tweens.splice(this.tweens.indexOf(tween),1);tween.config.onComplete?.();}
    }
  }
  advance(time){
    while(true){this.calls.sort((a,b)=>a.at-b.at);if(!this.calls.length||this.calls[0].at>time)break;
      const call=this.calls.shift();this.now=call.at;this.updateTweens(this.now);call.fn();}
    this.now=time;this.updateTweens(time);
  }
}
function trackedScene(scene,panel,clock){
  const objects=[];
  const add=new Proxy(scene.add,{get(target,key){const value=target[key];if(typeof value!=='function')return value;
    return (...args)=>{const o=value.apply(target,args);if(o?.setMask){o.setMask(panel.mask);objects.push(o);}return o;};}});
  const proxy={add,time:clock,tweens:clock,sys:{isActive:()=>true},textures:scene.textures,
    audio:{play(){}},debugStats:{specialShots:0},telemetry:{addShot(){}},waveSystem:{currentWave:20},
    enemies:panel.enemies.map(sprite=>({sprite})),damageEnemy(){},
    player:{getMuzzlePosition:()=>({x:panel.x+125,y:290})},findNearestEnemy:()=>({sprite:panel.enemies[0]})};
  proxy.playFx=(key,x,y,config)=>{
    const sprite=add.sprite(x,y,'fx-atlas-v1',16).setScale(config.scale).setDepth(config.depth).setRotation(config.rotation??0);
    for(let frame=1;frame<4;frame++)clock.delayedCall(frame*1000/14,()=>{if(sprite.active)sprite.setFrame(16+frame);});
    clock.delayedCall(4*1000/14,()=>sprite.destroy());
  };
  return {proxy,objects,destroy:()=>{objects.forEach(o=>{if(o.scene)o.destroy();});}};
}

class Study extends Phaser.Scene {
  preload(){
    for(const [key,url] of [['ground',groundUrl],['boss-fireball',fireballUrl],['enemy-shot',fireballUrl],['molotov-embers',embersUrl],['molotov-ignition',ignitionUrl],['evo-dawn-laser-emitter',emitterUrl],['evo-dawn-laser-impact',impactUrl]])this.load.image(key,url);
    for(const [key,url] of [['ace',aceUrl],['support',supportUrl],['slime',slimeUrl],['boss',bossUrl],['molotov-ground-flame-orange',orangeUrl],['molotov-ground-flame-blue',blueUrl],['fx-atlas-v1',fxUrl]])this.load.spritesheet(key,url,{frameWidth:256,frameHeight:256});
  }
  create(){
    this.physics.world.pause();this.panels=[];this.errors=[];
    for(const key of ['molotov-ground-flame-orange','molotov-ground-flame-blue'])this.anims.create({key:key+'-loop',frames:this.anims.generateFrameNumbers(key,{start:0,end:11}),frameRate:14,repeat:-1});
    for(let i=0;i<2;i++){
      const x=i*640,text=(dx,y,value,size=14,col='#eee9d8')=>this.add.text(x+dx,y,value,{fontFamily:'Arial',fontSize:size,color:col,fontStyle:size>=19?'bold':'normal'}).setDepth(50);
      this.add.rectangle(x+320,274,638,548,0x18231a).setDepth(0);
      this.add.tileSprite(x+1,66,638,448,'ground').setOrigin(0).setTilePosition(65,130).setDepth(1);
      text(24,14,i?'NACHHER · ENTWURF':'VORHER · AKTUELL',21,i?'#dfefae':'#eeeadc');
      const detail=text(24,43,'',13,'#b8c7ab');
      text(24,527,'Originaler Figurenmaßstab · gleiche Positionen',12,'#b9c7b0');
      const state=text(616,527,'',12,'#dfcc9c').setOrigin(1,0);
      const maskShape=this.make.graphics({x:0,y:0,add:false});maskShape.fillStyle(0xffffff).fillRect(x+1,66,638,448);
      const mask=maskShape.createGeometryMask();
      const player=this.add.sprite(x+(effect==='boss'?520:90),effect==='boss'?357:290,'ace',16).setScale(.25).setDepth(5).setMask(mask);
      const support=this.add.sprite(x+98,448,'support',0).setScale(.28).setDepth(5).setMask(mask);
      const boss=this.add.sprite(x+78,255,'boss',0).setScale(.58).setFlipX(true).setDepth(5).setMask(mask).setVisible(effect==='boss');
      const enemies=[[300,290],[410,260],[490,330]].map(([dx,dy])=>this.add.sprite(x+dx,dy,'slime',0).setScale(.2).setDepth(4).setMask(mask).setVisible(effect!=='boss'));
      this.add.ellipse(player.x,player.y+23,34,12,0x312919,.22).setDepth(2);
      this.add.ellipse(support.x,support.y+24,32,12,0x312919,.2).setDepth(2);
      const panel={x,i,detail,state,mask,maskShape,player,support,boss,enemies,signature:null,baselines:[],concepts:[],previousAge:-Infinity};
      this.panels.push(panel);
    }
    window.combatStudy={ready:true,setTime:ms=>{controls.manual=ms;this.draw(ms);},play:()=>{controls.manual=null;controls.paused=false;controls.elapsed=0;},
      setRank:value=>{controls.rank=String(value);document.getElementById('rank').value=controls.rank;this.draw(controls.manual??controls.elapsed);},
      describe:()=>({effect,cycle,rank:controls.rank,elapsed:controls.manual??controls.elapsed,paused:controls.paused,speed:controls.speed,
        renderer:this.game.renderer.type===Phaser.WEBGL?'WEBGL':'CANVAS',objects:this.children.list.length,
        productionModified:false,panels:this.panels.map(p=>({signature:p.signature,active:p.active,
          fields:p.concepts.filter(c=>c instanceof MolotovConcept).map(c=>({radius:c.radius,flames:c.flames.length,uniform:c.flames.every(f=>Math.abs(f.sprite.scaleX-f.sprite.scaleY)<1e-8)})),
          finite:this.children.list.filter(o=>o.setPosition).every(o=>[o.x,o.y,o.scaleX,o.scaleY,o.alpha].every(Number.isFinite))}))})};
    this.draw(0);
  }
  clearPanel(p){for(const b of p.baselines)b.destroy();for(const c of p.concepts)c.destroy();p.baselines=[];p.concepts=[];p.previousAge=-Infinity;}
  setup(p,signature,rank,evolved,fieldPositions){
    this.clearPanel(p);p.signature=signature;
    if(effect==='boss'||effect==='overlap'){
      const count=effect==='overlap'?1:signature.includes('salvo')?3:1;
      for(let i=0;i<count;i++){
        if(p.i){const c=new FireballConcept(this);p.concepts.push(c);c.objects.forEach(o=>o.setMask(p.mask));}
        else {
          const proxy=Object.create(this);proxy.objectPools={release:projectile=>projectile.deactivate()};
          const projectile=new EnemyProjectile(proxy);
          projectile.reset(0,0,0,{texture:'boss-fireball',radius:19,speed:238,life:4200,color:0xff6a28,trailColor:0xff3322,trailAlpha:.44,scale:1.55,depth:8,pulse:true,heavy:true,warningColor:0xff3048,source:'boss-fireball',tint:false});
          for(const o of [projectile.sprite,projectile.trail,projectile.dangerRing])o.setMask(p.mask);
          p.baselines.push({type:'boss',projectile,destroy:()=>projectile.dispose()});
        }
      }
    }
    if(effect==='molotov'||effect==='overlap')for(const pos of fieldPositions){
      if(p.i){const c=new MolotovConcept(this,p.x+pos.x,pos.y,rank,evolved);p.concepts.push(c);c.objects.forEach(o=>o.setMask(p.mask));}
      else {
        const clock=new Timeline(),bundle=trackedScene(this,p,clock);bundle.proxy.enemies=[];
        const zone=new HazardZone(bundle.proxy,p.x+pos.x,pos.y,rank,evolved);
        zone.heatSpots.forEach(s=>s.sprite.anims.stop());
        const ignition=bundle.proxy.add.image(p.x+pos.x,pos.y,'molotov-ignition').setBlendMode(Phaser.BlendModes.ADD).setDepth(8);
        const embers=bundle.proxy.add.image(p.x+pos.x,pos.y,'molotov-embers').setBlendMode(Phaser.BlendModes.ADD).setDepth(7.8);
        p.baselines.push({...bundle,type:'molotov',zone,ignition,embers,clock});
      }
    }
    if(effect==='laser'||effect==='overlap'){
      if(p.i){const c=new LaserConcept(this);p.concepts.push(c);c.objects.forEach(o=>o.setMask(p.mask));}
      else {
        const clock=new Timeline(),bundle=trackedScene(this,p,clock),laser=new LaserCombAbility(bundle.proxy);
        Object.assign(laser,{rank,evolved});laser.activate(0);p.baselines.push({...bundle,type:'laser',clock,laser});
      }
    }
  }
  draw(ms){
    const at=((ms%cycle)+cycle)%cycle;
    let rank=4,evolved=false,age=at-300,episode=0,positions=[{x:355,y:292}],label='';
    if(effect==='boss'){episode=at>=3000?1:0;age=at-(episode?3300:300);label=episode?'Drei Feuerbälle · Überlagerungsprobe':'Ein Feuerball · Flug → Einschlag';}
    if(effect==='laser'){
      episode=Math.floor(at/2000);age=at%2000-220;rank=episode===0?2:4;evolved=episode>=2;
    }
    if(effect==='molotov'){
      episode=at>=6000?1:0;age=at%6000-300;rank=episode?4:3;evolved=!!episode;
    }
    if(controls.rank!=='auto'&&effect!=='boss'&&effect!=='overlap'){evolved=controls.rank==='evo';rank=evolved?4:Number(controls.rank);}
    if(effect==='overlap'){evolved=true;rank=4;age=at-300;positions=[{x:320,y:208},{x:390,y:402}];label='EVO-Felder + Laser + Feuerball';}
    else if(effect==='molotov'&&(evolved||rank===4))positions=[{x:355,y:292-(evolved?112:92)},{x:355,y:292+(evolved?112:92)}];
    if(effect!=='boss'&&effect!=='overlap')label=evolved?'EVO':`R${rank}`;
    const signature=`${effect}-${episode}-${rank}-${evolved}-${effect==='boss'&&episode?'salvo':'single'}`;
    for(const p of this.panels){
      // Establish identical target anchors before the baseline takes its aiming snapshot.
      p.enemies.forEach((sprite,i)=>{
        const baseY=[290,260,330][i],baseX=[300,410,490][i],moving=effect==='molotov';
        sprite.setPosition(p.x+(moving?245+((at*.028+i*72)%235):baseX),moving?([200,298,397][i]):baseY).setFrame(Math.floor(at/100)%8);
      });
      if(p.signature!==signature||age<p.previousAge)this.setup(p,signature,rank,evolved,positions);
      p.previousAge=age;
      p.detail.setText(effect==='boss'?(p.i?'Flackernde Kontur · Glutspur · kompakter Treffer':'Festes Feuerbild · pulsierender Warnkreis'):
        effect==='laser'?(p.i?'Fließende Energie · kurze Kontaktfunken':'Aufladen · starre Strahlen · Ausblenden'):
        effect==='molotov'?(p.i?'Lockere Flammengruppen · Glut · offene Ränder':'Dichtes Flammenmuster · geschlossener Rand'):'Identische Choreografie · Lesbarkeit bei Überlagerung');
      p.state.setText(label);p.active=false;
      p.player.setFrame(16+Math.floor(at/350)%8);p.support.setFrame(Math.floor(at/110)%8);
      const laserAge=effect==='overlap'?(age-1000)%1700:age;
      const start={x:p.x+125,y:290},angle=Phaser.Math.Angle.Between(start.x,start.y,p.enemies[0].x,p.enemies[0].y);
      for(let i=0;i<p.baselines.length;i++){
        const b=p.baselines[i];
        if(b.type==='boss'){
          const shotAge=effect==='overlap'?age-1350:age-i*85,a=effect==='overlap'?.15:episode?(i-1)*.24:.07;
          const origin={x:p.x+(effect==='overlap'?180:155),y:effect==='overlap'?190:270},travel=1450;
          const visible=shotAge>=0&&shotAge<travel;
          [b.projectile.sprite,b.projectile.trail,b.projectile.dangerRing].forEach(o=>o.setVisible(visible));
          if(visible){Object.assign(b.projectile,{age:shotAge,life:4200-shotAge,angle:a});
            b.projectile.sprite.setPosition(origin.x+Math.cos(a)*shotAge*.238,origin.y+Math.sin(a)*shotAge*.238);b.projectile.update(0);}
          p.active ||=visible;
        }else if(b.type==='molotov'){
          const index=p.baselines.filter(x=>x.type==='molotov').indexOf(b),localAge=age-index*180;
          const visible=localAge>=0&&localAge<b.zone.maxLife;b.objects.forEach(o=>o.setVisible(visible));
          if(visible){
            Object.assign(b.zone,{age:localAge,life:b.zone.maxLife-localAge,extinguishing:localAge>=b.zone.maxLife-440,nextTickAt:Infinity,tickFlash:Math.max(0,1-(localAge%b.zone.tickMs)/180)});b.zone.update(0);
            b.zone.heatSpots.forEach((spot,j)=>spot.sprite.setFrame((j*3+Math.floor(localAge*.014))%12));
            const ignitionScale=evolved?.74:.48+rank*.055,emberScale=evolved?1.12:.68+rank*.08;
            const iq=clamp(localAge/(evolved?260:220)),eq=clamp(localAge/(evolved?360:300));
            b.ignition.setScale(ignitionScale*(.45+.55*(1-(1-iq)**2))).setAlpha(1-iq);
            b.embers.setScale(emberScale*(1+.24*Math.sin(eq*Math.PI/2)),emberScale*(1-.04*Math.sin(eq*Math.PI/2))).setAlpha((evolved?.7:.5)*(1-Math.sin(eq*Math.PI/2)));
          }p.active ||=visible;
        }else{
          // In overlap view a separate short timeline is rebuilt for each repeated shot.
          if(effect==='overlap'&&(laserAge<0||laserAge<b.clock.now)){
            b.destroy();const clock=new Timeline(),bundle=trackedScene(this,p,clock),laser=new LaserCombAbility(bundle.proxy);
            Object.assign(laser,{rank,evolved});laser.activate(0);Object.assign(b,{...bundle,clock,laser});
          }
          if(laserAge>=0)b.clock.advance(laserAge);
          b.objects.forEach(o=>{if(o.scene)o.setVisible(laserAge>=0);});
          p.active ||=laserAge>=0&&laserAge<650;
        }
      }
      p.concepts.forEach((c,i)=>{
        if(c instanceof FireballConcept){const a=effect==='overlap'?.15:episode?(i-1)*.24:.07;
          c.draw(effect==='overlap'?age-1350:age-i*85,{x:p.x+(effect==='overlap'?180:155),y:effect==='overlap'?190:270},a);}
        if(c instanceof MolotovConcept){const index=p.concepts.filter(x=>x instanceof MolotovConcept).indexOf(c);c.draw(age-index*180);}
        if(c instanceof LaserConcept)c.draw(laserAge,start,angle,rank,evolved,p.enemies);
        p.active ||=c.active;
      });
    }
    document.getElementById('phase').textContent=`${label} · ${(at/1000).toFixed(1)} s · Vorher links / Entwurf rechts`;
    document.getElementById('scrub').value=at;
  }
  update(_time,delta){if(!this.panels)return;if(!controls.paused&&controls.manual===null)controls.elapsed+=Math.min(delta,100)*controls.speed;this.draw(controls.manual??controls.elapsed);}
}
new Phaser.Game({type:query.get('renderer')==='canvas'?Phaser.CANVAS:Phaser.WEBGL,parent:'stage',width:1280,height:548,
  backgroundColor:'#141e19',antialias:true,pixelArt:false,roundPixels:false,audio:{noAudio:true},banner:false,
  physics:{default:'arcade',arcade:{debug:false}},scene:Study});
document.getElementById('pause').onclick=e=>{if(controls.manual!==null){controls.elapsed=controls.manual;controls.manual=null;}controls.paused=!controls.paused;e.currentTarget.textContent=controls.paused?'Abspielen':'Pause';};
document.getElementById('speed').onchange=e=>{controls.speed=Number(e.target.value);};
document.getElementById('rank').onchange=e=>window.combatStudy?.setRank(e.target.value);
document.getElementById('scrub').oninput=e=>{controls.manual=controls.elapsed=Number(e.target.value);controls.paused=true;document.getElementById('pause').textContent='Abspielen';window.combatStudy?.setTime(controls.elapsed);};
