import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const dir = import.meta.dirname;
const comparisons = [
  ['comparison-yard','Harvest Yard · Ruhigerer Boden','open-yard-game-960-ace',
    'Drei deterministisch verteilte Bodenvarianten ersetzen das identische Kachelinnere. Weniger Blumen und kleinteilige Graslinien lassen Figur und Objekte klarer hervortreten. Die gemeinsame Randzone erhält die bisherigen Übergänge.',
    'Mein Urteil: sichtbare Verbesserung der Ruhe und Materialwirkung. Wiederholung ist reduziert, bleibt an den gemeinsamen Rändern und bestehenden Landmarken aber erkennbar.'],
  ['comparison-alley','Feed Alley · Laufweg und Kulisse','vertical-run-overview-1400-ace',
    'Der helle Laufweg erhält eine zurückhaltende kühlere Abstimmung; die seitlichen Kulissen werden etwas dunkler und kühler. Mapbreite, Kulissen, Kamera und Figurengröße bleiben erhalten.',
    'Mein Urteil: kleine Verbesserung der Blickführung. Die vorhandene Architektur trägt die Mapidentität stärker als diese Farbkorrektur. Kein großer optischer Sprung.'],
  ['comparison-coop','Coop Square · Trockener Hof','square-coop-overview-1400-ace',
    'Der Boden wird etwas weniger orange und gesättigt. Zaun, Traktor, Tröge und runde Heustapel behalten ihre Gestaltung und Position. Neue Kisten werden ebenfalls verwendet.',
    'Mein Urteil: stimmiger und zurückhaltender, aber eine behutsame Korrektur. Für einen größeren Fortschritt wären später die fest eingebauten Dekoobjekte einzeln an den neuen Stil anzupassen.'],
  ['comparison-props','Kisten und Heuballen · Ohne W-Markierung','open-yard-props-960-ace',
    'Neue ImageGen-Assets erhalten weichere Innenzeichnung, gruppierte Strohflächen und weniger metallisch glänzende Kistenecken. Transparente Ränder wurden auf den bisherigen sichtbaren Fußabdruck normalisiert. Die W-Markierungen sind vollständig entfernt.',
    'Mein Urteil: die deutlichste Verbesserung dieses Passes. Material und Außenkontur wirken weniger technisch. Trefferblitz, Schadensfarben, Zerstörung und Beute bleiben erhalten; eine neue Kennzeichnung wurde nicht eingeführt.'],
  ...['open-yard','vertical-run','square-coop'].map((arena,i)=>[
    `comparison-mobile-${arena}`,`${['Harvest Yard','Feed Alley','Coop Square'][i]} · Handy hochkant`,`${arena}-game-390-ace`,
    'Gleiche Map, Figur, Startposition und Fenstergröße 390 × 844. Beide Seiten mit Pixeldichte 1; keine Änderung an Zoom oder Spielfigur.',
    'Dieser Vergleich zeigt die Materialwirkung bei tatsächlicher Darstellungsgröße. Er löst das bereits besprochene Größenproblem der Figur in Feed Alley nicht.'
  ]),
  ...['ace','artillery','storm'].map(rooster=>[
    `comparison-combat-${rooster}`,`Lesbarkeit · ${rooster}`,`open-yard-combat-960-${rooster}`,
    'Identische vorbereitete Szene mit 18 stehenden Gegnern. Ruhigeres Bodeninnere und unveränderte Figuren, Gefahrenfarben und Trefferflächen.',
    'Die Figuren bleiben gegen den Boden erkennbar. Diese statische Szene ist kein Nachweis der Erkennbarkeit im späten Kampf mit vielen Effekten auf einem echten Handy.'
  ])
];
const esc = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const pair = (name, caption='') => `<div class="pair">${['before','after'].map((version,i)=>`<figure><figcaption>${i?'Nachher':'Vorher'}${caption?' · '+caption:''}</figcaption><a href="${version}-${name}.png"><img src="${version}-${name}.png" alt="${i?'Nachher':'Vorher'}"></a></figure>`).join('')}</div>`;
const sections = comparisons.map(([id,title,name,change,assessment])=>`<section class="comparison ${name.includes('-390-')?'portrait':''}" id="${id}"><h2>${esc(title)}</h2>${pair(name)}<p>${esc(change)}</p><p class="assessment">${esc(assessment)}</p></section>`);
for (const [arena,title] of [['open-yard','Harvest Yard'],['vertical-run','Feed Alley']]) {
  sections.push(`<section class="comparison" id="comparison-route-${arena}"><h2>${title} · Strecke und Wiederholung</h2>${[0,3,5].map(step=>pair(`${arena}-route-${step}`,`Abschnitt ${step+1}`)).join('')}<p>Identische Kamera- und Objektpositionen auf derselben Strecke. Nach dem Zurückkehren erhalten die Chunks dieselbe Variante. Ein klassischer gemeinsamer Rand vermeidet neue Übergangssprünge, beseitigt aber nicht jede bestehende Wiederholung.</p></section>`);
}
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rooster Rage · Map-Art-Pass</title><style>
*{box-sizing:border-box}body{margin:0;background:#101719;color:#edf0e8;font:16px/1.5 system-ui,Segoe UI,sans-serif}a{color:#f4d080}header,footer{max-width:1120px;padding:24px;margin:auto}h1{font-size:34px;line-height:1.2}h2{margin:0 0 16px;font-size:25px}nav{display:flex;flex-wrap:wrap;gap:12px}.comparison{max-width:1984px;padding:22px;margin:24px auto;background:#192328;border:1px solid #415047;border-radius:12px}.portrait{max-width:844px}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-bottom:14px}figure{margin:0}figcaption{font-size:15px;font-weight:800;margin-bottom:8px;color:#f4d080}img{display:block;width:100%;height:auto}p{margin:16px 0 0}.assessment{border-left:4px solid #f4d080;padding:12px 16px;background:#233238}a:focus-visible{outline:3px solid #f4d080;outline-offset:3px}@media(max-width:700px){.comparison{margin:12px 6px;padding:12px}.pair{gap:6px}h1{font-size:26px}h2{font-size:20px}}
</style></head><body><header><h1>Map-Art-Pass · Vorher und nachher</h1><p>Links vorher, rechts nachher. Jede Vergleichsfläche steht zusätzlich als EIN PNG zur Verfügung. Identische vorbereitete Spielzustände aus Produktionsbuilds mit WebGL; Baseline 65ffe0f. Die Übersichtsbilder blenden nur das HUD aus. Keine Änderung an Kamerazoom, Figurenmaßstab oder Kollisionsgeometrie.</p><p><a href="README.md">Prüfungen, Beurteilung und Rückweg</a> · <a href="PROMPTS.md">ImageGen-Prompts und Quellen</a> · <a href="checks.json">Messdaten</a></p><nav>${comparisons.slice(0,7).map(([id,title])=>`<a href="#${id}">${esc(title)}</a>`).join('')}</nav></header><main>${sections.join('')}</main><footer><p>13 identische Szenenpaare und zwei Streamingstrecken geprüft. Die Entfernung der W-Markierungen gilt auch im klassischen Grafikmodus. Kein neues Symbol als Ersatz. Menschliche Abnahme auf iOS/Android und im späten Kampf bleibt offen.</p></footer></body></html>`;
await fs.writeFile(path.join(dir,'index.html'),html);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:2028,height:1100}});
  await page.goto(pathToFileURL(path.join(dir,'index.html')).href);
  await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode()));await document.fonts.ready;});
  for (const section of await page.locator('.comparison').all()) {
    const id = await section.getAttribute('id');
    await section.screenshot({path:path.join(dir,`${id}.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Mobile gallery overflow');
} finally { await browser.close(); }
console.log(JSON.stringify({comparisons:sections.length,gallery:path.join(dir,'index.html')}));
