# Ace Gameplay V1

This opt-in gameplay profile uses the current four-direction Ace as its base and
amplifies pose readability at the runtime scale. The runtime atlases are baked
from `src/ace-preview/aceGameplayPose.js` with `npm run assets:ace-gameplay`.

The source cutouts in `parts/` were generated with the built-in ImageGen tool
from the corresponding current Ace wing/body assets and the Legacy Ace pose as
a silhouette reference. The selected outputs are:

- `south-arm-fist-left-v1.png`: front-view arm with a compact feather fist and
  no pauldron.
- `west-arm-fist-near-v2.png`: side-view bent arm with a forward feather fist
  and no pauldron.
- `north-arm-fist-left-v1.png`: rear-view arm with a compact feather fist and
  no pauldron.

The shared prompt constraints were: preserve the current Ace's warm ivory
feathers, dark outline, highlights, and painterly cel shading; use the Legacy
Ace only for the compact fist silhouette; output exactly one isolated arm; no
body, head, belt, tail, legs, text, shadow, or metal; keep the fist readable at
25% scale. The final transparent cutouts were converted losslessly to the
versioned WebP parts consumed by the rig.

The south and west shoulder overlay WebPs contain exact pixels extracted from
the existing current body assets. They are drawn after the fists so the runtime
layering is torso → arm/fist → original pauldron. The north fists stay below the
rear torso because the arms belong on the unseen front side in that view.
