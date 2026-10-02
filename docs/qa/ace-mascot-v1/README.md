# Barnyard Ace · geprüfter Mascot-Prototyp

Stand: 2. Oktober 2026. Branch `codex/ace-character-redesign`, Vergleichsbasis `124f853`. Nur der Ace-Ingame-Charakter wurde neu gestaltet. Die Arbeit endet hier zur Stilabnahme; keine automatische Übertragung auf Boombardier oder Stormcrest und keine Veröffentlichung.

[Galerie mit synchronem Animationsvergleich](index.html) · [Analyse vor Umsetzung](CURRENT_PIPELINE.md) · [ImageGen-Quellen und Spezifikationen](../../../art-source/characters/ace-mascot-v1/PROMPTS.md) · [Runtime-Prüfdaten](runtime-checks.json) · [Acceptance-Matrix](acceptance-matrix-report.json) · [Asset-Prüfung](asset-check.json)

## Ergebnis und Bewertung

| Thema | Änderung / Urteil | Grenze |
| --- | --- | --- |
| Silhouette | Größerer Kopf, kürzerer Körper, gruppierter Tail. Als frecher kleiner Hahn klarer und humorvoller. | Wirkt stärker wie ein Maskottchen und weniger wie der bisherige gerüstete Kämpfer. Bewusste Stilentscheidung. |
| Gesicht / Farbe | Große Augen, deutlicher Schnabel, rote Kamm-/Halstuchflächen, reduzierter Goldbesatz. Die Mimik trägt auf Desktop und normalem Portrait besser. | Sehr kleine Darstellung kann Augen und Brustemblem weiterhin nicht differenziert zeigen. |
| Bewegung | Acht konsistente Phasen pro Richtung und Zustand, kurze Schritte, kleiner Bob, separater Kamm und verzögerter Tail. Keine wechselnden Zeichnungen innerhalb eines Clips. | Die vollständigen Füße sind starre Teile. Eine zusätzliche Fußartikulation und längere Bodenkontaktphase wären ein gezielter späterer Feinschliff. |
| Richtungen | Drei feste Richtungskits; Ost ist West gespiegelt. Front, Seite und Rückseite besitzen passende Anatomie. | Gezeichnete Richtungsansichten sind keine geometrische 3D-Drehung. Es gibt keine diagonalen Ansichten. |
| Feed Alley, Portrait | Weißer Kopf und roter Kamm ergeben ruhigere, klarere Flächen. | Rund 30 sichtbare Pixel Höhe bleiben ein Engpass. Diesen Punkt bewerte ich als verbessert, aber nicht gelöst. Kein Kamerazoom wurde verändert. |
| Dichte Szene | Die Kopf-/Kammform hebt sich klarer von der Gegnergruppe ab. | Vergleich mit 32 stehenden Gegnern. Keine behauptete vollständige Abnahme aller Late-Game-Effektkombinationen. |
| Technik | Gleiche Atlasgröße und Runtime-Animationen, 24 unveränderliche Körperteile, reproduzierbarer Export, alte Assets erhalten. | Visuelle Abnahme auf echten iOS-/Android-Geräten bleibt ausstehend. |

Meine Empfehlung: Diesen Prototyp als Stilrichtung für den humorvollen Helden verwenden. Vor der Übertragung auf die anderen Figuren zunächst Kopf-/Körperverhältnis und Laufgefühl bestätigen. Für Feed Alley ist eine getrennte Entscheidung über die Darstellungsgröße nötig; noch mehr gemalte Details helfen dort kaum. Menü-/HUD-Portrait zeigt bewusst noch die bisherige Illustration und sollte nach der Stilabnahme an den endgültigen Ace angepasst werden.

## Integration und Reproduzierbarkeit

Die drei mit dem eingebauten ImageGen-Werkzeug erzeugten transparenten Richtungskits liegen unter `art-source/characters/ace-mascot-v1/generated/`. Ihre festen Teile und Quellhashes sind in `parts.json` dokumentiert. Schnabel und Augen bleiben fest im Kopf, Rüstung und Emblem im Torso. Der Kamm ist separat beweglich. Innerhalb eines Clips gibt es weder neue generative Bilder noch wechselnde Proportionen.

`prepare-ace-mascot.py` → `aceMascotPose.js` / `export-ace-mascot.mjs` → `render-ace-mascot.py` → `src/assets/characters/ace-mascot/` → Vite-Auswahl → bestehende AnimationSetup-/Player-Runtime. Alte Pipeline und alte Assets bleiben erhalten. Der Character-Lab-Build kann die jetzt funktionsbasierte Vite-Konfiguration korrekt zusammenführen.

- Runtime: zwei RGBA-WebPs, je 2048 × 1024, 8 × 4 Frames zu 256 px. Origin (0.5, 0.5). Laufzyklus 520 ms, Idle 2800 ms.
- Süd/West/West-Kopie/Nord in den Atlaszeilen. Ost nutzt wie zuvor West mit `flipX`.
- WebP-Farbe Qualität 94; Alpha wird nach dem Dekodieren exakt mit dem gerenderten Alpha verglichen. Keine Behauptung verlustfreier RGB-Kompression.
- Idle 489.696 Bytes, Walk 506.280 Bytes; zusammen 632.096 Bytes weniger als die beiden bisherigen Ace-Atlanten (38,8 %). Atlasdimensionen und damit die grundlegende GPU-Texturfläche bleiben gleich.
- Nur der visuelle Kontaktschatten verwendet die neu gemessene Unterkante. Trefferkreis, Geschwindigkeit, Schadenswerte, Feuerrate, Kamera und übrige Spielsysteme bleiben bestehen.

Build benötigt Node/npm sowie Python mit Pillow. Aus dem Repo:

```powershell
python scripts/prepare-ace-mascot.py
node scripts/export-ace-mascot.mjs
python scripts/render-ace-mascot.py
npm.cmd run test:character-lab
npm.cmd run build:release
```

Die Quellen sind fest gespeichert; nur das deterministische Ausschneiden/Posieren/Backen wird wiederholt. Eine neue ImageGen-Generierung wäre kein identischer Rebuild. `render-ace-mascot.py` verwendet für QA-Beschriftungen aktuell die Windows-Schrift Arial; das betrifft die lokale Build-Portabilität, nicht das Webspiel.

## Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Character-Lab / Four-Direction / Gameplay-Pose / Final / neuer Mascot | 36 Tests bestanden; acht neue Clips auf feste Bestandteile, Loop, Spiegelung, Framegeometrie, Alpha und Hashes geprüft |
| Character-Lab-Build | Bestanden |
| Bestehender Asset-Check | 141 Einträge bestanden; neue Mascot-Dateien zusätzlich über eigenes Manifest geprüft |
| Produktionsvergleich WebGL | 9 Kombinationen: 3 Maps × Desktop 960×540 / Portrait 390×844 / Landscape 844×390; keine Browser-/Assetfehler |
| Animationen in Produktion | 72 Lauf-/Idle-Zustände, korrekte Keys, Ost-Spiegelung, Origin und Maßstab |
| Vorher/Nachher-Geometrie | Identische Kamerawerte, Collider, Spielerwerte und Mapgeometrie; identische Dateinamen/Hashes der anderen Rooster |
| Acceptance-Matrix | 12 Challenge-Szenarien, 9 Archetypen, 9 Map-Szenarien, Telegraph-Ausweichen und 3 Lasttests bestanden |
| Lasttest | p95 Desktop 16,7 ms, Portrait 16,8 ms, Landscape 16,8 ms; jeweils 370 Objekte im gemessenen Peak. Werte vom Testrechner, kein Handy-Benchmark |
| Production-Gate | Bestanden; keine Test-API im Build |
| Release-Gate | Bestanden, WebGL im iframe mit normalem und blockiertem Storage; Paket 18,09 MiB / 148 Dateien |
| Release-Rollback | Separater Build mit `VITE_ACE_VISUAL_VERSION=final` besteht ebenfalls das Release-Gate |
| Deterministischer Rebuild | Pose-Export und Atlas-Rendering wiederholt; beide Runtime-WebPs besitzen identische SHA-256-Hashes |
| Galerie | 11 kombinierte Vorher/Nachher-PNGs; keine horizontale Überbreite bei 390 px |

Der erste Acceptance-Lauf erreichte die Test-API innerhalb von fünf Sekunden nicht. Wiederholung auf einem frischen Testserver (Port 5189) bestand ohne geänderte Testbedingungen oder gelockerte Assertions. Ein früher Production-Build wurde während eines laufenden Asset-Exports begonnen; nach abgeschlossenem Export sauber neu gebaut und bestanden. Die protokollierten erfolgreichen Gates beziehen sich auf die fertigen Assets.

## Vergleiche erneut erzeugen

`scripts/capture-ace-mascot.mjs` erwartet den eingefrorenen alten Release-Build unter `test-results/ace-mascot-v1/before-release/` und den neuen unter `dist-release/`. Der alte Ordner stammt aus `124f853` und ist absichtlich nicht versioniert. Für eine frische Arbeitskopie den Stand `124f853` in einem separaten Checkout mit `npm ci` / `npm run build:release` bauen und dessen `dist-release` dorthin kopieren. Nicht die aktuelle Arbeitskopie zurücksetzen.

```powershell
npm.cmd run qa:ace-mascot
```

Die Vergleichsfixtures neutralisieren Rückstoß, pausieren die Szene und verwenden identische Positionen. Ein Phaser-Beobachtungshook existiert ausschließlich im Testbrowser. Im ausgelieferten Spiel wird keine Test-API ergänzt. Der Animationsvergleich der Galerie liest die tatsächlich verwendeten alten/neuen Runtime-Atlanten. Das Produktionsvideo zeigt außerdem die Richtungswechsel im Spiel.

## Rückweg

Im Devserver: `/?aceVisual=final` lädt den bisherigen Ace, `/?aceVisual=mascot` den neuen. Boombardier und Stormcrest bleiben in beiden Fällen unverändert. Produktionsbuilds erlauben diese Debug-URL-Auswahl nicht; sie enthalten nur die ausgewählten Ace-Dateien.

Für einen vollständigen Release mit bisherigem Ace:

```powershell
$env:VITE_ACE_VISUAL_VERSION='final'
npm.cmd run build:release
Remove-Item Env:VITE_ACE_VISUAL_VERSION
```

Zum neuen Standard zurück: ohne diese Umgebungsvariable erneut bauen. Die logischen Commits trennen Analyse/Referenzen, neue Quellen/Build und Integration/QA. Keine alten Character-Assets wurden gelöscht oder überschrieben.
