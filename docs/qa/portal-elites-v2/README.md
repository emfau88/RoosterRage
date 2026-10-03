# Zwei weitere humorvolle Elites

3. Oktober 2026, Basis `a44b4f4`. [Isolierter animierter Vergleich](index.html): Lauf und Angriff separat, vier Ansichten, Pause; zusätzlich jeweils ein Vorher-/Nachher-Bild auf Desktop und Mobil hochkant.

- **Panzer Turkey / Panzertruthahn:** breite Bronze-/Eisenrüstung, Kochtopfhelm, kurzer Truthahnfächer. Vier Laufrichtungen, Ausholen durch tiefe Kniebeuge, Stampfer und Erholung. Während der Vorbereitung 20% Bewegung, beim Einschlag Stillstand, in der Erholung 35% Bewegung. Die Rüstungsaura bleibt.
- **Chili Gobbler / Chili-Puter:** creme-/korallfarbene Figur, Kochmütze, grüne Chili-Schürze, rote Backen. Vier Laufrichtungen, Aufplustern, Rückfedern und Erholung. Während Vorbereitung/Angriff Stillstand; in der Erholung 25% Bewegung. Regenerationsaura und Fünfer-Salve bleiben.

Die bestehenden Elite-Plätze der Wellen verwenden die neuen Figuren. Es kommen keine zusätzlichen Gegner oder Wellen hinzu. HP, Grundgeschwindigkeit, Kontakt-/Angriffsschaden, XP, Auren, Radien, Kollisionsoffsets, Geschossparameter, Cooldowns und Warnzeiten sind gegen den vorherigen Release-Build identisch geprüft. Das Anhalten/Verlangsamen während des Angriffs ist eine absichtliche Verhaltensänderung: Die Gefahrenquelle ist klarer erkennbar und bietet ein kurzes Gegenangriffsfenster. Farbige Warnringe und violette Gegnergeschosse bleiben lesbar und unverändert.

Die neuen Angriffsposen folgen `move → windup → resolve → recovery`. Sie werden beim normalen Laufen nicht abgespielt. Die Blickrichtung bleibt während eines Angriffs erhalten; anschließend beginnt wieder die Laufanimation. Bei Spielpause halten auch die neuen Animationsframes an, zusammen mit Timer und Position. Gepoolte Gegner setzen den Pausenzustand zurück.

## Belege

- `runtime-checks.json`: zwei Typen × vier Richtungen; tatsächlicher Zustandspfad, mehrere Animationsframes, Bewegungsrhythmus, eingefrorene Pause und exakt fünf Geschosse.
- `release-checks.json`: Produktions-WebGL auf 1440×900 und 390×844; gleiche Bühne, keine Browserfehler, identische numerische Kampfparameter.
- Encounter-Gate: alle Elite-Auren, Warnzeiten, Angriffe, Champion und Truhenbelohnungen sowie neun Abnahmeszenarien bestanden. Alte Namensannahme des Champion-Tests durch Prüfung des tatsächlich angekündigten Namens ersetzt.
- Pause-Gate bestanden. Release-Gate inklusive iframe und blockiertem Speicher bestanden; Paket **18,83 MiB**, innerhalb des bestehenden 19-MiB-Budgets.
- Generatororiginale, genaue Prompts, geschnittene PNG-Teile und Exportmanifest unter `art-source/enemies/portal-elites-v2`. Imagegen Built-in; keine externen Bildpakete. Laufzeitassets unter `src/assets/enemies/portal-v2`.

## Bewertung und Rückweg

Die Silhouetten und Requisiten sind deutlich unterschiedlicher und passen besser zur humorvollen Farmwelt als die bisherigen gepanzerten Kreaturen. Der schwere Stampfer und der aufplusternde Koch vermitteln ihre Rollen bereits durch die Pose. Die Ganzkörper-Verformungen sind bewusst klein; getrennte Kopf-/Flügelanimationen wären eine mögliche spätere Verfeinerung, falls sie in Spielgröße einen erkennbaren Gewinn bringen. Neue Champion-Grafiken und zusätzliche Schadensmechaniken wurden nicht ergänzt. Reale Geräte- und Erstspielerabnahme bleiben offen.

Alle alten Atlanten sind erhalten. `VITE_PORTAL_ELITE_ART=classic` beim Vite-Start/Build wählt die alten Figuren, ihre ursprünglichen Animationen, Namen und Bewegungsrhythmen. Die neuen Sheets speichern drei einzigartige Richtungen, die rechte Ansicht wird gespiegelt; dadurch bleiben Download und Texturspeicher kleiner. Export: WebP Qualität 84, Alphaqualität 70, PNG-Originale unverändert. Zwei Walk- und zwei Action-Sheets zusammen 892.888 Bytes; dekodiert rund 24 MiB vor möglicher zusätzlicher GPU-Belegung/Mipmaps.

Reproduktion: den Release-Build der Basis unter `test-results/elite-variety/before-release` sichern, neuen Release bauen, `npm run qa:portal-elites`. Export über `npm run assets:portal-elites`; Python/Pillow erforderlich.
