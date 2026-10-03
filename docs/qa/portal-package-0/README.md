# Paket 0 – geprüfte Ausgangslage für den Portal-Release

Durchführung: 30. September / 1. Oktober 2026. Quellstand: `fe75523`.

**Das Spiel wurde nicht umgebaut.** Paket 0 ergänzt reproduzierbare QA-Szenarien, Produktionsaufnahmen, einen Release-Dateikatalog und eine Stilreferenz. Der frische Release-Gate-Test bestand. Die visuellen Release-Arbeiten aus Paketen 1–4 bleiben erforderlich.

**Abschlussstatus am 1. Oktober 2026:** Die Ausgangslage für die nächsten Arbeitspakete ist dokumentiert und geprüft: 85 Produktionsansichten, fünf regulär ausgespielte Bot-Runs, 27 Größenvergleiche, zwei separate Leistungsmessungen und die Stilreferenz. Die Grenzen der Probe bleiben ausdrücklich offen: späte Coop-Square-Wellen, reale Mobilgeräte und menschliche Erkennbarkeit. Daraus wird keine Releasefreigabe abgeleitet.

Die Produktionsprüfung bestätigt die UI-Probleme aus dem Audit. Sie begründet weder einen vollständigen Assettausch noch eine pauschale Verringerung der Gegnerzahl. Der reguläre Ace-Run erreicht den Sieg; zwei weitere reguläre Runs enden in Welle 6. Ein zusätzlicher Stormcrest-Run erfasst späte Wellen von Feed Alley. Späte Wellen von Coop Square bleiben eine ausdrücklich offene Vergleichsprobe.

## Artefakte und Methode

| Artefakt | Inhalt |
| --- | --- |
| [Stilreferenz](STYLE_REFERENCE.md) / [Tafel](style-reference.png) | Bestehende finale Figuren, Runner, Props, Boden, Porträt, HUD und Upgrade-Karte; konkrete Zielregeln. |
| [UI-Protokoll](views.json) | 76 Aufnahmen in vier Viewports; Texte, Sichtbarkeit, Schriftgrößen, Kartenangebote, voller Build und Reward-Queue. |
| [Detailprotokoll](details.json) | Neun zusätzliche Aufnahmen für Primärwaffenicons, EVO-Rezepte, Bossbanner und Feed-Alley-Größe. |
| [Geometrie](geometry.json) | Alle drei Klassen × alle drei Arenen × drei Viewports; projizierte sichtbare Figurenhöhe ohne transparente Sheet-Ränder. |
| [Release-Dateikatalog](release-manifest.json) | Alle 143 ausgelieferten Dateien mit Größe und SHA-256. |
| [Reguläre Runs](runs-summary.json) / [Zusatzruns](late-runs-summary.json) | Endzustand und Abdeckung; pro Run Wellenbilder, JSON-Bericht und Sekundenstichproben. |
| [Messungen](measurements.json) | Kaltstartressourcen und separate 60-Sekunden-Frameproben auf Desktop/DPR 1 und Portrait/DPR 2. |
| [Abschlusskontrolle](verification.json) | Abgleich der Release-SHA-256, vollständige Bild-/JSON-Belege und unveränderter getrackter Spielcode. |
| `environment-*.json` | Tatsächlicher Host, Browser, Viewport, DPR, Canvasgröße und WebGL-Gerätepfad. |

Die Bildaufnahme verwendet **den unveränderten `dist-release`**, nicht den Entwicklungsbuild. Ein browserseitiger Hook beobachtet `Phaser.Game.prototype.boot`, um Szenen und Messwerte zu erreichen. Es wird kein ausgelieferter JavaScript-Code umgeschrieben. `window.__ROOSTER_TEST__` bleibt im Release nicht vorhanden. Vorbereitete Screens werden im Manifest als `fixture` markiert. Der separate Portal-Gate-Test arbeitet ohne diesen Hook.

Alle Spielstände liegen in isolierten Playwright-Kontexten. Der persönliche Browser-Spielstand wird nicht verwendet oder überschrieben. Die Seeds kontrollieren Zufallsentscheidungen; variable Framerate, Wegführung und Spawnsteuerung verhindern eine bildgenaue Reproduktion eines regulären Runs.

## Referenzumgebung und Release

- Windows x64, Betriebssystem-Kernel `10.0.26200`; AMD Ryzen 7 6800H, 16 logische CPUs, etwa 15,26 GiB RAM.
- Playwright Chromium `151.0.7922.34`, Headless; Node `v22.17.1`.
- Produktionsrenderer: WebGL. Tatsächlicher Grafikpfad: ANGLE / Vulkan / **SwiftShader**, Software-Rendering.
- UI-Matrix: 960×540, 1440×900, 390×844, 844×390, jeweils DPR 1.
- Separate Leistungsprobe: 960×540/DPR 1 und 390×844/DPR 2. Die Portraitprobe ist Fenster-/DPR-Emulation auf diesem PC, kein physisches Mobilgerät und keine Prüfung von Safari/WebKit.

`npm.cmd run test:release` wurde frisch ausgeführt und bestand: normaler iframe sowie iframe mit blockiertem Speicher; WebGL-Start, drei Charakterkarten, Startaktion, Settings und Escape; keine Browserfehler oder fehlgeschlagenen Ressourcen. Der Test prüft außerdem relative Pfade unter einem Unterverzeichnis, fehlende alte Figuren-Generationen und das Größenbudget. Der vollständige Run wird durch die zusätzliche Runprobe belegt, nicht durch den Gate allein.

Releaseumfang: **143 Dateien, 19.346.468 Bytes = 18,45 MiB**. Internes Budget: 19 MiB. Freier Spielraum: **576.476 Bytes = 0,55 MiB**. Die QA-Bilder, Dokumente und Erfassungsskripte sind keine zusätzlichen Release-Assets.

Größte Dateien: Bossmusik 1.981.143 Bytes; Phaser-Chunk 1.197.177; Runmusik 1.134.690; Ace-Walk 819.898; Ace-Idle 808.174. Neue Art muss innerhalb des verbleibenden Budgets optimiert werden.

## Ladeaufwand und separate Frameprobe

Je Probe wurde ein neuer Browserkontext ohne vorhandenen HTTP-Cache geöffnet. Der lokale Server liefert ohne Kompression und mit `no-store`; es gab keine Netzwerkdrosselung. Nach dem Laden spielte jeweils nur eine Spielinstanz 60 Sekunden mit Ace und normaler Bot-Steuerung. Diese Messung enthält keine Screenshot-Aufnahmen während des Runs.

| Messwert | Desktop 960×540 / DPR 1 | Portrait 390×844 / DPR 2 |
| --- | --- | --- |
| Ladebereit-Marker nach Navigation | 1.985,5 ms | 1.658,1 ms |
| Letzte Ressource im Start-Snapshot | 1.999,5 ms | 1.674,0 ms |
| Resource-Timing-Einträge, ohne HTML-Navigation | 134 | 134 |
| Geladene Ressourcen-Nutzdaten | 18.447.301 Bytes / 17,59 MiB | identisch |
| Resource-Timing-Transfergröße | 18.487.501 Bytes | identisch |
| Native rAF-Stichproben | 3590 | 3583 |
| Native rAF-Mittel / P95 / P99 | 16,72 / 16,80 / 16,80 ms | 16,75 / 16,80 / 16,80 ms |
| Native rAF-Maximum | 33,40 ms | 33,40 ms |
| Spieltelemetrie-Mittel / P95 / P99 | 16,69 / 16,70 / 16,80 ms | 16,74 / 16,80 / 16,80 ms |
| Spieltelemetrie-Maximum | 33,50 ms | 50,10 ms |
| Abgedeckte Wellen / Kills | 1–2 / 42 | 1–2 / 59 |
| Aufgezeichnete Fehler | 0 | 0 |

Der Ladebereit-Marker ist `data-rooster-load-state="ready"`. Er ist kein separat gemessener frühester Bedienzeitpunkt; die Aufnahme wartet zusätzlich auf den Hub und das Ende seiner Ladeblende. Resource-Timing-Transfergrößen sind Browserwerte einschließlich seines Headerzuschlags, keine Messung tatsächlicher Netzwerkpakete. Die HTML-Navigation kommt mit 1.646 Nutzdatenbytes bzw. 1.946 Transferbytes hinzu.

Die Framewerte sind eine **Referenz für frühe Wellen auf diesem Host**, keine garantierten 60 FPS im späten Spiel oder auf Telefonen. Native `requestAnimationFrame` misst Browser-Frameintervalle; die Spieltelemetrie misst Simulationsintervalle und lässt Pausen/Intervalle ab 1000 ms aus. Einzelne Grenzwertüberschreitungen um 33,4 ms sind wegen Fließkomma-/Timerauflösung nicht belastbar. Für späte Wellen gelten die gespeicherten Runwerte wegen paralleler Instanzen nicht als saubere Leistungsabnahme.

Konkreter Prüfpunkt für Paket 5: Bereits im Start-Snapshot werden 4.494.997 Bytes Audio geladen, darunter 1.981.143 Bytes Bossmusik. Bedarfsnachladen der Bossmusik könnte den Erststart entlasten; zuerst unter gedrosseltem Netz prüfen und ohne Unterbrechung beim Bossübergang testen. Die schnellen Loopback-Zeiten belegen keine kurze Ladezeit auf einem Game-Portal. Paket 0 verändert den Loader nicht.

## Reguläre Runprobe

Alle fünf Runs verwenden normale Gegnerkonfigurationen, normale Wellenzeiten und die normale Upgrade-/Reward-Logik. Kein Unverwundbarkeitsmodus, kein künstlicher HP-/Armor-Wert, keine geschenkten Run-Upgrades und keine Zeitbeschleunigung. Die vorhandene Bot-Steuerung bedient Bewegung und Auswahl.

| Run / Seed | Arena / Fenster | Ausgangslage / Profil | Ergebnis | Spielzeit / Kills |
| --- | --- | --- | --- | --- |
| `ace-yard` / `portal-p0-yard-a` | Harvest Yard, 960×540 | Freischaltungen, ohne Talente / `average` | Sieg, Wellen 1–10 | 546,6 s / 1155 |
| `artillery-coop` / `portal-p0-coop-b` | Coop Square, 390×844 | Freischaltungen, ohne Talente / `average` | Niederlage in Welle 6 | 210,4 s / 410 |
| `storm-alley` / `portal-p0-alley-c` | Feed Alley, 844×390 | Freischaltungen, ohne Talente / `average` | Niederlage in Welle 6 | 231,1 s / 499 |
| `artillery-coop-late` / `portal-p0-coop-late-d` | Coop Square, 960×540 | Gültige maximale Talent-Ränge / `evasive` | Niederlage in Welle 3 | 112,9 s / 162 |
| `storm-alley-late` / `portal-p0-alley-late-e` | Feed Alley, 960×540 | Gültige maximale Talent-Ränge / `evasive` | Niederlage in Welle 9 | 355,8 s / 1019 |

Es handelt sich um synthetisch vorbereitete **Meta-Spielstände mit zulässigen Rängen**, nicht um Spielstände eines beobachteten menschlichen Testers. Talentboni entstehen ausschließlich über `MetaProgressionSystem.applyRunBonuses`. Die zwei Profile und Viewports sind nicht kontrolliert gleich; die Ergebnisse sind deshalb keine belastbare Klassen-Balancingstudie.

Die drei ersten Runs wurden gleichzeitig ausgeführt; die Zusatzruns teilweise parallel zu anderen Aufnahmen. Deren Framezeiten enthalten diese Konkurrenz und Screenshotkosten. Für die Leistungsreferenz gelten nur die separaten Messungen.

Späte Dichte im normalen Ace-Run, aus kontinuierlicher Spieltelemetrie:

| Welle | Maximale gleichzeitig sichtbare Gegner | Maximale Spezialgegner weltweit | Maximale feindliche Projektile weltweit |
| --- | --- | --- | --- |
| 7 | 48 | 22 | 12 |
| 8 | 68 | 24 | 11 |
| 9 | 22 | 23 | 12 |
| 10 | 7 | 7 | 10 |

Die Maxima müssen nicht im selben Frame auftreten. Spezialgegner-/Projektildaten zählen auch außerhalb der Kamera. Die `wave-*-peak.png` werden durch Sekundenstichproben nach einem globalen Objektzahlindikator ausgewählt; sie sind keine garantierten Bilder des maximalen sichtbaren Gedränges. Feed Alley erreicht im zusätzlichen Run 65 sichtbare Gegner in Welle 8. Beide Befunde rechtfertigen eine genaue Lesbarkeitsprobe; sie belegen keine pauschal notwendige Gegnerreduktion.

Alle fünf Runs endeten regulär und ohne aufgezeichneten Laufzeit-/Netzwerkfehler. Coop Square, Waves 7–10, ist nicht verifiziert. Diese Lücke wird in Paket 2/5 durch gezielte Spieler-Runs geschlossen, bevor dort Balken, Dichte oder Kamera geändert werden.

## Bestätigte Befunde und konkrete Folgearbeit

| Befund | Reproduktion / Beleg | Folgeentscheidung |
| --- | --- | --- |
| Hauptmenü überschneidet Beschriftungen | [960×540, Erstnutzer](desktop-first-play.png): `HARVEST YARD` und `PREPARE RUN` liegen übereinander. | Paket 1: Mapidentität und Runbeschreibung getrennte Flächen; dekorativen Leerraum reduzieren. |
| Upgrade-Informationen verschwinden | [960×540, volle Slots/EVO](desktop-full-build-evo-queue.png), [Detailangebot](desktop-primary-recipe-details.png): Titel 12 px, Rang 8 px, Effektchips 7 px; Description, Synergy und EVO-Hinweis `display:none`. | Paket 1: Pflichtinformation erhalten, Mindestmaße/Scrollbereich. |
| Mobil bleiben manche Effekte sehr klein | [390×844, Rezepte](portrait-primary-recipe-details.png): Effektchips 9 px; EVO-Hinweis sichtbar, aber 10 px. | Paket 1: Auch das hohe Portraitlayout gegen die internen Schriftziele prüfen. |
| Englische UI enthält deutsche Fragmente | Angebote zeigen `NEU`, `EVO-ZIEL`, teilweise `SOFORT`; Desktopnav Training, Portraitnav Talents. | Paket 1: durchgehend englische Benennungen und Talents. |
| Vier Bosskarten bilden 3+1 | [844×390, Boss-Truhe](landscape-boss-chest.png), [960×540](desktop-boss-chest.png). | Paket 1: gleichwertiges 2×2 bzw. vertikales Layout; Reroll/letzte Karte erreichbar. |
| Stormcrest-Porträt verliert Gesicht | [1440×900, Roosters](large-advanced-roosters.png): Kamm dominant, Augen vom unteren Kopfbereich abgeschnitten. | Paket 1: eigener Porträtfokus statt neuem Asset. |
| Primärwaffen-Rangicon fehlt | [Blast Shell-Angebot](desktop-primary-recipe-details.png): generischer Stern; Reinforced Breech und Bigger Eggs verwenden gleiches Basissymbol. | Paket 3: stabile Fähigkeitszuordnung und passende Rangicons. |
| Bossbanner überlappt Boss-HP | [Vorbereitetes Layout](desktop-boss-banner-layout.png). | Paket 2: reservierte Meldungsflächen; Fixture beweist Layout, nicht Häufigkeit. |
| Bossbereich wird auch regulär verdeckt | [Ace, Welle 10](runs/ace-yard/wave-10-peak.png): Kill-Chain überdeckt rechte Bossinformationen. [Welle 9](runs/ace-yard/wave-9-peak.png): EVO/Chain beanspruchen gleichzeitig die obere Kampfzone. | Paket 2: Priorität und kollisionsfreie Platzierung durch reale Aufnahme bestätigt. |
| Ergebnispriorität/Scrollaufwand | [Echter Sieg, 960×540](runs/ace-yard/result.png): neun Stat-Kacheln vor Belohnung/Unlocks; Rückkehr unterhalb des sichtbaren Ausschnitts. | Paket 4: Belohnung/Unlock zuerst, Detailwerte einklappen, Hauptaktion erreichbar halten. Keine Behauptung, die Aktion sei generell unbedienbar. |

Talents, Detaildialog, Archive und Settings wurden auf allen vier Größen jeweils mit Erstnutzer- und fortgeschrittenem Stand aufgenommen. Der Settings-Screen bleibt beispielsweise bei [844×390](landscape-advanced-settings.png) vollständig lesbar. Diese Screens brauchen keinen pauschalen Neuaufbau; Paket 1 prüft sie bei gemeinsamen Typografieänderungen erneut.

## Bedingte Änderungen – keine pauschale Freigabe

- **Feed-Alley-Figur:** Die projizierte Alpha-Höhe der Süd-Idle-Referenz beträgt bei 390×844 etwa 27,3–28,8 CSS-px; in Yard/Coop 42,9–45,3. Desktop 960×540: 55,5–58,6. Das bestätigt den Größenunterschied, noch keine menschliche Erkennungsschwelle. In Paket 2 zunächst Kontur/Bodenmarkierung/HP-Abstand vergleichen; Zoom/Skalierung erst nach Gerätetest.
- **Bodenwiederholung:** Die regulären Yard-/Alley-Runs erfassen mehrere Kamerapositionen. Wiederkehrende Gras-/Blumenmuster sind sichtbar; die Kampfmitte bleibt ruhig. Drei Varianten zunächst nur als begrenztes Muster testen. Kein zusätzlicher dichter Dekorationspass.
- **Assetstil:** Finale Figuren, Porträts und Props sind verwendbar. Die Tafel zeigt unterschiedliche Konturgewichte und Detailgrade; daraus folgt ein gezielter Art-Mustervergleich, kein Beleg für zwingenden Austausch sämtlicher Gegner/Maps.
- **Gegnerbalken/Dichte:** Reguläre Peaks sind erfasst, Coop-Late fehlt. Kornkrabbler sind bereits balkenlos. Erst nach direktem Sichtvergleich normale Balken zeitlich begrenzen; Eliten/Boss erkennbar halten.
- **Angriffsanimationen:** Weiter optional. Die bestehende Figurenabnahme und Produktionsansichten geben keinen Anlass, diesen Releaseumfang vorzuziehen.

## Reproduzierbare Szenarien

| Szenario | Vorbereitung | Zweck |
| --- | --- | --- |
| Erstnutzer | Neuer isolierter Kontext, leerer Speicher; kanonischer Zustand in [first-save.json](first-save.json). | Gesperrte Klassen/Expeditionen, null Kernels/Talentränge, noch keine Runhistorie. |
| Freigeschalteter Hub | [advanced-save.json](advanced-save.json). | Alle Klassen/Expeditionen, freigeschaltete Kosmetik und Archive; noch keine Talentboni. |
| Fortgeschrittene Meta | [late-save.json](late-save.json). | Gültig begrenzte Talent-/Mastery-Ränge für zusätzliche normale Runs. |
| Drei Level-ups | `startLevelUp(3)` nach normaler Klassenwahl. | Folgeentscheidungen, Restzähler, Reroll und Höhe. |
| Elite-/Boss-Truhe | `startChestReward('elite'/'boss')`; normale Angebotsgenerierung. | Drei/vier Karten und gegenseitige Gewichtung. |
| Voller Build/EVO | Fünf aktive/vier passive Slots, primäre Blast Shell R4, Reinforced Breech; Spielerlevel 20; normale Verfügbarkeitsprüfung bestätigt Siegebreaker-EVO. | Lange Texte, Synergie, EVO bereit/weiteres Rezept noch nicht bereit. Ein Level-up plus Elite- und Bosstruhe stehen zusätzlich an. |
| Primärwaffe/Rezept | Gültige Definitionen Blast Shell, Reinforced Breech, Rocket Egg bei Level 6. | Fehlendes Primäricon, Rang, Hinweise und lange Beschreibung mit identischen Karten über Viewports. |
| Bosslayout | Ein normal konfigurierter Boss, Bossbanner und angehaltene Szene. | Konkretes Layout reproduzieren. Kein normaler Wave-10-Run und kein Stresstest. |
| Sieg/Niederlage | Vorbereitete Endzustände plus echte Run-Endbilder. | Oberfläche im leeren und im real gewachsenen Build vergleichen. |

Fixture-Aufnahmen verändern Szene/Runzustand ausschließlich innerhalb ihres Browserkontexts. Sie sind kein Gameplay-, Balance- oder Performancebeweis. Es wurden keine künstlichen Stressmassen erzeugt.

## Wiederholung und Vergleich nach Paket 1

Aus dem Repository, PowerShell:

```powershell
npm.cmd run test:release
node scripts/capture-portal-baseline.mjs --views
node scripts/capture-portal-baseline.mjs --runs
python scripts/render-portal-style-reference.py
node scripts/capture-portal-baseline.mjs --details
node scripts/capture-portal-baseline.mjs --late-runs
node scripts/capture-portal-baseline.mjs --measure
```

Der Erfassungslauf bringt seinen lokalen Server mit und schließt ihn anschließend. `--measure` alleine ausführen, nachdem alle anderen Erfassungen beendet sind. Voraussetzungen: vorhandenes `dist-release`, installierte Projektabhängigkeiten/Playwright-Chromium; für die Tafel Python/Pillow und Windows-Schriften. Die Befunde wurden visuell geprüft; die Erfassung erzwingt zusätzlich gültige EVO-Voraussetzungen und volle Slots. Absichtliche Baseline-Mängel werden nicht als grüne UI-Abnahme ausgegeben.

Für spätere Vorher/Nachher-Vergleiche den Ausgangsordner erhalten und ein anderes Ziel verwenden:

```powershell
$env:PORTAL_BASELINE_OUTPUT = 'docs/qa/portal-package-1'
node scripts/capture-portal-baseline.mjs --views
node scripts/capture-portal-baseline.mjs --details
Remove-Item Env:PORTAL_BASELINE_OUTPUT
```

Paket 1 wird gegen dieselben Texte/Slots und Viewports geprüft. Paket 2 vergleicht Figurengröße, HUD-Bereiche und normale späte Kampfansichten. Paket 3 vergleicht Quellen, Streamingwege und Dateibudget. Physische Mobilgeräte, Safari/WebKit, langsame Portalnetze und menschliche Erstspielertests bleiben Paket 5.
