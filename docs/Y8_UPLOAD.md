# Y8 upload — RoosterRage Survivor

Game: https://developer.y8.com/games/rooster_rage/edit

- App ID: `6ab6d722bed188670528ad4a`
- Game ID: `284511`
- Published address: https://y8.com/games/rooster_rage

## Build and upload

Run `npm run package:y8`. It runs SDK unit tests and browser tests of gameplay/audio during advertisements, builds the production game and tests it in an iframe at a nested URL, then packages and verifies every ZIP entry against the build.

Upload **`dist/y8-upload/rooster-rage-y8-complete.zip`** in the draft's **Builds** tab. It contains `index.html` and all `assets/` files at the root. The separate `index.html` beside the ZIP is provided for inspection; it is insufficient by itself. `BUILD-INFO.json` records generation time, source revision, uncommitted-change status and file hashes.

This is a dedicated Y8 distribution using relative asset paths. It includes the current menu, full-body roosters, sounds, pickup fixes and animated enemy auras from the production game. GitHub Pages and Kongregate keep their separate build modes.

## SDK scope

The Y8 build loads SDK 2.0 from `https://cdn.y8.com/minimal-sdk/2-0/y8.min.js`. It initializes once with this game's App ID and `autoLogin: true`, handles the ready-event replay and receives auth callbacks. SDK failure or an eight-second ready timeout does not prevent game startup. Local saves continue through the existing storage system.

Interstitials are configured with Game ID `284511`. The game requests `start` / `run-start` before starting a run and `next` / `wave-transition` between cleared waves (not after the final wave). A session-wide monotonic clock enforces at least 180 seconds after an actual ad ends, including across run/scene restarts. Y8 may impose additional limits or have no ad available. No forced interruptions occur during a wave.

Only `beforeAd` pauses physics, gameplay timers, tweens, input and currently playing audio, and mutes the game's sound manager. `afterAd` restores the previous mute/input state and only the sounds paused for that ad. Other pause reasons, such as upgrades, remain active. No-fill and capped requests do not pause. Requests with missing callbacks time out after eight seconds; a started ad has a three-minute safety timeout. The SDK's resolved promise does not prematurely resume play. Duplicate requests and stale callbacks are ignored. Game controls are locked during requests; the next run/wave waits for their completion.

Y8 leaderboards, achievements and cloud saves are not implemented. Auth does not replace local save data or add an account requirement.

The dedicated browser tests simulate late/preloaded/blocked SDK loading, auth errors, rejected initialization and absent ready events. They verify desktop/mobile iframe startup, starting a run, settings, blocked storage, missing assets and absence of the Kongregate SDK. Gameplay tests cover run-start and wave ads, frozen physics/time, paused/restored sounds, the 180-second boundary, upgrade overlap, mute preferences, no-fill/errors/timeouts and cooldown persistence across runs. These use simulated SDK responses and do **not** establish successful live Y8 authentication or monetized ad delivery.

Set `ROOSTER_Y8_LIVE_SDK=1` when running `node tests/y8-package-runner.mjs` to add an actual CDN/initialization smoke test in a normal iframe. This passed locally with the supplied App ID. The real SDK also loads code that assigns `document.domain`; a strictly sandboxed test iframe forbids this and reported a third-party script error, although gameplay started and SDK initialization reached ready. The live smoke therefore uses a normal iframe, and Y8's actual embedding/authentication still needs the portal preview check.

## Portal verification before review

1. Upload the complete ZIP and open its Y8 preview/QA page.
2. Confirm the portal's SDK initialization check passes for this App ID. Test signed-in and anonymous access on Y8.
3. Start a run; check sound after user interaction, fullscreen entry/exit, keyboard/touch movement and save persistence after reload.
4. Complete Basic Info, cover/thumbnail, description and controls using the fields requested by the portal; then submit for review.

Suggested description: “Survive the farmyard chaos! Choose your rooster, defeat waves of enemies, collect upgrades and take on the Brood King across multiple arenas and challenges.”

Controls: WASD or arrow keys on desktop; touch movement on mobile. Attacks fire automatically. Use the in-game Fullscreen and Settings buttons for display and audio options.

For local testing, serve `dist-y8` over HTTP, for example `python -m http.server 8000 --directory dist-y8`. File URLs cannot initialize the SDK. Localhost/127.0.0.1 need no development-origin entry. Automatic sign-in is available on Y8; outside Y8 the SDK starts anonymous. Other development addresses follow the portal's origin configuration rules.

Official references: [SDK introduction](https://docs.y8.com/sdk/intro/) and [local development](https://docs.y8.com/sdk/local-development/).
