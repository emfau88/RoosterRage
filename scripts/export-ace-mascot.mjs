import fs from 'node:fs/promises';
import path from 'node:path';
import { ACE_MASCOT_DIRECTIONS, ACE_MASCOT_IDLE_PERIOD_MS, ACE_MASCOT_WALK_PERIOD_MS, sampleAceMascotPose } from '../src/ace-mascot/aceMascotPose.js';
const root = path.resolve(import.meta.dirname,'..');
const clips = [];
for (const direction of ACE_MASCOT_DIRECTIONS) for (const mode of ['idle','walk']) {
  const durationMs = mode === 'walk' ? ACE_MASCOT_WALK_PERIOD_MS : ACE_MASCOT_IDLE_PERIOD_MS;
  const frames = Array.from({length:8},(_,index)=>sampleAceMascotPose({
    direction,phase:index/8,movement:mode==='walk'?1:0,timeMs:index/8*durationMs
  }));
  clips.push({direction,mode,durationMs,frames});
}
await fs.writeFile(path.join(root,'art-source/characters/ace-mascot-v1/poses.json'),JSON.stringify({frameSize:256,clips},null,2)+'\n');
console.log('Exported eight Ace mascot clips (64 poses).');
