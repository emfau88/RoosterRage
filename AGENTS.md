# Rooster Rage: visuelle Änderungen

Der Nutzer erwartet, dass offensichtliche Gestaltungsfehler selbst erkannt und vor einer fertigen Präsentation behoben werden. Technisch bestandene Tests ersetzen keine Sichtprüfung.

- Neue Grafiken und Animationen auf dem tatsächlichen Spieluntergrund und im tatsächlichen Figurenmaßstab beurteilen. Nicht nur große, isolierte Assets ansehen.
- Proportionen erhalten: Feuer, Rauch, Figuren und andere Volumen grundsätzlich gleichmäßig skalieren. Die Perspektive nicht durch Stauchen des ganzen Sprites erzwingen. Flache Projektion gehört zu Bodenwellen und Schatten.
- Zündung, stärksten Frame, Übergänge und Abklingen selbst visuell prüfen. Bei Salven auch mehrere gleichzeitige Effekte ansehen; Figuren, Projektile und Spielfeld müssen lesbar bleiben.
- Auf Beschnitt, springende Frame-Anker, übergroße geschlossene Farbflächen, starre Konturen und Sticker-/Steinkranz-Eindruck achten. Auffälligkeiten korrigieren, nicht lediglich erfolgreiche Renderer-Tests melden.
- Beim Comicstil an vorhandenen Spielgrafiken orientieren. Spektakulärere Effekte durch Verlauf, getrennte Ebenen und Partikel steigern; eine größere undurchsichtige Fläche allein reicht nicht.
- Bei einem Vorschauauftrag neue Varianten separat unter `docs/qa/` halten und den bisherigen Vergleich erhalten. Einbau, Commit oder Veröffentlichung richten sich nach der jeweils vorhandenen Nutzerfreigabe.
- In der Ergebnisnotiz festhalten, welche Ansichten tatsächlich geprüft wurden und welche Grenzen noch bestehen. Keine ungeprüfte visuelle Eignung behaupten.
