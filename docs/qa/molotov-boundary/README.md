# Molotov: Brandfläche und Stufenlesbarkeit

3. Oktober 2026. Vorher: HazardZone aus Basis `8bbe41f`. [Direktvergleich](index.html).

| Stufe | Kleine Flammen vorher → nachher | Tatsächlicher Radius pro Feld |
| --- | --- | --- |
| 1 | 4 → 32 | 90 |
| 2 | 6 → 40 | 108 |
| 3 | 8 → 48 | 124 |
| 4 | 2 × 5 → 2 × 42, blau | 112 |
| Evolution | 2 × 6 → 2 × 56, blau/orange | 136 |

Neue Flammen füllen schon auf Stufe 1 Rand und Mitte der vorhandenen ovalen Bodenfläche. Eine Sonnenblumen-Verteilung vermeidet große Lücken und sichtbare innere Ringe. Kleine und größere Flammen, versetzte Animationsphasen und Spiegelung lockern die Fläche auf. Bestehende Sprites und Farben bleiben erhalten. Bodenperspektive, Boden-/Randgrößen, dezentes Pulsieren und Transparenz entsprechen der vorherigen Version. Die aufrechte Höhe der Flammen ist Darstellung, keine zusätzliche Trefferfläche.

Schaden, Tick-Abstand, Brenndauer, Radius, Wurfzahl, Zielwahl und Cooldown wurden nicht geändert. Stufe 4 wird durch zwei Felder mächtiger; ihr Einzelradius ist absichtlich nicht größer als Stufe 3. Keine neue Balance, keine neuen Bitmap-Downloads.

## Prüfung

- Bestehender Waffen-Progressionstest: alle Waffen, Molotov-Ränge 1–4 und Evolution, reale Flug-/Feldzahl, Animation, Schaden, unterschiedliche Flammengrößen, Randabdeckung in acht Sektoren und dichte Besiedlung anhand eines Rasters über der ovalen Fläche.
- `node scripts/capture-molotov-boundary.mjs`: beide Release-Builds, alle fünf Stufen, Desktop 960 × 540 und Hochformat 390 × 844. Gleiche Kamera und Animationsphase. Pro Feld je acht Gegner einen Pixel innerhalb und außerhalb des Radius: Nur die inneren werden getroffen und angezündet. Schadenswerte, Tick, Lebensdauer und Bodenbreite/-höhe stimmen zwischen vorher/nachher überein. Ausgelaufene Felder entfernen Boden, Rand und alle Flammen.
- `python scripts/render-molotov-boundary.py`: für jede Stufe ein Bild mit Vorher/Nachher nebeneinander; Rohbilder liegen lokal unter `test-results/molotov-boundary/frames`. Der Vorher-Build liegt unter `test-results/molotov-boundary/before-release` und muss vor einem erneuten Capture bereitgestellt werden.
- Release-/Assetbudget und Mechanik-/Produkt-/Smoke-Prüfungen vor Veröffentlichung. Echte Mobilgeräte bleiben als separate Release-Abnahme offen; die Bilder simulieren Viewports.

## Beurteilung

Die neue Variante zeigt schon auf Stufe 1 ein dichtes Feuerfeld statt einiger isolierter Flammen. Die alte Bodenperspektive bleibt erhalten. Die Stufensteigerung ist durch Dichte, Flammengröße, Doppelfelder und die vorhandene blaue Flamme klarer. Zusätzliche Rauchwolken würden die Lesbarkeit verschlechtern. Weitere Spektakel-Effekte sollten separat im vollen Kampf bewertet werden.
