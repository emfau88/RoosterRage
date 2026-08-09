import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(projectRoot, 'src', 'assets', 'runtime-assets.json');

async function digest(filePath) {
  const contents = await fs.readFile(filePath);
  return createHash('sha256').update(contents).digest('hex');
}

async function run() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const failures = [];
  for (const asset of manifest.assets) {
    const sourcePath = path.join(projectRoot, asset.source);
    const runtimePath = path.join(projectRoot, asset.runtime);
    try {
      if (await digest(sourcePath) !== asset.sourceSha256) {
        failures.push(`Source changed: ${asset.source}`);
      }
      if (await digest(runtimePath) !== asset.runtimeSha256) {
        failures.push(`Runtime asset changed: ${asset.runtime}`);
      }
    } catch (error) {
      failures.push(`${asset.runtime}: ${error.message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.join('\n')}\nRun npm run assets:optimize.`);
  }
  console.log(`Runtime assets are current (${manifest.assets.length} files).`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
