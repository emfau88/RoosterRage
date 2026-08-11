# Enemy Animation Polish

Status: korrigiert und abgeschlossen am 11.08.2026.

## Ergebnis

- Brood Tender und Nest Caller besitzen eigene, bewusst einfache 4×4-
  Bewegungssheets statt eingefärbter Spitter-Grafik.
- Jedes Sheet enthält vier echte Laufphasen für links, rechts, oben und unten.
- Runner, Brute, Gilded Talon, der darauf aufbauende Stormclaw Champion und
  Brood King besitzen ebenfalls echte 4-Richtungs-Locomotion mit vier Phasen
  pro Richtung.
- Der Slime bleibt bewusst beim richtungsneutralen 3-Frame-Wobble: Seine runde
  Silhouette transportiert keine relevante Blickrichtung.
- Proportionen, Konturstärke, Cel-Shading und Detaildichte orientieren sich
  verbindlich an Kornkrabbler, Runner, Slime und Spitter.
- Das alte Brute-Aktionssheet bleibt getrennt erhalten. Im Bewegungszustand
  läuft der Brute richtungsabhängig; zustandsgebundene Spezialanimationen können
  den Walk gezielt unterbrechen.
- Der Combat-Bulk ergänzt eigenständige 4×4-Walksheets für Spitter,
  Fan-Spitter, Bomber und Elite-Spitter. Die vorhandenen Pulse-, Recoil-,
  Armed- und Explosionsgrafiken bleiben getrennt erhalten und übernehmen nur
  während Windup, Resolve und Recovery.
- Support/Summoner zeigen ihre Fähigkeiten über vorhandene Aura- und Telegraph-
  Effekte; ihre Bewegungsrichtung wird nicht mehr von einer Ability-Pose
  überschrieben.

## Runtime-Budget

- Quellsheets: 4×4-Raster mit 16 Frames.
- Runtime: 1024×1024 WebP, 256×256 px pro Frame.
- Stormclaw verwendet bewusst Gilded Talons Sheet plus Goldmarker; dadurch
  entsteht kein redundantes Champion-Asset.
- Darstellung bleibt auf kompakte Ingame-Silhouetten begrenzt; Collider und
  HP-Balken sind kleiner als die sichtbare Figur.

## Asset-Herkunft

Die Figuren wurden mit den bestehenden Gegner-Sheets als strikte Stilreferenz
im Chroma-Key-Modus erzeugt und lokal freigestellt.

- Brood Tender: runder mint/cremefarbener Support-Kükengegner, Blattkamm,
  einzelner grüner Kern, keine Kleidung oder kleinteilige Federstruktur.
- Nest Caller: rundes dunkles Küken mit einfacher Eierschalenhaube, zwei
  violetten Augen und einem einzelnen Beschwörungssymbol; kein Stab oder Mantel.
- Movement-Bulk: Identität, Palette und Silhouette der vorhandenen 3-Frame-
  Sheets von Runner, Gilded Talon, Brute und Brood King wurden verbindlich als
  Referenz verwendet; es wurden keine neuen Gegnerdesigns eingeführt.
- Combat-Bulk: Dieselbe Referenzmethode wurde auf Spitter, Fan-Spitter, Bomber
  und Elite-Spitter angewendet. Beim Elite-Spitter wurde die zunächst
  missverständliche dritte Zeile vollständig durch eine echte Rückenreihe ohne
  Gesicht und vorderes Mittelrohr ersetzt; die vierte Zeile ist die Frontansicht
  mit allen drei Rohren.

Zeilenreihenfolge aller Richtungssheets: links, rechts, oben/rückwärts,
unten/vorwärts.
Quellen liegen unter `art-source/enemies/generated/`, die freigestellten Sheets
unter `art-source/enemies/animations/`.

## Jitter-Schutz

- `scripts/normalize_directional_enemy_sheets.py` richtet alle Frames je
  Bewegungsrichtung auf eine gemeinsame Skalierung, horizontale Mitte und
  Bodenlinie aus.
- Der Normalisierer erkennt zusätzlich die tatsächlichen transparenten Zeilen-
  und Spaltenbänder. Dadurch werden Modellabweichungen vom mathematischen
  Viertelraster nicht mehr an Hörnern, Stacheln oder Kronen abgeschnitten.
- Abnahme der Runtime-WebPs: maximal 0,5 px horizontale Mittelpunktabweichung,
  0 px Abweichung an der Bodenlinie und keine berührte Zellkante.
- Dadurch bleiben absichtliche Schritt- und Flügelbewegungen erhalten, ohne
  dass die gesamte Figur beim Animieren springt oder ihre Größe wechselt.

## Abnahme

- `npm run assets:check`
- `npm run build`
- `npm run test:encounter`
- automatische Prüfung aller vier Bewegungsrichtungen für Runner, Brute,
  Support, Summoner, Spitter, Fan-Spitter, Bomber, Elite Runner,
  Elite-Spitter, Champion und Boss
- automatische Prüfung, dass die originalen Angriffsanimationen von Spitter,
  Fan-Spitter und Elite-Spitter im Windup die Walksheets übernehmen
- quantitative Prüfung von Mittelpunkt, Bodenlinie und Zellgrenzen aller
  128 neuen Movement- und Combat-Bulk-Frames
- `npm run test:smoke`
- `npm run test:mechanics`
- Laufzeit-Screenshot in mobiler Portrait-Auflösung

Die zuerst erzeugten detaillierten Illustrationsfiguren wurden verworfen und
aus Quell- sowie Runtime-Assets entfernt.
