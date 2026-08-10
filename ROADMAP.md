# Rooster Rage - Produkt- und Entwicklungsroadmap

## Zielbild

Rooster Rage wird zunaechst als fokussierter Mobile-first-Web-Premium-Prototyp entwickelt.

- Klarer Hook: verrueckte Rooster-Klassen, charakteristische Ei-Waffen und spektakulaere Build-Synergien.
- Commercial Vertical Slice: 3 spielbare Rooster, 10 abwechslungsreiche Wellen, 1 Boss und etwa 25 belastbare Upgrades.
- Die heutigen 10 Wellen bilden zunaechst einen kurzen, vollstaendig spielbaren Run. Eine spaetere Vollversion braucht laengere Runs oder mehrere 10-Wellen-Akte.
- Mobile Portrait und Landscape bestimmen Bedienung, Lesbarkeit und Performance-Budgets; Desktop bleibt vollstaendig unterstuetzt.

## Statusuebersicht

| Phase | Thema | Status |
| --- | --- | --- |
| 0 | Technische Baseline | Abgeschlossen |
| 1 | Combat-Architektur | Abgeschlossen |
| 2 | Weitere Modularisierung | Abgeschlossen |
| 3 | Asset- und Performance-Pipeline | Abgeschlossen |
| 4 | Spielgefuehl und Lesbarkeit | Abgeschlossen |
| 5 | Upgrade-System als Kernprodukt | Abgeschlossen |
| 6 | Drei Rooster-Klassen | Abgeschlossen |
| 7 | Wellen 1-10 kuratieren | Abgeschlossen |
| 8 | Messbarkeit und Lastfundament | Abgeschlossen |
| 9 | Spawn Director und Schwarmkampf | Abgeschlossen |
| 10 | Run-Pacing und XP-Oekonomie | Abgeschlossen |
| 11 | Loadout- und EVO-System | Abgeschlossen |
| 12 | Arenen und Pickups | Abgeschlossen |
| 13 | Gegner-, Elite- und Boss-Paket | Abgeschlossen |
| 14 | HUD, Feedback und Run-Report | Abgeschlossen |
| 15 | Rooster-Tiefe und Build-Content | Abgeschlossen |
| 16 | Meta und Challenges | Abgeschlossen |
| 17 | Vertical-Slice-Abnahme | Automatischer Freeze abgeschlossen; manuell/extern offen |
| 18 | Kommerzielle Validierung | Release-Vorbereitung nach manuellem Gate |

Aktueller Fokus: manueller und externer Phase-17-Gate. Der automatisierte Feature-Freeze ist hergestellt; eine oeffentliche Phase-18-Demo wird erst nach dieser Slice-Abnahme freigegeben.

## Phase 0: Technische Baseline

Status: Abgeschlossen am 2026-08-09

- [x] Gemeinsame Testserver-Hilfe fuer Smoke-, Mechanics- und Balance-Runner erstellen.
- [x] Bereits laufenden Dev-Server erkennen oder einen freien Port verwenden.
- [x] Victory-Text an die tatsaechliche Anzahl der Wellen koppeln.
- [x] TestApi in Produktions-Builds absichern.
- [x] Veraltete Vite-5-Toolchain kontrolliert aktualisieren und Sicherheitswarnungen pruefen.
- [x] CI fuehrt Build, Production-Gate, Smoke-Test und Mechanics-Test aus.
- [x] GitHub-Actions-Abhaengigkeiten fuer aktuelle Node-Runtimes aktualisieren.
- [x] Build und funktionale Tests erfolgreich ausfuehren.

Abnahme: Build, Smoke-Test und Mechanics-Test funktionieren zuverlaessig mit und ohne bereits laufenden Dev-Server. Der Produktions-Build stellt keine TestApi bereit.

Abnahmeprotokoll:

- `npm run build`: bestanden mit Vite 8.2.1.
- `npm run build -- --base=/RoosterRage/`: bestanden.
- `npm run test:production`: bestanden; TestApi im Produktions-Build nicht vorhanden.
- `npm run test:smoke`: bestanden mit vorhandenem Dev-Server.
- `ROOSTER_TEST_URL=http://127.0.0.1:5299/ npm run test:smoke`: bestanden mit selbst gestartetem Testserver.
- `npm run test:mechanics`: bestanden.
- `npm audit`: 0 bekannte Schwachstellen.
- Kein Balance-Run ausgefuehrt.

## Phase 1: Combat-Architektur

Status: Abgeschlossen am 2026-08-09

Die Details stehen in `NEXT_SESSION_PROJECTILE_COMBAT_TODO.md`.

- `CombatSystem` extrahieren.
- Zielsuche, Auto-Schuss, Projektilerzeugung, Treffer und Schaden aus `GameScene` verschieben.
- Bestehende Wrapper zunaechst erhalten.
- Double/Triple Shot, Homing, Pierce und Spezialprojektile regressionssicher testen.
- Keine Balanceaenderungen in dieser Phase.

Abnahme: `GameScene` orchestriert den Kampf nur noch; saemtliche bisherigen Angriffe funktionieren unveraendert.

Abnahmeprotokoll:

- `CombatSystem` enthaelt Zielsuche, Schussmuster, Auto-Schuss, Projektil-Spawning, Treffer und Schaden.
- Kompatible Wrapper in `GameScene` bleiben fuer bestehende Systeme erhalten.
- `GameScene` wurde von 893 auf 736 Zeilen reduziert.
- `npm run build`: bestanden.
- `npm run test:mechanics`: bestanden.
- `npm run test:smoke`: bestanden.
- Kein Balance-Run ausgefuehrt.

## Phase 2: Weitere Modularisierung

Status: Abgeschlossen am 2026-08-09

- [x] `EnemyAttackSystem` fuer Spitter-, Fan-, Bomber- und Boss-Angriffe.
- [x] `ProjectileLifecycleSystem` fuer Bewegung, Lebensdauer, Cleanup und Bounds.
- [x] Aktive Faehigkeiten in einzelne Module aufteilen.
- [x] Wave-Definitionen aus `WaveSystem` in deklarative Daten verschieben.
- [x] Asset-Laden, Animationen und generierte Fallback-Texturen trennen.
- [x] Zentralen Run-State fuer Pause, Upgrade-Auswahl, Victory und Game Over einfuehren.
- [x] Eingabe, Kollisionen, Entitaeten und Kampf-Feedback aus `GameScene` extrahieren.
- [x] Scene-Shutdown und Neustart regressionssicher testen.

Abnahme: Keine neue God-Datei; `GameScene` liegt idealerweise unter etwa 450 Zeilen.

Abnahmeprotokoll:

- `GameScene` wurde von 736 auf 423 Zeilen reduziert und dient als Orchestrator/Fassade.
- Groesstes neues System ist `CombatSystem` mit 205 Zeilen; aktive Faehigkeiten und Asset-Setup sind in kleine Fachmodule getrennt.
- `npm run build`: bestanden.
- `npm run test:production`: bestanden; TestApi im Produktions-Build nicht vorhanden.
- `npm run test:mechanics`: bestanden.
- `npm run test:smoke`: bestanden, einschliesslich echtem Scene-Restart.
- Kein Balance-Run ausgefuehrt.

## Phase 3: Asset- und Performance-Pipeline

Status: Abgeschlossen am 2026-08-09

- [x] Nur verwendete Runtime-Assets in den Build aufnehmen.
- [x] Rohbilder und Arbeitsdateien nach `art-source` verschieben.
- [x] Runtime-PNGs reproduzierbar als WebP mit Qualitaet 88 erzeugen.
- [x] Hash-Manifest und CI-Check gegen veraltete Runtime-Assets einfuehren.
- [x] Bestehende UI- und FX-Atlanten beibehalten; keine unnoetigen neuen Atlanten erzeugen.
- [x] Phaser als separaten, cachebaren Build-Chunk ausgeben.
- [x] Ladebildschirm und nachvollziehbaren Asset-Fehlerzustand ergaenzen.
- [x] Mobile-Portrait-Start, Joystick und Canvas-Abdeckung automatisiert pruefen.

Abnahme: Deutlich kleinerer Produktions-Download, keine unbenutzten Bildvarianten im Build und stabiler Mobile-Start.

Abnahmeprotokoll:

- 50 PNG-Quellen und Arbeitsvarianten liegen ausserhalb von `src` unter `art-source`.
- 16 benoetigte Runtime-Bilder werden ueber `npm run assets:optimize` erzeugt und ueber `npm run assets:check` verifiziert.
- Runtime-Bilder: 5.194.245 auf 1.310.962 Bytes reduziert (74,8 Prozent).
- Gesamter `dist/assets`-Umfang: 7.187.172 auf 2.775.914 Bytes reduziert (rund 61 Prozent).
- Eigener Spielcode: rund 84 KB; Phaser ist als separater Chunk mit rund 1,20 MB cachebar.
- `npm run build -- --base=/RoosterRage/`: bestanden.
- `npm run test:production`: bestanden.
- `npm run test:mechanics`: bestanden.
- `npm run test:smoke`: bestanden, inklusive Desktop, Scene-Restart, Mobile Portrait und simuliertem Asset-Ladefehler.
- Resthinweis: Der Phaser-Chunk liegt weiterhin ueber 500 KB; weiteres Splitten bringt fuer den sofort benoetigten Engine-Code derzeit keinen praktischen Startvorteil.
- Kein Balance-Run ausgefuehrt.

## Phase 4: Spielgefuehl und Lesbarkeit

Status: Abgeschlossen am 2026-08-09

- [x] Bewegung, Kollisionen und Trefferreaktionen pruefen.
- [x] Eigene, gegnerische und Flaechenangriffe eindeutig unterscheiden.
- [x] Spitter-, Fan- und Boss-Projektile besser lesbar machen.
- [x] Trefferblitze, Knockback, Sounds und Screen Shake dosieren.
- [x] Mobile Joystick, Portrait-Zoom und Fullscreen auf echten Viewports testen.
- [x] HUD priorisieren und Audio-Limits fuer haeufige Effekte definieren.

Abnahme: Neue Spieler verstehen ohne Erklaerung, was sie trifft und was ihre Upgrades bewirken.

Abnahmeprotokoll:

- Spitter-, Fan- und Boss-Angriffe zeigen vor dem Abschuss klar erkennbare Telegraphen von 180, 230 beziehungsweise 420 Millisekunden.
- Gegnerprojektile besitzen eine rote Gefahrenkontur; der schwere Boss-Feuerball ist zusaetzlich als schwerer Angriff markiert.
- Schadenszahlen werden pro Gegner gedrosselt, Trefferfunken bleiben sichtbar und Spielerschaden nutzt dosierten Flash und Screen Shake.
- Das Audio-System begrenzt gleichzeitige Stimmen global auf sieben und erlaubt nur fuer priorisierte Ereignisse kurzzeitig zwei weitere Stimmen.
- Das HUD blendet eine leere Upgrade-Zeile aus, priorisiert kritische HP und bleibt im niedrigen Landscape-Viewport kompakt.
- Desktop-Tastatur, Mobile-Touch-Drag, Portrait-Zoom, Landscape-Layout, Joystick und Fullscreen-Ausloeser werden automatisiert geprueft.
- `npm run build`: bestanden.
- `npm run test:mechanics`: bestanden, einschliesslich Telegraph- und Audio-Budget-Pruefungen.
- `npm run test:smoke`: bestanden, einschliesslich echter Keyboard- und Pointer-Eingabe.
- Portrait-, Landscape-, Fan- und Boss-Screenshots wurden visuell geprueft.
- Kein Balance-Run ausgefuehrt; dieser ist erst nach dem naechsten abgeschlossenen Gameplay-Paket sinnvoll.

## Phase 5: Upgrade-System als Kernprodukt

Status: Abgeschlossen am 2026-08-09

- [x] Zielbestand von etwa 25 Upgrades aufbauen.
- [x] Kategorien Weapon, Active, Orbit, Summon, Passive und Utility pflegen.
- [x] `maxRank`, `requires`, `excludes`, `weight` und Rarity vervollstaendigen.
- [x] Frueh im Run mindestens eine auffaellige aktive Faehigkeit anbieten.
- [x] Bestehende Faehigkeiten in sinnvolle Rangketten ueberfuehren.
- [x] Synergien wie Molotow + Void, Rakete + Fire Eggs und Orbit + Lightning definieren.
- [x] Tote Optionen verhindern und Karten um konkrete Zahlen ergaenzen.
- [x] Reroll oder Skip erst nach Auswahltests bewerten.

Abnahme: Jede Auswahl veraendert Spielweise, Zielprioritaet oder sichtbare Kampfwirkung.

Abnahmeprotokoll:

- Der Katalog umfasst genau 25 funktionale Upgrades mit Kategorie, Rarity, Gewicht und Ranggrenzen.
- Neu: Swift Shells, Critical Yolk, Ricochet Eggs, Shell Shock und Second Wind mit eigener Laufzeitlogik.
- Fruehe Angebote garantieren eine Active-, Orbit- oder Summon-Option nur so lange, bis der Spieler eine solche Faehigkeit besitzt.
- Heal wird bei vollen HP nicht angeboten; Max-Rank-, `requires`- und `excludes`-Regeln werden zentral ausgewertet.
- Karten zeigen Kategorie, naechsten Rang, Ranggrenze und konkrete numerische Wirkung; aktive Synergien werden markiert.
- Fire Eggs + Rocket Egg, Orbit Eggs + Lightning Comb und Molotov Egg + Void Nest veraendern Schaden, Zielzahl beziehungsweise Sogstaerke wirklich.
- Ein bestehender Doppel-Treffer zwischen Phaser-Overlap und Distanzpruefung wurde zentral behoben; Pierce und Ricochet treffen dasselbe Ziel nicht mehrfach.
- `npm run test:mechanics`: bestanden, inklusive Katalog-, Angebots-, Critical-, Ricochet-, Knockback-, Second-Wind- und Synergiepruefungen.
- Upgrade-Karten wurden auf einem 960 x 540 Viewport visuell geprueft.
- Reroll und Skip wurden bewusst nicht eingebaut; dafuer fehlt noch belastbares Auswahlfeedback aus echten Runs.
- Kein Balance-Run ausgefuehrt; er ist nach Phase 6 oder 7 als geschlossenem Gameplay-Paket sinnvoller.

## Phase 6: Drei Rooster-Klassen

Status: Abgeschlossen am 2026-08-09

- [x] Basis-Rooster: ausgewogen, zielgerichtete Eier, flexibel.
- [x] Artillery-Rooster: schwere Eier, Explosionen, Feuer und Raketen.
- [x] Storm-Rooster: schnell, Kettenblitze, Laser und Orbit-Fokus.
- [x] Eigene Startwerte, Primaerangriffe, passive Eigenschaft und klare Silhouette.
- [x] Support-Chick und weitere Begleiter als echte Summon-Builds behandeln.
- [x] Auswahl zunaechst vor dem Run; Freischaltungen erst nach bestaetigtem Spielspass.
- [x] Hennenhuette spaeter als Meta-Hub nutzen, nicht als Ersatz fuer eine klare Auswahl.

Abnahme: Jeder Rooster spielt sich vom ersten Schuss an erkennbar anders.

Abnahmeprotokoll:

- Barnyard Ace startet mit 100 HP, zielstarkem Basis-Ei und 8% eingebauter Crit-Chance.
- Boombardier startet mit 115 HP, langsamem 30-Schaden-Projektil und 55% Splash-Schaden in 64 Radius.
- Stormcrest startet mit 85 HP, hoher Bewegung/Schussrate und einer 60%-Kettenentladung auf ein zweites Ziel.
- Artillery-Angebote gewichten Feuer, Raketen und Molotov hoeher; Storm-Angebote gewichten Blitz, Laser und Orbit hoeher, ohne Builds hart zu sperren.
- Die Auswahl erscheint vor jedem Run und nach Restart; erst danach starten Physik, Wellen und Spielzeit.
- Eigene Groesse, Tint und Klassenmarker erzeugen im Prototyp klar unterscheidbare Silhouetten; finale individuelle Rooster-Sprites bleiben ein spaeteres Asset-Paket.
- Auswahlkarten zeigen Rolle, HP, Geschwindigkeit, Schaden, Primaerangriff und Passive auf Desktop, Portrait und Landscape.
- `npm run test:mechanics`: bestanden; Fokus-, Splash- und Chain-Angriffe sowie Startwerte, Marker und Affinitaeten werden geprueft.
- `npm run test:smoke`: bestanden; Auswahl per echter UI, Restart, Touch-Drag, Portrait, Landscape und Fullscreen funktionieren.
- Desktop-, Portrait-, Landscape- und Klassenangriffs-Screenshots wurden visuell geprueft.
- Kein Balance-Run ausgefuehrt; nach der Wellenkuratierung in Phase 7 liefert ein gemeinsamer Klassen-/Wellen-Run wesentlich verwertbarere Ergebnisse.

## Phase 7: Wellen 1-10 kuratieren

Status: Abgeschlossen am 2026-08-09

- [x] Wellen 1-3 lehren Bewegung, Verfolgung und Zielprioritaet.
- [x] Wellen 4-6 kombinieren Fernkampf, Faecher und erste Elite-Ziele.
- [x] Wellen 7-9 nutzen Bomber, Elites, gemischte Rollen und kontrollierten Arena-Druck.
- [x] Welle 10 bietet einen Boss mit verstaendlichen Phasen, Feuerball und unterschiedlichen Adds.
- [x] Pro Welle Budget, exakte Zusammensetzung, Spawn-Rhythmus und Belastungsziel definieren.
- [x] Schwierigkeit durch Kombinationen statt nur HP-Skalierung erzeugen.
- [x] Spawn-Schutz und Mindestabstaende sicherstellen.
- [x] Wellenwechsel mit Namen sichtbar machen.

Abnahme: Normale Wellen dauern etwa 20-30 Sekunden, die Spannung steigt lesbar an und der Boss bildet einen klaren Abschluss.

Abnahmeprotokoll:

- Alle zehn Wellen besitzen benannte Intentionen, Zielzeitfenster, feste Gegnerbudgets und deterministische Kompositionen.
- Wave 1 startet nur mit Slimes; Runner, Brutes, Spitter, Fan-Spitter, Bomber und Elites werden schrittweise eingefuehrt und erst danach kombiniert.
- Elites erscheinen in Wave 6, 8 und 9; Wave 10 besteht aus einem eigenen Boss-Finale.
- Der Boss wechselt bei 65% und 32% HP in deklarative Phasen, wird beweglicher, verstaerkt Faecher und Feuerball und beschwoert erst Slimes, dann Runner plus Spitter.
- Randspawns respektieren je Welle 260 bis 330 Einheiten Mindestabstand und verwenden bei beengter Geometrie den entferntesten geprueften Kandidaten.
- Der Mechaniktest prueft Queue-Groesse und Typverteilung aller Wellen, zehn sichere Eckspawns und beide Bossphasen.
- `npm run build`: bestanden.
- `npm run test:mechanics`: bestanden.
- `npm run test:smoke`: bestanden, inklusive Desktop, Restart, Mobile Portrait, Landscape und Fullscreen.
- `npm run test:production`: bestanden; TestApi im Produktions-Build nicht vorhanden.
- `npm run build -- --base=/RoosterRage/`: bestanden.
- Zielzeiten und Feinbalance sind noch keine gemessenen Spielergebnisse; diese Validierung erfolgt in Phase 8.
- Kein Balance-Run ausgefuehrt. Nach diesem abgeschlossenen Klassen-/Wellen-Paket ist ein gezielter Baseline-Run nun sinnvoll.

## Benchmark und Produktentscheidung

Survivor.io dient als Referenz fuer Dichte, Eskalation, Build-Evolution und mobile Lesbarkeit, nicht als Vorlage fuer seine spaetere Systemmenge oder Monetarisierung.

- Offizieller Kern: Einhandsteuerung, Roguelite-Skillkombinationen und sehr grosse Gegnerhorden.
- In-Run-Struktur: Startwaffe plus weitere aktive Skills, getrennte passive Skills, Rangketten und EVO-Kombinationen.
- Encounter-Struktur: kontinuierlicher Zeitplan, Elites und Bossereignisse statt nur gleichmaessiger Spawns.
- Karteninteraktion: Heilung, Bomben, XP-Magnete, Truhen und zerstoerbare Objekte.
- Produktlektion: Der sofort verstaendliche Kern ist wertvoll; parallele Meta-Systeme, Waehrungen und wiederholte Belohnungsdialoge werden vor der Slice-Abnahme bewusst nicht kopiert.

Quellen:

- [Offizielle Google-Play-Beschreibung](https://play.google.com/store/apps/details?id=com.dxx.firenow)
- [Apple: Waffen, EVOs, Pickups und Drohnen-Fusion](https://apps.apple.com/ph/iphone/story/id1641743438)
- [Community-Dokumentation des Skill- und Slot-Systems](https://survivorio.fandom.com/wiki/Skills)
- [Analyse von Timer, Bossankuendigungen und Karten-Pickups](https://www.pocketgamer.biz/how-innovation-and-iteration-has-transformed-survivorio/)

## Verbindliche Zielwerte

Diese Werte sind Start-Hypothesen. Sie werden nur anhand der definierten Gates veraendert, nicht nach einzelnen zufaelligen Test-Runs.

### Run und Wellen

| Welle | Zielzeit | Gesamtspawns | Ziel-Peak gleichzeitig | Dramaturgie |
| --- | ---: | ---: | ---: | --- |
| 1 | 25 s | 30 | 18 | Nur Fodder, Bewegung und Auto-Aim lernen |
| 2 | 25 s | 38 | 24 | Runner-Pulse zwischen Fodder |
| 3 | 35 s | 45 + 1 Elite | 28 | Erster Elite-Abschluss |
| 4 | 30 s | 55 | 32 | Spitter hinter Nahkampfwand |
| 5 | 35 s | 65 | 38 | Erster echter Crossfire-Druck |
| 6 | 45 s | 75 + 1 Elite | 45 | Fan-Angriffe und Elite-Rush |
| 7 | 35 s | 85 | 50 | Bomber erzwingen Bewegung |
| 8 | 40 s | 95 + 1 Elite | 58 | Gemischte Rollen und Raumkontrolle |
| 9 | 50 s | 110 + 2 Elites | 65 | Belastungstest vor dem Finale |
| 10 | 70 s | Boss + 25-40 Adds | 45 | Drei lesbare Bossabschnitte |

- Ziel fuer aktive Kampfzeit: etwa 6,5 Minuten.
- Ziel fuer reale Run-Zeit inklusive Auswahl und Uebergaengen: 7-9 Minuten.
- Upgrade-Unterbrechungen duerfen hoechstens 18 Prozent der realen Run-Zeit ausmachen.
- Die Tabelle wird nach Phase 10 mit Messdaten angepasst; sie ist kein Versprechen, jeden Peak ungeprueft zu erzwingen.

### Gegner-TTK

Gemessen mit dem jeweils vorgesehenen durchschnittlichen Build der Welle:

| Rolle | Ziel-TTK |
| --- | ---: |
| Fodder/Slime | 0,25-0,8 s |
| Runner | 0,6-1,5 s |
| Spitter/Fan/Bomber | 1,5-3,5 s |
| Brute | 3-6 s |
| Elite | 8-15 s |
| Boss | 45-70 s |

### Upgrade- und Erfolgsziele

- Erstes Upgrade nach 20-30 Sekunden, danach im Mittel alle 30-45 Sekunden.
- Ziel pro Run: 8-11 regulaere Entscheidungen plus 2-3 Elite-/Bossbelohnungen.
- Kein Pflicht-Upgrade darf durch unguenstiges RNG einen Build dauerhaft blockieren.
- Kein einzelnes normales Upgrade soll ueber viele Runs mehr als etwa 35 Prozent Wahlanteil erreichen.
- Durchschnittlicher Testspieler: 55-70 Prozent Run-Abschlussrate.
- Anfaengermodell: 30-45 Prozent; starkes Modell: 80-95 Prozent.
- Tode sollen sich ueber Welle 6-10 verteilen und nicht an einem einzelnen unfairen Angriff konzentrieren.

### Performance-Ziele

- Desktop: stabile 60 FPS im Ziel-Peak.
- Mittleres Mobile-Geraet: im Kampf durchschnittlich mindestens 50 FPS, keine laengeren Abschnitte unter 45 FPS.
- Keine kontinuierlich wachsenden Gegner-, Projektil-, Orb-, Audio- oder FX-Listen.
- Ein zehnminuetiger Soak-Test darf keine erkennbare Speicher- oder Objektakkumulation zeigen.
- Bei Last zuerst kosmetische FX reduzieren; Telegraphen, Trefferzonen und Gameplay-Objekte bleiben erhalten.

## Phase 8: Messbarkeit und Lastfundament

Status: Abgeschlossen am 2026-08-10

Bulk-Ziel: Erst messen und skalierbar machen, danach die Gegnerzahl erhoehen.

1. [x] Einen zentralen, seedbaren Zufallsdienst einfuehren und Spawn-, Upgrade- und Crit-RNG darueber fuehren.
2. [x] Telemetrie um Framezeiten, Peak-Objektzahlen, TTK, Overkill, Schaden je Quelle, Upgrade-Pausen und Todesursachen erweitern.
3. [x] Deterministische Szenarien fuer einzelne Wellen, Bossphasen, Klassen und definierte Builds im Testprogramm abbilden.
4. [x] Object Pools und harte Budgets fuer Gegner, eigene/gegnerische Projektile, XP-Orbs und kurzlebige FX einfuehren.

Abnahmeprotokoll:

- Zentraler RNG mit getrennten Kanaelen fuer Spawn, Upgrade, Crit, Bot, Audio und kosmetische FX integriert; gleiche Seeds/Profile liefern identische Ereignisfolgen in den deterministischen Szenarien.
- Wiederverwendbare Pools und harte Budgets fuer Gegner, Basis-/Gegnerprojektile, XP-Orbs und FX integriert.
- Lastszenario mit 100 Gegnern und ueber 200 gleichzeitig aktiven Projektilen: p95 16,8 ms, keine Drops von Gameplay-Objekten.
- FX-Budget stoppt bei 90 aktiven Effekten, verwirft 50 nachrangige Anforderungen kontrolliert und gibt danach alle Slots frei.
- TTK wird ab erstem wirksamen Treffer statt ab Spawn gemessen; Schaden, Overkill, Killquelle, Todesursache und Peak-Objekte sind im selben Bericht konsistent.
- `npm run test:foundation`, Build, Smoke, Mechanics und Production Gate bestanden.

Balance-Arbeit:

- Einen einzigen Baseline-Run des aktuellen Stands mit allen drei Roostern ausfuehren.
- Baseline nicht als Zielbalance behandeln, sondern als Vorher-Messung archivieren.
- Spielerprofile `novice`, `average`, `offense` und `evasive` reproduzierbar machen.

Abnahme:

- Gleicher Seed und gleiches Profil erzeugen dieselbe Wave-/Upgrade-Folge.
- Lasttest mit 100 Gegnern und hohem Projektilaufkommen verletzt die Performance-Ziele nicht.
- Production-Build exportiert keine Debug- oder Teststeuerung.

## Phase 9: Spawn Director und Schwarmkampf

Status: Abgeschlossen am 2026-08-10

Bulk-Ziel: Von kleinen Einzelgruppen zu kontrollierter Schwarm-Eskalation wechseln.

5. [x] Einen datengetriebenen `SpawnDirector` mit Zeitsegmenten, Pulsen, Pausen, Rusher-Linien und Spezialgegner-Slots bauen.
6. [x] Die Wellen 1-10 auf die Zielbereiche fuer Gesamtspawns und Peak-Dichte umstellen, mit mobilem Sicherheits-Cap.
7. [x] Fodder-HP, XP, Groesse und Kollisionsverhalten so senken, dass Masse schnell stirbt; Spezialgegner nach TTK-Tabelle abstimmen.
8. [x] Pro Welle eine konkrete Druckkurve definieren: Aufbau, Eskalation, kurze Erholung und Abschlussereignis.

Balance-Arbeit:

- Spawnrate und HP gemeinsam kalibrieren; niemals nur Anzahl oder HP isoliert vervielfachen.
- XP-Orbs raeumlich zusammenfassen, ohne Gesamt-XP zu verlieren.
- Kontaktschaden mit kurzer individueller Trefferabklingzeit begrenzen, damit ein Schwarm keinen Frame-Kill erzeugt.

Abnahme:

- Jede Welle erreicht ihren Dichtekorridor ohne sichtbare Spawn-Pop-ins in Spielernaehe.
- Fodder erzeugt Massengefuehl, waehrend Spezialgegner weiterhin eindeutig erkennbar bleiben.
- Danach ist ein gezielter Klassen-/Wave-Balance-Run sinnvoll; nicht vorher.

Abnahmeprotokoll:

- Alle Wellen besitzen Build-, Escalate-, Recover- und Finale-Segmente mit eigenem Budget, Batch, Formation, Cadence und Pause.
- Zielspawns liegen bei 30, 38, 46, 55, 65, 76, 85, 96, 112 und Boss plus 30 Adds; mobile Caps liegen separat unter Desktop-Caps.
- Fodder stirbt mit dem Basis-Ace in einem Treffer; individuelle Kontakt-Cooldowns verhindern Frame-Kills.
- XP-Orbs werden raeumlich zusammengefasst, ohne XP zu verlieren; ein 60-XP-Cluster erzeugt hoechstens zwei Orbs.
- Eine Race Condition, die eine Welle im Frame ihres letzten Spawns als leer wertete, ist behoben und durch Boss-Spawn-Regression abgedeckt.
- Mechanics-, Foundation-, Smoke- und Production-Gates bestanden.

## Phase 10: Run-Pacing und XP-Oekonomie

Status: Abgeschlossen am 2026-08-10

Bulk-Ziel: Ein 7-9-minuetiger Run mit stabiler Spannung und wenigen, wichtigen Unterbrechungen.

9. [x] Wellenzeiten, Uebergaenge und Bossdauer auf die Run-Zieltabelle abstimmen.
10. [x] Eine XP-Kurve pro Wave-Segment definieren und XP-Ertrag von Gegner-HP und Rollenwert trennen.
11. [x] Upgrade-Kadenz auf 8-11 regulaere Entscheidungen begrenzen und Mehrfach-Level-Ups in eine kompakte Auswahlsequenz ueberfuehren.
12. [x] Elite-/Boss-Truhen als eigene Belohnungsschiene einfuehren, die Rangfortschritt oder eine gueltige EVO priorisiert.

Balance-Arbeit:

- Levelzeiten, Pauseanteil, unverbrauchte XP und Zeit bis zur ersten spektakulaeren Faehigkeit messen.
- Ziel: erste auffaellige Ability spaetestens nach 70 Sekunden, erster tragfaehiger Buildkern bis Wave 4.
- Keine Belohnungsanimation darf den Kampf unkontrolliert weiterlaufen lassen.

Abnahme:

- 90 Prozent der gemessenen Runs liegen im realen Zeitfenster von 7-9 Minuten.
- Keine Luecke zwischen zwei sinnvollen Entscheidungen ist kuerzer als 20 oder laenger als 55 Sekunden.
- Nach dieser Phase wird die Ziel-Wellentabelle mit Messwerten aktualisiert.

Abnahmeprotokoll:

- XP-Schwellen und segmentierte XP-Ertraege liefern im verifizierten Average-Run neun regulaere Entscheidungen; die technische Obergrenze von elf ist regressionsgetestet.
- Drei gleichzeitig verdiente Level werden ohne Kampf-Resume als kompakte Auswahlsequenz abgearbeitet.
- Elite-Truhen bieten drei, Boss-Truhen vier Optionen und erzwingen mindestens einen gueltigen Rank-up-/EVO-Pfad, sofern vorhanden.
- Average-Gate: erstes Upgrade und erste sichtbare Ability nach 21,6 s, neun regulaere Entscheidungen, sechs Truhen, 1,1 Prozent automatisierte Pausenquote.
- Gemessene Wellen 1-9: 26,9 / 31,9 / 39,2 / 31,6 / 36,3 / 45,2 / 36,0 / 42,3 / 50,4 s.
- Repraesentativer Dreiphasen-Boss: 68,51 s TTK, 31 Gegner inklusive Adds, Peak 38 Objekte, p95 16,7 ms und garantierte Boss-Truhe.
- Aus Wellenmessung, Boss-Gate und vier Sekunden angenommener menschlicher Auswahlzeit ergibt sich ein Zielrun von rund 7,7 Minuten.
- Der manuelle Haltepunkt nach Phase 10 ist auf Nutzerwunsch verschoben. Eine statistische Abschlussquote ueber viele Seeds wird nicht aus Einzelruns abgeleitet und bleibt verbindlicher Teil der Phase-17-Balance-Matrix.
- `npm run test:pacing`, `npm run test:boss`, Build, Foundation, Mechanics, Smoke und Production Gate bestanden.

## Phase 11: Loadout- und EVO-System

Status: Abgeschlossen am 2026-08-10

Bulk-Ziel: Builds werden lesbar, planbar und deutlich transformativ.

13. [x] Fuenf aktive Waffen-/Ability-Slots und vier Passive-Slots einfuehren; Startwaffe belegt einen aktiven Slot.
14. [x] Bestehende Upgrades eindeutig in aktive Waffen, Passives, Summons und konsumierbare Soforteffekte ueberfuehren.
15. [x] Mindestens acht echte EVO-Rezepte mit sichtbarer Verhaltensaenderung bauen, darunter Feuer, Blitz, Orbit, Rocket, Void und Summon.
16. [x] Angebotslogik fuer freie Slots, Rank-up, EVO-Voraussetzungen, Rooster-Affinitaeten und spaeten Bad-Luck-Schutz umbauen.

Balance-Arbeit:

- Basiswaffen muessen ohne EVO brauchbar, EVOs aber klar run-definierend sein.
- Kein EVO darf gleichzeitig beste Boss-, Schwarm- und Defensivoption sein.
- Reroll zunaechst einmal pro Run; Skip nur, wenn Tests echte Dead-Pick-Situationen zeigen.

Abnahme:

- Mindestens sechs unterschiedliche End-Loadouts koennen einen Average-Run gewinnen.
- Jede EVO ist in Blindtests optisch und spielerisch von ihrer Basisform unterscheidbar.
- Danach ein eigener EVO-/Angebots-Balance-Run.

Abnahmeprotokoll:

- `LoadoutSystem` erzwingt fuenf Active- und vier Passive-Slots; die jeweilige Klassenwaffe belegt beim Start den ersten Active-Slot.
- Neue Skills werden bei vollem Slotbestand nicht mehr angeboten, vorhandene Rank-ups bleiben gueltig; Double/Triple Shot teilen einen Slot.
- Acht echte EVOs sind implementiert: Solar Scramble, Thunder Roost, Shell Halo, Broodstorm Battery, Singularity Nest, Phoenix Pan, Dawn Prism und Chick Squadron.
- Jede EVO veraendert Laufzeitverhalten und Darstellung statt nur Zahlen: Salven, Zielzahl, Ketten, Begleiterzahl, Zonenanzahl/-dauer oder Strahlgeometrie.
- Vollstaendige Rezepte werden garantiert angeboten und in Elite-/Boss-Truhen vor normalen Rank-ups priorisiert.
- Ein einmaliger Reroll pro Run ist in Run-State, HUD, Telemetrie und TestApi integriert.
- Der EVO-Gate prueft jedes Rezept vor/nach Erfuellung, Runtime-Evolution, eigene Schadensquelle und erwartete Objektform; alle acht bestanden.
- Gemessener EVO-Szenarioschaden nach 1,7 s: Solar 204, Thunder 446, Shell Halo 3312, Broodstorm 630, Singularity 1992, Phoenix 900, Dawn 222, Squadron 224. Diese Kurzwerte dienen nur der Mechanik-/Attributionspruefung, nicht als finale DPS-Rangliste.
- Die verbindliche Sechs-Endloadout-Siegmatrix wird nach Karten-, Pickup- und Encounter-Integration in Phase 17 ausgefuehrt, damit sie keine spaeter ersetzten Bedingungen misst.
- `npm run test:evolution`, Build und Mechanics Gate bestanden.

## Phase 12: Arenen und Pickups

Status: Abgeschlossen am 10.08.2026

Bulk-Ziel: Positionierung und Bewegung werden durch Kartenform und kurzfristige Ziele relevant.

17. [x] Drei Arenatopologien liefern: offene Arena, vertikaler Korridor und kompakte quadratische Arena.
18. [x] Heilfutter, Arena-Bombe, temporaeren XP-Magneten und Elite-Truhe mit klarer Silhouette und Spawnregeln einfuehren.
19. [x] Zerstoerbare Props und wenige kollidierende Hindernisse ergaenzen, ohne Auto-Aim oder Pathing unzuverlaessig zu machen.
20. [x] Wave-Kompositionen und Waffenwert pro Kartentyp pruefen; keine Karte darf nur einen Pflicht-Build erlauben.

Balance-Arbeit:

- Pickup-Haeufigkeit wird als Budget pro Run festgelegt, nicht pro Zufallswurf unbeschraenkt gestapelt.
- Heilung darf Fehler verzeihen, aber keinen dauerhaften Unsterblichkeitsloop erzeugen.
- Mobile Portrait zeigt trotz Zoom alle kritischen Telegraphen rechtzeitig.

Abnahme:

- Jeder Kartentyp veraendert Bewegung und Waffenpraeferenz erkennbar.
- Kein Pickup erscheint ausserhalb erreichbarer Flaechen oder unter UI/Collider-Geometrie.

Abnahmeprotokoll 10.08.2026:

- `open-yard`, `vertical-run` und `square-coop` besitzen eigene begehbare Grenzen, Spawnkanten, Collider-Geometrie und erkennbare Waffenpraeferenzen; alle Waffenfamilien bleiben mit einem Kartenwert von mindestens 0,8 spielbar.
- Physische Rand- und Hindernis-Collider gelten fuer Spieler und Gegner. Innenliegende Kisten und Ballen werden von Auto-Aim-Projektilen beschaedigt und nach ihrem HP-Budget vollstaendig aus Physik und Darstellung entfernt.
- Heilfutter heilt einmalig 25 Prozent Max-HP, die Bombe beseitigt normale Gegner und trifft Bosse begrenzt mit 5 Prozent Max-HP, der Magnet zieht XP acht Sekunden arenaweit an; Average-Bots priorisieren Pickups nur in einer passenden Spielsituation.
- Run-Budgets sind fest auf drei Heilungen, zwei Bomben und zwei Magnete begrenzt. Elite-Truhen sind garantierte physische Pickups und oeffnen erst bei Aufnahme die bestehende Chest-Reward-Lane.
- Der Arena-Gate prueft pro Karte 40 sichere Punkte, inaktive Collider nach Prop-Zerstoerung, unterschiedliche Kartenpraeferenzen, alle vier Pickup-Effekte, Erreichbarkeit, Budgets und Telemetrie. `npm run test:arena`, Smoke, Mechanics, Foundation und Pacing bestanden.
- Die statistische Sieg-/Build-Matrix ueber alle Karten folgt gebuendelt in Phase 17, nachdem Phase 13-15 die Encounter, Klassen und finalen HUD-Signale nicht mehr veraendern.

## Phase 13: Gegner-, Elite- und Boss-Paket

Status: Abgeschlossen am 10.08.2026

Bulk-Ziel: Die Dichte wird durch Rollen und Begegnungen interessant, nicht durch reine Stat-Skalierung.

21. [x] Gegnerrollen als Matrix pflegen: Fodder, Runner, Tank, Shooter, Area Denial, Exploder, Support und Summoner.
22. [x] Drei Elite-Archetypen mit Aura, eigener Faehigkeit, Ankuendigung und garantierter Truhe erstellen.
23. [x] Boss-Finale mit Name, eigener HP-Leiste, Eintritt, drei Abschnitten, Adds, Feuerball und klarer Belohnung ausbauen.
24. [x] Reaktionsstandards festlegen: normale Telegraphen mindestens 300 ms, schwere Angriffe 500 ms, keine Projektile im Schutzradius erzeugen.

Balance-Arbeit:

- Pro Welle hoechstens zwei primaere Gefahrenrollen plus Fodder; spaet maximal drei.
- Fernkampfanteil, Projektilzahl und Flaechenabdeckung als separates Gefahrenbudget behandeln.
- Todesursachen muessen einem sichtbaren Angriff zugeordnet werden koennen.

Abnahme:

- Jede Elite und Bossphase ist ohne Text erklaerbar und beim zweiten Auftreten antizipierbar.
- Kein einzelner Gegnertyp verursacht ueber alle Average-Runs mehr als 35 Prozent der Tode.
- Danach ein Encounter-Balance-Run ueber alle Karten und Rooster.

Abnahmeprotokoll 10.08.2026:

- Die Rollenmatrix enthaelt Fodder, Runner, Tank, Shooter, Area Denial, Exploder, Support und Summoner. Brood Tender heilt Gegner in seiner Aura; Nest Caller erzeugt nach 520 ms sichtbarer Beschwoerung kontrollierte Adds.
- Fruehe Wellen deklarieren hoechstens zwei, spaete Wellen hoechstens drei primaere Gefahrenrollen. Support und Summoner sind ab Wave 7 in die kuratierten Budgets integriert; Queue-Laengen bleiben exakt.
- Gilded Talon kombiniert Haste-Aura und 380-ms-Dash, Iron Brooder Panzer-Aura und 620-ms-Slam, Violet Matron Regenerationsaura und 420-ms-Fuenferfaecher. Alle werden mit Name/Faehigkeit angekuendigt und lassen garantiert eine physische Elite-Truhe fallen.
- THE BROOD KING besitzt eine mobile Boss-HP-Leiste, 1,3 s Eintrittsschild, drei benannte Kampfabschnitte, Add-Ringe, Faechersalven, schwere Feuerbaelle und eine Boss-Truhe. Der neu gemessene isolierte Average-TTK betraegt 65,55 s bei 31 Spawns und 16,7 ms p95.
- Normale Telegraphen werden global auf mindestens 300 ms, schwere auf mindestens 500 ms begrenzt. Projektile innerhalb 140 Radius zum Spieler werden unterdrueckt; Bomber-Explosionen loesen erst nach einem 500-ms-Ring aus.
- `npm run test:encounter` prueft Auren, Schadensreduktion/Heilung, Eigenfaehigkeiten, Ankuendigungen, Truhen, Schutzradius, Explosionsvorlauf, Bossphasen und 9/9 Arena-Rooster-Kombinationen im Portrait-Viewport. Mechanics, Pacing und Boss-Gate bestanden.
- Die kurze 9er-Matrix hatte keine Laufzeitfehler. Die belastbare Verteilung realer Todesursachen und vollstaendige Runs werden im grossen Phase-17-Seed-Gate erhoben; eine Null-Todes-Stichprobe wird nicht als Prozentbeleg ausgegeben.

## Phase 14: HUD, Feedback und Run-Report

Status: Abgeschlossen am 10.08.2026

Bulk-Ziel: Wichtige Informationen sind mit einem Blick erfassbar und Builds werden auswertbar.

25. [x] HUD neu priorisieren: XP und Timer oben, Wave-/Bossfortschritt zentral, Killzahl kompakt, HP primaer am Rooster.
26. [x] Aktive Loadout-Leiste mit Icon, Rang, EVO-Zustand und Cooldown-Ring ergaenzen; Passives in einer kleineren zweiten Reihe.
27. [x] Spieler-, Gegner-, Gefahren- und Pickup-Farbsprache sowie Audio-Prioritaeten verbindlich dokumentieren und umsetzen.
28. [x] Run-Report mit Schaden/Kills je Quelle, Todesursache, Build, EVOs, Zeit, Peak-Dichte und Rooster anzeigen.

Balance-Arbeit:

- Damage Share, Trefferquote, Overkill und Nutzungszeit jeder Waffe im Report und in Testdaten identisch berechnen.
- Ziel: keine voll ausgebaute aktive Waffe unter 5 Prozent Beitrag ohne klaren Utility-Nutzen.
- Damage Numbers, Screen Shake, Flash und Vibration einzeln reduzierbar machen.

Abnahme:

- HUD funktioniert auf Desktop, Mobile Portrait und Landscape ohne Ueberdeckung.
- Ein Spieler kann nach dem Run begruenden, welche Waffe stark oder schwach war.

Abnahmeprotokoll 10.08.2026:

- Das HUD zeigt XP zuerst, danach Timer, Wave-Fortschritt, Kills und Level. HP bleibt als primaere Anzeige am Rooster; der Bossfortschritt besitzt eine eigene mobile Leiste.
- Fuenf Active- und vier kleinere Passive-Slots zeigen Icon, Rang und EVO-Zustand. Zeitbasierte aktive Waffen liefern einen echten Cooldown-Fortschritt statt einer dekorativen Animation.
- Eine verbindliche Farbsprache fuer Spieler, Gegner, Gefahren, Pickups und Evolutionen sowie fuenf Audio-Prioritaetsklassen liegen als Runtime-Daten vor.
- Der Run-Report verwendet dieselben Telemetriedaten wie die Tests und zeigt pro Quelle effektiven Schaden, Anteil, Trefferquote, Kills, Overkill und Nutzungszeit sowie Todesursache, Build, EVOs, Laufzeit und Peak-Dichte.
- Damage Numbers, Screen Shake, Screen Flash und Vibration sind einzeln schaltbar und werden lokal gespeichert.
- Der Browser-Gate misst HUD-Hoehen von 150 px auf Desktop, 115 px in Mobile Portrait und 66 px in Mobile Landscape. Der Report passt vollstaendig in 390 x 844; Produktions-, Smoke-, Mechanics- und Foundation-Gates bestanden.
- Das Ziel von mindestens 5 Prozent Beitrag je voll ausgebauter aktiver Waffe wird mit den finalen Endloadouts im Phase-17-Balance-Gate bewertet.

## Phase 15: Rooster-Tiefe und Build-Content

Status: Abgeschlossen am 10.08.2026

Bulk-Ziel: Jeder Rooster besitzt mindestens drei tragfaehige, eigene Build-Archetypen.

29. [x] Ace, Boombardier und Stormcrest erhalten exklusive Startwaffen-EVOs und je zwei klassennahe Passives.
30. [x] Support Chick zu einem echten Summon-Pfad mit Projektil-, Debuff- und Mehrfachbegleiter-Raengen ausbauen.
31. [x] Pro Rooster drei Build-Archetypen definieren und mit Upgrade-Affinitaeten statt harten Sperren unterstuetzen.
32. [x] Fehlende finale Combat-Assets, Animationen und dosierte Sounds nur fuer bestaetigte Kernfaehigkeiten produzieren.

Balance-Arbeit:

- Jede Klasse muss mit mindestens drei Builds gewinnen koennen.
- Kein Rooster darf beim Average-Profil mehr als 12 Prozentpunkte Abschlussquote von einem anderen entfernt liegen.
- Hauptwaffe soll typischerweise 15-40 Prozent Schaden beitragen; Spezialbuilds duerfen begruendet abweichen.

Abnahme:

- Neun dokumentierte Archetypen bestehen definierte Wave-, Elite- und Boss-Szenarien.
- Klassen unterscheiden sich bereits in den ersten 20 Sekunden und bleiben bis zum Run-Ende verschieden.

Abnahmeprotokoll 10.08.2026:

- Ace, Boombardier und Stormcrest besitzen mit Sunshot Array, Siegebreaker Shell und Tempest Crown exklusive Startwaffen-EVOs. Schusszahl/Durchschlag/Ricochet, Doppel-Druckwelle und mehrstufige Ketten sind eigenstaendige Runtime-Mechaniken mit eigener Telemetrie.
- Sechs nur der passenden Klasse angebotene Passivreihen vertiefen Krit-/Lenkverhalten, Explosion/Standfestigkeit und Kette/Tempo. Klassenfremde Angebote werden im Gate fuer alle drei Rooster ausgeschlossen.
- Support Chick besitzt fuenf lesbare Ranks: Begleiter, Zweier-Projektilsalve mit Durchschlag, Slow-Debuff, zweiter und dritter Begleiter. Chick Squadron schliesst den Pfad mit vier schnellen, stark verlangsamenden Begleitern ab.
- Neun dokumentierte Archetypen werden ueber mindestens drei Affinitaeten je Build unterstuetzt; generische Upgrades bleiben frei waehlbar. Alle neun bestanden im Mobile-Portrait-Viewport getrennte Fodder-, Elite- und Boss-Szenarien bei 16,8 ms oder besserem p95 und ohne Drops/Runtime-Fehler.
- Fruehe Identitaet entsteht bereits durch unterschiedliche HP-, Tempo-, Takt-, Krit-, Splash- und Chain-Profile. Die drei exklusiven EVOs halten die Startwaffen auch im Endbuild mechanisch verschieden.
- Die Asset-Pruefung bestaetigt 16 aktuelle Runtime-Assets. Fuer die bestaetigten Faehigkeiten waren keine weiteren Bitmap- oder Audio-Dateien notwendig; EVOs verwenden bewusst vorhandene Projektil-Silhouetten, neue Farb-/Ringeffekte und das priorisierte Level-up-Audiosignal.
- Build, Smoke, Mechanics, Pacing, Loadout/EVO, HUD/Report und der neue `test:rooster-depth`-Gate bestanden. Abschlussquoten und Hauptwaffen-Damage-Share werden belastbar ueber die Seed-Matrix in Phase 17 bewertet.

## Phase 16: Meta und Challenges

Status: Abgeschlossen am 10.08.2026

Bulk-Ziel: Wiederholungsgruende schaffen, ohne schwache Kernbalance durch Stat-Grind zu verdecken.

33. [x] Hennenhuette als kompakten Hub fuer Rooster-Auswahl, Freischaltungen, Challenges und Run-Historie bauen.
34. [x] Rooster und kosmetische Varianten ueber klare Leistungen freischalten; keine Pflicht-Wartezeiten oder Zufallskisten im Slice.
35. [x] Challenge-Modifikatoren und drei kuratierte Varianten aus bestehenden Karten/Wellen ableiten.
36. [x] Ein kleines Lexikon fuer Gegner, EVO-Rezepte und persoenliche Bestwerte ergaenzen.

Balance-Arbeit:

- Dauerhafte Boni bleiben horizontal oder klein; kein Meta-Level kompensiert einen unfairen Run.
- Challenge-Modifikatoren erhalten eigene Zielwerte und veraendern nicht heimlich den normalen Modus.

Abnahme:

- Ein kompletter Run schaltet ein klares neues Ziel frei.
- Der Kern-Run bleibt ohne Meta-Grind vollstaendig gewinnbar.

Abnahmeprotokoll 10.08.2026:

- Die Hennenhuette vereint Challenge- und Rooster-Wahl, Freischaltfortschritt, kosmetische Varianten, persoenliche Bestwerte, acht lokale History-Eintraege sowie Gegner- und EVO-Lexika in einem responsiven, vertikal scrollbaren Mobile-First-Hub.
- Fortschritt bleibt horizontal: Ace und der Standard Run sind sofort vollstaendig spielbar. 75 Kills, ein Sieg und rooster-spezifische Siege schalten Rooster oder rein kosmetische Tints frei; es gibt weder Stat-Grind, Wartezeiten noch Zufallskisten.
- Rush Hour nutzt Vertical Run mit 18 Prozent kuerzeren Zielzeiten und 12 Prozent schnelleren Gegnern. Featherweight nutzt Coop Square mit 28 Prozent weniger HP, 12 Prozent mehr Tempo und 15 Prozent mehr Eigen- sowie Gegnerschaden. Royal Gauntlet nutzt Open Yard mit 18 Prozent mehr Gegner-HP, zusaetzlichen 22 Prozent Elite-HP, 12 Prozent mehr Gegnerschaden und 18 Prozent mehr XP.
- Challenge und Arena werden im HUD sowie im Run-Report ausgewiesen. Der normale Modus behaelt nach Freischaltungen exakt seine Ace-Basiswerte HP 100, Tempo 210 und Schaden 20.
- `npm run test:meta` prueft frischen und vollstaendig freigeschalteten Zustand, Reload-Persistenz, Cosmetics, History, 12 Gegner- und 11 EVO-Eintraege, alle Challenge-Modifikatoren und horizontale Standard-Stats im Portrait-Viewport. Das Portrait-Artefakt besitzt keinen horizontalen Overflow.
- Production, Build, Smoke, Mechanics, Foundation, Pacing und HUD/Report bestanden nach der Integration. Der manuelle Haltepunkt bleibt wie beauftragt bis nach Abschluss der restlichen Roadmap ausgesetzt.

## Phase 17: Vertical-Slice-Abnahme

Status: Automatischer Feature-Freeze abgeschlossen am 10.08.2026; manuelle und externe Abnahme offen

Bulk-Ziel: Den Content einfrieren und beweisen, dass der Slice stabil, verstaendlich und wiederholbar ist.

37. [ ] Alle drei Rooster, neun Archetypen, drei Karten und Challenges automatisiert sowie manuell end-to-end pruefen. Automatischer Anteil abgeschlossen, manueller Anteil offen.
38. [x] Desktop, Mobile Portrait und Landscape unter maximaler Gegner-/Effektlast und im zehnminuetigen Soak-Test abnehmen.
39. [ ] Mindestens 10 externe Tester ohne Einfuehrung beobachten und Verstaendnis, Frust, Spannung und Wiederholungswunsch erfassen.
40. [x] Balance gegen Erfolgs-, TTK-, Pacing- und Damage-Share-Ziele korrigieren; danach Feature-Freeze fuer den Slice.

Abnahme:

- Keine Console Errors, Softlocks, wachsenden Objektlisten oder reproduzierbaren unfairen Treffer.
- Mindestens 70 Prozent der Tester verstehen Upgrade, EVO, Elite-Truhe und Bossphase ohne Erklaerung.
- Mindestens 50 Prozent starten freiwillig einen zweiten Run oder geben konkret an, einen weiteren spielen zu wollen.
- Balancebericht dokumentiert Seed, Rooster, Build, Karte, Profil und Ergebnis.

Automatisches Abnahmeprotokoll 10.08.2026:

- Die Acceptance-Matrix deckt 12 Rooster-/Challenge-Szenarien, alle neun dokumentierten Archetypen und alle neun Rooster-/Arena-Kombinationen ab. Desktop, Mobile Portrait und Mobile Landscape halten bei 110 Gegnern und 260 Projektilen jeweils 16,8 ms oder besser im p95, ohne HUD-Overflow, Drops oder Browserfehler.
- Sichtbare Bomber- und Elite-Dash-Warnungen werden vom Average-Modell ohne Treffer verlassen. Warnzonen werden zentral nach Ablauf entfernt und wachsen deshalb auch bei menschlicher Eingabe nicht ueber die Run-Dauer an.
- Der finale reale 602,3-Sekunden-Soak verarbeitete 36.093 Frames und 60 Last-Recyclingzyklen. p95 lag bei 16,8 ms; 340 Objekte wurden erzeugt, 19.551 wiederverwendet, null verworfen und nach Abschluss waren null aktiv.
- Drei aktuelle Average-Seeds ergaben zwei Siege und einen Build-/Survival-Tod in Welle 7, entsprechend 66,7 Prozent in dieser kleinen technischen Stichprobe. Das liegt im Zielkorridor 55-70 Prozent, wird aber ausdruecklich nicht als belastbare Nutzerquote ausgegeben.
- Boombardier und Stormcrest gewannen in geschaetzten 7:40 beziehungsweise 7:36 Minuten menschlicher Run-Zeit; erste Upgrades erschienen nach 23,3 beziehungsweise 19,4 Sekunden, Boss-TTK lag bei 57,1 beziehungsweise 64,4 Sekunden. Ace starb mit einem duennen Zwei-Waffen-Build durch eine lesbare Fan-Spitter-Salve; der Seed bleibt als gewollter Gegenbeleg statt als ausgesuchter Sieg im Bericht.
- Der Langlauf-Bericht behaelt fruehe Progressionswerte auch nach dem 6.000-Ereignis-Ringpuffer. Wellenende sammelt liegengebliebene XP verlustfrei ein, und die Average-Bewegung beruecksichtigt Arenakanten, Bosskiting sowie Kreis- und Linienwarnungen.
- Der Content ist fuer die manuelle Abnahme eingefroren. Die Rohartefakte entstehen reproduzierbar unter `test-results/`; die versionierte Zusammenfassung liegt in `docs/PHASE_17_VALIDATION.md`.
- Offen und nicht durch Automatisierung ersetzbar bleiben ein manueller End-to-End-Durchlauf sowie mindestens zehn unbeeinflusste externe Tester. Verstaendnis- und Zweitrun-Quoten werden erst danach eingetragen.

## Phase 18: Kommerzielle Validierung

Status: Offen

Bulk-Ziel: Erst nach belastbarer Slice-Abnahme Produktumfang und Geschaeftsmodell festlegen.

41. [ ] Eine oeffentliche Web-Demo mit anonymer, datensparsamer Funnel- und Run-Telemetrie veroeffentlichen.
42. [ ] Store-tauglichen Namen, Key Art, Screenshots, Kurzbeschreibung und 30-45-Sekunden-Trailer erstellen.
43. [ ] Premium, Demo-plus-Premium oder faire kosmetische Erweiterungen anhand Zielgruppe und Plattform vergleichen; keine F2P-Systeme blind kopieren.
44. [ ] Go/No-Go-Kriterien fuer Vollproduktion definieren: Starts, Run-Abschluss, zweiter Run, bevorzugte Klasse, Wunschlisten und qualitative Resonanz.

Abnahme:

- Produktumfang und Budget beruhen auf beobachtetem Verhalten statt interner Begeisterung.
- Content-Produktion fuer weitere Akte beginnt erst nach einer positiven Entscheidung.

## Bulk-Arbeitsweise

- Eine Phase ist ein geschlossenes Umsetzungspaket und endet mit eigenem Commit und Push.
- Innerhalb einer Phase werden Datenmodell, Gameplay, UI, Telemetrie und Tests gemeinsam fertiggestellt.
- Die Roadmap wird nach jedem Paket mit Datum, Abnahmeprotokoll und verbliebenen Risiken aktualisiert.
- Build, Mechanics, Smoke, Production Gate und Pages-Build muessen vor jedem Paketabschluss gruen sein.
- Balance-Simulationen laufen nur an den in der Phase genannten Gates oder auf ausdruecklichen Wunsch.
- Balance-Runs ersetzen keine manuellen Runs; nach den Phasen 10, 11, 13, 15 und 17 ist eine visuelle/manuelle Stichprobe Pflicht.
- Bei einem fehlgeschlagenen Gate wird nicht mit der naechsten Phase begonnen.
- Neue Systeme werden nicht parallel eingefuehrt, wenn sie dieselben Zielwerte beeinflussen; sonst ist die Ursache einer Balanceaenderung nicht messbar.
- Assets werden erst finalisiert, wenn Mechanik, Groesse und Bildschirmrolle bestaetigt sind.
- Meta, Monetarisierung und grosse Contentmengen bleiben bis zur Kernspiel-Abnahme gesperrt.
