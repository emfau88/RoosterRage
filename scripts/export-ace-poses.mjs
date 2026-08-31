import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleAceSouthPose, ACE_WALK_PERIOD_MS, ACE_IDLE_PERIOD_MS, ACE_SHOT_DURATION_MS, ACE_HURT_DURATION_MS } from '../src/character-lab/aceSouthPose.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clips = [
  { name: 'walk', frames: 24, duration: ACE_WALK_PERIOD_MS, movement: 1 },
  { name: 'idle', frames: 24, duration: ACE_IDLE_PERIOD_MS, movement: 0 },
  { name: 'shot', frames: 13, duration: ACE_SHOT_DURATION_MS, movement: 0, shot: true },
  { name: 'hurt', frames: 12, duration: ACE_HURT_DURATION_MS, movement: 0, hurt: true },
  { name: 'walk-shot', frames: 24, duration: ACE_WALK_PERIOD_MS, movement: 1, shot: true },
  { name: 'walk-hurt', frames: 24, duration: ACE_WALK_PERIOD_MS, movement: 1, hurt: true },
];
const data = {
  frameSize: 256, origin: [0.5, 0.5], physics: { radius: 58, offset: [70, 86] },
  source: 'src/character-lab/aceSouthPose.js',
  clips: clips.map((clip) => ({ ...clip, poses: Array.from({ length: clip.frames }, (_, i) => {
    const timeMs = i / clip.frames * clip.duration;
    return sampleAceSouthPose({ phase: timeMs / ACE_WALK_PERIOD_MS, timeMs, movement: clip.movement,
      shotAgeMs: clip.shot ? timeMs : Infinity, hurtAgeMs: clip.hurt ? timeMs : Infinity });
  }) }))
};
const output = path.join(root, 'art-source/characters/ace-production-v1/poses.json');
await fs.writeFile(output, JSON.stringify(data, null, 2) + '\n');
console.log(`Exported ${clips.length} clips from the live rig's pose sampler.`);
