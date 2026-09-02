# Abnahmepunkt 2: finale Animation und In-Game-Integration

Status: gemeinsam freigegeben und als Produktionsstandard aktiviert. Die
Finalfassung lädt ohne Query-Parameter; Legacy, Next und Gameplay bleiben über
Query-Parameter vollständig reversibel.

## Ergebnis

- Ace / Ass, Bummbert und Blitzkamm besitzen je vier Richtungen mit acht echten
  Lauf- und acht echten Idle-Phasen.
- Laufdauern: Ace `520 ms`, Bummbert `650 ms`, Blitzkamm `480 ms`.
- Idle-Dauern: Ace `2800 ms`, Bummbert `3200 ms`, Blitzkamm `2400 ms`.
- Der seitliche Schritt beträgt in Produktionsgröße ungefähr `10.21 px`,
  `10.45 px` und `9.69 px` und bleibt damit auch im herausgezoomten Kampf
  wahrnehmbar.
- Der Körperschwerpunkt ist rollenspezifisch abgestimmt: Ace ungefähr `2.11 px`
  Hub, Bummbert `1.38 px`, Blitzkamm `2.04 px`. Bummbert trägt seine Masse über
  längere Kontaktphasen statt über einen leichten Hüpfzyklus.
- Der Seitenlauf schwingt den angehobenen Fuß in Laufrichtung; ein früher im
  Ace-Gameplay-Rig vorhandener rückwärts lesender Fußbogen ist korrigiert.
- Bummberts Seitenfaust ist nicht mehr frei angesetzt. Faust und Body teilen
  dieselbe Rotation; die Faust ist mit festem lokalen Offset direkt in der
  Manschette verankert. Der Regressionstest prüft beide Seiten über 32 Phasen.

## Lesbarkeit gegenüber Legacy

Die Verbesserung kommt nicht nur aus einer höheren Framezahl. Legacy bleibt
als kompakte Silhouettenreferenz erhalten, während Final zusätzlich eine
lesbare Kontakt-/Flugphase, klare Schwerpunktverlagerung und ruhigen
Feder-Nachlauf besitzt. Große, kontrastreiche Primärformen tragen die
Erkennbarkeit in kleiner Spielgröße:

- Ace: großer heller Federfächer als Gegengewicht zum Kopf.
- Bummbert: geschlossene orange-schwarze Körpermasse, kurze Standbeine und
  niedriger Bewegungsimpuls.
- Blitzkamm: hoher Cyan-Kamm und tiefer Fächer bei finaler Scale `0.255`.

## Prüfbilder

- `final-in-game-desktop-mobile.png`: echter Kampf bei 1440 × 900 und
  390 × 844 für alle drei Figuren.
- `ace-final-walk-contacts.png`, `artillery-final-walk-contacts.png` und
  `storm-final-walk-contacts.png`: alle vier Richtungen und acht Laufphasen.
- Entsprechende `*-idle-contacts.png`: alle vier Idle-Zyklen.
- 24 einzelne GIFs dokumentieren Lauf und Idle je Richtung.
- `final-asset-check.json`: acht unterschiedliche Runtime-Frames je Clip,
  sichere Alpha-Ränder und Größenbereiche.
- `in-game/capture-report.json`: aktive Final-Sheets, Animation, Frame und
  Scale jedes Desktop-/Mobile-Captures.

## Automatisierte Abnahme

- `npm.cmd run test:character-lab`: 30/30 bestanden.
- `npm.cmd run assets:check`: 132 Runtime-Assets aktuell.
- `npm.cmd run build`: bestanden.
- `npm.cmd run test:mechanics`: 13/13 Prüfabschnitte bestanden, einschließlich
  Klassen, Mobile-Hierarchie, Effektlesbarkeit und Horde-Feedback.
- `npm.cmd run qa:final-roosters`: sechs reproduzierbare Live-Captures und eine
  gemeinsame Abnahmetafel erzeugt.

## Rollback und nächster Schritt

Legacy, Next und Gameplay wurden nicht ersetzt. Globaler Rollback:
`?roosterVisual=legacy`, `?roosterVisual=next` oder `?roosterVisual=gameplay`.
Einzelne Figuren können weiterhin über `?aceVisual=…`,
`?artilleryVisual=…` und `?stormVisual=…` umgeschaltet werden.
