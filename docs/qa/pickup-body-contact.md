# Pickup body contact regression

Date: 2026-10-04. Reproduced against the release from `8942c59`.

## Cause and reproduction

Commit `f9bd8ec` changed the Arcade overlap callback to collect only chests.
Normal pickups instead depended exclusively on the player's decorative foot
marker. The player physics circle and foot marker are different points: for
desktop Ace their centers are about 27.6 world units apart vertically.
Consequently a real player/pickup body overlap could be silently ignored.

The earlier `8942c59` fix correctly aligned the pickup field and ground anchor,
but did not restore these discarded body contacts. Its tests used the same
foot-only assumption, so they did not establish compatibility with actual
player collision contact.

A real keyboard crossing in the built game reproduces the reported sequence:
pickup icon at `(700, 450)`, field at `(700, 461)`, desktop Ace crossing at
sprite Y `457`. The foot path is 27.625 units below the field:

| Pickup | Foot reach | Result before correction | Physics overlap callbacks |
| --- | ---: | --- | ---: |
| Health | 29 | Collected | 8 |
| Magnet | 29 | Collected | 9 |
| First bomb | 25 | Remained, including artwork | 15 |
| Second bomb | 25 | Both bombs remained | 15 |
| Next magnet | 29 | Collected; both bombs still present | 9 |

No collection counter or retained-item lock was involved. Enabling collection
on the already registered Arcade overlap made all five identical crossings
succeed without changing a radius or moving an item. Moving a magnet crossing
a few units farther south similarly isolates a valid body contact rejected by
the foot-only rule.

The permanent regression test failed before the source fix at pickup index 2
(first bomb): collected 0, item/artwork active, enemy alive; both earlier pickups
had succeeded. It uses keyboard movement, never direct collection calls.

## Correction

`CollisionSystem` accepts existing Arcade body overlaps for every pickup again.
The ground-contact check also remains active, so walking the visible feet onto
the field still works. Both routes call the same guarded collection function;
removal and inactive state prevent duplicate effects. Pickup radii, spawn
schedule, budgets, health rules, magnet duration and bomb damage are unchanged.

## Verification scope

- `pickup-body-contact`: 60 real crossings in 12 runs, all three roosters on
  desktop and portrait DPR 3. Includes health → magnet → bomb → bomb → magnet,
  actual bomb kills, actual XP attraction from the fifth pickup, scene restarts,
  full-HP health retained throughout the other pickups and collected after damage.
- `pickup-ground-contact`: 108 crossings, including both foot-contact edges,
  body-only contacts, misses outside both contact areas and exactly-once effects.
  The former south-miss fixture is retained explicitly as a valid body contact;
  a separate farther path checks a real miss outside the body as well.
- `pickup-contact`: cardinal and fast/diagonal paths, true near misses, full HP,
  pause, magnet exclusion, restart, chest opening and queued rewards.
- Release gate: built WebGL game, embedded iframe, blocked storage, Kongregate
  API integration, elite balance, both contact suites, sequence and confetti.

Additional diagnostic checks before changing production code: retained full-HP
health directly underneath two bombs and two magnets across all three roosters
and two viewports did not block them (24 successful pickups). Four sequential
seven-item scenarios at 60/15 FPS passed, including XP reuse and upgrade pauses.
A natural bot run reached wave 8 with both magnets collected while health
remained on the map. These observations exclude the proposed global item-lock
mechanism in those scenarios; they do not substitute for the failing contact test.

## Verified release and upload

`npm run test:pickup-contact` and the complete `npm run test:release` passed.
The latter includes all 108 ground-contact cases and all 60 body-contact cases
against the built WebGL game. Release bundle: `index-gy77w4LB.js`.

Both upload variants were generated before committing, as requested. Every ZIP
file was compared by SHA-256 to the tested release; archive paths, counts and
duplicates were checked. The tracked split upload matches the local package.

- Complete ZIP: 155 files, 18,280,171 bytes;
  SHA-256 `3D346744C21CA45C861C72846B281CEC161852B93FB563AF9E796D9A577780A4`.
- Additional-files ZIP: 154 files, 18,279,260 bytes;
  SHA-256 `16CBEB7F1AE565B5D7D782F54C6D3CA10CDE4FCF09C4745719BD6FB39C081DD8`.
