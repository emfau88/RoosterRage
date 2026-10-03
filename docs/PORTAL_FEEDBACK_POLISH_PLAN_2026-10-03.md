# Portal-Polish: Pickups, Darstellung, Kampfgefühl und Belohnungen

Stand: 3. Oktober 2026. Freigegebene Reihenfolge aus dem Gespräch. Basis `d776dd1`; Boombardier `031b970` ist inklusive öffentlichem Kandidaten gepusht. Arbeitsbranch `codex/portal-feedback-polish`.

## Umfang und Abnahme

1. [x] Pickup-Sammelfläche unabhängig vom sichtbaren Sprite zentrieren; Schweben bewegt nur die Darstellung. Echtes Darüberlaufen aus mehreren Richtungen, alle Figuren, volle/fehlende HP, einmalige Auslösung und Pause prüfen. Volle HP und aktivierten Effekt verständlich rückmelden.
2. [x] Kleine Welt-Pickups, eindeutige Upgrade-/Primärwaffenicons, Porträts passend zu den freigegebenen Roostern. Originale erhalten; feste Assetquellen und Prompts speichern. Vorher/Nachher nebeneinander in einem Bild, Desktop und Portrait prüfen.
3. [x] Ein humorvolles Elite-Muster: Turbo-Gans für Gilded Talon und erkennbare Champion-Variante. Bestehende Angriffswerte, Warnungen und Rolle erhalten, Bewegung/Richtungen prüfen. Andere Elite-Typen erst nach Musterabnahme.
4. [x] Sound-Abdeckung der Angriffe dokumentieren; Dash und Blast-Shell-Einschlag ergänzen. Materialgerechte Kisten-/Heuzerstörung und kurze, gebündelte Kampfakzente. Gefahren priorisieren; Audio-/Effektlimits und deaktivierte Effekte respektieren.
5. [x] Paket 4: kurze unterscheidbare Reward-/EVO-Präsentation, Ergebnis zuerst mit Fortschritt/Freischaltungen, Build und einklappbaren Kampfdaten, erreichbare Rückkehraktion. Reward-Queue, Pause und einmalige Vergabe prüfen.
6. [x] Gemeinsame Release-, Menü-, Audio-, Arena-/Pickup- und betroffene Kampftests; Quellen, Vergleichsgalerie und Bewertung. Zusammenhängende Commits; keine alten Assets löschen.

## Bewusst getrennte Versuche

AOE-Bombenkisten, zusätzliche Combo-Punkte/Multiplikatoren und ein längerer Streak-Timer verändern Balance bzw. Progression. Sie bleiben Vorschläge für einen späteren begrenzten Versuch. Feed-Alley-Kamera/Größe, Hochformatpflicht, übrige Elite-Neuentwürfe sowie reale Mobilgeräte-/Erstspielerabnahme gehören nicht zur hier bestätigten Reihenfolge.

Kein pauschaler Assettausch und keine behauptete komplette Portalfreigabe. Jeder erledigte Abschnitt erhält Prüfbelege; nicht ausgeführte Geräteprüfungen bleiben offen.

## Nach jüngstem Feedback weiterhin offen

- [x] Zwei weitere eigenständige Elite-Typen (Panzertruthahn und Chili-Puter), mit unterschiedlicher Darstellung und Angriffsrhythmus. [Vergleich und Abnahme](qa/portal-elites-v2/README.md).
- [ ] Stärkere grafische/spielerische Unterschiede weiterer Champions; bislang bleibt die goldene Goose-Variante.
- [ ] Akustische und visuelle Abnahme auf echten Mobilgeräten, Kamera/Figurengröße in Feed Alley und Erstspielerfeedback.

Die sechs Schritte des oben abgegrenzten Passes sind geprüft. [Umsetzungsbericht](PORTAL_FEEDBACK_POLISH_REPORT_2026-10-03.md) und [Direktvergleich](qa/portal-feedback/index.html) enthalten die Belege.
