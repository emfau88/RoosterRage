import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const build = path.join(project, 'dist-y8');
const output = path.join(project, 'dist/y8-upload');
const zipName = 'rooster-rage-y8-complete.zip';
const zipPath = path.join(output, zipName);

async function filesIn(directory, prefix = '') {
  const entries = await readdir(path.join(directory, prefix), { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const name = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(directory, name));
    else result.push(name);
  }
  return result.sort();
}

const files = await filesIn(build);
if (!files.includes('index.html') || !files.some(file => file.startsWith('assets/'))) throw new Error('Incomplete Y8 build');
if (files.some(file => file !== 'index.html' && !file.startsWith('assets/'))) throw new Error('Unexpected files in game-only build');
const html = await readFile(path.join(build, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)["']/g)].map(match => match[1]);
if (!references.length || references.some(file => !files.includes(file))) throw new Error('Missing or non-relative HTML dependencies');
const manifest = [];
for (const file of files) {
  const bytes = await readFile(path.join(build, file));
  manifest.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const totalBytes = manifest.reduce((sum, file) => sum + file.bytes, 0);
// Internal sanity ceiling; the portal's actual upload allowance is separate.
if (totalBytes > 150_000_000) throw new Error('Y8 package exceeds the 150 MB project sanity ceiling');
const js = (await Promise.all(files.filter(file => file.endsWith('.js')).map(file => readFile(path.join(build, file), 'utf8')))).join('\n');
if (!js.includes('6ab6d722bed188670528ad4a') || !js.includes('https://cdn.y8.com/minimal-sdk/2-0/y8.min.js')) throw new Error('Y8 integration missing');
if (js.includes('cdn1.kongregate.com/javascripts/kongregate_api.js')) throw new Error('Y8 package includes Kongregate integration');
if (!['284511', 'showAd', 'run-start', 'wave-transition'].every(token => js.includes(token))) throw new Error('Y8 ad integration missing');
await mkdir(output, { recursive: true });

// Python's ZIP writer provides portable '/' paths and verifies every archived byte.
const python = process.platform === 'win32' ? 'python' : 'python3';
const archive = spawnSync(python, ['-c', `
import pathlib, sys, zipfile
root, destination = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
files = sorted(p for p in root.rglob('*') if p.is_file())
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in files:
        archive.write(file, file.relative_to(root).as_posix())
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {p.relative_to(root).as_posix() for p in files}
    for file in files:
        assert archive.read(file.relative_to(root).as_posix()) == file.read_bytes()
print('Verified complete ZIP: %s files' % len(files))
`, build, zipPath], { encoding: 'utf8' });
if (archive.status !== 0) throw new Error(`ZIP creation/verification failed: ${archive.stderr || archive.error}`);
console.log(archive.stdout.trim());
await copyFile(path.join(build, 'index.html'), path.join(output, 'index.html'));
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: project, encoding: 'utf8' });
const changes = spawnSync('git', ['status', '--porcelain'], { cwd: project, encoding: 'utf8' });
const info = { generatedAt: new Date().toISOString(), sourceCommit: revision.stdout.trim(),
  uncommittedChanges: Boolean(changes.stdout.trim()), platform: 'y8', appId: '6ab6d722bed188670528ad4a',
  gameId: '284511', adsEnabled: true, adIntervalMs: 180000,
  adPlacements: ['run-start', 'wave-transition'], files: manifest.length, totalBytes,
  zipBytes: (await stat(zipPath)).size,
  zipSha256: createHash('sha256').update(await readFile(zipPath)).digest('hex'), manifest };
await writeFile(path.join(output, 'BUILD-INFO.json'), JSON.stringify(info, null, 2) + '\n');
await writeFile(path.join(output, 'UPLOAD-INSTRUCTIONS.txt'),
  `ROOSTER RAGE SURVIVOR — Y8\n\nUpload ${zipName} in your game's Builds tab.\n` +
  `The ZIP contains index.html and assets/ directly at its root.\n` +
  `The separate index.html is only a reference: it needs the assets in the ZIP.\n\n` +
  `App ID: ${info.appId}\nGame ID: ${info.gameId}\n` +
  `SDK 2.0 loads from Y8's CDN. Auto-login and interstitial ads are enabled.\n` +
  `Ads: before a run and between waves, at least 180 seconds after the last ad ends.\n` +
  `Gameplay and audio pause during ads. No-fill, blocked ads and errors continue safely.\n` +
  `Local saves only. No Y8 leaderboards, achievements or cloud-save integration.\n` +
  `Before review, test the uploaded build in Y8 Preview/QA for login, sound, fullscreen and gameplay.\n` +
  `Local tests use HTTP, never file://.\nGenerated (UTC): ${info.generatedAt}\n`);
console.log(`Y8 upload ready: ${zipPath}\n${info.files} files; ${(totalBytes / 1024 / 1024).toFixed(2)} MiB unpacked; ZIP SHA-256 ${info.zipSha256}`);
