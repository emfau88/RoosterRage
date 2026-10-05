# User-supplied gameplay sounds (2026-10-05)

Local integration for review. Original recordings are preserved unchanged in
`art-source/audio/user-sounds`; runtime exports are mono MP3 at 64 kbps.
Rebuild with `python scripts/prepare-user-sounds.py` (ffmpeg on PATH).
The initial import accepts `--source-dir` pointing to the provided files.

| Supplied file | Playback |
| --- | --- |
| `203377__c_rogers__glass-shattering_05.ogg` | Molotov impact: full 0.811 s glass break |
| `djartmusic-short-fire-whoosh_1-317280.mp3` | Molotov ignition: original 0.95–2.45 s, mixed with glass into `molotov-impact` |
| `784205__modusmogulus__cartoon-explosion-designed-on-cassette-tape-lol.wav` | Bomb pickup: first 2.4 s, soft tail fade, existing `pickup-bomb` event |
| `519193__boaay__baby-chicks-chirp.wav` | `support-chirp`: first choice, all Support Chick rank upgrades, Chick Squadron evolution |
| `the-vampires-monster-chicken-screams-nervous-343103.mp3` | `elite-entry`: one scream from 1.3–2.17 s, slowed to 89% (~two semitones lower), ~0.98 s export |
| `floraphonic-rubber-chicken-squeak-toy-1-181416.mp3` | `elite-death`: full ~0.77 s squeak at original pitch, on elite/champion death |

Molotov glass and whoosh share one audio voice, so voice limits cannot separate
the two layers. No continuing fire loop is used. The bomb event and collection
logic are unchanged. Support chirps replace the previous flap on companion
rebuild; unrelated upgrade confirmations keep their usual sound.

Elite entry now fires at successful enemy spawn, rather than at the wave banner.
It applies to all elites/champions except the boss. The existing one-voice limit
and 900 ms cooldown prevent simultaneous elite groups from stacking screams.
Its danger tier protects the cue from routine hit sounds at saturation.

Elite/champion deaths replace the ordinary `enemy-pop` with `elite-death`.
Boss death and normal enemy death retain their existing sounds. The damage
handler's inactive-enemy guard prevents repeated hits from replaying a death.
The unused Support Chick flap export was removed after replacement by chirps
to keep the game package within its existing 19 MiB budget.

Validation: `npm run test:user-sounds` tests actual WebAudio playback through
choice, impact, pickup and enemy-spawn handlers, all five Support Chick ranks
plus evolution, full-health deferral followed by a bomb, repeated bomb contact,
all elite/champion types, death sounds on lethal damage only, repeated lethal
contact, cleanup without death, normal enemy/boss exclusion, cooldown and SFX mute.
`npm run test:audio` checks asset loading and volume-setting persistence.
Final subjective loudness/timbre review is available in the local game.
