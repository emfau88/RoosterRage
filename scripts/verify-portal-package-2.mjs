import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'), output=path.join(root,'docs/qa/portal-package-2');
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const read=name=>fs.readFile(path.join(output,name),'utf8').then(JSON.parse);
const [manifest,combat,bounds,environment]=await Promise.all(['release-manifest.json','combat-checks.json','sprite-bounds.json','environment-combat.json'].map(read));
assert(manifest.totalBytes<manifest.budgetBytes,'Release budget exceeded');
for(const entry of manifest.entries){const file=await fs.readFile(path.join(root,'dist-release',entry.path));assert(file.length===entry.bytes&&crypto.createHash('sha256').update(file).digest('hex')===entry.sha256,`Release mismatch: ${entry.path}`);}
assert(combat.layouts.length===20&&combat.layouts.every(l=>!l.overlap.length&&l.active.length===1),'Incomplete layout checks');
assert(bounds.frames.length===192&&combat.geometry.length===9&&combat.geometry.every(g=>!g.hasWorldHp&&g.poses.length===64),'Incomplete player geometry checks');
assert(combat.health.setting.visible&&combat.health.setting.saved&&!combat.hazards.shake&&!combat.hazards.flash,'Setting or effect check missing');
assert(combat.priority.playerOverlap.held&&combat.priority.coopEdge.held,'Player occlusion guard missing');
assert(environment.environments.every(e=>e.renderer==='WebGL'&&!e.testApiExposed),'Production WebGL coverage missing');
const checks=['pressure','telegraphs','boss','pause','character-lab','hud-report','meta','evolution','menus','release'];
const patterns=[/pressure gate passed/,/telegraph-avoidance gate passed/,/Boss.*passed/i,/Pause handling test passed/,/# fail 0/,/HUD\/report gate passed/,/Meta.*passed/i,/loadout\/EVO gate passed/,/Responsive menu test passed/,/Release.*passed/i];
for(let i=0;i<checks.length;i++){const log=await fs.readFile(path.join(output,`${checks[i]}.log`),'utf8');assert(patterns[i].test(log),`Check not passed: ${checks[i]}`);}
const sourceFiles=['src/scenes/GameScene.js','src/entities/Player.js','src/entities/Enemy.js','src/data/playerVisualBounds.js','src/data/presentationStandards.js','src/systems/MetaProgressionSystem.js','src/systems/RoosterClassSystem.js','src/systems/TestApi.js','src/ui/HUD.js','src/ui/CombatMessages.js','src/main.js','src/combat-layouts.css'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async name=>[name,crypto.createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex')])));
const result={createdAt:new Date().toISOString(),testedParentRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes,releaseFilesMatched:manifest.files,totalBytes:manifest.totalBytes,checks,layouts:20,playerFrames:192,geometryCases:9,deviceAcceptance:'Real hardware, Safari and human direction recognition still require Package 5 acceptance.'};
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log('Package 2 verification passed.');
