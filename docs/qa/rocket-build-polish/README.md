# Raketen und Build-Fortsetzung – lokaler Prüfstand

Am 02.11.2026 zur Versionierung freigegebener Stand. Raketenflug, Salven, Support Chick und Build-Fortsetzung sind im Spielcode umgesetzt. Die neuen Aura- und Impact-Entwürfe bleiben separate Vorschauen; der freigegebene Impact-Stand liegt in `../rocket-impact-study-v3/`. Die bereits vorhandenen Y8-Arbeiten gehören nicht zu diesem Änderungspaket. Ein Push auf den Arbeitsbranch veröffentlicht noch keine neue Portalversion.

## Animierte Vorschauen

- `rockets-in-motion.gif` / `.mp4`: R1–R4 und EVO. Links zweifach vergrößertes Triebwerksdetail, rechts die tatsächlichen Projektile in Spielgröße. Flug, Flammen und Rauch verwenden die geänderten Spielklassen.
- `impacts-in-motion.gif`: die vorhandenen fünf Einschlagsvarianten in halber Geschwindigkeit zur Sichtprüfung.
- `impacts-in-motion.mp4`: Einschläge in normaler Geschwindigkeit.
- `impacts-slow-motion.mp4`: Einschläge in halber Geschwindigkeit.
- `*-webgl.png` und `*-canvas.png`: Momentaufnahmen beider Renderer.

Die Einschlagsgrafiken sind pro Rang unterschiedlich, die Animation verwendet Skalierung und Ausblenden. R3/R4 erzeugen drei zeitlich versetzte Cluster-Explosionen. EVO hat eine eigene größere Detonation. Die Impact-Assets wurden in diesem Arbeitsstand nicht ersetzt.

## Änderungen im Prüfstand

- Vollständige Raketen-Salven auch bei einem einzelnen Ziel; aktuelle Abschussposition und erneute Zielsuche bei verlorenen oder wiederverwendeten Gegnerobjekten.
- Eigenständige Triebwerke je Stufe, acht gemalte Flammenframes, pulsierendes Licht und begrenzte Rauch-/Funkenpartikel in Weltkoordinaten.
- Vollständiger EVO-Rumpf mit Spitze, ohne fest eingezeichnete Flammen. Zwei Assets mit dem integrierten ImageGen-Tool erstellt; Pfade und vollständige Prompts in `imagegen-prompts.json`.
- Support Chick verlangsamt ab R1 um 10 % für 0,5 Sekunden; ab R3 weiterhin 14 % für 0,7 Sekunden. Statusablauf erfolgt zuverlässig im Simulationsupdate.
- Ein gültiger weiterer Fähigkeitsrang wird bei normalen Upgrade-Angeboten priorisiert. Passende Synergien und fehlende EVO-Zutaten nahe dem Maximalrang erhalten mehr Gewicht. Slot-, Rang-, Klassen- und Levelgrenzen bleiben gültig.

## Prüfungen

`node --test tests/build-continuation.test.mjs` prüft Angebotsregeln, Rezeptzutaten, Grenzen und vollständige deterministische Pick-Sequenzen.

`node tests/rocket-build-polish-runner.mjs` prüft alle fünf Raketenstufen, Schaden am Einzelboss, Ziele aus dem Gegner-Pool, bewegte Abschusspositionen, Flammenframes, Pause und Bereinigung, alle sechs Support-Chick-Stufen samt Slow-Ablauf und die echte Upgrade-Auswahl im Browser – jeweils mit WebGL und Canvas.

Zusätzlich bestehen die vorhandenen Prüfungen `tests/display-projectile-runner.mjs` und `tests/weapon-progression-runner.mjs`. Aktuelle Ergebnisse werden in `verification.json` zusammengefasst.

Aufnahme: `node docs/qa/rocket-build-polish/capture.mjs`, zusätzlich `--impacts` für Einschläge oder `--still` für Standbilder. Optional setzt `ROOSTER_CHROMIUM` den lokalen Browserpfad. Videos werden mit FFmpeg exportiert.
