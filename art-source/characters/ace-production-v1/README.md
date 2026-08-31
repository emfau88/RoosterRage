# Ace – Animation und Silhouette, Revision 02

Stand: 31.08.2026. Abgegrenzter **Südansicht-Prototyp**, kein vollständiger Charakterersatz.

## Entscheidung

Die Gestaltung aus dem [geteilten Chat](https://chatgpt.com/share/6a95a072-cf94-83eb-9d65-4d9ccca6a580) dient als Referenz. Die Animation wurde kontrolliert neu aufgebaut. Einzelne generierte Laufbilder verändern Kopf, Kamm und Ausrüstung zwischen den Frames. Ein festes Set gezeichneter Körperteile vermeidet diese Formwechsel und erlaubt, Laufen mit Schuss oder Treffer zu kombinieren.

Der erste eigene Aufbau war ebenfalls zu breit: kleiner Kopf, massiger Rumpf, seitlich ausladende Flügel und kurze Beine. Nach Nutzerfeedback wurde die Silhouette neu gezeichnet, nicht lediglich horizontal gestaucht:

- Größerer Kopf und deutlicher lesbares Gesicht.
- Engere Schultern, kleinere Schulterkappen, verjüngter Rumpf.
- Flügel näher am Körper, sichtbare Unterschenkel, schmalerer Stand.
- Erhalten: weißes Gefieder, roter Kamm, goldene Rüstungselemente, diagonaler Lederriemen, Pik-Schnalle und zwei helle Eier.

Die alte breite Zusammenstellung bleibt unter `references/rejected-wide-assembly.png` zur Nachvollziehbarkeit erhalten. Das Verzeichnis heißt weiterhin `ace-production-v1`, die aktive Gestaltung ist **Revision 02**.

## Vorschau

Im Projektverzeichnis `npm run dev -- --port 5180 --strictPort` starten und [das Animationsstudio](http://127.0.0.1:5180/character-lab.html) öffnen.

Die Seite zeigt Bestand, Chat-Referenz und neuen Ace nebeneinander, jeweils groß und mit einem 64-Pixel-Frame. Es gibt Lauf/Idle, Schuss/Treffer, Pause/Einzelbild, Tempo, drei Hintergründe und Bezugspunkte. Die Vergleichspause hält das Spieltestfeld nicht an.

Im Testfeld: anklicken, WASD/Pfeile zum Bewegen, Leertaste für Schuss, H für Treffer. Zielpositionen können angeklickt werden; Dauerfeuer lässt sich separat einschalten. Die Figur blickt in diesem Prototyp immer nach Süden. Die tatsächliche `Player`-Klasse liefert Bewegung, Kollision und HP. Die Projektile werden von der isolierten Testszene erzeugt; das ist noch keine Integration in das vollständige Kampfsystem.

## Dateien

- `generated/south-parts-chroma-v2.png`: unverändertes Ergebnis des eingebauten **ImageGen-Werkzeugs**, kein CLI/API-Aufruf.
- `generated/prompt-v2.txt`: exakter finaler Bildprompt, mit Rollen der beiden Referenzen.
- `generated/south-parts-alpha-v2.png`: freigestellte Quelle mit echtem Alpha-Kanal.
- `references/`: gesicherte Bilder aus dem Chat und verworfene breite Zusammenstellung.
- `../../../src` ist **kein** Assetpfad: die konsumierten Einzelteile liegen im Projekt unter `src/assets/characters/ace-production-v1/`.
- `poses.json`: gesampelte Transformationsdaten des Live-Rigs.
- `exports/`: transparente PNG/WebP-Sheets und `animations.json`.
- `docs/qa/ace-production-v1/` im Projekt: neutrale Ansicht, animierte GIFs, Randprüfungen und Browserbelege.

Die sechs Teile sind Körper/Kopf, zwei Flügel, zwei Füße und ein zusätzlicher Wurfflügel. Grafische Neuzeichnung erfolgte mit ImageGen. Die Skripte schneiden zu, entfernen den technischen grünen Hintergrund, verpacken verlustfrei und berechnen Animationstransformationen; sie zeichnen keine neuen Körperdetails.

Für die Alphafreistellung wurde der ImageGen-Skill-Helfer `remove_chroma_key.py` verwendet: Key `#00ff00`, Soft Matte, Transparent-Schwelle 48, Opaque-Schwelle 190, Despill. Das ursprüngliche RGB-Ergebnis bleibt erhalten. Die erste Transparenzanforderung hatte ein gemaltes Schachbrett statt Alpha geliefert; deshalb wurde für die Quelle ein eindeutiger Chroma-Hintergrund verwendet.

## Reproduzierbarer Export

Voraussetzungen: Projektabhängigkeiten, Python mit Pillow. Die freigestellte Quelle ist bereits enthalten; erneute Bildgenerierung ist zum Export nicht nötig.

```text
python scripts/prepare-ace-prototype.py
node scripts/export-ace-poses.mjs
python scripts/render-ace-prototype.py
npm run test:character-lab
npm run build:character-lab
```

Alle Animationen verwenden dieselben unveränderten Körperteile. Ein gemeinsamer Sampler in `src/character-lab/aceSouthPose.js` steuert Canvas-Vergleich, Phaser-Rig und Offline-Export. Frames werden nicht einzeln auf neue Größen normalisiert. Frame: 256 × 256, Spielskalierung 0,25, Ursprung 0,5/0,5. Die vorhandene Physik bleibt bei Radius 58 und Offset 70/86 vor Skalierung.

| Clip | Bilder | Dauer | Verwendung |
| --- | ---: | ---: | --- |
| walk | 24 | 480 ms | Laufzyklus |
| idle | 24 | 2400 ms | zurückhaltende Atmung |
| shot | 13 | 260 ms | visuelle Reaktion auf bereits ausgelösten Schuss |
| hurt | 12 | 240 ms | Trefferreaktion |
| walk-shot | 24 | 480 ms | Kombinationsbeispiel |
| walk-hurt | 24 | 480 ms | Kombinationsbeispiel |

Ein Schuss wird nicht durch ein Animationsende ausgelöst. Die Füße laufen bei Schuss und Treffer weiter. Die kombinierten Sheets dienen zur Prüfung; im Live-Rig werden Ereignisse unabhängig vom Laufzyklus verarbeitet. Schatten liegen separat und sind nicht in die exportierten Sheets eingebrannt.

## Grenzen und nächste Produktionsschritte

Die Südansicht ist gezeichnet und animiert. Nord-, Seiten- und Diagonalansichten sowie Artillery und Storm wurden noch nicht erstellt. Der Stil ist ein überprüfbarer Vorschlag und noch keine vom Nutzer abgenommene endgültige Gestaltung. Das Cutout-Rig zeigt einen ersten Bewegungsstand; weitere Posen oder lokale Verformungen können später den Flügelschlag und Körperrhythmus verfeinern.

Vor einem vollständigen Austausch müssen Perspektive und Proportionen in allen Richtungen zusammenpassen, die Ausrüstung korrekt die Seite wechseln, Bewegungs- und Zielrichtung gemeinsam geprüft und die drei Charaktere in derselben Größenansicht verglichen werden. Die fehlerhafte NW/NE-Zuordnung im bisherigen Turnaround sollte nicht als Produktionsvorlage übernommen werden.

Der normale Spieleinstieg, `Player`, Preload-Logik, Kampfsystem und bisherige Charakterdateien wurden nicht verändert. Der Standard-Build enthält das Labor nicht. `build:character-lab` erstellt einen separaten Prüf-Build in `test-results/character-lab-build/`. Es wurde nichts veröffentlicht.
