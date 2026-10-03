import fs from 'node:fs/promises';
import path from 'node:path';
import { STORM_MASCOT_DIRECTIONS, STORM_MASCOT_IDLE_PERIOD_MS, STORM_MASCOT_WALK_PERIOD_MS, sampleStormMascotPose } from '../src/storm-mascot/stormMascotPose.js';
const root = path.resolve(import.meta.dirname,'..');
const clips = [];
for (const direction of STORM_MASCOT_DIRECTIONS) for (const mode of ['idle','walk','idle-attack-0','idle-attack-1','walk-attack-0','walk-attack-1']) {
  const durationMs = mode.startsWith('walk') ? STORM_MASCOT_WALK_PERIOD_MS : STORM_MASCOT_IDLE_PERIOD_MS;
  const frames = Array.from({length:8},(_,index)=>sampleStormMascotPose({
    direction,phase:index/8,movement:mode.startsWith('walk')?1:0,timeMs:index/8*durationMs,attack:mode.endsWith('0')?-0.25:mode.endsWith('1')?1:0
  }));
  clips.push({direction,mode,durationMs,frames});
}
await fs.writeFile(path.join(root,'art-source/characters/storm-mascot-v1/poses.json'),JSON.stringify({frameSize:256,clips},null,2)+'\n');
console.log('Exported 24 Storm mascot clips (192 poses).');
