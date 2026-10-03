# Kongregate statistics — RoosterRage Survivor

Game ID: **325151**. The integration uses Kongregate's JavaScript client API;
the private server API key is neither needed nor included in the game package.

## Create these two statistics

Open the game's **Manage Statistics** page as the owner and use **Add Statistic**.
Names are case-sensitive and must match this table exactly.

| Name | Type | Display in Leaderboards | Description |
| --- | --- | --- | --- |
| `Kills` | **Max** | **Yes** | Highest enemy kill count in a single completed run. |
| `RunsWon` | **Add** | **Optional: Yes for a victories leaderboard** | Total number of completed victorious runs. |

`Kills` submits the player's highest completed-run kill count. `RunsWon` submits
**1 for each new victory**, never the cumulative local total. Do not configure
`RunsWon` as Max: that would stop the counter at 1. There are no wave/time stats.
Enabling Display in Leaderboards for `RunsWon` also ranks players by total wins;
it does not require a code change and the type remains **Add**.

## Upload and verify

1. Build the current ZIP with `npm run package:kongregate`.
2. Upload `dist/kongregate-upload/rooster-rage-kongregate-complete.zip` as the
   main HTML5/WebGL file; leave Additional Files empty.
3. Open the uploaded Kongregate preview, signed into a player account. Append
   `debug_level=4` to the preview URL's query to inspect the SDK's stat messages.
4. Finish one run: `Kills` should submit a non-negative integer. Finish a winning
   run: `RunsWon` should additionally submit 1. Check the Kills leaderboard.
5. Reload or return to the hub: the saved kill record may submit again; there
   must be **no extra RunsWon submission**. Start another run to verify the SDK
   initializes only once for the page.

The SDK loads only in the `release` build when the game is hosted by or embedded
on Kongregate. The standalone GitHub play link deliberately does not submit
portal scores. If the SDK is blocked or fails, the game still starts normally.

Only finished manual runs count. Guests, bots and abandoned runs are excluded.
A run spanning an account change is not credited to the new account. Kill
records are cached separately per Kongregate user and restored on page load or
login. The additive win counter is never replayed on reload: the client SDK has
no delivery acknowledgement with which to safely retry that increment. The
integration does not offer verified/cheat-resistant server scoring.

## Validation

- `npm run test:kongregate`: SDK loading, once-only wins, integer scores, delayed
  initialization, guest/account changes, bots, abandonment, per-account restore,
  storage errors and API failure, including the real RunStateSystem end hook.
- `npm run test:release`: real compiled game in an iframe with a mocked Kongregate
  SDK; victory, defeat, restart, exactly one SDK load and playable API failure.
- Ordinary release/Pages iframe tests ensure no off-platform SDK request occurs.

Creating the two server statistics and testing submissions against the actual
uploaded game remain separate portal checks. Local/mock success does not confirm
that Kongregate has accepted a score.

Official references:
[JavaScript API](https://docs.kongregate.com/docs/javascript-api),
[statistics and types](https://docs.kongregate.com/docs/concepts-statistics),
[stats.submit](https://docs.kongregate.com/reference/client-api-stats-submit).
