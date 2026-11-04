# Void: zwei animierte Entwürfe

Entwürfe und Aufnahmen: 02.11.2026. Am 04.11.2026 bestätigt: **A für normale Stufen, B für EVO**. Diese Kombination ist inzwischen ins Spiel übernommen; siehe [Integrationsprüfung](../void-effects-integration/README.md). Die Videos bleiben als Aufnahmen der damaligen Vorschauen erhalten.

## Varianten

- **A – Sogwirbel:** kurze, nach innen wandernde Spiralfäden, kompakter schwarzer Bodenkern, Lichtspuren und schwebende Funken. EVO ergänzt weitere Strömungen und höhere Wisps. Zum Ende ziehen sich Feld und Partikel zusammen.
- **B – Void-Spalt:** aufrechter, organisch bewegter Riss, wandernde Lichtsegmente am Boden, aufsteigende Fragmente und ein Zusammenfallen des Spalts. EVO hat eine höhere Silhouette und mehr Partikel.

Die Animationen entstehen aus zeitgesteuerten Phaser-Ebenen, gezeichneten Bändern und wiederverwendeten Partikeln. Es wird kein einzelnes starres Effektbild gedreht. Dunkle Kerne bleiben kompakt; der größere Wirkungsbereich besteht überwiegend aus durchsichtigem Licht und einzelnen Spuren.

## Ansehen

- `a-in-motion.gif` / `a-in-motion.mp4`
- `b-in-motion.gif` / `b-in-motion.mp4`
- Jeweils R4 links, EVO rechts. Die Videos enthalten 252 Frames bei 30 fps, 1280 × 700 Pixel, Laufzeit 8,4 Sekunden. GIFs sind für die direkte Ansicht kleiner exportiert; MP4s zeigen Lichtverläufe sauberer.
- Interaktive Seite nach `npm run dev`: `/docs/qa/void-effects-study/`. A, B, direkter EVO-Vergleich und bisheriger Effekt, mit Pause, halber Geschwindigkeit und Zeitregler.

Originaler Farmboden und originale Figuren: Ace 0,25, Support 0,28, Slime 0,20. R4 behält für den Vergleich Radius 190 und Laufzeit 6000 ms; EVO Radius 225 und Laufzeit 7200 ms. Nur Bodenprojektionen liegen flach. Der aufrechte Riss und die Partikel werden nicht perspektivisch zusammengedrückt.

## Tatsächlich geprüft

- Sichtprüfung der finalen R4-/EVO-Ansichten bei Öffnung (0,55 s), laufendem Effekt (1,9 und 3,3 s), R4-Kollaps (6,1 s), EVO-Kollaps (7,3 s) und vollständigem Abklingen (7,9 s).
- Figurenüberlagerungen und Maßstab anhand der echten Sprites. In den geprüften Ansichten kein Beschnitt oder Sprung des Effektankers, keine große geschlossene undurchsichtige Außenfläche.
- Erste Sichtprüfung zeigte zu regelmäßige, massive Spiralarme und zu starre Bodenbahnen. Diese wurden vor dem Export in kürzere wandernde Segmente aufgelöst. Gekappte Bandenden wurden durch sauber begrenzte Pfadintervalle korrigiert; Partikelphasen sind unregelmäßig verteilt.
- WebGL und Canvas: A, B, direkter Vergleich und aktueller Effekt. Je 13 feste Zeitpunkte; keine Seiten- oder Assetfehler, endliche Transformationen, unveränderter Radius und konstante Anzahl von Anzeigeobjekten. A/B jeweils 136 Objekte einschließlich beider Panels und aller Figuren.
- Pause, Fortsetzen, halbe Geschwindigkeit, Zeitregler und Navigation erfolgreich bedient. Angehaltene Frames sind reproduzierbar; verschiedene Zeiten ergeben unterschiedliche Renderbilder.
- Beide MP4s erfolgreich decodiert. Zusätzlich zeitliche Bildfolgen direkt aus den exportierten Videos erstellt und angesehen: `a-motion-review.png`, `b-motion-review.png`.
- `verification.json` enthält den finalen automatisierten Bericht und den unveränderten Hash des bereits vorhandenen Git-Diffs. Alle neu angelegten Dateien dieses Auftrags liegen unter `docs/qa/void-effects-study/`; bestehende Spieländerungen und Portalpakete wurden nicht bearbeitet.

## Grenzen

Die Gegnerbewegung ist eine identische illustrative Choreografie für beide Varianten, keine Kampf- oder Balance-Simulation. Die Vorschau zeigt den vollständigen Lebenszyklus; im laufenden Spiel kann ein neu gesetztes Void-Feld ein altes früher ersetzen. Der Vergleich „Aktueller Effekt“ verwendet `VoidZone` direkt; der separate kurze Öffnungsimpuls aus `VoidNestAbility` ist dort nicht nachgebildet.

Die unten dokumentierten Entwurfsprüfungen stammen vom 02.11.2026. R1–R3, Integration, Pause, erneutes Auslösen, Neustart und eine Überlagerung mit mehreren Effekten wurden anschließend am 04.11.2026 geprüft und sind im verlinkten Integrationsbericht dokumentiert. Ein eigener Leistungstest auf schwachen Mobilgeräten steht weiterhin aus. Der Vergleich „Bisheriger Effekt“ nutzt jetzt eine eingefrorene Kopie der alten `VoidZone`, damit er nach dem Einbau erhalten bleibt.

## Noch offene Verbesserungsideen

- Kleine Wellenereignisse: etwa Schwarmwellen, kurzzeitige Flächenschaden-Verstärkung oder Bombenfass-Ketten. Die früher ergänzten Elite-Mischungen sind bereits vorhanden; diese zusätzlichen Ereignisse sind weiterhin Vorschläge.
- Breiterer Vergleich kompletter Builds über ganze Runs: Schaden, Überleben und tatsächlicher Nutzen von Nebenwaffen und Synergien. Zuverlässigere Salven, Support-Chick und bessere Unterstützung begonnener Builds wurden zuvor bereits bearbeitet.
