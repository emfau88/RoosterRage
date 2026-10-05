# Farm menu and full-body roster presentation

The approved visual pass is enabled in development, GitHub Pages and the
portable Kongregate release. Native HUD markup owns the shared launch footer;
character/map selection updates its label directly, without DOM observers.

- New menu: http://127.0.0.1:5173/
- Existing menu for comparison: http://127.0.0.1:5173/?menu=classic
- Static loading-screen design: http://127.0.0.1:5173/docs/qa/menu-preview-v1/loading.html

The static loading preview illustrates the layout at 68%; the real game's
loader still reports the existing actual asset progress and error states.
Gameplay, map selection, rooster selection, saves and upgrade controls are
unchanged. The Play screen uses smaller full-body character cutouts and a CSS
ground shadow. Roosters cards, loader portraits and gameplay sprites retain
their existing artwork. The small idle motion respects reduced-motion preferences.

## Assets and generation

Built-in Imagegen was used. Generated originals are preserved in
`art-source/ui/menu-preview-v1/{farm-sunset,rooster-rage-logo}.png`.
Optimized WebP exports are in `src/assets/ui/menu-preview-v1`.
The farm is 1599×900 (198836 bytes); the transparent logo is 960×289
(54236 bytes). The three full-body cutouts are 512×512 and retain actual alpha.
Original character portraits were the identity/style references; full prompts
are preserved in `art-source/ui/menu-preview-v1/fullbody-prompts.json`.
`python scripts/prepare-menu-assets.py` reproduces all five WebP exports and
their SHA-256 manifest. Total menu artwork is 412952 bytes.

Farm prompt:

> Use case: stylized-concept. Asset type: wide landscape game menu background for Rooster Rage, an illustrated cartoon battle-rooster farm game. Generate a high quality widescreen 16:9 illustration, no UI or lettering. A charming rustic farmyard at golden hour, distant red barn on the left edge, wooden fence, warm straw, a few hay bales framing the far edges, rolling fields, soft golden evening light, muted teal shadows, slightly painterly cartoon illustration with clean rich shapes, polished mobile game artwork, not photorealistic. Composition for an actual responsive interface: generous quiet darker midground across the central two-thirds for readable menu panels, softly blurred distant scenery, no central focal object, no rooster or characters; interesting scenery is around the perimeter so central UI remains readable. The bottom-center ground is simple and shadowed, upper sky has subtle warm glow. Do not create a screenshot, buttons, panels, logos, words, watermarks or decorative frames. Full-bleed background landscape artwork only.

Logo prompt:

> Use case: logo-brand. Asset type: transparent title logo for the illustrated battle-rooster mobile game Rooster Rage. Create only a polished, bold illustrated game wordmark on a genuinely transparent background, wide horizontal composition about 3:1. Exact text: "ROOSTER RAGE" spelled R O O S T E R space R A G E, no additional lettering. Two lively words on a single line, strong readable chunky custom lettering, warm ivory to golden-yellow fronts, rich dark brown outline and subtly shaded reddish brown dimensional sides, restrained illustrated highlights, clean silhouette. Integrate a small red rooster comb silhouette above the first R and a little tail feather flourish at the far end, secondary to the lettering, no animal face, no badge or bulky shield. Playful but punchy action-game identity that remains readable at 240 pixels wide. Lettering must be crisp and correctly spelled. No background, no ground, no full scene, no UI, no mockup, no watermark, no outer rectangle. Maintain generous transparent padding around the full logo.

## Review and checks

`npm run test:menus` exercises the existing 20 viewport sizes and menu
interaction scenarios. Its overlap assertion now checks rectangle intersection
so both side-by-side and vertically stacked controls are tested correctly.
Reproduce before/after, desktop, phone and loader screenshots in isolated
browser contexts with `node scripts/capture-menu-preview.mjs`.
The map title and run summary share one preview image; their text rectangles
remain separate. Small screens scroll the map/expedition area within its own
region, while the rooster and Start Run remain accessible. Minimum grid rows
prevent preview art from painting over the expedition swipe controls.

To accommodate the menu within the existing 19 MiB release budget, the three
UI map posters are exported from their preserved PNG masters at 1024×683,
WebP quality 88. Their in-game map textures and gameplay assets are unchanged.
The release is 19869161 bytes, below the 19922944-byte cap. The asset optimizer
reproduces the poster dimensions; `npm run assets:check` verifies the hashes.

Final gate logs are in `test-results/menu-redesign-responsive.log`,
`test-results/menu-release-gate.log` and `test-results/menu-pages-gate.log`.
All 20 responsive viewport checks and all four interaction scenarios passed.
The release gameplay and GitHub Pages gates passed. After the final CSS row
placement correction, the rebuilt production menu is separately checked at
nine sizes for all three full-body figures, selection/footer synchronization,
real Start Run, absent Test API and phone touch scrolling.
