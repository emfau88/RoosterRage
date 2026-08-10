# Brood King Sequence Rework — Phase D

Date: 2026-08-10

Baseline commit: `07b0bf9`

Scope: ordered boss attacks, phase transitions, add caps, boss TTK, build fairness, boss-specific control scaling, telemetry, automated real-time fights, and manual UI play.

## Outcome

The Brood King no longer runs Fan and Heavy Fireball on independent cooldowns. Each phase owns one ordered sequence. An attack must finish its telegraph and resolve before recovery, chase, the next attack, or an add pulse can begin.

The final representative build defeats the 10,000-HP boss in 62.6 seconds. Six materially different endbuilds all win within 53.5–80.9 seconds, five of them within the 55–75 second design band or slightly faster. The encounter never exceeds the boss plus six simultaneous adds.

## Attack sequences

### Phase 1 — Learn the King

1. Five-shot Fan, 460 ms telegraph.
2. 950 ms recovery.
3. 900 ms chase window with no ranged attack.
4. Heavy Fireball, 620 ms telegraph.
5. 1,200 ms recovery.

No adds spawn in Phase 1.

### Phase 2 — Royal Fury

The 65% HP transition clears active Boss projectiles and old Boss adds, grants 1,000 ms invulnerability/breathing room, and spawns six Slimes.

1. Wider six-shot Fan, 520 ms telegraph.
2. 1,000 ms recovery.
3. 850 ms chase window.
4. Heavy Fireball, 640 ms telegraph.
5. 1,300 ms recovery.

### Phase 3 — Last Hatch

The 32% HP transition repeats projectile/add clear, grants 1,100 ms protection, and replaces remaining adds with four Runners plus two Spitters.

1. Seven-shot Fan, 680 ms telegraph.
2. 950 ms recovery.
3. Charge, 620 ms telegraph and 520 ms movement.
4. 900 ms recovery.
5. Heavy Fireball, 680 ms telegraph.
6. 1,100 ms recovery.
7. Add pulse, capped at six active adds.
8. 1,300 ms recovery.

Recurring add pulses only fill empty slots up to six; they cannot accumulate another full group while old adds live.

## Transition safety

- Every phase change invalidates any pending sequence callback through a per-activation token.
- Old Boss projectiles are removed before the new phase begins.
- Old Boss adds are removed before the curated transition group spawns.
- The Boss is invulnerable for the full transition recovery.
- A recycled pooled enemy cannot resolve an old Boss timer because activation ID and sequence token must still match.
- The full Boss run measured at most two concurrent telegraphs.

## HP and build-fairness tuning

HP was initially retained at 11,800, as required. The first sequenced reference fight landed at 70.75 seconds, but the six-build matrix showed three broad builds at 75.6–81.6 seconds and two Control/Area builds unable to finish within 85 seconds. That evidence justified the planned second step: reducing HP to 10,000.

The same matrix exposed two skill-specific problems:

- Orbit Eggs dealt zero Boss damage at correct kiting distance. Normal Orbit Eggs now emit a small visible 50%-damage pulse toward a Boss within 460 range; Shell Halo uses 60%. Orbit remains primarily close defense/add control.
- Void Nest plus four Support Chicks killed the 11,800-HP boss in 41.4 seconds. Boss damage is now 45% for Void/Singularity and 55% for Support Chick/Chick Squadron. Both retain full add damage.

These modifiers preserve the roadmap rule that control tools remain useful through adds without becoming the fastest Boss solution.

## Six-build matrix

All fights use real-time browser simulation, ordinary class HP, the average movement profile, a hard 85-second timeout, and the same three-phase Boss.

| Build | Rooster | Result | Boss TTK | Damage taken | Main damage shares |
| --- | --- | --- | ---: | ---: | --- |
| Deadeye + Golden | Ace | victory | 65.0 s | 8 | Base 50.2%, Golden 49.4% |
| Orbit + Chain | Ace | victory | 80.9 s | 10 | Base 43.3%, Lightning 28.5%, Orbit 28.2% |
| Broodstorm + Molotov | Boombardier | victory | 72.5 s | 8 | Fire 37.7%, Molotov 35.1%, Rocket 27.2% |
| Laser + Golden | Boombardier | victory | 62.5 s | 32 | Golden 48.2%, Laser 28.9%, Base 22.6% |
| Chain + Halo | Stormcrest | victory | 72.5 s | 10 | Base 52.5%, Orbit 26.0%, Lightning 21.4% |
| Control + Flock | Stormcrest | victory | 53.5 s | 0 | Support 33.2%, Void 28.4%, Base 21.0%, Laser 17.4% |

Every run stayed at Boss + six adds or fewer. Average enemy projectiles ranged from 3.59 to 3.95; peaks ranged from 9 to 11.

## Reference run

The existing representative Ace build gate now reports:

- victory;
- 62.6 s Boss TTK;
- 32 damage taken: 24 Fan, 8 Fireball;
- 3.98 average / 12 peak enemy projectiles;
- 13 peak total hazards;
- two peak simultaneous telegraphs;
- Boss + six peak enemies;
- zero projectile deaths;
- 16.7 ms p95 frame pacing.

## Manual result

One normal bot-free UI run was first played from Wave 1 and ended in Wave 3 with 79 kills from `contact:brute`; it confirmed that ordinary body pressure, not projectiles, remains the main early manual risk.

The Boss itself was then played through a temporary local DEV-only practice entry. The entry required visible rooster selection and supplied a representative R4 build; all combat movement, EVO choice, and Boss Chest choice used visible UI and real keyboard input. No Test API or bot controlled the fight. The temporary practice code was removed immediately after the run and is not part of this change.

- Phase 1 Fan and Fireball read as separate actions with an obvious chase gap.
- Both phase banners coincided with a real attack pause instead of an overlapping volley.
- Phase 3 visibly separated seven-shot Fan, Charge, and Fireball.
- The run reached 1 HP, recovered through Regen and movement, then won with 25 kills.
- Solar Scramble and Phoenix Pan were evolved through visible choice overlays.
- The final Victory report showed 45% Fire Eggs, 32% Golden Egg, 20% Molotov, and 2% late Solar Scramble damage.
- No browser errors or warnings occurred.

## Validation

| Gate | Result |
| --- | --- |
| `npm run build` | pass |
| `npm run test:mechanics` | pass; sequence order and curated transition groups |
| `npm run test:encounter` | pass; protected clears and final sequence present |
| `npm run test:boss` | pass; 62.6 s reference TTK |
| `npm run test:boss-matrix` | pass; six victories, five ≤ 75 s, all ≤ 85 s |
| `npm run test:weapon-progression` | pass; final Orbit pulse included |
| `npm run test:rooster-depth` | pass; all nine archetypes retain Boss damage |
| `npm run test:production` | pass; Test API absent from production build |
| `npm run test:meta` | pass; no progression regression |
| manual normal run | completed to Wave 3; contact death, no browser errors |
| manual Boss practice | victory through visible UI; no browser errors |

## Phase report

### Changed

Three data-driven Boss sequences, recovery/chase/charge steps, protected phase resets, Boss projectile/add cleanup, six-add cap, step telemetry, six-build matrix gate, Boss HP after measurement, Void/Support Boss scaling, and a modest Orbit Boss pulse.

### Deliberately not changed

- Normal-wave projectile budget and compositions from Phase C.
- Boss projectile speeds and base damage except final-sequence step overrides already requested by the plan.
- Full add damage for Void and Support Chick.
- Generic player weapon balance outside Boss-specific interactions.
- Boss rewards and chest structure, reserved for Phase F.

### Before / after

- Attack scheduling: autonomous Fan + autonomous Fireball + phase adds → one ordered sequence per phase.
- Transition adds: 12 Slimes, then 8 Runners + 5 Spitters + 5 Bombers → 6 Slimes, then 4 Runners + 2 Spitters.
- Phase safety: attacks survive transition → projectile/add clear, callback invalidation, 1.0–1.1 s protected recovery.
- HP: 11,800 retained for first measurement → 10,000 after six-build evidence.
- Representative TTK: Phase B full-run Boss 77.4 s → final isolated reference 62.6 s (different build/seed context).
- Build coverage: one representative Boss gate → six materially different victories.
- Orbit Boss contribution: 0% → 26–28% in Orbit-focused builds.

### Remaining risks

- The practice build is intentionally strong and its manual 40-second combat HUD is not a baseline TTK; the automated matrix is the balance evidence.
- Add removal at phase transitions prioritizes encounter clarity over preserving partially damaged adds. If future rewards attach to ordinary Boss adds, transition removal must remain reward-neutral.
- Royal Gauntlet multipliers need another Phase H matrix because they scale Boss damage/HP around these sequence timings.
- Pseudo-infinite geometry in Phase E may change kiting distance and projectile lifetime; the Boss matrix must be repeated after map work.
