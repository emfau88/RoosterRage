# Boombardier · neuer Mascot und gemeinsamer Portalstand

2. Oktober 2026. Baseline `c92942b`, Entwicklung auf `codex/boombardier-character-redesign`. Veröffentlichung aller drei neuen Spielfiguren über `codex/kongregate-upload` und den obersten README-Play-Link ausdrücklich vom Nutzer beauftragt.

[Offline-Animationsvergleich](artillery-vergleich.html) · [Ingame-Direktvergleiche](index.html) · [Quellen/Prompts](../../../art-source/characters/artillery-mascot-v1/PROMPTS.md) · [Runtime-Prüfung](runtime-checks.json) · [Acceptance](acceptance-matrix-report.json) · [Öffentlich spielen](https://emfau88.github.io/RoosterRage/kongregate/)

## Bewertung

| Thema | Ergebnis | Grenze / nächster sinnvoller Schritt |
| --- | --- | --- |
| Stil | Orange, roter Kamm, dunkle Handschuhe und einfache Goldakzente passen zu Ace und Stormcrest. Der breite, gedrungene Körper wirkt humorvoll und schwer. | Die frühere Figur vermittelt mehr realistische Rüstung; für die gewünschte Comic-Richtung bevorzuge ich die neue. |
| Gesicht | Größere, klarere Augen-/Schnabelflächen; grimmig-komischer Ausdruck. | Unter etwa 30 sichtbaren Pixeln sind Augen und kleine Details weiterhin begrenzt lesbar. |
| Ausrüstung | Zwei Ei-Taschen und großes Explosionszeichen machen die Bomberrolle ohne kleinteilige Rüstung verständlich. | Kein Bombenrucksack und keine gehaltene Bombe aus der Referenz; beide würden bei dieser Größe zusätzliche Überlagerung erzeugen. |
| Schwanz | Voller roter Fächer, eigener Profil- und Rückenteil, sichtbarer Anschluss am Rumpf. | Er bleibt stilisiert und bewusst überzeichnet. |
| Animation | Acht feste Phasen, langsamer 650-ms-Zyklus, geringerer Körperhub als bei Stormcrest, leichte Nachbewegung von Kamm/Schwanz. | Starre Füße könnten später durch Fußartikulation noch mehr Gewicht vermitteln. Keine neue Angriffsanimation eingebaut. |
| Menüs/HUD | Spielauswahl und Funktion bleiben erhalten. | Charakterportraits zeigen noch die bisherigen Illustrationen. Ein gemeinsamer Portraitdurchgang sollte nach der Figurenabnahme folgen. |

## Prüfung und Rückweg

- 45 Charaktertests bestanden, inklusive bisheriger Generationen, Schleifenschluss, Spiegelung, festen Komponenten, Hashes und Rollback-Auswahl.
- Neun Produktionsvergleiche (3 Maps × 3 Fenstergrößen) und 72 Lauf-/Idle-Zustände bestanden. Identische Kamera, Spielwerte, Maßstab, Kollisionsgeometrie und Mapobjekte; Ace-/Stormcrest-Atlanten unverändert.
- Elf Ingame-Vergleiche jeweils als EIN Vorher-/Nachher-PNG. Isolierte Offline-Datei enthält vier eingebettete Atlanten, Richtungen, Schrittsteuerung, Größen und Tempo. Kein Server nötig.
- Release-Gate mit Portal-Iframe und blockiertem Storage, Production-Gate, Asset-Check und Character-Lab-Build bestanden. Paket: 17,51 MiB bei unverändertem 19-MiB-Limit.
- Acceptance-Matrix mit Challenges, Maps, Archetypen, Telegraph-Ausweichen und Lastszenarien bestanden; Details im JSON. Testrechnerwerte, keine Aussage über echte Handy-GPUs.
- Alte Boombardier-Grafiken bleiben vollständig unter `src/assets/characters/artillery-final/`, ältere Generationen und Quellen ebenfalls. Lokal `?artilleryVisual=final`; Release-Rückweg `VITE_ARTILLERY_VISUAL_VERSION=final`. Separater Rollback-Build verifiziert.
- Finale neue Atlanten: zwei Dateien zu 2048×1024, acht Frames je Zeile, Süd/West/West/Nord, Osten per Spiegelung. Origin 0,5/0,5; Scale 0,275 vor Viewportfaktor. Lauf 650 ms, Idle 3200 ms.

Die öffentliche `/kongregate/`-Vorschau wird aus dem Kandidatenbranch gebaut. Der zweite README-Link zur Root-Version wird weiterhin aus `master` gebaut. Die Veröffentlichungsprüfung muss den Kandidaten-Commit über `build-info.json` und die tatsächlich geladenen Mascot-Atlanten aller drei Figuren bestätigen; ein Git-Push allein reicht nicht als Nachweis.

Auf der öffentlichen Vorschau sind alle drei Rooster auch mit frischem oder zurückgesetztem Spielstand sofort auswählbar. Diese Verfügbarkeit gilt ausschließlich auf `emfau88.github.io/RoosterRage/kongregate/` und schreibt keine künstlichen Freischaltungen in den Spielstand; reguläre Spielversionen behalten ihre Fortschrittsregeln.

Zusätzliche Prüfung: zwei Tests für Vorschau-Geltungsbereich und unveränderte gespeicherte Freischaltungen bestanden. `node scripts/verify-public-roosters.mjs --local` startet alle drei Rooster mit jeweils leerem Speicher im Release-Build auf der simulierten öffentlichen URL sowie Boombardier mit blockiertem Storage. Ohne `--local` prüft dasselbe Skript die echte Veröffentlichung inklusive Commit-ID. Es verwendet keine Test-API und keinen vorbereiteten Spielstand.
