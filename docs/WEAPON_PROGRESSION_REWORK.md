# Weapon Progression Rework — Phase B

Date: 2026-08-10

Baseline commit: `67eef4a`

Scope: rooster start weapons, active weapon rank behavior, EVO recipes, rank presentation, isolated visual/DPS gates, and one bot-free manual run.

## Outcome

All three rooster start weapons now progress from R1 through R4 before their existing EVO. Every active weapon now has four normal ranks except Support Chick, whose already successful five-rank path was intentionally retained. Each migrated weapon changes visible form or behavior at least every second rank; rank-up descriptions, loadout pips, and inline EVO recipe status expose that progression without opening a separate screen.

Fire Eggs remains a generic primary-weapon modifier. It was not converted into a separate active cooldown because the runtime architecture and current build identities use it as a cross-weapon synergy.

## Start weapons

### Barnyard Ace — Target Egg

- R1 Target Egg: existing single homing shot.
- R2 Twin Lock: every second attack becomes a visible two-target salvo and turns faster.
- R3 Deadeye Shell: every fourth attack is a guaranteed critical; critical shots gain one Pierce and one Ricochet. Random criticals remain possible.
- R4 Hunter Array: permanent two-shot pattern, stronger targeting, larger gold trail.
- EVO Sunshot Array: existing three-shot Pierce/Ricochet identity retained above R4.

### Boombardier — Blast Shell

- R1 Blast Shell: existing heavy splash projectile.
- R2 Heavy Load: larger shell, trail, and splash radius.
- R3 Shrapnel Yolk: impact creates four short mini-blasts with attributed damage.
- R4 Siege Load: larger shell and splash plus a second pressure wave.
- EVO Siegebreaker Shell: existing pierce and large double-wave identity retained.

### Stormcrest — Storm Egg

- R1 Storm Egg: existing fast projectile and one chain.
- R2 Static Fork: additional chain and larger chain radius.
- R3 Arc Pair: permanent two-impulse pattern.
- R4 Storm Circuit: three chains, extended radius, brighter and larger electric trail.
- EVO Tempest Crown: existing multi-chain network retained above R4.

The normal rank pick is stored separately from generic passives, but updates the already occupied start-weapon loadout slot instead of consuming another active or passive slot. EVO recipes now require start weapon R4 plus at least one matching class passive.

Start-weapon ranks are guaranteed as one of the three choices when eligible, with class-specific affinity. Eligibility is paced at player levels 2, 4, and 6 for R2, R3, and R4. This prevents three immediate consecutive ranks while ensuring the class weapon does not remain at R1 for an entire run.

## Active weapons

| Weapon | Final normal rank behavior | EVO distinction |
| --- | --- | --- |
| Golden Egg | R2 larger hit/trail; R3 solar chain spark; R4 two-egg salvo | three-shot Solar Scramble |
| Orbit Eggs | R2 two eggs; R3 three eggs with trails; R4 four eggs on alternating radii | six-egg layered Shell Halo with moderated contact cadence |
| Molotov Egg | R2 larger/dense fire; R3 visible damage pulses; R4 dual landing | larger evolved dual Phoenix zones |
| Lightning Comb | R2 four targets; R3 branch; R4 six targets and central discharge | ten-target Thunder Roost |
| Support Chick | existing R1–R5 path retained | four-chick coordinated squadron |
| Rocket Egg | R2 larger/faster; R3 three cluster blasts; R4 two-rocket salvo | three-rocket Broodstorm salvo |
| Void Nest | R2 larger pull; R3 pulsing control; R4 two singularities | larger, longer dual Singularity Nest |
| Laser Comb | R2 wider; R3 side beam; R4 long wide paired line | three-beam Dawn Prism |

The first Shell Halo implementation produced 4,389 damage in the isolated scenario and was a clear outlier. The six-egg formation was kept for silhouette, while per-egg damage and contact cadence were reduced. The repeated gate now records 1,386 damage in the same scenario.

## HUD and upgrade communication

- Upgrade cards display one pip per normal rank, with filled progress and a highlighted next rank.
- Loadout icons display compact filled rank pips in addition to the numeric badge.
- Upgrade cards show the EVO name, whether R4 is complete, and whether the support passive is owned.
- Start-weapon loadout entries now report R1–R4 instead of remaining permanently at R1.
- EVO still replaces the rank label with `E` and the evolved icon state.

Responsive gate measurements with a start weapon, active weapon, and passive equipped:

| Layout | Viewport | HUD height | Rank-pip result |
| --- | --- | ---: | --- |
| Desktop | 960 × 540 | 169 px | visible, not clipped |
| Portrait | 390 × 844 | 105 px | visible, not clipped |
| Landscape | 844 × 390 | 68 px | visible, not clipped |

## Isolated weapon gate

`npm run test:weapon-progression` validates every normal rank definition, applies every runtime rank in order, completes every EVO recipe, checks loadout state and attributed damage, and captures R1/final/EVO screenshots for all 11 paths.

The controlled damage values below use 14 stationary 9,999-HP targets for 1.05 s. They are shape/regression measurements, not claims of equal real-run DPS; area and companion weapons naturally hit more targets/ticks.

| Weapon | R1 | Final normal | EVO |
| --- | ---: | ---: | ---: |
| Target Egg | 40 | 240 | 340 |
| Blast Shell | 128 | 348 | 1,556 |
| Storm Egg | 44 | 140 | 252 |
| Golden Egg | 180 | 542 | 702 |
| Orbit Eggs | 114 | 816 | 1,386 |
| Molotov Egg | 36 | 624 | 928 |
| Lightning Comb | 84 | 262 | 526 |
| Support Chick | 17 | 518 at R5 | 1,232 |
| Rocket Egg | 192 | 1,188 | 1,512 |
| Void Nest | 176 | 1,495 | 2,968 |
| Laser Comb | 96 | 288 | 630 |

Every final normal rank and EVO dealt attributed damage. Screenshots are emitted to `test-results/weapon-progression/` and checked at the effect-specific time window rather than after short beams and projectiles have disappeared.

## Full-run comparison

An average-profile Ace comparison run after the weapon behavior migration completed all ten waves and remained runtime healthy:

- victory in 481.4 s real / 541.1 s estimated human time;
- first upgrade at 22.1 s;
- 11 upgrade choices;
- 80 damage taken;
- boss wave 77.4 s;
- damage share: Base Egg 74.7%, Support Chick 8.9%, Rocket Egg 7.6%, pickup 4.3%, Lightning Comb 3.4%, Orbit Eggs 1.1%;
- average/peak enemy projectiles: 6.71 / 39.

The seed differs from Phase A and should not be interpreted as a pure balance A/B. Its purpose was runtime and progression integration. It exposed that Target Egg was offered twice but chosen only once, leaving the build at R2. The final level-2/4/6 guarantee and bot priority were added after this run and are covered by a deterministic mechanics gate. Enemy projectile pressure remains deliberately untouched for Phase C.

## Manual result

A bot-free Ace run was played through visible UI controls with manual upgrade selection. It ended in wave 2 with 63 kills and Target Egg R3.

- Twin Lock's alternating second shot was immediately legible.
- Upgrade pips and the inline `R4 + passive` EVO recipe were readable during the decision pause.
- The initial Deadeye Shell implementation depended on Ace's 8% base critical chance and was too rare to read as a new rank during play.
- Based on that result, R3 now guarantees a Deadeye critical every fourth attack while preserving random criticals.
- No browser errors or warnings occurred during the run.

The run ended from contact damage while using short automated key taps through the browser surface. That survival result is not used as a balance verdict; the useful manual evidence is upgrade readability and weapon-feedback cadence.

## Validation

| Gate | Result |
| --- | --- |
| `npm run build` | pass |
| `npm run test:mechanics` | pass, including R2/R3/R4 level cadence |
| `npm run test:evolution` | pass for all 11 EVO recipes |
| `npm run test:weapon-progression` | pass for all 11 R1/final/EVO paths |
| `npm run test:hud-report` | pass on desktop, portrait, landscape |
| `npm run test:balance` | pass runtime; pacing still needs attention |
| manual browser run | completed; no browser errors |

## Phase report

### Changed

Three start-weapon R1–R4 paths, R4 and behavior escalation for seven three-rank active weapons, preserved Support Chick R1–R5, updated EVO prerequisites, rank pacing, pips, EVO hints, isolated regression/visual gate, and test-only deterministic triggers.

### Deliberately not changed

- Fire Eggs remains a generic modifier rather than a fake active weapon.
- Support Chick remains at five ranks because its existing progression already meets the design goal.
- Broad enemy, boss, map, pickup, and meta values were not tuned in this phase.
- Generic passives were not removed; they modify the new class progression instead of replacing it.

### Before / after

- Start weapons: fixed R1 until EVO → visible R1–R4 plus EVO.
- Seven active paths: R1–R3 plus EVO → R1–R4 plus EVO.
- Rank communication: numeric card/loadout badges → numeric badges plus pips and inline EVO status.
- Intermediate identity: mostly numeric → salvos, branches, clusters, side beams, pulses, dual zones, and layered formations.
- Isolated Shell Halo outlier: 4,389 → 1,386 damage with its six-egg silhouette retained.

### Remaining risks

- EVO asset Bulk 1 now gives Sunshot Array, Siegebreaker Shell, Tempest Crown, Solar Scramble, Phoenix Pan, and Broodstorm dedicated icons, projectiles, and short impact signatures. Their final size and timing limits are recorded in `docs/WEAPON_EVO_ASSET_BULK_1.md`.
- The full-run rank guarantee needs another multi-seed balance sweep after Phase C changes enemy pressure; repeating an eight-minute run now would tune against encounter values scheduled to change next.
- Void Nest and area weapons show high stationary-cluster damage; moving-target performance should be compared after formation and pressure rework.
- Extra player-side projectiles/FX must remain below telegraph occlusion thresholds when Phase C reduces enemy bullets.
- Primary rank timings are deterministic by player level, but actual minute timing varies with XP collection and build safety.
