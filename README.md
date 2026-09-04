# Rooster Rage

![Rooster Rage — three battle roosters defend their yard](public/marketing/rooster-rage-key-art-master.png)

**Three battle roosters. Wild egg evolutions. One yard full of monsters.**

### [Play Rooster Rage in your browser](https://emfau88.github.io/RoosterRage/)

Rooster Rage is a mobile-first bullet heaven / action roguelite. Choose Barnyard Ace, Boombardier, or Stormcrest, evolve outrageous egg weapons, and survive ten escalating waves culminating in the three-phase Brood King.

> **Project status:** The full ten-wave loop, all three playable roosters, weapon ranks and EVOs, three arenas, meta progression, and the latest combat, VFX, character-art, and run-preparation polish are implemented. The multi-seed real-run production gate, covering six full real-time runs, and the automated production gates are complete. The GitHub Pages build remains a public test version; hands-on approval on real mobile hardware plus further balance and presentation tuning are next.

## Current feature set

- Three rooster classes with distinct primary attacks, passives, silhouettes, and three build archetypes each
- A responsive Henhouse with visual run preparation, arena overview, expedition cards, `Roosters`, a three-tier Talent Nest, and a streamlined `Archive`; starting a run remains the primary action on desktop and mobile
- Ten hand-authored waves, three arenas, three elite archetypes, and a three-phase boss
- True four-direction locomotion for Kernel Crawlers, Runners, Brutes, Supports, Summoners, Gilded Talon/Stormclaw, and the Brood King; horde peaks reach 140 enemies on desktop and 90 on mobile
- 45 upgrade definitions and eleven visible EVOs across active, passive, orbit, and summon builds; rooster primary weapons and active weapons have clearly communicated rank paths with distinct projectile, area, and impact upgrades
- Fixed wave and segment XP budgets, allowing horde size and leveling speed to be tuned independently
- Visible magnetic XP orbs with lossless bundling, capped at 72 on desktop and 48 on mobile
- Heal, Magnet, and Bomb pickups at strategic wave moments instead of rapidly increasing kill thresholds
- Local records, challenges, mastery, the Talent Nest, cosmetics, run history, an enemy lexicon, and discovered EVO recipes
- Mobile portrait as the primary layout, a compact landscape fallback, and full desktop and fullscreen support
- No ads, energy systems, gacha, or pay-to-win mechanics

## Gameplay

<p align="center">
  <img src="docs/marketing/screenshots/05-run-preparation-desktop.png" alt="Current Rooster Rage run preparation on desktop" width="64%">
  <img src="docs/marketing/screenshots/06-run-preparation-mobile-portrait.png" alt="Current Rooster Rage run preparation on mobile portrait" width="27%">
</p>

Your rooster attacks automatically. Movement, positioning, upgrade choices, and build synergies decide the run. XP remains a visible orb-collection experience in the arena; only large fields merge nearby orbs into more valuable, larger ones.

- **Desktop:** WASD or arrow keys
- **Touch:** Drag on the left side of the screen; the virtual joystick follows your touch
- **Interface:** Select roosters, challenges, and upgrades with touch, mouse, or pointer input
- **Comfort:** Fullscreen plus separate controls for audio, damage numbers, screen shake, hit flashes, and vibration

## Run locally

Requirements: Node.js 24 and npm.

```bash
npm ci
npm run dev
```

Vite serves the game at `http://127.0.0.1:5173/` by default.

Production build:

```bash
npm run build
npm run test:production
```

## Quality assurance

The browser tests use Playwright and start a local Vite server when needed.

```bash
npm run test:smoke
npm run test:mechanics
npm run test:pacing
npm run test:arena
npm run test:foundation
npm run test:pressure
npm run test:product
npm run test:acceptance
```

Additional focused gates include `test:boss`, `test:evolution`, `test:weapon-progression`, `test:hud-report`, `test:meta`, `test:balance`, `test:late-run`, `test:soak`, and `test:telegraphs`. Recorded load and full-run gates sit at 16.7–16.8 ms p95; the late-run test checks 75, 110, and 150 active enemies without enemy-pool drops. The mobile-pressure gate checks Wave 7 with all three roosters. Dedicated regressions also cover XP preservation, desktop/mobile orb caps, pickup pacing, weapon ranks, and responsive HUD states.

## Privacy

Product analytics are disabled by default and require explicit opt-in. No data is sent without a configured telemetry endpoint. There are no accounts, cookies, or advertising IDs. When analytics are enabled, a random session ID exists only in memory for the current page session; the game records a limited set of funnel and run events without login data or a persistent user identifier.

## Technology

- Phaser 3.90
- Vite 8
- Vanilla JavaScript and CSS
- Playwright for browser, mobile-viewport, and acceptance tests
- GitHub Actions and GitHub Pages release pipeline

## Documentation and media

- [Current production pass](RoosterRage_Next_Production_Pass.md)
- [Product and development roadmap](ROADMAP.md)
- [Vertical-slice validation](docs/PHASE_17_VALIDATION.md)
- [Commercial validation](docs/PHASE_18_COMMERCIAL_VALIDATION.md)
- [Character art and HUD production pass](docs/PHASE_19_VISUAL_PRODUCTION.md)
- [Store copy and asset manifest](docs/marketing/STORE_COPY.md)
- [36-second gameplay reel](docs/marketing/trailer/rooster-rage-35s-gameplay-reel.webm)

The featured key art is an original, text-free marketing illustration. Title treatment, age rating, and store CTA are added only in platform-specific exports.
