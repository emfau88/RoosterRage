# Integrated enemy auras

The approved V2 wind, shield and violet regeneration art is used in production,
with visual radii 148, 164 and 168 (20% below the former circle radii).
Green support regeneration uses the approved V1 ring at 185, bomber warning
uses the danger ring at 86, and the boss has a royal identity ring at 125.
All are hollow ground ellipses, height 42% of width, centered at the enemy's
ground contact (sprite Y + display height × 0.28). Buff radii remain 185/205/210/185;
identity artwork is decorative, not a new gameplay area calculation.

Ground auras use the distinct depth 2.5: above floor details (<=2), below solid
props (3), hay/crates and mobs (4). The previous shared depth 3 let late-created
auras paint over existing solid props. A real tractor overlap reproduced this
in both renderers; the opaque core now matches the no-aura image exactly.
`test:enemy-aura-layers` checks all six styles against foreground props/mobs,
and is part of the release gate. See `layer-audit/` for before/after captures.

The same textures replace the boss entry shield/phase pulse, attack charge,
radial stomp warning/impact and delayed bomber explosion warning. Directional
attack paths remain visible. Damage, buff values, targeting and attack timing
are unchanged. Death warnings retain their location if the enemy pool reuses
the object. Other aura art follows the current activation and cleans up on death.

Animations use the simulation clock, so settings, upgrades and other pauses
freeze their lights. Ellipses never rotate. Grayscale regen textures are tinted
once into shared canvas textures, giving green/violet art in both renderers.
No opaque floor overlay is added. Six transparent WebP textures total 185368 bytes;
`npm run assets:enemy-auras` reproduces them from preserved ImageGen masters.

`npm run test:enemy-auras` verifies WebGL and Canvas, all six sizes/styles,
animation and pause, following at the feet, 50 pool cycles without hook leaks,
stationary timed death warnings, unchanged buff reach, killed charge cleanup and
scene restart. The release gate runs the same test against the built portal files.
Existing release pickup tests remain required.
