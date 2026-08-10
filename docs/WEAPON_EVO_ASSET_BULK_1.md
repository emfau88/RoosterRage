# Weapon/EVO Asset Bulk 1

Date: 2026-08-10

## Delivered

Dedicated icon, combat object/projectile, and impact art is integrated for:

- Sunshot Array
- Siegebreaker Shell
- Tempest Crown
- Solar Scramble
- Phoenix Pan
- Broodstorm

The six icons occupy frames 36–41 in the existing UI atlas. The build script recreates the seventh atlas row from the individual transparent source icons and emits optimized WebP runtime assets.

## Runtime size policy

| Asset | Runtime texture | Visible in-game target |
| --- | ---: | ---: |
| Sunshot projectile | 32 × 32 px | compact primary shot |
| Siegebreaker projectile | 40 × 40 px | heavy primary shot |
| Tempest projectile | 32 × 32 px | compact fast primary shot |
| Solar projectile | 36 × 36 px | medium special shot |
| Phoenix projectile | 36 × 36 px | medium arcing special shot |
| Broodstorm projectile | 42 × 42 px | large rocket silhouette |
| Primary impacts | 256 × 256 px source | 58–76 px diameter, 150–170 ms |
| Solar impact | 256 × 256 px source | 90 px diameter, 185 ms |
| Phoenix impact | 256 × 256 px source | 96–126 px diameter, 205 ms |
| Broodstorm impact | 256 × 256 px source | 112–148 px diameter, 210 ms |

Collision and damage radii remain gameplay-driven and are not derived from texture size.

## Art and motion decision

Each impact is a static transparent sprite animated with a short scale, rotation, and alpha tween. This is appropriate for compact hit flashes, but less expressive than a frame sequence for persistent fire or large smoke. Phoenix Pan and Broodstorm are the first candidates for 4–8-frame animation if later device or external tests find the current 205–210 ms treatment visibly static.

## Validation

- `npm run assets:check`: pass, 58 current runtime images
- `npm run build`: pass
- `npm run test:evolution`: pass for all EVO recipes
- `npm run test:weapon-progression`: pass for all R1/final/EVO paths
- EVO screenshots inspected for all six Bulk 1 paths; projectile and effect footprints remain local and readable
