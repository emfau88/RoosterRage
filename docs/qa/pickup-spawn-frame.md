# Pickup collider displacement on the spawn frame

Date: 2026-10-04. Reproduced on `6b214fe`, including all prior pickup fixes.

## Cause

Commit `d0931be` (2026-10-03) separated pickup artwork from the invisible
Arcade sprite and introduced `body.updateFromGameObject()` after configuring
the scaled collision circle. This synchronizes the body's current position,
but does not initialize `prevFrame` to that position.

Running the unmodified `Pickup` constructors from `d0931be^` and `d0931be`
in the same Phaser runtime confirms the regression independently: spawning
on `worldstep` gives zero sprite displacement for all three normal items in
the parent version, then +107 X / +107 Y in `d0931be`. This comparison isolates
the constructors; it is not a full playthrough of those historical releases.

When a pickup spawns inside a projectile collision or after the physics
preUpdate, Arcade's postUpdate runs before that body's first preUpdate.
It adds `body.position - body.prevFrame` to the sprite, interpreting the
initial texture/scale/offset adjustment as movement. The artwork, field and
shadow stay at their original positions. The next physics frame follows the
displaced sprite. Both the body collision and the foot fallback now look in
the wrong place, so walking over the visible pickup does nothing.

For the current 256 x 256 pickup textures:

| Kind | Sprite displacement X | Sprite displacement Y | Body-to-field distance after next frame |
| --- | ---: | ---: | ---: |
| Health | +112.95 | +123.95 | 167.62 |
| Magnet | +112.95 | +123.95 | 167.62 |
| Bomb | +116.95 | +127.95 | 173.27 |

All measurements are world units. Camera zoom is not involved. Spawning
between animation frames avoids the defect because the new body gets a
preUpdate before its first postUpdate. This explains the test coverage gap:
previous tests spawned pickups from `page.evaluate()` and then approached
their sprite coordinates, instead of approaching artwork after combat drops.
The bug depends on frame phase, not on a third-item counter or a retained heal.

## Regression and correction

`tests/pickup-spawn-frame-runner.mjs` kills enemies through the actual Arcade
projectile overlap. Their deaths trigger the real wave schedule: health,
magnet, bomb, health, magnet, bomb. The fixture sets wave progress to just
reach the drop threshold; it never calls pickup spawn/collect directly.
It waits across physics frames and crosses the **visible field** with keyboard
input. Full-HP heals stay on the map and must actually display `HP FULL`.

Before correction, all 24 scheduled pickups had displaced collision bodies,
and all 16 bomb/magnet crossings failed. The same test after correction has
zero failures: the bodies remain aligned, all 16 bomb/magnet effects trigger,
and all eight full-HP health contacts produce feedback while preserving heal.
Coverage: all three maps at desktop size, plus Harvest Yard in portrait DPR 3
with CPU throttled sixfold. These are controlled combat fixtures, not a claim
to have replicated every possible live run.

The constructor now calls `body.preUpdate(false, 0)` after sizing the body.
This initializes the current position **and its frame history**, without
advancing physics. It also initializes rotation history. No contact radius,
spawn budget, effect or artwork size is changed.

The test is part of the release gate and therefore runs against the compiled
bundle before `npm run package:kongregate` creates upload artifacts.

Commands:

```text
npm run test:pickup-spawn-frame
node tests/pickup-spawn-frame-runner.mjs --release
npm run package:kongregate
```

Detailed local reports are written to `test-results/pickup-spawn-frame-*.json`.
`--report-only` records all failures for comparison without failing early.

## Verified upload

The full release gate passed for `index-CMJAfBRM.js`, including the 24 new
combat-drop cases, 108 ground-contact crossings, 60 body-contact crossings,
pickup sequences, diagnostics, bomb effects, map streaming and the portal
iframe/Kongregate integration. The split upload's 154 archived assets match
the tested release byte for byte. Its `index.html` and ZIP also match the
tracked copies under `releases/kongregate/`.
