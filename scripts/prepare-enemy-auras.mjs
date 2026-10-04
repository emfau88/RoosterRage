import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Packaging only: preserve ImageGen masters, crop empty margins and resize
// above the largest on-screen aura width before transparent WebP export.
const output = 'src/assets/fx/enemy-auras';
await fs.mkdir(output, { recursive: true });
const manifest = [];
for (const [id, version, sourceId] of [
  ['wind', 'v2', 'wind-slim'], ['shield', 'v2', 'shield-slim'],
  ['regen-violet', 'v2', 'regen-slim'], ['regen-green', 'v1', 'regen'],
  ['danger', 'v1', 'danger'], ['royal', 'v1', 'royal']
]) {
  const directory = `art-source/fx/enemy-auras-${version}`;
  const entries = JSON.parse(await fs.readFile(`${directory}/preview-metrics.json`, 'utf8'));
  const meta = entries.find(entry => entry.id === sourceId);
  const [left, top, right, bottom] = meta.crop;
  const x = Math.max(0, left - 18), y = Math.max(0, top - 18);
  const width = Math.min(meta.size[0], right + 18) - x;
  const height = Math.min(meta.size[1], bottom + 18) - y;
  const file = `${output}/aura-${id}.webp`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${directory}/${meta.file}`,
    '-vf', `crop=${width}:${height}:${x}:${y},scale=512:-1:flags=lanczos`,
    '-c:v', 'libwebp', '-quality', '88', '-compression_level', '6', file]);
  manifest.push({ id, source: `${directory}/${meta.file}`, file,
    // Align the same measured silhouette as the approved in-engine preview.
    visibleWidthFraction: (right - left) / width,
    visibleHeightFraction: (bottom - top) / height,
    bytes: (await fs.stat(file)).size });
}
await fs.writeFile(`${output}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`Prepared six transparent aura textures (${manifest.reduce((sum, m) => sum + m.bytes, 0)} bytes).`);
