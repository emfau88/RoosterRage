import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const releaseDirectory = fileURLToPath(new URL('../dist-release/', import.meta.url));
const uploadDirectory = fileURLToPath(new URL('../dist/kongregate-upload/', import.meta.url));
const stagingDirectory = fileURLToPath(new URL('../dist/kongregate-upload/package/', import.meta.url));
const trackedReleaseDirectory = fileURLToPath(new URL('../releases/kongregate/', import.meta.url));
const builtIndexPath = fileURLToPath(new URL('../dist-release/index.html', import.meta.url));
const builtAssetsPath = fileURLToPath(new URL('../dist-release/assets/', import.meta.url));
const splitIndexPath = fileURLToPath(new URL('../dist/kongregate-upload/index.html', import.meta.url));
const completeZipName = 'rooster-rage-kongregate-complete.zip';
const additionalZipName = 'rooster-rage-additional-files.zip';
const completeZipPath = fileURLToPath(new URL(`../dist/kongregate-upload/${completeZipName}`, import.meta.url));
const additionalZipPath = fileURLToPath(new URL(`../dist/kongregate-upload/${additionalZipName}`, import.meta.url));

async function assertFile(path, label) {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile()) throw new Error(`Kongregate packaging is missing ${label}: ${path}`);
}

await assertFile(builtIndexPath, 'the release index.html');
await stat(builtAssetsPath).catch(() => {
  throw new Error(`Kongregate packaging is missing the release assets directory: ${builtAssetsPath}`);
});

await rm(uploadDirectory, { recursive: true, force: true });
await mkdir(stagingDirectory, { recursive: true });

await cp(builtIndexPath, `${stagingDirectory}/index.html`);
await cp(builtAssetsPath, `${stagingDirectory}/assets`, { recursive: true });
await cp(builtIndexPath, splitIndexPath);

const html = await readFile(builtIndexPath, 'utf8');
const localReferences = [...html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)["']/g)].map((match) => match[1]);
if (localReferences.length === 0) {
  throw new Error('Kongregate packaging found no relative CSS or JavaScript references in the release HTML.');
}

for (const relativePath of localReferences) {
  await assertFile(fileURLToPath(new URL(`../dist-release/${relativePath}`, import.meta.url)), relativePath);
}

function createZipArchive(destinationPath, entries) {
  const result = spawnSync('tar.exe', ['-a', '-c', '-f', destinationPath, ...entries], {
    cwd: stagingDirectory,
    stdio: 'inherit'
  });
  if (result.status !== 0) throw new Error(`Could not create ${destinationPath}.`);

  const listing = spawnSync('tar.exe', ['-t', '-f', destinationPath], {
    cwd: projectDirectory,
    encoding: 'utf8'
  });
  if (listing.status !== 0) throw new Error(`Could not verify ${destinationPath}.`);

  const archivedPaths = listing.stdout.split(/\r?\n/).filter(Boolean);
  if (archivedPaths.some((archivedPath) => archivedPath.includes('\\'))) {
    throw new Error(`ZIP contains non-portable backslash paths: ${destinationPath}`);
  }
  for (const entry of entries) {
    if (!archivedPaths.some((archivedPath) => archivedPath === entry || archivedPath.startsWith(`${entry}/`))) {
      throw new Error(`ZIP is missing its expected root entry ${entry}: ${destinationPath}`);
    }
  }
}

// Preferred portal upload: one archive with index.html and every required asset at its root.
createZipArchive(completeZipPath, ['index.html', 'assets']);
// Compatibility fallback for upload forms with a separate Additional Files field.
createZipArchive(additionalZipPath, ['assets']);

const instructions = `ROOSTER RAGE — Kongregate upload\n\n` +
  `RECOMMENDED:\n` +
  `Upload ${completeZipName} as the WebGL/HTML5 file.\n` +
  `Leave Additional Files empty. The ZIP contains index.html and assets/ at its root.\n\n` +
  `FALLBACK (if the portal provides separate file fields):\n` +
  `Upload index.html as the WebGL/HTML5 file.\n` +
  `Upload ${additionalZipName} as Additional Files.\n\n` +
  `Do not use ${additionalZipName} as the main file: it intentionally has no index.html.\n`;
await writeFile(`${uploadDirectory}/UPLOAD-INSTRUCTIONS.txt`, instructions, 'utf8');

await rm(trackedReleaseDirectory, { recursive: true, force: true });
await mkdir(trackedReleaseDirectory, { recursive: true });
await Promise.all([
  cp(splitIndexPath, `${trackedReleaseDirectory}/index.html`),
  cp(additionalZipPath, `${trackedReleaseDirectory}/${additionalZipName}`),
  writeFile(`${trackedReleaseDirectory}/UPLOAD-INSTRUCTIONS.txt`, instructions, 'utf8')
]);
await rm(stagingDirectory, { recursive: true, force: true });

console.log('Kongregate packages created successfully:');
console.log(`- ${completeZipPath} (recommended)`);
console.log(`- ${splitIndexPath} + ${additionalZipPath} (fallback)`);
console.log(`- ${trackedReleaseDirectory} (GitHub branch artifacts)`);
