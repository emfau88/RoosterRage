# Enclosed arena and Rocket Egg rendering

Coop Square (including Featherweight) has a finite 1400x900 artwork/world.
The old desktop zoom stayed at 1 even on 1920x1080 or 2560x1440 displays.
Phaser clamps camera bounds smaller than its visible area to their top-left,
so the whole map occupied only that corner while the canvas itself was full size.

Large desktop views now enlarge this arena to fit the limiting dimension.
Excess camera space is centered in each axis. Smaller views retain camera
following and portrait zoom; physics bounds and arena coordinates are unchanged.
Streaming maps keep their existing zoom and bounds behavior.

Rocket Egg selected its next steering velocity during scene update and used
that angle immediately for the sprite, before Arcade completed the current
step's position update. Its separate exhaust was also placed before that move.
The old-commit comparison with a moving target measured a maximum 1.335 degree
nose/movement difference and 6.333 world-pixel exhaust displacement.

Sprite direction now follows completed displacement in scene post-update;
exhaust and shadow follow the final rendered position. Pause retains direction
and destroy removes the post-update listener. Flight speed, steering rate,
targets, lifetime, damage and blast radii are unchanged. The same comparison
measured only floating-point noise after the fix (below 1e-12).

`npm run test:display-projectiles` runs WebGL and Canvas, real Featherweight,
six viewport sizes including 3440-wide and portrait, resize and the Fullscreen
API, unchanged physics bounds, all five Rocket Egg variants in eight directions
with moving targets, pause and listener cleanup. It also runs against the
bundled release as part of `test:release`.

`npm run test:mechanics` verifies existing weapons and map behavior. The full
Kongregate release gate still includes aura layering and pickup regressions.
No sounds or additional flame/smoke assets were changed in this fix.

The first CI deployment passed the new display/rocket tests but failed the
existing streaming diagnostic's fixed 1.6-second keyboard segment. CI's saved
Heal fixture still had its player foot at Y=65920.924, before the pickup at
Y=65955; no obstacle had returned. An 8x CPU slowdown reproduced this failure.
That diagnostic now waits for actual collection or crossing (bounded at 10s)
instead of assuming wall time guarantees sufficient travel. Exactly-once
effects, obstacle persistence and restart assertions remain required. Use
`node scripts/diagnose-pickup-streaming.mjs --expect-fixed --cpu-slowdown=8`
to exercise the slow-renderer case. This changes no game or upload bundle.
