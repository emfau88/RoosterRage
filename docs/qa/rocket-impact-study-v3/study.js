import Phaser from 'phaser';
import groundUrl from '../../../src/assets/map/arena-ground-farm.webp';
import enemyUrl from '../../../src/assets/enemies/animations/enemy-support-run.webp';
import blastUrl from './assets/blast-flipbook.webp';
import eruptionUrl from './assets/evo-eruption-flipbook.webp';
import old1 from '../../../src/assets/fx/rocket-modular/rocket-impact-r1.webp';
import old2 from '../../../src/assets/fx/rocket-modular/rocket-impact-r2.webp';
import old3 from '../../../src/assets/fx/rocket-modular/rocket-impact-r3.webp';
import old4 from '../../../src/assets/fx/rocket-modular/rocket-impact-r4.webp';
import oldEvo from '../../../src/assets/fx/rocket-modular/rocket-impact-evo.webp';
import previousBlast from '../rocket-impact-study-v2/assets/blast-flipbook.webp';
import previousEruption from '../rocket-impact-study-v2/assets/evo-eruption-flipbook.webp';
import {STAGES as previousStages,prepareTextures as preparePrevious,ImpactProposal as PreviousProposal} from '../rocket-impact-study-v2/effects.js';
import { STAGES, prepareTextures, ImpactProposal } from './effects.js';

const query=new URLSearchParams(location.search),view=['compare','salvo'].includes(query.get('view'))?query.get('view'):'all';
const width=1440,height=view==='salvo'?510:810,cycle=3000;
const controls={elapsed:0,manual:null,paused:false,speed:1};
if(query.has('capture'))document.body.classList.add('capture');
document.querySelector(`[data-view="${view}"]`).setAttribute('aria-current','page');
if(view==='compare')document.getElementById('title').textContent='R4 & EVO · Proportionen im Vergleich';
if(view==='salvo')document.getElementById('title').textContent='EVO · Ein Einschlag und volle Salve';
const phase=document.getElementById('phase');

class Study extends Phaser.Scene {
  preload(){
    this.load.image('ground',groundUrl);this.load.image('v3-blast',blastUrl);this.load.image('v3-eruption',eruptionUrl);
    this.load.image('study-blast',previousBlast);this.load.image('study-eruption',previousEruption);
    this.load.spritesheet('subject',enemyUrl,{frameWidth:256,frameHeight:256});
    [old1,old2,old3,old4,oldEvo].forEach((url,i)=>this.load.image(i===4?'old-evo':`old-r${i+1}`,url));
  }
  create(){
    preparePrevious(this);this.previousFrameChecks=this.impactFrameChecks;this.impactFrameChecks=[];
    prepareTextures(this);this.effects=[];
    const text=(x,y,s,size=17,color='#f2ecdc')=>this.add.text(x,y,s,{fontFamily:'Arial',fontSize:`${size}px`,color,fontStyle:size>=18?'bold':'normal'}).setDepth(20);
    const panel=(x,y,w,h,spec,old=false,count=1)=>{
      this.add.rectangle(x+w/2,y+h/2,w,h,0x17211c).setDepth(0);
      this.add.tileSprite(x+1,y+68,w-2,h-104,'ground').setOrigin(0).setTilePosition(65,130).setDepth(0);
      const title=view==='compare'?`${spec.id.toUpperCase()} · ${old?'VORHER':'KORRIGIERT'}`:view==='salvo'?`EVO · ${count===1?'EIN EINSCHLAG':'DREI EINSCHLÄGE'}`:spec.label;
      text(x+24,y+16,title,21,spec.id==='evo'?'#ffe091':'#f2ecdc');
      text(x+24,y+44,old?'Bisheriger Comic-Entwurf':count===3?'Gleiches Ziel · 90 ms Abstand · tatsächliche Überlagerung':spec.note,14,'#b8c7ae');
      const cx=x+w/2,cy=y+h*.68+(spec.id==='evo'&&h<450?12:0);
      // A real enemy at the game's existing render size anchors camera angle and scale.
      const subjectX=cx-(spec.id==='evo'?220:150);
      this.add.ellipse(subjectX,cy+4,35,13,0x2b301a,.2).setDepth(1);
      this.add.sprite(subjectX,cy-18,'subject',0).setScale(.28).setDepth(4);
      text(x+24,y+h-25,old?'Vorherige Vorschau · gleicher Figurenmaßstab':'Spielperspektive · gleicher Figurenmaßstab',12,'#a8baa0');
      for(let i=0;i<count;i++){
        const e=old?new PreviousProposal(this,cx,cy,previousStages.find(s=>s.id===spec.id)):new ImpactProposal(this,cx,cy,spec);
        e.previewOffset=i*90;e.previous=old;this.effects.push(e);
      }
    };
    if(view==='compare'){
      [STAGES[3],STAGES[4]].forEach((s,i)=>{panel(0,i*411,719,399,s,true);panel(721,i*411,719,399,s);});
    }else if(view==='salvo'){
      panel(0,0,719,510,STAGES[4]);panel(721,0,719,510,STAGES[4],false,3);
    }else{
      STAGES.slice(0,3).forEach((s,i)=>panel(i*480,0,478,399,s));
      panel(0,411,478,399,STAGES[3]);panel(480,411,958,399,STAGES[4]);
    }
    window.impactStudy={ready:true,setTime:ms=>{controls.manual=ms;this.drawFrame(ms);},
      play:()=>{controls.manual=null;controls.elapsed=0;controls.paused=false;},
      describe:()=>({view,renderer:this.game.renderer.type===Phaser.WEBGL?'WEBGL':'CANVAS',cycleMs:cycle,
        elapsed:controls.manual??controls.elapsed,paused:controls.paused,speed:controls.speed,objects:this.children.list.length,
        gameplayModified:false,frameChecks:this.impactFrameChecks,effects:this.effects.filter(e=>!e.previous).map(e=>e.describe())})};
    this.drawFrame(0);
  }
  drawFrame(ms){
    const age=((ms%cycle)+cycle)%cycle;
    for(const e of this.effects)e.draw(age-e.previewOffset);
    phase.textContent=age<120?'Zündung':age<650?'Feuer & Druckwelle':age<1600?'Splitter · Rauch · aufsteigende Glut':'Abklingen';
  }
  update(_t,delta){if(!this.effects)return;if(!controls.paused)controls.elapsed+=delta*controls.speed;this.drawFrame(controls.manual??controls.elapsed);}
}
new Phaser.Game({type:query.get('renderer')==='canvas'?Phaser.CANVAS:Phaser.WEBGL,parent:'stage',width,height,
  backgroundColor:'#141e1b',render:{antialias:true,pixelArt:false,roundPixels:false},scene:Study,banner:false,audio:{noAudio:true}});
document.getElementById('pause').addEventListener('click',e=>{controls.paused=!controls.paused;controls.manual=null;e.currentTarget.textContent=controls.paused?'Abspielen':'Pause';});
document.getElementById('speed').addEventListener('change',e=>{controls.speed=Number(e.currentTarget.value);});
