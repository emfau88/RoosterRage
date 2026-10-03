# Pickup ground contact: reproduced cause

Date: 2026-10-04. Baseline: `916f01b`, clean working tree before investigation.

Follow-up: this corrected the ground anchor but was incomplete. The separate
loss of valid player-body overlaps is reproduced and corrected in
[pickup-body-contact.md](pickup-body-contact.md).

## Cause

Normal pickups draw their ground field and shadow at `sprite.y + 11`. Their
floating icon bobs around `sprite.y`. `PickupSystem.update()` compared the
rooster's foot marker to the icon's center instead of the visible ground point.
The Arcade body had the same incorrect center. This shifted the collection
circle 11 world units upward, causing missed contact below the item and premature
collection above it.

The smaller bomb radius made this especially visible. With mobile Ace, a real
horizontal keyboard crossing along the icon's center left the bomb active,
while health and magnet triggered on that exact path:

| Item | Closest foot distance to old contact point | Allowed distance | Collected |
| --- | ---: | ---: | --- |
| Health | 28.92 | 29 | Yes |
| Bomb | 28.75 | 25 | No |
| Magnet | 28.92 | 29 | Yes |

At desktop size, the larger rooster artwork put the feet even farther below the
icon. All three pickups missed this horizontal center crossing for all three
roosters. Foot-aligned center crossings still worked; no runtime errors occurred.

## Regression before the fix

`node tests/pickup-ground-contact-runner.mjs` failed on its first real crossing:
desktop Ace, health pickup, south side of the visible field. The field was at
`(700, 461)`, the old contact point at `(700, 450)`, and the foot path 25 units
below the field, inside the intended 29-unit reach. Collection remained at zero,
health remained at 50, and both pickup sprite and artwork remained active.

The existing contact and bomb-confetti suites passed before the fix. Their
crossing fixtures used the icon center as the pickup anchor, so they did not
test both sides of the visible field.

## Fix and coverage

Normal pickups now expose their actual ground position. The manual contact
check, Arcade circle, visible field, shadow, and collection effect use that
position. Artwork, bobbing, contact radii (bomb 11, health/magnet 15), and chest
opening behavior retain their existing values.

The new regression suite uses keyboard movement, not direct collection calls,
and tests 90 crossings: three roosters, three pickup types, desktop and portrait
with DPR 3, contact and misses on both sides of the ground field, and horizontal
crossings along the icon center. It verifies actual healing, magnet activation,
enemy death for bombs, artwork removal, and exactly-once collection. The release
gate also runs this suite against the built game.

The older near-miss fixtures now measure their path from the visible field;
their distances and radius assertions are unchanged.

## Verification

- `npm run test:pickup-ground-contact`: passed all 90 cases in development.
- `npm run test:pickup-contact`: passed 36 cardinal crossings, 45 near-miss/fast
  cases, full HP, pause, magnet exclusion, restart, and queued chest rewards.
- `npm run test:release`: passed, including all 90 new cases in the WebGL build,
  elite balance, early/late pickup sequences, and bomb-confetti checks.
- The tested release is served locally at `http://127.0.0.1:5176/`, with bundle
  `index-9DRO-nRe.js`. The initial investigation did not commit, push, or deploy.

## Kongregate upload artifacts

On 2026-10-04, the upload artifacts were regenerated from that tested release,
before committing the fix, as requested by the user:

- `dist/kongregate-upload/rooster-rage-kongregate-complete.zip`: 155 files,
  18,280,179 bytes, with `index.html` and `assets/` at the archive root.
- `releases/kongregate/index.html` and
  `releases/kongregate/rooster-rage-additional-files.zip`: separate-field upload;
  the additional archive has 154 files and 18,279,269 bytes.
- Every archived file was compared to `dist-release` using SHA-256. Both archives
  match the tested build completely, and the tracked split upload matches the
  local package. The complete archive was also extracted successfully.
