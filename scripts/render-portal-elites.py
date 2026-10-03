"""Create single-image comparisons, animated pairs and an isolated offline lab."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]; QA=ROOT/'docs/qa/portal-elites-v2';QA.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
for width in [1440,390]:
    left=Image.open(QA/f'game-{width}-before.png').convert('RGB');right=Image.open(QA/f'game-{width}-after.png').convert('RGB')
    board=Image.new('RGB',(left.width*2+16,left.height+56),'#22323a');d=ImageDraw.Draw(board)
    d.text((16,13),'VORHER',font=font,fill='#fff1ce');d.text((left.width+32,13),'NACHHER',font=font,fill='#fff1ce')
    board.paste(left,(0,56));board.paste(right,(left.width+16,56));board.save(QA/f'game-{width}-vergleich.webp',quality=92)
for kind,old in [('tank','enemy-elite-brute-stomp'),('chili','enemy-elite-spitter-run')]:
    previous=Image.open(ROOT/f'src/assets/enemies/animations/{old}.webp').convert('RGBA')
    current=Image.open(ROOT/f'src/assets/enemies/portal-v2/enemy-{kind}-run.webp').convert('RGBA');clip=[]
    for i in range(4):
        board=Image.new('RGB',(640,312),'#253730');d=ImageDraw.Draw(board)
        d.text((20,10),'ALTE ELITE',font=font,fill='#fff1ce');d.text((340,10),'PANZERTRUTHAHN' if kind=='tank' else 'CHILI-PUTER',font=font,fill='#fff1ce')
        old_frame=[0,1,0,1][i] if kind=='tank' else i
        for col,im,frame in [(0,previous,old_frame),(1,current,i)]:
            crop=im.crop((frame*256,0,(frame+1)*256,256));board.paste(crop,(32+col*320,56),crop)
        clip.append(board)
    clip[0].save(QA/f'{kind}-walk-vergleich.gif',save_all=True,append_images=clip[1:],duration=140,loop=0)
config={k:{'run':f'../../../src/assets/enemies/portal-v2/enemy-{k}-run.webp','actions':f'../../../src/assets/enemies/portal-v2/enemy-{k}-actions.webp',
               'oldRun':f'../../../src/assets/enemies/animations/{"enemy-elite-brute-stomp" if k=="tank" else "enemy-elite-spitter-run"}.webp',
               'oldActions':f'../../../src/assets/enemies/animations/{"enemy-elite-brute-stomp" if k=="tank" else "enemy-elite-spitter-pulse"}.webp'} for k in ['tank','chili']}
html='''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Neue Elites – isolierter Vergleich</title><style>body{background:#101c22;color:#e9eee8;font:16px/1.5 system-ui;margin:24px}main{max-width:1500px;margin:auto}h1,h2{color:#f2cf7b}a{color:#8bd7e7}img{max-width:100%;height:auto}canvas{max-width:100%;background:#253730;border:1px solid #647354;border-radius:12px}section{padding:20px;margin:24px 0;background:#18282d;border-radius:12px}button,select{padding:10px;margin:4px;color:#eee;background:#253d43;border:1px solid #839c87;border-radius:8px}button:focus-visible,select:focus-visible{outline:2px solid #ffdc75}.controls{display:flex;flex-wrap:wrap;gap:8px}.note{max-width:950px}</style><main><h1>Zwei neue Elite-Gegner</h1><p class="note">Links die erhaltene alte Version, rechts die neue Figur. Die isolierte Animation zeigt Lauf und Angriff getrennt. Das automatische Angriffsschema ist eine Vorschau; im Spiel lösen die vorhandenen Telegraphe die Posen aus.</p><div class="controls"><label>Ansicht <select id="direction"><option value="0">Links</option><option value="1">Rechts</option><option value="2">Rücken</option><option value="3">Vorne</option></select></label><label>Animation <select id="mode"><option value="cycle">Lauf + Angriffszyklus</option><option value="walk">Nur Laufen</option><option value="attack">Nur Angriff</option></select></label><button id="pause">Pause</button></div>'''
html+='<section><h2>Korrigierter Zusammenbau des Panzertruthahns</h2><p>Beine an den Rumpföffnungen verankert; beide Füße der Seitenansicht zeigen in Laufrichtung. Vorher links, korrigiert rechts.</p><img src="tank-socket-fix.webp" alt="Beinanschlüsse: vorher und korrigiert in Seiten-, Rücken- und Vorderansicht"></section>'
for kind,title,note in [('tank','Panzertruthahn / Panzer Turkey','Breite Rüstung, Kochtopfhelm und kurzer Truthahnfächer. Schwerer Schritt, tiefes Ausholen, Stampfer und sichtbare Erholung. Rüstungsaura und bisheriger Flächenschaden bleiben erhalten.'),('chili','Chili-Puter / Chili Gobbler','Helle, runde Figur mit Kochmütze und Chili-Schürze. Hält zum Luft holen an, pufft sich auf und federt beim Salvenspucken zurück. Fünf Geschosse und Regenerationsaura bleiben erhalten.')]:
    html+=f'<section><h2>{title}</h2><p class="note">{note}</p><canvas id="{kind}" width="800" height="350" aria-label="Alte und neue {title} Animation"></canvas><p id="{kind}-state"></p><details><summary>Lauf als GIF</summary><img src="{kind}-walk-vergleich.gif" alt="Alt und neu nebeneinander"></details></section>'
html+='''<section><h2>Im Spiel: gleiche Bühne und Größe</h2><p>Release-Build vor/nach, gleiche Map und Positionen. Die neue Turbo-Gans bleibt als Vergleich dabei. Keine Vergrößerung der Trefferflächen.</p>'''
for width,label in [(1440,'Desktop'),(390,'Mobil hochkant')]:html+=f'<h3>{label}</h3><img src="game-{width}-vergleich.webp" alt="Vorher links, neue Elites rechts">'
html+='''</section><p class="note">Bewertung: Die neuen Silhouetten und Requisiten passen zum Humor und unterscheiden die Rollen deutlicher. Die Posen sind bewusst zurückhaltend; Warnringe und Geschosse tragen weiter die Gefahreninformation. Neue Champion-Grafiken oder zusätzliche Elite-Mechaniken sind in diesem Auftrag nicht enthalten. Originale bleiben erhalten. Rückweg: VITE_PORTAL_ELITE_ART=classic beim Start/Build.</p></main><script type="module">'''
html+='const config='+json.dumps(config)+';\n'
html+='''const assets={};for(const [kind,urls] of Object.entries(config)){assets[kind]={};for(const [key,url] of Object.entries(urls)){const im=new Image();im.src=url;await im.decode();assets[kind][key]=im;}}
let paused=false,clock=0,last=performance.now();document.querySelector('#pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Fortsetzen':'Pause';};
function draw(now){if(!paused)clock+=now-last;last=now;const row=+document.querySelector('#direction').value,mode=document.querySelector('#mode').value;
for(const kind of ['tank','chili']){const wind=kind==='tank'?620:420,impact=kind==='tank'?220:150,attack=wind+impact+240,walk=mode==='attack'?0:2200,total=walk+attack;
const t=mode==='walk'?clock%570:clock%total;let state='walk',phase=Math.floor(t/140)%4;
if(mode!=='walk'&&t>=walk){const a=t-walk;state=a<wind?'windup':a<wind+impact?'resolve':'recovery';const elapsed=state==='windup'?a:state==='resolve'?a-wind:a-wind-impact;phase=Math.min(3,Math.floor(elapsed/(state==='windup'?wind:state==='resolve'?impact:240)*4));}
const canvas=document.querySelector('#'+kind),ctx=canvas.getContext('2d');ctx.clearRect(0,0,800,350);ctx.fillStyle='#fff1ce';ctx.font='20px system-ui';ctx.fillText('ALTE ELITE',35,30);ctx.fillText('NEUE ELITE',435,30);
for(const current of [false,true]){const im=assets[kind][current?(state==='walk'?'run':'actions'):(state==='walk'?'oldRun':'oldActions')];let frame;
if(current){const atlasRow=[0,0,1,2][row];frame=state==='walk'?atlasRow*4+phase:atlasRow*12+['windup','resolve','recovery'].indexOf(state)*4+phase;}
else frame=state==='walk'?(kind==='tank'?[0,1,0,1][phase]:row*4+phase):state==='windup'?(phase<2?1:2):state==='resolve'?2:[2,1,1,0][phase];
const cols=im.width/256;ctx.save();if(current&&row===1){ctx.translate(1184,0);ctx.scale(-1,1);}ctx.drawImage(im,(frame%cols)*256,Math.floor(frame/cols)*256,256,256,current?464:64,62,256,256);ctx.restore();}
document.querySelector('#'+kind+'-state').textContent=({walk:'Laufen',windup:'Ausholen / Luft holen',resolve:'Angriff',recovery:'Erholung'})[state];}
requestAnimationFrame(draw);}requestAnimationFrame(draw);</script></html>'''
(QA/'index.html').write_text(html,encoding='utf-8')
print('Elite lab, animated comparisons and two one-image release comparisons created.')
