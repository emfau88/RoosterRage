# Boss-Feuerball, Laser und Molotov – animierte Entwürfe

04.11.2026. Archiv der isolierten Vorschau. **Die bestätigten Nachher-Effekte sind inzwischen in die Produktionsquellen übernommen.** Dieser Vergleich und seine Vorher-Klassen bleiben unverändert erhalten. Integrationsdetails und Prüfungen: [Map- und Effekt-Update](../../MAP_ENEMY_VARIETY.md). Die folgenden Angaben beschreiben den ursprünglichen Vorschauauftrag.

## Vergleiche

Links bisherige Darstellung, rechts neuer Entwurf. Beide Seiten verwenden denselben Farmboden, dieselbe Kamera, Figurenpositionen und Zeit. Native Größen: Rooster 0,25; Support-Gegner 0,28; Slime 0,2; Boss 0,58. Die GIFs sind lediglich für die Anzeige proportional verkleinert; die MP4-Dateien behalten 1280 × 664 Pixel.

| Vergleich | Animation | Vollständiges Video |
| --- | --- | --- |
| Boss-Feuerball: einzelner Flug und Dreifach-Überlagerung | [GIF](boss-before-after.gif) | [MP4](boss-before-after.mp4) |
| Laser: R2, R4, anschließend EVO | [GIF](laser-before-after.gif) | [MP4](laser-before-after.mp4) |
| Molotov: R3, anschließend beide EVO-Felder | [GIF](molotov-before-after.gif) | [MP4](molotov-before-after.mp4) |
| Gemeinsame Überlagerungsprobe | [GIF](overlap-before-after.gif) | [MP4](overlap-before-after.mp4) |

Interaktiv über den Vite-Server: `/docs/qa/combat-effects-study/`. Effektauswahl, einzelne Stufen R1–R4/EVO, Pause, halbe Geschwindigkeit und Zeitregler sind vorhanden. `?effect=boss`, `?effect=laser`, `?effect=molotov` und `?effect=overlap` wählen die Ansicht; `&renderer=canvas` wechselt zum Canvas-Renderer.

## Gestaltung

- **Boss-Feuerball:** Die tatsächliche Flammenkontur verändert sich, einschließlich der inneren Farbschichten. Kleine, unabhängig flackernde Flammen, zurückbleibende Glut und sparsame Rauchpartikel folgen der Flugrichtung. Der breite geschlossene Warnkreis wird durch engere rote Randakzente ersetzt. Der Treffer ist ein kurzer Comic-Blitz mit Splittern und ausklingender Glut. Bei der ersten Sichtprüfung wurde ein zu kreisförmiger Kern verworfen und in eine gerichtete Flammenform umgebaut.
- **Laser:** Gleiche Strahlrichtungen, Reichweite und Auflade-/Halte-/Ausblendzeiten wie bisher. Farbige Außenkanten, heller Kern, entlanglaufende Energiepakete, bewegte Kontaktfunken und ein kurzer Startimpuls ersetzen die gehaltenen statischen Linien. R1/R2 bleiben einzelne Strahlen, R3/R4 doppelte Strahlen; EVO behält seine drei Farben und erhält stärkere Startimpulse. Die Strahlen laufen mit voller Spielreichweite über den Ausschnitt hinaus, ohne für die Vergleichskarte verkürzt zu werden.
- **Molotov:** Die vorhandenen zwölf Flammenframes bleiben als stilistische Grundlage erhalten. Pro Feld gibt es 10/12/15/16 Flammen für R1–R4 und 21 für EVO, gegenüber bisher 32/40/48/42 beziehungsweise 56. Unterschiedliche Größen, unabhängige Phasen, lebendige Glutlinien und aufsteigende Funken verbinden die Gruppen. Flammen werden gleichmäßig skaliert; nur Bodenlicht und Bodenformen werden perspektivisch abgeflacht. Der geschlossene Rand und die gleichmäßige Flächenfüllung entfallen. R4 bleibt blau, EVO mischt Blau und warme Flammen; die beiden Felder besitzen unterschiedliche Anordnung und Phasen.

Die Umsetzung nutzt Phaser-Geometrie, Partikelbewegung und vorhandene Spielgrafiken. Neue KI-Bitmaps waren hierfür nicht erforderlich. Spiellogik ist in den Entwürfen nicht implementiert; die unveränderten Werte dienen als Maß- und Zeitvorgabe.

Nach der Bewegungsprüfung wurden der erste Laser-Treffer und die Molotov-Zündung gezielt verstärkt: kurze farbige Comic-Ausbrüche mit anschließend abreißenden Funken. Die zunächst zu zurückhaltenden kleinen Glanzpunkte werden damit deutlicher, ohne die laufende Darstellung größer oder dichter zu machen.

## Herkunft des Vorher-Zustands

`baseline/` enthält archivierte Kopien von `EnemyProjectile`, `HazardZone` und `LaserCombAbility` vor diesen Vorschlägen. Nur die relativen Abhängigkeitspfade der archivierten Laserklasse sind an ihren neuen Speicherort angepasst. `baseline.json` speichert die Hashes der Originalquellen und des bereits vorhandenen Produktions-Diffs.

Die Vorher-Darstellung wird mit diesen Klassen erzeugt. Ein isolierter Zeitadapter führt die Laser-Timer und -Tweens aus; die bisherigen Trefferbilder werden ebenfalls angezeigt. Bei Molotov werden die echte Update-Methode, die Original-Frames und die bisherigen Zündungsparameter verwendet. Die Partikel-/Figurenbewegung ist eine reproduzierbare Vorschauchoreografie, kein laufendes Match. Der Boss-Treffer wird nach 1450 ms Flug demonstriert; die Dreifachfolge prüft die Lesbarkeit und ist kein Vorschlag für ein neues Angriffsmuster. Schadenszahlen und Lebenspunkte werden nicht simuliert.

## Prüfung und Grenzen

`capture.mjs` lädt die Vorschau im Browser, prüft WebGL und Canvas, alle fünf Laser-/Molotov-Stufen, endliche Transformationen, gleichmäßige Flammenskalierung, Einfrieren und Bewegen der Darstellung, wiederholte Zeitsprünge ohne anwachsende Objektzahl sowie Pause, Abspielen, Tempo, Stufenwahl und Navigation. Zusätzlich werden fehlgeschlagene Ressourcenanfragen und Browserfehler erfasst. Die Produktionsquellen und der vorhandene Diff müssen unverändert bleiben. Ergebnisse stehen in `verification.json`; die Standbildprüfung ist separat in `verification-stills.json` dokumentiert.

Sichtprüfung: Flug, erster Treffer und Dreifachfolge beim Boss; Aufladen, Entladung und Nachglanz beim Laser; R1, R3, R4/EVO, Zündung, laufende Flammen und Erlöschen bei Molotov; außerdem die gemeinsame Szene mit allen drei Effekten. Im Vergleich bleibt deutlich mehr Boden zwischen den Molotov-Flammen sichtbar, und der Boss-Feuerball hat keine dominierende Kreisfläche mehr. Bei Überlagerungen kreuzen Strahlen weiterhin Figuren; das ist im Spielmaßstab zu erwarten. Es wird keine uneingeschränkte Lesbarkeit sämtlicher denkbarer Kombinationen behauptet.

Die Prüfung betrifft die isolierten Visuals. Produktionsintegration, Kollisions-/Schadensparität nach einem Einbau, Pooling unter Dauerlast und Leistung auf schwachen Mobilgeräten sind nicht Gegenstand dieser Vorschau. Bestehende Releasepakete wurden nicht neu erstellt.

## Reproduzieren

```powershell
$env:ROOSTER_TEST_URL='http://127.0.0.1:5193/'
node docs/qa/combat-effects-study/capture.mjs --still
node docs/qa/combat-effects-study/capture.mjs
```

Optional `--effect=boss`, `--effect=laser`, `--effect=molotov` oder `--effect=overlap`. Einzelbilder werden unter diesem Verzeichnis gespeichert, temporäre Filmframes unter dem ignorierten `test-results/combat-effects-study/`. Export: 30 fps MP4, 20 fps GIF.

Bei parallelen Exporten getrennte Ports verwenden: Ein Testlauf beendet seinen selbst gestarteten Vite-Server beim Abschluss. Ein dadurch unterbrochener Molotov-Export wurde auf Port 5195 fortgesetzt. `--resume` verwendet nur vorhandene Frames, deren Schreibzeit nach der letzten Änderung sämtlicher renderrelevanter Vorschauquellen liegt; ältere Frames werden neu erzeugt. Die finalen Prüfergebnisse und Filmmetadaten werden in `verification.json` zusammengeführt.
