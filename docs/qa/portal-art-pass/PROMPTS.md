# ImageGen: Quellen und Promptvorgaben

Fünf neue Bitmap-Assets wurden mit dem eingebauten ImageGen-Tool erzeugt. Die vorhandenen Assets dienten als Bildreferenzen; die Kiste erhielt zusätzlich die vorhandene Stilreferenz des Spiels. Die folgenden Vorgaben dokumentieren den Promptinhalt für eine erneute Erzeugung, keine Garantie identischer Generatorausgabe.

## Gemeinsame Vorgaben

Top-down-Farmspiel mit leicht sichtbaren oberen Objektflächen. Licht weich von links oben, Schatten nach rechts unten. Gedämpfte Erd- und Naturfarben, saubere Außenkonturen, weichere Innenzeichnung, lesbar bei tatsächlicher Spielgröße. Kein Text, Symbol, Glühen oder zusätzliches Objekt. Geometrie und Orientierung der Bildreferenz erhalten.

## Kiste

Edit the referenced square wooden crate. Preserve the square silhouette, crossed wooden braces, corner fittings, raised top-down viewpoint and north-up orientation. Restrained painterly wood, softer interior grain, clear dark-brown outer contour. Soft upper-left light, minimal lower-right contact shadow, muted worn brass instead of bright metal. Legible at 68 × 68 game pixels. Transparent background; no ground, halo, text or other objects.

## Heuballen

Edit the referenced horizontal rectangular hay bale with an approximately 2:1 silhouette and two rope bands at one-quarter and three-quarters of its length. Preserve orientation and raised top-down viewpoint. Group straw into calmer readable masses, reduce individual scratch lines, shade the underside. Soft upper-left light, warm oat and muted golden-tan colors instead of saturated yellow. Legible at 118 × 52 game pixels. Transparent background; no halo, ground or other props.

## Boden A

Edit the referenced farm ground into a compatible quiet tile. Muted tan and olive, painterly, low contrast, overhead view and soft upper-left light. Preserve the outer ten percent. Remove flowers in the center, reduce central grass by about half and move small clusters. About seventy percent quiet earth with very faint broad wear. No path, tracks, props or large rocks. Keep average brightness and edge compatibility.

## Boden B

Create a compatible variant of the referenced farm ground with the same overall style, palette, brightness and detail scale. Preserve the outer twelve percent. Place small tufts in the upper middle and left middle, reduce grass in the lower middle, remove flowers in the interior. About seventy percent bare earth. No bright or dark band, path, tracks or objects.

## Boden C

Create a compatible variant of the referenced farm ground with the same style, palette, brightness and perimeter. Preserve the outer twelve percent. Tiny tufts in the upper right and lower left, about eighty percent quiet earth, no interior flowers. Faint irregular dust, no circular clearing, band, path, tracks or objects.

## Aufbewahrung und Export

- Unveränderte ImageGen-Ergebnisse: `art-source/map/portal-v3/*-generated.png`.
- Auf Laufzeitgröße normalisierte PNGs: `art-source/map/portal-v3/{crate,bale,ground-a,ground-b,ground-c}.png`.
- Neue WebP-Dateien: `src/assets/map/portal-v3/`.
- Export: `scripts/export-portal-map-assets.py`. Kiste 128 × 128, Heuballen 192 × 96; sichtbarer Alpha-Fußabdruck an die bisherigen Assets angepasst. Böden 700 × 700. WebP-Qualität 88.
- SHA-256 und Abmessungen: `src/assets/runtime-assets.json`.
- Die drei Bodenvarianten verwenden zur Laufzeit den unveränderten Außenrand des klassischen Bodens und einen weichen Übergang zum neuen Inneren. ImageGen allein garantiert keine passenden Kachelübergänge.
- Alle bisherigen Quelldateien und Laufzeitbilder bleiben unverändert erhalten.
