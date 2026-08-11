# AOE Combat Polish

Status: technisch umgesetzt und abgenommen am 11.08.2026.

## Umfang

- Die globale Zielerfassung und Projektilreichweite wurden bewusst noch nicht
  verändert. Ein kamerarelatives Reichweiten-Gate wird separat bewertet.
- Void Nest, Laser Comb und Molotov Egg bleiben mechanisch dieselben Waffen,
  erhalten aber längere und klar getrennte Präsentationsphasen.

## Void Nest

- Rangdauer: 3,4 / 3,8 / 4,2 / 4,4 Sekunden; Evolution 5,2 Sekunden.
- Öffnen, stabile Portalphase und 380 ms Collapse sind getrennt.
- Während der stabilen Phase bleibt Frame 14 mit voller Grunddeckkraft stehen;
  das Portal blendet nicht mehr vom ersten Tick an aus.
- Der letzte Collapse-Abschnitt verursacht keinen weiteren Schaden.

## Laser Comb

- Jeder Schuss besitzt Charge, stabilen Beam und Afterglow.
- Gesamtdauer: ungefähr 0,45 Sekunden auf Rang 1 bis 0,58 Sekunden auf Rang 4;
  Dawn Prism liegt bei 0,65 Sekunden.
- Der Schaden wird genau einmal nach der Charge aufgelöst.
- Breite, Kernhelligkeit, warme Farbintensität und Nachglühen steigen pro Rang;
  Rang 3 ergänzt weiterhin den Side-Beam, Dawn Prism drei eigene Farbstrahlen.

## Molotov Egg

| Rang | Radius | Schaden/Tick | Brandfläche | Würfe |
| --- | ---: | ---: | ---: | ---: |
| 1 | 90 | 10 | 3,0 s | 1 |
| 2 | 108 | 12 | 3,4 s | 1 |
| 3 | 124 | 14 | 3,8 s | 1 |
| 4 | 112 je Feld | 16 | 4,0 s | 2, um 250 ms versetzt |
| Phoenix Pan | 136 je Feld | 22 | 4,5 s | 2 |

- Das bisher geloopte Impact-/Ausbrenn-Atlasstück wurde durch ein dediziertes
  4×4-Sheet ersetzt: vier Impact-, acht Loop- und vier Ausglühframes.
- Die zufälligen Ellipsenflammen entfallen. Das reduziert vor allem bei zwei
  Rang-4-Flächen die Zahl einzelner Display-Objekte.
- Das Ziel wird um 72 Prozent der erwarteten Flugzeit in Bewegungsrichtung
  vorgehalten; die Vorhalteverschiebung ist auf 110 Welteinheiten begrenzt.
- Doppelfelder liegen quer zur Schussrichtung und decken dadurch einen laufenden
  Gegnerpulk besser ab als zwei rein horizontal versetzte Trefferpunkte.
- Ab Rang 3 markieren rein visuelle Feuerringe die Schadenticks; sie verursachen
  keinen zusätzlichen, versteckten Schaden.

## Burn-Status

- Kontakt mit einer Molotov-Fläche erneuert einen dreisekündigen Burn-Status.
- Pro Gegner existiert höchstens ein kleines 8-Frame-Flammenoverlay.
- Solange die Fläche den Gegner trifft, wird der Nachbrand-Tick zurückgestellt.
  Erst außerhalb der Fläche wirkt alle 600 ms ein leiser Nachbrand mit 25
  Prozent des Flächenticks; dadurch entsteht kein doppelter Tick-Spam.
- Nachbrand erzeugt keine einzelnen Schadenszahlen oder Treffer-Sounds und
  bleibt damit auch bei großen Gegnergruppen mobil lesbar.

## Abnahme

- `npm run assets:check`
- `npm run build`
- `npm run test:mechanics`
- `npm run test:smoke`
- `npm run test:evolution`
- `npm run test:pressure`
- automatisierte Prüfungen für Void-Holdframe, Laserphasen, Molotov-Rangwerte,
  verzögerten Doppelwurf, Burn-Overlay und Vorhalte-Aiming
