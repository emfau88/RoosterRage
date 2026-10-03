# RoosterRage: Pickup- und Trefferfeedback-Pass

Stand: 3. Oktober 2026. Diese Datei ist die laufende Checkliste. Ein Haken bedeutet, dass die Aufgabe umgesetzt **und** die genannte Prüfung durchgeführt wurde. Offene Punkte und Entscheidungen werden hier während der Arbeit ergänzt.

## Ausgangslage und Regeln

- [x] Git-Zustand geprüft: `codex/portal-feedback-polish`, HEAD `9df1054` einschließlich `5470ad9`; Arbeitsbaum vor Beginn sauber. Remote `origin` zeigt auf `https://github.com/emfau88/RoosterRage.git`.
- [x] Im Arbeitsbereich nach `AGENTS.md` gesucht; keine gefunden.
- [x] Bestehende Logik und Tests für Pickup-Kontakt und Brand grob geprüft.
- [ ] Veröffentlichungsstand und lokal gemessene Ausgangswerte dokumentieren.
- [ ] Reproduzierbare Vorher-Szenen und Aufnahmen für Pickups und brennende Gegner sichern.

Bestehende Rooster- und Elite-Grafiken bleiben erhalten. Die Molotov-Fläche behält ihre ovale Bodenperspektive und dichten Bodenflammen. Änderungen erfolgen in der Reihenfolge unten. Keine Resets oder ungefragten Asset-Löschungen; andere Projekte bleiben unberührt.

## Paket 1: Pickup-Sammelbereiche

- [ ] Effektiven Kontaktabstand und Fuß-/Bodenanker bei Ace, Storm und Artillery auf Desktop und im mobilen Hochformat messen.
- [ ] Getrennte Radien für Bombe, Health und Magnet festlegen. Startkandidaten: Bombe 10–12, Health/Magnet 14–16 Welteinheiten. Truhen zunächst unverändert.
- [ ] Bodengebundenen Sammelanker und unabhängig schwebendes Item erhalten; Bombe nur durch bewussten Kontakt auslösen.
- [ ] Reale gerade, diagonale, knappe und schnelle Bewegungen testen; `tests/pickup-contact-runner.mjs` an die neuen Werte anpassen.
- [ ] Volle/fehlende HP, einmalige Auslösung, XP-Magnet ohne Spezial-Pickups, Pause und Reset prüfen.
- [ ] Desktop- und mobile Sichtkontrolle durchführen; endgültige Radien und effektive Auslösedistanzen dokumentieren.

## Paket 2: Pickup-Felder und Lichtstrahlen

- [ ] Imagegen-Skill lesen; transparente Quellen für Health, Bombe und Magnet erzeugen: je ein Bodenoval und ein kurzer Lichtstrahl.
- [ ] Quellen separat in `art-source` ablegen und sechs optimierte Laufzeitassets integrieren. Bestehende Pickup-Assets erhalten.
- [ ] Bodenfeld fest am Sammelanker, schwebendes Symbol unabhängig und Strahl kurz hinter dem Symbol platzieren; dezente Puls- und Flackeranimation.
- [ ] Auf hellen/dunklen Maps in tatsächlicher Desktop- und Mobilgröße prüfen; Symbole, Gegnerwarnungen und Geschosse lesbar halten.
- [ ] `npm run assets:check` und Release-/Pages-Downloadbudget prüfen; Größen dokumentieren.

## Paket 3: Wegweiser für Pickups außerhalb der Kamera

- [ ] Kamera- und HUD-Koordinaten sowie freie Bildschirmbereiche für Desktop und Touch festlegen.
- [ ] Höchstens einen Pfeil mit Item-Symbol pro Typ, insgesamt höchstens drei, zum jeweils nächsten verfügbaren Pickup anzeigen.
- [ ] Ziele bei Sichtbarkeit, Einsammeln, Entfernen, Pause-/Menüzuständen und Reset korrekt aktualisieren; Health bei fehlenden HP hervorheben.
- [ ] Sicheren Bildschirmrand, drei kleine Distanzstufen, Überlappungsvermeidung und ruhige Bewegung integrieren.
- [ ] Kamerafahrt, Zoom, Hochformat, Zielwechsel und Cleanup im laufenden Spiel prüfen.

## Paket 4: Molotov-Brandstatus darstellen

- [ ] Einmaligen und wiederholten Kontakt auf Brenndauer, Tickzeiten und Gesamtschaden messen.
- [ ] Zwei bis drei kleine, wiederverwendete Flammen am Gegnerkörper und an den Füßen an den bestehenden Status koppeln.
- [ ] Normalgegner, Elites und Bosse prüfen; Gesicht, Silhouette, HP und Angriffswarnung frei halten.
- [ ] Wiederholten Kontakt, Ablauf, Tod, Pooling, Pause und Reset auf Effektbegrenzung und Cleanup prüfen.
- [ ] Bestehenden Molotov-Schaden im Darstellungspaket beibehalten und dokumentieren; ovale Fläche und dichte Bodenflammen bewahren.

## Paket 5: Fire Eggs mit Nachbrennen

- [ ] Direkten Bonus von bislang +10 Schaden pro Rang und Auswirkungen von `projectileDamage` auf andere Angriffe messen.
- [ ] Direkten und verzögerten Schaden gemeinsam abstimmen; Kandidat: +6 direkt und höchstens +4 über rund 2,4 Sekunden pro Rang. Endwerte erst nach Tests festlegen.
- [ ] Kurzen Treffer-Flammenstoß und den gemeinsamen begrenzten Brandstatus implementieren; stärkste gültige Quelle und verlängerte Dauer ohne unbegrenztes Stapeln.
- [ ] Tickplanung bei erneutem Kontakt nachvollziehbar festlegen, Molotov-Gesamtschaden gesondert vergleichen und Fire-Egg-Nachbrennen korrekt zuordnen.
- [ ] Sofort tödliche, überlebte, wiederholte, durchdringende und abprallende Treffer sowie gemischten Brand testen.
- [ ] Upgrade-Texte an das tatsächliche Verhalten anpassen und Endwerte dokumentieren.

## Paket 6: Weitere Trefferreaktionen

- [ ] Vorhandene Trefferbilder, Effektlimits und Einstellungen prüfen.
- [ ] Blitz: kurze Bögen und heller Trefferimpuls; Rakete/Bombe: kompakter Druckstoß und Funken; Void: kurzes violettes Zusammenziehen.
- [ ] Viele gleichzeitige Treffer begrenzen oder bündeln, ohne Schadenswerte zu verändern.
- [ ] Dichten Kampf auf Unterscheidbarkeit, Warnungen, Geschosse und Bildzeiten prüfen.

## Abschluss und Übergabe

- [ ] Passende Funktionstests je Paket durchführen und Ergebnisse festhalten.
- [ ] `npm run test:pickup-contact`, `npm run test:mechanics`, `npm run test:weapon-progression`, `npm run test:pause` ausführen.
- [ ] `npm run assets:check`, `npm run test:production`, `npm run test:release`, `npm run test:pages` ausführen.
- [ ] Gezielte Prüfungen für Wegweiser, Branddauer/-schaden, Mehrfachkontakt und vollständiges Effekt-Cleanup ergänzen.
- [ ] Je ein gemeinsames Vorher/Nachher-Bild für Pickups und brennende Gegner erstellen.
- [ ] Lokal erreichbare Vergleichsseite mit bewegten Effekten bereitstellen und prüfen.
- [ ] Kurze deutsche Bewertung, endgültige Werte, tatsächliche Tests, offene Punkte, lokale Spieladresse sowie Git- und Veröffentlichungsstatus übergeben.

## Messwerte und Entscheidungen

| Thema | Ausgangswert / Befund | Endwert / Entscheidung |
| --- | --- | --- |
| Normale Pickup-Radien | 21 Welteinheiten plus Spieler-Kollisionsfläche | offen |
| Truhenradius | 24 Welteinheiten | vorerst 24 |
| Fire-Egg-Bonus | +10 direkter Schaden pro Rang | offen |
| Molotov-Brand | 3 s; erneuter Kontakt verlängert; nächster Tick derzeit nach hinten verschoben | offen |
| Release-Budget | 19 MiB | offen |
| Pages-Budget | 21 MiB | offen |

## Laufprotokoll

- 2026-10-03: Plan erstellt; Git-Stand, Einstiegspunkte und vorhandene Testskripte geprüft. Noch keine Spieländerung und keine vollständigen Testläufe.
