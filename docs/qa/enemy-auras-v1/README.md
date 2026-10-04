# Enemy aura assets and in-engine preview

Generated with the built-in ImageGen tool, 2026-10-04.

Five original RGBA PNGs are saved under `art-source/fx/enemy-auras-v1/`.
The final prompt set and source provenance are in `prompts.json`; transparency
measurements are in `alpha-checks.json`. All five have alpha zero at their
center and 74–81% fully transparent pixels. They are hollow elliptical rims,
with no opaque ground patch. Original generated files are preserved.

`all-enemies-ingame.png` is a staged screenshot in the actual Phaser WebGL
renderer on Harvest Yard, using the current enemy sprites at their normal
scales. Green and violet use the same neutral regeneration texture with
runtime tint. The large passive auras retain their current X diameters;
the boss decorative preview uses a proposed radius of 125 world units.
The displayed rim height is 42% of its width. Labels are preview overlays.

The game is paused for this presentation. No production aura logic, hitbox,
pickup logic, release bundle or upload package was changed. Animation and
gameplay integration are pending. A perspective ellipse should retain its
orientation: animate lighting, localized accents and restrained pulses rather
than rotating the entire ellipse like a flat wheel. Danger visualization and
actual damage radius need separate calibration when integrated.

To recreate the screenshot from the project directory:

```text
node scripts/capture-enemy-aura-preview.mjs
```

`preview-metrics.json` records the visible image bounds used for centering.
`preview-report.json` records enemy mappings, sizes, alpha settings and the
browser error list (empty in the verified capture).
