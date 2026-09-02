import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACE_GAMEPLAY_DIRECTIONS,
  ACE_GAMEPLAY_IDLE_PERIOD_MS,
  ACE_GAMEPLAY_WALK_PERIOD_MS,
  sampleAceGameplayPose,
} from '../src/ace-preview/aceGameplayPose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modes = [
  { name: 'walk', frames: 24, duration: ACE_GAMEPLAY_WALK_PERIOD_MS, movement: 1 },
  { name: 'idle', frames: 24, duration: ACE_GAMEPLAY_IDLE_PERIOD_MS, movement: 0 },
];
const clips = [];
for (const direction of ACE_GAMEPLAY_DIRECTIONS) {
  for (const mode of modes) {
    clips.push({
      direction,
      mode: mode.name,
      frames: mode.frames,
      duration: mode.duration,
      poses: Array.from({ length: mode.frames }, (_, index) => {
        const progress = index / mode.frames;
        return sampleAceGameplayPose({
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
  directions: ACE_GAMEPLAY_DIRECTIONS,
  eastDerivedFrom: 'west-mirrored',
  source: 'src/ace-preview/aceGameplayPose.js',
  intent: 'gameplay-scale readability at 0.25 sprite scale and portrait camera zoom',
  clips,
};
const output = path.join(root, 'art-source/characters/ace-gameplay-v1/four-direction-poses.json');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Exported ${clips.length} Ace Gameplay walk/idle clips.`);
