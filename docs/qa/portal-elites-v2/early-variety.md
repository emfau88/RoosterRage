# Frühere Elite-Abwechslung

3. Oktober 2026, Basis `8bbe41f`.

Die bisher ersten drei besonderen Begegnungen waren Turbo-Gans (Welle 3), goldener Gans-Champion (früh in Welle 6) und erneut Turbo-Gans (Ende Welle 6). Die verschiedenen Elite-Grafiken wurden erst in Welle 8 und 9 gezeigt.

| Begegnung | Neue Besetzung |
| --- | --- |
| Welle 3, Ende | Turbo Goose, Dash und Tempoaura |
| Welle 6, innerhalb der Welle | Chili Gobbler Champion, vorbereitete Fünfer-Salve |
| Welle 6, Ende | Panzer Turkey, Bodenstampfer und Rüstungsaura |
| Welle 8 | Golden Goose Champion und Chili-Gobbler-Elite |
| Welle 9 | Panzer-Turkey-Elite |

Die neue Champion-Variante verwendet die freigegebene Chili-Grafik mit der bestehenden goldenen Champion-Markierung. Die Eigenfarben bleiben erhalten. Die Vorbereitung dauert 520 ms, der Angriff hat 5,2 Sekunden Cooldown; Bewegung während Vorbereitung/Schuss hält an, danach folgt die Erholung. Laufgeschwindigkeit 84 statt der 48 des späteren Chili-Elites: Der frühe Champion schließt zwischen den Salven auf, statt außerhalb der Kamera zurückzubleiben. Fünf violette Geschosse mit bestehenden Chili-Schadenswerten; sie zählen zum normalen 12-Geschoss-Budget. Keine Regenerationsaura beim Champion. Kontaktschaden (15), Basis-XP (30) und garantierte goldene Truhe entsprechen dem bisherigen Champion-Platz. Seine HP sind für diese frühere Fernkampfbegegnung auf 360 statt 520 abgestimmt; der spätere Gans-Champion bleibt unverändert. Laufgeschwindigkeit und Angriff ändern sich entsprechend der neuen Fernkampfrolle.

Wellenanzahl, Gesamtgegnerzahl, feste Wellen- und Segment-XP-Budgets, Elite-/Champion-Anzahl, Truhen, reguläre Zusammensetzung und Druckkurve bleiben erhalten. Der Tausch von Tempoaura/Dash gegen Rüstungsaura/Stampfer in Welle 6 ist eine bewusste Änderung der Begegnung. Der frühe Truthahn erhält 360 HP wie die dort ersetzte Gans; der spätere Truthahn behält 450 HP. Die drei bisherigen primären Gefahrenrollen bleiben Runner, Flächenkontrolle und Tank.

## Prüfung

- Begegnungstest prüft die tatsächliche Reihenfolge aus der erzeugten Spawn-Queue, unterschiedliche Champion-Grafiken, Angriffe, Warnzeiten und garantierte goldene Truhen.
- Animationsprüfung für beide neuen Elites und den Chili-Champion: vier Ansichten, getrennte Lauf-/Angriffsphasen, eingefrorene Pause und exakt fünf Geschosse.
- Mechaniktest prüft Wellenzahlen, Zusammensetzung und identische XP-Budgets; Meta-Test prüft Entdeckung und Archiv.
- Mobiler Welle-6-Drucktest mit allen drei Roostern und einem festen Build mit acht Upgrades. Vergleich mit alter Besetzung bei gleichen Seeds und gleicher Testausrüstung. Dies ist ein begrenzter Begegnungstest, kein Nachweis der Balance aller möglichen Builds oder realer Erstspieler.
- Die Diagnose zeigte außerdem einen Fehler der automatisierten Teststeuerung: Wenn nach dem letzten Spawn keine Gegner mehr im Zielbereich waren, wanderte der Bot in der großen Streaming-Welt weiter, statt die übrigen Gegner zu suchen. Der Bot kehrt in der Aufräumphase jetzt zum nächsten verbleibenden Gegner zurück. Menschliche Tastatur-/Touchsteuerung bleibt unverändert. Frühere Messungen mit dieser Wanderbewegung sind kein belastbarer Balancevergleich.

Die Protokolle liegen lokal unter `test-results/early-variety-*`; die Druckberichte dokumentieren die Einzelmessungen. In den Vorprüfungen überschritt der feste Boombardier-Testbuild auch mit der alten Besetzung das 40–50-Sekunden-Wellenziel. Wegen der dabei gefundenen Bot-Wanderbewegung ist daraus keine allgemeine Balanceaussage abzuleiten. Abnahme mit echten Spielern und verschiedenen Builds bleibt offen.

Der abschließende Welle-6-Test mit korrigierter Bot-Aufräumsteuerung bestand mit allen drei Figuren: Ace 47,15 s, Boombardier 49,63 s, Stormcrest 44,88 s. Normale Geschosse blieben jeweils im Limit von zwölf; keine Laufzeitfehler oder Timeouts. Die Aufräumsteuerung priorisiert verbliebene Gegner vor entfernten XP-Orbs, sobald keine Gegner im Zielbereich stehen. Bericht: `test-results/pressure-wave-6-report.json`.

Schwarmereignisse, temporäre AOE-Verstärkungen und Bombenfass-Ketten sind weiterhin Vorschläge und wurden hier nicht umgesetzt. Alte Grafiken sind erhalten.
