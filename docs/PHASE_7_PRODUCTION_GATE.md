# Phase 7 – Production-Gate-Messpass

Stand: 12.08.2026

## Status

Der Mess- und Diagnosepass ist abgeschlossen. Der freigegebene P0-Korrekturpass
für Mobile-Menü, Mobile-HUD und seltene Restgegner-Stalls ist umgesetzt und
automatisiert abgenommen. Kampf-, Spawn-, XP- und Assetwerte blieben dabei
unverändert. Die übrigen Punkte bleiben bis zur Rücksprache offen.

## Abdeckung

- sechs unterschiedlich geseedete Echtzeit-Vollruns;
- alle drei Rooster;
- Standard Run, Featherweight und Royal Gauntlet jeweils auf Desktop und Mobile
  Portrait abgedeckt;
- realistischer Late-Run-Lasttest mit 75 / 110 / 150 gemischten Gegnern,
  fünf EVOs, XP-Orbs, Gegnerprojektilen, Hazards und Death-FX;
- zehnminütiger Pool-/Soak-Test;
- Acceptance-, Pressure- und Foundation-Gates;
- sichtbare Mobile-Prüfung von Hauptmenü, HUD, Talentnest und Rooster-Kosmetik.

Die Vollruns wurden mit dem instrumentierten Average-Bot in echter Laufzeit
gespielt. Sie sind ein belastbares Screening, ersetzen aber nicht die letzte
subjektive Abnahme durch einen Menschen auf realer Mobile-Hardware.

## Vollrun-Ergebnisse

| Rooster | Challenge | Viewport | Ergebnis | Zeit | Kills | Schaden | Erstes Upgrade |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| Barnyard Ace | Standard | Desktop | Sieg | 438,1 s | 1.127 | 17 | 32,1 s |
| Barnyard Ace | Royal Gauntlet | Mobile | Diagnose-Stall in Welle 2 | 570,3 s | 109 | 0 | 40,3 s |
| Boombardier | Featherweight | Desktop | Tod in Welle 3 | 93,1 s | 155 | 110 | 26,2 s |
| Boombardier | Standard | Mobile | Sieg | 449,4 s | 1.130 | 67 | 34,5 s |
| Stormcrest | Royal Gauntlet | Desktop | Sieg | 546,6 s | 1.212 | 89 | 21,0 s |
| Stormcrest | Featherweight | Mobile | Sieg | 435,0 s | 1.125 | 113 | 23,6 s |

Alle sechs Runs liefen mit p95 16,7–16,8 ms und ohne Browser-/Runtimefehler.

## Late-Run-Performance

| Viewport | Gegnerziel | p95 | p99 | Peak-Objekte | Pool-Drops |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 75 | 16,8 ms | 50,0 ms | 176 | 0 |
| Desktop | 110 | 16,8 ms | 33,4 ms | 213 | 0 |
| Desktop | 150 | 16,8 ms | 50,0 ms | 260 | 0 |
| Mobile Portrait | 75 | 16,8 ms | 33,3 ms | 156 | 0 |
| Mobile Portrait | 110 | 16,8 ms | 33,3 ms | 191 | 0 |
| Mobile Portrait | 150 | 16,8 ms | 33,4 ms | 240 | 0 |

Der zehnminütige Soak-Test blieb ebenfalls stabil: p95 16,7 ms, p99 16,8 ms,
keine Frames über 33 ms und keine Pool-Drops. Die vereinzelten p99-Spitzen im
Lasttest sind nicht anhaltend und traten beim synchronen Aufbau der Testszenen
auf.

## P0-Korrekturpass – umgesetzt am 12.08.2026

- **Kurzes Mobile-Hochformat:** Unter 820 CSS-Pixeln Höhe nutzt der Play-Screen
  eine echte Kompaktvariante. Rooster-Hero und Text sind verdichtet; die vier
  Challenges nutzen eine feste 2×2-Auswahl ohne inneren Scrollbereich.
  `RUN STARTEN` bleibt vollständig im sichtbaren Panel. Fullscreen und
  Einstellungen bleiben erreichbar. Automatischer Gate bei 400×711 sowie
  sichtbare Abnahme bei effektiv 445×790 und 844×400 bestanden.
- **Mobile HUD-Zähler:** Uhr, Welle und Kills besitzen eigene kurze Mobile-Werte
  (`09:29`, `2/10`, `109`), tabellarische Ziffern, keine Ellipse und weiterhin
  vollständige zugängliche Labels. Unveränderte Werte werden nicht erneut in
  den DOM geschrieben. Portrait-, Landscape- und Desktop-Gate bestanden.
- **Restgegner-Sicherung:** Erst im abgeschlossenen Spawnsegment, nach zehn
  Sekunden ohne targetbaren Gegner und nur bei höchstens drei normalen
  Restgegnern wird ein sicherer Punkt innerhalb des kamerabezogenen
  Zielbereichs gesucht. Bosse und größere Gruppen sind ausgeschlossen. HP,
  Schaden, Spawns und Zielreichweite wurden nicht verändert. Eigener
  Mechanics-Regressionstest inklusive Vier-Gegner-Schutzfall bestanden.

## Befunde und Folgestatus

### 1. Seltener Cleanup-/Offscreen-Stall

**Status: P0-Sicherung umgesetzt; weitere reale Runs bleiben Teil der
Hardware-Abnahme.**

Im mobilen Ace/Royal-Run blieb in Welle 2 genau ein Gegner übrig. Ab 109 von
110 Kills gab es keine Schüsse mehr; Endbild und Telemetrie sprechen stark für
einen Gegner außerhalb des kamerabezogenen Zielbereichs, die exakte
Gegnerposition wurde in diesem ersten Report aber noch nicht gespeichert.
Derselbe Seed lief nach Erweiterung der Diagnostik bei der direkten
Wiederholung normal bis Welle 6 weiter. Das Problem ist daher selten und nicht
rein seed-deterministisch. Wahrscheinlich wirken fehlendes Repathing an
Streaming-Hindernissen und der Zielreichweiten-Deckel gemeinsam; endgültig
bewiesen ist diese Kombination noch nicht.

Empfohlene sichere Lösung zur Freigabe: Stuck-Erkennung für einzelne
Restgegner und ein Wave-Cleanup-Repath/Relocate nach belegtem Kampfstillstand.
Den Reichweitendeckel nicht vorschnell wieder entfernen.

### 2. Featherweight / Boombardier

Ein einzelner Desktop-Run endete in Welle 3 durch `contact:slime`. Das ist ein
Signal für weitere reale Runs, aber noch keine ausreichende Grundlage für eine
globale Damage- oder HP-Anpassung.

### 3. Erstes Upgrade

**Status: P1 umgesetzt und abgenommen.**

Gemessen wurden 21,0 bis 40,3 Sekunden; der Median liegt bei rund 29 Sekunden.
Stormcrest liegt bereits gut, Ace und Standard-Boombardier teils spürbar spät.

Empfohlene Lösung zur Freigabe: das vorhandene Wave-1-XP-Budget nur zeitlich
nach vorn verlagern, nicht erhöhen. Frühe XP bleibt als sichtbare Orbs erhalten;
die Micro-Fodder-XP-Bremse bleibt unverändert.

Umgesetzt wurde eine reine Verteilungsänderung von Welle 1: Das feste Budget
bleibt bei 90 XP, wird aber mit `30/44/10/16 %` auf die vier Segmente verteilt.
Alle späteren Wellen, XP-Orbs und die Micro-Fodder-Bremse bleiben unverändert.
Fünf automatisierte Echtzeit-Kurzläufe mit allen drei Roostern auf Desktop und
Portrait erreichten die erste Upgrade-Wahl reproduzierbar nach 25,2 bis 31,4
Sekunden; der Stormcrest-Schutzfall verhindert eine zu frühe Wahl.

### 4. Mobile HUD

**Status: P0 umgesetzt und abgenommen.**

`109 Kills` wird im Portrait-HUD sichtbar zu `109 K…` gekürzt; auch der
Challenge-Zusatz der Wellenanzeige wird abgeschnitten. Die Uhr ist bei 390×844
noch lesbar, nutzt aber proportionale Ziffern und wird aktuell in jedem Frame
neu geschrieben.

Empfohlene Lösung zur Freigabe:

- tabellarische Ziffern;
- mobile Kurzformen `09:29`, `2/10`, `109` – Labels und Icons stehen bereits
  darüber/daneben;
- Text nur aktualisieren, wenn sich der angezeigte Wert ändert;
- keine Ellipse für die drei Kernzähler.

### 5. Mobile Hauptmenü

**Status: P0-Kompaktvariante umgesetzt und abgenommen.**

Bei rund 400×711 CSS-Pixeln liegt `RUN STARTEN` vollständig unterhalb des
sichtbaren Bereichs. Bei rund 434×822 ist ein kleiner Scroll nötig. Der frühere
Responsive-Pass deckte das nominelle 390×844-Ziel ab, aber nicht die durch
Browserleisten und Safe-Areas kürzere effektive Höhe. Der als erledigt
markierte Mobile-Punkt besitzt daher eine reale Abnahmelücke.

Empfohlene Lösung zur Freigabe: Unter etwa 760 px effektiver Höhe eine echte
Compact-Play-Variante. Portrait auf 120–140 px reduzieren, Beschreibung auf
eine Zeile, Challenge-Auswahl als horizontale kompakte Auswahl und den
Startbutton sticky am unteren Rand der Hennenhütte halten. Fullscreen und
Settings bleiben erhalten.

### 6. Asset-Konturen

Die Gegner-Sheets besitzen überwiegend klare dunkle Cartoon-Konturen. Rooster,
einige Projektile, Pickups und Effekte verwenden dagegen weichere oder
realistischere Kanten. Eine globale schwarze Outline wäre keine hochwertige
Lösung: Leuchteffekte, Feuer, Laser und Void-Zonen brauchen Lichtkanten statt
schwarzer Ränder.

Empfohlener selektiver Art-Pass:

- Rooster-Gameplay-Sheets: einheitliche dunkelbraune Silhouettenkante;
- kleine Projektile/Pickups: kontrastierende Farbkante plus Trail/Glow;
- Gegner: vorhandene Konturen nur normalisieren, nicht neu stilisieren;
- VFX und Terrain: keine schwarze Outline; stattdessen Glow beziehungsweise
  Bodenschatten.

### 7. Talentnest

**Status: P2 umgesetzt und auf Desktop/Mobile abgenommen.**

Die drei Stufen sind verständlich, wirken aber auf Mobile wie drei lineare
Listen. Empfohlen ist ein echter visueller Baum ohne neue Mechanik:

- Stufe I als drei Wurzeln;
- zwei versetzte Knoten in Stufe II;
- sichtbare goldene Verzweigungen von passenden Stufe-I-Talenten;
- Zusammenführung in Königsinstinkt;
- auf Mobile vertikaler Stamm mit seitlich versetzten Ästen.

Umgesetzt ist die unveränderte Talentmechanik nun als sichtbarer `3 → 2 → 1`-
Baum: drei Wurzeln verzweigen über goldene Linien in zwei Instinkte und laufen
im Königsinstinkt zusammen. Mobile verwendet einen vertikalen Stamm mit
wechselnd versetzten Knoten. Kosten, Ränge, Boni und Freischaltgrenzen wurden
nicht verändert. Ein zusätzliches Mobile-Gate prüft, dass Hähne und Talentnest
bis zum letzten Inhalt scrollen; beim kompakten Archiv bleibt der letzte Inhalt
auch ohne Scrollweg erreichbar.

### 8. Rooster-Kosmetik

**Status: P2-Erklärung und Vorschau umgesetzt; eigener Skin-Asset-Bulk bleibt
bewusst offen.**

`Sunrise Comb`, `Ironclad Plating` und `Violet Arc` sind aktuell reine
Farb-Tints ohne Wertewirkung. Das wird im Menü nicht erklärt und es fehlt eine
echte Vorschau.

Empfohlene Lösung zur Freigabe: direkt über der Auswahl `Nur Optik · keine
Werteänderung`, daneben kleine Vorher-/Nachher-Vorschau und der genaue
Freischaltweg. Mittelfristig sind individuelle Skins sinnvoll. Dafür benötigt
jeder Rooster mindestens Portrait plus vier Richtungsreihen; reine Vollflächen-
Tints sind für einen hochwertigen Mastery-Reward zu schwach.

Das Menü kennzeichnet jede aktuelle Variante jetzt ausdrücklich mit `NUR
OPTIK` und `Keine Werteänderung`, zeigt Original und Farbvariante nebeneinander
und nennt den exakten Freischaltweg. Gesperrte Varianten dürfen als Vorschau
betrachtet, aber weiterhin nicht gewählt werden. Die Darstellung behauptet
damit nicht länger, dass die vorhandenen Tints bereits vollwertige Skins sind.

## Entscheidung vor Anpassungen

Empfohlene Reihenfolge für einen kompakten Korrekturpass:

1. ~~Mobile Menü + HUD-Zähler;~~ **P0 erledigt**
2. ~~Restgegner-/Stuck-Sicherung;~~ **P0 erledigt**
3. ~~Wave-1-XP-Frontload nach weiteren Ace/Boombardier-Runs;~~ **P1 erledigt**
4. ~~Talentbaum + Kosmetik-Erklärung;~~ **P2 erledigt**
5. selektiver Outline-/Skin-Asset-Pass als eigener Bulk.
