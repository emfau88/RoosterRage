# Übergabe: Finale spielbare Rooster-Charaktere

Übernimm bitte die vollständige gestalterische und technische Fertigstellung der drei spielbaren Charaktere **Ace/Ass**, **Bummbert** und **Blitzkamm** im Projekt:

`C:\Users\madde\Documents\ChatGPT\Rooster\RoosterRage`

Arbeite praktisch im Repository und bringe das Thema bis zu einem belastbaren, professionellen Endstand. Beschränke dich nicht auf eine Einschätzung oder einen weiteren theoretischen Plan. Prüfe zuerst sorgfältig den aktuellen Zustand, entscheide dann selbstständig, welche vorhandenen Teile brauchbar sind und welche sauber neu erstellt werden sollten. Du darfst kontrolliert neu beginnen, vorhandene Gameplay-Rigs umbauen oder beides kombinieren. Entscheidend ist das Ergebnis im tatsächlichen Spiel, nicht die Bewahrung eines bestimmten bisherigen Lösungswegs.

## Ziel

Die drei spielbaren Hähne sollen wie eine zusammengehörige, hochwertige Charakterreihe wirken und im herausgezoomten Desktop- und Mobile-Kampf sofort lesbar sein. Gewünscht sind:

- klare dunkle Außenkonturen und konsistente Detailqualität,
- kompakte, kräftige Silhouetten nach dem Vorbild der Legacy-Figuren,
- anatomisch glaubwürdige Übergänge zwischen Kopf, Rumpf, Armen, Hüfte, Beinen und Schwanz,
- eindeutig lesbare Laufbewegungen in Süd, Nord, Ost und West,
- flüssige, geschlossene Laufzyklen und erkennbare Idle-Animationen,
- korrekte Layerreihenfolge ohne doppelte Arme, Schultern oder abgedeckte Hände,
- gute Wirkung in echter Spielgröße, auch wenn feine Details durch den Zoom verschwinden,
- drei klar unterscheidbare Klassen-Silhouetten.

Die stärkste bisherige Erkenntnis lautet: **Die Legacy-Versionen besitzen überwiegend die bessere Kompaktheit und Grundsilhouette; die aktuellen Gameplay-Versionen besitzen die bessere technische Animationsbasis, Anatomie und Layerstruktur.** Nutze das als wichtige Richtung, aber nicht als starre Vorgabe. Falls eine andere Lösung nach deiner Prüfung professioneller und sicherer ist, entscheide entsprechend und begründe sie kurz.

## Wichtig: aktueller Repository-Zustand

Es gibt umfangreiche **uncommittete und ungetrackte Arbeit**. Nichts davon verwerfen, zurücksetzen oder überschreiben, bevor du `git status --short` geprüft und verstanden hast. Arbeite reversibel. Lies außerdem vorhandene `AGENTS.md`- oder Projektanweisungen, falls es sie gibt.

Die gegenwärtige Standardversion des Spiels ist weiterhin `next`. Die neuen Gameplay-Kandidaten sind über Query-Parameter zuschaltbar:

- isoliertes Labor: `http://127.0.0.1:5180/rooster-preview.html`
- tatsächliches Spiel: `http://127.0.0.1:5180/?roosterVisual=gameplay`

Falls der Server nicht läuft: `npm.cmd run dev -- --port 5180`.

Erhalte Legacy, Next und den bisherigen Gameplay-Stand als Rollback. Baue eine neue Finalfassung möglichst in separaten `*-final`-Assets beziehungsweise hinter `?roosterVisual=final`. Stelle die Standardversion erst um, nachdem die gemeinsame Endkontrolle bestanden ist.

## Vorhandene Varianten

Die im Loader tatsächlich verwendeten Legacy-Sheets sind:

- Ace: `src/assets/characters/rooster-ace-walk-v2.webp`
- Bummbert: `src/assets/characters/rooster-artillery-walk-v3.webp`
- Blitzkamm: `src/assets/characters/rooster-storm-walk-v3.webp`

Zwischenstände:

- `src/assets/characters/ace-next/`
- `src/assets/characters/artillery-next/`
- `src/assets/characters/storm-next/`

Aktuelle Gameplay-Kandidaten:

- `src/assets/characters/ace-gameplay/`
- `src/assets/characters/artillery-gameplay/`
- `src/assets/characters/storm-gameplay/`

Aktuelle Gameplay-Posen/Rigs:

- `src/ace-preview/aceGameplayPose.js`
- `src/artillery-preview/artilleryGameplayPose.js`
- `src/storm-preview/stormGameplayPose.js`

Richtungs-Einzelteile:

- `src/assets/characters/ace-four-direction/`
- `src/assets/characters/artillery-four-direction/`
- `src/assets/characters/storm-four-direction/`

Relevante Pipeline und Integration:

- `scripts/export-ace-gameplay.mjs`
- `scripts/render-ace-gameplay.py`
- `scripts/prepare-gameplay-rooster-parts.py`
- `scripts/export-gameplay-roosters.mjs`
- `scripts/render-gameplay-roosters.py`
- `scripts/render-gameplay-rooster-contact-sheets.py`
- `src/config/aceVisual.js`
- `src/systems/assets/AssetLoader.js`
- `src/systems/assets/AnimationSetup.js`
- `src/entities/Player.js`

Technische Richtungslogik:

- Framegröße: 256 × 256 Pixel.
- Reihen: Süd 0, kanonische Seite 1, gegenüberliegende Seite 2, Nord 3.
- Ace und Bummbert besitzen eine kanonische Westansicht; Ost wird gespiegelt.
- Blitzkamm besitzt eine kanonische Ostansicht; West wird gespiegelt.
- Bummbert und Blitzkamm besitzen im aktuellen Gameplay-Kandidaten acht Laufphasen.
- Ace besitzt aktuell nur vier gebackene Laufphasen und sollte für die finale einheitliche Reihe ebenfalls acht echte Phasen erhalten.
- Alle aktuellen Gameplay-Figuren besitzen Idle-Animationen.

## Finale Vergleichsgrundlage

Sieh dir vor Änderungen unbedingt diese Dateien an:

- `docs/qa/final-rooster-comparison/all-roosters-legacy-next-gameplay-turnaround.png`
- `docs/qa/final-rooster-comparison/all-roosters-legacy-next-gameplay-real-game-scale.png`
- `docs/qa/final-rooster-comparison/ace-legacy-next-gameplay-side-walk.gif`
- `docs/qa/final-rooster-comparison/artillery-legacy-next-gameplay-side-walk.gif`
- `docs/qa/final-rooster-comparison/storm-legacy-next-gameplay-side-walk.gif`
- `docs/qa/final-rooster-comparison/metrics.json`

Das reproduzierbare Vergleichsskript liegt unter:

- `scripts/render-final-rooster-comparison.py`

Weitere QA-Artefakte findest du unter:

- `docs/qa/ace-gameplay/`
- `docs/qa/artillery-gameplay/`
- `docs/qa/storm-gameplay/`
- `docs/qa/gameplay-roosters/`

## Gestalterische Anforderungen pro Charakter

### Ace / Ass

Ace ist die bisher stärkste Gameplay-Basis und soll den Qualitätsmaßstab bilden. Behalte die klare Anatomie, die geballten Hände/Fäuste, die lesbaren Arme und die verbesserten Bewegungen. Hole jedoch die kompakte, voluminöse Wirkung der Legacy-Version zurück.

Besonders wichtig: Die **Schwanzfedern der Legacy-Version gefallen deutlich besser**. Sie sind größer, stärker gefächert, gleichen den großen Kopf aus und machen Ace in Spielgröße klarer als Hahn lesbar. Zeichne für das aktuelle Rig einen neuen, stilistisch passenden Federfächer nach diesem Formprinzip. Nicht einfach das alte Rasterteil hineinkopieren. Der Schwanz muss sichtbar tief am Po ansetzen und darf nicht aus dem Rücken wachsen.

Weitere Ziele:

- etwas breiterer und kompakterer Rumpf,
- Hände/Fäuste beibehalten,
- Schulterpanzer korrekt unter beziehungsweise hinter der anatomischen Schulter,
- Südarme vor Brust und Beinen,
- klare Seitenschritte; die Ost-/West-Fußbewegung war zeitweise schwächer lesbar als Nord/Süd,
- acht echte Laufphasen plus Idle.

### Bummbert

Bummbert darf und soll stämmig, schwer und etwas dick wirken. Die Masse muss jedoch von Hüfte und Beinen glaubwürdig getragen werden. Die Legacy-Version besitzt eine gute kompakte Klassen-Silhouette; die Next-Version wurde zu schmal und hochbeinig.

Bekannte Problemgeschichte:

- doppelte Arme beziehungsweise übereinanderliegende Armteile,
- in Nord scheinbar am Rücken befestigte Arme; von hinten müssen ihre Ansätze auf der verdeckten Vorderseite liegen,
- nach links versetzter Unterbau in Nord,
- nicht sauber verbundene Beine,
- falsche Fußrichtungen und zeitweise rückwärts lesender Seitenlauf,
- zu hoch aus dem Rücken kommender Schwanz,
- zu große oder versetzte Handgelenkmanschette in Ost/West,
- frei schwebender Bauch und hart abgeschnittene Torso-/Hüftkante im Profil.

Der aktuelle experimentelle Stand hat vieles davon verbessert: Nord-Unterbau wurde am sichtbaren Rumpfschwerpunkt zentriert, die Seitenmanschette verkleinert, Faust neu positioniert, Seitenbeine unter den Bauch geschoben und eine bogenförmige Hüftöffnung erzeugt. Dieser Stand ist aber durch mehrere abgeleitete Masken entstanden und noch keine zwingend endgültige Kunstlösung. Für die Finalfassung ist ein **sauber neu gezeichnetes, zusammenhängendes Seitenprofil** professioneller, falls sich die vorhandenen Teile nicht ohne sichtbare Schnittkante integrieren lassen.

Ziel:

- kompakte breite Legacy-Wirkung,
- kurze kräftige Beine,
- Bauch, Becken und Oberschenkel bilden eine zusammenhängende Lastlinie,
- kleine passende Manschetten, aus denen die Hände sichtbar austreten,
- nur ein anatomisch eindeutiges Armpaar,
- tief angesetzter kräftiger Schwanz,
- acht gut lesbare Laufphasen und Idle.

### Blitzkamm

Blitzkamm soll elegant, schnell und leichter als Bummbert wirken, aber nicht zerquetscht oder winzig. Frühere Versionen hatten Schultern fast auf Kopfhöhe, nicht verbundene Beine, falsch gerichtete Seitenfüße und einen zu gedrungenen Körper. Die aktuelle Gameplay-Version hat tiefere Schultern, eine längere Körperachse, korrigierte Füße und acht Phasen. Sie ist im tatsächlichen Spiel aber weiterhin zu klein und zu schmal.

Gemessene sichtbare Seitenbreite in der aktuellen Produktionsscale `0.235`:

- Legacy ungefähr 39–40 Pixel,
- Next ungefähr 27 Pixel,
- Gameplay ungefähr 28–29 Pixel.

Ein guter Ausgangspunkt ist Scale `0.255`. Prüfe diesen Wert im echten Kampf und passe ihn anhand der tatsächlichen sichtbaren Silhouette an. Verbreitere Brust, Hüfte und Armabstand unterhalb des Kopfes moderat, ohne die gerade korrigierte vertikale Eleganz wieder zu zerstören. Gib ihm einen kräftigeren, tief sitzenden Federfächer. Er darf schmaler als Ace und deutlich schmaler als Bummbert bleiben, muss aber in Effekten und Gegnergruppen sofort erkennbar sein.

## Verbindliche Anatomie- und Animationsprüfung

Kontrolliere jede Richtung und jede Phase, nicht nur neutrale Standbilder:

- Süd: Beine hinter dem Rumpf; Arme und Hände sichtbar vor Brust beziehungsweise Oberschenkeln.
- Seite: naher Arm vor Hüfte und nahem Bein; Hand tritt sauber aus der Manschette; Bauch wird von Hüfte/Bein getragen.
- Nord: Armansätze liegen auf der verdeckten Vorderseite und werden vom Rückenrumpf maskiert; Unterbau ist optisch zentriert.
- Schwanzansatz immer am Becken/Po.
- Beide Seitenfüße zeigen in Laufrichtung.
- Der angehobene Fuß schwingt nach vorn, damit kein Moonwalk entsteht.
- Keine schwarzen Risse, harten Schnittlinien, sichtbaren Versätze oder getrennten Alpha-Inseln an Gelenken.
- Keine verdoppelten Schultern, Arme, Hände oder Manschetten.
- Ruhige Idle-Bewegung bei fest verankerten Füßen.
- Loop-Übergang ohne Sprung.

## Empfohlener Ablauf mit nur zwei Abnahmepunkten

1. Sichere den aktuellen Zustand reversibel und prüfe alle Quellen.
2. Erstelle zuerst für **alle drei Figuren gemeinsam** saubere finale neutrale Masteransichten in Süd, Seite und Nord sowie eine Darstellung in echter Spielgröße. Hier müssen Silhouette, Kompaktheit, Schwanz, Körperachsen und Layeransätze stimmen.
3. Zeige diese gemeinsame Tafel als ersten Abnahmepunkt. Sammle alle Korrekturen zusammen, statt jeden Charakter in vielen kleinen Schleifen einzeln zu verändern.
4. Sperre danach die bestätigten Proportionen und zerlege beziehungsweise zeichne die Teile für die Animation.
5. Erstelle für alle drei Figuren acht Laufphasen in vier Richtungen und acht Idle-Phasen.
6. Prüfe Kontaktbögen, Layer und Verbindungen automatisiert und visuell.
7. Zeige als zweiten und letzten Abnahmepunkt eine isolierte Vorschau auf Schwarz, Kontaktbögen und alle drei Figuren im echten Desktop-/Mobile-Kampf.
8. Nach erfolgreicher Endabnahme die Finalfassung als Standard aktivieren, Tests ausführen und sauber committen/pushen. Alle älteren Varianten bleiben als Rollback erhalten.

Falls du nach der Bestandsaufnahme einen effizienteren professionellen Ablauf erkennst, darfst du davon abweichen. Vermeide jedoch weitere Serien aus lokalen Koordinatenkorrekturen, bei denen eine reparierte Stelle an anderer Richtung neue Anatomiefehler erzeugt. Entscheide auf Grundlage vollständiger Renderings und echter Spielgröße.

## Qualitätsprüfungen

Vor der finalen Integration mindestens:

- `npm.cmd run test:character-lab`
- `npm.cmd run assets:check`
- `npm.cmd run build`
- `npm.cmd run test:mechanics`

Der Mechanics-Test erwartet normalerweise einen laufenden Server auf Port 5173; starte dafür bei Bedarf separat `npm.cmd run dev -- --port 5173`. Frühere Charaktertests hatten 23 erfolgreiche Tests. Ein früher paralleler Mechanics-Lauf scheiterte nur durch `ERR_NETWORK_CHANGED`; alleine mit laufendem Port 5173 bestand er anschließend vollständig.

Erweitere die vorhandenen Regressionstests, damit mindestens Richtungsorientierung der Füße, Vorwärtsschwung, Layerreihenfolge, Nordzentrierung, Loop-Schluss und vorhandene Rollback-Assets abgesichert bleiben.

## Definition von fertig

Die Aufgabe ist erst fertig, wenn:

- alle drei Charaktere als zusammengehörige Reihe wirken,
- ihre Rollen schon an der Silhouette erkennbar sind,
- Legacy-Kompaktheit und aktuelle Animationsqualität überzeugend verbunden wurden,
- Ace einen hochwertigen großen Federfächer besitzt,
- Bummbert kompakt, schwer und anatomisch getragen wirkt,
- Blitzkamm elegant, ausreichend groß und im Kampf lesbar ist,
- alle vier Richtungen, acht Laufphasen und Idle sauber funktionieren,
- Desktop und Mobile im echten Kampf geprüft wurden,
- keine sichtbaren Gelenkschnitte, falschen Layer oder Fußrichtungen verbleiben,
- die Integration vollständig reversibel und alle Prüfungen grün sind.

Der Nutzer ist nach vielen Reparaturschleifen verständlicherweise frustriert. Kommuniziere klar, übernimm Verantwortung für die vollständige Umsetzung und liefere überprüfbare Ergebnisse. Bitte nicht nach jedem kleinen Gestaltungsschritt um Rückmeldung; arbeite bis zu den beiden konkreten, vergleichbaren Abnahmepunkten.
