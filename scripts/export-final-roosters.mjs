import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACE_GAMEPLAY_IDLE_PERIOD_MS, ACE_GAMEPLAY_WALK_PERIOD_MS } from '../src/ace-preview/aceGameplayPose.js';
import { ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS, ARTILLERY_GAMEPLAY_WALK_PERIOD_MS } from '../src/artillery-preview/artilleryGameplayPose.js';
import { STORM_GAMEPLAY_IDLE_PERIOD_MS, STORM_GAMEPLAY_WALK_PERIOD_MS } from '../src/storm-preview/stormGameplayPose.js';
import {
  FINAL_ROOSTER_DIRECTIONS,
  FINAL_ROOSTER_SCALE,
  sampleAceFinalPose,
  sampleArtilleryFinalPose,
  sampleStormFinalPose,
} from '../src/final-preview/finalRoosterPoses.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'art-source/characters/rooster-final-v1/four-direction-poses.json');
const specs = {
  ace: { sample: sampleAceFinalPose, walk: ACE_GAMEPLAY_WALK_PERIOD_MS, idle: ACE_GAMEPLAY_IDLE_PERIOD_MS },
  artillery: { sample: sampleArtilleryFinalPose, walk: ARTILLERY_GAMEPLAY_WALK_PERIOD_MS, idle: ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS },
  storm: { sample: sampleStormFinalPose, walk: STORM_GAMEPLAY_WALK_PERIOD_MS, idle: STORM_GAMEPLAY_IDLE_PERIOD_MS },
};

const characters = {};
for (const [id, spec] of Object.entries(specs)) {
  const clips = [];
  for (const direction of FINAL_ROOSTER_DIRECTIONS) {
    for (const mode of [
      { name: 'walk', frames: 24, duration: spec.walk, movement: 1 },
      { name: 'idle', frames: 24, duration: spec.idle, movement: 0 },
    ]) {
      clips.push({
        direction,
        mode: mode.name,
        frames: mode.frames,
        duration: mode.duration,
        poses: Array.from({ length: mode.frames }, (_, index) => spec.sample({
          direction,
          phase: mode.movement ? index / mode.frames : 0,
          movement: mode.movement,
          timeMs: index / mode.frames * mode.duration,
        })),
      });
    }
  }
  characters[id] = { scale: FINAL_ROOSTER_SCALE[id], clips };
}

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify({
  version: 1,
  frameSize: 256,
  directions: FINAL_ROOSTER_DIRECTIONS,
  runtimeFrames: { walk: 8, idle: 8 },
  sideSources: { ace: 'west', artillery: 'west', storm: 'east' },
  characters,
}, null, 2)}\n`);
console.log(`Exported final rooster clips to ${output}`);
