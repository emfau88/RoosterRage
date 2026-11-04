// Preview only. Production never imports these concepts.
import Phaser from 'phaser';
import { ribbon } from '../../../src/systems/EnemyAuraAnimation.js';
export const clamp = x => Math.max(0, Math.min(1, x));
const TAU = Math.PI * 2, fract = x => x - Math.floor(x);
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const mix = (a, b, u) => a + (b - a) * u;
const points = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / (n - 1)));

function cubic(a, b, c, d, n = 10) {
  return points(n, t => ({ x: (1-t)**3*a[0]+3*(1-t)**2*t*b[0]+3*(1-t)*t*t*c[0]+t**3*d[0],
    y: (1-t)**3*a[1]+3*(1-t)**2*t*b[1]+3*(1-t)*t*t*c[1]+t**3*d[1] }));
}
const palettes = {
  warm: [0x81301b, 0xf15c16, 0xffa621, 0xffeb6c, 0xfff5c1],
  blue: [0x243d91, 0x346cdb, 0x39baf2, 0x93ecff, 0xe7fbff],
  gold: [0x996125, 0xf49b20, 0xffce3f, 0xffee82, 0xfffae0]
};
// The contour itself changes: this is not a static sprite with a scale tween.
function flame(g, x, y, width, height, t, palette = palettes.warm, alpha = 1, angle = 0) {
  const bend = Math.sin(t * 10.7) * .13 + Math.sin(t * 17.1) * .055;
  const tip = .12 + bend, notch = .42 + Math.sin(t * 13.6) * .10;
  const outline = [
    ...cubic([0, 0], [-.55, .02], [-.69, -.34], [-.37, -.57]),
    ...cubic([-.37, -.57], [-.43, -.31], [-.02, -.48], [-.14, -.76]),
    ...cubic([-.14, -.76], [-.23, -.97], [tip-.10, -1.06], [tip+.17, -1.02]),
    ...cubic([tip+.17, -1.02], [tip-.18, -.89], [tip+.32, -.78], [.28, -.51]),
    ...cubic([.28, -.51], [.54, -.52], [.44, -.66], [notch, -.72]),
    ...cubic([notch, -.72], [.78, -.32], [.49, .03], [0, 0])
  ];
  const cs = Math.cos(angle), sn = Math.sin(angle);
  const map = (scale, lift = 0) => outline.map(p => {
    const px = p.x * width * scale, py = (p.y * scale - lift) * height;
    return { x: x + px * cs - py * sn, y: y + px * sn + py * cs };
  });
  const outer = map(1);
  g.fillStyle(palette[1], alpha).fillPoints(outer, true);
  g.lineStyle(1.5, palette[0], alpha * .86).strokePoints(outer, true);
  g.fillStyle(palette[2], alpha).fillPoints(map(.78), true);
  g.fillStyle(palette[3], alpha).fillPoints(map(.48), true);
  g.fillStyle(palette[4], alpha).fillPoints(map(.22), true);
}
function spark(g, x, y, size, angle, color, alpha = 1) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const p = (u,v) => ({ x:x+u*c-v*s, y:y+u*s+v*c });
  g.fillStyle(color, alpha).fillPoints([p(-size,0),p(0,-size*.32),p(size,0),p(0,size*.32)],true);
}
function light(scene) {
  if (scene.textures.exists('combat-concept-light')) return;
  const texture = scene.textures.createCanvas('combat-concept-light', 128,128), c = texture.getContext();
  const gradient = c.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,215,120,.42)'); gradient.addColorStop(.35,'rgba(255,158,55,.16)');
  gradient.addColorStop(1,'rgba(255,136,40,0)'); c.fillStyle=gradient; c.fillRect(0,0,128,128);texture.refresh();
}
class Concept {
  constructor(scene) { this.scene=scene;this.objects=[]; }
  graphics(depth) { const g=this.scene.add.graphics().setDepth(depth);this.objects.push(g);return g; }
  clear() { for(const o of this.objects) if(o.type==='Graphics')o.clear(); else o.setVisible(false); }
  destroy() { this.objects.forEach(o=>o.destroy());this.objects=[]; }
}

export class FireballConcept extends Concept {
  constructor(scene) {
    super(scene);light(scene);
    this.floor=this.graphics(4);this.rear=this.graphics(7);this.body=this.graphics(8);this.front=this.graphics(9);
    this.glow=scene.add.image(0,0,'combat-concept-light').setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.objects.push(this.glow);
  }
  draw(age, start, angle, travelMs=1450) {
    this.clear();this.active=age>=0&&age<travelMs+600;if(!this.active)return;
    const t=age/1000, c=Math.cos(angle), s=Math.sin(angle), distance=Math.min(age,travelMs)*.238;
    const x=start.x+c*distance,y=start.y+s*distance;
    const flight=age<travelMs;
    if(flight){
      const birth=smooth(age/110), pulse=1+Math.sin(t*19)*.025;
      this.floor.fillStyle(0x3d2115,.14*birth).fillEllipse(x,y+23,48,14);
      this.glow.setPosition(x-8*c,y-8*s).setDisplaySize(102,102).setAlpha(.7*birth).setVisible(true);
      // Small separate smoke puffs remain behind the moving ball.
      for(let i=0;i<7;i++){
        const q=fract(t*1.8+i*.153), back=24+q*84;
        if(age<back/.238)continue;
        const px=x-c*back+s*Math.sin(i*3.1+q*3)*7,py=y-s*back-c*Math.sin(i*3.1+q*3)*7-q*9;
        this.rear.fillStyle(0x665047,(1-q)*.19).fillCircle(px,py,3+q*7);
      }
      // Trailing flames follow travel direction; their tips and nested contours flicker independently.
      for(let i=0;i<3;i++){
        const side=(i-1)*11, back=8+Math.abs(i-1)*5;
        flame(this.rear,x-c*back-s*side,y-s*back+c*side,14,34+Math.sin(t*23+i*4)*8,t+i,
          palettes.warm,.91*birth,angle-Math.PI/2);
      }
      const flick=Math.sin(t*23)*5, flick2=Math.sin(t*17+.8)*4;
      const contour=[...cubic([27,0],[30,-17],[13,-29],[-2,-24]),
        ...cubic([-2,-24],[-18,-25],[-20,-12],[-44+flick,-24+flick2]),
        ...cubic([-44+flick,-24+flick2],[-34,-6],[-20,-6],[-31,2]),
        ...cubic([-31,2],[-42,9],[-43,15],[-57-flick2,13+flick]),
        ...cubic([-57-flick2,13+flick],[-36,34],[-15,16],[-10,23]),
        ...cubic([-10,23],[8,32],[30,19],[27,0])];
      const map=(scale,forward=0)=>contour.map(p=>{const u=(p.x*scale+forward)*pulse*birth,v=p.y*scale*pulse*birth;
        return{x:x+u*c-v*s,y:y+u*s+v*c};});
      const shape=map(1);
      this.body.fillStyle(0xe95c1d,birth).fillPoints(shape,true);
      this.body.lineStyle(2.1,0x8a3020,birth).strokePoints(shape,true);
      this.body.fillStyle(0xffa222,birth).fillPoints(map(.79,2),true);
      this.body.fillStyle(0xffdb4e,birth).fillPoints(map(.56,6),true);
      this.body.fillStyle(0xfff0a3,birth).fillPoints(map(.28,9),true);
      // Broken red-orange edge accents remain a clear enemy cue, without a giant ring.
      for(let i=0;i<3;i++) {
        const p=points(18,u=>{const a=angle+i*TAU/3+u*.78;return {x:x+Math.cos(a)*32,y:y+Math.sin(a)*32};});
        ribbon(this.front,p,2.7,0xff4936,(.65+.15*Math.sin(t*12+i))*birth);
      }
      for(let i=0;i<15;i++){
        const q=fract(t*(1.4+i%3*.12)+i*.618),back=20+q*100;
        if(age<back/.238)continue;
        const drift=Math.sin(i*12.3)*q*21;
        spark(this.front,x-c*back-s*drift,y-s*back+c*drift-q*7,(2+3*(1-q)),angle, i%3?0xffd065:0xff7433,(1-q)*birth);
      }
    }else{
      const q=(age-travelMs)/600, a=1-smooth((q-.22)/.78);
      this.glow.setPosition(x,y).setDisplaySize(150,150).setAlpha((1-q)*.8).setVisible(true);
      if(q<.38){
        const grow=Math.sin(clamp(q/.38)*Math.PI*.8),burst=points(23,u=>{
          const i=Math.round(u*22),theta=i*Math.PI/11,r=(i%2?15:26+i%4*3)*grow;
          return{x:x+Math.cos(theta)*r,y:y+Math.sin(theta)*r};});
        this.body.fillStyle(0xff9230,a).fillPoints(burst,true);
        this.body.lineStyle(1.5,0xa54320,a*.8).strokePoints(burst,true);
        this.body.fillStyle(0xffed9a,a).fillPoints(burst.map(p=>({x:x+(p.x-x)*.65,y:y+(p.y-y)*.65})),true);
      }
      for(let i=0;i<17;i++){
        const theta=i*2.4,r=8+q*(35+i%4*11);
        spark(this.front,x+Math.cos(theta)*r,y+Math.sin(theta)*r*.65-Math.sin(q*Math.PI)*16,
          (3+i%3)*(1-q),theta, i%2?0xffb837:0xffef9b,a);
      }
      for(let i=0;i<4;i++)this.rear.fillStyle(0x665047,(1-q)*.17).fillCircle(x+(i-1.5)*12,y-q*27+Math.sin(i)*5,6+q*9);
    }
  }
}

export class LaserConcept extends Concept {
  constructor(scene) {super(scene);this.edge=this.graphics(11);this.beam=this.graphics(12);this.flash=this.graphics(13);}
  draw(age,start,angle,rank,evolved,contacts=[]) {
    this.clear();
    const charge=evolved?150:100+rank*8,hold=evolved?280:170+rank*18,fade=evolved?220:150+rank*15;
    this.active=age>=0&&age<charge+hold+fade;if(!this.active)return;
    const offsets=evolved?[-.18,0,.18]:rank>=3?[0,.09]:[0];
    const colors=evolved?[0x70e6ff,0xffdf69,0xc096ff]:[rank>=4?0xffdf69:rank>=3?0xffae43:0xff7c3e];
    const length=(evolved?700:520)+rank*90, t=age/1000;
    offsets.forEach((off,i)=>{
      const a=angle+off,c=Math.cos(a),s=Math.sin(a),color=colors[i]??colors[0];
      const p=(distance,side=0)=>({x:start.x+c*distance-s*side,y:start.y+s*distance+c*side});
      if(age<charge){
        const u=age/charge;
        this.edge.lineStyle(1,color,.12+.3*u).lineBetween(start.x,start.y,p(length).x,p(length).y);
        for(let j=0;j<5;j++){
          const d=16+(1-u)*(32+j*8),theta=j*2.4+t*6;
          spark(this.flash,start.x+Math.cos(theta)*d,start.y+Math.sin(theta)*d,2.4,theta,color,u*.7);
        }
        spark(this.flash,start.x,start.y,3+u*9,a,color,.3+u*.7);return;
      }
      const fired=age-charge,u=clamp((fired-hold)/fade),opacity=1-smooth(u);
      const width=(evolved?10:rank>=4?9:7)*(1-u*.5),kick=Math.exp(-fired/48);
      const line=points(60,v=>p(length*v,Math.sin(v*42-t*48+i)*.75*Math.sin(v*Math.PI)));
      ribbon(this.edge,line,width+10,color,opacity*.11);ribbon(this.edge,line,width+4,color,opacity*.18);
      ribbon(this.beam,line,width,color,opacity*.9);
      ribbon(this.beam,line,2.1+kick*2,0xfffbe2,opacity);
      // Short highlights travel along the beam during the hold phase.
      for(let j=0;j<4;j++){
        const head=fract(fired/220-j*.27-i*.035),lo=clamp(head-.1),hi=clamp(head+.025);
        const pulse=points(20,v=>p(mix(lo,hi,v)*length,Math.sin(v*Math.PI+t*14)*.45));
        ribbon(this.flash,pulse,evolved?7.5:5.5,color,opacity*.9);ribbon(this.flash,pulse,2.1,0xffffff,opacity);
      }
      // Comic muzzle petals have a quick, changing silhouette instead of a pasted emitter.
      const radius=(10+kick*(evolved?23:17))*(1-u);
      for(let j=0;j<4;j++)spark(this.flash,start.x,start.y,radius*(j%2?.62:1),a+j*Math.PI/2+t*.8,color,opacity*.9);
      spark(this.flash,start.x,start.y,radius*.55,a,0xfffde2,opacity);
      contacts.forEach((target,k)=>{
        const dx=target.x-start.x,dy=target.y-start.y,along=dx*c+dy*s,side=Math.abs(-dx*s+dy*c);
        if(along<0||along>length||side>(evolved?40:32))return;
        const impact=p(along),fadeContact=opacity*(.65+.35*Math.sin(fired*.04+k)**2);
        for(let j=0;j<5;j++){
          const q=fract(fired/140+j*.23+i*.11),theta=a+Math.PI/2+(j%2?Math.PI:0)+(j-2)*.3;
          const dist=5+q*27;
          spark(this.flash,impact.x+Math.cos(theta)*dist,impact.y+Math.sin(theta)*dist,5*(1-q),theta,
            j%2?color:0xfffde5,fadeContact*(1-q));
        }
        if(fired<185){
          const q=fired/185,impactAlpha=1-smooth(q),reach=7+Math.sin(q*Math.PI*.8)*(evolved?25:21);
          const burst=points(17,u=>{const j=Math.round(u*16),theta=j*Math.PI/8+a;
            const r=j%2?reach*.36:reach*(.75+j%3*.12);
            return{x:impact.x+Math.cos(theta)*r,y:impact.y+Math.sin(theta)*r};});
          this.flash.fillStyle(color,impactAlpha).fillPoints(burst,true);
          this.flash.fillStyle(0xfff9db,impactAlpha).fillPoints(burst.map(p=>({x:impact.x+(p.x-impact.x)*.55,y:impact.y+(p.y-impact.y)*.55})),true);
          for(let j=0;j<3;j++){
            const side=j*2.1+a;
            const slash=points(18,u=>({x:impact.x+Math.cos(side+u*.8)*(10+q*20),y:impact.y+Math.sin(side+u*.8)*(10+q*20)}));
            ribbon(this.flash,slash,2,color,impactAlpha*.8);
          }
        }
        const flicker=.2+.8*Math.sin(fired*.032+k)**4;
        spark(this.flash,impact.x,impact.y,3.5+kick*8,a+Math.PI/2,0xfff7c8,opacity*flicker);
      });
    });
  }
}

export class MolotovConcept extends Concept {
  constructor(scene,x,y,rank,evolved=false){
    super(scene);Object.assign(this,{x,y,rank,evolved});light(scene);
    this.radius=evolved?136:[0,90,108,124,112][rank];this.life=evolved?4500:[0,3000,3400,3800,4000][rank];
    this.floor=this.graphics(3.1);this.heat=this.graphics(3.3);this.air=this.graphics(4.4);this.front=this.graphics(8);
    this.glow=scene.add.image(x,y,'combat-concept-light').setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.objects.push(this.glow);
    this.phase=(y*.017)%TAU;
    const count=evolved?21:[0,10,12,15,16][rank];
    this.flames=Array.from({length:count},(_,i)=>{
      const theta=i*2.399963+this.phase,r=Math.sqrt((i+.5)/count)*.87;
      const localX=Math.cos(theta)*r*this.radius,localY=Math.sin(theta)*r*this.radius*.52;
      const gold=evolved&&i%4===0,blue=rank>=4&&!gold;
      const sprite=scene.add.sprite(x+localX,y+localY,blue?'molotov-ground-flame-blue':'molotov-ground-flame-orange',0)
        .setOrigin(.5,.83).setDepth(3.5+localY*.002).setFlipX(i%2===0);
      if(gold)sprite.setTint(0xffe79e);
      this.objects.push(sprite);
      return {sprite,localX,localY,theta,width:(evolved?50:42)+(i%4)*5+(i%7===0?10:0),phase:fract(i*.618+this.phase),gold,blue};
    });
  }
  draw(age){
    this.clear();this.active=age>=0&&age<this.life;if(!this.active)return;
    const {x,y,radius:r,evolved:evo}=this,t=age/1000,fade=smooth((this.life-age)/440),entry=smooth(age/180),a=fade*entry;
    this.glow.setVisible(true).setDisplaySize(r*2.1,r*1.18).setAlpha(a*(.65+.5*Math.exp(-age/110)));
    // Disconnected irregular scorch patches leave visible original ground between them.
    for(let i=0;i<6;i++){
      const theta=i*2.4,px=x+Math.cos(theta)*r*.48,py=y+Math.sin(theta)*r*.23;
      const patch=points(31,u=>{const angle=u*TAU,rr=(.34+Math.sin(angle*3+i)*.055)*r;
        return {x:px+Math.cos(angle)*rr,y:py+Math.sin(angle)*rr*.49};});
      this.floor.fillStyle(i%2?0x5c2b16:0x3b251b,a*.18).fillPoints(patch,true);
    }
    // Uneven heat licks mark the edge, never a complete ellipse.
    for(let i=0;i<11;i++){
      const theta=i*TAU/11+.12,phase=fract(t*.63+i*.217),strength=Math.sin(phase*Math.PI);
      const p=points(18,u=>{
        const angle=theta+(u-.5)*.27,rr=r*(.85+.035*Math.sin(u*7+t*4+i));
        return {x:x+Math.cos(angle)*rr,y:y+Math.sin(angle)*rr*.52};
      });
      const col=this.rank>=4?(evo&&i%3===0?0xffcd55:0x68bfff):0xffa33c;
      ribbon(this.heat,p,3.1,col,a*(.24+strength*.32));
      if(i%2===0)spark(this.heat,x+Math.cos(theta)*r*.59,y+Math.sin(theta)*r*.3,3.5,theta,0xffbc51,a*strength*.7);
    }
    for(let i=0;i<9;i++){
      const phase=fract(t*.8+i*.173+this.phase),theta=i*2.399+this.phase,rr=r*(.2+fract(i*.31)*.62);
      const bx=x+Math.cos(theta)*rr,by=y+Math.sin(theta)*rr*.52;
      const lick=points(20,u=>({x:bx+(u-.5)*(22+i%3*6)+Math.sin(u*5+t*4+i)*3,
        y:by-Math.sin(u*Math.PI)*(3+Math.sin(t*3+i)*2)}));
      const color=this.rank>=4&&i%3?0x5abaff:0xffa23d;
      ribbon(this.heat,lick,4.5,color,a*Math.sin(phase*Math.PI)*.55);
      ribbon(this.heat,lick,1.1,this.rank>=4?0xa6ecff:0xffd565,a*Math.sin(phase*Math.PI)*.65);
    }
    this.flames.forEach((f,i)=>{
      const phase=fract(t*(.52+(i%4)*.09)+f.phase),lift=.91+.10*Math.sin(phase*TAU);
      const delay=(i%5)*19,localA=smooth((age-delay)/160)*fade;
      // Native square frames, uniformly scaled. The fire volume is never vertically squashed.
      const size=f.width*lift*(.83+.17*fade);
      f.sprite.setVisible(true).setPosition(x+f.localX+Math.sin(t*2+i)*1.4,y+f.localY)
        .setDisplaySize(size,size).setFrame((Math.floor(age*(.011+(i%4)*.0017)+this.phase*2)+i*5)%12)
        .setAlpha(localA*(.72+.16*Math.sin(phase*Math.PI)));
    });
    const count=evo?30:16;
    for(let i=0;i<count;i++){
      const q=fract(t*(.46+i%4*.09)+i*.618),theta=i*2.4,rr=r*(.22+fract(i*.37)*.63);
      if(age<q*600)continue;
      const px=x+Math.cos(theta)*rr+Math.sin(t*3+i)*q*5,py=y+Math.sin(theta)*rr*.52-q*(26+i%4*9);
      spark(this.air,px,py,(1.1+(i%3)*.65)*(1-q*.4),-.9+Math.sin(i)*.4,
        this.rank>=4&&i%3?0xa6e9ff:0xffce63,a*Math.sin(q*Math.PI)*.85);
    }
    // A compact ignition, then residual embers when the field dies down.
    if(age<330){
      const q=age/330;
      const flash=smooth(age/24)*(1-smooth((age-70)/190));
      const bloom=points(21,u=>{const j=Math.round(u*20),theta=j*Math.PI/10,
        rr=(j%2?12:24+j%3*3)*(.5+clamp(age/95)*.5);
        return{x:x+Math.cos(theta)*rr,y:y+Math.sin(theta)*rr*.72};});
      this.front.fillStyle(this.rank>=4?0x74d6ff:0xffc04b,flash*.92).fillPoints(bloom,true);
      this.front.fillStyle(0xfff5c6,flash).fillPoints(bloom.map(p=>({x:x+(p.x-x)*.48,y:y+(p.y-y)*.48})),true);
      for(let i=0;i<3;i++){
        const envelope=smooth(age/35)*(1-smooth((age-50)/190));
        flame(this.front,x+(i-1)*13,y+5,12*envelope,(i===1?37:26)*envelope,t+i,
          this.rank>=4?(evo&&i===1?palettes.gold:palettes.blue):palettes.warm,flash*.85);
      }
      for(let i=0;i<7;i++){
        const theta=i*2.4,rr=q*r*.62;
        spark(this.front,x+Math.cos(theta)*rr,y+Math.sin(theta)*rr*.5,7*(1-q),theta,
          this.rank>=4?0xc6f1ff:0xffef9a,Math.sin(q*Math.PI));
      }
    }
  }
}
