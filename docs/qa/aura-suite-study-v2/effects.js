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
    const c=this.theme,key=`study-v2-${kind}`;
    lightTexture(scene,`${key}-ground`,256,[[0,rgba(c.body,.48)],[.24,rgba(c.glow,.22)],[.62,rgba(c.glow,.065)],[1,rgba(c.glow,0)]]);
    lightTexture(scene,`${key}-mote`,32,[[0,rgba(c.core,1)],[.11,rgba(c.core,1)],[.25,rgba(c.body,.55)],[.55,rgba(c.glow,.12)],[1,rgba(c.glow,0)]]);
    lightTexture(scene,`${key}-soft`,128,[[0,rgba(c.body,.5)],[.42,rgba(c.glow,.12)],[1,rgba(c.glow,0)]]);
    if(kind==='royal')lightTexture(scene,`${key}-gold`,32,[[0,rgba(0xfff9de,1)],[.14,rgba(0xffedaf,1)],[.3,rgba(0xffca64,.7)],[.62,rgba(0xffaa36,.18)],[1,rgba(0xffaa36,0)]]);
    this.ground=scene.add.image(0,0,`${key}-ground`).setDepth(2.5);
    this.floor=scene.add.graphics().setDepth(2.6);
    this.rear=scene.add.graphics().setDepth(3.5);
    this.front=scene.add.graphics().setDepth(4.5);
    this.halo=scene.add.image(0,0,`${key}-soft`).setDepth(3.4).setBlendMode(Phaser.BlendModes.ADD);
    this.motes=Array.from({length:kind==='royal'?56:(kind==='green'||kind==='violet')?24:18},(_,i)=>
      scene.add.image(0,0,kind==='royal'&&i%3===0?`${key}-gold`:`${key}-mote`).setBlendMode(Phaser.BlendModes.ADD));
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
    // Wider, denser follow-up to the previous proposal; no ability-range change.
    const violet=this.kind==='violet',volume=violet?1.55:1.8,breath=.5+.5*Math.sin(t*TAU/4);
    this.glow(x,y,(212+breath*8)*volume,(74+breath*3)*volume,.44+breath*.1);
    this.halo.setPosition(x,y-25).setDisplaySize(172,158).setAlpha(.16+.055*breath);
    for(let i=0;i<8;i++){
      const life=fract(t/2+i/8),a=i/8*TAU+t*TAU/8+(violet?.35:0);
      const bx=Math.cos(a)*(66+9*Math.sin(i*2.7))*volume,by=Math.sin(a)*22*volume;
      const end=ease(Math.min(1,life/.88)),begin=Math.max(0,end-.6),points=[];
      for(let j=0;j<=24;j++){
        const u=begin+(end-begin)*j/24;
        points.push({x:x+bx*(1-.28*u)+Math.sin(u*Math.PI*1.7+a)*15*volume*Math.sin(u*Math.PI),
          y:y+by-u*(48+10*Math.sin(i*2.2))*volume-Math.sin(u*Math.PI)*6*volume});
      }
      this.thread(by<1?this.rear:this.front,points,1.6,envelope(life)*1.15);
    }
    for(let i=0;i<3;i++){
      const life=fract(t/4+i/3),a=i*TAU/3-t*TAU/8;
      const points=this.arcPoints(x,y,(75+life*9)*volume,(25+life*3)*volume,a,.5);
      ribbon(this.floor,points,12,this.theme.glow,.065*Math.sin(life*Math.PI)**2);
      ribbon(this.floor,points,2.5,this.theme.core,.36*Math.sin(life*Math.PI)**2);
    }
    this.orbitMotes(t,x,y,{radius:violet?108:125,height:78,scale:.42,count:24,alpha:.84});
  }

  wind(t,x,y,motion){
    const c=this.theme,pace=.5+.5*Math.sin(t*TAU/2);
    this.glow(x,y,254,86,.29+.06*pace);
    // Open travelling gusts have individual births and tapered moving tails.
    for(let i=0;i<4;i++){
      const life=fract(t/1.6+i/4),a=-t*TAU/1.6+i*TAU/4;
      const points=this.arcPoints(x,y,94+(i%2)*10,32+(i%2)*4,a,.9+life*.65,12+pace*6);
      const g=Math.sin(a+.6)<0?this.rear:this.front;
      this.thread(g,points,1.05+(i===0?.25:0),envelope(life)*1.08);
    }
    // Wind trails appear only while the subject is moving in the preview.
    const speed=Math.abs(motion.velocity||0),direction=Math.sign(motion.velocity||1);
    if(speed>.04){
      for(let i=0;i<2;i++){
        const points=Array.from({length:25},(_,j)=>{const u=j/24;return{x:x-direction*(24+u*(54+speed*24)),y:y+7+i*10+Math.sin(u*4-t*TAU)*4};});
        this.thread(this.rear,points,.85,speed*.95);
      }
    }
    for(let i=0;i<16;i++){
      const life=fract(t/2+i*.618),a=-t*TAU/1.6+i*2.39996;
      this.motes[i].setPosition(x+Math.cos(a)*(90+life*15),y+Math.sin(a)*34-life*14)
        .setDepth(Math.sin(a)<0?3.6:4.6).setScale(.32).setAlpha(Math.sin(life*Math.PI)*.8);
    }
  }

  shield(t,x,y){
    const c=this.theme,breath=.5+.5*Math.sin(t*TAU/4);
    this.glow(x,y,234,88,.34+.07*breath);
    for(let i=0;i<4;i++){
      const a=i*TAU/4+t*TAU/8+.4,life=fract(t/4+i/4);
      const lift=3*Math.sin(t*TAU/4+i),charge=Math.sin(life*Math.PI)**4;
      const rx=82,ry=29,by=Math.sin(a)*ry,g=by<0?this.rear:this.front;
      const top=this.arcPoints(x,y-40-lift,rx,ry,a-.31,.62);
      const outline=[...top,
        {x:x+Math.cos(a+.25)*rx*.96,y:y+Math.sin(a+.25)*ry-8-lift},
        {x:x+Math.cos(a)*rx*.94,y:y+by+3-lift},
        {x:x+Math.cos(a-.25)*rx*.96,y:y+Math.sin(a-.25)*ry-8-lift}];
      g.fillStyle(c.body,.13+.17*charge).fillPoints(outline,true);
      ribbon(g,top,10,c.glow,.14+.12*charge);
      ribbon(g,top,4.2,c.body,.7+.25*charge);
      ribbon(g,top,1.1,c.core,.75+.25*charge);
      const left=[top[0],{x:x+Math.cos(a-.27)*rx*.96,y:y+Math.sin(a-.27)*ry-8-lift},{x:x+Math.cos(a)*rx*.94,y:y+by+3-lift}];
      const right=[top.at(-1),{x:x+Math.cos(a+.27)*rx*.96,y:y+Math.sin(a+.27)*ry-8-lift},{x:x+Math.cos(a)*rx*.94,y:y+by+3-lift}];
      ribbon(g,left,1.5,c.body,.4+.2*charge);ribbon(g,right,1.5,c.body,.4+.2*charge);
      // A short glint travels over each protection fragment, with no opaque disc.
      const sweep=this.arcPoints(x,y-40-lift,rx,ry,a-.31+life*.42,.2);
      this.thread(g,sweep,.5,Math.sin(life*Math.PI));
    }
    this.orbitMotes(t,x,y,{radius:80,height:35,count:12,scale:.32,alpha:.62});
  }

  danger(t,x,y){
    const c=this.theme,pulse=(.5+.5*Math.sin(t*TAU))**3;
    // Preserve the original projected warning footprint: radius 86, aspect .42.
    // This visual study does not change or evaluate collision/damage geometry.
    const radius=86,ry=radius*.42;
    this.glow(x,y,208,90,.42+.2*pulse);
    this.floor.lineStyle(8,c.glow,.11+.055*pulse).strokeEllipse(x,y,radius*2,ry*2);
    this.floor.lineStyle(1.8,c.body,.65+.25*pulse).strokeEllipse(x,y,radius*2,ry*2);
    const wave=fract(t),fade=Math.sin(wave*Math.PI)**2;
    this.floor.lineStyle(1.6,c.core,fade*.32).strokeEllipse(x,y,(24+wave*62)*2,(24+wave*62)*.84);
    for(let i=0;i<9;i++){
      const life=fract(t+i/9),a=i*TAU/9+.1;
      const bx=Math.cos(a)*radius,by=Math.sin(a)*ry;
      const points=Array.from({length:21},(_,j)=>{const u=j/20;return{x:x+bx+Math.sin(u*4+i+t*TAU)*6*Math.sin(u*Math.PI),y:y+by-u*(24+life*20)};});
      this.thread(by<0?this.rear:this.front,points,.65,envelope(life)*(.8+.4*pulse));
    }
    this.orbitMotes(t,x,y,{radius:72,height:46,scale:.33,count:16,alpha:.82});
  }

  royal(t,x,y){
    const purple=this.theme,gold={glow:0xd28c34,body:0xffcd62,core:0xfff3c7};
    const pulse=(.5+.5*Math.sin(t*TAU/4))**3;
    this.glow(x,y,424+24*pulse,154+8*pulse,.48+.16*pulse);
    this.halo.setPosition(x,y-65).setDisplaySize(302,270).setAlpha(.2+.13*pulse);

    // Broad ascending streams and an open, moving footprint give the boss scale.
    // The centre stays available for its silhouette and attack animations.
    for(let i=0;i<8;i++){
      const life=fract(t/4+i/8),a=i/8*TAU+t*TAU/8;
      const radius=151+14*Math.sin(i*2.1),bx=Math.cos(a)*radius,by=Math.sin(a)*52;
      const end=ease(Math.min(1,life/.9)),begin=Math.max(0,end-.72);
      const points=Array.from({length:33},(_,j)=>{
        const u=begin+(end-begin)*j/32;
        return{x:x+bx*(1-.1*u)+Math.sin(u*5+a)*20*Math.sin(u*Math.PI),
          y:y+by-u*(126+18*Math.sin(i*2.4))};
      });
      this.thread(by<0?this.rear:this.front,points,i%4===1?1.4:2.1,
        envelope(life)*(1.12+.18*pulse),i%4===1?gold:purple);
    }
    for(let i=0;i<3;i++){
      const life=fract(t/4+i/3),a=-t*TAU/8+i*TAU/3;
      const points=this.arcPoints(x,y,166,58,a,.8+life*.5,8);
      this.thread(this.floor,points,1.45,Math.sin(life*Math.PI)**2*1.1,gold);
    }
    for(let i=0;i<2;i++){
      const life=fract(t/2+i*.5),a=.18+i*1.4+life*.35;
      const points=this.arcPoints(x,y+3,148,53,a,.95,14*Math.sin(life*Math.PI));
      this.thread(this.front,points,1.05,envelope(life)*1.05,gold);
    }

    // 56 actual sprites, including 19 baked-gold motes: visibly rise above the boss.
    // Every period divides eight seconds, including the gently orbiting origins.
    for(let i=0;i<this.motes.length;i++){
      const life=fract(t/4+i*.61803398875),a=i*2.399963+t*TAU/8;
      const radius=96+(i%7)*11,by=Math.sin(a)*radius*.34;
      const rise=145+(i%4)*13,visible=Math.sin(life*Math.PI)**1.2;
      const at=u=>({x:x+Math.cos(a)*radius+Math.sin(u*TAU+i)*11,
        y:y+by-u*rise});
      const point=at(life),g=by<0?this.rear:this.front,isGold=i%3===0;
      const colors=isGold?gold:purple;
      this.motes[i].setPosition(point.x,point.y).setDepth(by<0?3.6:4.6)
        .setScale((.38+(i%4)*.065)*(.82+.18*visible)).setAlpha(visible*(.78+.14*pulse));
      if(i%3===0&&life>.06){
        const tail=Array.from({length:7},(_,j)=>at(life-.055+j/6*.055));
        ribbon(g,tail,6,colors.glow,.12*visible);
        ribbon(g,tail,1.4,colors.core,.55*visible);
      }
    }
  }
}
