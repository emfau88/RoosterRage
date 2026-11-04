# Weitere Animationen: Bewertung und Vorschläge

Stand: 04.11.2026. Bestandsaufnahme im Code und Sichtprüfung echter Spielszenen. Außer der separat freigegebenen Void-Integration wurden keine der hier vorgeschlagenen Änderungen umgesetzt.

## Priorität

| Priorität | Bereich und aktueller Befund | Konkrete Verbesserung |
| --- | --- | --- |
| 1 | **Boss-Feuerball:** Ein festes Feuerballbild wird bewegt und skaliert. Der breite rote Warnring dominiert die Form; das gezeichnete Feuer verändert sich nicht. | Separat flackernder Comic-Flammenkörper, nachlaufende Glut und wenige Rauchpartikel. Den Gefahrenhinweis enger und rhythmisch gestalten; die Lesbarkeit und tatsächliche Kollisionsfläche erhalten. Ein eigener kurzer Einschlag mit Glutsplittern macht das Geschoss komplett. |
| 1 | **Laser, besonders EVO:** Aufladen und Ausblenden sind vorhanden, die gehaltenen Strahlen selbst sind gerade, gleichmäßig dicke Linien. EVO zeigt drei verschiedenfarbige Linien mit demselben Ablauf. | Bewegte Energieimpulse entlang des Strahls, schmaler heller Kern mit weicherem Rand, kurzer Startimpuls und lebendige Kontaktfunken. EVO erhält leicht versetzte Impulse und eine stärkere Startentladung. Reichweite, Trefferzeit und Breite der Schadensprüfung bleiben davon getrennt. |
| 1 | **Molotov-Bodenfeuer:** Bereits echte 12-Frame-Flammen! Viele ähnliche, gleichmäßig verteilte Flammen und ein geschlossener ovaler Rand wirken zusammen aber wie ein Teppich aus Symbolen. In Effektkombinationen wird viel verdeckt. | Weniger, unterschiedlich hohe Flammengruppen; Lücken zum Boden; mehr unabhängige Phasen; wandernde Glut statt dichtem Flammenmuster. Den Rand in einzelne Ausläufer auflösen. EVO über wechselnde blaue und goldene Zungen, Funken und Hitzeimpulse charakterisieren. |
| 2 | **Blitze / Thunder Roost:** Die Zickzack-Geometrie entsteht einmal. Danach pulsieren hauptsächlich Deckkraft und kleine Dekorationen. EVO wird vor allem breiter und heller. | Zwei oder drei kurze, unterschiedlich gezeichnete Entladungen bei festen Zielankern, wandernde Verzweigungen, kurzer Nachglanz und kleine Kontaktfunken. Visuelle Kettenfolge innerhalb des bisherigen Trefferablaufs statt einer länger stehenden weißen Linie. |
| 2 | **Orbit-Eier / Shell Halo, Golden Egg:** Umlauf, Radiusatmung, Zielverfolgung und Lichtpulse existieren. Die kleinen Kreis-Auren und fest mitbewegten Leuchtflächen wiederholen aber das alte Ringmotiv. | Kurze, zur tatsächlichen Bewegung passende Schweife; wandernde Glanzlichter und einzelne Funken. Orbit bekommt einen gerichteten Kontaktblitz. Goldei bekommt einen lebendigen Lichtkern und getrennte Treffer-/Durchschlagssplitter. Der große Kreis im Orbit-Screenshot ist ein vorübergehender Upgradeimpuls, nicht die dauerhafte Umlaufbahn. |
| 2 | **Weitere EVO-Treffer:** Die gemeinsamen `EvolutionVisuals` verwenden einzelne Illustrationen, die leicht wachsen, rotieren und ausblenden. Sie unterscheiden sich als Motiv, haben aber weitgehend denselben Bewegungsablauf. | Kurze eigene Folgen aus Auftakt, Aufbruch und Nachklang je Waffe. Sunshot: goldene Schalenstrahlen; Siegebreaker: kompakter Druckstoß/Splitter; Tempest/Thunder: wandernde Funken; Phoenix: sich öffnende und zerfallende Feuerform; Halo: Schalenfragmente; Dawn: gerichtete Kontaktentladung; Squadron: kleiner federnder Treffer. |
| 3 | **Boss-Körper und gewöhnliche Gegner:** Der Boss besitzt eine vierteilige Laufanimation, aber kein eigenes `animationSet` für Aufladen/Auslösen/Erholung. Einige gewöhnliche Gegner nutzen dafür nur zwei bis drei Posen. Die neuen Elites haben bereits ausgearbeitete Zustandsfolgen. | Boss mit eigener Feuerball-Aufladepose, Stoß beim Fächerschuss und kurzem Erholen. Danach gezielt Spitter/Brute/Bomber um wenige klare Zwischenposen ergänzen. Timing an die vorhandenen Warnzeiten binden. |
| 3 | **Support-Chicks und Rooster-Aktionen:** Laufschleifen sind vorhanden; Chicks stehen im Idle auf einem festen Frame und schießen ohne eigene Körperaktion. Rooster haben ausgearbeitete Lauf-/Idle-Zyklen sowie einfache Schussreaktionen. | Kleine Atem-/Blickbewegung für stehende Chicks, kurzer Rückstoß und Federbewegung beim Schuss. Bei Roostern gezielte Start-/Trefferposen ergänzen statt die bestehenden Laufgrafiken komplett neu zu bauen. |

Meine Reihenfolge: Boss-Feuerball und Laser zuerst; Molotov gleich danach, weil es das Gesamtbild in volleren Kämpfen besonders stark beeinflusst. Danach Blitze und gemeinsame EVO-Treffer. Bereits überarbeitete Raketen, Auren und Void haben derzeit geringere Priorität.

## Vorhandene Animationsarten

- Drei Rooster mit gerichteten Lauf- und Idle-Sheets; Lauf-/Angriffsanimationen verschiedener Gegner; eigene Zustandsanimationen der neuen Elites.
- Sechs Support-Chick-Stufen mit gerichteten Laufzyklen.
- Flug-/Leuchtbewegung normaler, Feuer-, Ziel-, Gold-, Orbit- und Gegnergeschosse; modulare Raketen-Triebwerke mit Rauch.
- Molotov-Wurf mit Flugkurve und Schatten, Bodenfeuer, Brennstatus am Gegner.
- Lightning, Laser, Void und die bereits freigegebenen fünf Raketen-Einschläge.
- Gegner-Auren, Angriffswarnungen, Trefferrückmeldung, Todeseffekte, Schadenstexte, Aufstieg/Evolution sowie Pickup-/UI-Feedback.

Diese Aufstellung unterscheidet echte Bildfolgen von prozeduralen Animationen und bloßen Bild-/Linien-Tweens. Ein einzelnes Bild ist bei einem sehr kurzen Treffer nicht automatisch schlecht; Priorität haben auffällig starre, wiederholte oder verdeckende Effekte im echten Maßstab.

## Belege und Grenzen

`capture.mjs` startet das echte Spiel und erzeugt die Aufnahmen mit den vorhandenen Fähigkeiten und Originalgrafiken. `runtime.json` dokumentiert die erfassten Zustände. Visuell angesehen: `laser-evo.png`, `lightning-evo.png`, `boss-fireball.png`, `molotov-evo.png`, `orbit-evo.png`, `golden-r4.png`, `evo-impacts.png`, `void-overlap.png`. R4-Laser und R4-Blitz wurden zusätzlich erfasst. Aussagen über zeitliche Abläufe stützen sich auf die jeweiligen Update-/Tween-Implementierungen und den erfolgreichen Waffenprogressionslauf, nicht auf den Anspruch, jede mögliche Kampfsituation angesehen zu haben. Gegner-/Boss-/Chick-Posen wurden anhand der registrierten Animationsfolgen bewertet; eine zusätzliche vollständige Bewegungsaufnahme aller Gegner wurde nicht erstellt.

Relevante Quellen:

- `src/entities/EnemyProjectile.js`, `src/systems/EnemyAttackSystem.js`: Feuerballkörper, Warnring und Projektilbewegung.
- `src/systems/abilities/LaserCombAbility.js`, `src/entities/LightningBolt.js`: Strahl-/Blitzaufbau und zeitliche Entwicklung.
- `src/entities/HazardZone.js`, `src/entities/MolotovEggProjectile.js`, `src/systems/abilities/MolotovEggAbility.js`: Bodenfeuer, Flug und Zündung.
- `src/entities/OrbitEgg.js`, `src/entities/Projectile.js`, `src/systems/abilities/GoldenEggAbility.js`: Leuchtkreise und mitbewegte Trails.
- `src/systems/EvolutionVisuals.js`: gemeinsame EVO-Treffer.
- `src/systems/assets/AnimationSetup.js`, `src/entities/SupportChicken.js`, `src/systems/WaveSystem.js`: Bildfolgen, Idle-Verhalten und Boss-Konfiguration.

Für Strahlen, Sog, Schweife und Funken würde ich überwiegend Phaser-Code und Partikel verwenden. Für Feuerkörper und Körperposen lohnen sich zusätzliche gezeichnete Animationsframes. ImageGen kann passende Grundgrafiken liefern; Timing, Bewegungsrichtung, Übergänge, Größenbegrenzung und Überlagerungen müssen anschließend in der tatsächlichen Animation gestaltet und im Spiel geprüft werden.
