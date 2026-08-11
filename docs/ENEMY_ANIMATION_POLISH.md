# Enemy Animation Polish

Status: korrigiert und abgeschlossen am 11.08.2026.

## Ergebnis

- Brood Tender und Nest Caller besitzen eigene, bewusst einfache 4×4-
  Bewegungssheets statt eingefärbter Spitter-Grafik.
- Jedes Sheet enthält vier echte Laufphasen für links, rechts, oben und unten.
- Proportionen, Konturstärke, Cel-Shading und Detaildichte orientieren sich
  verbindlich an Kornkrabbler, Runner, Slime und Spitter.
- Brute, Spitter, Fan-Spitter, Bomber, Elite-Brute und Elite-Spitter verwenden
  weiterhin mechanisch gekoppelte `move`-, `windup`-, `resolve`- und
  `recovery`-Zustände.
- Support/Summoner zeigen ihre Fähigkeiten über vorhandene Aura- und Telegraph-
  Effekte; ihre Bewegungsrichtung wird nicht mehr von einer Ability-Pose
  überschrieben.

## Runtime-Budget

- Quellsheets: 4×4-Raster mit 16 Frames.
- Runtime: 1024×1024 WebP, 256×256 px pro Frame.
- Darstellung bleibt auf kompakte Ingame-Silhouetten begrenzt; Collider und
  HP-Balken sind kleiner als die sichtbare Figur.

## Asset-Herkunft

Die Figuren wurden mit den bestehenden Gegner-Sheets als strikte Stilreferenz
im Chroma-Key-Modus erzeugt und lokal freigestellt.

- Brood Tender: runder mint/cremefarbener Support-Kükengegner, Blattkamm,
  einzelner grüner Kern, keine Kleidung oder kleinteilige Federstruktur.
- Nest Caller: rundes dunkles Küken mit einfacher Eierschalenhaube, zwei
  violetten Augen und einem einzelnen Beschwörungssymbol; kein Stab oder Mantel.

Zeilenreihenfolge beider Sheets: links, rechts, oben/rückwärts, unten/vorwärts.
Quellen liegen unter `art-source/enemies/generated/`, die freigestellten Sheets
unter `art-source/enemies/animations/`.

## Abnahme

- `npm run assets:check`
- `npm run build`
- `npm run test:encounter`
- automatische Prüfung aller vier Bewegungsrichtungen für beide Figuren
- Laufzeit-Screenshot in mobiler Portrait-Auflösung

Die zuerst erzeugten detaillierten Illustrationsfiguren wurden verworfen und
aus Quell- sowie Runtime-Assets entfernt.
