import Phaser from 'phaser';
import { AuraProposal as PreviousAuraProposal } from '../aura-suite-study/effects.js';
import groundUrl from '../../../src/assets/map/arena-ground-farm.webp';
import supportUrl from '../../../src/assets/enemies/animations/enemy-support-run.webp';
import windUrl from '@portal-elite-runner';
import tankUrl from '@portal-elite-tank-run';
import chiliUrl from '@portal-elite-chili-run';
import bomberUrl from '../../../src/assets/enemies/animations/enemy-bomber-run.webp';
import bossUrl from '../../../src/assets/enemies/animations/enemy-boss-run.webp';
import { AuraProposal, TAU } from './effects.js';

const GROUPS={healing:{title:'Heilung & Regeneration',ids:['green','violet']},defense:{title:'Wind & Rüstung',ids:['wind','shield']},royal:{title:'Explosion & Boss',ids:['danger','royal']}};
const SPECS={
  green:{name:'HEILUNG',enemy:'Brood Tender',scale:.28,url:supportUrl,note:'Größere optische Reichweite · dichteres Licht',fps:9},
  violet:{name:'REGENERATION',enemy:'Chili Gobbler',scale:.34,url:chiliUrl,note:'Breitere Strömungen · mehr aufsteigende Partikel',fps:7,compact:true},
  wind:{name:'WIND',enemy:'Turbo Goose',scale:.34,url:windUrl,note:'Kräftigere Windzüge · mehr Bewegungsspuren',fps:12},
  shield:{name:'RÜSTUNG',enemy:'Panzer Turkey',scale:.39,url:tankUrl,note:'Größere Schildfragmente · stärkere Lichtkanten',fps:7,compact:true},
  danger:{name:'EXPLOSION',enemy:'Bomber',scale:.28,url:bomberUrl,note:'Stärkere Glut · Warnradius unverändert',fps:10},
  royal:{name:'BOSS',enemy:'The Brood King',scale:.58,url:bossUrl,note:'Weiträumige Energie · 56 aufsteigende Lichtpartikel',fps:5}
};
const query=new URLSearchParams(location.search),groupId=GROUPS[query.get('group')]?query.get('group'):'healing';
const group=GROUPS[groupId],ROW=440,HEIGHT=ROW*2,controls={manualTime:null,elapsed:0,paused:false};
const stage=document.getElementById('stage'),phaseLabel=document.getElementById('phase');
document.getElementById('title').textContent=group.title;
document.querySelector(`[data-group="${groupId}"]`).setAttribute('aria-current','page');
if(query.has('capture'))document.body.classList.add('capture');
group.ids.forEach((id,i)=>{
  const spec=SPECS[id],labels=document.createElement('div');labels.className='row-labels';labels.style.top=`${i*50}%`;
  labels.innerHTML=`<div><strong>${spec.name} · BISHERIGER ENTWURF</strong><span>${spec.enemy} · zuletzt gezeigte Vorschau</span></div><div><strong>${spec.name} · VERSTÄRKTER ENTWURF</strong><span>${spec.note}</span></div>`;
  stage.append(labels);
});

class SuiteScene extends Phaser.Scene{
  preload(){
    this.load.image('ground',groundUrl);
    for(const id of group.ids){const spec=SPECS[id];this.load.spritesheet(`subject-${id}`,spec.url,{frameWidth:256,frameHeight:256});}
  }
  create(){
    this.rows=group.ids.map((id,index)=>{
      const spec=SPECS[id],top=index*ROW;
      this.add.rectangle(560,top+28,1120,56,0x17201e).setDepth(0);
      for(const left of[0,560])this.add.tileSprite(left,top+56,560,ROW-56,'ground').setOrigin(0).setTint(0xfffbf0).setTilePosition(65,130);
      this.add.rectangle(560,top+248,1,384,0x17201e,.35).setDepth(5);
      const groundY=top+300;
      const subjects=[280,840].map(x=>({sprite:this.add.sprite(x,groundY-256*spec.scale*.28,`subject-${id}`,0).setScale(spec.scale).setDepth(4),activationId:1}));
      return{id,spec,top,groundY,subjects,previous:new PreviousAuraProposal(this,id),proposal:new AuraProposal(this,id)};
    });
    window.auraSuite={ready:true,setTime:ms=>{controls.manualTime=ms;this.drawFrame(ms);},describe:()=>({
      group:groupId,renderer:this.game.renderer.type===Phaser.WEBGL?'WEBGL':'CANVAS',cycleMs:8000,
      comparison:'Previous isolated proposal versus strengthened proposal. Neither is integrated.',
      adjustment:{greenVisualRangeMultiplier:1.5,violetVisualRangeMultiplier:1.55/1.2,
        bossOuterArcRadius:{before:95,after:166},bossMotes:{before:18,after:56},bomberWarningRadius:86},
      gameplayModified:false,rows:this.rows.map(row=>({id:row.id,
        scales:row.subjects.map(s=>s.sprite.scaleX),frames:row.subjects.map(s=>s.sprite.frame.name),
        previousCenter:{x:row.subjects[0].sprite.x,y:row.groundY},enemy:row.spec.enemy,
        previousEffect:'../aura-suite-study/effects.js',proposalEffect:'./effects.js'}))
    })};
    this.drawFrame(0);
  }
  drawFrame(milliseconds){
    const ms=((milliseconds%8000)+8000)%8000,t=ms/1000,moving=t>=4,p=(t-4)*TAU/4;
    this.time.now=ms;
    const dx=moving?Math.sin(p)**3*32:0,dy=moving?(1-Math.cos(p*2))*2:0;
    const velocity=moving?Math.sin(p)**2*Math.cos(p)*2.6:0;
    for(const row of this.rows){
      const facingRight=moving&&Math.cos(p)>0;
      const frame=moving?Math.floor((t-4)*row.spec.fps)%4+(facingRight&&!row.spec.compact?4:0):0;
      row.subjects.forEach((subject,i)=>subject.sprite.setPosition(280+i*560+dx,row.groundY-256*row.spec.scale*.28+dy).setFrame(frame).setFlipX(Boolean(row.spec.compact&&facingRight)));
      row.previous.draw(ms,280+dx,row.groundY+dy,{velocity,moving});
      row.proposal.draw(ms,840+dx,row.groundY+dy,{velocity,moving});
    }
    phaseLabel.textContent=moving?'In Bewegung':'Im Stand';
  }
  update(_time,delta){if(!this.rows)return;if(!controls.paused)controls.elapsed+=delta;this.drawFrame(controls.manualTime??controls.elapsed);}
}
new Phaser.Game({type:query.get('renderer')==='canvas'?Phaser.CANVAS:Phaser.WEBGL,parent:'stage',width:1120,height:HEIGHT,
  backgroundColor:'#17201e',render:{antialias:true,pixelArt:false,roundPixels:false},scene:SuiteScene,banner:false,audio:{noAudio:true}});
document.getElementById('pause').addEventListener('click',event=>{controls.paused=!controls.paused;event.currentTarget.textContent=controls.paused?'Abspielen':'Pause';});
