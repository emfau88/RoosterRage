# Void-Integration – 04.11.2026

Freigabe: A für normale Stufen, B für EVO. R1–R4 nutzen den Sogwirbel, EVO den aufrechten Void-Spalt. R1–R3 besitzen kleinere Kerne und weniger Strömungen/Partikel; R4 und EVO folgen den freigegebenen Entwürfen. Der alte geschlossene Öffnungsring entfällt zugunsten der neuen Öffnung.

Die Darstellung liegt auf getrennten Boden-, Hintergrund-, Kern- und Vordergrundebenen. Beim erneuten Auslösen endet die alte Spielwirkung sofort und ihre Darstellung fällt innerhalb höchstens 700 ms zusammen. Ablauf und Szenenneustart entfernen sämtliche Anzeigeobjekte und Ereignisbindungen. Texturen werden pro Spielinstanz wiederverwendet.

## Geprüfter Ablauf

Fähigkeit auslösen → passender Effekt erscheint → ursprünglicher Sog und Schaden wirken → Pause hält alle Ebenen an → erneutes Auslösen ersetzt das aktive Feld → alte Darstellung klingt aus → Ablauf/Neustart räumt auf.

- `tests/void-effects-runner.mjs`: WebGL und Canvas bestanden. Für jede der fünf Stufen, jeweils ohne und mit Molotov-Synergie, wurde die gesamte Lebensdauer in 20-ms-Schritten mit der tatsächlichen vorherigen Implementierung verglichen. Schadensereignisse, Tick-Zeitpunkte, Gegnerpositionen, Sogwerte und Ablauf waren identisch. 20 Vergleiche insgesamt.
- Aktive und auslaufende Darstellung pausieren korrekt. Nach erneutem Auslösen bleibt genau ein aktives Gameplay-Feld. Auslaufende Darstellung und ihre zusätzliche Ereignisbindung werden entfernt. Neustart beseitigt aktive und auslaufende Visuals.
- `tests/weapon-progression-runner.mjs`: gesamte Waffenprogression einschließlich Void R1–R4/EVO, anderer Waffen, Feuer-Eier und Modifikatoren bestanden.
- `tests/mechanics-runner.mjs`: vollständiger Mechaniklauf bestanden, einschließlich Flächeneffekten, Waffen, Gegnerfähigkeiten und Zielsuche.
- `npm run build:release`: erfolgreich. Es bleibt der vorhandene Vite-Hinweis auf große Chunks; kein Buildfehler.

Die Mechanikprüfung wurde auf die neue Darstellung umgestellt. Im Waffenlauf wurde außerdem ein bestehendes Timingproblem der Prüfung behoben: Beim Warten auf einen R3-Einschlag konnte vorher der noch auslaufende R2-Einschlag mit derselben Textur genügen. Die Prüfung verlangt jetzt die richtige Stufe und sichtbare Animationsframes. Es wurde dafür keine Raketenmechanik geändert.

## Sichtprüfung

Angesehen wurden die echten Produktionsklassen auf dem Farmboden in normalem Figurenmaßstab: Öffnung bei 220 ms, Laufphase bei 1700 ms in WebGL und Canvas, sowie Kollaps 220 ms vor Ablauf. Kein Beschnitt; normale Kerne liegen flach, EVO bleibt aufrecht. Die Stufen unterscheiden sich durch Kernmaß, Feldgröße, Strömungszahl und Partikeldichte.

Zusätzlich wurde die echte EVO-Darstellung mit Heil-Aura, Molotov, Raketenexplosion und Laser angesehen: [Überlagerung](../animation-review-2026-11-04/void-overlap.png). Die neue Void-Darstellung bleibt funktionsfähig; das Gesamtbild wird dabei vor allem von den bereits vorhandenen dichten Molotov-Flammen und durchgehenden Laserlinien überlagert. Das ist ein Ergebnis der anschließenden [Animationsbewertung](../animation-review-2026-11-04/README.md), keine Behauptung uneingeschränkter Lesbarkeit jeder Effektkombination.

Berichte und ausgewählte Aufnahmen liegen in diesem Verzeichnis. Die Entwürfe mit beiden Alternativen bleiben unter `../void-effects-study/` erhalten. Die vorher bestehenden Y8-Vorarbeiten werden nicht in diesen Commit aufgenommen. Portalarchive wurden für diesen Auftrag nicht neu gepackt; ein Live-Upload gehört nicht zu dieser Prüfung. Ein eigener Leistungstest auf schwacher Mobilhardware wurde nicht durchgeführt.
