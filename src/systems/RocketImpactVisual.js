import Phaser from 'phaser';
import layouts from '../assets/fx/rocket-modular/impact-layout.json';

// Approved impact-study-v3 choreography, shared textures and scene-owned lifetime.
// One ground plane: circular motion is projected to ellipses (Y = 0.46 X).
// Vertical height is applied independently from ground depth.
const TAU = Math.PI * 2;
const clamp = (v) => Math.max(0, Math.min(1, v));
const out = (v) => 1 - (1 - clamp(v)) ** 3;
const rand = (i, seed = 0) => { const n = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return n - Math.floor(n); };
const life = (t, start, duration) => (t - start) / duration;
const live = (p) => p >= 0 && p < 1;

export const STAGES = [
  {id:'r1',rank:1,label:'R1 · Splitterstoß',note:'Kurzer Feuerstoß · helle Schalenfragmente',radius:82,duration:1250,sparks:12,debris:7,smoke:4},
  {id:'r2',rank:2,label:'R2 · Druckdetonation',note:'Breiter Feuerball · rollende Bodenwelle',radius:100,duration:1450,sparks:20,debris:10,smoke:7},
  {id:'r3',rank:3,label:'R3 · Cluster-Kaskade',note:'Drei versetzte Nebendetonationen',radius:118,duration:1650,sparks:22,debris:9,smoke:8},
  {id:'r4',rank:4,label:'R4 · Schwerer Durchschlag',note:'Kompakter Ausbruch · schwere Splitter',radius:132,duration:1700,sparks:28,debris:11,smoke:7},
  {id:'evo',rank:5,label:'EVO · Broodstorm',note:'Offene Feuerkrone · Druckimpulse · aufsteigende Glut',radius:158,duration:2100,sparks:44,debris:13,smoke:9}
];

export function prepareRocketImpactTextures(scene) {
  if (scene.textures.exists('rocket-impact-eruption-frames')) {
    scene.impactFrameChecks = ['blast', 'eruption'].flatMap(key =>
      scene.textures.get(`rocket-impact-${key}-frames`).impactFrameChecks);
    return;
  }
  scene.impactFrameChecks = [];
  for (const key of ['blast','eruption']) {
    const tex=scene.textures.get(`rocket-impact-${key}`), source=tex.getSourceImage();
    const w=320,h=400;
    const atlas=scene.textures.createCanvas(`rocket-impact-${key}-frames`,w*4,h*3),ctx=atlas.getContext();
    // Register frames without changing their aspect ratio. All frames use one
    // common scale, preserving the ignition-to-peak size change in the artwork.
    const sample=document.createElement('canvas');
    const scan=sample.getContext('2d',{willReadFrequently:true});
    const frames=layouts[key].frames.map(([sx,sy,sw,sh])=>{
      sample.width=sw;sample.height=sh;scan.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
      const pixels=scan.getImageData(0,0,sw,sh).data;let left=sw,right=0,top=sh,bottom=0;
      for(let py=0;py<sh;py++)for(let px=0;px<sw;px++)if(pixels[(py*sw+px)*4+3]>32){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
      return {sx,sy,sw,sh,left,right,top,bottom};
    });
    const commonScale=Math.min(1,280/Math.max(...frames.map(f=>f.right-f.left+1)),288/Math.max(...frames.map(f=>f.bottom-f.top+1)));
    for(let i=0;i<12;i++){
      const x=(i%4)*w,y=Math.floor(i/4)*h;
      const {sx,sy,sw,sh,left,right,top,bottom}=frames[i];
      scene.impactFrameChecks.push({key,frame:i,sourceRect:[sx,sy,sw,sh],silhouette:[left,top,right,bottom],
        sourceUnclipped:left>1&&top>1&&right<sw-2&&bottom<sh-2,
        normalizedUnclipped:(right-left)*commonScale<w-4&&(bottom-top)*commonScale<h*.78-4,
        commonScale,normalizedWidth:(right-left+1)*commonScale,normalizedHeight:(bottom-top+1)*commonScale});
      ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      ctx.drawImage(source,sx,sy,sw,sh,x+w/2-(left+right)/2*commonScale,y+h*.78-bottom*commonScale,sw*commonScale,sh*commonScale);ctx.restore();
      atlas.add(i,0,x,y,w,h);
    }
    atlas.impactFrameChecks = scene.impactFrameChecks.filter(frame => frame.key === key);
    atlas.refresh();
  }
  for(const [key,stops] of Object.entries({
    glow:[[0,'rgba(255,250,196,1)'],[.2,'rgba(255,190,66,.8)'],[.6,'rgba(255,93,16,.3)'],[1,'rgba(255,74,0,0)']],
    smoke:[[0,'rgba(112,96,83,.5)'],[.35,'rgba(83,77,69,.4)'],[.68,'rgba(65,63,56,.18)'],[1,'rgba(57,59,52,0)']],
    dust:[[0,'rgba(214,180,120,.42)'],[.4,'rgba(189,156,100,.25)'],[1,'rgba(155,136,89,0)']]
  })) {
    const t=scene.textures.createCanvas(`rocket-impact-${key}`,96,96),ctx=t.getContext();
    const g=ctx.createRadialGradient(48,48,0,48,48,47);
    for(const [at,color] of stops)g.addColorStop(at,color);
    ctx.fillStyle=g;ctx.fillRect(0,0,96,96);t.refresh();
  }
}

export class RocketImpactVisual {
  constructor(scene,x,y,spec,onDestroy) {
    prepareRocketImpactTextures(scene);
    Object.assign(this,{scene,x,y,spec,onDestroy,active:true,startedAt:scene.time.now});
    this.evo=spec.id==='evo';this.graphics=scene.add.graphics().setDepth(5);
    this.light=scene.add.image(x,y,'rocket-impact-glow').setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.core=scene.add.image(x,y-5,'rocket-impact-glow').setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    const sizes=[116,156,134,174,235];
    this.bursts=[this.makeBurst(0,0,0,sizes[spec.rank-1],this.evo?800:310+spec.rank*55,this.evo)];
    if(spec.rank===3||spec.rank===4){
      for(let i=0;i<3;i++){
        const a=i*TAU/3-Math.PI/2;
        // Same cluster locations and delays as the gameplay; only the art evolves.
        this.bursts.push(this.makeBurst(Math.cos(a)*spec.radius*.52,Math.sin(a)*spec.radius*.4,
          70+i*72,spec.rank===4?93:82,350+spec.rank*27,false));
      }
    }
    this.puffs=Array.from({length:spec.smoke},(_,i)=>scene.add.image(x,y,'rocket-impact-smoke').setDepth(6+(i%3)*.01));
    this.dust=Array.from({length:spec.rank<2?4:this.evo?14:spec.rank*3},()=>scene.add.image(x,y,'rocket-impact-dust').setDepth(3.5));
    this.draw(0);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  update() {
    if (!this.active || this.scene.gamePause?.isPaused) return;
    const age = this.scene.time.now - this.startedAt;
    if (age >= this.spec.duration) { this.destroy(); return; }
    this.draw(age);
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    for (const object of [this.graphics, this.light, this.core,
      ...this.bursts.map(b => b.sprite), ...this.puffs, ...this.dust]) object.destroy();
    this.onDestroy?.(this);
    this.scene = null;
  }

  makeBurst(dx,dy,start,size,duration,evo){
    const tint=evo?0xfff4cd:this.spec.rank===4?0xffbb88:this.spec.rank===2?0xffdca9:0xffffff;
    return {dx,dy,start,size,duration,evo,sprite:this.scene.add.image(this.x+dx,this.y+dy,evo?'rocket-impact-eruption-frames':'rocket-impact-blast-frames',0)
      .setOrigin(.5,.78).setTint(tint).setDepth(8+dy*.005)};
  }

  draw(ms){
    this.age=ms;const {rank,radius,sparks,debris}=this.spec,evo=this.evo,g=this.graphics;
    const t=ms/1000,active=ms>=0&&ms<this.spec.duration;
    g.clear();this.light.setVisible(active);this.core.setVisible(active&&ms<180);
    const lightP=clamp(ms/(evo?420:310));
    this.light.setDisplaySize(radius*(evo?2.5:1.9),radius*(evo?1.15:.87))
      .setAlpha(active?(1-lightP)**2*(evo?.42:.3):0);
    this.core.setDisplaySize((evo?64:22+rank*5)*(1+out(ms/90)),(evo?44:18+rank*3)*(1+out(ms/90)))
      .setAlpha(active?(1-clamp(ms/140))**2*.82:0);
    for(const b of this.bursts){
      const p=life(ms,b.start,b.duration),visible=live(p);
      b.sprite.setVisible(visible);
      if(visible){
        const punch=1+Math.sin(clamp(p*3)*Math.PI)*.035;
        b.sprite.setFrame(Math.min(11,Math.floor(p*12))).setScale(b.size/320*punch)
          .setPosition(this.x+b.dx,this.y+b.dy-out((p-.52)/.48)*(b.evo?42:19))
          .setAlpha(1-clamp((p-.53)/.47)**1.35);
      }
    }
    for(let i=0;i<this.puffs.length;i++){
      const p=life(ms,180+rand(i,rank)*170,evo?1050:680+rank*55),visible=live(p);
      const s=this.puffs[i];s.setVisible(visible);
      if(!visible)continue;
      const a=rand(i,8)*TAU,spread=radius*(.14+rand(i,9)*.36)*out(p);
      const height=Math.sin(p*Math.PI*.7)*(evo?95:20+rank*11)*(0.4+rand(i,10));
      const size=(evo?34:16+rank*4)*(0.8+rand(i,11))*(.7+p*1.25);
      s.setPosition(this.x+Math.cos(a)*spread,this.y+Math.sin(a)*spread*.46-height)
        .setDisplaySize(size,size).setAlpha(Math.sin(Math.PI*p)**1.3*(evo?.35:.27));
    }
    for(let i=0;i<this.dust.length;i++){
      const p=life(ms,rank===1?30:55+(i%3)*9,evo?650:370+rank*42),visible=live(p),s=this.dust[i];
      s.setVisible(visible);if(!visible)continue;
      const a=i/this.dust.length*TAU,spread=radius*(.2+out(p)*(evo?1.07:.85));
      const size=(evo?28:10+rank*3)*(1+p*.8);
      s.setPosition(this.x+Math.cos(a)*spread,this.y+Math.sin(a)*spread*.46)
        .setDisplaySize(size,size*.48).setAlpha(Math.sin(p*Math.PI)**.7*(evo?.52:.4));
    }
    if(!active)return;

    // Soft, broken pressure fronts lie on the ground; never a permanent ring.
    const waves=evo?[0,145]:rank===1?[]:rank===4?[0,90]:[0];
    for(let wi=0;wi<waves.length;wi++){
      const p=life(ms,waves[wi],evo?570:350+rank*25);if(!live(p))continue;
      const r=radius*(.12+out(p)*(evo?1.16:.98));
      for(let j=0;j<4;j++){
        const a=j/4*TAU+.1,alpha=(1-p)**1.6*(.55+rand(j,wi)*.4);
        const points=[];
        for(let k=0;k<=18;k++){
          const th=a+k/18*(TAU/4*.83),n=1+Math.sin(th*7+wi)*.018;
          points.push({x:this.x+Math.cos(th)*r*n,y:this.y+Math.sin(th)*r*.46*n});
        }
        g.lineStyle((evo?5:rank*.6+1)*(1-p)+.5,wi?0xffb13d:0xffdf91,alpha*.6).strokePoints(points,false);
      }
    }

    // Ballistic shell/metal shards: ground displacement plus an independent height arc.
    for(let i=0;i<debris;i++){
      const duration=.48+rank*.045+rand(i,2)*.25,p=life(t,rand(i,3)*.055,duration);if(!live(p))continue;
      const a=rand(i,4)*TAU,distance=radius*(.35+rand(i,5)*.5)*out(p);
      const groundX=this.x+Math.cos(a)*distance,groundY=this.y+Math.sin(a)*distance*.46;
      const height=Math.sin(p*Math.PI)*(rank===1?30:evo?105:35+rank*9)*(0.4+rand(i,6));
      const size=(rank===1?4.5:3.5+rank*.4)*(1-p*.5),rot=t*(8+i%4)*(i%2?-1:1)+i;
      g.fillStyle(0x24251b,(1-p)*.18).fillEllipse(groundX,groundY,size*2.1,size*.8);
      g.save().translateCanvas(groundX,groundY-height).rotateCanvas(rot);
      g.fillStyle(rank===1?0xffedc3:evo?0xffb539:0x6d4930,(1-p)**.6);
      g.fillTriangle(-size,-size*.65,size,-size*.2,-size*.1,size);
      g.lineStyle(.8,rank===1?0xffffff:0xffdb78,(1-p)**1.3).lineBetween(-size,-size*.65,size,-size*.2);
      g.restore();
    }

    // Sparks follow different arcs; EVO's longer ascent reads as falling ember rain.
    for(let i=0;i<sparks;i++){
      const start=evo?rand(i,15)*.26:rand(i,15)*.06;
      const duration=(evo?.85:.36+rank*.045)+rand(i,16)*(evo?.7:.34),p=life(t,start,duration);
      if(!live(p))continue;
      const a=i*2.399963,reach=radius*(.32+rand(i,17)*.65);
      const px=this.x+Math.cos(a)*reach*out(p);
      const height=Math.sin(p*Math.PI)*(evo?85+rand(i,18)*105:20+rank*9+rand(i,18)*25);
      const py=this.y+Math.sin(a)*reach*.46*out(p)-height;
      const alpha=(1-p)**.7,size=(evo?2.4:1.5)*(1-p*.55),color=i%4?0xffd576:0xfff3ce;
      g.lineStyle(size*2.2,0xff7f24,alpha*.15).lineBetween(px,py+5,px-Math.cos(a)*5,py+13);
      g.lineStyle(size,color,alpha*.9).lineBetween(px,py,px-Math.cos(a)*(evo?7:4)*(1-p),py+3+5*(1-p));
      if(evo&&i%6===0){g.fillStyle(0xffefb5,alpha).fillCircle(px,py,size*.9);}
    }

    // Broken molten traces fade on the ground after the heavy blasts.
    if(rank>=4){
      const p=life(ms,120,evo?1550:850);
      if(live(p))for(let i=0;i<(evo?11:7);i++){
        const a=i*2.399+rank,r=radius*(.22+rand(i,21)*.48),alpha=Math.sin(Math.PI*p)**.7;
        g.lineStyle(evo?2.1:1.4,0xff9c32,alpha*.32);
        const x=this.x+Math.cos(a)*r*.35,y=this.y+Math.sin(a)*r*.35*.46;
        g.beginPath().moveTo(x,y).lineTo(this.x+Math.cos(a+.1)*r*.7,this.y+Math.sin(a+.1)*r*.7*.46)
          .lineTo(this.x+Math.cos(a)*r,this.y+Math.sin(a)*r*.46).strokePath();
      }
    }
  }

  describe(){return {stage:this.spec.id,age:this.age,objects:3+this.bursts.length+this.puffs.length+this.dust.length,
    visibleFrames:this.bursts.filter(b=>b.sprite.visible).map(b=>Number(b.sprite.frame.name)),
    volumeScales:this.bursts.filter(b=>b.sprite.visible).map(b=>({x:b.sprite.scaleX,y:b.sprite.scaleY})),
    peakOpaqueWidth:Math.max(...this.scene.impactFrameChecks.filter(f=>f.key===(this.evo?'eruption':'blast')).map(f=>f.normalizedWidth))*this.bursts[0].size/320*1.035,
    active:this.age>=0&&this.age<this.spec.duration,duration:this.spec.duration};}
}
