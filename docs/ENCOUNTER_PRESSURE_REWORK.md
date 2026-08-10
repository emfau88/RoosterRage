# Encounter Pressure Rework — Phase C

Date: 2026-08-10

Baseline commit: `5f96683`

Scope: normal-wave composition, simultaneous enemy projectile pressure, pressure telemetry, portrait runs for all rooster classes, and one bot-free manual run.

## Outcome

Normal waves now create danger primarily through enemy bodies, formation pressure, bomb placement, tanks, and a small number of readable ranged priority targets. Waves 4–9 contain roughly 5–10% true ranged enemies instead of the previous 15–24% ranged/summoner concentration. Total enemy budgets, wave duration targets, active caps, XP curves, elites, and boss values were preserved.

Normal shooters share a configurable 12-projectile reservation budget. A shooter whose telegraphed volley would exceed the budget delays its next attempt by 260 ms instead of firing into an existing wall. The reservation includes attacks that are currently telegraphing, so synchronized fan attacks cannot all pass the check in the same frame. Elite and boss attacks are intentionally excluded and remain separate encounter events.

This is a pressure scheduler rather than projectile deletion: accepted volleys retain their complete shape and telegraph, and elite bursts may create short peaks above the normal-wave value.

## Wave composition

| Wave | Previous ranged / summoners | New ranged / summoners | Horde redistribution |
| --- | ---: | ---: | --- |
| 4 Crossfire | 10 Spitters | 5 Spitters | +5 Slimes |
| 5 Firing Line | 10 Fan Spitters | 5 Fan Spitters | +5 Slimes |
| 6 Elite Pursuit | 14 Fan Spitters | 6 Fan Spitters | +8 Slimes |
| 7 Bombardment | 16 Fan + 4 Summoners | 5 Fan + 2 Summoners | +13 Slimes; 20 Bombers retained |
| 8 Pressure Cooker | 15 Spitters + 5 Summoners | 6 Spitters + 2 Summoners | +12 Slimes; Elite Spitter retained |
| 9 Royal Guard | 18 Fan + 8 Summoners | 6 Fan + 2 Summoners | +18 Slimes; 20 Brutes and Elite Brute retained |

The existing spawn director already provides scatter, same-edge pulse/line, rusher line, and four-edge surround formations with safe-distance and obstacle fallback. Those formations were retained. Composition, rather than adding more simultaneous formation systems, was the measured source of projectile overload.

## Pressure measurements

The focused scheduler probe spawned ten normal Fan Spitters at once. Without scheduling, their first synchronized attack represents 30 projectiles. With the reservation budget:

- peak enemy projectiles: 12;
- average enemy projectiles during the probe: 7.79;
- deferred overlapping attacks: 24;
- all accepted fans remained complete three-projectile patterns.

The Phase B full-run integration measurement used a different seed and produced 6.71 average / 39 peak enemy projectiles. It is not a strict A/B, but its peak exposed the exact synchronized-volley failure addressed here.

The new `npm run test:pressure` gate runs Wave 7 for all three rooster classes in parallel at 390 × 844 with the same representative mid-run build and ordinary damage rules:

| Rooster | Wave result | Duration | Avg / peak projectiles | Peak hazards | Movement | Damage taken | Death cause |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Ace | completed | 32.9 s | 5.31 / 12 | 13 | 168.8 units/s | 2 | none |
| Boombardier | completed | 39.6 s | 4.43 / 12 | 13 | 116.1 units/s | 39 | none |
| Stormcrest | completed | 34.8 s | 4.55 / 12 | 13 | 191.2 units/s | 11 | none |

The three runs completed without browser errors, runtime errors, or projectile-budget violations. The slower Boombardier took substantially more damage, which preserves a meaningful mobility tradeoff without making the wave lethal.

## Telemetry and gates

- Run telemetry now records total player distance and derived average movement speed.
- Deferred normal attacks are counted and exposed in encounter diagnostics.
- The encounter gate validates the 12-projectile scheduler with synchronized fan attacks.
- The wave catalog gate validates exact curated composition and a 5–10% true-ranged share in Waves 4–9.
- The focused pressure report and screenshots are written to `test-results/phase-c-pressure-*`.

## Manual result

A bot-free Barnyard Ace run was played through visible UI controls only. It reached Wave 4 with 157 kills, Target Egg R3, Orbit Eggs R1, and Regen R1.

- Wave 4 Spitters appeared as isolated, readable priority targets behind the melee group.
- No projectile wall formed during Crossfire.
- The run repeatedly fell to 1–8 HP, so reduced bullets did not remove danger; most pressure came from close enemy bodies and route choice.
- Upgrade pauses and the R2/R3 class progression remained readable under the new wave pacing.
- No browser errors or warnings occurred.

Short browser key holds are less precise than continuous player input, so the remaining HP is not used as a balance target. The useful manual evidence is that the first shooter wave reads as a new threat without obscuring the movement game.

## Validation

| Gate | Result |
| --- | --- |
| `npm run build` | pass |
| `npm run test:production` | pass; test API absent from production |
| `npm run test:mechanics` | pass; exact Wave 1–10 composition |
| `npm run test:encounter` | pass; peak 12 under synchronized fan pressure |
| `npm run test:pressure` | pass; three roosters, portrait Wave 7 |
| `npm run test:pacing` | pass |
| `npm run test:acceptance` | pass; 12 challenges, 9 arenas, 3 viewports, p95 ≤ 16.8 ms |
| manual browser run | reached Wave 4; no browser errors |

## Phase report

### Changed

Wave 4–9 ranged/summoner counts, horde redistribution, a telegraph-aware normal projectile reservation budget, movement/defer telemetry, exact composition gates, a synchronized pressure regression, and a three-rooster portrait pressure runner.

### Deliberately not changed

- Enemy damage, HP, movement speed, cooldown, projectile speed, and telegraph durations.
- Total authored enemy counts, wave duration targets, active caps, XP curves, and elite placements.
- Existing formation logic, because it already supplies line, surround, pulse, and rusher patterns with safe spawning.
- Elite and boss projectile pressure; the boss is handled by Phase D attack sequences.
- Player weapon damage after Phase B.

### Before / after

- Late ranged/summoner concentration: 15–24% → roughly 5–10% true ranged plus 1–2 Summoners where requested.
- Ten synchronized Fan Spitters: potential 30-projectile opening → measured peak 12 with complete accepted fans.
- Phase B full-run peak: 39 → focused Phase C Wave 7 peak 12 across all three rooster classes (different scenarios; directional comparison only).
- Pressure measurement: projectile counts only → projectile counts, hazards, movement speed, damage, deaths, and deferred attacks.

### Remaining risks

- A same-seed full-run A/B is still needed in Phase H; the focused Wave 7 gate intentionally isolates encounter pressure from eight minutes of upgrade variance.
- Wave 7 retains 20 Bombers as its positional identity. Bomber death zones can briefly raise total hazards above the projectile budget and should remain visually distinct from player FX.
- A slow class can still lose substantial HP to body pressure. Later map work must not create narrow lanes that turn this fair tradeoff into unavoidable contact damage.
- The projectile reservation value is configurable and evidence-backed, but should be retuned rather than treated as permanent if Phase D/E geometry changes projectile lifetime.
