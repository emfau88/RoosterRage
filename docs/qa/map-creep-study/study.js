import Phaser from 'phaser';
import layouts from './frame-layout.json';
import { getArenaArtTint } from '../../../src/config/mapArt.js';

const files = import.meta.glob(['../../../src/assets/enemies/animations/*.webp', '../../../src/assets/map/*.webp', '../../../src/assets/characters/ace-mascot/*idle.webp', './assets/*.png'], { eager: true, query: '?url', import: 'default' });
const url = name => Object.entries(files).find(([file]) => file.endsWith('/' + name))?.[1];
const query = new URLSearchParams(location.search), map = query.get('map') === 'coop' ? 'coop' : 'alley';
const cycle = 6400, controls = { elapsed: 0, manual: null, paused: false, speed: 1 };
const baseSpecial = map === 'alley' ? 'runner' : 'brute';
const skinSpecial = map === 'alley' ? 'alley-rammer' : 'coop-stomper-run';
const skinCommon = map + '-kornkrabbler', nativeScale = map === 'alley' ? .22 : .28;
const clamp = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * clamp(t);
const smooth = t => { t = clamp(t); return t*t*(3-2*t); };
const mix = (a,b,t) => ({x:lerp(a.x,b.x,t), y:lerp(a.y,b.y,t)});
const dirs = ['links', 'rechts', 'nach oben', 'nach unten'];
document.querySelector('#title').textContent = map === 'alley' ? 'Feed Alley · Rammer & Kornkrabbler' : 'Coop Square · Stampfer & Kornkrabbler';
document.querySelector(`[data-map="${map}"]`).setAttribute('aria-current','page');
if(query.has('capture')) document.body.classList.add('capture');

// Preview choreography only. No WaveSystem, Enemy or combat code is imported or modified.
function playerPosition(t) {
  const start = map === 'alley' ? {x:421,y:462} : {x:338,y:463};
  const dodge = map === 'alley' ? {x:452,y:375} : {x:410,y:385};
  if(t<1350) return start;
  if(t<2050) return mix(start,dodge,smooth((t-1350)/700));
  if(t<2900) return dodge;
  if(t<4700) return mix(dodge,{x:250,y:382},(t-2900)/1800);
  return mix({x:250,y:382},start,smooth((t-4700)/1400));
}
function specialPosition(t,after) {
  const start = map === 'alley' ? {x:138,y:465} : {x:204,y:463};
  if(!after) {
    if(t<1700) return mix(start,{x:map==='alley'?331:300,y:450},t/1700);
    if(t<3300) return mix({x:map==='alley'?331:300,y:450},{x:407,y:386},(t-1700)/1600);
    if(t<4850) return mix({x:407,y:386},{x:275,y:387},(t-3300)/1550);
    return mix({x:275,y:387},start,smooth((t-4850)/1400));
  }
  const ready = map==='alley' ? {x:228,y:465} : {x:263,y:463};
  if(t<1000) return mix(start,ready,t/1000);
  if(t<1700) return ready;
  const end = map==='alley' ? {x:448,y:465} : ready;
  if(t<2250) return mix(ready,end,(t-1700)/550);
  if(t<2800) return end;
  if(t<4700) return mix(end,{x:285,y:396},(t-2800)/1900);
  return mix({x:285,y:396},start,smooth((t-4700)/1500));
}
function facingAt(fn,t) { const a=fn(t),b=fn(t+24),dx=b.x-a.x,dy=b.y-a.y; return Math.abs(dy)>Math.abs(dx)?(dy<0?2:3):(dx<0?0:1); }

class Study extends Phaser.Scene {
  preload() {
    for(const key of ['runner','brute','kornkrabbler']) this.load.spritesheet(key,url(`enemy-${key}-run.webp`),{frameWidth:256,frameHeight:256});
    this.load.spritesheet('stomp',url('enemy-brute-stomp.webp'),{frameWidth:256,frameHeight:256});
    this.load.spritesheet('ace',url('rooster-ace-mascot-idle.webp'),{frameWidth:256,frameHeight:256});
    for(const key of Object.keys(layouts)) this.load.image(key,url(key+'.png'));
    this.load.image('road',url('arena-ground-road.webp'));
    this.load.image('coop',url('coop-square-ground.webp'));
    this.load.image('hay',url('coop-square-hay-stack.webp'));
    this.load.image('trough',url('coop-square-trough.webp'));
  }
  create() {
    for(const [key,layout] of Object.entries(layouts)) layout.frames.forEach((f,i)=>this.textures.get(key).add(i,0,f.x,f.y,f.size,f.size));
    this.panels=[];
    for(let i=0;i<2;i++) {
      const x=i*640,after=Boolean(i),text=(dx,y,value,size=14,color='#eee9d8')=>this.add.text(x+dx,y,value,{fontFamily:'Arial',fontSize:size,color,fontStyle:size>=18?'bold':'normal'}).setDepth(50);
      this.add.rectangle(x+320,310,638,620,0x18231a);
      text(24,13,after?'NACHHER · VORSCHLAG':'VORHER · AKTUELL',20,after?'#e0efb0':'#eee9d8');
      text(24,40,after?'Ein Gegner mit neuer Rolle + ein häufiger Gegner mit neuem Skin':'Vorhandene Figuren · bisherige Verfolgerrolle',13,'#b8c7ad');
      this.add.rectangle(x+320,163,638,192,0x22312a);
      this.add.line(x,0,320,80,320,241,0x52634b,.5).setOrigin(0);
      text(24,77,after?(map==='alley'?'Rammer':'Stampfer'):(map==='alley'?'Runner':'Brute'),18);
      text(350,77,'Kornkrabbler',18);
      const direction=text(24,237,'Detailansicht · 2,5×',12,'#b5c5ac');
      text(350,237,after?'Nur Skin · Verhalten unverändert':'Häufiger kleiner Gegner',12,'#b5c5ac');
      text(24,270,'IM SPIEL · ORIGINALMASSSTAB',12,'#d3dfc1');
      const state=text(616,270,'',12,'#f6d498').setOrigin(1,0);
      const maskShape=this.make.graphics({x:0,y:0,add:false}).fillStyle(0xffffff).fillRect(x+1,294,638,304);
      const mask=maskShape.createGeometryMask();
      const ground=this.add.image(x+320,444,map==='alley'?'road':'coop').setDepth(1).setMask(mask).setTint(getArenaArtTint(map==='alley'?'vertical-run':'square-coop'));
      // Native-size crop of actual map art; no shrinking the arena to fit a card.
      if(map==='coop') ground.setPosition(x+700,694);
      if(map==='coop') {
        this.add.image(x+83,346,'hay').setDisplaySize(116,74).setDepth(2).setMask(mask);
        this.add.image(x+548,548,'trough').setDisplaySize(118,66).setDepth(2).setMask(mask);
      }
      const detailSpecial=this.add.sprite(x+153,163,after?skinSpecial:baseSpecial,0).setDepth(5);
      const detailCommon=this.add.sprite(x+467,164,after?skinCommon:'kornkrabbler',0).setDepth(5);
      const special=this.add.sprite(x+138,465,after?skinSpecial:baseSpecial,4).setDepth(8).setMask(mask);
      const player=this.add.sprite(x+421,462,'ace',16).setScale(.25).setDepth(8).setMask(mask);
      const common=Array.from({length:7},()=>this.add.sprite(0,0,after?skinCommon:'kornkrabbler',0).setDepth(7).setMask(mask));
      const shadows=this.add.graphics().setDepth(3).setMask(mask),fx=this.add.graphics().setDepth(4).setMask(mask),frontFx=this.add.graphics().setDepth(9).setMask(mask);
      const warning=text(228,400,'!',21,'#fff0a5').setOrigin(.5).setVisible(false).setMask(mask);
      text(24,606,after?(map==='alley'?'Vorwarnen → gerader Sprint → kurze Erholung':'Anhalten → kleiner Bodenstampfer → kurze Erholung'):'Normales Verfolgen · keine neue Spezialaktion',12,'#bbc9b1');
      this.panels.push({i,x,after,direction,state,detailSpecial,detailCommon,special,player,common,shadows,fx,frontFx,warning});
    }
    window.creepStudy={ready:true,setTime:ms=>{controls.manual=ms;this.draw(ms);},describe:()=>this.describe()};
    this.draw(0);
  }
  spriteFrame(sprite,key,frame,scale) {
    sprite.setTexture(key,frame);
    const f=layouts[key]?.frames[frame];
    sprite.setScale(f?256/f.size*scale:scale).setOrigin(f?.pivotX??.5,f?.pivotY??.5);
  }
  draw(ms) {
    const t=((ms%cycle)+cycle)%cycle,dir=Math.floor(t/1600),warn=t>=1000&&t<1700;
    const dash=map==='alley'&&t>=1700&&t<2250,hit=map==='coop'&&t>=1700&&t<2240;
    const recovery=t>=2250&&t<2800;
    for(const p of this.panels) {
      const after=p.after,sp=specialPosition(t,after),pl=playerPosition(t),fade=1-clamp((t-5900)/350);
      // Loop reset is hidden with a short fade; the real in-game state machine would continue pursuit.
      const loopAlpha=t<180?lerp(.15,1,t/180):Math.max(.15,fade);
      const movingDir=facingAt(at=>specialPosition(at,after),t),fps=map==='alley'?10:7;
      this.spriteFrame(p.detailSpecial,after?skinSpecial:baseSpecial,dir*4+Math.floor(t/1000*fps)%4,nativeScale*2.5);
      this.spriteFrame(p.detailCommon,after?skinCommon:'kornkrabbler',dir*4+Math.floor(t/1000*11)%4,.2*2.5);
      p.direction.setText(`Detail · 2,5× · ${dirs[dir]}`);
      let key=after?skinSpecial:baseSpecial,frame=movingDir*4+Math.floor(t/1000*fps)%4;
      if(after&&map==='alley'&&(warn||recovery)) frame=4+(warn?1:0);
      if(after&&map==='coop'&&t>=1000&&t<2800) {
        key='coop-stomper-stomp';
        frame=t<1400?0:t<1700?1:t<2050?2:t<2420?1:0;
      }
      this.spriteFrame(p.special,key,frame,nativeScale);
      p.special.setPosition(p.x+sp.x,sp.y).setAlpha(loopAlpha);
      if(after&&warn&&map==='alley') p.special.x+=Math.sin(t*.06)*.6;
      p.player.setPosition(p.x+pl.x,pl.y).setFrame(16+Math.floor(t/160)%8).setAlpha(loopAlpha);
      p.shadows.clear().fillStyle(0x332c24,.2);
      p.shadows.fillEllipse(p.x+sp.x,sp.y+24,map==='alley'?36:47,11).fillEllipse(p.x+pl.x,pl.y+24,33,10);
      p.common.forEach((s,j)=>{
        const a=t/cycle*Math.PI*2+j*.7;
        const cx=114+j*65+Math.sin(a)*30,cy=535+Math.sin(j*1.5)*21+Math.cos(a)*19;
        const d=Math.cos(a)<0?0:1,fr=d*4+(Math.floor(t*.011)+j)%4;
        this.spriteFrame(s,after?skinCommon:'kornkrabbler',fr,.2);s.setPosition(p.x+cx,cy);
        p.shadows.fillEllipse(s.x+1,s.y+12,20,6);
      });
      p.fx.clear();p.frontFx.clear();p.warning.setVisible(after&&warn).setPosition(p.x+sp.x,sp.y-(map==='alley'?43:50));
      p.state.setText(!after?'Verfolgen':warn?'Vorwarnung · 0,7 s':dash?'Sprint · feste Richtung':hit?'Nahbereich · Bodenstoß':recovery?'Erholungsfenster':'Normales Verfolgen');
      if(after&&map==='alley') this.rammerFx(p,t,sp,warn,dash);
      if(after&&map==='coop') this.stompFx(p,t,sp,warn,hit);
    }
    document.querySelector('#scrub').value=Math.floor(t);
  }
  rammerFx(p,t,sp,warn,dash) {
    const g=p.fx,x=p.x+228,y=488;
    if(warn) {
      const u=(t-1000)/700;
      g.lineStyle(2,0xffd080,.25+.5*u);
      for(let i=0;i<3;i++){const cx=x+61+i*57;g.beginPath().moveTo(cx-8,y-6).lineTo(cx,y).lineTo(cx-8,y+6).strokePath();}
      g.lineStyle(2,0xffd680,.7).beginPath().moveTo(x+17,y).lineTo(x+42,y).strokePath();
    }
    if(dash) {
      const phase=(t-1700)/550;
      for(let j=0;j<5;j++) {
        const u=(phase*2+j*.17)%1,px=p.x+sp.x-20-u*58,py=sp.y+23+(j%2?3:-3);
        g.fillStyle(0xe5c18b,(1-u)*.48).fillEllipse(px,py,7+u*9,4+u*4);
      }
      p.frontFx.lineStyle(2,0xe5f3ff,.65);
      for(let j=0;j<3;j++) p.frontFx.beginPath().moveTo(p.x+sp.x-24-j*5,sp.y-12+j*9).lineTo(p.x+sp.x-38-j*7,sp.y-12+j*9).strokePath();
    }
  }
  stompFx(p,t,sp,warn,hit) {
    const g=p.fx,x=p.x+263,y=484,r=76;
    if(warn) {
      const u=(t-1000)/700;
      g.fillStyle(0xffa44b,.035+u*.035).fillEllipse(x,y,r*2,r*1.14);
      g.lineStyle(2,0xffb857,.35+u*.45);
      for(let j=0;j<12;j++){const a=j*Math.PI/6,b=a+.22;g.beginPath();for(let k=0;k<=6;k++){const q=lerp(a,b,k/6),px=x+Math.cos(q)*r,py=y+Math.sin(q)*r*.57;k?g.lineTo(px,py):g.moveTo(px,py);}g.strokePath();}
    }
    if(hit) {
      const u=(t-1700)/540,rr=r*Math.sin(Math.min(1,u*1.45)*Math.PI/2);
      g.lineStyle(3*(1-u)+1,0xffde95,(1-u)*.85).strokeEllipse(x,y,rr*2,rr*1.14);
      for(let j=0;j<9;j++) {
        const a=j*Math.PI*2/9+.3,dist=17+u*(40+j%3*5),px=x+Math.cos(a)*dist,py=y+Math.sin(a)*dist*.57;
        g.fillStyle(0xa77d52,(1-u)*.5).fillEllipse(px,py,7+u*10,4+u*6);
        const lift=Math.sin(u*Math.PI)*(9+j%3*5);
        p.frontFx.fillStyle(j%2?0xe5c18b:0xb78e63,1-u).fillTriangle(px-2,py-lift,px+3,py-lift+1,px,py-lift-4);
      }
    }
  }
  describe() {
    const sprites=this.panels.flatMap(p=>[p.detailSpecial,p.detailCommon,p.special,p.player,...p.common]);
    return {map,cycle,elapsed:controls.manual??controls.elapsed,paused:controls.paused,speed:controls.speed,renderer:this.game.renderer.type===Phaser.WEBGL?'WEBGL':'CANVAS',objects:this.children.list.length,finite:sprites.every(s=>[s.x,s.y,s.scaleX,s.scaleY,s.alpha].every(Number.isFinite)),uniform:sprites.every(s=>Math.abs(s.scaleX-s.scaleY)<1e-9),panels:this.panels.map(p=>({state:p.state.text,special:{key:p.special.texture.key,frame:p.special.frame.name,x:p.special.x-p.x,y:p.special.y,width:p.special.displayWidth},detailFrame:p.detailSpecial.frame.name,commonFrames:p.common.map(s=>s.frame.name)})),previewOnly:true};
  }
  update(_time,delta) { if(controls.manual!==null||controls.paused)return;controls.elapsed=(controls.elapsed+Math.min(delta,70)*controls.speed)%cycle;this.draw(controls.elapsed); }
}
const scene=new Study();
new Phaser.Game({type:query.get('renderer')==='canvas'?Phaser.CANVAS:Phaser.WEBGL,width:1280,height:620,parent:'stage',backgroundColor:'#141e19',scene,render:{antialias:true,pixelArt:false,roundPixels:false},audio:{noAudio:true},banner:false});
document.querySelector('#pause').addEventListener('click',event=>{if(controls.manual!==null){controls.elapsed=controls.manual;controls.manual=null;controls.paused=false;}else controls.paused=!controls.paused;event.target.textContent=controls.paused?'Abspielen':'Pause';});
document.querySelector('#speed').addEventListener('change',event=>{controls.speed=Number(event.target.value);});
document.querySelector('#scrub').addEventListener('input',event=>{controls.paused=true;controls.manual=Number(event.target.value);scene.draw(controls.manual);document.querySelector('#pause').textContent='Abspielen';});
