# Boombardier pipeline before redesign

Baseline c92942b: approved Ace and Stormcrest mascots, Boombardier still artillery-final. Existing artifacts preserved. Work on codex/boombardier-character-redesign.

Boombardier uses two 2048x1024 WebP atlases, eight 256px phases, south/west/west/north; east mirrors west. Walk 650ms, idle 3200ms. Scale 0.275 before viewport multiplier. Preserve scale, origin, collider, damage, speed, projectile and firing behavior. No experimental arm-raise attack will be shipped.

Plan: three immutable cutout kits matching the approved mascot style. Orange feathers, red comb and full tail, chunky brown/gold armor, simple egg pouches and explosion emblem. Heavier body and slower restrained bounce distinguish the bomber. Eight coherent walk and idle phases per direction, exact side mirroring. Retain all old assets and build/query rollback.

Verify original character suites, source hashes, silhouettes, production in three maps and three viewports, offline animation comparison and eleven before/after scenes. Publish the combined approved Ace/Stormcrest plus new Boombardier through the existing README Kongregate preview link. GitHub Pages workflow builds master for the root and codex/kongregate-upload for /kongregate/; update the latter after checking remote divergence. Verify deployed build-info and all three new textures through the public URL.
