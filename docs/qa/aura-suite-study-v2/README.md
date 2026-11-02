# Stronger aura proposals — second suite study

Created 2 November 2026. The approved choreography has now been integrated
into `src/systems/EnemyAuraAnimation.js` and `EnemyAuraVisual.js`, including
the stronger healing and boss variants. Gameplay ranges and damage remain
unchanged. This preview and the earlier `healing-aura-study` and
`aura-suite-study` are preserved as historical comparisons.

## Comparison baseline

**Left is the last proposed effect, not the current production ring.** It imports
`AuraProposal` directly from `../aura-suite-study/effects.js`, unchanged.
Right is the stronger effect in this directory's `effects.js`. Both sides use
the same current enemy sprite, scale, pose, movement, background and crop.

The canvas has more vertical room for the boss's rising particles. The figure
scale and camera magnification are unchanged from the previous study. Each
eight-second loop contains four seconds standing and four seconds moving.

## Changes relative to the previous suite

- Green healing: spatial reach grows from a 1.2 to a 1.8 size parameter (50%
  wider); eight rather than six rising strands, 24 rather than 13 active light
  motes, stronger soft illumination and thicker streams.
- Violet regeneration: spatial parameter 1.55 rather than 1.2, eight strands,
  24 motes and increased visibility.
- Wind: four stronger currents, a slightly wider footprint, 16 visible motes,
  and stronger movement trails.
- Armor: wider/taller fragments, radius 82 rather than 70, more visible
  translucent faces and luminous edges, and 12 motes.
- Explosion: stronger perimeter and embers, nine rising tongues and 16 motes.
  The radius remains 86 with the same 0.42 projected ellipse aspect. This study
  does not assert that that ellipse matches the gameplay collision geometry.
- Boss: outer arc radius 166 rather than 95 (approximately 75% greater), eight
  large rising streams, 56 particle sprites rather than 18, including 19 baked
  gold sprites, short gold trails, and a broader violet light field. Particle
  ascent is 145–184 units, compared with 60–86 previously.

These are visual controls only, not new gameplay ranges. The preview does not
execute attacks or healing. Stronger pulses demonstrate art timing, not combat
events. All movement periods divide the eight-second capture cycle.

## Review

- `royal-before-after.gif` / `.mp4`: explosion and boss.
- `healing-before-after.gif` / `.mp4`: green and violet regeneration.
- `defense-before-after.gif` / `.mp4`: wind and armor.
- `all-six-auras-before-after.mp4`: all three comparisons in sequence.
- `*-before-after.png`, `*-moving.png`, `*-canvas.png`: rendering inspection.
- `verification.json`: captured browser/rendering/source-preservation checks.

For live viewing, serve the existing project with Vite and open
`docs/qa/aura-suite-study-v2/index.html`. Group navigation and Pause are included.
Run `node docs/qa/aura-suite-study-v2/capture.mjs` from the project root to
reproduce; `--still` produces the still previews only. Captures use the locally
installed Chromium and ffmpeg.

## Verification scope

The browser capture checks WebGL and Canvas, missing resources and browser
errors, equal subject scales/frames, identical loop endpoints, preservation of
the tracked working-tree diff and the previous proposal modules. Visual review
covers stationary and moving poses. Production performance under horde load,
attack readability, game lifecycle cleanup and release tests are outside this
isolated preview and have not been claimed.
