# Healing aura — isolated before/after study

Created 2 November 2026. This directory is a proposal only. No production code,
asset registration, gameplay values, release package or deployment was changed.

## Comparison

- Left: the actual, unmodified `EnemyAuraVisual` class, green regeneration style,
  radius 185, with its original texture and animation.
- Right: a separate procedural effect defined only in `study.js`: tapered rising
  ribbons, sparse light motes, short dissolving arcs and soft ground illumination.
- Both sides use the same real support-enemy sheet at the existing 0.28 scale,
  the same ground texture, crop and color grade, and identical poses/positions.
- Eight-second loop: four seconds standing, four seconds moving. No combat or
  healing mechanics run in this scene. The proposed footprint is decorative and
  is not a representation of a changed buff radius.

## Files

- `healing-aura-before-after.gif`: looping inline comparison, 24 fps.
- `healing-aura-before-after.mp4`: higher-quality 1120 × 614 comparison, 30 fps.
- `healing-aura-before-after.png`: still comparison.
- `healing-aura-canvas.png`: Canvas-renderer check.
- `motion-review.png`: four frames of the proposal for visual inspection.
- `verification.json`: captured runtime checks.

Open `docs/qa/healing-aura-study/index.html` through the repository's Vite dev
server to view the live study and use Pause. Reproduce captures from the project
root with `node docs/qa/healing-aura-study/capture.mjs`. The capture script uses
the installed local Chromium path and ffmpeg; only this directory receives output.

## Verification

The study loaded in WebGL and Canvas without browser errors or failed requests.
The loop endpoints rendered pixel-identically. The hash of the existing tracked
working-tree diff was unchanged before and after capture. No production gate was
run because this prototype is not part of the game or release build.

This is a visual approval sample, not evidence of crowded-scene performance or
production lifecycle behavior. Those checks belong to a separately authorized
integration pass.
