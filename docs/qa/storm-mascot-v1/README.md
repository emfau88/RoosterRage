# Stormcrest · freigegebene neue Spielfigur

Stand 2. Oktober 2026, Branch `codex/stormcrest-character-redesign`, Vergleichsbasis `d8fe3fb`. Der Nutzer hat die neue Figur zum Einbinden, Committen und Pushen freigegeben. Ace ist bereits als neue Spielfigur eingebunden und auf `codex/ace-character-redesign` gepusht. Dieser Branch enthält auch dessen Änderungen.

[Offline-Animationsvergleich](storm-vergleich.html) · [Ingame-Galerie](index.html) · [Quellen und Prompts](../../../art-source/characters/storm-mascot-v1/PROMPTS.md) · [Vorab-Analyse](CURRENT_PIPELINE.md) · [Runtime-Prüfung](runtime-checks.json) · [Acceptance](acceptance-matrix-report.json)

## Ergebnis und ehrliche Bewertung

| Bereich | Verbesserung | Noch offen |
| --- | --- | --- |
| Figur | Rundlicher Körper, größere Mimik und roter Kamm passen zum humorvollen Ace. Klarer Unterschied zwischen blauem Gefieder, weißem Schal und Goldakzenten. | Der alte Stormcrest wirkt schlanker und ernster. Die neue Richtung ist bewusst stärker cartoonhaft. |
| Rücken und Profil | Deutlich voller Federfächer mit Ansatz am Körper; markante Silhouette aus allen vier Richtungen. | Starre Fußteile und stilisierte rückwärtige Zehen könnten bei einer späteren Animationsrunde präziser werden. |
| Laufanimation | Acht feste Phasen, gegenläufige Schritte, kleine Körperbewegung und verzögerte Kamm-/Schwanzbewegung. | Zusätzliche Fußartikulation könnte das Gewicht noch besser vermitteln. |
| Lesbarkeit | Roter Kamm und helle Gesichts-/Schalpartien geben der blauen Figur stärkere Orientierungspunkte. | Feed Alley im Hochformat zeigt weiterhin nur ungefähr 30 sichtbare Pixel. Das Kameraproblem bleibt separat. |
| Angriff | Technisch mit fortlaufendem Laufzyklus erprobt; im Offline-Vergleich manuell oder automatisch testbar. | Das beidseitige Armheben liest sich eher als Flattern. Deshalb NICHT in der ausgelieferten Spielfigur aktiv. Ein späterer gezielter einseitiger Impuls wäre der bessere Weg. |
| Menü/HUD | Bestehende Funktion und Auswahl bleiben intakt. | Das alte Charakterportrait passt noch nicht vollständig zur neuen Spielfigur. Nach Freigabe der Figurenfamilie ein eigener Portraitdurchgang. |

Meine Empfehlung: die bestätigte Figur mit ihrer normalen Laufanimation übernehmen. Die Angriffsbewegung bleibt ein separater Entwurf. Keine Kettenwaffen oder neue Angriffsfunktion wurden in das Gameplay aufgenommen.

## Technische Integration und Rückweg

- Alte Dateien bleiben vollständig unter `src/assets/characters/storm-final/`, ebenso ältere Generationen und ihre Quellen.
- Lokaler Rückweg: `?stormVisual=final`. Build-Rückweg: `VITE_STORM_VISUAL_VERSION=final`. Ace und Boombardier bleiben unabhängig wählbar.
- Zwei Runtime-WebPs zu je 2048 × 1024, Frames 256 × 256, acht Phasen. Atlaszeilen Süd/Ost/Ost/Nord; Westen spiegelt die Ostansicht.
- Laufzyklus 480 ms, Idle 2400 ms. Ursprünglicher Maßstab 0,255, Kollisionskreis, Tempo, Schaden, Schussrate und Kamera bleiben erhalten.
- Runtime-Farbe WebP Qualität 94. Alpha wird nach dem Export exakt verglichen. Attack-Testatlanten nutzen drei statt vier Richtungszeilen und Qualität 68; sie werden weder geladen noch ins Spielpaket gebündelt.
- Die neue Basisgrafik benötigt 1.105.826 Bytes. Das aktuelle Spielpaket liegt bei 17,96 MiB unter dem unveränderten 19-MiB-Limit.

## Verifikation

- 41 Charaktertests: bisherige Generationen, Schleifenschluss, Spiegelung, Quellhashes und feste Bestandteile; experimentelle Angriffsposen verändern keine Beine/Körperteile außerhalb der Flügel.
- Neun Produktionsvergleiche: drei Maps × Desktop, Hoch- und Querformat; 72 Lauf-/Idle-Zustände. Kamera, Hitbox, Maßstab, Spielwerte und Mapgeometrie sind mit der Baseline identisch; Ace-/Boombardier-Atlanten unverändert.
- Elf Ingame-Szenenpaare jeweils als EIN beschriftetes PNG, dazu isolierte Richtungsvergleiche und eine vollständig eingebettete Offline-Datei.
- Release-Gate im Portal-Iframe mit normalem und gesperrtem Storage bestanden; keine Test-API im Release.
- Asset-Check (141 bestehende Dateien), Character-Lab-Build und Production-Gate bestanden.
- Acceptance-Matrix: 12 Challenge-Szenarien, neun Archetypen, neun Map-Szenarien, Telegraph-Ausweichen und drei Lasttests bestanden. p95 jeweils ca. 16,8 ms bei Peak 370 Objekten auf diesem Testrechner. Keine Behauptung eines realen Handy-Benchmarks.
- Separater Rollback-Build enthält die alten Storm-Final-Atlanten und keine Mascot-/Angriffsatlanten.

`attack-prototype-checks.json` dokumentiert den zeitweilig integrierten Angriff VOR der Entscheidung, ihn aus dem Spiel zu nehmen: tatsächlicher Schuss, fortlaufende Beinphase, unveränderte Bewegungsanimation und Treffer-Alpha, anschließend normale Pose. Dieser historische Versuch ist keine Behauptung, dass die finale Spielfigur eine neue Angriffsanimation enthält.

Echte iOS-/Android-Geräte, alle späten Effektkombinationen und finale Portraits bleiben gesonderte Aufgaben. Der Git-Push dieses Feature-Branches deployt nicht automatisch die öffentliche GitHub-Pages-Version; deren Workflow läuft auf anderen Branches.
