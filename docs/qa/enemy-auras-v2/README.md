# Animated enemy aura proposal

The approved effects are now integrated. See `INTEGRATION.md`,
`integrated-webgl.png`, `integrated-canvas.png` and `integration-report.json`
for production-renderer captures and checks. The labelled GIF/MP4 below preserve
the approval preview; their footer describes the earlier proposal stage.

Actual Phaser WebGL captures of the six existing enemy sprites on Harvest Yard.
The top row uses new slender image_gen textures and 20% smaller visual radii
(148 / 164 / 168). Bottom-row art and sizes match the previous preview.
This is a staged presentation; production gameplay and aura ranges are unchanged.

The eight-second loop uses stationary ground ellipses, masked moving highlights
from the same art, small light accents and restrained alpha pulses. Wind lights
circulate quickly; shield segments brighten sequentially; regeneration motes
rise; the bomber pulses once per second; the boss has slow travelling highlights.
All animation periods divide eight seconds so the loop closes without a jump.
No opaque floor images and no rotation of the ground ellipse are used.

Outputs: `all-enemies-animated.gif` (1305×780, 20 fps, looping),
`all-enemies-animated.mp4` (1740×1040, 20 fps), and `all-enemies-ingame.png`.
The render report records enemy sizes, proposed aura sizes and browser errors.
Image sources, prompts, transparent center checks and crop measurements live in
`art-source/fx/enemy-auras-v2/`.

Reproduce from the repository root with `node scripts/capture-enemy-aura-animation.mjs`.
Requires the existing Playwright setup and ffmpeg on PATH. The temporary capture
frames are deleted after both videos have successfully encoded.
