import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FINAL_ROOSTER_DIRECTIONS,
  FINAL_ROOSTER_SCALE,
  sampleAceFinalPose,
  sampleArtilleryFinalPose,
  sampleStormFinalPose,
} from '../src/final-preview/finalRoosterPoses.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'art-source/characters/rooster-final-v1/master-poses.json');
const characters = [
  ['ace', sampleAceFinalPose],
  ['artillery', sampleArtilleryFinalPose],
  ['storm', sampleStormFinalPose],
];

const payload = {
  version: 1,
  frameSize: 256,
  scales: FINAL_ROOSTER_SCALE,
  intent: 'shared neutral-master approval before final animation bake',
  characters: Object.fromEntries(characters.map(([id, sample]) => [id, {
    neutral: Object.fromEntries(FINAL_ROOSTER_DIRECTIONS.map((direction) => [direction, sample({
      direction,
      phase: 0,
      movement: 0,
      timeMs: 0,
    })])),
    contact: Object.fromEntries(FINAL_ROOSTER_DIRECTIONS.map((direction) => [direction, sample({
      direction,
      phase: 0,
      movement: 1,
      timeMs: 0,
    })])),
  }])),
};

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Exported ${output}`);
