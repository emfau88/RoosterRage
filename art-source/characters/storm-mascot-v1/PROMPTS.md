# Stormcrest source artwork

Generated with the built-in ImageGen tool on 2 October 2026. The three user references are preserved in `references/`. The south kit establishes the simplified style; east and north use the approved kit drawings as visual references. Exact prompts are in `generated/*-prompt.txt`.

The three selected transparent PNG kits are immutable inputs. `prepare-storm-mascot.py` extracts 24 connected parts from explicit reviewed rectangles; `parts.json` records the source rectangle and SHA-256 of every source and extracted part. No image model generates individual animation frames.

Identity: cobalt/cyan feathers, swept red comb, white scarf, brown harness with restrained gold trim, single lightning emblem, plump body, broad upright tail. The chain weapons and dense electric particles in the user references were simplified out of the sprite. Existing projectile mechanics are unchanged.

The rear-feet experiment did not improve anatomical clarity enough to replace the selected kit. Its prompt is retained as process history; its output is not used. Rear toes remain stylized, not an anatomical reference.

`stormMascotPose.js` poses the same parts with rigid transforms; east is authored, west mirrored. Walk 480 ms and idle 2400 ms, eight phases each. Two experimental wing poses use the same leg phase, head, torso, tail and comb. They are available only in the isolated comparison, not loaded by the game.

Rebuild: `python scripts/prepare-storm-mascot.py`, `node scripts/export-storm-mascot.mjs`, `python scripts/render-storm-mascot.py`. Python needs Pillow; QA captions currently use Windows Arial. This is deterministic extraction and rendering, not a fresh image generation.
