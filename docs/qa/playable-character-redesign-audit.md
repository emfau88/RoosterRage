# Audit: Überarbeitung der spielbaren Charaktere

Stand: 31.08.2026

## Ursprüngliches Ziel

Die drei spielbaren Charaktere Ace, Artillery und Storm sollen optisch auf ein einheitliches, hochwertiges Niveau gebracht und im normalen Spiel vollständig ersetzt werden. Dazu gehören konsistente Ansichten, Laufbewegung, Lesbarkeit in Spielgröße, passende Porträts und eine abgesicherte Integration.

## Tatsächlicher Stand

Der geteilte Chat und die vorhandenen Spielgrafiken wurden geprüft. Für Ace existiert ein kontrolliert neu aufgebauter Prototyp der Südansicht. Er verwendet sechs unveränderte Bildteile und kann Laufen, Idle, Schuss und Treffer kombinieren. Nach dem Feedback zur zu breiten ersten Fassung wurde Ace mit größerem Kopf, engeren Schultern, kleinerem Rumpf und sichtbaren Beinen neu gezeichnet.

Dieser Stand lebt ausschließlich im separaten `character-lab`. Der normale Spieleinstieg lädt weiterhin:

- `rooster-ace-walk-v2.webp`
- `rooster-artillery-walk-v3.webp`
- `rooster-storm-walk-v3.webp`

Die produktiven Dateien `AssetLoader.js`, `AnimationSetup.js`, `Player.js`, die Charakterdefinitionen und die Porträts wurden nicht auf die neue Grafik umgestellt.

## Produktionsmatrix

Das Spiel benötigt pro Charakter drei gezeichnete Richtungsgrundlagen: Süd, West und Nord. Ost wird aus der Westansicht gespiegelt. Das ergibt neun Richtungsgrundlagen für drei Charaktere.

| Charakter | Süd | West/Ost | Nord | Porträt | Normales Spiel |
| --- | --- | --- | --- | --- | --- |
| Ace | Prototyp Revision 02 | West erstellt, Ost gespiegelt | Prototyp erstellt | alt | nicht integriert |
| Artillery | fehlt | fehlt | fehlt | alt | nicht integriert |
| Storm | fehlt | fehlt | fehlt | alt | nicht integriert |

### Messbarer Fortschritt

- Referenz- und Technikprüfung: abgeschlossen.
- Gezeichnete Richtungsgrundlagen: **3 von 9** als Prototyp, rund 33 %.
- Vollständige Charaktere: **0 von 3**.
- Neue Porträts: **0 von 3**.
- Produktive Integration: **0 von 3**.
- Isolierte technische QA: Ace Süd besteht drei Sampler-Tests und einen separaten Phaser-Spieltest.
- QA im vollständigen Spiel: noch nicht begonnen.

Über den Gesamtauftrag betrachtet liegt der Stand nach der Vier-Richtungs-Vorschau ungefähr bei **30 %**. Ace kann isoliert in alle Richtungen laufen und idlen, ist aber noch nicht abgenommen oder produktiv integriert; Artillery und Storm fehlen weiterhin.

## Was am Ace-Prototyp bereits funktioniert

- Ein konsistenter Körper statt voneinander abweichender, vollständig neu generierter Frames.
- Überarbeitete schlankere Silhouette nach Nutzerfeedback.
- Gemeinsamer Pose-Sampler für Browservergleich, Phaser-Rig und Offline-Export.
- Lauf, Idle, Schuss, Treffer und kombinierte Prüfansichten.
- Weiterlaufende Füße während Schuss und Treffer; Gameplay-Ereignisse hängen nicht vom Animationsende ab.
- Transparente PNG/WebP-Exporte, GIF-Prüfdateien und Randprüfung ohne abgeschnittene Konturen.
- Der reguläre Produktions-Build bleibt unverändert lauffähig.

## Was noch zu tun ist

### 1. Verbindlicher Stilstandard

Vor weiterer Serienproduktion müssen alle drei Charaktere in einer gemeinsamen neutralen Südansicht verglichen werden. Ace soll der bewegliche Allrounder bleiben, Artillery darf massiger sein, Storm muss am leichtesten und schnellsten wirken. Kopfgröße, Schulterbreite, Körperhöhe, Bodenlinie, Strichstärke, Beleuchtung, Farbsättigung und Detaildichte brauchen feste Grenzen. So wird die beanstandete breite Silhouette nicht bei den anderen Figuren wiederholt.

### 2. Ace abnehmen und integrieren

- Lauf und Idle in der isolierten Vier-Richtungs-Vorschau abnehmen.
- Danach Schuss und Treffer für alle Richtungen ergänzen.
- Bewegungsrichtung und unabhängige Zielrichtung im echten Kampfsystem lösen.
- Neue Auswahl-/HUD-Porträtgrafik im selben Design erstellen.
- Erst danach die alten Ace-Assets im normalen Spiel ersetzen.

### 3. Artillery und Storm produzieren

- Je einen verbindlichen Master im gemeinsamen Stil erstellen.
- Je Süd, West/Ost und Nord als konsistente Teile oder verlässlich kontrollierte Sheets produzieren.
- Klassensilhouetten erhalten: Artillery schwer und robust, Storm schlank und schnell, ohne Ace-Körper lediglich umzufärben.
- Lauf- und Aktionsreaktionen auf ihr Spieltempo abstimmen.
- Porträts ersetzen.

### 4. Produktive Integration

- AssetLoader und AnimationSetup auf die finalen Dateien umstellen.
- Player-Visualisierung so erweitern, dass Aktionen die Bewegung nicht blockieren.
- Skalierung, Ursprung, Kollisionskörper, HP-Leiste, Schatten, Tiefensortierung und horizontales Spiegeln pro Charakter prüfen.
- Alte Dateien erst nach erfolgreicher Migration entfernen oder als Rückfallversion behalten.

### 5. Vollständige QA

- Alle drei Charaktere in Auswahl, Arena, Koop und unterschiedlichen Hintergründen prüfen.
- Stand, vier Bewegungsrichtungen, diagonale Bewegung, Schuss während Bewegung, Treffer, Tod/Second Wind und Klassenwechsel prüfen.
- 64-Pixel-Lesbarkeit, Flimmern, Konturdrift, Zubehörseite und Bodenkontakt frameweise kontrollieren.
- Performance und Speicherverbrauch auf Desktop und schmalem Viewport messen.
- Standard-Build, Produktions-Gates und Browser-Smoke-Tests ausführen.

## Empfohlene Reihenfolge

1. Gemeinsames Silhouettenblatt der drei Charaktere in Südansicht erstellen.
2. Ace-Turnaround Süd/West/Nord abschließen und in echter Spielgröße abnehmen.
3. Ace vollständig integrieren und den technischen Weg im normalen Spiel absichern.
4. Artillery und Storm mit derselben Pipeline umsetzen.
5. Porträts, Gesamtvergleich und vollständige QA abschließen.

Die Chat-Turnaround-Vorlage darf nicht ungeprüft übernommen werden: In der dortigen Acht-Richtungs-Fassung zeigen NW und NE dieselbe Rückseite. Für das Spiel genügen drei sauber gezeichnete Richtungsgrundlagen; das ist effizienter und passt zur bestehenden Spiegelungslogik.
