# Raketen-Einschläge – Comic-Entwurf 2

Isolierte Vorschau vor dem finalen Einbau. Die neue Studie verändert keine Spielklasse, Schadenswerte, Reichweiten oder Veröffentlichungen. Die bereits lokal vorhandenen Raketen-, Support-Chick- und Build-Arbeiten bleiben unverändert.

## Gestaltung

Der erste realistischere Feuerentwurf wurde auf Nutzerfeedback durch die Comic-Fassung ersetzt. Direkte Stilreferenz sind die vorhandenen Vogelgegner: klare warme Konturen, große Flammenformen, einfache Schattierung und runde Rauchwolken. Die Effekte stehen in der schrägen Spielperspektive auf dem tatsächlichen Farm-Untergrund. Eine vorhandene Gegnerfigur mit unverändertem Maßstab dient zur Einordnung.

| Stufe | Eigenständiger Ablauf |
| --- | --- |
| R1 | Kurzer kompakter Feuerstoß, helle Schalenfragmente, rasches Abklingen |
| R2 | Größerer warmer Feuerball, flache Druckfront und Bodenstaub |
| R3 | Hauptdetonation mit drei versetzten Clustern an den vorhandenen Einschlagspunkten |
| R4 | Breite, flachere orange Feuerfront, schwere Splitter, zwei Druckimpulse und Cluster |
| EVO | Eigene goldene Feuerkrone, doppelte breite Druckwelle, aufsteigende Funken und längere Nachglut |

Zwei mit dem integrierten ImageGen-Tool erstellte Sequenzen enthalten jeweils zwölf gezeichnete Frames. Unregelmäßige Abstände im generierten Quellraster werden beim Laden in ein festes Raster mit gemeinsamem Bodenkontakt überführt. Die vollständigen Silhouetten aller 24 Frames werden auf Beschnitt geprüft. Partikel, Schalenfragmente, Druckwellen, Bodenlicht und Rauchbewegung werden getrennt animiert. Der Boden projiziert Kreise zu flachen Ellipsen; die Höhe aufsteigender Partikel wird unabhängig davon berechnet.

## Ansehen

- `all-in-motion.gif` / `.mp4`: alle fünf neuen Stufen in normaler Geschwindigkeit.
- `evo-in-motion.gif` / `.mp4`: bisherige EVO links, neuer Comic-Entwurf rechts, gleicher Figurenmaßstab.
- `index.html`: interaktive Studie mit Pause, halber Geschwindigkeit und EVO-Vergleich. Über den lokalen Vite-Server unter `/docs/qa/rocket-impact-study-v2/` öffnen.
- `*-webgl-*.png` und `*-canvas-*.png`: Zündung, Feuer, Nachlauf und Rauch in beiden Renderern.

Quellgrafiken und verlustfreie WebP-Exporte liegen in `assets/`. Vollständige Prompts, Referenz und Exporthinweise: `imagegen-prompts.json`.

## Prüfung

`node docs/qa/rocket-impact-study-v2/capture.mjs` prüft und nimmt die Studie auf. `--still` erstellt nur Standbilder. Optional setzt `ROOSTER_CHROMIUM` den lokalen Browserpfad.

Der Ablauf wird in WebGL und Canvas geprüft: geladene Assets, wechselnde Animationsframes, unbeschnittene Quell- und registrierte Frames, vollständiges Abklingen, konstante Objektzahl, angehaltene Sichtprüfung sowie die sichtbaren Pause-/Tempo-/Navigationsknöpfe. Der Git-Diff der vorhandenen Spieländerungen muss vor und nach der Aufnahme identisch sein. Ergebnisse stehen in `verification.json`. Die Animation wird für den Export mit festen Simulationsschritten aufgenommen; diese Aufnahme ist kein Benchmark der Spielleistung.
