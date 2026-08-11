# Enemy Animation Polish

Status: abgeschlossen am 11.08.2026.

## Ergebnis

- Brood Tender und Nest Caller besitzen eigene, transparent freigestellte
  4-Zustands-Sheets statt eingefärbter Spitter-Grafik.
- Brute, Spitter, Fan-Spitter, Bomber, Support, Summoner, Elite-Brute und
  Elite-Spitter verwenden `move`, `windup`, `resolve` und `recovery`.
- Windup und Resolve werden von der tatsächlichen Angriffslogik gesteuert;
  die Animation ist damit ein lesbarer Telegraph und kein Dauer-Loop.
- Der Bomber zeigt während seiner Explosion zusätzlich den scharf lesbaren
  bewaffneten Zustand.

## Runtime-Budget

- Quellsheets: 1024 × 256 px, vier gleich große Frames.
- Runtime: WebP, 256 × 256 px pro Frame.
- Brood Tender: ca. 54 KB; Nest Caller: ca. 52 KB.
- Darstellung im Kampf: ca. 72–78 px; Collider und HP-Balken bleiben kleiner
  als die sichtbare Silhouette.

## Asset-Herkunft

Die beiden Figuren wurden im Chroma-Key-Modus generiert, anschließend lokal
freigestellt, auf gemeinsame Grundlinie normalisiert und als Spritesheet
optimiert. Verwendete Arbeits-Prompts:

- Brood Tender: freundliche, aber kampflesbare mint/cremefarbene Hennen-
  Supportfigur im handgemalten Rooster-Rage-Stil; vier horizontale Zustände
  Bewegung, Aufladung, Heilauslösung und Erholung; Magenta-Key-Hintergrund.
- Nest Caller: düstere avianische Beschwörerfigur mit Eierschalenkapuze,
  violettem Kern und Stab; vier horizontale Zustände Bewegung, Aufladung,
  Beschwörung und Erholung; Grün-Key-Hintergrund.

Quellen liegen unter `art-source/enemies/generated/`, die aufbereiteten Sheets
unter `art-source/enemies/animations/`.

## Abnahme

- `npm run assets:check`
- `npm run build`
- `npm run test:encounter`
- Laufzeit-Screenshot in mobiler Portrait-Auflösung

Der Brood Tender bleibt absichtlich heller als andere Gegner, wird in echter
Spielgröße aber durch roten HP-Balken, grünen Wirkungsradius und gegnerische
Bewegung eindeutig als prioritäres Supportziel gelesen. Der Nest Caller ist
bereits über Silhouette und violetten Telegraph eindeutig feindlich.
