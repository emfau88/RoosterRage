# Audio design and implementation

## Identity and flow

The final direction is arcade action with restrained farm character. Chicken voices punctuate run start, player hurt, support spawn and second wind; they never form a constant joke layer. Music follows one stable flow: menu theme plus quiet coop ambience → restrained downtempo run theme → boss theme → delayed victory sting. Gameplay has no permanent ambience and music does not change per normal wave.

## Event mapping

| Area | Events and final keys |
| --- | --- |
| Primaries | One launch per salvo: `egg-launch-ace`, `egg-launch-artillery`, `egg-launch-storm`; egg projectile hits rotate `egg-impact-1..4` |
| Combat | Non-egg damage `enemy-hit`; normal kill `enemy-pop`; player damage `player-hurt`; second wind `second-wind` |
| Abilities | `laser`, `lightning`, `lightning-chain`, `molotov-impact`, `rocket-launch`, `rocket-explosion`, `void-open` |
| Rewards | `xp-pickup`, `level-up`, `upgrade-select`, `evolution`, `pickup-heal`, `pickup-magnet`, `pickup-bomb`, `victory` |
| Chest | Spawn `chest-spawn` → latch at 120 ms → open at 285 ms → reward at 500 ms |
| Enemies | Spitter volley `spitter-shot`; Brute slam `brute-stomp`; Bomber `bomber-explosion`; Summoner charge/spawn; Elite entry sting |
| Boss | Entry roar and boss music; heavy fireball cue; `boss-phase` for phase changes; separated death punctuation and delayed victory |
| Environment | `crate-break` and filtered `bale-break`; routine prop hits stay silent to protect the mix |
| UI | Kenney family for navigate, confirm, back, denied, toggle and reroll; run confirmation is layered with one rooster crow |

## Architecture and mix

`AudioSystem` owns persisted Master, SFX, UI, Music and Ambience levels. SFX and UI have independent voice pools; loop buses never consume combat voices. SFX define per-key volume, cooldown, max voices, pitch jitter and priority. Critical/reward sounds can borrow two SFX voices while common hits remain limited. Music and ambience crossfade independently and are stopped during shutdown/run transitions. Browser unlock recovery listens for pointer, touch and keyboard gestures.

Defaults: Master 80%, SFX 90%, UI 85%, Music 65%, Ambience 35%. Common egg hits use a shared 55 ms variant cooldown; XP uses 95 ms and one voice; launches are one sound per salvo. Frequent effects are mono MP3, while music and ambience remain stereo. The production audio payload is about 4.5 MB.

## Processing and reproducibility

Run `powershell -ExecutionPolicy Bypass -File scripts/process-audio-assets.ps1` while the supplied raw pack is at `C:\Users\madde\Documents\ROOSTER\SOUNDS`, or pass `-SourceRoot`. The script trims, fades, filters, pitch/speed-shapes, loudness-normalizes and converts without modifying originals. Generated assets live under `src/assets/audio/{sfx,ui,music,ambience}` and are auto-discovered by Vite.

## Deliberately rejected candidates

- Full clucking recordings: too busy for a combat loop; only a quiet menu excerpt was retained.
- 8-bit boss alternatives: the strong chiptune texture conflicts with the illustrated high-resolution presentation.
- Backfoot as the run theme: its forward, dense arrangement becomes fatiguing underneath sustained combat; the quieter downtempo loop leaves more room for gameplay cues.
- 37-hit/punch pack: generic impacts weaken the egg identity; the existing compact enemy-hit sound remains cleaner.
- Reverb gem version: too long and spacious for rapid XP chains.
- Separate music for every wave/challenge: short waves need continuity more than novelty.
- Permanent aura, footsteps, projectile-per-shot and support-cluck loops: these obscure telegraphs on mobile speakers.

## Remaining optional polish

No required audio event is left blocked. A later pass could add class-specific evolution layers or a dedicated authored boss-death cue after listening tests on several physical phones; neither is necessary for the current coherent mix.
