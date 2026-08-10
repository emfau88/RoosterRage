# Weapon/EVO Asset Bulk 2

Date: 2026-08-10

## Delivered

The five previously uncovered evolutions now use dedicated atlas icons and combat art:

- Thunder Roost: icon and electric feather/egg impact
- Shell Halo: icon, armored orbit egg, and contact impact
- Singularity Nest: icon and persistent rune-vortex zone
- Dawn Prism (`evo-dawn-laser`): icon, muzzle prism, and beam impact
- Chick Squadron: icon, armored companion, winged egg projectile, and impact

UI frames 42–46 form the eighth atlas row. The source build recreates both EVO rows from the individual transparent icons.

## Runtime size and motion policy

| Asset | Runtime texture | Visible in-game target |
| --- | ---: | ---: |
| Shell Halo projectile | 40 × 40 px | one of six orbit objects |
| Chick Squadron projectile | 36 × 36 px | compact homing salvo |
| Chick Squadron companion | 96 × 96 px | 44 × 44 px display size |
| Thunder / Shell / Dawn / Chick impacts | 256 × 256 px | 58–72 px, 155–175 ms |
| Dawn Prism emitter | 64 × 64 px | 38 px, 260 ms fade |
| Singularity zone | 256 × 256 px | about 145–230 px, radius-dependent |

Collision and damage radii remain independent of texture size. Static hit illustrations are limited to sub-180-ms scale/rotation/alpha tweens, where a single expressive frame reads cleanly. The persistent Singularity artwork rotates and pulses; Dawn Prism keeps three code-rendered beams so the attack remains directional and visibly animated. This avoids oversized static overlays.

## Integration

- all five upgrade cards use their dedicated atlas frame
- Thunder Roost replaces the generic lightning hit flash
- Shell Halo uses its armored orbit texture and contact flash
- Singularity Nest uses the rune-vortex while the gameplay ring still shows the full pull radius
- Dawn Prism adds a short muzzle emitter and dedicated contact flash to its dynamic beams
- Chick Squadron uses dedicated companions, projectiles, and hit flashes
- Shell Halo text now correctly states the implemented six-orbit formation

## Validation

- `npm run assets:check`: pass, 71 current runtime images
- `npm run build`: pass
- `npm run test:evolution`: pass for all EVO recipes and dedicated Bulk 2 runtime textures
- `npm run test:weapon-progression`: pass; all five Bulk 2 EVO screenshots inspected after size tuning
- `npm run test:mechanics`: pass; Triple Shot snapshot made deterministic by triggering the tested attack explicitly
- `npm run test:smoke`: pass
- runtime assets are 91.9% smaller than their source PNG set overall
