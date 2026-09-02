import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARTILLERY_GAMEPLAY_DIRECTIONS,
  ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS,
  ARTILLERY_GAMEPLAY_WALK_PERIOD_MS,
  sampleArtilleryGameplayPose,
} from '../src/artillery-preview/artilleryGameplayPose.js';
import {
  STORM_GAMEPLAY_DIRECTIONS,
  STORM_GAMEPLAY_IDLE_PERIOD_MS,
  STORM_GAMEPLAY_WALK_PERIOD_MS,
  sampleStormGameplayPose,
} from '../src/storm-preview/stormGameplayPose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function exportRig({ id, directions, walkPeriod, idlePeriod, sample, mirrorNote }) {
  const modes = [
    { name: 'walk', frames: 24, duration: walkPeriod, movement: 1 },
    { name: 'idle', frames: 24, duration: idlePeriod, movement: 0 },
  ];
  const clips = [];
  for (const direction of directions) {
    for (const mode of modes) {
      clips.push({
        direction,
        mode: mode.name,
        frames: mode.frames,
        duration: mode.duration,
        poses: Array.from({ length: mode.frames }, (_, index) => {
          const progress = index / mode.frames;
          return sample({
            direction,
            phase: mode.movement ? progress : 0,
            movement: mode.movement,
            timeMs: progress * mode.duration,
          });
        }),
      });
    }
  }
  const output = path.join(root, `art-source/characters/${id}-gameplay-v1/four-direction-poses.json`);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify({
    version: 1,
    frameSize: 256,
    directions,
    ...mirrorNote,
    source: `src/${id === 'artillery' ? 'artillery' : 'storm'}-preview/${id === 'artillery' ? 'artillery' : 'storm'}GameplayPose.js`,
    intent: 'compact gameplay-scale silhouette, readable contacts and anatomically ordered arm layers',
    clips,
  }, null, 2)}\n`);
  console.log(`Exported ${clips.length} ${id} Gameplay walk/idle clips.`);
}

await exportRig({
  id: 'artillery',
  directions: ARTILLERY_GAMEPLAY_DIRECTIONS,
  walkPeriod: ARTILLERY_GAMEPLAY_WALK_PERIOD_MS,
  idlePeriod: ARTILLERY_GAMEPLAY_IDLE_PERIOD_MS,
  sample: sampleArtilleryGameplayPose,
  mirrorNote: { eastDerivedFrom: 'west-mirrored' },
});

await exportRig({
  id: 'storm',
  directions: STORM_GAMEPLAY_DIRECTIONS,
  walkPeriod: STORM_GAMEPLAY_WALK_PERIOD_MS,
  idlePeriod: STORM_GAMEPLAY_IDLE_PERIOD_MS,
  sample: sampleStormGameplayPose,
  mirrorNote: { westDerivedFrom: 'east-mirrored' },
});
