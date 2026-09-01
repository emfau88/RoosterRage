import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARTILLERY_DIRECTIONS,
  ARTILLERY_IDLE_PERIOD_MS,
  ARTILLERY_WALK_PERIOD_MS,
  sampleArtilleryPose,
} from '../src/artillery-preview/artilleryFourDirectionPose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modes = [
  { name: 'walk', frames: 24, duration: ARTILLERY_WALK_PERIOD_MS, movement: 1 },
  { name: 'idle', frames: 24, duration: ARTILLERY_IDLE_PERIOD_MS, movement: 0 },
];
const clips = [];
for (const direction of ARTILLERY_DIRECTIONS) {
  for (const mode of modes) {
    clips.push({
      direction,
      mode: mode.name,
      frames: mode.frames,
      duration: mode.duration,
      poses: Array.from({ length: mode.frames }, (_, index) => {
        const progress = index / mode.frames;
        return sampleArtilleryPose({
          direction,
          phase: mode.movement ? progress : 0,
          movement: mode.movement,
          timeMs: progress * mode.duration,
        });
      }),
    });
  }
}
const data = {
  version: 1,
  frameSize: 256,
  columns: 8,
  directions: ARTILLERY_DIRECTIONS,
  eastDerivedFrom: 'west-mirrored',
  source: 'src/artillery-preview/artilleryFourDirectionPose.js',
  clips,
};
const output = path.join(root, 'art-source/characters/artillery-production-v1/four-direction-poses.json');
await fs.writeFile(output, JSON.stringify(data, null, 2) + '\n');
console.log(`Exported ${clips.length} Bummbert walk/idle clips.`);
