# Camera-relative Target Acquisition Gate

Status: vorsichtiger, isoliert ruecknehmbarer Reichweitenversuch.

## Regel

- Neue Ziele muessen innerhalb des sichtbaren Kamerarechtecks plus einer halben
  Bildschirmbreite und -hoehe Rand auf jeder Seite liegen.
- Das erlaubte Rechteck ist dadurch doppelt so breit und doppelt so hoch wie
  das aktuell sichtbare Weltfenster.
- Die Berechnung verwendet `camera.worldView` und passt sich daher automatisch
  an Desktop, Mobile-Hochformat, Querformat und den Mobile-Kamerazoom an.

## Betroffene Zielwahl

- Primaerwaffe und Mehrfachschuesse
- Golden Egg, Lightning Comb, Laser Comb und Support Chicks
- Rocket Egg inklusive Rang 4 und Evolution
- Molotov Egg und Void Nest inklusive Cluster-Suche

## Bewusst unveraendert

- Bereits fliegende Projektile verfolgen ihr bestehendes Ziel weiter.
- Ricochets und Ketteneffekte duerfen nach einem gueltigen Erstschuss weiterhin
  ihre lokalen Anschlussziele verwenden.
- Projektil-Lebensdauer, Schaden, Gegnerbewegung und Spawnlogik bleiben gleich.

## Ruecknahme

Die Aenderung liegt in einem eigenen Commit. Ein Revert dieses Commits stellt
die vorherige unbegrenzte Zielerfassung wieder her, ohne den AOE-Polish-Commit
zurueckzunehmen.
