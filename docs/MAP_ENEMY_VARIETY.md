# Map- und Effekt-Update vom 04.11.2026

Die freigegebenen Gegner-Skins und zwei Verhaltensvarianten sind im normalen Spiel aktiv. Die beiden Folgemaps erhalten eine erkennbare Gewichtung, Harvest Yard eine gemischte Auswahl.

## Begrenzter Umfang

- 20 Prozent der bisherigen Kornkrabbler pro Welle erhalten einen neuen Skin (auf ganze Gegner gerundet). Werte, Körpergröße, Kollision und Rolle bleiben gleich.
- Welle 1 erhält einen zusätzlichen Kornkrabbler; Wellen 2, 3 und 4 erhalten zwei, drei und vier Zusatzgegner, darunter jeweils genau einen besonderen Gegner.
- Wellen 5–9 erhalten drei bis fünf Extras, darunter ein bis zwei besondere Gegner. Keine unbegrenzte Steigerung. Welle 10 mit dem Boss bleibt unverändert.
- Rammer werden ab Welle 2 eingeführt, Stampfer ab Welle 4. Feed Alley bevorzugt die blauen Varianten und Rammer mit 85 Prozent; Coop Square entsprechend die pflaumenfarbenen Varianten und Stampfer. Harvest Yard mischt 50/50. Vor Welle 4 gibt es ausschließlich Rammer als neue Spezialgegner.
- Extras werden über die Welle verteilt, vor ihren bisherigen Schluss-Elites. Die alte Gegnerbesetzung und Reihenfolge bleiben erhalten. XP-Gesamtmengen, XP-Verteilungskurven und Grenzen für gleichzeitig aktive Gegner ändern sich nicht.
- Ein privater Seed pro Map und Welle macht die Auswahl reproduzierbar; Katalogabfragen verbrauchen keine Spiel- oder Upgrade-Zufallszahlen.

Der Rammer stoppt für eine 700-ms-Vorwarnung, legt dabei seine Richtung fest und sprintet anschließend 550 ms geradeaus; danach folgen 450 ms Erholung. Der Stampfer warnt ebenfalls 700 ms und trifft nur innerhalb seiner kleinen, sichtbar projizierten Bodenellipse (76 Pixel horizontaler Radius, 0,6 vertikaler Faktor). Beide Fähigkeiten starten nur in passender Nähe. Bestehende Spieler-Gegner-Kontaktregeln bleiben erhalten.

Die freigegebenen PNGs wurden proportional und mit ihren dokumentierten Frame-Ankern in fünf reguläre WebP-Sheets übernommen (zusammen rund 965 kB). Die Original-Vorschauen unter `docs/qa/map-creep-study/` bleiben erhalten.

## Bestätigte Kampfeffekte

Alle bisherigen neuen Auren, Raketen mit stufenabhängigen Impacts, Void A für normale Stufen und Void B für EVO sowie das vollständige Ladebild gehören weiter zur Produktionsversion. Zusätzlich sind die bestätigten Entwürfe für Boss-Feuerball, Laser und Molotov jetzt im Spiel aktiv.

`CombatEffectVisuals.js` übernimmt die geprüfte Comic-Choreografie. Die originale Boss-Projektilphysik bleibt erhalten; Pooling stellt bei normalen Projektilen die Sichtbarkeit wieder her. Laser behalten ihre Schadenszeitpunkte, Richtungen, Reichweiten und Trefferbreiten. Molotov behält Tickrate, Lebensdauer, Radius, Schaden und Burn-Regeln. Die Darstellung verwendet weniger, unabhängig animierte Flammen und einen offenen Rand. Timer und Darstellung respektieren Pause und Szenenwechsel.

Die zusätzliche Paketprüfung deckte beim kalten Start einen Unterschied zwischen Szenenzeit und geglätteter Phaser-Timerzeit auf. Zeitlich begrenzte Laser-/Treffereffekte verwenden deshalb denselben Timer-Fortschritt wie die Schadensauslösung; ein stockender Frame kann den Effekt nicht mehr vor einem noch ausstehenden Treffer aufräumen. `timed-combat-visual.test.mjs` sichert diesen Fall und das Aufräumen beim Szenenwechsel ab. `portal-effects-runner.mjs` prüft alle Laser-/Molotov-/Void-Stufen und Boss-Feuerball direkt an den ausgelieferten Objekten, ohne Quellimporte oder öffentliche Test-API.

## Prüfungen

- `map-enemy-variety.test.mjs`: 1800 Wellenfälle sowie Verteilung über 750 Map-/Seed-Kombinationen, Grenzwerte, Einführungswellen, alte Besetzung, Skins, Boss-Ausnahme und Zufallszustand.
- `map-enemy-variety-runner.mjs`: echte SpawnDirector-Übergänge durch neun Wellen auf allen Maps; Richtung, Reichweite, Vorwarnung, Treffer/Ausweichen, Pause, Wiederverwendung und Aufräumen.
- `combat-effects-integration-runner.mjs`: Vorher-/Nachher-Schadens- und Zeitvergleich aller fünf Laser-/Molotov-Stufen, Boss-Projektilkörper und tatsächlicher Kontakttreffer, Pause, Pooling und Neustart in WebGL und Canvas.
- Bestehende Mechanics- und Weapon-Progression-Prüfungen; separate Y8-SDK- und Werbepausentests.

Die erste Upgrade-Auswahl wurde mit allen drei Roostern auf allen drei Maps in Desktop und Portrait geprüft (18 Bot-Läufe, je ein Seed). 17 lagen innerhalb der bisherigen 25–35-Sekunden-Prüfung mit 2 Sekunden Toleranz. Feed Alley/Artillery/Portrait lag bei 38,8 Sekunden; ein direkter Vergleich desselben Seeds ohne neue Gegner ergab 36,7 Sekunden. Der Nutzer akzeptierte diese geringe Abweichung ausdrücklich. Der strenge Pacing-Test bleibt unverändert und meldet diesen Ausreißer weiterhin; es wurde weder eine Grenze gelockert noch zusätzlich in die Balance eingegriffen. Vergleich: `tests/map-variety-pacing-comparison.mjs`.

Sichtprüfung: Gegner im tatsächlichen Maßstab auf allen drei Spielböden, Warnungen/Aktionshöhepunkt in Desktop-WebGL und Portrait-Canvas; Molotov R1–R4/EVO, Boss-Flug/Treffer und EVO-Laser im echten Spielfeld. Die zuvor geprüften Vorschauen dokumentieren zusätzlich Zündung, Überlagerungen und Abklingen. Keine gequetschten Volumen oder abgeschnittenen Körper in den geprüften Ansichten.

Automatisierte Bot-Stichproben ersetzen keinen breiten menschlichen Balancetest. Schwache physische Mobilgeräte und eine tatsächliche Portal-Sitzung mit Anmeldung/Werbeauslieferung sind nicht durch lokale Browserprüfungen abgedeckt.

## Neue Portalpakete

Nach Commit und Push: `node scripts/package-portal-update.mjs 2026-11-04`.

Das Skript erzeugt ausschließlich neue Verzeichnisse unter `portal-updates/<Datum>-<Commit>/kongregate/` und `y8/`. Alte Pakete werden nicht überschrieben. Es prüft Quellstand, Portal-SDK-Trennung, identische Spielassets, relative Pfade und Produktions-Browsertests. ZIPs entstehen erst nach bestandenen Prüfungen und werden anschließend Byte für Byte mit den Builds verglichen. `BUILD-INFO.json` enthält Commit, Dateihashes und Paket-Hash. Es findet kein Upload statt.
