# Paket 2: Figurenlesbarkeit und Kampfmeldungen

Umsetzung am 1. Oktober 2026. Die technische Prüfung ist bestanden; die vollständige Geräte-/Portalabnahme bleibt in Paket 5. Spieler-HP werden gemäß Nutzerentscheidung ausschließlich oben im HUD angezeigt.

## Entscheidungen und Änderungen

1. **Spieler ohne HP-Balken an der Figur.** Der bisherige Weltbalken wurde entfernt. Zahl, Füllstand und Warnfarben im HUD bleiben erhalten. Eine kleine ruhige Bodenellipse kennzeichnet den Spieler auch während der Trefferanimation. Sie ist eine Kontaktmarkierung, keine Darstellung der Trefferfläche. Keine zusätzlichen Bilddateien, Shader, Vergrößerung oder Kamerazoomänderung.
2. **Figurenmaß mit echten Alpha-Grenzen.** Alle 192 Frames der sechs ausgelieferten Idle-/Walk-Sheets wurden bei Alpha ≥ 16 gemessen. Der Bodenmarker folgt einer stabilen Kontaktgrenze pro Hahn und springt nicht mit jedem Animationsframe. Die physikalischen Radien bleiben Ace 14,5, Artillery 15,95 und Storm 14,79 Welteinheiten. Vier Richtungen und die bestehenden Animationen bleiben erhalten.
3. **Ein gemeinsamer Meldungsplatz.** Der Platz wird aus den tatsächlichen Rechtecken von Figur-HUD, Metriken, Bossbalken, Loadout und Bedienelementen berechnet. In niedrigen Fenstern kann die freie Fläche neben dem Loadout genutzt werden. Reihenfolge: Begegnungs-/Bosswarnung → Upgradebestätigung → Kill-Serie. Unterbrochene Bestätigungen werden fortgesetzt; mehrere Kill-Ereignisse werden zur neuesten Serie zusammengefasst. Settings/Upgrades pausieren die Meldungsanzeige. Der große Kill-Sticker entfällt im Kampf. Die kompakte Upgradebestätigung zeigt Name und Rang; die vollständigen Wirkungen bleiben in der Auswahl und im Buildbericht.
4. **Gegner-HP: AUTO als Standard, ALWAYS als gespeicherte Option.** Normale Gegner zeigen ihren Balken ab einem Treffer für 1,6 Sekunden Spielzeit. Weitere Treffer verlängern die Anzeige. Eliten, Champions und Bosse behalten ihre Balken. Die schon balkenlosen Kornkrabbler bleiben balkenlos. Settings erklären AUTO und bieten ALWAYS für Spieler, die reguläre Gegnerbalken ständig sehen möchten. Das reduziert die vielen vollen Balken in späten Wellen und erhält relevante Informationen über angeschlagene Ziele.
5. **Gefahrenformen geprüft, erhalten.** Eigene Molotov-/Void-Flächen wurden gleichzeitig mit roten schweren Vorwarnungen und aktiven Gegnerprojektilen aufgenommen. Bodenellipsen, Flammen/Portal und dominante rote Warnringe sind unterschiedlich gestaltet; die Warnungen rendern darüber. Es gab keinen belegten Anlass, diese bestehenden Effekte neu zu gestalten. Kamera-Shake und Bildschirmblitze bleiben abschaltbar.

## Messung in Feed Alley

Sichtbare Höhe über alle 64 Posen je Hahn, in CSS-Pixeln; transparente Sheet-Ränder ausgeschlossen. 390×844 wurde mit DPR 2 und dem Produktions-WebGL-Renderer geprüft. Die höhere Screenshot-Auflösung ist keine größere Spielfigur.

| Fenster | Ace | Artillery | Storm |
| --- | ---: | ---: | ---: |
| 960×540 | 56,9–61,9 | 55,4–62,3 | 53,0–59,2 |
| 844×390 | 51,8–56,2 | 50,3–56,7 | 48,2–53,8 |
| 390×844 | 27,9–30,4 | 27,2–30,6 | 26,0–29,1 |

Die mobile Feed-Alley-Figur bleibt klein. Bodenmarkierung und weniger konkurrierende Balken sind umgesetzt; die Entscheidung über weitere Skalierung folgt erst nach einer menschlichen Prüfung auf echten Telefonen. Sichtfeld und Spielergeometrie wurden erhalten.

## Vergleich und Aufnahmen

- Feed Alley: [vorher](../portal-package-1/portrait-feed-alley-geometry.png), [Ace nachher](feed-390-ace.png), [Artillery nachher](feed-390-artillery.png), [Storm nachher](feed-390-storm.png).
- Bossinformationen: [vorher mit überlagernder Kill-Serie](../portal-package-0/runs/ace-yard/wave-10-peak.png), [nachher im regulären Kampf](runs/ace-yard/wave-10-peak.png).
- Volles Loadout plus priorisierte Bossmeldung: [960×540](boss-layout-960.png), [844×390](boss-layout-844.png), [390×844](boss-layout-390.png), [320×568](boss-layout-320.png). Diese Bilder sind vorbereitete Layoutfixtures.
- [Upgradebestätigung](upgrade-receipt.png), [kompakte Kill-Serie](kill-chain.png), [Gegner-HP in Settings](enemy-hp-settings.png).
- Gleichzeitige Gefahren: [Molotov + schwere Warnung + Bossprojektil](hazards-simultaneous.png), [zusätzlich Void + violettes Gegnerprojektil](hazards-void-simultaneous.png). Vorbereitete Fixtures; keine Behauptung natürlicher Buildprogression.
- Kurze WebM-Bildfolgen: [Yard Welle 7](runs/ace-yard/wave-7-sequence.webm), [Welle 8](runs/ace-yard/wave-8-sequence.webm), [Welle 9](runs/ace-yard/wave-9-sequence.webm), [Welle 10](runs/ace-yard/wave-10-sequence.webm), [Alley Welle 8](runs/storm-alley-late/wave-8-sequence.webm), [Coop Welle 8](runs/artillery-coop-novice/wave-8-sequence.webm).

Die Clips bestehen aus jeweils 16 regulären Produktionsscreenshots, mit 100-ms-Wartezeit plus Aufnahmezeit, als 5-fps-Bildfolge codiert. Alle acht WebM-Dateien wurden vollständig decodiert. Sie belegen Bildzustände und Bewegung; sie sind keine Echtzeitvideo- oder Bildratenmessung.

## Reguläre Läufe und Grenzen

Kein erzwungener Wellenwechsel, keine direkte Vergabe von Kampfwerten/Upgrades und keine Beschleunigung. Die eingebauten Bots wählen reguläre Angebote. Isolierte Spielstände schalten Klassen frei; die als „late“ markierten Fälle verwenden legal begrenzte Talente/Mastery. Alle fünf Läufe ohne Browserfehler.

| Fall | Erreichte Wellen | Ausgang | Laufzeit |
| --- | --- | --- | ---: |
| Ace, Harvest Yard, Average | 1–10 | Sieg | 535,1 s |
| Storm, Feed Alley, Evasive | 1–8 | Niederlage | 261,9 s |
| Artillery, Coop Square, Average, kurzer Frame | 1–6 | Niederlage | 199,8 s |
| Artillery, Coop Square, Average, weiterer Seed | 1–6 | Niederlage | 247,4 s |
| Artillery, Coop Square, Novice, Hochformat | 1–8 | Niederlage | 299,0 s |

Die erste Runde (Yard, Alley, kurzer Coop-Frame) entstand vor der abschließenden Bereinigung der Hinweis-Timer. Die sichtbare HP-Logik, Meldungsposition und Spielfigurgeometrie stimmen mit dem Abschlussstand überein. Die zweite Coop-Runde enthält diese Timerbereinigung. Der abschließende Produktionsbuild wurde separat erneut geprüft und über Datei-SHA-256 erfasst. Dies ist keine behauptete identische Wiederholung aller Läufe auf jedem Build.

**Offene Abnahme:** Reguläre Wellen 9–10 für Feed Alley und Coop Square; menschliche Erkennbarkeit von Figur, Richtung und sicherer Ausweichbewegung auf echten Telefonen; Safari und Portalhardware. Die Bot-Aufnahmen auf Chromium/SwiftShader ersetzen diese Prüfungen nicht. Es wurden keine Balancewerte geändert, um die Aufnahme künstlich zu verlängern.

## Technische Prüfung

- `test:pressure`, `test:telegraphs`, `test:boss`, `test:pause`, `test:character-lab` (32 Tests), `test:hud-report`, `test:meta`, `test:evolution`, `test:menus`, `test:release`: bestanden; Logs in diesem Ordner.
- Ein parallel zum EVO-Test gestarteter Pressure-Lauf erreichte für Ace das vorhandene 55-Sekunden-Limit ohne Browserfehler oder Niederlage. Die unveränderte Prüfung bestand bei der anschließenden isolierten Wiederholung. Der erste Versuch ist in [pressure-concurrent-timeout.log](pressure-concurrent-timeout.log) erhalten; das Zeitlimit wurde nicht erhöht.
- Produktionsfixtures auf 20 Viewports, einschließlich aller Menügrenzen aus Paket 1: genau eine priorisierte Meldung, keine Überdeckung von Pflicht-HUD/Touchsteuerung, zentrale Ausweichfläche frei.
- Drei Hähne auf drei Feed-Alley-Viewports, 192 echte Alpha-Posen; ausschließlich HUD-HP und unveränderte physikalische Radien.
- Unterbrechung/Fortsetzung der Meldungen, Pausieren im Overlay, Zusammenfassung der Kill-Serie, Verzögerung bei Spielerüberdeckung einschließlich reproduziertem Coop-Randfall; Gegnerbalken nach Treffer, Ablauf, Pool-Reaktivierung und dauerhaft für Prioritätsgegner.
- AUTO/ALWAYS über die echte Settings-Schaltfläche bedient; Sichtbarkeit und gespeicherter Wert geprüft. Blitze/Shake aus bei weiterhin sichtbaren schweren Warnungen.
- Release unter dem vorhandenen Budget von 19 MiB; keine neue Bild-/Audiodatei im ausgelieferten Spiel. WebGL im Produktions-iframe auch ohne verfügbaren persistenten Speicher; keine ausgelieferte Test-API.

[Produktionsprüfungen](combat-checks.json), [Alpha-Messung](sprite-bounds.json), [Buildmanifest](release-manifest.json), [Verifikation](verification.json), [Laufübersicht](combat-runs-summary.json), [zusätzliche Coop-Läufe](coop-runs-summary.json), [Clipmanifest](clips.json).

Reproduktion in PowerShell nach `npm.cmd run test:release`:

```powershell
python scripts/measure-player-bounds.py --output docs/qa/portal-package-2
$env:PORTAL_BASELINE_OUTPUT='docs/qa/portal-package-2'
node scripts/capture-portal-baseline.mjs --combat
node scripts/verify-portal-package-2.mjs
```

Paket-0-/Paket-1-Bilder und deren historische Nachweise bleiben erhalten.
