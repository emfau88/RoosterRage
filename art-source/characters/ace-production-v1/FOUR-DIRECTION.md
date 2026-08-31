# Ace – Vier-Richtungs-Abnahmevorschau

Stand: 31.08.2026. Lauf und Idle sind lokal reversibel als neue Ace-Standarddarstellung integriert; die isolierte Abnahmevorschau bleibt erhalten.

## Ergebnis

Ace besitzt drei gezeichnete Richtungsgrundlagen:

- Süd: Revision-02-Frontansicht mit großem Kopf und schmalem Rumpf.
- West: eigenständige Seitenansicht mit getrennten Flügeln, Füßen und Schwanz.
- Nord: eigenständige Rückansicht mit korrekter Rückseite von Riemen, Schulterplatten, Eiern und Schwanz.
- Ost: exakte horizontale Spiegelung der Westansicht, entsprechend der bestehenden Spiellogik.

Jede der vier Blickrichtungen hat einen kontinuierlichen Laufzyklus mit 24 Prüfschritten und einen ruhigen Idle-Zyklus mit 24 Prüfschritten. Derselbe Pose-Sampler steuert die interaktive Vorschau und die exportierten Sheets. Ausrüstung und Körper werden während der Animation nicht neu gezeichnet.

## Interaktive Prüfung

Entwicklungsserver im Projekt starten:

```text
npm run dev -- --port 5180 --strictPort
```

Danach [Ace isoliert öffnen](http://127.0.0.1:5180/ace-preview.html).

- Testfläche anklicken und mit WASD oder Pfeiltasten bewegen.
- Beim Loslassen wechselt Ace weich in Idle und behält die letzte Blickrichtung.
- „Idle ansehen“ zeigt die ruhige Atmung und das leichte Nachschwingen der Flügel ausdrücklich ohne Laufbewegung.
- `R` oder „Laufen ansehen“ zeigt einen Laufzyklus ohne Positionsänderung.
- `1–4` oder die Richtungsschaltflächen wählen Süd, West, Nord und Ost.
- „Vier Richtungen automatisch“ wechselt alle 2,2 Sekunden.
- Darstellung kann zwischen 25 % Spielgröße, 65 % und 100 % Prüfgröße wechseln.

Die Bühne ist schwarz und enthält nur Ace, einen zurückhaltenden Bodenschatten und einen schwachen Lichtfleck. Es gibt keine Gegner, Effekte oder Kartenobjekte.

## Quellen und Reproduzierbarkeit

- `generated/south-parts-alpha-v2.png`
- `generated/west-parts-alpha-v1.png`
- `generated/north-parts-alpha-v1.png`
- `generated/north-complete-legs-alpha-v1.png`
- `generated/prompt-v2.txt`
- `generated/prompt-west-v1.txt`
- `generated/prompt-north-v1.txt`
- `generated/prompt-north-complete-legs-v1.txt`

Die Grafikquellen wurden mit dem eingebauten ImageGen-Werkzeug erzeugt. Die West- und Nord-Prompts sowie der finale Süd-Prompt sind vollständig gespeichert. Jedes korrigierte North-Bein ist ein vollständig neu gezeichnetes, durchgehendes Einzelasset vom Federansatz bis zum flachen, vom Betrachter weg gerichteten Fuß. Es gibt keine montierte Knöchelverbindung; frühere getrennte Shin-/Foot-Teile werden vom aktuellen Rig nicht geladen. Die RGB-Ausgaben mit Chroma-Hintergrund bleiben ebenfalls erhalten. Der ImageGen-Skill-Helfer `remove_chroma_key.py` erzeugte die Alphaquellen mit `#00ff00`, Soft Matte, Schwellen 48/190 und Despill.

Reproduzierbarer lokaler Export:

```text
npm run assets:ace-preview
npm run test:character-lab
npm run build:character-lab
```

`assets:ace-preview` schneidet die unveränderten Richtungsteile zu, sampelt die Live-Posen und rendert acht transparente PNG/WebP-Sheets sowie acht schwarze QA-GIFs. Die Ergebnisse liegen unter `exports/four-direction/` und `docs/qa/ace-four-direction/`.

## Technischer Prüfstand

- 8 Clips: vier Richtungen × Lauf/Idle.
- Je 24 Prüfframes.
- Laufperiode 520 ms; Idle-Periode 2800 ms.
- Alle Schleifen schließen mathematisch ohne Sprung.
- Ost wird in jedem Frame geometrisch exakt aus West gespiegelt.
- Kein Export berührt einen 8-Pixel-Sicherheitsrand.
- Ruhige Silhouettenhöhe: Süd 211–214 px, West/Ost 213–215 px, Nord 215–218 px im 256-Pixel-Frame.
- Die neutralen Richtungen entsprechen bei Spielskalierung `0,25` der bisherigen Ace-Höhe: Süd 53,25 px, West/Ost 53,5 statt 53,75 px und Nord 54,25 px.
- Der reproduzierbare Direktvergleich liegt in `docs/qa/ace-four-direction/ace-legacy-vs-new.png`; die Messwerte stehen in `ace-size-comparison.json`.
- Der reguläre Produktions-Build und die bisherigen Spielassets bleiben unverändert.

Die Einbindung verändert keine Kampf-, Treffer-, Schuss- oder Bewegungsmechanik. Trefferfeedback bleibt als vorhandener Sprite-Tween erhalten; eine eigene Schussanimation kann unabhängig davon später ergänzt werden.

## Reversibler Spieleinbau

Der neue Ace ist inzwischen die lokale Standarddarstellung. Der Austausch verändert weder `baseScale = 0.25` noch Physikkreis, Bewegung, Waffenposition oder Gameplaywerte.

- Standardtest: `http://127.0.0.1:5180/`
- Sofortiger Legacy-Rückweg: `http://127.0.0.1:5180/?aceVisual=legacy`
- Zentraler Schalter: `src/config/aceVisual.js`
- Das bisherige `src/assets/characters/rooster-ace-walk-v2.webp` bleibt unverändert erhalten und wird zusätzlich unter `rooster-ace-walk-legacy` geladen.
- Die logische Produktionstextur `rooster-ace-walk` zeigt standardmäßig auf `ace-next/rooster-ace-next-walk.webp`.
- Der neue Idle-Zyklus liegt separat in `ace-next/rooster-ace-next-idle.webp`.

Die Runtime-Sheets werden reproduzierbar aus demselben Pose-Sampler erzeugt. Der Lauf verwendet vier gleichmäßig verteilte Frames pro Richtung bei 520 ms; Idle verwendet acht Frames pro Richtung bei 2800 ms. Zusammen benötigen sie rund 1,32 MB statt der rund 4,8 MB großen QA-Sheets.
