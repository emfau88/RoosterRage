import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs/qa/artillery-mascot-v1/artillery-vergleich.html');
const embedded = {};
for (const version of ['final','mascot']) for (const mode of ['idle','walk']) {
  if(version==='final' && mode.includes('attack')) continue;
  const bytes=await fs.readFile(path.join(root,`src/assets/characters/artillery-${version}/rooster-artillery-${version}-${mode}.webp`));
  embedded[`${version}-${mode}`]=`data:image/webp;base64,${bytes.toString('base64')}`;
}

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boombardier · isolierter Animationsvergleich</title><style>
:root{color-scheme:dark;font:16px/1.5 system-ui,sans-serif;background:#111c20;color:#edf2e9}*{box-sizing:border-box}body{max-width:1160px;margin:auto;padding:28px}header p{max-width:850px;color:#bdcdc7}h1{margin:0;font-size:clamp(25px,4vw,36px)}.tag{color:#edc578;font-size:13px;letter-spacing:.12em;text-transform:uppercase}h2{margin:0;font-size:22px}.controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap;padding:18px;margin:24px 0 18px;background:#1c2d31;border:1px solid #395155;border-radius:12px}label{display:flex;flex-direction:column;gap:5px;font-size:13px;color:#ccd8d1}select,button{font:inherit;font-size:15px;color:#f8f6eb;background:#2b4247;padding:10px 14px;border:1px solid #6b8585;border-radius:7px;min-height:44px}button{cursor:pointer}button:disabled,select:disabled{opacity:.5}button:focus-visible,select:focus-visible{outline:3px solid #edc578;outline-offset:3px}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.card{min-width:0;border:1px solid #49605e;background:#1b2c30;border-radius:14px;overflow:hidden}.card header{padding:18px 20px}.card p{margin:4px 0 0;color:#c0cfc7;font-size:14px}.stage{height:310px;position:relative;background:#48544a}.stage canvas{width:100%;height:100%;display:block}.note{padding:10px 20px;color:#bdcdc7;font-size:13px}.status{display:flex;gap:20px;flex-wrap:wrap;margin:16px 0;color:#ffde97;font-variant-numeric:tabular-nums}.help{padding:14px 18px;background:#1c2d31;border-radius:10px;color:#bdcdc7}footer{font-size:13px;color:#a8bdb6;margin-top:20px}kbd{background:#334b4c;border:1px solid #647c76;border-radius:4px;padding:1px 5px;color:white}@media(max-width:620px){body{padding:14px}.pair{gap:8px}.card header{padding:12px}h2{font-size:18px}.stage{height:260px}.note{padding:8px 12px}.controls{gap:8px;padding:12px}select,button{padding:8px}.card p{font-size:12px}}
</style></head><body><header><div class="tag">Rooster Rage · Charaktertest</div><h1>Boombardier: alt und neu in Bewegung</h1><p>Beide Varianten laufen synchron in derselben Größe. Alle Bilder sind in dieser Datei enthalten — sie funktioniert auch offline per Doppelklick.</p></header>
<div class="controls"><label>Links vergleichen<select id="baseline" disabled><option value="final">Alter Boombardier</option></select></label><label>Richtung<select id="direction" disabled><option value="south">Vorne / Süden</option><option value="west" selected>Seite / Westen</option><option value="east">Seite / Osten</option><option value="north">Hinten / Norden</option></select></label><label>Animation<select id="mode" disabled><option value="walk">Laufen</option><option value="idle">Stehen / Idle</option></select></label><label>Tempo<select id="speed" disabled><option value="1">Normal</option><option value="0.5">Halbe Geschwindigkeit</option><option value="0.25">Zeitlupe (¼)</option></select></label><label>Spritefläche<select id="size" disabled><option value="192" selected>192 px · vergrößert</option><option value="64">64 px · Spielmaßstab</option><option value="36">36 px · sehr klein</option></select></label><button id="pause" disabled>Anhalten</button><button id="step" disabled>Einzelbild →</button></div>
<main class="pair"><section class="card"><header><h2 id="baseline-title">Alter Boombardier</h2><p id="baseline-subtitle">Bisherige Final-Version</p></header><div class="stage"><canvas id="old" aria-label="Vergleichsfigur animiert"></canvas></div><div class="note"><span id="baseline-note">Bisherige Rüstung · kleinerer Kamm</span></div></section><section class="card"><header><h2>Neuer Boombardier</h2><p>Neue Figur · kräftiger Bomber</p></header><div class="stage"><canvas id="new" aria-label="Neuer Boombardier animiert"></canvas></div><div class="note">Oranges Gefieder · dunkle Rüstung · voller Federfächer</div></section></main>
<div class="status"><span id="status" role="status">Animationen werden geladen …</span><span id="measure"></span></div><div class="help"><strong>Direkt ausprobieren:</strong> <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> oder Pfeiltasten gedrückt halten: in die jeweilige Richtung laufen. Loslassen: Idle. <kbd>Leertaste</kbd>: Pause. Die Figuren bleiben zum Vergleich auf der Stelle.</div><footer>Acht feste Laufphasen, 650 ms pro Zyklus. Idle 3200 ms. Gleicher Sprite-Maßstab, unveränderte Spielfunktionen. Die alte Figur bleibt gespeichert. Keine zusätzliche Angriffsanimation.</footer>
<script>
(async()=>{
const sources=${JSON.stringify(embedded)};
const sheets={};const status=document.querySelector('#status');
try{await Promise.all(Object.entries(sources).map(async([key,src])=>{const image=new Image();image.src=src;await image.decode();sheets[key]=image;}));}catch(error){status.textContent='Die eingebetteten Bilder konnten nicht geladen werden.';console.error(error);return;}
const direction=document.querySelector('#direction'),mode=document.querySelector('#mode'),speed=document.querySelector('#speed'),size=document.querySelector('#size'),pause=document.querySelector('#pause');
const baseline=document.querySelector('#baseline');baseline.onchange=()=>{document.querySelector('#baseline-title').textContent=baseline.value==='final'?'Alter Boombardier':'Alter Boombardier';document.querySelector('#baseline-subtitle').textContent=baseline.value==='final'?'Bisherige Final-Version':'Bisherige Final-Version';document.querySelector('#baseline-note').textContent=baseline.value==='final'?'Schlanker Körper · kleinerer Kopf':'Bisherige Rüstung · kleinerer Kamm';};
const canvases=[document.querySelector('#old'),document.querySelector('#new')];
let phase=0,playing=true,last=performance.now();const held=new Map();
document.querySelectorAll('button,select').forEach(control=>control.disabled=false);
function setPlaying(value){playing=value;pause.textContent=playing?'Anhalten':'Abspielen';}
pause.onclick=()=>setPlaying(!playing);
document.querySelector('#step').onclick=()=>{setPlaying(false);phase=((Math.floor(phase*8)+1)%8)/8;};
mode.onchange=()=>{phase=0;held.clear();};direction.onchange=()=>held.clear();
const keys={w:'north',ArrowUp:'north',a:'west',ArrowLeft:'west',s:'south',ArrowDown:'south',d:'east',ArrowRight:'east'};
function applyHeld(){if(held.size){direction.value=[...held.values()].at(-1);mode.value='walk';setPlaying(true);}else mode.value='idle';}
document.addEventListener('keydown',event=>{if(event.target.matches('select,input,textarea'))return;const key=event.key.length===1?event.key.toLowerCase():event.key;if(keys[key]){event.preventDefault();held.delete(key);held.set(key,keys[key]);applyHeld();}else if(event.code==='Space'){event.preventDefault();if(!event.repeat)setPlaying(!playing);}});
document.addEventListener('keyup',event=>{const key=event.key.length===1?event.key.toLowerCase():event.key;if(held.delete(key)){event.preventDefault();applyHeld();}});
window.addEventListener('blur',()=>{if(held.size){held.clear();mode.value='idle';}});
document.addEventListener('visibilitychange',()=>{last=performance.now();});
let previousStatus='';
function draw(now){const duration=mode.value==='walk'?650:3200;if(playing)phase=(phase+Math.min(now-last,100)*Number(speed.value)/duration)%1;last=now;const frame=Math.floor(phase*8),row={south:0,west:1,east:1,north:3}[direction.value];const boxes=canvases.map(c=>c.getBoundingClientRect());const drawSize=Math.min(Number(size.value),...boxes.map(b=>b.width-16));
canvases.forEach((canvas,index)=>{const rect=boxes[index],dpr=Math.min(devicePixelRatio||1,3),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);const bottom=rect.height-30,top=bottom-drawSize;
ctx.strokeStyle='#ffffff18';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(12,bottom);ctx.lineTo(rect.width-12,bottom);ctx.stroke();ctx.save();ctx.translate(rect.width/2,top);if(direction.value==='east')ctx.scale(-1,1);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(sheets[(index?'mascot':baseline.value)+'-'+mode.value],frame*256,row*256,256,256,-drawSize/2,0,drawSize,drawSize);ctx.restore();});
const text=(playing?'Läuft':'Pausiert')+' · Frame '+(frame+1)+' / 8 · '+direction.options[direction.selectedIndex].text+' · '+mode.options[mode.selectedIndex].text;if(text!==previousStatus){status.textContent=text;previousStatus=text;}
document.querySelector('#measure').textContent='Spritefläche: '+Math.round(drawSize)+' px'+(drawSize<Number(size.value)?' (an Fenster angepasst)':'')+' · gleicher Maßstab';requestAnimationFrame(draw);}
requestAnimationFrame(draw);
})();
</script></body></html>`;
await fs.writeFile(output, html);
console.log(JSON.stringify({ file: output, bytes: Buffer.byteLength(html), embeddedAtlases: Object.keys(embedded).length }));
