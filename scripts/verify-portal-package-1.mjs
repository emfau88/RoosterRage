import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs/qa/portal-package-1');
const read = async (name) => JSON.parse(await fs.readFile(path.join(output, name), 'utf8'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const [release, views, details, matrix, menus, consolidation] = await Promise.all([
  'release-manifest.json', 'views.json', 'details.json', 'menu-matrix.json', 'menus.json', 'css-consolidation.json'
].map(read));

let releaseMatched = 0;
for (const entry of release.entries) {
  const bytes = await fs.readFile(path.join(root, 'dist-release', entry.path));
  if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256) throw new Error(`Release mismatch: ${entry.path}`);
  releaseMatched += 1;
}
if (release.totalBytes > release.budgetBytes) throw new Error('Release exceeds the agreed budget.');
if (views.length !== 76 || details.length !== 9 || matrix.length !== 15
  || menus.viewports.length !== 20 || menus.interactions.length !== 4) throw new Error('Incomplete Package 1 matrix.');
if (!consolidation.unaffectedRulesUnchanged) throw new Error('The CSS consolidation changed unrelated declarations.');
const bossSelections = matrix.filter((row) => row.name.endsWith('-boss-chest'));
if (bossSelections.length !== 3 || !bossSelections.every((row) => row.fourthOfferSelectedAndResumed)) {
  throw new Error('A fourth production boss offer did not resume combat.');
}

let images = 0, textChecks = 0, recipeChecks = 0, synergyChecks = 0;
for (const row of [...views, ...details, ...matrix]) {
  const bytes = await fs.readFile(path.join(output, `${row.name}.png`));
  if (bytes.readUInt32BE(16) !== row.viewport.width * row.viewport.dpr
    || bytes.readUInt32BE(20) !== row.viewport.height * row.viewport.dpr) throw new Error(`PNG dimensions: ${row.name}`);
  images += 1;
  const floor = row.viewport.width < 900 ? 13 : 12;
  // Capture scopes these selectors to the visible choice dialog. The combat
  // receipt shares the change-chip class but belongs to the later HUD package.
  for (const selector of ['.upgrade-button__rank', '.upgrade-button__changes > span',
    '.upgrade-button__description', '.upgrade-button__synergy', '.upgrade-button__evolution-hint']) {
    for (const node of row.ui.nodes[selector] ?? []) {
      if (node.display === 'none' || node.rect.height <= 0 || parseFloat(node.fontSize) < floor) {
        throw new Error(`Unreadable production choice: ${row.name} ${selector}`);
      }
      textChecks += 1;
      if (selector.endsWith('evolution-hint')) recipeChecks += 1;
      if (selector.endsWith('synergy')) synergyChecks += 1;
    }
  }
  for (const node of row.ui.nodes['.upgrade-button__heading strong'] ?? []) {
    if (parseFloat(node.fontSize) < 16) throw new Error(`Small card title: ${row.name}`);
  }
}
let environmentCases = 0;
for (const name of ['environment-views.json', 'environment-details.json', 'environment-menu-matrix.json']) {
  for (const environment of (await read(name)).environments) {
    if (environment.testApiExposed || environment.renderer !== 'WebGL') throw new Error(`Invalid release environment: ${name}`);
    environmentCases += 1;
  }
}
const passMarkers = {
  'menus.log': 'Responsive menu test passed.',
  'meta.log': 'Rooster meta/challenge gate passed.',
  'evolution.log': 'Rooster loadout/EVO gate passed.',
  'hud-report.log': 'Rooster HUD/report gate passed.',
  'pause.log': 'Pause handling test passed.',
  'release.log': 'Release gate passed.'
};
for (const [name, marker] of Object.entries(passMarkers)) {
  if (!(await fs.readFile(path.join(output, name), 'utf8')).includes(marker)) throw new Error(`Missing test success: ${name}`);
}
const sourceFiles = ['src/main.js', 'src/ui/HUD.js', 'src/styles.css', 'src/menu-layouts.css',
  'src/systems/UpgradeSystem.js', 'src/scenes/GameScene.js', 'tests/responsive-menu-runner.mjs',
  'tests/helpers/menu-release-checks.mjs', 'scripts/capture-portal-baseline.mjs', 'scripts/verify-portal-package-1.mjs'];
const sourceHashes = await Promise.all(sourceFiles.map(async (file) => ({
  path: file, sha256: hash(await fs.readFile(path.join(root, file)))
})));
const package0 = JSON.parse(await fs.readFile(path.join(root, 'docs/qa/portal-package-0/verification.json'), 'utf8'));
const report = {
  verifiedAt: new Date().toISOString(),
  baseRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workingTree: 'Local uncommitted Package 1 changes; source hashes identify the verified files.',
  status: 'Package 1 implemented and verified; later release packages remain open.',
  sourceHashes,
  checks: {
    releaseFilesSha256Matched: releaseMatched, releaseBytes: release.totalBytes,
    budgetBytes: release.budgetBytes, headroomBytes: release.budgetBytes - release.totalBytes,
    bytesSmallerThanPackage0: package0.checks.releaseBytes - release.totalBytes,
    viewportCases: menus.viewports.length, interactionCases: menus.interactions.length,
    productionScreenshots: images, productionTextChecks: textChecks,
    productionRecipeChecks: recipeChecks, productionSynergyChecks: synergyChecks,
    productionEnvironmentCases: environmentCases, productionFourthBossSelections: bossSelections.length,
    productionTestApiExposed: false, testsPassed: Object.keys(passMarkers), cssConsolidation: consolidation
  },
  commandsAlreadyExecuted: ['npm.cmd run test:menus', 'npm.cmd run test:meta', 'npm.cmd run test:evolution',
    'npm.cmd run test:hud-report', 'npm.cmd run test:pause', 'npm.cmd run test:release',
    'node scripts/capture-portal-baseline.mjs --views (Package 1 output)',
    'node scripts/capture-portal-baseline.mjs --details (Package 1 output)',
    'node scripts/capture-portal-baseline.mjs --menu-matrix (Package 1 output)', 'git diff --check'],
  limitations: ['Chromium on Windows, headless software graphics; no physical Android/iPhone/Safari validation.',
    'No new natural late-game or ten-minute performance measurement for this menu package.',
    'Combat messages, icon artwork, result hierarchy and final portal packaging remain in Packages 2–6.']
};
await fs.writeFile(path.join(output, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.checks, null, 2));
