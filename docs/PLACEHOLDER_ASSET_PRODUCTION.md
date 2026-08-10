# Placeholder-Asset Production Pass

Stand: 10.08.2026

## Ergebnis

Die 19 zuvor mit Phaser-Primitiven erzeugten Fallback-Texturen wurden durch finale Bitmap-Assets ersetzt. Die prozedurale `TextureFactory` ist entfernt; alle Texturen werden ueber den regulaeren Asset-Loader geladen und vom Hash-Manifest geprueft.

| Gruppe | Finale Art Sources | Runtime |
| --- | --- | --- |
| Spielerprojektile | `art-source/projectiles/{egg,fire-egg,heavy-egg,storm-egg,golden-egg,molotov-egg,rocket-egg}.png` | `src/assets/projectiles/*.webp` |
| Gegnerprojektile | `art-source/projectiles/{enemy-shot,enemy-purple-shot,enemy-blue-shot,boss-fireball}.png` | `src/assets/projectiles/*.webp` |
| Collectible | `art-source/collectibles/xp-orb.png` | `src/assets/collectibles/xp-orb.webp` |
| Pickups | `art-source/pickups/{pickup-heal,pickup-bomb,pickup-magnet,pickup-elite-chest,pickup-elite-chest-ajar,pickup-elite-chest-open}.png` | `src/assets/pickups/*.webp` |
| Arena-Props | `art-source/map/{arena-crate,arena-bale,arena-wall}.png` | `src/assets/map/*.webp` |

## ImageGen-Modus und Referenzen

Verwendet wurde der eingebaute ImageGen-Modus. Es wurde kein CLI-/API-Fallback eingesetzt.

- `public/marketing/rooster-rage-key-art-master.png`: Premium-Stil, Welt, Licht und Materialqualitaet.
- `art-source/ui/ui-icons-v1-sheet.png`: Icon-Rendering, Konturen und Lesbarkeit bei kleinen Groessen.
- `docs/marketing/screenshots/02-stormcrest-swarm-desktop.png`: echte Gameplay-Kamera und Bildschirmmassstab.
- `docs/marketing/screenshots/03-brood-king-desktop.png`: Bosskampf und Projektil-Hierarchie.
- `art-source/map/arena-ground.png`: Arena-Palette und Top-down-Materialien.

## Finaler Prompt-Satz

Alle Einzelassets wurden mit einem kurzen, produktionstauglichen Schema erzeugt. Fuer transparente Assets galt dieser gemeinsame Rahmen:

> Use case: stylized-concept. Asset type: production game sprite for Rooster Rage. Input images are mandatory references for the premium 3D-painted mobile-game style, lighting, outline and tiny-size readability. Create exactly one isolated object, centered with generous padding and a bold high-contrast silhouette. Scene/backdrop: perfectly flat solid chroma-key background for background removal. Constraints: one uniform background with no shadow, gradient, texture, reflection, floor or lighting variation; crisp edges; do not use the key color in the subject; no cast shadow, text, logo, watermark, border or unrelated particles.

Asset-spezifische Primary Requests:

| Asset | Primary request | Key |
| --- | --- | --- |
| `egg` | Cream-white speckled chicken egg, horizontal, flying right | `#00ff00` |
| `fire-egg` | Intact cream egg with orange ember cracks and compact flame crest, flying right | `#00ff00` |
| `heavy-egg` | Dark-brown artillery egg with bronze-orange armor bands and amber cracks, flying right | `#00ff00` |
| `storm-egg` | Pale-blue egg with cyan lightning markings, nose right and motion tail left | `#ff00ff` |
| `golden-egg` | Radiant faceted golden egg with warm core and star highlight, flying right | `#00ff00` |
| `molotov-egg` | Dark ember-cracked egg with cork cap and short burning fuse | `#00ff00` |
| `rocket-egg` | Cream eggshell rocket, nose right, red-orange fins and exhaust left | `#00ff00` |
| `xp-orb` | Sapphire XP core wrapped by a broken golden eggshell crescent | `#00ff00` |
| `pickup-heal` | Farm first-aid feed pouch with red heart badge, herb sprig and gold trim | `#ff00ff` |
| `pickup-bomb` | Black iron egg bomb with bronze band and short lit fuse | `#00ff00` |
| `pickup-magnet` | Cobalt horseshoe magnet with red pole caps, brass rivets and cyan glow | `#00ff00` |
| `pickup-elite-chest` | Closed dark barn-wood chest with gold bands and glowing egg lock, orthographic 3/4 top-down camera at 55–60 degrees | `#00ff00` |
| `pickup-elite-chest-ajar` | Same chest and footprint, lid half-open at 40–45 degrees, broad golden light gap readable at 48 px | `#00ff00` |
| `pickup-elite-chest-open` | Same chest and footprint, lid fully open at about 75 degrees, simple glowing interior without loose treasure | `#00ff00` |
| `enemy-shot` | Lime slime bolt with luminous core, rear spikes left and nose right | `#ff00ff` |
| `enemy-purple-shot` | Elite violet crystal-slime bolt with white-lilac core, flying right | `#00ff00` |
| `enemy-blue-shot` | Icy cyan eggshell bolt with bright core and rear fins, flying right | `#00ff00` |
| `boss-fireball` | Heavy volcanic brood egg with magma cracks and crown-like rear spikes | `#00ff00` |
| `arena-crate` | Square warm barn-wood crate with brass corners and diagonal X planks | `#00ff00` |
| `arena-bale` | Horizontal golden hay bale with two dark rope bands, orthographic 3/4 top-down view matching the crate | `#00ff00` |

Die Corridor-Wand verwendete einen eigenen Materialprompt ohne Chroma-Key:

> Use case: stylized-concept. Asset type: seamless arena wall texture. Create an edge-to-edge orthographic top-down material of charcoal fieldstone, muted forest-green moss and occasional worn barn-timber braces. Soft neutral diffuse light, restrained contrast, darker than the arena ground. Perfectly seamless on all four edges; no transparent area, isolated object, border, vignette, symbol, text, logo, character, prop or directional cast shadow.

Beim ersten Storm-Egg zeigte der Schweif nach rechts. Ein gezielter `precise-object-edit` kehrte ausschliesslich die dargestellte Flugrichtung um und bewahrte Design, Farbe, Massstab, Magenta-Key und Silhouette.

## Technische Aufbereitung

1. Chroma-Key mit dem ImageGen-Skill-Helper, Soft Matte und Despill in Alpha umwandeln.
2. Sichtbare Alpha-Bounds mit einem Schwellwert von 16 bestimmen.
3. Motiv proportional mit Sicherheitsrand in die bisherigen Runtime-Masse setzen.
4. Arena-Crate auf 128 x 128, Bale auf 192 x 96 und Wall auf 256 x 256 aufbereiten; Gameplay setzt ihre Display-Masse explizit.
5. Runtime-WebPs mit Qualitaet 88 und Alpha-Qualitaet 100 erzeugen und Hash-Manifest aktualisieren.

## Perspektive, Groessen und VFX-Pass

Die Arena ist kein streng senkrechter 90-Grad-Top-down-Look. Figuren und bestehende Props verwenden eine stilisierte orthographische 3/4-Top-down-Perspektive. Darum bleibt die Oberseite eines Props dominant, waehrend eine flache Vorder-/Seitenflaeche Volumen vermittelt.

- Die Crate war bereits ein passender Perspektivanker: grosse Oberseite, flache Front, 70–76 px im Spiel.
- Der alte Bale war zu seitlich. Die neue Fassung zeigt eine dominante Oberseite; seine Display-Hoehe wurde von 46 auf 52 px angehoben, damit er nicht kuenstlich flach wirkt.
- Die alte Elite-Chest war frontlastig und mit etwa 52 px kaum groesser als normale 40-px-Pickups. Die neue Truhe ist 3/4 top-down und wird mit etwa 59 px dargestellt; ihre Kollisionsflaeche bleibt unveraendert bei Radius 18.
- Alle drei Truhenframes verwenden eine 48 x 48 grosse, transparente Canvas, einen gemeinsamen horizontalen Mittelpunkt und denselben unteren Anker. Dadurch springt das Motiv beim Texturwechsel nicht.

Die Oeffnungssequenz dauert 760 ms: Squash/Anticipation, halb geoeffneter Frame, voll geoeffneter Frame, goldener Halo, Ring, Funken, dezentes Kamerawackeln und kurzer Flash. Physik und Schaden pausieren waehrend der Sequenz; das Reward-Overlay oeffnet erst danach. Screen Shake und Flash respektieren die Effekt-Einstellungen.

Weitere gezielte VFX wurden an seltene bzw. wichtige Interaktionen gebunden: gruener Heilungsimpuls, orangefarbener Bombenburst und ein einziehender cyanfarbener Magnetring. XP-Orbs erhalten absichtlich keinen zusaetzlichen Burst, weil ihre hohe Sammelfrequenz sonst visuelles Rauschen erzeugt.

Die finalen ImageGen-Ergaenzungen verwendeten den eingebauten ImageGen-Modus und diese vier Requests:

1. `pickup-elite-chest`: Referenztruhe in eine einzelne Produktionssprite mit orthographischer 3/4-Top-down-Kamera (55–60 Grad), deutlich sichtbarer Deckeloberseite, flacher Front, gleicher Materialidentitaet und Chroma-Key `#00ff00` ueberfuehren.
2. `pickup-elite-chest-ajar`: Nur Deckel, Schlosszustand und Innenlicht aendern; Deckel 40–45 Grad geoeffnet, breite goldene Oeffnung und starke dunkle Trennung fuer Lesbarkeit nach Reduktion auf 48 px; Kamera, Unterteil und Fussabdruck bewahren.
3. `pickup-elite-chest-open`: Nur Deckelposition, Schlosszustand, Innenkante und Licht aendern; Deckel etwa 75 Grad geoeffnet, einfaches dunkelbraunes Inneres mit starkem Goldlicht, keine Muenzen oder Gegenstaende; Kamera, Unterteil und Fussabdruck bewahren.
4. `arena-bale`: Einzelner langer Heuballen mit zwei Seilen, breite Oberseite dominant, nur flache Vorder-/Seitenflaeche, orthographische 3/4-Top-down-Kamera passend zur Crate, fuer 120 x 52 px Display optimiert und Chroma-Key `#00ff00`.

Alle transparenten Assets besitzen transparente Ecken. Asset-Check, Production-Gate, Build, Mechanics, Arena und Smoke bestanden; der echte Browser-Canvas zeigte keine Console-Warnungen oder -Fehler.
