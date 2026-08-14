# Map Topology Rework — Phase E

Date: 2026-08-10

Baseline commit: `4c4101c`

## Outcome

Open Yard and Vertical Run are no longer static rooms. Both use a bounded object pool over a large virtual world, so traversal feels continuous without creating new chunks, props, landmarks, or colliders over time. Coop Square remains the deliberately enclosed challenge arena.

## Implemented topology

### Open Yard

- 131,072 × 131,072 virtual playable world, starting at its center.
- 25 reusable 700 × 700 chunks in a constant 5 × 5 window.
- A 1,600 × 1,100 local spawn/safe-point window follows the player.
- Deterministic crate/bale layouts plus sparse barn/well landmarks.
- Barns and wells carry compact solid footprint colliders; the decorative roof/upper silhouette remains passable for fair top-down navigation.
- No hard boundary is reachable within the required one-to-two-minute directional run.

### Vertical Run

- 800-unit playable corridor over 131,072 vertical units.
- Five reusable 800 × 600 road chunks in a constant 1 × 5 window.
- Recycled side-wall colliders preserve the north/south corridor.
- Alternating partial bale gates and side crates create readable blockers without sealing the route.
- The central lane contains no large opaque landmarks. Architecture, fields and
  machinery remain outside the playable strip so silhouettes stay readable in
  dense combat.

### Coop Square

- The original enclosed gameplay model and four hard boundary colliders are
  retained, but the placeholder presentation has been replaced by a bespoke
  1,400 × 900 farm arena. Its usable footprint was expanded from 900 × 660 to
  1,230 × 810 after visual review, matching the fence placed farther outward.
- A high-contrast wheat perimeter, continuous timber fence and four closed gates
  make the playable boundary readable without the former abstract tint/grid.
- The center remains deliberately open for horde combat. Nine perimeter props
  create short rotation decisions: one tractor, two water troughs, four hay
  stacks and two crates.
- Tractor and troughs are permanent solid cover; hay and crates remain
  destructible and preserve the established pickup/drop interaction.
- Every visible prop has a collider matched to its gameplay footprint. An arena
  regression gate protects the full prop roster, the three permanent-cover
  objects and a 230-unit clear radius around the arena center.
- The enclosure gate additionally drives the player into every fence side with
  real movement input and samples 80 director spawns. The player remains inside
  all four colliders and every enemy begins at least 65 units inside the fence.

### Coop Square visual production pass (13 August 2026)

The redesign was derived from the supplied quality mockup but rebuilt for the
existing RoosterRage camera and HUD. The first 900 × 660 composition was then
expanded to 1,230 × 810 while keeping the prop layout fixed. ImageGen
created the coherent background and a matching tractor/trough/hay prop sheet;
the checked-in preparation script performs deterministic 1,400 × 900 framing,
chroma removal input splitting and source generation. Runtime WebP files remain
fully covered by the asset manifest.

Before/after whole-map captures are stored in `docs/qa/coop-square-rework/`.
The visual pass changes no enemy, weapon, wave, XP, reward or camera rules.

### Streaming-map visual production pass and readability correction (14 August 2026)

The supplied four-map mockup was used as a theme reference, then deliberately
scaled back after real combat review. Open Yard is presented as **Harvest
Yard**: warm, calm harvest dirt with sparse barns and wells. Vertical Run is
presented as **Feed Alley**: a quiet packed-earth lane framed by clearly raised,
north-up farm scenery.

Both maps retain their stable IDs, bounded pools, spawn windows, routes,
destructible cover, balance and camera. Ground and exterior chunks are never
randomly flipped or rotated. The traversal gate explicitly protects this fixed
orientation and verifies that Feed Alley remains free of opaque lane landmarks.
The original theme captures remain in `docs/qa/map-theme-pass/`; the final
readability comparisons are in `docs/qa/map-readability-pass/`.

The final Feed Alley sources are `arena-ground-road.png`,
`arena-feed-alley-left.png` and `arena-feed-alley-right.png` under
`art-source/map/`. `scripts/prepare-map-theme-assets.py` crops, grades and sizes
these sources without seam-shifting architectural content before the established
WebP optimizer runs.

### Final readability correction (14 August 2026)

- **Harvest Yard:** A calmer, slightly softened ochre floor replaces the noisier
  version. Random X/Y flips were removed, so grass and directional details no
  longer appear sideways or upside down. The combat-obscuring orchard was
  removed; much rarer barns and wells retain the farm identity.
- **Feed Alley:** The lane is now broad, bright and low-noise with two restrained
  north/south wheel tracks. No silo, trough or well can obscure the playable
  strip. A narrow continuous fence sits directly against each lane edge. Beyond
  it, two deterministic scenery variants alternate per recycled chunk: the left
  side combines barn, silo, cart, hay and a colorful kitchen garden; the right
  side combines sheds, orchard, crop rows and harvesting machinery. Both sides
  keep fixed north-up orientation and remain slightly quieter than the combat
  floor despite the stronger color accents.
- **Portrait framing:** Phones up to 520 CSS pixels use a 560-unit physical lane
  and a moderate 0.54 camera zoom. This is exactly 40% wider than the first
  mobile prototype and still exposes roughly 81 world units of exterior on each
  side at 390 × 844 while retaining sharp Retina rendering.
  Obstacles and wall colliders adapt to the real lane width. Landscape and
  desktop remain at the original 800-unit corridor and zoom 1.
- **Obstacle pacing:** Each 600-unit Feed Alley chunk now contains at most one
  destructible bale or crate, and every fourth deterministic pattern is fully
  clear. The former two-prop combinations were removed, so props cannot overlap
  and long north/south movement lines remain open.

## Recycling and safety

Only chunks leaving the active key set are reassigned. Existing visible chunks keep their objects and coordinates, preventing full-window popping at each boundary. Reassignment resets destructible health, texture, body, size, position, and ID. Each landmark owns a separate invisible solid footprint that is enabled, moved, and disabled with the same recycled chunk. Disabled obstacle slots remain outside physics.

Enemy formations, bot targets, pickups, and safe-point generation use the local active window. World reachability uses the full playable virtual bounds, so a deliberately left-behind pickup does not become invalid merely because the player moves to another chunk.

The DEV test adapter translates legacy 1,400 × 900 test coordinates to the stable streaming origin. Production contains neither this adapter nor the Test API.

## Assets

Built-in ImageGen mode created and refined the project-bound map sources:

| Asset | Source | Runtime use |
| --- | --- | --- |
| Harvest Yard ground | `art-source/map/arena-ground-farm.png` | calm repeating 700 × 700 chunks |
| Feed Alley ground | `art-source/map/arena-ground-road.png` | quiet north/south 800 × 600 lane |
| Feed Alley left exterior | `art-source/map/arena-feed-alley-left.png` | north-up barn, silo and field scenery |
| Feed Alley right exterior | `art-source/map/arena-feed-alley-right.png` | north-up field, shed and machinery scenery |
| Feed Alley left exterior B | `art-source/map/arena-feed-alley-left-v2.png` | north-up garden, cart and hay scenery |
| Feed Alley right exterior B | `art-source/map/arena-feed-alley-right-v2.png` | north-up crops, harvester and storage scenery |
| Chicken barn | `art-source/map/landmark-barn.png` | sparse Open Yard landmark |
| Farm well | `art-source/map/landmark-well.png` | sparse Open Yard landmark |

The final Feed Alley prompts requested a seamless orthographic ochre lane with a
broad quiet center and two subtle north/south tracks, plus coherent raised farm
architecture outside each boundary. They explicitly excluded water, mud,
collage layouts and rotated structures. Local deterministic grading keeps the
exterior darker and less saturated than the combat surface.

Runtime WebP files are generated by `npm run assets:optimize` and covered by `src/assets/runtime-assets.json`. Existing crate, bale, and wall assets provide all mechanical props; no redundant map prop set was produced.

## Measurements

### Directional streaming gate

- 27,000 units per route, equivalent to 129 seconds at base speed.
- Open Yard tested east, west, north, south, and diagonal.
- Vertical Run tested north and south.
- Open Yard pool stayed at 25 chunks after 125 recycled assignments.
- Vertical Run pool stayed at five chunks after 15 recycled assignments.
- No chunk gaps, duplicate keys, stale colliders, blocked safe points, or unreachable pickups. Every visible barn/well is asserted to have exactly one correctly sized solid footprint; every ground and Feed Alley exterior chunk is asserted to remain unflipped.

### Ten-minute soak

- 601.9 seconds real duration and 60 recycle/load cycles.
- 36,097 frames; 16.67 ms average, 16.7 ms p95, 16.8 ms p99/max.
- Zero frames over 33 ms.
- Object pool: 343 created, 19,548 reused, zero dropped, 344 peak.

### Boss regression

All six Phase-D builds still won after map integration in 55.5–79.9 seconds. Peak enemy projectiles stayed at 10–12 and peak enemies at Boss + six adds.

## Manual result

Open Yard was played with visible UI and repeated real eastward keyboard input through multiple ground/landmark repetitions. The camera moved continuously, no hard edge or seam appeared, and enemies, XP, props, and projectiles remained readable.

Vertical Run was played northward with real keyboard input on desktop and checked again at 390 × 844 portrait. Road direction, side limits, partial blockades, touch control, HUD, and combat remained legible. The Browser console contained no warnings or errors.

## Validation

| Gate | Result |
| --- | --- |
| `npm run assets:check` | pass; 87 runtime images current |
| `npm run build` | pass |
| `npm run test:arena` | pass; all three topology and pickup checks |
| `npm run test:map-streaming` | pass; 129-second-equivalent routes |
| `npm run test:mechanics` | pass |
| `npm run test:encounter` | pass; nine arena/rooster cases |
| `npm run test:pressure` | pass; three-rooster portrait pressure |
| `npm run test:boss-matrix` | pass; six builds |
| `npm run test:production` | pass; no Test API in production |
| `npm run test:acceptance` | pass; 12 challenges, 9 arenas, 3 viewports |
| `npm run test:telegraphs` | pass; streaming-relative avoidance metrics |
| `npm run test:soak` | pass; real ten-minute duration |
| manual desktop/mobile | pass; no visible gap or Browser error |

## Phase report

### Changed

Streaming world bounds, local active windows, deterministic chunk recycling, recycled prop/wall bodies, two map ground textures, two landmarks, traversal telemetry/state, safe legacy test-coordinate translation, and a dedicated map-streaming gate.

### Deliberately not changed

- Coop Square geometry.
- Enemy, weapon, Boss, XP, pickup budget, or reward balance.
- Kill-milestone drop logic and chest tiers, reserved for Phase F.
- Additional decorative prop production; the four new assets plus existing modular props are sufficient for this phase.

### Remaining risks

- The virtual world remains finite by design; its edge is more than five minutes away at base speed from the center and outside the current run duration.
- Left-behind pickups remain valid but can become strategically irrelevant. Phase F should decide whether world drops expire, persist, or receive navigation cues.
- Final weapon/EVO bitmap production may increase visual density and needs another mobile readability pass in Phase H.

### Next step

Phase F: detach strategic world drops from fixed kill milestones and introduce chest tiers without changing the proven map pools.
