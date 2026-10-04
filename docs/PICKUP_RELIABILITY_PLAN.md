# Pickups: geprüfter Befund und Plan für eine belastbare Korrektur

Stand: 4. Oktober 2026. Ausgangsstand: `2e0522d`, anfangs sauberer Arbeitsbaum.
Status: Phase A implementiert: ein lokal exportierbarer Pickup-Bericht ohne
Änderung an Kontaktregeln oder Effekten. Der reproduzierte Streaming-Fehler ist
weiterhin offen; der gemeldete Live-Ausfall ist noch nicht aufgezeichnet.

Im Spiel nach einem Ausfall **Einstellungen → Pickup report → Save pickup report**
öffnen und die JSON-Datei sichern. Wenn der eingebettete Browser den Download
blockiert, steht derselbe Inhalt im Textfeld zum Kopieren. Das noch im selben
Run oder vor einem Neuladen der Seite tun. Es findet kein automatischer Upload
statt. Build-Dateiname, Seed, Karte, Zoom, Item-IDs, Kontaktquelle und
-abstände, Hindernisse, HP und Effektergebnis werden aufgezeichnet; ein
begrenzter Verlauf bleibt auch über Szenen-Neustarts erhalten.

Der Kontrolltest auf einem Hochformat-Bildschirm wechselt Feed Alley → Harvest
Yard → Feed Alley: Der logische Zoom geht dabei 0,54 → 0,85 → 0,54. Das schließt
einen stehen gebliebenen Feed-Alley-Zoom für diesen Ablauf aus, erklärt den
Pickup-Ausfall auf Harvest Yard aber nicht.

## Was tatsächlich feststeht

### 1. Die öffentliche Vorschau enthält die beiden bisherigen Fixes nicht

Die Antwort von `https://emfau88.github.io/RoosterRage/kongregate/` verweist auf
`index-BQglksFb.js`. Dessen ausgelieferter Code akzeptiert im Physik-Callback
weiterhin nur Truhen (`entity?.chest`) und enthält keinen `getGroundPosition()`-
Helfer. Das wurde anhand der geladenen JavaScript-Datei geprüft, nicht nur anhand
des Dateinamens vermutet.

Die zuletzt bereitgestellten Kongregate-Dateien und der lokal geprüfte Release
enthalten `index-gy77w4LB.js` aus `2e0522d`. Ein Push auf den Arbeitsbranch
aktualisiert die öffentliche Vorschau nicht automatisch. Ob das die vom Nutzer
besuchte Adresse betrifft, ist noch offen. Der Stand eines separaten Kongregate-
Uploads wurde in dieser Untersuchung nicht festgestellt.

### 2. Im neuesten Build existiert ein weiterer, anderer Fehler

Eine zerstörte Kiste kann nach dem Entladen und erneuten Laden ihres
Kartenabschnitts wieder erscheinen. Ein dort liegen gebliebenes Pickup bleibt
an seiner bisherigen Position. Die Kiste belegt jetzt denselben Ort und hält
den Spieler vom Pickup fern.

Ursache in `ArenaSystem`: `assignChunk()` konfiguriert die Hindernisse erneut;
`configureObstacle()` setzt HP zurück und aktiviert den Körper. Der zerstörte
Zustand wird nicht für die ursprüngliche Welt-ID gespeichert. `damageObstacle()`
deaktiviert nur den gerade verwendeten Pool-Slot. Die logische Welt-ID und der
wiederverwendbare Darstellungs-Slot sind nicht dasselbe.

Reproduktion im **gebauten WebGL-Release `index-gy77w4LB.js`**, Seed
`pickup-stream-return`, Desktop Ace:

1. Eine vorhandene Kiste zerstören und den echten Prop-Drop-Pfad verwenden.
   Im Fixture werden nur Zufallswurf und verfügbare Item-Budgets gesteuert.
2. Das Item liegen lassen. Den Spieler für den Test 6.000 Welteinheiten versetzen,
   sodass der echte Chunk-Pool den ursprünglichen Abschnitt entlädt.
3. Zurückkehren: Dieselbe Welt-ID hat wieder eine aktive Kiste mit vollen HP.
4. Mit normaler Tastatureingabe von Norden auf das Item zulaufen: Es bleibt aktiv.
5. Nur die zurückgekehrte Kiste erneut zerstören und weiterlaufen: Das Item wird
   sofort genau einmal aufgenommen. Pickup-Code und Radien werden dabei nicht geändert.

| Karte | Kisten-ID | Pickup-Ort | Befund |
| --- | --- | --- | --- |
| Harvest Yard | `93:94-crate-north` | `65200, 65955` | Kiste zurückgekehrt; blockiertes Pickup nach Zerstörung aufnehmbar |
| Feed Alley | `0:111-crate` | `65266, 66837` | Gleiches Verhalten |

Die Diagnose prüft Health mit fehlenden HP, Magnet und Bombe einzeln auf beiden
Karten. Das ist ein Hindernis-/Weltzustandsfehler, kein Beweis für einen globalen
Pickup-Lock. Ob genau dieser Ablauf den gemeldeten Live-Ausfall erklärt, ist offen.

Ausführbarer Nachweis:

```powershell
$env:ROOSTER_TEST_URL = 'http://127.0.0.1:5176/'
node scripts/diagnose-pickup-streaming.mjs
```

Ergebnis: `test-results/pickup-streaming-audit.json`. Das Skript dokumentiert
beide Zustände und die tatsächliche Bundle-Datei. Es verändert keine Quelldateien
oder Spielstände. Ohne erreichbaren angegebenen Server startet der gemeinsame
Test-Helfer einen lokalen Entwicklungsserver; dann weist das Ergebnis diesen
statt eines Release-Bundles aus. Für Release-Nachweise den gebauten Release bedienen.

### 3. Was weiterhin nicht nachgewiesen ist

- Kein Beleg, dass ein nicht aufgenommenes Health generell spätere Items blockiert.
  Die bisherigen gezielten Tests widersprechen dieser Erklärung in den geprüften Fällen.
- Kein Beleg für eine feste Sperre ab dem dritten, vierten oder fünften Pickup.
- Kein Mitschnitt des jetzt gemeldeten Ausfalls aus dem tatsächlich betroffenen Browser.
- Zwei aktuelle Kontaktwege und die Abhängigkeit von Sprite-/Body-/Fußkoordinaten
  erschweren die Diagnose. Das ist ein Architekturproblem, allein aber kein Beweis
  für die aktuelle Ausfallursache.

## Empfohlenes Vorgehen

### Phase A: Betroffenen Live-Stand und einen Fehlerfall messbar machen (umgesetzt)

Die vollständige Spieladresse und das tatsächlich geladene Bundle feststellen.
Beide Upload-Dateien müssen aus demselben Build stammen. Falls die alte Vorschau
betroffen ist, zuerst den bereits geprüften Stand dort bereitstellen und die
Antwort der veröffentlichten Seite nachprüfen. Kein weiterer Gameplay-Patch
allein aufgrund einer alten veröffentlichten Version.

Der Bericht ist über die Einstellungen erreichbar, auch im eingebetteten Spiel
und auf dem Handy; er braucht keine Konsole. Die Aufzeichnung beginnt mit der
Szene und behält einen begrenzten Verlauf über Neustarts. Sie verändert keine
Kontaktflächen, Spawn-Entscheidungen oder Effekte und verschickt nichts.

Der Bericht enthält pro Run und Item eine eindeutige ID sowie Build, Seed,
Karte, Zoom, Welt-/Grafik-/Physikpositionen, Gruppenstatus, Kontaktquelle und
Abstände, Hindernisse, HP, Magnetlaufzeit und Effektergebnisse. Er hält bis zu
500 Ereignisse und 360 Nähe-Samples vor; ältere Einträge werden verdrängt.

Für die Auswertung des ersten echten Fehlerberichts zusätzlich prüfen:

- Build, Seed, Karte, Figur, Run-Nummer und Spawn-Quelle (Welle/Kiste/Gegner).
- Weltposition, sichtbare Grafik/Bodenfeld, Physikposition und Gruppenmitgliedschaft.
- Spielerpositionen vor/nach dem Physikschritt, Fußpunkt und zulässige Kontakte.
- Kontaktversuch samt Quelle und Ergebnis: kein Kontakt, volle HP, Pause,
  bereits beansprucht, Effekt angewendet oder konkrete Exception.
- Überschneidende Hindernis-IDs mit aktivem Körper und Zustand vor/nach Chunk-Wechsel.
- HP, Magnet-Restzeit, tatsächlich eingesammelte XP, Bombenziele/-treffer und
  verbleibende Gegner; Effektaktivierung getrennt von sichtbarer Rückmeldung.
- Fehler sowie begrenzte Frame-/Pause-Historie, auch über mehrere Runs hinweg.

Abnahme: Ein künstlich unterdrückter Kontakt und der bestätigte Kistenfall müssen
im Bericht unterscheidbar sein. Aufzeichnung an/aus darf denselben deterministischen
Run nicht in Spielzustand oder Zufallsfolge verändern. Ein Export muss im echten
Kongregate-Iframe funktionieren.

### Phase B: Den belegten Weltzustandsfehler isoliert korrigieren

Zerstörte Props nach stabiler Welt-ID für die Dauer eines Runs speichern. Beim
Reaktivieren eines Chunk-Slots den Zustand der neuen Welt-ID anwenden; beim
Run-Neustart den Verlauf zurücksetzen. Kein pauschales Entfernen anderer
Hindernisse und kein Vergrößern der Pickup-Radien als Ersatz.

Für die derzeit endlichen virtuellen Arenen kann der Speicher nach eindeutigen
Prop-IDs begrenzt werden. Pool-Slot-IDs dürfen nicht als Weltschlüssel dienen.
Zusätzliche Spawn-Prüfungen müssen ein tatsächlich freies Ergebnis garantieren;
der bisherige `findSafePoint()`-Fallback auf den Kartenmittelpunkt garantiert das
nicht. Letzteres ist ein Code-Risiko, noch kein separat reproduzierter Ausfall.

Abnahme: Die sechs Diagnosefälle müssen ohne erneutes Kistenzerstören sammeln.
`node scripts/diagnose-pickup-streaming.mjs --expect-fixed` dient als prüfbarer
Vertrag. Ergänzend einen zweiten Chunk mit wiederverwendetem Slot und den nächsten
Run prüfen: Dort dürfen unzerstörte Kisten nicht versehentlich fehlen. Bestehende
Map-Streaming-, Prop-Drop- und Pickup-Tests bleiben erforderlich.

### Phase C: Aufnahme-Kern gezielt ersetzen, falls der Live-Nachweis es erfordert

Nicht zuerst alle Items löschen. Den Ersatz parallel als reine Zustandsberechnung
entwickeln, ohne Effekte zweimal auszuführen. Vor dem Umschalten die Entscheidungen
gegen die aufgezeichneten Fehlerfälle vergleichen und Abweichungen prüfen.

Der neue Kern trennt vier Aufgaben:

1. **Daten und Zustand:** `id`, `runId`, `kind`, stabile Weltposition, Spawn-Quelle,
   `available → claimed → applied → removed`; Health bei vollen HP bleibt
   `available`. Truhen erhalten zusätzlich ihren Opening-/Reward-Zustand.
2. **Kontakt:** Eine gemeinsame Kontaktfunktion mit klarer Koordinatenbasis;
   Bewegung zwischen Physikschritten berücksichtigen. Beim Teleport/Runwechsel
   die vorherige Position zurücksetzen, damit keine Items entlang einer
   Teleportstrecke eingesammelt werden. Die aktuell gültigen Körper- und
   Bodenkontakte bleiben als Akzeptanzfälle erhalten.
3. **Effekt:** Erst eindeutig beanspruchen, dann genau einmal verarbeiten;
   keine zweite Ausführung durch einen weiteren Kontaktweg. Effektergebnis
   protokollieren. Fehlgeschlagene Darstellung darf einen bereits angewendeten
   Effekt nicht erneut freigeben. Fehler innerhalb eines Effekts müssen eine
   explizite Fehlerbehandlung erhalten, keine stille Endlosschleife.
4. **Darstellung:** Grafik, Schweben, Bodenfeld, Lichtstrahl und Richtungsanzeiger
   lesen dieselbe Weltposition. Texturgröße, Animation und Transparenz bestimmen
   niemals die Sammelposition. Vollständiges Cleanup beim Runende.

Nach dem Wechsel alte Aufnahmewege entfernen. Zwei dauerhafte konkurrierende
Implementierungen wären kein abgeschlossener Neuaufbau. Die Karte und ihr
persistenter Hinderniszustand gehören unabhängig davon zum Abnahmeumfang.

## Eigenschaften, die erhalten bleiben müssen

| Bereich | Bestehender Vertrag |
| --- | --- |
| Health | `max(12, round(maxHp × 0.25))`, auf maxHP begrenzt; bei vollen HP liegen lassen; Hinweis höchstens alle 4 s |
| Magnet | Alle XP-Orbs, Geschwindigkeit 560 statt normal 230; `max(bisheriges Ende, jetzt + 8 s)`; Pause verwendet Simulationszeit; zieht keine Spezialitems an |
| Bombe | Normale Gegner erhalten maxHP als Schaden durch den bisherigen Kampfpfad; Elites/Champions ausgenommen, Boss `max(1, round(maxHp × 0.05))`; bestehende Schadensminderung/Unverwundbarkeit erhalten; Todes-Konfetti |
| Budgets | Pro Run 3 Health, 2 Bomben, 2 Magnete; Kisten-Drops verbrauchen dieselben Budgets |
| Wellen | Health W1/60%, Magnet W2/55%, Bombe W3/55%, Health W5/45%, Magnet W6/55%, Bombe W7/60%, Health W9/50% |
| Kisten-Drops | Ab W2, höchstens 3 pro Run und 1 pro Welle; bestehender RNG-/Auswahlpfad einschließlich Budgetanteilen erhalten |
| Truhen | Elite → Elite, Champion → Golden, Boss → Royal; 520-ms-Öffnung, Reward-Queue, Pausen und einmaliger finaler Sieg erhalten |
| Darstellung | Bestehende Assets, Größen, Schweben, Felder, Lichtstrahlen, Audio und HUD-Rückmeldungen erhalten |
| Kontakt | Bestehende gültige Körper-/Fußkontakte erhalten; Bombenradius 11, Health/Magnet 15, Truhen 24; keine unbemerkte Reichweitenvergrößerung |

Die Bombenregel bedeutet ausdrücklich nicht, dass jeder normale Gegner unter
jedem Schutzstatus stirbt: Der aktuelle Kampfpfad kann Schaden reduzieren oder
ablehnen. Ein Umbau darf das nicht beiläufig in eine andere Balanceregel ändern.

## Freigabekriterien statt pauschaler Garantie

- Der aufgezeichnete Live-Ausfall scheitert mit dem alten Stand und besteht mit
  der Korrektur; dieselben Kontakte, Zustände und Effekte werden verglichen.
- Health → Magnet → Bombe → zweite Bombe → Magnet, mehrere liegen gebliebene
  Items, volle/fehlende HP und mehrere Runs nacheinander funktionieren.
- Alle Figuren und Karten; echte Keyboard-/Touch-Bewegung; Desktop/Portrait,
  niedrige Bildrate und einzelne lange Frames; kein Aufsammeln über Teleportwege.
- Chunk verlassen/zurückkehren, Props, Pause/Fokusverlust, Upgrades und gleichzeitige
  Kontakte. Pro Pickup maximal ein Effekt, keine verwaiste sichtbare Grafik.
- Effektprüfungen messen HP, Gegnerzustand und echte XP-Aufnahme, nicht nur Flags.
- Release-Gate im gebauten WebGL-Iframe, inklusive Kongregate/Storage-Fällen.
- Erst danach zusammengehörige `index.html` und Additional-Files-ZIP erzeugen,
  ihren Inhalt gegen den getesteten Build prüfen und den live geladenen Build
  nach dem Upload bestätigen. Danach Commit/Push des freigegebenen Stands.

Empfehlung: Zuerst A und B. Den Aufnahme-Kern nur dann ersetzen, wenn der konkrete
Live-Nachweis oder die Zustandsprüfung diesen zusätzlichen Eingriff rechtfertigt.
Eine garantierte Fehlerfreiheit lässt sich auch mit einem kompletten Neubau nicht
versprechen; diese Nachweise machen die Behebung überprüfbar und verhindern weitere
Korrekturen auf bloßen Verdacht.
