import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { playPropBreak } from '../src/systems/PropBreakFeedback.js';

test('mass destruction is bounded and scene restarts release every fragment',()=>{
  const objects=[];
  const make=()=>{
    const p={active:true,setDepth(){return this;},setRotation(){return this;},destroy(){this.active=false;}};
    objects.push(p);return p;
  };
  const timers=[];
  const scene={events:new EventEmitter(),add:{ellipse:make,rectangle:make},
    tweens:{add(){},killTweensOf(){}},time:{delayedCall(ms,fn){timers.push(fn);}}};
  for(let i=0;i<100;i++)playPropBreak(scene,i%2?'bale':'crate',100,100);
  assert(objects.length<=72,'Mass destruction created an unbounded number of objects');
  timers.forEach(fn=>fn());assert(objects.every(p=>!p.active));
  assert.equal(scene.propBreakBursts.size,0);
  assert(playPropBreak(scene,'crate',100,100));
  scene.events.emit('shutdown');assert(objects.every(p=>!p.active));
  assert.equal(scene.propBreakBursts,null);
  assert(playPropBreak(scene,'bale',100,100),'Restart permanently exhausted the visual budget');
  scene.events.emit('shutdown');assert(objects.every(p=>!p.active));
});
