# Audit: Überarbeitung der spielbaren Charaktere

Stand: 01.09.2026

## Ergebnis

Alle drei spielbaren Charaktere besitzen jetzt einen neuen, kontrolliert aufgebauten Vier-Richtungs-Rig mit klaren Außenlinien, stabiler Identität zwischen den Frames sowie getrennten Lauf- und Idle-Animationen. Die neuen Lauf-Sheets sind im Spiel Standard. Die bisherigen produktiven Sheets bleiben unverändert im Repository und können per URL-Parameter sofort wieder aktiviert werden.

| Charakter | Silhouette | Walk | Idle | Richtungen | Spielintegration | Legacy |
| --- | --- | --- | --- | --- | --- | --- |
| Ace | beweglicher Allrounder | 4 Frames, 520 ms | 8 Frames, 2800 ms | Süd, West, gespiegelt Ost, Nord | aktiv | erhalten |
| Bummbert | stämmig, schwer gepanzert | 4 Frames, 650 ms | 8 Frames, 3200 ms | Süd, West, gespiegelt Ost, Nord | aktiv | erhalten |
| Blitzkamm | schlank, schnell, agil | 4 Frames, 440 ms | 8 Frames, 2400 ms | Süd, gespiegelt West, Ost, Nord | aktiv | erhalten |

## Visuelle Regeln

- Jeder Frame verwendet dieselben unveränderten Körperteile seiner Richtung. Bewegung entsteht ausschließlich durch kontrollierte Translation, Rotation und Skalierung.
- Beine werden als vollständige Teile von Schenkel bis Fuß verwendet. Dadurch entstehen keine Risse zwischen Unterschenkel und Fuß.
- In der Seitenansicht liegt der nahe Arm vor dem nahen Bein und verdeckt den Schenkel anatomisch korrekt.
- In der Nordansicht liegen die Armwurzeln hinter dem Rumpf. Von hinten sind nur die seitlich herabhängenden Bereiche sichtbar; die Arme wirken nicht auf dem Rücken befestigt.
- Seitliche Schwanzfedern beginnen am tiefen Rumpf/Po-Bereich.
- Die Nordfüße zeigen ihre Fersen-/Rückseite und keinen nach Süden gerichteten Zehenfächer.
- Die Lauf-Atlanten verwenden 256 × 256 Pixel pro Frame und vier Frames je Richtung. Idle verwendet acht Frames je Richtung.

## Größen und Klassenlesbarkeit

Die bestehenden Spielskalierungen bleiben erhalten:

- Ace: `0.25`
- Bummbert: `0.275`
- Blitzkamm: `0.235`

Bummbert bleibt dadurch sichtbar größer und schwerer, ohne breiter als hoch zu werden. Blitzkamm besitzt bei ähnlicher Höhe die schmalste Silhouette und den schnellsten Gang. Kollision, HP, Geschwindigkeit, Waffenursprung und Klassenmechanik wurden nicht verändert.

## Rückfalloptionen

- Alle neuen Figuren zurücksetzen: `?roosterVisual=legacy`
- Nur Ace: `?aceVisual=legacy`
- Nur Bummbert: `?artilleryVisual=legacy`
- Nur Blitzkamm: `?stormVisual=legacy`

Die unveränderten Legacy-Sheets liegen weiterhin unter:

- `src/assets/characters/rooster-ace-walk-v2.webp`
- `src/assets/characters/rooster-artillery-walk-v3.webp`
- `src/assets/characters/rooster-storm-walk-v3.webp`

## Abnahme und Reproduzierbarkeit

Die isolierte Vorschau `rooster-preview.html` zeigt Bummbert und Blitzkamm auf schwarzem Hintergrund. Beide lassen sich per Figur-, Richtungs- und Modusschalter sowie über WASD/Pfeiltasten testen. Ace bleibt zusätzlich über `ace-preview.html` isoliert prüfbar.

Alle Quellprompts, Chroma-Master, Alpha-Master, Einzelteile, Pose-Daten, Lauf-/Idle-Exporte, Runtime-Atlanten und QA-GIFs sind eingecheckt. Die Assets lassen sich über folgende Befehle reproduzieren:

- `npm run assets:ace-preview`
- `npm run assets:artillery-preview`
- `npm run assets:storm-preview`
- `npm run assets:next-roosters`

## Verifikation

- Charakter-Rigtests: 11/11 bestanden.
- Vollständiger Mechanics-Test einschließlich Klassenwechsel und Richtungen: bestanden.
- Asset-Gate: 132 Runtime-Dateien aktuell.
- Produktions-Build und Produktions-Gate: bestanden; Test-API wird im Build nicht ausgeliefert.
- Isolierte Browser-Vorschau: Bummbert und Blitzkamm ohne Warnungen oder Fehler geladen.
- Legacy-Gesamtrückfall: im lokalen Spiel visuell geprüft.

Die vorhandenen Porträts bleiben vorerst bestehen. Sie sind bereits hochauflösend, passen zu den Klassenfarben und beeinflussen die Bewegungsqualität nicht. Ein späterer Porträtabgleich ist eine eigenständige kosmetische Runde und blockiert die fertige Spielfigurenmigration nicht.
