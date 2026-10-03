# RoosterRage: Pickup- und Trefferfeedback-Pass

Stand: 3. Oktober 2026. Diese Datei ist die laufende Checkliste. Ein Haken bedeutet, dass die Aufgabe umgesetzt **und** die genannte Prüfung durchgeführt wurde. Offene Punkte und Entscheidungen werden hier während der Arbeit ergänzt.

## Ausgangslage und Regeln

- [x] Git-Zustand geprüft: `codex/portal-feedback-polish`, HEAD `9df1054` einschließlich `5470ad9`; Arbeitsbaum vor Beginn sauber. Remote `origin` zeigt auf `https://github.com/emfau88/RoosterRage.git`.
- [x] Im Arbeitsbereich nach `AGENTS.md` gesucht; keine gefunden.
- [x] Bestehende Logik und Tests für Pickup-Kontakt und Brand grob geprüft.
- [x] Veröffentlichungsstand und lokal gemessene Ausgangswerte dokumentieren.
- [x] Reproduzierbare Vorher-Szenen und Aufnahmen für Pickups und brennende Gegner sichern.

Bestehende Rooster- und Elite-Grafiken bleiben erhalten. Die Molotov-Fläche behält ihre ovale Bodenperspektive und dichten Bodenflammen. Änderungen erfolgen in der Reihenfolge unten. Keine Resets oder ungefragten Asset-Löschungen; andere Projekte bleiben unberührt.

## Paket 1: Pickup-Sammelbereiche

- [x] Effektiven Kontaktabstand und Fuß-/Bodenanker bei Ace, Storm und Artillery auf Desktop und im mobilen Hochformat messen.
- [x] Getrennte Radien für Bombe, Health und Magnet festlegen. Startkandidaten: Bombe 10–12, Health/Magnet 14–16 Welteinheiten. Truhen zunächst unverändert.
- [x] Bodengebundenen Sammelanker und unabhängig schwebendes Item erhalten; Bombe nur durch bewussten Kontakt auslösen.
- [x] Reale gerade, diagonale, knappe und schnelle Bewegungen testen; `tests/pickup-contact-runner.mjs` an die neuen Werte anpassen.
- [x] Volle/fehlende HP, einmalige Auslösung, XP-Magnet ohne Spezial-Pickups, Pause und Reset prüfen.
- [x] Desktop- und mobile Sichtkontrolle durchführen; endgültige Radien und effektive Auslösedistanzen dokumentieren.

## Paket 2: Pickup-Felder und Lichtstrahlen

- [x] Imagegen-Skill lesen; transparente Quellen für Health, Bombe und Magnet erzeugen: je ein Bodenoval und ein kurzer Lichtstrahl.
- [x] Quellen separat in `art-source` ablegen und sechs optimierte Laufzeitassets integrieren. Bestehende Pickup-Assets erhalten.
- [x] Bodenfeld fest am Sammelanker, schwebendes Symbol unabhängig und Strahl kurz hinter dem Symbol platzieren; dezente Puls- und Flackeranimation.
- [ ] Zusätzliche dunkle Map-Variante in tatsächlicher Desktop- und Mobilgröße prüfen; die vorhandene helle Coop-Square-Szene ist visuell kontrolliert. Im aktuellen Arena-Angebot gibt es keine explizit dunkle Map.
- [x] `npm run assets:check` und Release-/Pages-Downloadbudget prüfen; Größen dokumentieren.

## Paket 3: Wegweiser für Pickups außerhalb der Kamera

- [x] Kamera- und HUD-Koordinaten sowie freie Bildschirmbereiche für Desktop und Touch festlegen.
- [x] Höchstens einen Pfeil mit Item-Symbol pro Typ, insgesamt höchstens drei, zum jeweils nächsten verfügbaren Pickup anzeigen.
- [x] Ziele bei Sichtbarkeit, Einsammeln, Entfernen, Pause-/Menüzuständen und Reset korrekt aktualisieren; Health bei fehlenden HP hervorheben.
- [x] Sicheren Bildschirmrand, drei kleine Distanzstufen, Überlappungsvermeidung und ruhige Bewegung integrieren.
- [x] Kamerafahrt, Zoom, Hochformat, Zielwechsel und Cleanup im laufenden Spiel prüfen.

## Paket 4: Molotov-Brandstatus darstellen

- [x] Einmaligen und wiederholten Kontakt auf Brenndauer, Tickzeiten und Gesamtschaden messen.
- [x] Zwei bis drei kleine, wiederverwendete Flammen am Gegnerkörper und an den Füßen an den bestehenden Status koppeln.
- [x] Normalgegner, Elites und Bosse prüfen; Gesicht, Silhouette, HP und Angriffswarnung frei halten.
- [x] Wiederholten Kontakt, Ablauf, Tod, Pooling, Pause und Reset auf Effektbegrenzung und Cleanup prüfen.
- [x] Bestehenden Molotov-Schaden im Darstellungspaket beibehalten und dokumentieren; ovale Fläche und dichte Bodenflammen bewahren.

## Paket 5: Fire Eggs mit Nachbrennen

- [x] Direkten Bonus von bislang +10 Schaden pro Rang und Auswirkungen von `projectileDamage` auf andere Angriffe messen.
- [x] Direkten und verzögerten Schaden gemeinsam abstimmen; Kandidat: +6 direkt und höchstens +4 über rund 2,4 Sekunden pro Rang. Endwerte erst nach Tests festlegen.
- [x] Kurzen Treffer-Flammenstoß und den gemeinsamen begrenzten Brandstatus implementieren; stärkste gültige Quelle und verlängerte Dauer ohne unbegrenztes Stapeln.
- [x] Tickplanung bei erneutem Kontakt nachvollziehbar festlegen, Molotov-Gesamtschaden gesondert vergleichen und Fire-Egg-Nachbrennen korrekt zuordnen.
- [x] Sofort tödliche, überlebte, wiederholte, durchdringende und abprallende Treffer sowie gemischten Brand testen.
- [x] Upgrade-Texte an das tatsächliche Verhalten anpassen und Endwerte dokumentieren.

## Paket 6: Weitere Trefferreaktionen

- [x] Vorhandene Trefferbilder, Effektlimits und Einstellungen prüfen.
- [x] Blitz: kurze Bögen und heller Trefferimpuls; Rakete/Bombe: kompakter Druckstoß und Funken; Void: kurzes violettes Zusammenziehen.
- [x] Viele gleichzeitige Treffer begrenzen oder bündeln, ohne Schadenswerte zu verändern.
- [ ] Dichten Kampf auf einem schwächeren Mobilgerät mit Bildzeitenprofil messen; der automatisierte 18-Gegner-/2-Molotov-Lauf rendert weiter und das Bild wurde visuell geprüft.

## Abschluss und Übergabe

- [x] Passende Funktionstests je Paket durchführen und Ergebnisse festhalten.
- [x] `npm run test:pickup-contact`, `npm run test:mechanics`, `npm run test:weapon-progression`, `npm run test:pause` ausführen.
- [x] `npm run assets:check`, `npm run test:production`, `npm run test:release`, `npm run test:pages` ausführen.
- [x] Gezielte Prüfungen für Wegweiser, Branddauer/-schaden, Mehrfachkontakt und vollständiges Effekt-Cleanup ergänzen.
- [x] Je ein gemeinsames Vorher/Nachher-Bild für Pickups und brennende Gegner erstellen.
- [x] Lokal erreichbare Vergleichsseite mit bewegten Effekten bereitstellen und prüfen.
- [x] Kurze deutsche Bewertung, endgültige Werte, tatsächliche Tests, offene Punkte, lokale Spieladresse sowie Git- und Veröffentlichungsstatus übergeben.

## Messwerte und Entscheidungen

| Thema | Ausgangswert / Befund | Endwert / Entscheidung |
| --- | --- | --- |
| Normale Pickup-Radien | 21 Welteinheiten plus Spieler-Kollisionsfläche (rund 36 effektiv) | Bombe 11, Health/Magnet 15; mit Spieler-Radius rund 26 bzw. 30 ab Fußanker |
| Truhenradius | 24 Welteinheiten | unverändert 24 |
| Fire-Egg-Bonus | +10 direkter Schaden pro Rang | Fire Egg: +7 direkt und 3 Brand-Ticks à 1 pro Rang (gesamt weiterhin +10); andere Angriffe behalten +10 direkt pro Rang |
| Molotov-Brand | 3 s; erneuter Kontakt verlängert; nächster Tick wird nach hinten verschoben | 3 s und bisheriger Tick-Abstand/Schaden bleiben; zwei bis drei Körperflammen zeigen den Status |
| Gemischter Brand | bisher nur Molotov | Gemeinsamer Status: stärkste aktive Quelle tickt, Dauer ist die längste aktive Restdauer, kein Stapelschaden; Molotov-Kontakt verschiebt den nächsten Tick wie bisher, Fire-Egg-Kontakt nicht |
| Neue Laufzeitassets | keine neuen Felder/Strahlen | 6 WebP-Dateien, zusammen 14.688 Byte; Quellen und Prompts in `art-source/pickups/fields/` |
| Release-Budget | 19 MiB | 18,78 MiB laut `test:release` |
| Pages-Budget | 21 MiB | 20,98 MiB laut `test:pages` |

## Nachbesserung: sichtbare Strahlen und Wegweiser

- [x] Health, Bombe und Magnet mit deutlich höheren Strahlen, farbigem Halo und hellem Kern versehen (124 statt 54 Welteinheiten Höhe).
- [x] Farben auch im Canvas-Fallback erhalten; kleine Farbverläufe einmalig pro Farbe erzeugen und wiederverwenden.
- [x] Alle Truhentypen mit 192 Welteinheiten hohem Strahl, Bodenring und sechs aufsteigenden Funkelpartikeln versehen; königliche Truhen violett darstellen.
- [x] Wegweiser größer und kontrastreicher gestalten, Entfernung mit NAH/WEIT/FERN und Balken darstellen; einen gemeinsamen Truhen-Wegweiser ergänzen.
- [x] Pro Typ das nächste Item außerhalb des Bildes markieren; ein sichtbares Item verdeckt keinen weiteren Wegweiser desselben Typs.
- [x] Vier Wegweiser am selben Rand ohne Überlappung in Harvest Yard auf Desktop und im Hochformat prüfen; Bilder unter `docs/qa/pickup-hit-feedback/beacons-*.png` und `wayfinders-*.png` ablegen.
- [x] Bewegung, Pause, Ausblenden beim Truhenöffnen und vollständiges Cleanup prüfen; Pickup-Radien und Belohnungsabläufe unverändert verifizieren.
- [x] `test:pickup-indicators` (direkter Runner), `test:pickup-beacons` (direkter Runner), `test:pickup-contact`, `test:release` und `test:pages` bestanden. Release weiterhin 18,78 MiB.
- [ ] Korrektur committen, auf Entwicklungs- und Preview-Branch pushen und erfolgreichen Pages-Deploy samt veröffentlichter Commit-ID prüfen.

## Bisheriges Laufprotokoll

- 2026-10-03: Plan erstellt; Git-Stand, Einstiegspunkte und vorhandene Testskripte geprüft. Noch keine Spieländerung und keine vollständigen Testläufe.
- 2026-10-03: Plan als `e4ff073` auf `origin/codex/portal-feedback-polish` gepusht. Nach Freigabe Pakete 1–6 umgesetzt. Vergleichsbilder und bewegliche lokale Vergleichsseite erstellt.
- 2026-10-03: `test:pickup-contact` (36 Richtungsquerungen, 45 Vorbeilauf-/Schnellfälle, voller HP, Pause, Magnet-Spezialausschluss, Reset), `test:mechanics`, `test:weapon-progression`, `test:pause`, `assets:check`, `test:production`, `test:release` und `test:pages` bestanden. Gezielter Brand-/Trefferfeedback-Test und Desktop-/Hochformat-Wegweisertest einschließlich Zielwechsel, Kamerafahrt und Reset bestanden.
- 2026-10-03: Vorher/Nachher-Bilder liegen unter `docs/qa/pickup-hit-feedback/`; die Seite `feedback-comparison.html` zeigt beide Varianten gleichzeitig und animiert. Die beiden noch offenen Checklistenpunkte betreffen eine im aktuellen Spiel fehlende dunkle Map-Variante und ein Bildzeitenprofil auf schwächerer Mobilhardware. Sie blockieren die lokale Spielbarkeit nicht, bleiben aber für ein späteres QA-Paket sichtbar.
- 2026-10-03: Lokaler Vite-Server unter `http://127.0.0.1:5173/` gestartet; Vergleich unter `http://127.0.0.1:5173/feedback-comparison.html` mit HTTP 200 geprüft. Kein öffentlicher Deploy im Rahmen dieses Passes.
- 2026-10-03: Die „Vorher“-Spalte nutzt einen nur im Dev-Modus aktiven Vergleichsschalter für die bisherigen Pickup- und Brand-Visuals auf demselben Spielzustand. Sie ist kein zweiter historischer Build; die Gegenüberstellung bewertet gezielt die Darstellung.
