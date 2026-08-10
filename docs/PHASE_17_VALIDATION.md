# Phase 17 - automatischer Vertical-Slice-Freeze

Stand: 10.08.2026

Branch: `codex/professional-vertical-slice`

## Ergebnis

Der automatisierbare Teil der Vertical-Slice-Abnahme ist bestanden. Der Slice ist fuer die manuelle und externe Abnahme eingefroren. Eine oeffentliche Veroeffentlichung ist noch nicht freigegeben, weil der beauftragte manuelle End-to-End-Test und die Beobachtung von zehn externen Personen reale Produkt-Gates bleiben.

## Abdeckungsmatrix

| Gate | Abdeckung | Ergebnis |
| --- | --- | --- |
| Rooster/Challenges | 3 Rooster x 4 Challenges | 12/12 ohne Runtimefehler |
| Archetypen | alle drei Builds je Rooster | 9/9 in Kampf-, Elite- und Boss-Szenarien |
| Arenen | 3 Rooster x 3 Topologien | 9/9 ohne Runtimefehler |
| Maximaldruck | 110 Gegner + 260 Projektile | Desktop, Portrait und Landscape p95 <= 16,8 ms |
| Unfaire Treffer | Bomber-Kreis und Elite-Dash-Linie | beide verlassen, 0 Schaden |
| Dauerlast | echter zehnminuetiger Soak | 602,3 s, 36.093 Frames, p95 16,8 ms |
| Objekt-Pools | 60 Warm-up-/Recycle-Zyklen | 340 erzeugt, 19.551 wiederverwendet, 0 Drops, 0 aktiv am Ende |
| Telemetrie-Retention | mehr als 6.000 Folgeereignisse | erster Upgradezeitpunkt und Auswahlfolge bleiben erhalten |

## Reproduzierbare Balance-Stichprobe

Alle drei Eintraege verwenden das Profil `average`, Standard-Challenge und Open Yard. Die Prozentwerte sind eine technische Drei-Seed-Stichprobe, keine Behauptung ueber reale Spieler.

| Seed | Rooster | Ergebnis | aktive / geschaetzte menschliche Zeit | erstes Upgrade | Build am Ende | markante Damage Shares |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 512703272 | Barnyard Ace | Tod in Welle 7 | 4:20 / 4:53 | 20,0 s | Target Egg R1, Molotov Egg R1 | Basis 75,4%, Molotov 24,6% |
| 2781757978 | Boombardier | Sieg | 6:44 / 7:40 | 23,3 s | Siegebreaker EVO, Orbit R1, Rocket R1, Lightning R2 | EVO 73,4%, Basis 19,7% |
| 2007383544 | Stormcrest | Sieg | 6:40 / 7:36 | 19,4 s | Tempest Crown EVO, Golden R1, Chick R1, Orbit R2 | EVO 64,6%, Feuer 13,3%, Basis 9,8% |

Die technische Abschlussquote betraegt 2/3 oder 66,7 Prozent und liegt damit im vorgesehenen Average-Korridor von 55-70 Prozent. Wegen der kleinen, botbasierten Stichprobe ist dies nur ein Seed-Signal. Der verlorene Ace-Run bleibt absichtlich dokumentiert: Ein schwacher Zwei-Waffen-Build fuehrte zu hohen Spezialgegner-TTKs und einem nachvollziehbaren Fan-Spitter-Tod, statt dass der Bericht nur passende Siege auswaehlt.

Die beiden Sieger erreichten den Boss in der Zielzeit. Gemessene Boss-TTK: 57,1 s fuer Boombardier und 64,4 s fuer Stormcrest bei einem Zielkorridor von 45-70 s. Voll ausgebaute aktive Waffen lagen nicht unter fuenf Prozent Schaden. Die beiden stark primaerwaffenlastigen EVO-Builds sind dokumentierte Spezialbuilds und damit eine begruendete Ausnahme vom typischen Hauptwaffen-Korridor von 15-40 Prozent.

## Befehle

```text
npm run test:acceptance
npm run test:telegraphs
npm run test:soak
npm run test:pacing
npm run test:production
npm run test:smoke
npm run test:mechanics
npm run test:foundation
npm run test:arena
npm run test:encounter
npm run test:evolution
npm run test:hud-report
npm run test:rooster-depth
npm run test:meta
```

`test-results/` ist absichtlich nicht versioniert. Jeder Gate erzeugt dort JSON-Berichte und die relevanten Screenshots neu.

## Noch offene Abnahme

1. Ein manueller End-to-End-Run auf einem echten Touchgeraet oder mit echter Touchbedienung.
2. Zehn externe Personen ohne Einfuehrung beobachten.
3. Pro Person Upgrade-/EVO-/Truhen-/Bossverstaendnis, Frustmoment, Spannungsverlauf und freiwilligen Zweitrun erfassen.
4. Erst danach Verstaendnis >= 70 Prozent und Zweitrun-Interesse >= 50 Prozent bewerten und den oeffentlichen Demo-Deploy freigeben.
