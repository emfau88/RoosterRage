# Rooster Rage Rework Baseline — Phase A

Date: 2026-08-10

Plan baseline: `5f9e7703d803178f6d4fa72afc2739b284ff16a1`

Runtime baseline seed: `rework-baseline-ace-v1`

Scope: measurement and instrumentation only; no balance or progression rework.

## Executive summary

The current game has a solid ten-wave survival loop, distinct rooster identities, 11 evolutions, three fixed arenas, curated enemy roles, and green production/mechanics/encounter gates. The largest gaps against the master rework plan are structural:

- active weapons mostly stop at R3 and their intermediate ranks are primarily numeric;
- rooster start weapons do not have their own R1–R4 progression path;
- projectile pressure is unbudgeted and peaks in waves 7–10;
- the boss is one continuously active enemy plus persistent add waves, not a sequence of separated phases;
- arenas are bounded static rooms;
- pickups use fixed kill milestones and every elite drops a chest;
- meta progression is horizontal unlock/history data without a spendable permanent-growth loop.

The instrumented Ace baseline won in 363.0 s (estimated human duration 419.0 s). It was healthy but too safe and the boss wave was too short. Fire Eggs produced 83.8% of effective damage. Enemy projectile count averaged 3.72 over the run, peaked at 21, and all 39 incoming damage came from three projectile hits.

## Audited systems

The Phase A audit covered the plan's required runtime and data surfaces:

- `src/data/upgradeDefinitions.js`
- `src/data/evolutionDefinitions.js`
- `src/data/roosterDefinitions.js`
- `src/data/arenaDefinitions.js`
- `src/data/challengeDefinitions.js`
- `src/systems/UpgradeSystem.js`
- `src/systems/LoadoutSystem.js`
- `src/systems/CombatSystem.js`
- `src/systems/WaveSystem.js`
- `src/systems/EnemyAttackSystem.js`
- `src/systems/PickupSystem.js`
- `src/systems/MetaProgressionSystem.js`
- `src/systems/RunStateSystem.js`
- ability, enemy, projectile, HUD, telemetry, and test-runner implementations.

## Weapons and evolutions

### Current rank structure

| Weapon family | Normal ranks | Intermediate behavior change | Evolution |
| --- | ---: | --- | --- |
| Rooster primary | no independent rank path | class passives change stats; primary remains a rank-1 loadout item | one rooster-specific EVO after a three-rank class passive |
| Golden Egg | 3 | no; damage/pierce/cooldown values | Royal Omelette |
| Orbit Eggs | 3 | yes; additional orbiting eggs | Thunder Nest |
| Molotov Egg | 3 | no; radius/damage/cooldown values | Inferno Coop |
| Lightning Comb | 3 | yes; target count and chain values | Tempest Comb |
| Support Chick | 5 | yes; projectile/debuff/count path | War Brood |
| Rocket Egg | 3 | no; damage/radius/cooldown values | Cluster Rooster |
| Void Nest | 3 | no; radius/damage/cooldown values | Event Horizon |
| Laser Comb | 3 | no; damage/range/cooldown values | Dawn Prism |

The current EVO layer is meaningfully behavior-changing and should be preserved. Phase B should expand each active weapon and each rooster primary to a visible R1–R4 path before EVO, while retaining the existing identities where they already work.

### Runtime damage share

Ace average-profile victory, current instrumentation:

| Source | Effective damage share |
| --- | ---: |
| Fire Eggs | 83.8% |
| Base Egg | 6.6% |
| Golden Egg | 5.4% |
| Bomb pickup | 3.6% |
| Support Chick | 0.6% |

The seed selected Golden Egg, Double Shot, Piercing Eggs x3, Fire Eggs x2, Faster Eggs x2, and Support Chick. Offer/choice counters are now emitted by telemetry so later phases can compare selection rates rather than relying on screenshots.

Interpretation: the build is viable, but one early weapon dominates the run. Phase B should make rank decisions mechanically legible before attempting broad numerical equalization.

## Enemy and projectile pressure

There is no global projectile budget. Every shooter with a ready local cooldown may attack independently.

| Wave | Curated enemies | Shooter/summoner share | Average enemy projectiles | Peak projectiles | Peak hazards |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 26 | 0.0% | 0.00 | 0 | 0 |
| 2 | 31 | 0.0% | 0.00 | 0 | 0 |
| 3 | 39 | 0.0% | 0.00 | 0 | 2 |
| 4 | 55 | 18.2% | 1.56 | 7 | 8 |
| 5 | 65 | 15.4% | 4.71 | 18 | 18 |
| 6 | 76 | 18.4% | 4.35 | 15 | 15 |
| 7 | 85 | 23.5% | 6.41 | 18 | 20 |
| 8 | 96 | 20.8% | 3.38 | 13 | 13 |
| 9 | 112 | 23.2% | 5.64 | 21 | 21 |
| 10 | boss + 30 scripted adds | boss plus 5 ranged adds | 7.80 | 20 | 21 |

Shooter/summoner share is based on the authored composition, before summons. Summoners can add three enemies every 5.6 s, so authored percentage understates live pressure. The phase-C target should prioritize concurrent projectile ownership and telegraph clarity over simply reducing enemy count.

Incoming damage in the measured run was `spitter-shot: 7`, `boss-fireball: 24`, and `boss-fan: 8`. Three projectile hits dealt all 39 damage; there were no projectile deaths.

## Boss baseline

The Brood King has 11,800 HP and two simultaneous attack clocks:

- fan volley: five shots every 1.9 s;
- heavy fireball: independent attack every 3.9 s;
- at 65% HP: 12 slimes are added;
- at 32% HP: fan grows to seven shots every 1.7 s, heavy cooldown becomes 3.2 s, and 18 more adds are added.

Adds persist between thresholds. The authored worst case is boss + 30 adds; the measured boss wave peaked at 18 enemies alive, 20 enemy projectiles, five telegraphs, and three danger zones. Boss-wave duration was 42.2 s. A focused boss runner measured approximately 66.9 s TTK with its controlled build. Both runs support replacing overlapping clocks/add piles with separated attack sequences in Phase D.

## Arena and traversal baseline

The game selects one of three fixed bounded layouts:

- Open Yard: 1312 × 812, two crates;
- Vertical Run: 800 × 812, side walls and two bales;
- Square Coop: 900 × 660, four crates.

There is no chunk streaming, traversal destination, encounter pocket, or pseudo-infinite recycling. Arena choice currently changes room shape and obstacle arrangement only.

## Pickups and chests

- Concurrent world budgets: heal 3, bomb 2, magnet 2.
- Fixed kill milestones: heal at 18, magnet at 48, bomb at 90, heal at 155, magnet at 235, bomb at 330, heal at 440.
- Every elite death drops a chest.
- Heal restores 25% max HP.
- Bomb kills normal enemies and removes 5% boss max HP.
- Magnet grants eight seconds of increased attraction; it is not an immediate global vacuum.
- Uncollected world pickups do not expire.

This is deterministic and testable, but cannot support the plan's elapsed-time cadence, rarity model, pity protection, chest variants, or anti-drought rules without a new spawn policy in Phase F.

## Meta progression

Persistent state currently tracks runs, wins, kills, unlocked roosters, challenges, cosmetics, and history. It is horizontal progression. There is no spendable run currency, permanent stat tree, mastery ladder, or respec flow. Phase G therefore needs a new progression resource and save migration rather than an extension of an existing power system.

## HUD and upgrade readability

Upgrade cards show category, rarity, `Rang x/y`, description, synergy, and reward label. Loadout slots display a digit or `E`. Missing against the plan:

- stars/pips for R1–R4;
- explicit next-rank behavior preview;
- inline EVO recipe/status;
- start-weapon progression visibility.

A narrow-viewport defect found by the encounter matrix was fixed in Phase A: the boss HUD now includes padding/border in its declared width and stays inside a 390 px viewport.

## Instrumentation added

Phase A adds the following measurements without changing combat values:

- sampled average and peak live enemy projectiles, globally and per wave;
- peak combined enemy hazards, including telegraphs and danger zones;
- projectile hits, projectile damage, and projectile-caused deaths;
- upgrade offer and choice counts;
- boss-runner projectile-pressure and combat-source output;
- persistent freeze diagnostics from the balance runner.

The first diagnostic run exposed a real pooled-entity lifecycle defect: a delayed Fan Spitter callback could run after the enemy object had been recycled and read a null attack profile. Delayed normal and boss-heavy attacks now validate that their original attack profile still belongs to the active entity. A regression explicitly recycles a charging Fan Spitter as a Slime and verifies zero stale shots and zero browser errors.

## Validation matrix

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run build` | pass | production bundle generated |
| `npm run test:production` | pass | production gate green |
| `npm run test:mechanics` | pass | includes pooled delayed-attack regression |
| `npm run test:pacing` | pass | authored pacing assertions green |
| `npm run test:encounter` | pass | nine viewport/arena cases; 390 px HUD overflow fixed |
| `npm run test:boss` | pass | focused boss victory and phase transitions |
| `npm run test:balance` | pass, attention | runtime healthy, victory, 10/10 waves; pacing verdict needs attention |

Balance result details:

- real runtime: 363.0 s; estimated human runtime: 419.0 s;
- first upgrade: 21.2 s;
- upgrade pause ratio: 1.1%;
- average wave score: 0.84;
- waves 1–3 and 5–9 classified too safe;
- wave 10 classified too short;
- max enemies alive: 27;
- average/peak enemy projectiles: 3.72 / 21.

No manual gameplay gate is required by the master plan for Phase A. Manual combat verification starts with Phase B.

## Phase A decision and next phase

Phase A is complete. Gameplay values were deliberately left unchanged. Phase B should proceed in this order:

1. define a shared R1–R4/EVO progression contract for active and starting weapons;
2. convert one representative weapon and one rooster primary end-to-end;
3. add HUD pips and next-rank/EVO messaging;
4. validate via automated mechanics/evolution tests and a real playable run;
5. expand the proven pattern to the remaining weapons before broad balance tuning.

The damage-share result argues for using Fire Eggs as the representative active weapon: it is the current dominant source and will reveal whether behavior-changing ranks improve build diversity without hiding a numerical nerf inside the progression rewrite.

## Phase report

### Changed

Projectile-pressure, projectile-damage, damage-share, and upgrade-frequency telemetry was added. The balance runner now preserves freeze diagnostics. The pooled delayed-attack crash and the 390 px boss-HUD overflow found during baseline testing were fixed with regressions.

### Deliberately not changed

No weapon value, enemy count, cooldown, boss pattern, arena topology, pickup cadence, or meta reward was changed. Those decisions require their dedicated phase and before/after measurement.

### Before / after

Before Phase A there was no sampled enemy-projectile average, projectile-specific incoming damage, peak combined hazard count, or aggregate upgrade offer/choice frequency. After Phase A these values are present globally and per wave, and a complete seeded run establishes 3.72 average / 21 peak projectiles, 39 projectile damage, 83.8% Fire Eggs damage share, and 10 upgrade choices.

### Manual result

Not required for Phase A. Automated browser runs covered the full ten-wave run, boss encounter, mechanics, pacing, production bundle, and nine encounter/viewport combinations. The first mandatory manual run is part of Phase B.

### Remaining risks

- The average bot labels most waves too safe; human avoidance may produce a different pressure curve.
- One deterministic Ace seed is sufficient for instrumentation validation, not cross-rooster balance.
- Hazard count measures concurrency, not screen-space occlusion or subjective readability.
- The dominant Fire Eggs build may exaggerate boss speed and safety; Phase B must compare isolated weapon paths and a human run.
