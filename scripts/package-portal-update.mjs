import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) throw new Error('Supply the release date: node scripts/package-portal-update.mjs YYYY-MM-DD');
const git = (...args) => {
  const result = spawnSync('git', args, { cwd: project, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
};
const commit = git('rev-parse', 'HEAD'), upstream = git('rev-parse', '@{upstream}');
if (commit !== upstream) throw new Error('Push the current commit before packaging.');
if (git('diff', 'HEAD', '--name-only')) throw new Error('Commit tracked changes before packaging.');
const untrackedSource = git('ls-files', '--others', '--exclude-standard', '--', 'src', 'scripts', 'tests', 'package.json', 'vite.config.js');
if (untrackedSource) throw new Error(`Uncommitted source files: ${untrackedSource}`);
const parent = path.join(project, 'portal-updates');
await mkdir(parent, { recursive: true });
const root = path.join(parent, `${date}-${commit.slice(0, 8)}`);
// A fresh directory is mandatory. Existing releases are never emptied or replaced.
await mkdir(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const name = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(directory, name));
    else files.push(name);
  }
  return files.sort();
}
async function run(script, args, logPath) {
  console.log(`Running ${path.basename(script)} ${args.join(' ')}`);
  const log = createWriteStream(logPath, { flags: 'wx' });
  let tail = '';
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script, ...args], { cwd: project, env: process.env });
      for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => {
        log.write(bytes); tail = (tail + bytes).slice(-6000);
      });
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(new Error(`Command failed (${code}); ${logPath}\n${tail}`)));
    });
  } finally { await new Promise(resolve => log.end(resolve)); }
}
const builds = [];
try {
  for (const platform of ['kongregate', 'y8']) {
    const directory = path.join(root, platform), game = path.join(directory, 'game');
    await mkdir(directory);
    const relative = path.relative(project, game).replaceAll('\\', '/');
    await run('node_modules/vite/bin/vite.js', ['build', '--mode', platform === 'y8' ? 'y8' : 'release', '--outDir', relative], path.join(directory, 'build.log'));
    const files = await filesIn(game), manifest = [];
    if (!files.includes('index.html') || files.some(file => file !== 'index.html' && !file.startsWith('assets/'))) throw new Error('Unexpected game-package contents.');
    for (const file of files) {
      const bytes = await readFile(path.join(game, file));
      manifest.push({ file, bytes: bytes.length, sha256: hash(bytes) });
    }
    const totalBytes = manifest.reduce((sum, file) => sum + file.bytes, 0);
    if (totalBytes > 150_000_000) throw new Error('Package exceeds the project sanity ceiling.');
    const html = await readFile(path.join(game, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)["']/g)].map(match => match[1]);
    if (!refs.length || refs.some(file => !files.includes(file))) throw new Error('Missing relative HTML dependencies.');
    const js = (await Promise.all(files.filter(file => file.endsWith('.js')).map(file => readFile(path.join(game, file), 'utf8')))).join('\n');
    for (const token of ['enemy-aura-live-', 'void-live-ground', 'rocket-impact-eruption-frames', 'combat-effect-light', 'animated-burn-field', 'map-rammer', 'map-stomper', 'enemy-kornkrabbler-alley-run', 'enemy-kornkrabbler-coop-run']) {
      if (!js.includes(token)) throw new Error(`Approved feature missing from ${platform}: ${token}`);
    }
    if (platform === 'y8') {
      for (const token of ['6ab6d722bed188670528ad4a', 'https://cdn.y8.com/minimal-sdk/2-0/y8.min.js', '284511', 'wave-transition']) {
        if (!js.includes(token)) throw new Error(`Y8 integration missing: ${token}`);
      }
      if (js.includes('cdn1.kongregate.com/javascripts/kongregate_api.js')) throw new Error('Wrong SDK in Y8 build.');
    } else if (!js.includes('cdn1.kongregate.com/javascripts/kongregate_api.js') || js.includes('https://cdn.y8.com/minimal-sdk/2-0/y8.min.js')) {
      throw new Error('Wrong portal integration in Kongregate build.');
    }
    builds.push({ platform, directory, game, relative, manifest, totalBytes });
  }
  // Identical game art/audio/styles must be shipped by both portal modes.
  const assetSignature = build => JSON.stringify(build.manifest.filter(file => !/\.(js|html)$/.test(file.file)));
  if (assetSignature(builds[0]) !== assetSignature(builds[1])) throw new Error('Portal art/audio/style assets differ.');
  await run('tests/release-gate.mjs', [builds[0].relative, '/nested/game/', '--kongregate'], path.join(builds[0].directory, 'release-checks.log'));
  await run('tests/y8-package-runner.mjs', [builds[1].relative], path.join(builds[1].directory, 'release-checks.log'));
  await copyFile(path.join(project, 'test-results/y8-package.json'), path.join(builds[1].directory, 'portal-checks.json'));
  if (git('rev-parse', 'HEAD') !== commit || git('diff', 'HEAD', '--name-only')) throw new Error('Source changed during packaging.');
  for (const build of builds) {
    const zipName = `rooster-rage-${build.platform}-${date}.zip`, zipPath = path.join(build.directory, zipName);
    const archive = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `
import pathlib, sys, zipfile
root, destination = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
files = sorted(p for p in root.rglob('*') if p.is_file())
with zipfile.ZipFile(destination, 'x', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in files: archive.write(file, file.relative_to(root).as_posix())
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == {p.relative_to(root).as_posix() for p in files}
    for file in files: assert archive.read(file.relative_to(root).as_posix()) == file.read_bytes()
`, build.game, zipPath], { encoding: 'utf8' });
    if (archive.status !== 0) throw new Error(`ZIP verification failed: ${archive.stderr || archive.error}`);
    const info = { sourceCommit: commit, upstreamCommit: upstream, platform: build.platform, date,
      generatedAt: new Date().toISOString(), checksPassed: true, archiveVerifiedByteForByte: true,
      knownNotes: ['User accepted the opening-pacing outlier: 38.8s versus 36.7s with the original roster for Feed Alley / Artillery / portrait. The strict pacing assertion remains unchanged.'],
      approvedEffects: ['enemy auras', 'rockets and rank-specific impacts', 'Void A / EVO B', 'boss fireball', 'laser', 'Molotov'],
      totalBytes: build.totalBytes, zipBytes: (await stat(zipPath)).size, zipSha256: hash(await readFile(zipPath)), manifest: build.manifest };
    await writeFile(path.join(build.directory, 'BUILD-INFO.json'), JSON.stringify(info, null, 2) + '\n');
    await writeFile(path.join(build.directory, 'UPLOAD.txt'), `Rooster Rage – ${build.platform}\nUpload: ${zipName}\nSource: ${commit}\n\nThe ZIP contains index.html and assets/ at its root.\nLocal build, runtime and archive checks passed; see release-checks.log.\nTest the uploaded draft in the portal preview before publishing, including login/ads/sound/fullscreen.\nNo portal upload was performed by this script.\n`);
    console.log(`${build.platform}: ${zipPath} (${(info.zipBytes / 1e6).toFixed(2)} MB)`);
  }
  console.log(`Both checked packages are ready in ${root}`);
} catch (error) {
  await writeFile(path.join(root, 'BUILD-FAILED.txt'), String(error.stack ?? error));
  throw error;
}
