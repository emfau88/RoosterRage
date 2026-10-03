import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { AudioSystem } from '../src/systems/AudioSystem.js';

function fixture() {
  const manager=new EventEmitter();manager.locked=false;
  manager.add=(key)=>{
    const sound=new EventEmitter();sound.key=key;sound.manager=manager;
    sound.play=()=>{sound.isPlaying=true;return true;};
    sound.stop=()=>{sound.isPlaying=false;sound.emit('stop');};
    sound.destroy=()=>{sound.manager=null;};sound.setVolume=()=>{};
    return sound;
  };
  return new AudioSystem({sound:manager,time:{now:1000},cache:{audio:{exists:()=>true}},rng:{float:()=>0}});
}
test('danger steals one lower-priority effect at saturation and releases all counters',()=>{
  const audio=fixture();
  for(let i=0;i<9;i++) assert(audio.play('enemy-hit',{cooldown:0,voiceKey:`hit-${i}`,priority:true}));
  assert.equal(audio.activeSounds.size,9);
  assert(audio.play('enemy-dash',{cooldown:0}));
  assert.equal(audio.activeSounds.size,9);
  assert([...audio.activeSoundMeta.values()].some(m=>m.tier==='danger'));
  assert.equal(audio.activeCategoryVoices.get('sfx'),9);
  audio.stopAll();assert.equal(audio.activeSounds.size,0);assert.equal(audio.activeVoices.size,0);audio.destroy();
});
test('ordinary impacts cannot displace danger, and a muted SFX bus stays silent',()=>{
  const audio=fixture();
  for(let i=0;i<9;i++) assert(audio.play('enemy-dash',{cooldown:0,voiceKey:`dash-${i}`}));
  assert.equal(audio.play('enemy-hit',{cooldown:0}),null);
  assert.equal(audio.play('enemy-dash',{cooldown:0,voiceKey:'dash-final'}),null);
  audio.stopAll();audio.setVolume('sfx',0);
  assert.equal(audio.play('enemy-dash',{cooldown:0}),null);audio.destroy();
});
