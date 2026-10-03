# CURRENT PIPELINE — Stormcrest before changes

Baseline d8fe3fb, approved Ace pushed to origin/codex/ace-character-redesign. New work is isolated on codex/stormcrest-character-redesign. Existing Ace and Boombardier assets remain unchanged.

Storm currently loads storm-final idle/walk WebPs through the development version router and the production asset module. Both are 2048×1024, eight 256px frames per direction, rows south/east/east/north; west is mirrored east. Walk cycle 480ms, idle 2400ms. The existing Final rig is generated from reusable earlier-generation components. Its tests and rollback assets remain available.

Player.updateAnimation selects direction and walk/idle from velocity. Storm faces east in the shared side row (unlike Ace). Rendering uses origin 0.5/0.5 and the existing class scale; collider derives from the independent collisionReferenceScale. The contact shadow uses playerVisualBounds for the final version. CombatSystem emits actual Storm eggs every allowed primary shot; its damage, chain, timing and projectile behavior are separate from the animation.

Plan: three immutable authored direction kits, blue/cyan plumage, red comb, white scarf, simple lightning medallion and upright fan. Fixed parts with controlled poses, eight-frame sheets and exact side mirroring. Preserve all gameplay values and the collider. Add a short optional visual attack pose by selecting attack-sheet frames using the CURRENT walk/idle frame plus an upper-body attack phase. Never restart the leg cycle, rotate the collider or block movement. Only actual primary shots trigger it. If runtime checks cannot establish phase continuity, ship the character without this optional effect.

Validation: existing character suites plus geometry/loops/source checks; real production captures of all three maps in three viewports; old/new isolated animation viewer; moving attack and return-to-idle checks, release and acceptance gates. Keep the old Storm selectable with a development query and production build variable.

Final decision after user review: the character is approved for replacement and push. The experimental attack is retained only in the isolated viewer because the bilateral arm raise reads as flapping. Game builds include only the new idle/walk sheets; original combat code is unchanged.
