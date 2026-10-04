# Aura foreground audit

All six aura styles are staged against an existing solid tractor, hay bales,
a crate and other enemy sprites. Props retain their real renderer depths and
are created before the auras, reproducing normal scene/pool ordering.

Before: aura depth 3 equalled the tractor's depth 3. Wind highlights modified
the tractor's central opaque region in WebGL and Canvas. Hay/crates/mobs were
already above the aura at depth 4.

After: aura depth 2.5 is strictly below both prop layers and all enemy bodies.
The tractor core matches the no-aura baseline exactly. The three upper rings
retain their approved size/line weight. Attack paths and gameplay ranges are
unchanged. Existing animation/pause/follow/death/pool/restart checks also pass.

Run `npm run test:enemy-aura-layers` to capture both renderers and verify their
depth relationships. The test is also executed against the production package.
