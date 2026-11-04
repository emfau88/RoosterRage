import test from 'node:test';
import assert from 'node:assert/strict';
import { WAVE_DEFINITIONS } from '../src/data/waveDefinitions.js';
import { addMapVarietyToWave, applyMapVariety, applyKornkrabblerSkin } from '../src/data/mapEnemyVariety.js';
import { RandomSystem } from '../src/systems/RandomSystem.js';

const arenas=['open-yard','vertical-run','square-coop'];
const make=({kind,skin})=>applyKornkrabblerSkin({type:kind,hp:17,speed:90,damage:2,radius:12,scale:.2},skin);
const baseQueue=wave=>[
  ...wave.composition.flatMap(({count,enemy})=>Array.from({length:count},()=>make(enemy))),
  ...(wave.elites??[]).map(enemy=>({...make(enemy),elite:true}))
];

test('600 seeded rosters per map obey quotas, introductions and preserve the original roster',()=>{
  const original=JSON.stringify(WAVE_DEFINITIONS);
  for(const arena of arenas)for(let seed=0;seed<60;seed++)for(const [i,base] of WAVE_DEFINITIONS.entries()) {
    const wave=addMapVarietyToWave(base,i+1,seed,arena),queue=baseQueue(base);
    const before=structuredClone(queue),result=applyMapVariety(queue,wave.variety,make);
    assert.deepEqual(queue,before,'Mutated base roster');
    assert.equal(result.length,wave.count);
    assert.strictEqual(wave.xpCurve,base.xpCurve);
    assert.equal(wave.activeCap,base.activeCap);assert.equal(wave.mobileActiveCap,base.mobileActiveCap);
    if(base.bossWave){assert.deepEqual(result,queue);assert.equal(wave.variety,undefined);continue;}
    const extras=result.filter(e=>e.mapVarietyExtra),regular=result.filter(e=>!e.mapVarietyExtra);
    assert.equal(extras.length,i<4?i+1:wave.variety.extraCount);
    assert(extras.length>=1&&extras.length<=5);
    assert.deepEqual(regular.map(e=>e.type),queue.map(e=>e.type),'Changed original encounter order');
    assert.equal(regular.filter(e=>e.variantSkin).length,Math.round(queue.filter(e=>e.type==='kornkrabbler').length*.2));
    const specials=extras.filter(e=>e.type.startsWith('map-'));
    assert(specials.length<=(i===0?0:i<4?1:2));
    assert(!result.some(e=>e.type==='map-stomper')||i>=3);
    assert(!result.some(e=>e.type==='map-rammer')||i>=1);
    if(base.elites?.length)assert.deepEqual(result.slice(-base.elites.length),queue.slice(-base.elites.length));
    assert(!result[0].mapVarietyExtra);assert(!result.at(-1).mapVarietyExtra);
    const indices=result.flatMap((e,n)=>e.mapVarietyExtra?[n]:[]);
    assert(indices.every((n,j)=>j===0||n-indices[j-1]>1),'Bunched bonus spawns');
  }
  assert.equal(JSON.stringify(WAVE_DEFINITIONS),original);
});

test('same seed gives stable inspection/restart rosters without advancing gameplay randomness',()=>{
  const rng=new RandomSystem('stable-run'),before=rng.getState();
  const build=()=>WAVE_DEFINITIONS.map((w,i)=>{
    const varied=addMapVarietyToWave(w,i+1,rng.seed,'vertical-run');
    return applyMapVariety(baseQueue(w),varied.variety,make);
  });
  const first=build();for(let i=0;i<8;i++)assert.deepEqual(build(),first);
  assert.deepEqual(rng.getState(),before);
  assert.notDeepEqual(addMapVarietyToWave(WAVE_DEFINITIONS[6],7,1,'open-yard'),addMapVarietyToWave(WAVE_DEFINITIONS[6],7,2,'open-yard'));
});

test('map weighting is visible across runs and each map can draw both palettes and roles',()=>{
  for(const arena of arenas) {
    let alley=0,total=0,rammers=0,specials=0;const amounts=new Set();
    for(let seed=0;seed<250;seed++) {
      const base=WAVE_DEFINITIONS[7],wave=addMapVarietyToWave(base,8,seed,arena);
      const queue=applyMapVariety(baseQueue(base),wave.variety,make);amounts.add(wave.variety.extraCount);
      for(const e of queue)if(e.variantSkin){total++;if(e.variantSkin==='alley')alley++;}
      for(const e of queue)if(e.type.startsWith('map-')){specials++;if(e.type==='map-rammer')rammers++;}
    }
    const expected=arena==='open-yard'?.5:arena==='vertical-run'?.85:.15;
    assert(Math.abs(alley/total-expected)<.04,`${arena}: skin bias ${alley/total}`);
    assert(Math.abs(rammers/specials-expected)<.09,`${arena}: role bias ${rammers/specials}`);
    assert.deepEqual([...amounts].sort(),[3,4,5]);
  }
});

test('skins only change presentation, never health, damage, collision or XP',()=>{
  const enemy={type:'kornkrabbler',hp:7,speed:96,damage:2,xpOverride:1.25,radius:12,bodyOffsetX:116,bodyOffsetY:116,scale:.2};
  for(const skin of ['alley','coop']) {
    const result=applyKornkrabblerSkin(enemy,skin);
    for(const [key,value] of Object.entries(enemy))assert.equal(result[key],value);
    assert(result.texture.includes(skin));
  }
  assert.strictEqual(applyKornkrabblerSkin(enemy,'unknown'),enemy);
});
