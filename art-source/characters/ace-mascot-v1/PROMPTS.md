# Barnyard Ace Mascot v1 – ImageGen sources

Built-in ImageGen, genuine transparent background. Immutable generated source kits are retained under `generated/`. The three user references are retained under `references/`. These are drawings of fixed components, never separately generated animation frames. Technical cropping, affine posing and baking are deterministic build steps.

## South kit

Square transparent 3×3 cutout kit. White compact humorous rooster game hero, very large amber eyes, strong orange beak with cheeky confident closed smirk, curved brows, oversized red lobed comb, short round body, red neckerchief, gold target emblem, brown belt with two white eggs. Large color masses, dark-brown outer contour, restrained cel-painted shading, upper-left light. No fine hatching, chainmail, tiny rivets, weapon, floating eggs or text.

Cells: head with eyes/beak/wattles but no comb; detached comb; short torso with scarf/target/belt/two eggs but no limbs; left complete wing/arm with gold cap and feather fist; matching right wing; short grouped-feather tail; left complete short leg/three-toed foot; matching right leg/foot; assembled design guide. South view, slightly elevated camera, transparent separation and complete attachment overlaps. Reference images are mood/design inputs, not drawings to downscale.

## West kit

The approved south kit is the continuity reference. Same compact rooster, palette, proportions, eye style, closed confident beak, red comb, gold target armor, red scarf, brown belt and two eggs. True left-facing profile with a slightly elevated game camera. Keep the head much larger than the short torso. Same eight detachable components in the same 3×3 layout: head without comb, comb, body without limbs, two complete wings with shoulder armor and fists, grouped short tail, two complete short legs/feet, assembled guide. Complete overlap at attachment points. Keep each component isolated on genuine transparency with generous cell separation. No weapon, floating projectile, lettering or cast floor shadow. East is derived by mirroring this view; it is not separately generated.

## North kit

Use the approved south and west appearance for the same costume and anatomy. Rear-facing view at the game's slightly elevated camera. Rear of white feathered head, no eyes or beak visible; detached red comb seen from behind; short back torso with red scarf, brown belt and matching warm gold costume; two rear-view wings with armor; compact grouped-feather tail; two short legs with rear-facing heel/foot anatomy. Same 3×3 detachable-component layout and isolated transparent cells; assembled reference in the last cell only. No front target emblem projected onto the back, no new equipment, no tiny decorative hatching, text or weapon. Preserve the humorous large-head, short-body silhouette.

These are readable summaries of the generation specifications, not a claim that generative output can be recreated byte-for-byte. The retained PNGs and their SHA-256 hashes are the authoritative build inputs. All eight frames of a direction reuse those exact drawings. The assembled guide in each ninth cell is never used as an animation frame.

## Selected sources and controlled build

| View | Retained source | Built-in ImageGen output |
| --- | --- | --- |
| South | `generated/south-kit.png` | `exec-1a81da00-4b44-402b-8835-b37f7aa861b2.png` |
| West | `generated/west-kit.png` | `exec-289913aa-770a-43a5-a3e7-ea385996fc37.png` |
| North | `generated/north-kit.png` | `exec-a3cf8853-daba-432a-ba89-1c0f3888cba2.png` |

`prepare-ace-mascot.py` extracts the eight components per view, removes disconnected neighboring-cell fragments and preserves antialiased edges. `parts.json` records crop rectangles and source/component hashes. `aceMascotPose.js` supplies fixed-size parts with translation and small rotations; the beak and facial features stay together within the head, while chest armor stays within the body. The comb and tail have separate, delayed motion. There is no changing anatomy or per-frame redraw.

`export-ace-mascot.mjs` samples eight phases for each direction/state. `render-ace-mascot.py` composites at 2× resolution in premultiplied alpha, downsamples to 256 px and writes the runtime sheets. WebP uses quality 94 for color and preserves the rendered alpha exactly (checked after decoding). Source PNGs remain unchanged. Retained old Ace sheets are separate and support rollback.
