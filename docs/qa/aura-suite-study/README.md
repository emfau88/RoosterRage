# Six enemy auras — isolated comparison study

Created 2 November 2026 after the initial green healing-aura proposal.
All new effects are confined to this directory. The game, production assets,
release archives and deployment have not been edited or rebuilt. The first
`healing-aura-study` remains intact for comparison.

## Proposed effects

| Group | Effect | Proposed treatment |
| --- | --- | --- |
| healing | Green regeneration | Initial design with spatial dimensions and ribbon width multiplied by 1.2; HSL saturation multiplied by 1.1. Rising tapered ribbons, motes and diffuse ground light. |
| healing | Violet regeneration | The same visual family with a violet palette and independently phased ascending energy. |
| defense | Wind | Fast open golden currents, fading tails and additional trails while moving. |
| defense | Armor | Small translucent shield fragments with travelling highlights and staggered pulses. |
| royal | Explosion warning | Thin stable boundary, heat pulses and rising embers. The original projected radius 86 and 0.42 ellipse aspect are retained. |
| royal | Boss identity | Slower violet streams and short golden currents around the feet. |

The requested percentage increases are art-control parameters, not measured
physical volume or perceived brightness. The green proposal is compared against
the production original in the exported media, not against the first prototype.

## Honest comparison

Left sides instantiate the unmodified production `EnemyAuraVisual` class with
its production texture, radius and animation. Right sides instantiate the new
`AuraProposal` class from `effects.js`. All subjects use their actual current
enemy sheets and production scales. Within each pair, the background, crop,
color grade, pose, frame and movement match. No camera zoom is applied.

Each eight-second loop shows four seconds standing and four seconds moving.
Movement is a staged demonstration, not an AI or combat simulation. All intensity
pulses in this study are visual demonstrations; no attacks, buffs or healing
are executed. The compact decorative effects do not redefine ability ranges.
Retaining the existing bomber ellipse does not establish that the ellipse is an
accurate representation of the gameplay collision geometry.

## Review files

- `healing-before-after.gif` / `.mp4`: green healing and violet regeneration.
- `defense-before-after.gif` / `.mp4`: wind and armor.
- `royal-before-after.gif` / `.mp4`: explosion warning and boss identity.
- `all-six-auras-before-after.mp4`: the three comparisons in sequence, 24 seconds.
- `*-before-after.png`, `*-moving.png`: stationary and moving stills.
- `*-canvas.png`: alternative-renderer checks.
- `verification.json`: actual capture results and scope checks.

View `docs/qa/aura-suite-study/index.html` through the existing Vite dev server
for the live preview with group navigation and Pause. The group URL parameter
is `healing`, `defense` or `royal`; `renderer=canvas` selects the fallback.
Reproduce with `node docs/qa/aura-suite-study/capture.mjs` from the project root.
The capture script uses the installed local Chromium and ffmpeg. Its frame
directories are checked against this exact output directory before removal.

## Verification scope

The capture checks both renderers, console and failed HTTP requests, equality of
subject scales/frames, identical loop endpoints, the tracked working-tree diff,
and the unchanged first healing-study source. Visual review covers still and
moving states of every effect. No full-game performance, combat readability,
pause/death/pooling lifecycle or production release gates are claimed. Those
belong to a later integration pass if the proposed artwork is accepted.
