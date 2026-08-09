# Rooster Rage - Produkt- und Entwicklungsroadmap

## Zielbild

Rooster Rage wird zunaechst als fokussierter PC/Web-Premium-Prototyp entwickelt.

- Klarer Hook: verrueckte Rooster-Klassen, charakteristische Ei-Waffen und spektakulaere Build-Synergien.
- Commercial Vertical Slice: 3 spielbare Rooster, 10 abwechslungsreiche Wellen, 1 Boss und etwa 25 belastbare Upgrades.
- Die heutigen 10 Wellen bilden zunaechst einen kurzen, vollstaendig spielbaren Run. Eine spaetere Vollversion braucht laengere Runs oder mehrere 10-Wellen-Akte.
- Mobile bleibt vollstaendig spielbar, bestimmt aber vorerst nicht Monetarisierung oder Produktdesign.

## Statusuebersicht

| Phase | Thema | Status |
| --- | --- | --- |
| 0 | Technische Baseline | Abgeschlossen |
| 1 | Combat-Architektur | Abgeschlossen |
| 2 | Weitere Modularisierung | Abgeschlossen |
| 3 | Asset- und Performance-Pipeline | Abgeschlossen |
| 4 | Spielgefuehl und Lesbarkeit | Abgeschlossen |
| 5 | Upgrade-System als Kernprodukt | Abgeschlossen |
| 6 | Drei Rooster-Klassen | Offen |
| 7 | Wellen 1-10 kuratieren | Offen |
| 8 | Test- und Balanceprogramm | Offen |
| 9 | Vertical-Slice-Abnahme | Offen |
| 10 | Meta, Retention und Umfang | Offen |
| 11 | Kommerzielle Validierung | Offen |

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

Status: Offen

- Basis-Rooster: ausgewogen, zielgerichtete Eier, flexibel.
- Artillery-Rooster: schwere Eier, Explosionen, Feuer und Raketen.
- Storm-Rooster: schnell, Kettenblitze, Laser und Orbit-Fokus.
- Eigene Startwerte, Primaerangriffe, passive Eigenschaft und klare Silhouette.
- Support-Chick und weitere Begleiter als echte Summon-Builds behandeln.
- Auswahl zunaechst vor dem Run; Freischaltungen erst nach bestaetigtem Spielspass.
- Hennenhuette spaeter als Meta-Hub nutzen, nicht als Ersatz fuer eine klare Auswahl.

Abnahme: Jeder Rooster spielt sich vom ersten Schuss an erkennbar anders.

## Phase 7: Wellen 1-10 kuratieren

Status: Offen

- Wellen 1-3 lehren Bewegung, Verfolgung und Zielprioritaet.
- Wellen 4-6 kombinieren Fernkampf, Faecher und Bomber.
- Wellen 7-9 nutzen Elites, gemischte Rollen und kontrollierten Arena-Druck.
- Welle 10 bietet einen Boss mit verstaendlichen Phasen, Feuerball und Adds.
- Pro Welle Budget, Zusammensetzung, Spawn-Rhythmus und Belastungsziel definieren.
- Schwierigkeit durch Kombinationen statt nur HP-Skalierung erzeugen.
- Spawn-Schutz und Mindestabstaende sicherstellen.

Abnahme: Normale Wellen dauern etwa 20-30 Sekunden, die Spannung steigt lesbar an und der Boss bildet einen klaren Abschluss.

## Phase 8: Test- und Balanceprogramm

Status: Offen

- Deterministische Seeds einfuehren.
- Spielermodelle fuer Anfaenger, durchschnittliche, offensive und ausweichstarke Spieler simulieren.
- Schaden, Trefferquellen, XP-Tempo, Upgrade-Pausen, Gegner-Lebenszeit und Beinahe-Tode erfassen.
- Trefferquote, Flaechenschaden, Overkill und Nutzungsanteil pro Faehigkeit pruefen.
- Berichte pro Welle, Rooster und Build erzeugen.
- Automatische Balance-Runs nur nach abgeschlossenen Feature-Paketen starten.
- Simulationsergebnisse durch wenige gezielte manuelle Runs ergaenzen.

Abnahme: Das Testprogramm findet Regressionen und grobe Balance-Ausreisser, ohne Spielspass nur aus Zahlen abzuleiten.

## Phase 9: Vertical-Slice-Abnahme

Status: Offen

- Alle drei Rooster absolvieren einen vollstaendigen Run.
- Mindestens drei tragfaehige Build-Archetypen pro Rooster.
- Desktop sowie Mobile Portrait und Landscape pruefen.
- Keine Console Errors oder wachsenden Objektlisten.
- Stabile Performance bei maximaler Gegner- und Effektlast.
- Externe Tester ohne Einfuehrung beobachten.
- Verstaendnis, Spannung, Entscheidungsqualitaet und Wiederholungswunsch auswerten.

Abnahme: Der Slice ist technisch stabil, ohne Erklaerung spielbar und erzeugt nachweisbar den Wunsch nach einem weiteren Run.

## Phase 10: Meta, Retention und Umfang

Status: Offen

- Hennenhuette als Hub pruefen.
- Rooster-Freischaltungen, Challenges, Run-Historie und Lexikon konzipieren.
- Keine dauerhafte numerische Meta-Aufruestung verwenden, um schlechte Balance zu verdecken.
- Entscheiden, ob zehn Wellen ein Kurz-Run bleiben oder einen Akt eines laengeren Runs bilden.

Abnahme: Meta-Fortschritt unterstuetzt unterschiedliche Spielweisen und liefert klare Ziele ohne den Kernkampf zu entwerten.

## Phase 11: Kommerzielle Validierung

Status: Offen

- Store-tauglichen Namen, Key Art, Screenshots und kurzen Trailer erstellen.
- Oeffentliche Demo mit anonymen, datenschutzkonformen Kennzahlen veroeffentlichen.
- Start-zu-Ende-Quote, erneuten Run, bevorzugte Rooster, Abbruchwelle und Upgrade-Auswahl messen.
- Zielgruppe und Preis anhand echter Demo-Reaktionen validieren.
- Erst danach Content-Budget, Plattformen und Vollversionsumfang festlegen.

Abnahme: Produktumfang und Investition stuetzen sich auf beobachtetes Nutzerverhalten statt nur auf interne Annahmen.

## Arbeitsregeln

- Die Statusuebersicht und Checklisten werden nach jedem abgeschlossenen Arbeitspaket aktualisiert.
- Jede Phase endet mit Build und den fuer die Aenderung relevanten automatischen Tests.
- Balance-Simulationen laufen nicht automatisch nach kleinen Aenderungen.
- Ein Balance-Run ist erst nach einem abgeschlossenen Feature-Paket oder auf ausdruecklichen Wunsch sinnvoll.
- Neue Inhalte werden nicht auf bekannte technische Regressionen aufgebaut.
