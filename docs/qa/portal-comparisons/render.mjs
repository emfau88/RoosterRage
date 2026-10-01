import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const output = dirname(fileURLToPath(import.meta.url));
const qa = resolve(output, '..');
const entries = [
  {
    id: '01-spieler-querformat', group: 2, title: 'Spieler-HP und Bodenmarkierung · Querformat', viewport: '844 × 390',
    before: 'portal-package-1/landscape-feed-alley-geometry.png', after: 'portal-package-2/feed-844-ace.png',
    beforeLabel: 'Vor Paket 2', afterLabel: 'Nach Paket 2', verdict: 'Nachher besser',
    comparability: 'Gleicher Hahn, gleiche Arena und Fenstergröße. Die Startmeldung ist nur links aktiv; ihr Fehlen rechts ist kein Beleg für eine generelle Entfernung.',
    judgment: 'Der schwebende HP-Balken entfällt; die Gesundheit bleibt oben gut sichtbar. Der ruhige Bodenmarker gibt der Figur einen klareren Kontaktpunkt. Das reduziert konkurrierende Elemente direkt am Hahn und entspricht deiner gewünschten HUD-Lösung.',
    caveat: 'Figurenkunst, Kamerazoom und Spielergeometrie wurden nicht verbessert oder vergrößert. Die Startmeldung lässt sich separat im Bossvergleich beurteilen.'
  },
  {
    id: '02-spieler-hochformat', group: 2, title: 'Spielerlesbarkeit · Handy-Hochformat', viewport: '390 × 844', portrait: true,
    before: 'portal-package-1/portrait-feed-alley-geometry.png', after: 'portal-package-2/feed-390-ace.png',
    beforeLabel: 'Vor Paket 2 · DPR 1', afterLabel: 'Nach Paket 2 · DPR 2', verdict: 'Nachher ruhiger; Größe bleibt kritisch',
    comparability: 'Beide Bilder werden gleich groß gezeigt. Rechts wurde mit doppelter Pixeldichte aufgenommen. Startmeldung und einzelne Mapobjekte unterscheiden sich; dies ist kein pixelgleicher Szenenvergleich.',
    judgment: 'HP nur im HUD vermeidet eine zweite Gesundheitsanzeige über der sehr kleinen Figur. Die Bodenellipse hilft beim Wiederfinden. Das ist ein sinnvoller Gewinn an Ruhe, aber kein Nachweis, dass die Figur auf einem echten Telefon ausreichend lesbar ist.',
    caveat: 'Ace bleibt etwa 28–30 CSS-Pixel hoch. Vor einer weiteren Skalierungsentscheidung müssen Figur, Blickrichtung und Ausweichen auf echten Telefonen geprüft werden. Die höhere Screenshot-Schärfe rechts zählt nicht als neue Assetqualität.'
  },
  {
    id: '03-bossmeldung', group: 2, title: 'Bossmeldung und volles Loadout', viewport: '960 × 540',
    before: 'portal-package-1/desktop-boss-banner-layout.png', after: 'portal-package-2/boss-layout-960.png',
    beforeLabel: 'Vor Paket 2 · Bossankündigung', afterLabel: 'Nach Paket 2 · Phasenwarnung', verdict: 'Nachher klar besser',
    comparability: 'Vorbereitete Layoutzustände mit unterschiedlichen Meldungen und Loadouts. Rechts sind fünf aktive und vier passive Plätze belegt. Beurteilt wird die Platzverteilung, nicht der Kampfverlauf.',
    judgment: 'Links liegt die Meldung direkt über dem Bossbalken. Rechts sind Bossname, HP und Status frei; die Warnung sitzt unterhalb des Balkens neben dem Loadout. Das trennt Dauerinformation und kurzfristigen Hinweis sichtbar besser.',
    caveat: 'Der freie Mittelbereich ist gut. Auch an den Bildschirmrändern muss die Figur Vorrang haben; den entsprechenden Randfall zeigt Vergleich 06.'
  },
  {
    id: '04-bosskampf', group: 2, title: 'Bosskampf · reguläre Welle 10', viewport: '960 × 540',
    before: 'portal-package-0/runs/ace-yard/wave-10-peak.png', after: 'portal-package-2/runs/ace-yard/wave-10-peak.png',
    beforeLabel: 'Paket-0-Bestand', afterLabel: 'Nach Paket 2', verdict: 'Nachher besser lesbar',
    comparability: 'Ace, Harvest Yard und Welle 10 in regulären Läufen. Unterschiedliche Zeitpunkte (08:50 / 08:34), HP und Kampfsituationen; kein synchroner A/B-Kampf.',
    judgment: 'Der alte große Kill-Sticker verdeckt rechts einen Teil der Bossinformation. Im neuen Bild bleiben Bossphase und HP frei, die Figur trägt keinen zusätzlichen HP-Balken. Diese Hierarchie ist für einen anspruchsvollen Bosskampf sinnvoller.',
    caveat: 'Rechts ist gerade keine Kill-Meldung aktiv. Ihr Verhalten während einer Meldung wird deshalb zusätzlich über die vorbereiteten Layout- und Überdeckungstests belegt. Weniger Projektile oder ein anderer Bossstand sind keine bewiesenen Verbesserungen.'
  },
  {
    id: '05-gegner-hp', group: 2, title: 'Gegner-HP · volle Kampfszene in Feed Alley', viewport: '960 × 540',
    before: 'portal-package-0/runs/storm-alley-late/wave-8-peak.png', after: 'portal-package-2/runs/storm-alley-late/wave-8-peak.png',
    beforeLabel: 'Vorher · viele dauerhafte Balken', afterLabel: 'Nachher · AUTO', verdict: 'AUTO ist die bessere Voreinstellung',
    comparability: 'Storm, Feed Alley, Welle 8. Unterschiedliche Zeitpunkte (04:40 / 04:16), Level, Gegnerzahl und Builds. Die geringere Gegnerzahl rechts ist kein Ergebnis der HP-Anzeige.',
    judgment: 'Volle Balken über fast jedem Gegner erzeugen links ein rotes Muster, das mit Figuren und Gefahren konkurriert. AUTO zeigt normale Gegner nach Treffern für 1,6 Sekunden; Eliten und Bosse bleiben ablesbar. Das erhält relevante Information und reduziert die dauerhafte Unruhe.',
    caveat: 'Die Trefferanimation macht Storm rechts teilweise transparent. Der Bodenmarker hilft beim Lokalisieren, ersetzt aber keine Geräteprüfung. ALWAYS als Option ist sinnvoll für Spieler, die sämtliche regulären Balken bevorzugen.'
  },
  {
    id: '06-spieler-am-rand', group: 2, title: 'Meldung über der Figur · korrigierter Randfall', viewport: '390 × 844', portrait: true,
    before: 'portal-package-2/runs/artillery-coop-novice/wave-8-peak.png', after: 'portal-package-2/coop-player-edge-clear.png',
    beforeLabel: 'Paket-2-Zwischenstand · Messlauf', afterLabel: 'Paket-2-Abschluss · reproduzierte Position', verdict: 'Die Korrektur ist notwendig und besser',
    comparability: 'Links natürlicher Kampf in Welle 8, rechts vorbereitete Welle 1 mit nachgestellter Spielerposition. Kein Vorher-/Nachher-Vergleich derselben vollständigen Kampfszene.',
    judgment: 'Links verdeckt die Kill-Serie den oberen Teil der Figur nahe dem HUD. Im Abschlussstand wartet eine Meldung, wenn sie die Figur überdecken würde. Rechts bleibt Artillery frei sichtbar. Diese Priorität ist richtig: Die Position des Spielers ist wichtiger als eine Kill-Bestätigung.',
    caveat: 'Die leerere Arena und die anderen HP rechts stammen aus dem Testaufbau. Daraus lässt sich keine bessere Lesbarkeit einer gesamten späten Welle ableiten.'
  },
  {
    id: '07-hp-option', group: 2, title: 'Settings · Gegner-HP als Wahlmöglichkeit', viewport: '960 × 540',
    before: 'portal-package-1/desktop-first-settings.png', after: 'portal-package-2/enemy-hp-settings.png',
    beforeLabel: 'Vor Paket 2 · Hauptmenü', afterLabel: 'Nach Paket 2 · im Kampf, ALWAYS gewählt', verdict: 'Die neue Option ist sinnvoll',
    comparability: 'Gleiche Fenstergröße, unterschiedliche Aufrufkontexte. Deshalb ist rechts „Main menu“ sichtbar. ALWAYS ist hier zur Prüfung ausgewählt; die Voreinstellung ist AUTO.',
    judgment: 'Die Option steht weit oben und erklärt das AUTO-Verhalten. Ich würde AUTO als Standard behalten und ALWAYS anbieten: ruhiges Bild für den Einstieg, vollständige Balken auf Wunsch. Ein einziges AN/AUS wäre weniger passend, weil wichtige Elite-/Bossinformationen erhalten bleiben sollen.',
    caveat: 'Der Screenshot zeigt den gewählten Wert, nicht das Standardverhalten. Die Settings sind weiterhin ein funktionales Menü; diese Erweiterung allein ist keine neue visuelle Gestaltung.'
  },
  {
    id: '08-startmenue-desktop', group: 1, title: 'Startmenü · Desktop', viewport: '960 × 540',
    before: 'portal-package-0/desktop-first-play.png', after: 'portal-package-1/desktop-first-play.png',
    beforeLabel: 'Vor Paket 1', afterLabel: 'Nach Paket 1', verdict: 'Nachher klar besser',
    comparability: 'Gleiche Fenstergröße und Menüausgangslage.',
    judgment: 'Mapvorschau und Laufbeschreibung haben eigene Bereiche. Titel und Modus konkurrieren nicht mehr auf engem Raum, während die vorher große Leerfläche für verständliche Moduskarten genutzt wird. Charakterwahl und Start bleiben schnell erreichbar.',
    caveat: 'Das Menü ist dichter. Die Map selbst hat keine neuen Texturen oder Dekorationen bekommen; verbessert wurde ihre Präsentation im Menü.'
  },
  {
    id: '09-startmenue-hochformat', group: 1, title: 'Startmenü · Handy-Hochformat', viewport: '390 × 844', portrait: true,
    before: 'portal-package-0/portrait-first-play.png', after: 'portal-package-1/portrait-first-play.png',
    beforeLabel: 'Vor Paket 1', afterLabel: 'Nach Paket 1', verdict: 'Nachher besser, aber dichter',
    comparability: 'Gleiche Fenstergröße und Menüausgangslage.',
    judgment: 'Die Map erhält eine klare Vorschau mit eigenem Titel; Pfeile und Seitenanzeige liegen darunter. Laufwerte und Moduskarten sind geordneter und größer beschriftet. Die Startaktion bleibt am unteren Rand gut erreichbar.',
    caveat: 'Die größere Vorschau beansprucht mehr Höhe; der Starttext bricht jetzt in zwei Zeilen um. Das ist ein Gewinn an Struktur und Lesbarkeit, kein Gewinn an gleichzeitig sichtbarer Information.'
  },
  {
    id: '10-upgrades-desktop', group: 1, title: 'Upgradeauswahl · Desktop mit EVO-Rezepten', viewport: '960 × 540',
    before: 'portal-package-0/desktop-primary-recipe-details.png', after: 'portal-package-1/desktop-primary-recipe-details.png',
    beforeLabel: 'Vor Paket 1', afterLabel: 'Nach Paket 1', verdict: 'Nachher klar besser',
    comparability: 'Gleiche Fenstergröße und dieselben drei Upgradeangebote.',
    judgment: 'Vorher sind Karten und Effekttexte unnötig klein und der Rahmen liegt am oberen Rand. Nachher nutzt der Dialog die verfügbare Fläche; Namen, Wirkungen und EVO-Bedingungen sind tatsächlich lesbar. Alle drei Angebote bleiben nebeneinander vergleichbar, Reroll hat einen festen Platz.',
    caveat: 'Mehr Beschreibung macht die Karten inhaltlich dichter. Noch kürzere, konsistente Effekttexte wären ein sinnvoller späterer Feinschliff, ohne wichtige Regeln zu verstecken.'
  },
  {
    id: '11-upgrades-querformat', group: 1, title: 'Upgradeauswahl · kurzes Handy-Querformat', viewport: '844 × 390',
    before: 'portal-package-0/landscape-primary-recipe-details.png', after: 'portal-package-1/landscape-primary-recipe-details.png',
    beforeLabel: 'Vor Paket 1 · drei kleine Karten', afterLabel: 'Nach Paket 1 · große Karten, eigener Scrollbereich', verdict: 'Lesbarkeit besser; Überblick schlechter',
    comparability: 'Gleiche Fenstergröße und dieselben Angebote; jeweils oberste Scrollposition.',
    judgment: 'Links sind alle drei Angebote auf einmal sichtbar, aber die Texte sehr klein. Rechts ist ein Angebot deutlich besser lesbar, der Rahmen bleibt im Fenster und Reroll erreichbar. Für Touchbedienung würde ich die neue Variante bevorzugen.',
    caveat: 'Der direkte Vergleich aller drei Angebote erfordert jetzt Scrollen. Das ist die größte Abwägung im Menüpaket. Bei der Geräteabnahme sollte geprüft werden, ob Nutzer die weiteren Angebote ohne Erklärung entdecken.'
  },
  {
    id: '12-bossbelohnung-gross', group: 1, title: 'Bossbelohnung · großes Fenster', viewport: '1440 × 900',
    before: 'portal-package-0/large-boss-chest.png', after: 'portal-package-1/large-boss-chest.png',
    beforeLabel: 'Vor Paket 1 · lange Einspaltenliste', afterLabel: 'Nach Paket 1 · 2 × 2', verdict: 'Nachher klar besser',
    comparability: 'Gleiche Fenstergröße und dieselben vier Belohnungen.',
    judgment: 'Die alte Liste erstreckt sich fast über die gesamte Fensterhöhe. Das neue Raster nutzt die Breite, zeigt alle vier Optionen kompakter und rückt die Entscheidung in die Bildschirmmitte. Schrift und Auswahlrahmen sind besser erkennbar.',
    caveat: 'Der dekorative Rahmen bleibt derselbe. Der Gewinn liegt in Proportion, Lesbarkeit und Vergleichbarkeit, nicht in einer neuen Art Direction.'
  },
  {
    id: '13-bossbelohnung-desktop', group: 1, title: 'Bossbelohnung · kleiner Desktop', viewport: '960 × 540',
    before: 'portal-package-0/desktop-boss-chest.png', after: 'portal-package-1/desktop-boss-chest.png',
    beforeLabel: 'Vor Paket 1 · kleines 3+1-Raster', afterLabel: 'Nach Paket 1 · größere 2 × 2-Karten', verdict: 'Nachher lesbarer; Scrollen erforderlich',
    comparability: 'Gleiche Fenstergröße und dieselben vier Belohnungen; jeweils oberste Scrollposition.',
    judgment: 'Das ungleichmäßige alte Raster wirkt klein und schwer lesbar. Größere Karten und zwei gleich breite Spalten geben den Belohnungen eine klarere Ordnung. Der Reroll-Button bleibt unabhängig von den Karten zugänglich.',
    caveat: 'Die unteren Kartendetails sind im neuen Bild angeschnitten und müssen gescrollt werden. Ich bevorzuge die Lesbarkeit, würde diesen Punkt aber nicht als uneingeschränkten Gewinn an Übersicht verkaufen.'
  },
  {
    id: '14-charakterauswahl', group: 1, title: 'Charakterauswahl · Porträts und Namen', viewport: '1440 × 900',
    before: 'portal-package-0/large-advanced-roosters.png', after: 'portal-package-1/large-advanced-roosters.png',
    beforeLabel: 'Vor Paket 1', afterLabel: 'Nach Paket 1', verdict: 'Nachher der stärkere visuelle Auftritt',
    comparability: 'Gleiche Fenstergröße, dieselben freigeschalteten Hähne und dieselben Porträtassets.',
    judgment: 'Gesichter werden gezielter eingerahmt; besonders Storm ist besser erkennbar. Der Name liegt unter dem Porträt statt über dem Gesicht. Größere Texte und „SELECT“ statt „PLAY AS“ machen Figur und Aktion verständlicher. Hier ist der Gewinn an Präsentationsqualität besonders deutlich.',
    caveat: 'Die höheren Karten verschieben Kosmetik weiter nach unten. Das verbessert den ersten Eindruck der Hähne, verringert aber die gleichzeitig sichtbaren Inhalte.'
  },
  {
    id: '15-talente', group: 1, title: 'Talentdetail · Handy-Hochformat', viewport: '390 × 844', portrait: true,
    before: 'portal-package-0/portrait-advanced-talent-detail.png', after: 'portal-package-1/portrait-advanced-talent-detail.png',
    beforeLabel: 'Vor Paket 1', afterLabel: 'Nach Paket 1', verdict: 'Nachher besser lesbar, kleiner optischer Sprung',
    comparability: 'Gleiche Fenstergröße, dasselbe Talent, derselbe Rang und dieselben Kosten.',
    judgment: 'Aktueller Wert, nächster Rang, Maximum und Restwährung sind klarer beschriftet. Die erklärende Fußzeile ist lesbar, Schließen und Upgrade sind gut erreichbar. Das verbessert das sichere Verstehen eines Kaufs.',
    caveat: 'Die alte Variante hatte bereits eine brauchbare Grundstruktur. Hier wurde vor allem Typografie und Bedienbarkeit verfeinert; es ist kein grundlegendes Redesign.'
  },
  {
    id: '16-settings-querformat', group: 1, title: 'Settings · kurzes Handy-Querformat', viewport: '844 × 390',
    before: 'portal-package-0/landscape-first-settings.png', after: 'portal-package-1/landscape-first-settings.png',
    beforeLabel: 'Vor Paket 1 · fast alles sichtbar', afterLabel: 'Nach Paket 1 · größere Bedienelemente', verdict: 'Bedienbarkeit besser; Kompaktheit schlechter',
    comparability: 'Gleiche Fenstergröße und Settings im Hauptmenü; jeweils oberste Scrollposition.',
    judgment: 'Größere Zeilen, lesbarere Texte und ein fest erreichbares Continue sind für die Touchbedienung sinnvoll. Die zwei Spalten bleiben nachvollziehbar nach Grafik und Audio getrennt.',
    caveat: 'Ambience und Privacy sind rechts erst nach Scrollen erreichbar. Die alte Ansicht war kompakter. Für den Portalrelease würde ich die größeren Ziele bevorzugen, aber eine gut erkennbare Scrollmöglichkeit auf echten Geräten prüfen.'
  }
];

const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const manifest = [];
for (const entry of entries) {
  for (const side of ['before', 'after']) {
    const data = await readFile(resolve(qa, entry[side]));
    if (data.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`Not a PNG: ${entry[side]}`);
    entry[`${side}Size`] = { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    manifest.push({ pair: entry.id, side, source: entry[side], ...entry[`${side}Size`], sha256: createHash('sha256').update(data).digest('hex') });
  }
  const b = entry.beforeSize, a = entry.afterSize;
  if (Math.abs(b.width / b.height - a.width / a.height) > 0.001) throw new Error(`Aspect ratio mismatch: ${entry.id}`);
}

const imageColumn = (entry, side) => {
  const size = entry[`${side}Size`];
  return `<figure><figcaption><strong>${side === 'before' ? 'VORHER' : 'NACHHER'}</strong><span>${escape(entry[`${side}Label`])}</span></figcaption><a class="original" href="../${escape(entry[side])}" target="_blank" rel="noopener" title="Original in voller Auflösung öffnen"><img src="../${escape(entry[side])}" width="${size.width}" height="${size.height}" alt="${escape(entry.title)} – ${side === 'before' ? 'vorher' : 'nachher'}"></a></figure>`;
};
const board = entry => `<section class="board ${entry.portrait ? 'portrait' : ''}" id="${entry.id}" aria-labelledby="title-${entry.id}"><header class="board-head"><p class="eyebrow">PAKET ${entry.group} · ${escape(entry.viewport)} CSS-PIXEL</p><h2 id="title-${entry.id}">${escape(entry.title)}</h2></header><div class="pair">${imageColumn(entry, 'before')}${imageColumn(entry, 'after')}</div><p class="context"><b>Vergleichbarkeit:</b> ${escape(entry.comparability)}</p><div class="assessment"><h3>${escape(entry.verdict)}</h3><p>${escape(entry.judgment)}</p><p class="limit"><b>Abwägung / offen:</b> ${escape(entry.caveat)}</p></div></section>`;
const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rooster Rage · Vorher / Nachher</title>
<style>
:root{color-scheme:dark;--bg:#0c1215;--panel:#131e24;--text:#edf1f1;--muted:#b9c5c8;--gold:#f2cd72;--line:#35464e}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}a{color:var(--gold);text-underline-offset:4px}a:focus-visible{outline:3px solid var(--gold);outline-offset:4px}
.intro,.contents{max-width:1100px;margin:40px auto;padding:0 24px}h1{font-size:clamp(28px,4vw,48px);line-height:1.15;margin:8px 0 18px}h2{font-size:26px;line-height:1.25;margin:5px 0 0}h3{font-size:21px;line-height:1.3;margin:0 0 8px;color:var(--gold)}p{margin:0 0 12px}.eyebrow{font-size:13px;font-weight:750;letter-spacing:.09em;color:var(--gold);margin:0}.intro .summary{font-size:20px;max-width:920px}.muted{color:var(--muted)}nav{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:24px}.contents ol{display:grid;grid-template-columns:1fr 1fr;gap:9px 36px;padding-left:22px}.group-title{max-width:1600px;margin:72px auto 24px;padding:0 24px;font-size:30px}
.board{background:var(--panel);border:1px solid var(--line);border-radius:16px;max-width:1600px;margin:28px auto;padding:26px;scroll-margin-top:20px;overflow:hidden}.board.portrait{max-width:1000px}.board-head{margin-bottom:20px}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:start}figure{margin:0;min-width:0}figcaption{display:flex;flex-direction:column;gap:3px;margin-bottom:10px;font-size:14px;line-height:1.4;color:var(--muted);min-height:43px}figcaption strong{font-size:14px;letter-spacing:.08em;color:var(--text)}.original{display:flex;justify-content:center;background:#090e10;border:1px solid var(--line);border-radius:8px;overflow:hidden}.original img{display:block;width:100%;height:auto;object-fit:contain}.portrait .original img{max-width:390px}.context{font-size:14px;line-height:1.55;color:var(--muted);margin:18px 0}.assessment{border-left:4px solid var(--gold);padding:16px 20px;background:#1b2a31;border-radius:0 10px 10px 0}.assessment p:last-child{margin-bottom:0}.limit{color:var(--muted)}footer{max-width:1100px;margin:48px auto;padding:0 24px 36px;color:var(--muted);font-size:14px}
@media(max-width:700px){body{font-size:15px}.intro,.contents{margin:24px auto;padding:0 14px}.contents ol{grid-template-columns:1fr}.group-title{margin:42px 0 16px;font-size:24px;padding:0 14px}.board{margin:16px 8px;padding:14px;border-radius:10px}h2{font-size:21px}.pair{gap:8px}figcaption{font-size:11px;min-height:50px}.context{font-size:12px}.assessment{padding:12px}h3{font-size:18px}}
@media print{body{background:white;color:#111}.board{break-inside:avoid;background:#fff;border-color:#888}.assessment{background:#eee}.context,.limit{color:#333}.contents{display:none}}
</style></head><body>
<header class="intro"><p class="eyebrow">ROOSTER RAGE · VISUELLER VERGLEICH · 1. OKTOBER 2026</p><h1>Vorher und nachher.<br>Direkt nebeneinander.</h1><p class="summary">16 Bildpaare mit jeweils eigener Beurteilung. Links der frühere Stand, rechts das Ergebnis. Paket 2 steht zuerst; darunter folgen die Menüvergleiche aus Paket 1.</p><p class="muted">Mein Urteil: Die Menüs sind deutlich lesbarer und die Hähne besser präsentiert. HP nur im HUD und AUTO für normale Gegner sind die passendere Standardlösung. Noch offen sind die kleine Figur auf echten Telefonen und die Auffindbarkeit weiterer Angebote in kurzen Scrollfenstern.</p><p class="muted">Die Originalbilder bleiben unverändert. Beide Seiten haben denselben Darstellungsmaßstab; Unterschiede in Aufnahmezustand und Pixeldichte sind vermerkt. Ein Klick auf ein Bild öffnet das Original. Maptexturen und Charakterassets wurden in diesen Paketen nicht neu gestaltet.</p><nav aria-label="Vergleichsgruppen"><a href="#paket-2">Paket 2 · Kampf und HP</a><a href="#paket-1">Paket 1 · Menüs und Upgrades</a><a href="README.md">Beurteilungen als Text</a></nav></header>
<nav class="contents" aria-label="Alle Bildpaare"><ol>${entries.map(entry => `<li><a href="#${entry.id}">${escape(entry.title)}</a></li>`).join('')}</ol></nav>
<main>${[2,1].map(group => `<h2 class="group-title" id="paket-${group}">Paket ${group} · ${group === 2 ? 'Kampf, Figuren und Gesundheitsanzeigen' : 'Menüs, Charakterwahl und Upgrades'}</h2>${entries.filter(entry => entry.group === group).map(board).join('\n')}`).join('\n')}</main>
<footer>Vergleichsgrundlage: vorhandene QA-Aufnahmen aus Paket 0, 1 und 2. Die Bildpaare sind keine Behauptung einer vollständigen Portalabnahme. Keine Änderung an Spielcode, Assets oder historischen Screenshots. <a href="../portal-package-2/README.md">Technischer Nachweis und offene Geräteabnahme</a>.</footer>
</body></html>`;
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'index.html'), html, 'utf8');
await writeFile(resolve(output, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1648, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
await page.goto(pathToFileURL(resolve(output, 'index.html')).href);
await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); await document.fonts.ready; });
for (const entry of entries) {
  await page.locator(`[id="${entry.id}"]`).screenshot({ path: resolve(output, `${entry.id}.png`), animations: 'disabled' });
}
const desktop = await page.evaluate(() => ({ images: document.images.length, broken: [...document.images].filter(image => !image.complete || !image.naturalWidth).length, overflow: document.documentElement.scrollWidth > innerWidth }));
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
const mobile = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, pairs: [...document.querySelectorAll('.pair')].map(pair => { const [left, right] = [...pair.children].map(child => child.getBoundingClientRect()); return { sideBySide: right.left >= left.right, equalWidths: Math.abs(left.width - right.width) < 1 }; }) }));
await page.locator('[id="01-spieler-querformat"]').screenshot({ path: resolve(output, 'gallery-mobile-check.png') });
await browser.close();
// Historical images must be unchanged, including the captured intermediate state.
for (const source of manifest) {
  const data = await readFile(resolve(qa, source.source));
  if (createHash('sha256').update(data).digest('hex') !== source.sha256) throw new Error(`Source changed: ${source.source}`);
}
if (errors.length || desktop.broken || desktop.overflow || mobile.overflow || mobile.pairs.some(pair => !pair.sideBySide || !pair.equalWidths)) throw new Error(JSON.stringify({ errors, desktop, mobile }));
await writeFile(resolve(output, 'verification.json'), JSON.stringify({ generatedAt: new Date().toISOString(), pairs: entries.length, errors, desktop, mobile, sourceHashesUnchanged: true }, null, 2) + '\n', 'utf8');
const readme = `# Vorher / Nachher · Paket 1 und 2\n\n16 direkte Bildpaare, erstellt am 1. Oktober 2026. Links vorher, rechts nachher. [Alle Vergleiche als Galerie](index.html). Bilder anklicken, um die unveränderten Originale zu öffnen.\n\n${entries.map(entry => `## ${entry.title}\n\n![Vorher links, nachher rechts](${entry.id}.png)\n\n**${entry.verdict}.** ${entry.judgment}\n\n**Abwägung / offen:** ${entry.caveat}\n\n**Vergleichbarkeit:** ${entry.comparability}\n\n[Original vorher](../${entry.before}) · [Original nachher](../${entry.after})`).join('\n\n')}\n\n## Umfang und Prüfung\n\nNur Vergleichsdokumentation; Spielcode, Assets und historische Aufnahmen unverändert. Keine neue Map- oder Charakterkunst in diesen Paketen. Die Figurenlesbarkeit auf echten Telefonen und die vollständige Geräte-/Portalabnahme bleiben offen.\n\nGalerie und 16 PNG-Vergleichstafeln mit Chromium gerendert. 32 Originalbilder geladen, keine defekten Bilder oder Browserfehler. Auf Desktop und 390-Pixel-Hochformat kein horizontaler Überlauf; alle Bildpaare bleiben in gleich breiten Spalten nebeneinander. Bildseitenverhältnisse geprüft, SHA-256 der Quellen vor und nach dem Rendern identisch. [Quellenmanifest](sources.json) · [Prüfergebnis](verification.json).\n\nReproduktion aus dem Repository: \`node docs/qa/portal-comparisons/render.mjs\`.\n`;
await writeFile(resolve(output, 'README.md'), readme, 'utf8');
console.log(JSON.stringify({ output, pairs: entries.length, desktop, mobileOverflow: mobile.overflow, sourceHashesUnchanged: true }));
