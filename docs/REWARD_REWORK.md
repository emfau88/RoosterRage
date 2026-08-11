# Reward Rework

Status: abgeschlossen am 11.08.2026.

## World Props

- Kisten und Heuballen zeigen bei 67 % und 34 % Restleben zwei klar sichtbare
  Schadensstufen, bevor Collider und Grafik beim Zerstören verschwinden.
- Props können ab Wave 2 budgetierte Heal-, Magnet- oder Bomb-Pickups droppen.
- Maximal drei Prop-Drops und maximal ein Prop-Drop pro Wave verhindern Farming;
  die bestehenden Run-Budgets von 3 Heal, 2 Magnet und 2 Bomb gelten weiterhin.

## Chest-Tiers

| Tier | Quelle | Darstellung | Reward |
| --- | --- | --- | --- |
| Elite | Elite-Gegner | 59 px, Goldring | 3 Choices, 1 Prioritäts-Slot |
| Golden | Stormclaw Champion | 65 px, Goldsiegel | 3 Choices, 2 Prioritäts-Slots |
| Royal | Brood King | 72 px, violettes Royalsiegel | 4 Choices, 2 Prioritäts-Slots |

EVO-bereite Upgrades stehen vor Rank-Ups; erst danach werden neue Optionen
ergänzt. Alle Tiers verwenden dieselbe bewährte Kistenform und unterscheiden
sich über Größe, Palette, Aura, animiertes Siegel und Reward-Regel.

Die Royal Chest liegt nach dem Boss physisch in der Arena. Der Run endet erst,
nachdem sie eingesammelt, geöffnet und die Belohnung gewählt wurde. Bot-Profile
priorisieren alle Chest-Tiers, damit automatische Balance- und Bossläufe nicht
hängen bleiben.

## Champion-Lage

Der seltene `Stormclaw Champion` erscheint je einmal in Wave 6 und 8. Er nutzt
eine bekannte Charge-Grammatik mit 520-ms-Telegraph, eigenes Ankunftsbanner,
Goldmarker und garantierter Golden Chest. Damit steigt die Zielpriorität, ohne
eine weitere unbekannte Projektil- oder Flächenmechanik einzuführen.

## Abnahme

- `npm run build`
- `npm run test:arena`
- `npm run test:encounter`
- `npm run test:pacing`
- mobiler Portrait-Screenshot aller drei Chest-Tiers und des Champions
