# Rooster Rage

![Rooster Rage – drei Kampfhähne verteidigen ihren Hof](public/marketing/rooster-rage-key-art-master.png)

**Drei Kampfhähne. Wilde Ei-Evolutionen. Ein Hof voller Monster.**

### [Rooster Rage jetzt im Browser spielen](https://emfau88.github.io/RoosterRage/)

Rooster Rage ist ein Mobile-first Bullet Heaven / Action Roguelite. Wähle Eier-Ass, Bummbert oder Blitzkamm, entwickle absurde Ei-Waffen und überlebe zehn eskalierende Wellen bis zum dreiphasigen Brood King.

> **Projektstatus:** Der vollständige Zehn-Wellen-Loop, alle drei Rooster, Waffenränge und EVOs, drei Arenen, Meta-Fortschritt sowie der aktuelle Kampf-, VFX- und Run-Preparation-Polish sind umgesetzt. Das Multi-Seed-/Real-Run-Production-Gate mit sechs Echtzeit-Vollruns und die automatisierten Production-Gates sind abgeschlossen. Die GitHub-Pages-Version bleibt eine öffentliche Testfassung; als Nächstes stehen subjektive Abnahmen auf realer Mobile-Hardware sowie weiteres Balance- und Präsentations-Feintuning an.

## Aktueller Spielumfang

- Drei Rooster-Klassen mit eigenem Primärangriff, eigener Passive und je drei Build-Archetypen
- Responsive Hennenhütte mit visueller Run-Vorbereitung, Arenaübersicht, Expeditionskarten, `Hähne`, dreistufigem Talentnest und vereinfachtem `Archiv`; der Run-Start bleibt auf Desktop und Mobile die Hauptaktion
- Zehn handkuratierte Wellen, drei Arenen, drei Elite-Archetypen und ein dreiphasiger Boss
- Echte 4-Richtungs-Locomotion für Kornkrabbler, Runner, Brute, Support,
  Summoner, Gilded Talon/Stormclaw und Brood King; Horde-Peaks bis 140 Gegner
  auf Desktop beziehungsweise 90 auf Mobile
- 45 Upgrade-Definitionen und elf sichtbare EVOs sowie Active-, Passive-, Orbit- und Summon-Builds; Rooster-Primärwaffen und aktive Waffen besitzen klar kommunizierte Rangpfade mit eigenen Projektil-, Flächen- und Impact-Steigerungen
- Feste Wave-/Segment-XP-Budgets: Hordenmenge und Levelgeschwindigkeit sind getrennt steuerbar
- Sichtbare, magnetische XP-Orbs mit verlustfreier Bündelung: maximal 72 auf Desktop und 48 auf Mobile
- Heal-, Magnet- und Bomb-Pickups an strategischen Wave-Momenten statt an schnell steigenden Killzahlen
- Lokale Bestwerte, Herausforderungen, Meisterschaft, Talentnest, Kosmetik, Run-Historie, Gegnerlexikon und entdeckte EVO-Rezepte
- Mobile-Hochformat als primäres Layout, eine kompakte Querformat-Sicherheitsdarstellung sowie vollständige Desktop- und Vollbild-Unterstützung
- Keine Werbung, Energie, Gacha- oder Pay-to-Win-Systeme

## Gameplay

<p align="center">
  <img src="docs/marketing/screenshots/05-run-preparation-desktop.png" alt="Aktuelle Run-Vorbereitung im Desktop-Layout" width="64%">
  <img src="docs/marketing/screenshots/06-run-preparation-mobile-portrait.png" alt="Aktuelle Run-Vorbereitung im Mobile-Hochformat" width="27%">
</p>

Der Charakter greift automatisch an. Bewegung, Positionierung, Upgrade-Auswahl und Build-Synergien entscheiden den Run. XP bleibt als sichtbares Orb-Sammelerlebnis in der Arena; erst bei großen Feldern werden nahe Orbs zu wertvolleren, größeren Orbs gebündelt.

- **Desktop:** WASD oder Pfeiltasten
- **Touch:** Auf der linken Bildschirmseite ziehen; der virtuelle Joystick folgt der Berührung
- **Interface:** Rooster-, Challenge- und Upgrade-Auswahl per Touch, Maus oder Pointer
- **Komfort:** Vollbild sowie getrennte Einstellungen für Audio, Schadenszahlen, Bildschirmwackeln, Aufblitzen und Vibration

## Lokal starten

Voraussetzungen: Node.js 24 und npm.

```bash
npm ci
npm run dev
```

Vite startet das Spiel standardmäßig unter `http://127.0.0.1:5173/`.

Produktions-Build:

```bash
npm run build
npm run test:production
```

## Qualitätssicherung

Die Browser-Tests verwenden Playwright und starten bei Bedarf selbstständig einen lokalen Vite-Server.

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

Weitere spezialisierte Gates stehen unter anderem über `test:boss`, `test:evolution`, `test:weapon-progression`, `test:hud-report`, `test:meta`, `test:balance`, `test:late-run`, `test:soak` und `test:telegraphs` bereit. Die aufgezeichneten Last- und Vollrun-Gates liegen bei 16,7–16,8 ms p95; der Late-Run-Test prüft 75, 110 und 150 aktive Gegner ohne Enemy-Pool-Drops. Das Mobile-Pressure-Gate prüft Wave 7 mit allen drei Hähnen. Eigene Regressionen sichern unter anderem XP-Werterhalt, Desktop-/Mobile-Orb-Caps, Pickup-Pacing, Waffenränge und responsive HUD-Zustände ab.

## Datenschutz

Die Produktmessung ist standardmäßig ausgeschaltet und muss sichtbar aktiviert werden. Ohne konfigurierten Telemetrie-Endpunkt werden keine Daten gesendet. Es gibt keine Konten, Cookies oder Werbe-IDs. Bei aktivierter Messung wird eine zufällige Sitzungs-ID ausschließlich im Arbeitsspeicher der aktuellen Seitensitzung geführt; erfasst werden begrenzte Funnel- und Run-Ereignisse ohne Anmeldedaten oder persistente Nutzerkennung.

## Technik

- Phaser 3.90
- Vite 8
- Vanilla JavaScript und CSS
- Playwright für Browser-, Mobile-Viewport- und Acceptance-Tests
- GitHub Actions und GitHub Pages Release-Pipeline

## Dokumentation und Medien

- [Aktueller Production Pass](RoosterRage_Next_Production_Pass.md)
- [Produkt- und Entwicklungsroadmap](ROADMAP.md)
- [Vertical-Slice-Validierung](docs/PHASE_17_VALIDATION.md)
- [Kommerzielle Validierung](docs/PHASE_18_COMMERCIAL_VALIDATION.md)
- [Character Art und HUD Production Pass](docs/PHASE_19_VISUAL_PRODUCTION.md)
- [Store-Texte und Asset-Manifest](docs/marketing/STORE_COPY.md)
- [36-Sekunden-Gameplay-Reel](docs/marketing/trailer/rooster-rage-35s-gameplay-reel.webm)

Das gezeigte Key Art ist eine originale, textfreie Marketingillustration. Titel, Altersfreigabe und Store-CTA werden erst im jeweiligen Plattform-Export ergänzt.
