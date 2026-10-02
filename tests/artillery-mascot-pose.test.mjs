import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ARTILLERY_MASCOT_DIRECTIONS, ARTILLERY_MASCOT_IDLE_PERIOD_MS, sampleArtilleryMascotPose } from '../src/artillery-mascot/artilleryMascotPose.js';
const root = path.resolve(import.meta.dirname,'..');
const near = (a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function equal(a,b) {
  if(typeof a==='number') near(a,b);
  else if(Array.isArray(a)) {assert.equal(a.length,b.length);a.forEach((v,i)=>equal(v,b[i]));}
  else if(a && typeof a==='object') {assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a)) equal(a[k],b[k]);}
  else assert.equal(a,b);
}
test('mascot loops close, fixed components never morph or change anatomy',()=>{
  for(const direction of ARTILLERY_MASCOT_DIRECTIONS) {
    equal(sampleArtilleryMascotPose({direction,phase:0,movement:1}),sampleArtilleryMascotPose({direction,phase:1,movement:1}));
    equal(sampleArtilleryMascotPose({direction}),sampleArtilleryMascotPose({direction,timeMs:ARTILLERY_MASCOT_IDLE_PERIOD_MS}));
    const base=sampleArtilleryMascotPose({direction});
    for(let i=0;i<120;i++) for(const movement of [0,1]) {
      const p=sampleArtilleryMascotPose({direction,phase:i/120,movement,timeMs:i/120*3200});
      assert.deepEqual(p.origin,[0.5,0.5]);
      assert.deepEqual(p.parts.map(part=>part.key),base.parts.map(part=>part.key));
      for(const [index,part] of p.parts.entries()) {
        for(const key of ['width','height','originX','originY']) assert.equal(part[key],base.parts[index][key]);
        for(const value of Object.values(part)) if(typeof value==='number') assert.ok(Number.isFinite(value));
        assert.ok(Math.abs(part.rotation)<0.18);
      }
      for(const kind of ['head','comb','body','tail','foot-left','foot-right']) assert.equal(p.parts.filter(p=>p.key.endsWith('/'+kind)).length,1);
    }
  }
});
test('east is an exact mirror, idle feet remain planted, raised side feet travel forward',()=>{
  for(let i=0;i<64;i++) {
    const args={phase:i/64,movement:1,timeMs:i*20};
    const west=sampleArtilleryMascotPose({...args,direction:'west'}),east=sampleArtilleryMascotPose({...args,direction:'east'});
    west.parts.forEach((p,index)=>{
      const e=east.parts[index];assert.equal(e.key,p.key);near(e.x,256-p.x);near(e.y,p.y);
      near(e.width,-p.width);near(e.height,p.height);near(e.rotation,-p.rotation);
    });
    for(const direction of ARTILLERY_MASCOT_DIRECTIONS) {
      const feet=timeMs=>sampleArtilleryMascotPose({direction,timeMs}).parts.filter(p=>p.key.includes('/foot-'));
      equal(feet(0),feet(i*40));
    }
  }
  const foot=phase=>sampleArtilleryMascotPose({direction:'west',phase,movement:1}).parts.find(p=>p.key==='west/foot-left');
  assert.ok(foot(0.45).x<foot(0.05).x);
  assert.ok(foot(0.25).y<foot(0.05).y && foot(0.25).y<foot(0.45).y);
});
test('mascot sources and baked geometry match the reviewed export',()=>{
  const report=JSON.parse(fs.readFileSync(path.join(root,'docs/qa/artillery-mascot-v1/asset-check.json')));
  assert.equal(Object.keys(report.clips).length,8);
  for(const clip of Object.values(report.clips)) {
    assert.equal(clip.frames,8);assert.equal(clip.distinct,8);
    for(const [left,top,right,bottom] of clip.bounds) {
      assert.ok(left>=5 && top>=5 && right<=251 && bottom<=251);
      assert.ok(right-left>=125 && bottom-top>=195);
    }
    const heights=clip.bounds.map(b=>b[3]-b[1]);
    assert.ok(Math.max(...heights)-Math.min(...heights)<=18);
  }
  for(const p of Object.values(report.parts)) for(const [file,sha] of [[p.file,p.sha256],[p.source,p.sourceSha256]]) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),sha);
  }
  for(const mode of ['idle','walk']) {
    const clip=report.runtime.clips[mode];
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,'src/assets/characters/artillery-mascot',clip.file))).digest('hex'),clip.sha256);
  }
});
test('previous Boombardier can be selected independently',async()=>{
 globalThis.window={location:{search:'?artilleryVisual=final'}};
 const c=await import('../src/config/aceVisual.js?artillery-rollback');delete globalThis.window;
 assert.equal(c.ARTILLERY_VISUAL_VERSION,'final');assert.equal(c.ACE_VISUAL_VERSION,'mascot');assert.equal(c.STORM_VISUAL_VERSION,'mascot');
 assert.equal(c.ARTILLERY_NEXT_WALK_FRAME_RATE,8*1000/650);
});
