import Phaser from 'phaser';

// Review-only choreography. Nothing imports this module from the game.
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
  {id:'r4',rank:4,label:'R4 · Schwerer Durchschlag',note:'Wuchtige Feuerfront · Splitter und Staub',radius:132,duration:1900,sparks:32,debris:14,smoke:12},
  {id:'evo',rank:5,label:'EVO · Broodstorm',note:'Goldene Feuerkrone · doppelte Druckwelle · Glutregen',radius:158,duration:2350,sparks:52,debris:18,smoke:17}
];

export function prepareTextures(scene) {
  for (const key of ['blast','eruption']) {
    const tex=scene.textures.get(`study-${key}`), source=tex.getSourceImage();
    const w=320,h=400;
    const atlas=scene.textures.createCanvas(`study-${key}-frames`,w*4,h*3),ctx=atlas.getContext();
    // Generated frames may drift within their cells. Register the silhouettes to
    // the ground anchor once, so the explosion never jumps between frames.
    const sample=document.createElement('canvas');
    const scan=sample.getContext('2d',{willReadFrequently:true});
    // The 4×3 source layout is visually regular but not pixel-exact. These
    // inspected empty gutters retain every complete silhouette, including EVO.
    const columns=key==='eruption'?[0,304,598,887,1200]:[0,300,595,890,1200];
    const rows=[0,460,810,1200];
    scene.impactFrameChecks??=[];
    for(let i=0;i<12;i++){
      const col=i%4,row=Math.floor(i/4),x=col*w,y=row*h,sx=columns[col],sy=rows[row];
      const sw=columns[col+1]-sx,sh=rows[row+1]-sy;
      sample.width=sw;sample.height=sh;scan.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
      const pixels=scan.getImageData(0,0,sw,sh).data;let left=sw,right=0,top=sh,bottom=0;
      for(let py=0;py<sh;py++)for(let px=0;px<sw;px++)if(pixels[(py*sw+px)*4+3]>32){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
      scene.impactFrameChecks.push({key,frame:i,sourceRect:[sx,sy,sw,sh],silhouette:[left,top,right,bottom],
        sourceUnclipped:left>1&&top>1&&right<sw-2&&bottom<sh-2,normalizedUnclipped:right-left<w-4&&bottom-top<h*.78-4});
      ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      ctx.drawImage(sample,x+w/2-(left+right)/2,y+h*.78-bottom);ctx.restore();
      atlas.add(i,0,x,y,w,h);
    }
    atlas.refresh();
  }
  for(const [key,stops] of Object.entries({
    glow:[[0,'rgba(255,250,196,1)'],[.2,'rgba(255,190,66,.8)'],[.6,'rgba(255,93,16,.3)'],[1,'rgba(255,74,0,0)']],
    smoke:[[0,'rgba(112,96,83,.5)'],[.35,'rgba(83,77,69,.4)'],[.68,'rgba(65,63,56,.18)'],[1,'rgba(57,59,52,0)']],
    dust:[[0,'rgba(214,180,120,.42)'],[.4,'rgba(189,156,100,.25)'],[1,'rgba(155,136,89,0)']]
  })) {
    const t=scene.textures.createCanvas(`study-${key}`,96,96),ctx=t.getContext();
    const g=ctx.createRadialGradient(48,48,0,48,48,47);
    for(const [at,color] of stops)g.addColorStop(at,color);
    ctx.fillStyle=g;ctx.fillRect(0,0,96,96);t.refresh();
  }
}

export class ImpactProposal {
  constructor(scene,x,y,spec) {
    Object.assign(this,{scene,x,y,spec});
    this.evo=spec.id==='evo';this.graphics=scene.add.graphics().setDepth(5);
    this.light=scene.add.image(x,y,'study-glow').setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.core=scene.add.image(x,y-5,'study-glow').setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    const sizes=[142,195,178,242,340];
    this.bursts=[this.makeBurst(0,0,0,sizes[spec.rank-1],this.evo?1120:360+spec.rank*68,this.evo)];
    if(spec.rank===3||spec.rank===4){
      for(let i=0;i<3;i++){
        const a=i*TAU/3-Math.PI/2;
        // Same cluster locations and delays as the gameplay; only the art evolves.
        this.bursts.push(this.makeBurst(Math.cos(a)*spec.radius*.52,Math.sin(a)*spec.radius*.4,
          70+i*72,spec.rank===4?128:112,430+spec.rank*32,false));
      }
    }
    this.puffs=Array.from({length:spec.smoke},(_,i)=>scene.add.image(x,y,'study-smoke').setDepth(6+(i%3)*.01));
    this.dust=Array.from({length:spec.rank<2?4:this.evo?24:spec.rank*4},()=>scene.add.image(x,y,'study-dust').setDepth(3.5));
    this.draw(-1);
  }

  makeBurst(dx,dy,start,size,duration,evo){
    const tint=evo?0xfff4cd:this.spec.rank===4?0xffbb88:this.spec.rank===2?0xffdca9:0xffffff;
    return {dx,dy,start,size,duration,evo,sprite:this.scene.add.image(this.x+dx,this.y+dy,evo?'study-eruption-frames':'study-blast-frames',0)
      .setOrigin(.5,.78).setTint(tint).setDepth(8+dy*.005)};
  }

  draw(ms){
    this.age=ms;const {rank,radius,sparks,debris}=this.spec,evo=this.evo,g=this.graphics;
    const t=ms/1000,active=ms>=0&&ms<this.spec.duration;
    g.clear();this.light.setVisible(active);this.core.setVisible(active&&ms<180);
    const lightP=clamp(ms/(evo?1100:650));
    this.light.setDisplaySize(radius*(evo?3.5:2.5),radius*(evo?1.6:1.15))
      .setAlpha(active?(1-lightP)**2*(evo?.75:.48):0);
    this.core.setDisplaySize((evo?118:52+rank*6)*(1+out(ms/100)),(evo?82:30+rank*5)*(1+out(ms/100)))
      .setAlpha(active?(1-clamp(ms/180))**2*.95:0);
    for(const b of this.bursts){
      const p=life(ms,b.start,b.duration),visible=live(p);
      b.sprite.setVisible(visible);
      if(visible){
        const heavy=rank===4&&b===this.bursts[0];
        const punch=1+Math.sin(clamp(p*3)*Math.PI)*.055;
        b.sprite.setFrame(Math.min(11,Math.floor(p*12))).setDisplaySize(b.size*(heavy?1.2:1)*punch,b.size*(b.evo?.82:heavy?.7:.88))
          .setPosition(this.x+b.dx,this.y+b.dy-out((p-.55)/.45)*(b.evo?44:22))
          .setAlpha(p>.88?(1-p)/.12:1);
      }
    }
    for(let i=0;i<this.puffs.length;i++){
      const p=life(ms,130+rand(i,rank)*170,evo?1500:850+rank*70),visible=live(p);
      const s=this.puffs[i];s.setVisible(visible);
      if(!visible)continue;
      const a=rand(i,8)*TAU,spread=radius*(.14+rand(i,9)*.36)*out(p);
      const height=Math.sin(p*Math.PI*.7)*(evo?95:20+rank*11)*(0.4+rand(i,10));
      const size=(evo?53:23+rank*6)*(0.8+rand(i,11))*(.7+p*1.5);
      s.setPosition(this.x+Math.cos(a)*spread,this.y+Math.sin(a)*spread*.46-height)
        .setDisplaySize(size,size*.88).setAlpha(Math.sin(Math.PI*p)**1.3*(evo?.8:.55));
    }
    for(let i=0;i<this.dust.length;i++){
      const p=life(ms,rank===1?30:55+(i%3)*9,evo?850:440+rank*55),visible=live(p),s=this.dust[i];
      s.setVisible(visible);if(!visible)continue;
      const a=i/this.dust.length*TAU,spread=radius*(.2+out(p)*(evo?1.07:.85));
      const size=(evo?42:13+rank*5)*(1+p*.8);
      s.setPosition(this.x+Math.cos(a)*spread,this.y+Math.sin(a)*spread*.46)
        .setDisplaySize(size,size*.48).setAlpha(Math.sin(p*Math.PI)**.7*(evo?.9:.65));
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

  describe(){return {stage:this.spec.id,age:this.age,objects:4+this.bursts.length+this.puffs.length+this.dust.length,
    visibleFrames:this.bursts.filter(b=>b.sprite.visible).map(b=>Number(b.sprite.frame.name)),
    active:this.age>=0&&this.age<this.spec.duration,duration:this.spec.duration};}
}

export class PreviousImpact {
  constructor(scene,x,y,spec){
    Object.assign(this,{scene,x,y,spec});this.g=scene.add.graphics().setDepth(5);
    const evo=spec.id==='evo';
    this.bursts=[{x,y,r:spec.radius,start:0,duration:evo?440:240+spec.rank*38,key:evo?'old-evo':`old-r${spec.rank}`,alpha:evo?1:.94,ring:true}];
    if(spec.rank===3||spec.rank===4)for(let i=0;i<3;i++){
      const a=i*TAU/3-Math.PI/2;
      this.bursts.push({x:x+Math.cos(a)*spec.radius*.52,y:y+Math.sin(a)*spec.radius*.4,r:spec.radius*.4,start:70+i*72,duration:230,key:'old-r1',alpha:.82});
    }
    this.bursts.forEach(b=>b.sprite=scene.add.image(b.x,b.y,b.key).setDepth(8));this.draw(-1);
  }
  draw(ms){
    this.g.clear();for(const b of this.bursts){
      const p=life(ms,b.start,b.duration);b.sprite.setVisible(live(p));if(!live(p))continue;
      const scale=.7+out(p)*.34;b.sprite.setDisplaySize(b.r*2.16*scale,b.r*1.34*scale).setAlpha(b.alpha*(1-out(p)));
      const rp=life(ms,b.start,Math.min(b.duration,310));
      if(b.ring&&live(rp)){
        const q=Math.sin(rp*Math.PI/2);
        this.g.lineStyle(2,0xffd878,.34*(1-q)).strokeEllipse(b.x,b.y+b.r*.04,b.r*1.32*(1+q*.58),b.r*.62*(1+q*.4));
      }
    }
  }
}
