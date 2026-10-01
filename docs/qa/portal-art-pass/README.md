# Map-Art-Pass und entfernte W-Markierungen

[Vergleichsgalerie](index.html): zwölf Vergleichsbilder mit Vorher und Nachher nebeneinander auf jeweils EINEM PNG. Zusätzlich bleiben die 50 unverkleinerten Produktionsaufnahmen erhalten. Baseline: `65ffe0f17e771437e50c80fb2eb3d19834cccb9c`.

## Umsetzung und Beurteilung

| Thema | Umsetzung | Beurteilung |
| --- | --- | --- |
| Bodenwiederholung | Drei ruhigere Harvest-Yard-Innenvarianten, aus Chunkkoordinaten deterministisch gewählt; gleicher Originalrand mit weichem Übergang. | Sichtbare Verbesserung der Ruhe und Materialwirkung. Keine vollständig abwechslungsfreie Kachelung: gemeinsame Ränder und bestehende Landmarken wiederholen sich weiterhin. |
| Mapidentität | Harvest Yard wärmer, Feed Alley mit kühlerer/dunklerer Kulisse und zurückhaltend abgestimmtem Laufweg, Coop Square weniger orange. | Kleine, sinnvolle Korrektur. Architektur und Mapgeometrie leisten weiterhin den größten Beitrag zur Unterscheidbarkeit. Die Farbkorrektur allein ist kein großer Art-Umbau. |
| Kisten/Heuballen | Zwei ImageGen-Materialstudien als neue Laufzeitassets übernommen: weichere Holzzeichnung, weniger glänzende Beschläge, gruppiertes Stroh und weniger oranges Gelb. Sichtbaren Alpha-Fußabdruck auf den bisherigen angepasst. | Zusammen mit entfernten W-Markierungen die deutlichste Verbesserung. Ein Ausbau auf weitere Props ist später sinnvoll, wenn diese Materialwirkung gefällt. Die runden Coop-Heustapel, Tröge, Traktor und Dekokulissen wurden nicht neu gezeichnet. |
| W-Markierungen | Zeichnung, Grafikobjekte und Aktualisierung entfernt, ohne Ersatzsymbol. | Objekte wirken sauberer. Trefferblitz, Schadensfarben, Zerstörung, Kollisionsfreigabe und Beute bleiben erhalten. Der vorhandene Einführungstipp zu zerstörbaren Vorräten bleibt erhalten. Eine neue Kennzeichnung vor dem ersten Treffer ist separat zu entscheiden. |

**Empfehlung:** Neue Props und ruhigeren Boden beibehalten. Die zurückhaltende Farbkorrektur ist eine Ergänzung; kräftigere Filter würden das Problem gemischter Assetstile nur verdecken. Der bessere nächste Schritt für einen größeren optischen Fortschritt ist die gezielte Angleichung einzelner bestehender Dekoobjekte. Kein kompletter Neuentwurf aller Maps in diesem Pass.

## Vergleichbarkeit

Alle Aufnahmen verwenden Produktionsbuilds mit WebGL, denselben Seed, dieselben freigeschalteten Charaktere und dieselben vorbereiteten Positionen. Laufzeit und Animation werden angehalten. Übersichten blenden das HUD aus; Propszenen zeigen vier identisch platzierte Vergleichsobjekte. Die Kampfszenen enthalten 18 stehende Gegner und dienen der statischen Kontrastbeurteilung. Sie zeigen keinen normalen vollständigen Run.

Für 13 Szenenpaare wurden Kamerazoom, Figurenmaßstab, Spielerradius, Mapgrenzen und aktive Objektpositionen/Kollisionsmaße verglichen: identisch. Zwei Strecken mit jeweils sechs Positionen prüfen Streaming und Wiederbesuche. Die Bodenvariante bleibt beim Zurückkehren stabil. [Messdaten](checks.json).

## Prüfungen und Kosten

- `assets:check`: 141 aktuelle Laufzeitassets. Alle 136 bisherigen Manifesteinträge sowie ihre Source- und Runtime-SHA-256 unverändert. Player, Kamera und Arena-Definitionen unverändert. [Erhaltungsnachweis](preservation.json).
- `test:arena`: alle drei Maps, beide Schadensstufen, volle Deckkraft, Zerstörung, freigegebener Collider, Beute und vorhandener Einführungstipp bestanden. [Bericht](arena.json).
- `test:map-streaming`: Chunkrecycling, Grenzen, Spawnpunkte und Feed-Alley-Darstellung bestanden. [Bericht](streaming.json).
- `test:pressure`: Wave 7 mit Ace, Artillery und Storm im abschließenden Durchlauf bestanden, ohne Browserfehler. Der erste Durchlauf parallel zur Screenshotaufnahme überschritt für Artillery das Zeitlimit; die Wiederholung ohne diese Aufnahmebelastung bestand. Keine Änderung der Kampfmechanik. [Abschließender Bericht](pressure.json).
- Release-Gate: normaler und blockierter Speicher im Produktions-iframe bestanden, WebGL und keine Test-API. Ebenfalls mit `VITE_MAP_ART_VERSION=classic` gebaut und geprüft.
- Release: 148 Dateien, 19.605.334 Bytes / 18,70 MiB; vorher rund 18,45 MiB. Fünf neue WebP-Dateien zusammen 257.010 Bytes. Alle bisherigen Dateien bleiben für den Rückweg erhalten.
- Drei zusätzliche 700 × 700 RGBA-Bodentexturen: nominal 5.880.000 Bytes / 5,61 MiB zusätzlicher GPU-Texturspeicher in Harvest Yard. Der klassische Boden bleibt ebenfalls geladen. Rohe Generatorquelltexturen werden nach dem Zusammensetzen aus dem GPU-Cache entfernt. Canvas- und Browser-Speicher kommen hinzu; dies ist keine Messung des gesamten Prozessspeichers.
- Die äußeren 25 Pixel der drei zur Laufzeit zusammengesetzten Texturen sind pixelgleich (0 Unterschiede). Das erhält den bisherigen Rand; es behauptet keine Pixelgleichheit gegenüberliegender Ränder des alten Bodens. Der vorhandene Streamingüberlapp bleibt erhalten.

**Offen:** menschliche Geräteabnahme auf iOS/Android, Erkennbarkeit in späten Effektphasen und der separat besprochene Größen-/Kameraplan für Feed Alley. Keine Hochformatpflicht und keine Kameravergrößerung umgesetzt. Die zusätzlichen Bodentexturen sollten bei der Geräteabnahme auch auf kleinen Speicherbudgets beurteilt werden.

## Rückweg ohne Wiederherstellung der W-Zeichen

Die bisherigen Assets wurden nicht überschrieben. Die Entfernung der W-Markierungen wird separat von der Grafikänderung committed.

- Lokal im Devserver: `?mapArt=classic` stellt ursprüngliche Böden, Farben und Props wieder her.
- Produktionsbuild in PowerShell:

```powershell
$env:VITE_MAP_ART_VERSION = 'classic'
npm.cmd run build:release
Remove-Item Env:VITE_MAP_ART_VERSION
```

Die W-Markierungen bleiben in diesem Modus entfernt. Steuerung in `src/config/mapArt.js`. Der Grafikcommit kann außerdem unabhängig vom Markierungscommit revertiert werden.

## Quellen und Reproduktion

[ImageGen-Promptvorgaben und Assetpfade](PROMPTS.md). Originale ImageGen-Ergebnisse und normalisierte PNGs in `art-source/map/portal-v3/`, neue WebP-Dateien in `src/assets/map/portal-v3/`. Technischer Export mit `scripts/export-portal-map-assets.py`; Runtimekomposition mit `src/systems/assets/HarvestGroundVariants.js`.

Zum Reproduzieren der Vergleichsaufnahmen wird der unveränderte Baseline-Releasebuild unter `test-results/portal-art-pass/before-release/` benötigt. Er ist ein lokales, ignoriertes Artefakt und lässt sich aus Commit `65ffe0f` erneut bauen. Dann:

```powershell
npm.cmd run build:release
node scripts/capture-portal-art-pass.mjs
node docs/qa/portal-art-pass/render-gallery.mjs
```

Öffentliche Preview und GitHub Pages werden durch diesen lokalen Grafikpass noch nicht aktualisiert.
