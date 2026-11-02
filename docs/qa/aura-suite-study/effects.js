// Visual prototypes only. Production code does not import this file.
import Phaser from 'phaser';
export const TAU = Math.PI * 2;
export const fract = x => x - Math.floor(x);
export const ease = x => { x = Phaser.Math.Clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const envelope = life => ease(life / .16) * (1 - ease((life - .68) / .32));

// Saturation adjustment keeps hue and luminance; light cores remain light.
export function saturate(hex, multiplier = 1.1) {
  const r=(hex>>16&255)/255,g=(hex>>8&255)/255,b=(hex&255)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
  if(d===0)return hex;
  const s=Math.min(1,d/(1-Math.abs(2*l-1))*multiplier);
  let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
  h=(h+6)%6;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),m=l-c/2;
  const channels=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];
  return channels.reduce((v,n)=>(v<<8)|Math.round((n+m)*255),0);
}

export function ribbon(graphics, points, width, color, alpha) {
  if(points.length<3||alpha<.001)return;
  const left=[],right=[];
  for(let i=0;i<points.length;i++){
    const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
    const half=width*.5*Math.pow(Math.sin(i/(points.length-1)*Math.PI),.85);
    left.push({x:p.x-dy/d*half,y:p.y+dx/d*half});right.push({x:p.x+dy/d*half,y:p.y-dx/d*half});
  }
  graphics.fillStyle(color,alpha).fillPoints([...left,...right.reverse()],true);
}

const THEMES={
  green:{body:0x8bea9b,glow:0x4cce76,core:0xe6ffd2},
  violet:{body:0xbd88f8,glow:0x8e42dd,core:0xf0d8ff},
  wind:{body:0xffd77a,glow:0xd59c40,core:0xfff7d4},
  shield:{body:0x78d8f6,glow:0x3c9aca,core:0xdff8ff},
  danger:{body:0xff943e,glow:0xe4441a,core:0xffe9a0},
  royal:{body:0xd69bff,glow:0x8938c9,core:0xffe9ad}
};

function rgba(color,alpha){return `rgba(${color>>16&255},${color>>8&255},${color&255},${alpha})`;}
function lightTexture(scene,key,size,stops){
  if(scene.textures.exists(key))return;
  const texture=scene.textures.createCanvas(key,size,size),ctx=texture.getContext();
  const gradient=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  for(const [stop,color]of stops)gradient.addColorStop(stop,color);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,size,size);texture.refresh();
}

export class AuraProposal {
  constructor(scene,kind){
    this.kind=kind;
    this.theme=Object.fromEntries(Object.entries(THEMES[kind]).map(([key,value])=>[key,saturate(value,1.1)]));
    const c=this.theme,key=`study-${kind}`;
    lightTexture(scene,`${key}-ground`,256,[[0,rgba(c.body,.48)],[.24,rgba(c.glow,.22)],[.62,rgba(c.glow,.065)],[1,rgba(c.glow,0)]]);
    lightTexture(scene,`${key}-mote`,32,[[0,rgba(c.core,1)],[.11,rgba(c.core,1)],[.25,rgba(c.body,.55)],[.55,rgba(c.glow,.12)],[1,rgba(c.glow,0)]]);
    lightTexture(scene,`${key}-soft`,128,[[0,rgba(c.body,.5)],[.42,rgba(c.glow,.12)],[1,rgba(c.glow,0)]]);
    this.ground=scene.add.image(0,0,`${key}-ground`).setDepth(2.5);
    this.floor=scene.add.graphics().setDepth(2.6);
    this.rear=scene.add.graphics().setDepth(3.5);
    this.front=scene.add.graphics().setDepth(4.5);
    this.halo=scene.add.image(0,0,`${key}-soft`).setDepth(3.4).setBlendMode(Phaser.BlendModes.ADD);
    this.motes=Array.from({length:kind==='royal'?18:13},()=>scene.add.image(0,0,`${key}-mote`).setBlendMode(Phaser.BlendModes.ADD));
  }

  draw(ms,x,y,motion={}){
    const t=ms/1000;
    this.floor.clear();this.rear.clear();this.front.clear();
    this.halo.setAlpha(0);
    for(const mote of this.motes)mote.setAlpha(0);
    if(this.kind==='green'||this.kind==='violet')this.regeneration(t,x,y);
    if(this.kind==='wind')this.wind(t,x,y,motion);
    if(this.kind==='shield')this.shield(t,x,y);
    if(this.kind==='danger')this.danger(t,x,y);
    if(this.kind==='royal')this.royal(t,x,y);
  }

  glow(x,y,width,height,alpha){this.ground.setPosition(x,y).setDisplaySize(width,height).setAlpha(alpha);}
  thread(g,points,width=1,alpha=1,colors=this.theme){
    ribbon(g,points,18*width,colors.glow,.035*alpha);
    ribbon(g,points,10*width,colors.body,.09*alpha);
    ribbon(g,points,5.2*width,colors.body,.38*alpha);
    ribbon(g,points,1.1*width,colors.core,.62*alpha);
  }
  arcPoints(x,y,rx,ry,angle,sweep,lift=0){
    return Array.from({length:29},(_,i)=>{const u=i/28,a=angle+u*sweep;return{x:x+Math.cos(a)*rx,y:y+Math.sin(a)*ry-Math.sin(u*Math.PI)*lift};});
  }
  orbitMotes(t,x,y,{radius=64,height=50,scale=.28,count=13,speed=8,alpha=.7}={}){
    for(let i=0;i<Math.min(count,this.motes.length);i++){
      const life=fract(t/(i<9?2:4)+i*.61803398875),angle=i*2.399963+t*TAU/speed;
      const r=radius*(.72+(i%4)*.093),baseY=Math.sin(angle)*r*.34,visible=Math.sin(life*Math.PI)**1.7;
      this.motes[i].setPosition(x+Math.cos(angle)*r+Math.sin(life*TAU+i)*5,y+baseY-life*(height+(i%3)*8))
        .setDepth(baseY<0?3.6:4.6).setAlpha(visible*alpha).setScale(scale*(.75+visible*.25));
    }
  }

  regeneration(t,x,y){
    // Relative to the first healing proposal: spatial size and ribbon width ×1.2;
    // HSL saturation ×1.1. The original approved study remains untouched.
    const volume=1.2,violet=this.kind==='violet',breath=.5+.5*Math.sin(t*TAU/4);
    this.glow(x,y,(212+breath*8)*volume,(74+breath*3)*volume,.32+breath*.07);
    this.halo.setPosition(x,y-20).setDisplaySize(127,132).setAlpha(.09+.035*breath);
    for(let i=0;i<6;i++){
      const life=fract(t/2+i/6),a=i/6*TAU+t*TAU/8+(violet?.35:0);
      const bx=Math.cos(a)*(66+9*Math.sin(i*2.7))*volume,by=Math.sin(a)*22*volume;
      const end=ease(Math.min(1,life/.88)),begin=Math.max(0,end-.6),points=[];
      for(let j=0;j<=24;j++){
        const u=begin+(end-begin)*j/24;
        points.push({x:x+bx*(1-.28*u)+Math.sin(u*Math.PI*1.7+a)*15*volume*Math.sin(u*Math.PI),
          y:y+by-u*(48+10*Math.sin(i*2.2))*volume-Math.sin(u*Math.PI)*6*volume});
      }
      this.thread(by<1?this.rear:this.front,points,volume,envelope(life));
    }
    for(let i=0;i<3;i++){
      const life=fract(t/4+i/3),a=i*TAU/3-t*TAU/8;
      const points=this.arcPoints(x,y,(75+life*9)*volume,(25+life*3)*volume,a,.5);
      ribbon(this.floor,points,8.4,this.theme.glow,.035*Math.sin(life*Math.PI)**2);
      ribbon(this.floor,points,1.8,this.theme.core,.24*Math.sin(life*Math.PI)**2);
    }
    this.orbitMotes(t,x,y,{radius:82,height:58,scale:.32,alpha:.72});
  }

  wind(t,x,y,motion){
    const c=this.theme,pace=.5+.5*Math.sin(t*TAU/2);
    this.glow(x,y,220,72,.19+.04*pace);
    // Open travelling gusts have individual births and tapered moving tails.
    for(let i=0;i<3;i++){
      const life=fract(t/1.6+i/3),a=-t*TAU/1.6+i*TAU/3;
      const points=this.arcPoints(x,y,78+(i%2)*10,27+(i%2)*3,a,.9+life*.65,9+pace*5);
      const g=Math.sin(a+.6)<0?this.rear:this.front;
      this.thread(g,points,.68+(i===0?.22:0),envelope(life)*.92);
    }
    // Wind trails appear only while the subject is moving in the preview.
    const speed=Math.abs(motion.velocity||0),direction=Math.sign(motion.velocity||1);
    if(speed>.04){
      for(let i=0;i<2;i++){
        const points=Array.from({length:25},(_,j)=>{const u=j/24;return{x:x-direction*(24+u*(54+speed*24)),y:y+7+i*10+Math.sin(u*4-t*TAU)*4};});
        this.thread(this.rear,points,.55,speed*.78);
      }
    }
    for(let i=0;i<10;i++){
      const life=fract(t/2+i*.618),a=-t*TAU/1.6+i*2.39996;
      this.motes[i].setPosition(x+Math.cos(a)*(76+life*12),y+Math.sin(a)*28-life*10)
        .setDepth(Math.sin(a)<0?3.6:4.6).setScale(.22).setAlpha(Math.sin(life*Math.PI)*.6);
    }
  }

  shield(t,x,y){
    const c=this.theme,breath=.5+.5*Math.sin(t*TAU/4);
    this.glow(x,y,200,76,.23+.04*breath);
    for(let i=0;i<4;i++){
      const a=i*TAU/4+t*TAU/8+.4,life=fract(t/4+i/4);
      const lift=3*Math.sin(t*TAU/4+i),charge=Math.sin(life*Math.PI)**4;
      const rx=70,ry=25,by=Math.sin(a)*ry,g=by<0?this.rear:this.front;
      const top=this.arcPoints(x,y-30-lift,rx,ry,a-.24,.48);
      const outline=[...top,
        {x:x+Math.cos(a+.2)*rx*.96,y:y+Math.sin(a+.2)*ry-8-lift},
        {x:x+Math.cos(a)*rx*.94,y:y+by+3-lift},
        {x:x+Math.cos(a-.2)*rx*.96,y:y+Math.sin(a-.2)*ry-8-lift}];
      g.fillStyle(c.body,.08+.12*charge).fillPoints(outline,true);
      ribbon(g,top,7,c.glow,.09+.08*charge);
      ribbon(g,top,3,c.body,.6+.23*charge);
      ribbon(g,top,.7,c.core,.65+.25*charge);
      const left=[top[0],{x:x+Math.cos(a-.22)*rx*.96,y:y+Math.sin(a-.22)*ry-8-lift},{x:x+Math.cos(a)*rx*.94,y:y+by+3-lift}];
      const right=[top.at(-1),{x:x+Math.cos(a+.22)*rx*.96,y:y+Math.sin(a+.22)*ry-8-lift},{x:x+Math.cos(a)*rx*.94,y:y+by+3-lift}];
      ribbon(g,left,1,c.body,.27+.15*charge);ribbon(g,right,1,c.body,.27+.15*charge);
      // A short glint travels over each protection fragment, with no opaque disc.
      const sweep=this.arcPoints(x,y-30-lift,rx,ry,a-.24+life*.32,.14);
      this.thread(g,sweep,.34,Math.sin(life*Math.PI)*.8);
    }
    this.orbitMotes(t,x,y,{radius:65,height:24,count:7,scale:.23,alpha:.42});
  }

  danger(t,x,y){
    const c=this.theme,pulse=(.5+.5*Math.sin(t*TAU))**3;
    // Preserve the original projected warning footprint: radius 86, aspect .42.
    // This visual study does not change or evaluate collision/damage geometry.
    const radius=86,ry=radius*.42;
    this.glow(x,y,196,82,.32+.16*pulse);
    this.floor.lineStyle(5,c.glow,.055+.035*pulse).strokeEllipse(x,y,radius*2,ry*2);
    this.floor.lineStyle(1.25,c.body,.55+.22*pulse).strokeEllipse(x,y,radius*2,ry*2);
    const wave=fract(t),fade=Math.sin(wave*Math.PI)**2;
    this.floor.lineStyle(1.2,c.core,fade*.22).strokeEllipse(x,y,(24+wave*62)*2,(24+wave*62)*.84);
    for(let i=0;i<7;i++){
      const life=fract(t+i/7),a=i*TAU/7+.1;
      const bx=Math.cos(a)*radius,by=Math.sin(a)*ry;
      const points=Array.from({length:21},(_,j)=>{const u=j/20;return{x:x+bx+Math.sin(u*4+i+t*TAU)*5*Math.sin(u*Math.PI),y:y+by-u*(15+life*14)};});
      this.thread(by<0?this.rear:this.front,points,.42,envelope(life)*(.6+.4*pulse));
    }
    this.orbitMotes(t,x,y,{radius:72,height:31,scale:.23,count:11,alpha:.65});
  }

  royal(t,x,y){
    const purple=this.theme,gold={glow:0xcc8b32,body:0xffcf65,core:0xfff2c4};
    const pulse=(.5+.5*Math.sin(t*TAU/4))**3;
    this.glow(x,y,238,92,.29+.1*pulse);
    this.halo.setPosition(x,y-36).setDisplaySize(160,150).setAlpha(.08+.055*pulse);
    // Slower violet streams frame the larger boss; gold remains a restrained accent.
    for(let i=0;i<5;i++){
      const life=fract(t/4+i/5),a=i/5*TAU+t*TAU/8;
      const bx=Math.cos(a)*91,by=Math.sin(a)*32,end=ease(Math.min(1,life/.9)),begin=Math.max(0,end-.7);
      const points=Array.from({length:29},(_,j)=>{const u=begin+(end-begin)*j/28;return{x:x+bx*(1-.15*u)+Math.sin(u*5+a)*11*Math.sin(u*Math.PI),y:y+by-u*(71+12*Math.sin(i*2.4))};});
      this.thread(by<0?this.rear:this.front,points,1.4,envelope(life)*(.9+.2*pulse),purple);
    }
    for(let i=0;i<3;i++){
      const life=fract(t/4+i/3),a=-t*TAU/8+i*TAU/3;
      const points=this.arcPoints(x,y,95,34,a,.52+life*.38,5);
      this.thread(this.floor,points,.85,Math.sin(life*Math.PI)**2,gold);
    }
    // Two brief golden currents crest in front of the feet, offset in time.
    for(let i=0;i<2;i++){
      const life=fract(t/2+i*.5),a=.18+i*1.4+life*.35;
      const points=this.arcPoints(x,y+3,94,36,a,.8,8*Math.sin(life*Math.PI));
      this.thread(this.front,points,.65,envelope(life)*.85,gold);
    }
    for(let i=0;i<this.motes.length;i++){
      const life=fract(t/4+i*.618),a=i*2.399963+t*TAU/8;
      const by=Math.sin(a)*30,visible=Math.sin(life*Math.PI)**2;
      this.motes[i].setPosition(x+Math.cos(a)*(66+(i%4)*8)+Math.sin(life*TAU+i)*4,y+by-life*(60+(i%3)*13))
        .setDepth(by<0?3.6:4.6).setScale(.27).setAlpha(visible*.68);
      if(i%5===0){
        const gx=this.motes[i].x,gy=this.motes[i].y,g=by<0?this.rear:this.front;
        g.fillStyle(gold.core,visible*.65).fillCircle(gx,gy,1);
      }
    }
  }
}
