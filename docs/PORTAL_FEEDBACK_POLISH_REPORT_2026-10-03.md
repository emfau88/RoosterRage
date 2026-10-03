# Portal-Polish: Umsetzung, Bewertung und offene Punkte

Basis: `d776dd1`. Boombardier war bereits committed und auf dem öffentlichen Testbranch gepusht. Dieser Pass liegt auf `codex/portal-feedback-polish`. Die öffentliche Spielversion wird durch diese lokalen Änderungen nicht automatisch ersetzt.

## Konkrete Verbesserungen

- **Pickups:** Die alte Sammelfläche nutzte unskalierte Sprite-Koordinaten. Durch die Darstellung mit 63 px schrumpfte ihr Radius auf ungefähr 3,4 Welteinheiten und der Mittelpunkt lag versetzt. Jetzt bleibt ein zentrierter Radius von 21 Welteinheiten am Boden; nur die Grafik schwebt. Truhen verwenden 24. Heilung bei vollen HP bleibt liegen und meldet den Grund.
- **Weltgrafik:** Health, Bomb und Magnet sind eigenständige Gegenstände ohne Sticker-Rand, mit 44 statt 63 Welteinheiten und einem dezenten Schatten. Sanftes Schweben erhält die Symbolerkennbarkeit besser als dauerhaftes Drehen. ImageGen-Originale und Prompts liegen unter `art-source/pickups/portal-v1`.
- **Menüs:** Die Porträts entstehen direkt aus den freigegebenen Mascot-Rigs. Nach Feedback zeigen die Kacheln mehr Abstand, den vollständigen Kamm und Teile der Ausrüstung. Krit, Ricochet, Rückstoß, Second Wind und die drei Primärwaffen haben unterscheidbare Symbole; der bisherige Iconatlas bleibt erhalten.
- **Elite-Muster:** Turbo Goose ersetzt Gilded Talon, Golden Goose Champion die entsprechende Champion-Variante. Vier Richtungen und eine gebackene Laufanimation; sämtliche bisherigen Kampfwerte, Kollisionsparameter, Dash- und Aura-Werte bleiben erhalten. Das Muster passt zum Humor, stellt aber noch keine ausreichende Elite-Vielfalt dar.
- **Kampfgefühl:** Holzsplitter bzw. Heuhalme ersetzen die universelle Raketenexplosion von Props. Maximal acht kurze Materialbursts; Cleanup bei Ablauf und Szenenwechsel. Der bestehende Killchain-Zähler zählt nun auch zwischen den ersten Schwellen sichtbar weiter. Der 520-ms-Kettentimer und die Punktevergabe bleiben erhalten.
- **Belohnungen:** Truhen öffnen in 520 statt 760 ms. Die zentrale Pause verhindert Kampf während der Öffnung und respektiert weitere Pausegründe. Elite-, Champion- und Boss-Rewards bekommen unterschiedliche Farbakzente. Der bestehende EVO-/Upgrade-Beleg bleibt erhalten und hat Vorrang vor Pickup-Meldungen.
- **Ergebnis:** Kernels und Freischaltungen zuerst, danach kurze Laufübersicht und Build. Kampfdaten sind über ein natives, per Tastatur bedienbares Details-Element einklappbar. Die Rückkehraktion bleibt am unteren Rand erreichbar.

## Sound-Abdeckung

Codepfade und Assetmanifest wurden geprüft. Die drei neuen Sounds wurden im Browser tatsächlich gestartet; das ersetzt keine akustische Feinabnahme auf Lautsprechern und Mobilgeräten.

| Angriff | Start / Kontakt / Auflösung |
| --- | --- |
| Ace / normale und Fire Eggs | `egg-launch-ace`, vier `egg-impact`-Varianten |
| Boombardier / Blast Shell | `egg-launch-artillery`, neu `blast-shell-impact` für den eigentlichen Einschlag |
| Stormcrest / Storm Egg | `egg-launch-storm`, Egg-Impact und `lightning-chain` für Verkettung |
| Golden Egg / Solar Scramble | Ace-Launch, Egg-Impact; Kontakt und Kette verwenden die vorhandenen Pfade |
| Orbit Eggs / Shell Halo | Neu `orbit-contact` beim Kontakt statt des generischen Enemy-Hit |
| Molotov / Phoenix Pan | Artillery-Launch und `molotov-impact`; Dauerbrand bleibt ohne Dauerschleife |
| Rocket Egg / Broodstorm | `rocket-launch`, `rocket-explosion` |
| Lightning Comb / Thunder Roost | `lightning`, Kontakt über den bestehenden Schadenspfad |
| Laser Comb / Dawn Laser | `laser`, Kontakt über den bestehenden Schadenspfad |
| Void Nest / Singularity Nest | `void-open`, Kontakt über den bestehenden Schadenspfad |
| Support Chick / Chick Squadron | `support-flap`, Egg-Launch/Impact über Companion-Projektile |
| Enemy-Spit/Fan, Stampfer, Bomber, Summoner | `spitter-shot`, `brute-stomp`, `bomber-explosion`, `summoner-charge`, `summoner-spawn` |
| Enemy-/Boss-Dash und Boss-Fireball | Neu `enemy-dash`, vorhandenes `boss-fireball` |

Die neuen WAVs sind kurze, reproduzierbar synthetisierte Effekte aus `scripts/prepare-portal-feedback-audio.py`, ohne externe Samples. Gefahren können bei ausgeschöpftem SFX-Pool einen schwächeren Effekt verdrängen. Grenzen, Kategorie-Lautstärke und Stummschaltung bleiben wirksam.

## Bewertung und nächster Elite-Pass

Die größten sachlichen Verbesserungen sind zuverlässiges Einsammeln und saubere Pause-/Reward-Übergänge. Optisch gewinnen die kleinen Pickups und die konsistenten, weiter entfernten Porträts am meisten. Der Ergebnisbildschirm zeigt den Nutzen eines Runs früher. Die universelle Prop-Explosion war spektakulär, aber für Holz und Heu unpassend; kurze Materialsplitter sind klarer.

Das Elite-Muster ist ein Anfang. Nach dem neuesten Feedback sind vor Release **drei eigenständige Silhouetten und Angriffsrhythmen** gewünscht:

1. **Turbo-Gans:** schlankere, flotte Verfolgerin mit erkennbarem Anlauf und Dash.
2. **Panzertruthahn:** breiter, schwerer Gegner mit sichtbarem Ausholen, angekündigtem Bodenstampfer und Erholungsphase.
3. **Chili-Puter:** rundlicher Fernkämpfer, der beim Salvenspucken sichtbar Luft holt. Angriffspausen bieten ein Gegenangriffsfenster.

Brute und Spitter liefern bereits unterschiedliche mechanische Rollen. Ihre neuen Grafiken und Bewegungszustände sind noch nicht umgesetzt. Zusätzliche Champion-Unterschiede sollen diese Rollen stärker ausdrücken, statt nur umzufärben. Neue Schadenswerte, Dash-Distanzen oder zusätzliche Projektile benötigen anschließend einen begrenzten Balancetest.

AOE-Bombenkisten, Combo-Punkte/Multiplikatoren und ein längerer Streak-Timer bleiben getrennte Versuche. Außerdem offen: Feed-Alley-Kamera/Figurengröße, Orientierungsvorgabe, echte Geräte- und Erstspielerabnahme. Dieser Pass ist keine pauschale Portal-Freigabe.

## Vergleich und Reversibilität

`docs/qa/portal-feedback/index.html` enthält sieben Themen jeweils auf Desktop und Mobil hochkant, pro Thema und Viewport **ein Bild mit Vorher links und Nachher rechts**, plus einen animierten Elite-Vergleich. Die Screenshots stammen aus Release-Builds; der Ergebnisbericht verwendet in beiden Versionen dieselben QA-Beispieldaten. Die Gameplay-Werte der beiden umgestalteten Elite-Konfigurationen werden im Capture zusätzlich gegen die Basis geprüft.

Alte Pickups, Porträts und Talon-Atlanten sind erhalten. `VITE_PORTAL_FEEDBACK_ART=classic` wählt beim Vite-Start/Build die vorherigen Rasterassets; Laufzeit-/UI-Änderungen lassen sich über den Commit zurücknehmen. Der exakte ursprüngliche Gesamtstand ist `d776dd1`.

Reproduktion: zunächst den unveränderten Release-Build der Basis unter `test-results/portal-feedback-polish/before-release` sichern, dann den aktuellen Release-Build erstellen. `node scripts/capture-portal-feedback.mjs` und `python scripts/render-portal-feedback-gallery.py` erstellen die Gegenüberstellung erneut. Python benötigt Pillow.

## Prüfung

- 36 tatsächliche Tastatur-Laufwege: drei Figuren × drei Pickups × vier Richtungen; Mittelpunkt, Weltgröße, genau einmalige Auslösung, volle HP und Pause.
- Unterbrochene Truhenöffnung sowie fünf aufeinanderfolgende Rewards: Elite, Golden, Boss, Level, Level; korrekte Reihenfolge, einzelne Vergabe und Pause bis zur letzten Auswahl.
- Neue Sounds im Browser: Cache vorhanden und Wiedergabe gestartet.
- Audio-Priorität bei voller Auslastung, Stummschaltung und Zähler-Cleanup; Materialeffekt-Budget und Szenenwechsel-Cleanup.
- Arena, Audio, Pause, HUD/Report, Meta, Mechanik und responsive Menüs. Veraltete UI-Annahmen in den Mechaniktests wurden an den bereits bestehenden kurzen Meldungsdock angepasst: echte Overlay-Schließung, Warten auf höher priorisierte Banner, sinnvolle Bildschirmränder und kurze statt viersekündiger Kill-Meldung.
- Release-Gate einschließlich iframe und blockiertem Storage; keine Test-API im Release. Vergleichsprüfung auf Desktop und Mobil hochkant.

Die finalen Logs und JSON-Berichte liegen lokal in `test-results/portal-feedback-*`; geprüfte Vergleichsdaten werden zusätzlich mit der Galerie gespeichert.
