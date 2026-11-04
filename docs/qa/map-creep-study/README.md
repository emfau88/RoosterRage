# Map-Gegner: isolierte Vorschläge

Archiv der vier isolierten Vorschläge für die Folgemaps. **Nach Freigabe wurden die Varianten kontrolliert in alle drei Maps übernommen**, mit unterschiedlichen Map-Gewichtungen. Umsetzung und Prüfung: [Map- und Effekt-Update](../../MAP_ENEMY_VARIETY.md). Die folgenden Abschnitte dokumentieren die ursprüngliche Vorschau; deren Vergleichsdateien bleiben erhalten.

## Feed Alley

- **Rammer:** vorhandener Runner in Schieferblau mit elfenbeinfarbenen Stacheln. Normal etwas langsamer, 0,7 Sekunden klar erkennbare Vorwarnung, dann ein kurzer gerader Sprint mit festgelegter Richtung und anschließender Erholung. Sprint und Vorwarnung verwenden in dieser Studie eigene Vorschau-Choreografie; später könnte die vorhandene Dash-Fähigkeit wiederverwendet werden.
- **Kornkrabbler:** cremefarbenes Küken mit blauer Eierschalenkappe. Häufig auftauchende optische Map-Variante, ohne neue Fähigkeit oder veränderte Werte.

## Coop Square

- **Stampfer:** vorhandener Brute in warmem Steingrau mit leicht violettem Ton. Stoppt in der Nähe des Spielers, warnt 0,7 Sekunden vor und stampft in einen kleinen Nahbereich. Anschließend kurzes Erholungsfenster. Die Vorschau zeigt einen 76-Pixel-Bodenradius; dies ist ein Gestaltungswert, kein festgelegter Schadensradius. Für einen späteren Einbau bietet sich die bestehende Slam-Fähigkeit mit zusätzlicher Näheprüfung an.
- **Kornkrabbler:** pflaumenfarbenes Küken mit terrakottafarbener Eierschalenkappe. Nur ein neuer Skin, unveränderte Rolle.

Als erster Umfang würde je Map nur ein Teil der vorhandenen Runner beziehungsweise Brutes ersetzt. Die häufigen Kornkrabbler können je Map durchgängig den eigenen Skin erhalten. Gegnerzahl, Belohnungen und erste Map bleiben zunächst gleich. Neue Fähigkeiten benötigen anschließend einen gesonderten Balance- und Spieltest.

## Ansehen

- `alley-before-after.gif` / `alley-before-after.mp4`
- `coop-before-after.gif` / `coop-before-after.mp4`
- Interaktiv bei laufendem Vite-Server: `/docs/qa/map-creep-study/?map=alley` beziehungsweise `?map=coop`.
- Oben: alle vier Laufrichtungen, 2,5-fache Detailansicht. Unten: Figuren im Originalmaßstab, auf einem unverkleinerten Ausschnitt des jeweiligen Spielbodens mit dem Map-Farbfilter aus `src/config/mapArt.js`.
- Die Bewegung unten ist eine inszenierte Verhaltensskizze mit identischer Spielerbewegung links und rechts. Sie verwendet keine produktive Gegner-KI, keine Spawnlogik, Kollisionen oder Schaden. Boden und Requisiten zeigen eine Studienszene, keinen exakten Gameplay-Replay.

## Assets und Erzeugung

Skins mit dem eingebauten **Imagegen-Tool** aus den vorhandenen Laufsheets erzeugt; kein CLI/API-Fallback. Die Originalformen, Blickrichtungen und Laufposen wurden als Vorlage verwendet.

- `assets/alley-rammer.png`
- `assets/alley-kornkrabbler.png`
- `assets/coop-stomper-run.png`
- `assets/coop-stomper-stomp.png`
- `assets/coop-kornkrabbler.png`

Die vollständigen verwendeten Prompts stehen in `imagegen-prompts.json` und `stomp-prompt.txt`. Die generierten Dateien behalten ihre Transparenz. Sie werden nicht als fertige 256-Pixel-Sheets ausgegeben: `frame-layout.json` definiert ihre tatsächlichen Frame-Rechtecke und gleicht die Bildanker an die jeweiligen Originalframes an. Figuren werden ausschließlich gleichmäßig skaliert. Diese Vorschau-Metadaten wären bei einem späteren Einbau zu übernehmen oder in einen regulären Atlas zu überführen.

## Prüfung und Grenzen

`capture.mjs` prüft beide Maps mit WebGL und Canvas: vorhandene Assets, keine Browserfehler, vier Laufrichtungen, gleiche Figurengröße vor/nachher, gleichmäßige Skalierung, Vorwarnung/Aktion/Erholung, eingefrorene Zeit, sichtbare Animation, stabile Objektanzahl beim Zeitspringen sowie Pause/Tempo/Zeitschieber/Mapwechsel. `verification.json` protokolliert die Ergebnisse und SHA256-Werte der Vorschauquellen.

Sichtprüfung: Detailansicht und Originalmaßstab; Körperproportionen, Transparenz, Kontrast zum jeweiligen Boden, Frame-Beschnitt, Ausrichtung, Warnphase und Aktionshöhepunkt. Der häufige Kornkrabbler bleibt kleiner als der besondere Gegner; der Stampfer erhält keine große Aura. Die bereits im Original vorhandene Bewegung innerhalb einzelner Frames bleibt weitgehend erhalten.

Die Vorschau ersetzt keinen späteren Spieltest der Fähigkeiten. Schaden, Cooldowns, Spawnanteile und Schwierigkeit sind noch nicht integriert oder abschließend abgestimmt. Der Hash des produktiven Git-Diffs wird gegen `baseline.json` geprüft; bestehende fremde Änderungen bleiben unberührt.

Zur Rückfrage während der Vorschau: Im aktuellen produktiven `CollisionSystem` erkennt eine Überlappung zwischen Spieler und Gegner Kontaktschaden, blockiert ihre Bewegung aber nicht. Beide haben blockierende Kollision mit Arena-Hindernissen. Die reine Vorschau zeigt keine Schadensreaktion; ihre Vorführbewegung bleibt auf ausdrücklichen Wunsch unverändert. Es wurden keine Kollisionsregeln geändert.

Reproduzieren (PowerShell, im Projektordner):

```powershell
$env:ROOSTER_TEST_URL='http://127.0.0.1:5197/'
node docs/qa/map-creep-study/capture.mjs
```

`--still` prüft und schreibt nur Standbilder. Alle Vorschau-Dateien verbleiben unter `docs/qa/map-creep-study/`, temporäre Einzelbilder unter dem ignorierten `test-results/map-creep-study/`.
