# Abnahmepunkt 1: gemeinsame Final-v1-Master

Status: bereit zur gemeinsamen Proportions- und Silhouettenabnahme. Die
Standardversion des Spiels bleibt `next`; Legacy, Next und Gameplay bleiben
unverändert als Rollback erhalten.

## Ace / Ass

- Gameplay-Anatomie, Fäuste und Schulter-Layer bleiben die Basis.
- Neuer, versionierter Seitenfächer mit fünf großen Federn.
- Neuer, versionierter symmetrischer Rückfächer mit sieben Federn.
- Beide Fächer setzen am Becken an und ergeben bei Scale `0.250` eine sichtbar
  kompaktere Hahnensilhouette.

## Bummbert

- Süd und Nord wurden moderat verbreitert.
- Das Seitenprofil verwendet ein neues zusammenhängendes Body-Modul mit
  bogenförmigem Hüftabschluss statt des bisherigen Maskenstapels.
- Kurze Beine, Bauch, Becken und Schwanz bilden eine geschlossene schwere
  Lastlinie; nur ein Armpaar bleibt lesbar.

## Blitzkamm

- Finale Scale zunächst `0.255`.
- Brust, Armabstand und Hüfte wurden moderat verbreitert.
- Der tiefe Seitenfächer wurde vergrößert, ohne die vertikale Eleganz des
  aktuellen Gameplay-Rigs zurückzunehmen.
- Sichtbare Seitenbreite: `37.2 px` statt ungefähr `28–29 px` im Gameplay.

## Reproduzierbarkeit

1. `python scripts/prepare-final-rooster-parts.py`
2. `node scripts/export-final-rooster-masters.mjs`
3. `python scripts/render-final-rooster-masters.py`

Die gemeinsamen Prüftafeln sind:

- `rooster-final-master-review.png`
- `legacy-gameplay-final-real-scale.png`
- `metrics.json`
