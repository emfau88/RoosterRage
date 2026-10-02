# Boombardier mascot sources

Generated with the built-in ImageGen tool on 2 October 2026. The user reference is retained under `references/boombardier.png`. The approved Ace component kit supplied the simplified style and cutout layout. Exact prompts: `generated/south-prompt.txt`, `west-prompt.txt`, `north-prompt.txt`, `tail-prompt.txt`.

Orange feathers, red comb and tail, brown/gold armor, large gloves, two simple egg pouches and an explosion emblem preserve the reference identity while removing microtexture, sparks and the held weapon. This is a humorous heavy bomber; game damage, attack timings and projectiles are unchanged.

Three direction kits and one separate complete tail sheet are immutable inputs. The dedicated tail sheet replaces the crowded kit tail and provides a complete broad rump root. `prepare-artillery-mascot.py` extracts 24 fixed components with source rectangles and SHA-256 hashes in `parts.json`. `artilleryMascotPose.js` supplies rigid transforms; west is authored, east exactly mirrored. No independent generated animation frames, changing drawings or interpolated anatomy.

Rebuild: Python with Pillow, then `prepare-artillery-mascot.py`, `export-artillery-mascot.mjs` (Node), `render-artillery-mascot.py`. Eight walk phases over 650 ms, eight idle phases over 3200 ms. Existing scale 0.275 is retained. Rendering uses premultiplied alpha, 2x supersampling, WebP quality 94 and exact exported-alpha validation. QA captions currently require Windows Arial.
