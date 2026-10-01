# Paket 1 – Menüs und Upgrade-Entscheidungen

Umsetzung und Abnahme: 1. Oktober 2026. Grundlage: Commit `fe75523` mit den hier dokumentierten lokalen Änderungen. Paket 0 bleibt als historische Ausgangslage erhalten.

**Paket 1 ist umgesetzt.** Hauptmenü, Charakterauswahl, Upgrade-Dialoge und die mitbetroffenen Talent-/Settings-/Archive-Texte sind überarbeitet. Die automatisierte Menüabnahme besteht auf 20 Fenstergrößen; vier zusätzliche Szenarien prüfen Maus, Tastatur, Touch, volle Builds und Belohnungsfolgen. Dies ist die Abnahme dieses Arbeitspakets. Kampflesbarkeit, Art-Pass, Ergebnisbildschirm und die abschließende Portalabnahme gehören weiterhin zu Paketen 2–6.

## Umgesetzte fünf Punkte

| Punkt | Konkrete Umsetzung und Zweck |
| --- | --- |
| 1. Hauptmenü | Mapname/Vorschau, Modus/Runwerte und Startbereich stehen in getrennten Flächen. Auf großen Fenstern stehen Vorschau und Charakter nebeneinander; bei geringer Höhe liegen Charakter und Start in einer festen unteren Zeile. Bei Platzmangel scrollt die Vorbereitung innerhalb ihrer Fläche. Der Start bleibt ohne Scrollen erreichbar. Alte Play-Regeln wurden aus `styles.css` entfernt; `menu-layouts.css` definiert die Varianten gemeinsam. |
| 2. Upgrade-Entscheidungen | Kurze Dialoge sind zentriert. Kopf und Reroll bleiben außerhalb des eigenen Scrollbereichs. Titel sind mindestens 16 px, Rang/Wirkung/Beschreibung/Synergie/EVO-Bedingungen mindestens 12 px ab 900 px Breite und 13 px darunter. Geringe Höhe blendet keine Entscheidungstexte mehr aus. Exakt doppelte Effektsätze entfallen, wenn derselbe Inhalt schon als Änderung angezeigt wird. Der vorhandene gemalte Rahmen bleibt innerhalb der sicheren Kanten. |
| 3. Boss-Auswahl | Drei Karten ab 900 px Breite nebeneinander; vier Karten ab 720 px als gleichwertiges 2×2-Raster, darunter als vertikale Liste. Bei wenig Höhe scrollen die Karten. Die vierte Karte wird in den Tests tatsächlich ausgewählt. Mehrfach-Level-ups, Elite-/Boss-Truhen, Reroll und die letzte Auswahl bleiben korrekt in der Reward-Queue. |
| 4. Porträts, Sprache und angrenzende Menüs | Eigener Porträtfokus für jeden Hahn; auf breiten Charakterkarten liegen Name/Rolle in einer separaten Leiste unter dem Gesicht. Gesperrte Figuren sind weiter als Vorschau zugänglich; Unlock-Texte und Namen bleiben lesbar. Die Auswahl heißt `SELECT … / Return to Play`, der eigentliche Start weiterhin `START RUN`. `NEW`, `INSTANT`, `EVO RECIPE` und `Talents` sind einheitlich englisch. Kleine Talentwirkungen, Preise, Rang-/Freischalttexte und Archive-Texte wurden angehoben. Settings haben auf kurzen Fenstern einen eigenen Scrollbereich und eine feste Continue-Aktion. |
| 5. Prüfung | Bestehende Menütests um Textgrößen/-sichtbarkeit, Map-/Run-Trennung, geladene Vorschauen, Talentdetails, Kartenzugriff, Fokus und echte Bedienungsfolgen erweitert. Release-Screens mit denselben Zuständen wie Paket 0 aufgenommen; zusätzlich kurze/kleine Grenzansichten bei DPR 2. Frische Release-, Meta-, EVO-, HUD-/Report- und Pause-Prüfungen bestanden. |

Tastaturdetails: Tab/Shift+Tab bleiben im Upgrade-Dialog; Enter bedient Reroll, Space wählt ein Angebot. HTML-Buttons verhindern für Space den Konflikt mit Phasers globalem Cursor-Key-Capture. Die Änderung betrifft HTML-Menüs. Horizontales Touchscrollen der Expeditionskarten und vertikales Scrollen langer Inhalte funktionieren; das Map-Swipen behält seinen eigenen Gesture-Handler.

## Frische Prüfungen

| Prüfung | Ergebnis / Umfang |
| --- | --- |
| `npm.cmd run test:menus` | Bestanden: 20 Viewports und vier Bedienungsszenarien; Rohdaten in [menus.json](menus.json). Jede Upgrade-Karte ist im internen Scrollbereich erreichbar. Pflichttexte bleiben sichtbar und über der jeweiligen Mindestgröße. |
| `npm.cmd run test:meta` | Bestanden: gesperrte Vorschauen, Kauf statt Vorschauklick, persistierte Progression/Kosmetik, Mobile-Scrolling, Map-Swipen und Freischaltungen. |
| `npm.cmd run test:evolution` | Bestanden: Slotgrenzen, Reroll, elf EVO-Rezepte und tatsächliches EVO-Verhalten. |
| `npm.cmd run test:hud-report` | Bestanden: HUD-/Berichtsinhalte und Rückkehr ins Hauptmenü. |
| `npm.cmd run test:pause` | Bestanden: Pause/Resume und bestehende Eingabelogik. |
| `npm.cmd run test:release` | Bestanden: gebauter Release im WebGL-iframe, Unterpfad, normaler/blockierter Speicher, Settings/Escape, keine Dev-Test-API und Einhaltung des Größenbudgets. |
| CSS-Abgleich | Die 975 verbliebenen, nicht betroffenen Selektor-/Deklarationskombinationen in `styles.css` entsprechen der Ausgangslage, abgesehen von bedeutungsloser Whitespace-Normalisierung. Überarbeitete Menu-Regeln liegen separat. |

Die 20 Viewports: 1920×1080, 1440×900, 1366×768, 1280×720, 1216×684, 1077×606, 967×604, 960×540, 907×510, 821×462, 800×450, 844×390, 1100×700, 1099×699, 900×600, 899×601, 720×600, 719×599, 390×844 und 320×568. Die letzten beiden zusätzlichen Bedienungsszenarien laufen mit Touch und DPR 2.

Die Bedienungsszenarien prüfen eine valide Primärwaffen-Rezeptkarte, Fokuswechsel und Reroll per Tastatur, anschließend drei Level-ups plus Elite-/Boss-Truhe in der tatsächlichen Queue-Reihenfolge, sichtbare Last-Pick-Belege, die vierte Boss-Karte und einen vollen Build mit aktiver Synergie und bereitstehender EVO. Die tatsächliche EVO-Auswahl wird am Loadout geprüft. Auf Touch-Geräten wird die horizontale Expedition-Liste durch echte Touch-Events gescrollt.

## Produktionsbilder und Vergleich

| Ansicht | Vorher: Paket 0 | Nachher: Paket 1 |
| --- | --- | --- |
| Play, 960×540 | [Vorher](../portal-package-0/desktop-first-play.png) | [Nachher](desktop-first-play.png) |
| Play, 390×844 | [Vorher](../portal-package-0/portrait-first-play.png) | [Nachher](portrait-first-play.png) |
| Primärwaffe / EVO-Bedingungen, 960×540 | [Vorher](../portal-package-0/desktop-primary-recipe-details.png) | [Nachher](desktop-primary-recipe-details.png) |
| Primärwaffe / EVO-Bedingungen, 844×390 | [Vorher](../portal-package-0/landscape-primary-recipe-details.png) | [Nachher](landscape-primary-recipe-details.png) |
| Boss-Truhe, 1440×900 | [Vorher](../portal-package-0/large-boss-chest.png) | [Nachher](large-boss-chest.png) |
| Boss-Truhe, 960×540 | [Vorher](../portal-package-0/desktop-boss-chest.png) | [Nachher](desktop-boss-chest.png) |
| Charaktere, 1440×900 | [Vorher](../portal-package-0/large-advanced-roosters.png) | [Nachher](large-advanced-roosters.png) |
| Talentdetails, 390×844 | [Vorher](../portal-package-0/portrait-advanced-talent-detail.png) | [Nachher](portrait-advanced-talent-detail.png) |
| Settings, 844×390 | [Vorher](../portal-package-0/landscape-first-settings.png) | [Nachher](landscape-first-settings.png) |

Weitere Belege: [views.json](views.json), [details.json](details.json) und [menu-matrix.json](menu-matrix.json). Das letzte Protokoll ergänzt 320×568, 720×600 und 719×599 bei DPR 2, einschließlich Auswahl der vierten tatsächlichen Produktions-Boss-Karte und anschließendem Resume. Die Charaktergeometrie in [geometry.json](geometry.json) ist eine mitgeführte Kontrollaufnahme; sie wird in diesem Paket nicht geändert.

Die Bilder stammen aus `dist-release` im WebGL-Renderer. Ein browserseitiger Beobachtungshook erreicht vorbereitete Szenenzustände; die ausgelieferten Dateien werden nicht umgeschrieben, und die Dev-Test-API bleibt ausgeschlossen. Erstnutzer-/Advanced-Spielstände sind isolierte Fixtures, kein privater Browser-Spielstand. Der normale Release-Gate-Test arbeitet ohne diesen Hook. Kampf- und Ergebnisbilder dienen dem Vergleich und sind keine Abnahme der späteren Pakete.

Umgebung und Build sind in [environment-views.json](environment-views.json), [environment-menu-matrix.json](environment-menu-matrix.json), [release-manifest.json](release-manifest.json) und [verification.json](verification.json) dokumentiert. Die Datei-SHA-256 identifizieren den geprüften lokalen Build; die Basis-Commit-ID allein identifiziert die uncommittierten Änderungen nicht.

Die Aufnahme lässt sich mit `PORTAL_BASELINE_OUTPUT=docs/qa/portal-package-1` und den drei Modi `--views`, `--details`, `--menu-matrix` des Scripts `scripts/capture-portal-baseline.mjs` wiederholen. `node scripts/verify-portal-package-1.mjs` gleicht anschließend Release-Hashes, Bildmaße, Produktionsschriftgrößen, Rezept-/Synergiehinweise, die drei Boss-Auswahlen und die Testprotokolle ab. Die Upgrade-Schriftprüfung bezieht sich auf die Auswahlkarten; gleich benannte Chips der Kampfbestätigung gehören zum separaten HUD-Paket.

Release: **143 Dateien, 19.330.951 Bytes = 18,44 MiB**, Budget 19 MiB. Gegenüber Paket 0 ist der Build 15.517 Bytes kleiner. Es wurden keine neuen Bild- oder Audioassets hinzugefügt.

## Verbleibende Arbeit

Paket 2 prüft Figurenlesbarkeit und kollidierende Kampfmeldungen. Paket 3 behandelt den begrenzten Art-/Icon-Pass, Paket 4 Belohnungsinszenierung und Ergebnisbildschirm. Die vorliegenden Prüfungen laufen in Chromium/Playwright auf diesem Windows-Host; reale Android-/iPhone-Geräte, Safari, menschliche Erstspieler und das endgültige Portalpaket bleiben der späteren Abnahme vorbehalten. Die offenen späten Coop-Wellen aus Paket 0 werden durch diese Menüprüfung nicht geschlossen.

Paket 1 ändert weder Gegnerzahl, Balance, Kollisionen noch Map-/Charakter-Assets. Eine Veröffentlichung oder Portaleinreichung wurde nicht ausgeführt.
