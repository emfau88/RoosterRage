# Raketen-Einschläge – korrigierte Vorschau 3

Am 02.11.2026 zur Versionierung freigegebene separate Vorschau nach dem Feedback zu gequetschten Proportionen und übergroßen geschlossenen Flächen. Die vorherige Comic-Studie in `../rocket-impact-study-v2/` bleibt für den Vergleich erhalten. Die neuen Impacts sind weiterhin nicht in die Spielklassen eingebaut; die Freigabe umfasst das Speichern und Pushen dieses Entwurfs. Es wurde keine neue Portalversion veröffentlicht.

## Korrektur

Der bisherige Atlas hatte Frames von 320 × 400 Pixeln, wurde jedoch mit abweichenden Breiten-/Höhenverhältnissen dargestellt. R4 wurde zusätzlich verbreitert. Diese Verzerrung ist entfernt: Jeder Feuer- und Rauchframe wird nun mit identischem X-/Y-Skalierungsfaktor gezeichnet. Nur Bodenlicht, Druckfronten und Staub auf dem Boden verwenden eine flache Projektion.

Die Feuerkerne und Cluster sind kompakter. EVO verwendet eine neu gezeichnete offene Feuerkrone mit dünneren warmen Konturen und getrennten Rauch-/Flammenfragmenten statt des geschlossenen braunen Randes. Die dominante EVO-Grafik endet nach 800 statt 1120 ms; ihre Deckkraft sinkt bereits in der zweiten Hälfte. Bodenlicht und Rauch sind schwächer und kürzer sichtbar. Die weiter reichenden Funken erhalten den stärkeren EVO-Eindruck.

## Vorschauen

- `all-in-motion.gif` / `.mp4`: alle fünf korrigierten Stufen bei normaler Geschwindigkeit.
- `compare-in-motion.gif` / `.mp4`: R4 und EVO, jeweils bisheriger Comic-Entwurf links und Korrektur rechts, gleiche Figuren und gleicher Maßstab.
- `salvo-in-motion.gif` / `.mp4`: ein EVO-Einschlag links, drei auf demselben Ziel im Abstand von 90 ms rechts. Keine künstliche Abschwächung der überlagerten Instanzen.
- `index.html`: interaktive Variante über den lokalen Vite-Server unter `/docs/qa/rocket-impact-study-v3/`; Pause, Zeitlupe und Vergleichsansichten.

Die beiden Quellbilder und WebP-Exporte liegen in `assets/`. `imagegen-prompts.json` enthält die vollständigen ImageGen-Prompts. `inspect-layout.py` liest lediglich Alpha-Grenzen und schreibt die Frame-Koordinaten; die Grafikbearbeitung selbst erfolgte mit dem integrierten ImageGen-Tool. Die Registrierung benutzt für sämtliche Frames eines Sheets denselben proportionalen Maßstab und erhält dadurch das Wachstum der Explosion.

## Sichtprüfung und technische Prüfung

Die Sichtprüfung erfolgt am realen Farm-Untergrund mit einer vorhandenen Gegnerfigur bei gleichem Maßstab: früher Blitz, Feuermaximum, Cluster, Rauchübergang und Abklingen. Zusätzlich wird die Überlagerung einer vollen EVO-Salve angesehen. Der Vergleich zeigt ausdrücklich den vom Nutzer beanstandeten Entwurf, nicht nur den ursprünglichen Spieleffekt.

`node docs/qa/rocket-impact-study-v3/capture.mjs` prüft WebGL und Canvas, 24 unbeschnittene Frames, proportionale Volumenskalierung, begrenzte maximale Kernbreite, wechselnde Frames, Abklingen, konstante Objektzahl und die sichtbaren Bedienelemente. Mit `--still` werden nur Standbilder erstellt. `verification.json` hält die Ergebnisse fest; `visual-review.json` dokumentiert die gesonderte visuelle Bewertung. Die Aufnahmen mit festen Zeitschritten sind kein Leistungsbenchmark des Spiels.

Die projektweite Regel für zukünftige Sichtprüfungen steht in `../../../AGENTS.md`: technische Tests allein reichen nicht, Proportionen und Lesbarkeit müssen vor der fertigen Präsentation selbst beurteilt werden.
