# Phase 19 - Character Art und HUD Production Pass

Stand: 10.08.2026

## Ziel

Der spielbare Build uebernimmt die drei klaren Rooster-Identitaeten des Key Arts, behaelt aber das kompakte Figurenformat und das technische 4-x-4-Raster des bisherigen Ingame-Sheets. Das HUD priorisiert Klassenidentitaet, HP/XP und aktuelle Run-Informationen, ohne Mobile-Sichtflaeche zu verlieren.

## Finale Assets

| Klasse | Art Source Sheet | Runtime Sheet | Portraet |
| --- | --- | --- | --- |
| Barnyard Ace | `art-source/characters/rooster-ace-walk.png` | `src/assets/characters/rooster-ace-walk.webp` | `src/assets/characters/rooster-ace-portrait.webp` |
| Boombardier | `art-source/characters/rooster-artillery-walk.png` | `src/assets/characters/rooster-artillery-walk.webp` | `src/assets/characters/rooster-artillery-portrait.webp` |
| Stormcrest | `art-source/characters/rooster-storm-walk.png` | `src/assets/characters/rooster-storm-walk.webp` | `src/assets/characters/rooster-storm-portrait.webp` |

Alle Sheets sind 1024 x 1024 Pixel gross. Jede der 16 Zellen ist 256 x 256 Pixel gross; die Reihenfolge lautet Sued, West, Ost und Nord mit jeweils vier Laufphasen. Die Portraets sind 512 x 512 Pixel gross.

## ImageGen-Modus und Referenzen

Verwendet wurde der eingebaute ImageGen-Modus. Es wurde kein CLI-/API-Fallback eingesetzt.

- `public/marketing/rooster-rage-key-art-master.png`: Identitaet, Farben, Kleidung und Premium-Stil.
- `art-source/characters/rooster-walk-v2.png`: verbindliche Proportion, Blickwinkel, Zellbelegung und Richtungsreihenfolge.
- Das jeweils final ausgewaehlte Klassensheet diente zusaetzlich als Identitaetsreferenz fuer das zugehoerige Portraet.

## Finaler Prompt-Satz

### Richtungssheets

Fuer jede Klasse wurde derselbe Produktionsprompt mit klassenbezogenen Variablen verwendet:

> Use case: stylized-concept. Asset type: production game character sprite sheet, exact 4 columns by 4 rows. Image 1 is the identity, costume and color reference; use the [CLASS CHARACTER] as [CLASS NAME]. Image 2 is the mandatory sprite proportions, camera angle, frame occupancy, spacing and 4x4 layout reference. Create a 16-frame directional walk sheet as a compact super-deformed rooster. Each complete rooster silhouette must be approximately as wide as it is tall, with oversized head and chest, broad feather body, very short legs, large feet, compact wing-arms and low center of gravity. Absolutely no tall humanoid body, long torso, long arms or long trousers. Use a perfectly flat solid #00ff00 chroma-key background. Match the premium polished 3D-painted mobile game style and compact top-down three-quarter view. Row 1 south/front, row 2 west/left, row 3 east/right, row 4 north/back, four walk poses per row. Exactly 16 isolated poses; one rooster per cell; identical scale, baseline and padding; no attacks, projectiles, enemies, text, logo, watermark, shadow, floor, scenery, border, grid line, cropping or overlap.

Klassenvariablen:

- Ace: weiss-goldener Marksman, rote Haube, Zielverhaeltnis 0,9-1,1.
- Boombardier: orange-cremefarbener schwerer Artillerie-Rooster mit Bronzeplatten, Zielverhaeltnis 1,05-1,2.
- Stormcrest: weiss-cyan-blauer agiler Storm-Rooster mit kompaktem Gewand, Zielverhaeltnis 0,95-1,1.

### Menueportraets

> Use case: stylized-concept. Asset type: square main-menu character portrait. Image 1 defines the premium Rooster Rage key-art style and class identity. Image 2 defines the final compact ingame character design. Create one polished hero portrait of [CLASS NAME] for a mobile game roster card. Square centered head-and-upper-torso three-quarter portrait, full comb/crest and shoulder silhouette visible, circular-crop safe with generous edge padding. Use a deep charcoal-to-[CLASS COLOR] radial backdrop with a restrained feather/storm/ember motif and soft rim glow. One rooster only; no attacks, projectiles, weapon, enemy, text, logo, watermark, UI, border or cropped comb.

## Technische Aufbereitung

1. ImageGen-Rohsheets auf uniformem `#00ff00` erzeugen.
2. Chroma-Key mit dem ImageGen-Skill-Helper, Soft Matte und Despill in Alpha umwandeln.
3. Jede der 16 Zellen separat anhand ihrer Alpha-Bounding-Box freistellen.
4. Figur proportional in eine 214-x-214-Sicherheitsflaeche setzen und auf gemeinsamer Baseline normalisieren.
5. Sheets auf 1024 x 1024, Portraets auf 512 x 512 schreiben.
6. Runtime-WebPs mit Qualitaet 88 und Alpha-Qualitaet 100 erzeugen und Hash-Manifest aktualisieren.

Gemessene Zellverhaeltnisse Breite/Hoehe:

- Ace: 0,80 bis 0,90
- Boombardier: 0,88 bis 1,23
- Stormcrest: 0,78 bis 0,95

Keine Zelle beruehrt ihren 256-x-256-Rand. Alle 48 Zellen besitzen einen nichtleeren Alphabereich.

## UI-Ergebnis

- Eigene Klassenportraets in Hennenhuette und Gameplay-HUD.
- Dunkle, klassenfarbene Roster-Karten mit grossem Charakterfokus.
- Sichtbare HP- und XP-Leisten im Cockpit statt ausschliesslich einer kleinen Welt-HP-Leiste.
- Runzeit, Welle, Fortschritt und Kills als priorisierte Instrumente.
- Loadout und Bossleiste bleiben eigenstaendig lesbar.
- Browser-Gates sichern maximal 125 px HUD-Hoehe in Portrait und 90 px in niedrigem Landscape.

## Offene menschliche Abnahme

Die technische und visuelle Produktion ersetzt nicht den angekuendigten manuellen End-to-End-Test oder die zehn externen Phase-17-Tests. Insbesondere subjektive Lesbarkeit, Sympathie der drei Figuren und Touch-Komfort werden dort bewertet.
