# Phase G – Meta Progression

Status: umgesetzt und automatisiert geprüft (2026-08-10).

## Spielerischer Kern

- Jeder beendete Run vergibt mindestens 3 Körner. Kills, Sieg und Challenge-Multiplikator erhöhen die Auszahlung.
- Einmalige First-Clear-Boni: Standard 40, Rush Hour 60, Featherweight 75, Royal Gauntlet 100 Körner.
- Jeder Rooster besitzt fünf Mastery-Stufen bei 0/120/320/600/950 XP. Mastery gibt Badges und insgesamt bis zu 110 Bonus-Körner, aber bewusst keine zusätzlichen Kampfwerte.
- Der Hub zeigt Kontostand, Talentfortschritt, First-Clear-Status, Mastery und die Körner der letzten Runs direkt an.

## Talentnetz und Obergrenzen

Sechs dauerhaft gespeicherte Talente kosten zusammen 455 Körner. Voll ausgebaut ergeben sie maximal +6 % HP, +4,5 % Bewegungstempo, +6 % Startwaffen-Schaden, +12 % XP-Magnetradius, +1 Reroll und +1 Prozentpunkt kritische Trefferchance. Diese niedrigen Caps erhalten die Challenge-Balance; Mastery bleibt kosmetisch/motivierend.

## Save und Migration

- Aktuelles Schema: `rooster-rage:meta:v2`.
- Ein vorhandener v1-Spielstand übernimmt Runs, Siege, Kills, Bestwerte, Unlocks, Auswahl, Entdeckungen und Verlauf.
- Bestehende Spieler erhalten einmalig eine gedeckelte Veteranen-Gutschrift auf Basis ihres bisherigen Fortschritts.
- Ungültige oder beschädigte Daten fallen sicher auf einen frischen Zustand zurück.
- Die Run-Historie ist auf die letzten zehn Einträge begrenzt.

## Assets und Audio

Neu: ein Körner-Icon und je ein Mastery-Badge für Ace, Artillery und Storm. Die optimierten Runtime-Dateien liegen in `src/assets/meta/`; verlustfreie Arbeitsquellen liegen in `art-source/meta/`. Talentknoten verwenden vorhandene Upgrade-Icons, damit die Bedeutung konsistent bleibt.

Talentkauf und Ablehnung besitzen bereits UI-Feedback; die abschließende Audio-Mix-Prüfung bleibt Bestandteil von Phase H.

## Validierung

`npm run test:meta` deckt frischen Spieler, zehn Runs, alle First Clears, kompletten Talentpfad, Bonus-Caps, Persistenz, Reset, v1-Migration, beschädigte Saves und Unlocks ab. Portrait-Screenshots prüfen frischen und voll fortgeschrittenen Hub. Zusätzlich bleiben Asset-Manifest und Production-Build verpflichtende Gates.

Weapon Mastery wurde absichtlich nicht ergänzt. Das System sollte erst nach realen Wiederholungs- und Economy-Tests wachsen.
