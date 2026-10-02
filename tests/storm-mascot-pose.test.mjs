import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { sampleStormMascotPose, STORM_MASCOT_DIRECTIONS } from '../src/storm-mascot/stormMascotPose.js';
import { stormAttackFrame, stormAttackStage } from '../src/storm-mascot/stormAttackPose.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
test('Storm attacks preserve every locomotion component except wings',()=>{
  for(const direction of STORM_MASCOT_DIRECTIONS) for(const movement of [0,1]) for(let i=0;i<80;i++) {
    const args={direction,movement,phase:i/80,timeMs:i*30};
    const base=sampleStormMascotPose(args);
    for(const attack of [-0.25,1]) {
      const p=sampleStormMascotPose({...args,attack});
      assert.deepEqual(p.parts.filter(p=>!p.key.includes('/wing-')),base.parts.filter(p=>!p.key.includes('/wing-')));
      assert.notDeepEqual(p.parts,base.parts);
      assert.deepEqual(p.parts.map(p=>p.key),base.parts.map(p=>p.key));
    }
  }
});
test('Storm mirror, loop closure and forward lifted foot motion',()=>{
  for(let i=0;i<64;i++) for(const attack of [0,-0.25,1]) {
    const args={phase:i/64,movement:1,attack};
    const east=sampleStormMascotPose({...args,direction:'east'}),west=sampleStormMascotPose({...args,direction:'west'});
    east.parts.forEach((p,j)=>{near(west.parts[j].x,256-p.x);near(west.parts[j].width,-p.width);near(west.parts[j].rotation,-p.rotation);});
  }
  for(const direction of STORM_MASCOT_DIRECTIONS) {
    const a=sampleStormMascotPose({direction,phase:0,movement:1}),b=sampleStormMascotPose({direction,phase:1,movement:1});
    a.parts.forEach((p,i)=>{for(const k of ['x','y','rotation','width','height'])near(p[k],b.parts[i][k]);});
  }
  const foot=phase=>sampleStormMascotPose({direction:'east',phase,movement:1}).parts.find(p=>p.key.endsWith('/foot-left'));
  assert.ok(foot(.45).x>foot(.05).x);assert.ok(foot(.25).y<foot(.05).y);
});
test('attack clock respects boundaries and never changes the leg phase index',()=>{
  for(const time of [NaN,-1,220,999]) assert.equal(stormAttackStage(time),null);
  for(let base=0;base<32;base++) for(const time of [0,44,45,159,160,219]) assert.equal(stormAttackFrame(base,time)%8,base%8);
  assert.equal(stormAttackFrame(7,45),31);assert.equal(stormAttackFrame(7,220),null);
  assert.equal(stormAttackFrame(24,0),16);assert.equal(stormAttackFrame(16,0),8);
});
test('all Storm baked frames have margins and source hashes match',()=>{
  const report=JSON.parse(fs.readFileSync('docs/qa/storm-mascot-v1/asset-check.json'));
  assert.equal(Object.keys(report.clips).length,24);
  for(const clip of Object.values(report.clips)) {assert.equal(clip.distinct,8);for(const [l,t,r,b]of clip.bounds)assert.ok(l>=5&&t>=5&&r<=251&&b<=251);}
  for(const p of Object.values(report.parts)) for(const [file,sha]of [[p.file,p.sha256],[p.source,p.sourceSha256]])assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sha);
  for(const clip of Object.values(report.runtime.clips))assert.equal(createHash('sha256').update(fs.readFileSync('src/assets/characters/storm-mascot/'+clip.file)).digest('hex'),clip.sha256);
});
test('Storm rollback leaves Ace and Artillery independently selected',async()=>{
  globalThis.window={location:{search:'?stormVisual=final'}};
  const c=await import('../src/config/aceVisual.js?storm-rollback');delete globalThis.window;
  assert.equal(c.STORM_VISUAL_VERSION,'final');assert.equal(c.ACE_VISUAL_VERSION,'mascot');assert.equal(c.ARTILLERY_VISUAL_VERSION,'final');
});
