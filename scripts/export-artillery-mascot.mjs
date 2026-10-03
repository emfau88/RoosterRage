import fs from 'node:fs/promises';
import path from 'node:path';
import { ARTILLERY_MASCOT_DIRECTIONS, ARTILLERY_MASCOT_IDLE_PERIOD_MS, ARTILLERY_MASCOT_WALK_PERIOD_MS, sampleArtilleryMascotPose } from '../src/artillery-mascot/artilleryMascotPose.js';
const root = path.resolve(import.meta.dirname,'..');
const clips = [];
for (const direction of ARTILLERY_MASCOT_DIRECTIONS) for (const mode of ['idle','walk']) {
  const durationMs = mode === 'walk' ? ARTILLERY_MASCOT_WALK_PERIOD_MS : ARTILLERY_MASCOT_IDLE_PERIOD_MS;
  const frames = Array.from({length:8},(_,index)=>sampleArtilleryMascotPose({
    direction,phase:index/8,movement:mode==='walk'?1:0,timeMs:index/8*durationMs
  }));
  clips.push({direction,mode,durationMs,frames});
}
await fs.writeFile(path.join(root,'art-source/characters/artillery-mascot-v1/poses.json'),JSON.stringify({frameSize:256,clips},null,2)+'\n');
console.log('Exported eight Artillery mascot clips (64 poses).');
