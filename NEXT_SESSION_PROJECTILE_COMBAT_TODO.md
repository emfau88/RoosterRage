# Next Session TODO: Projectile / Combat Refactor

## Ziel

`GameScene` weiter entlasten, ohne Gameplay-Balance oder Verhalten zu verändern. Spieler-Combat, Auto-Schuss, Trefferlogik und Projektil-Spawning sollen kontrolliert in ein eigenes System ausgelagert werden.

## Nicht in diesem Schritt ändern

- Keine Balance-Anpassungen
- Keine neuen Upgrades
- Keine neuen Gegnerfaehigkeiten
- Kein automatischer Balance-Run
- Keine Aenderungen an Wave-Daten
- Keine Aenderungen an Enemy-KI

## Ziel-Datei

- Neu: `src/systems/CombatSystem.js`
- Geaendert: `src/scenes/GameScene.js`

## Sicherheitsprinzip

`GameScene` behaelt zuerst kompatible Wrapper-Methoden. Andere Systeme duerfen weiter `scene.spawnSpecialProjectileFrom`, `scene.damageEnemy`, `scene.findNearestEnemyFrom` usw. aufrufen.

Beispiel:

```js
spawnSpecialProjectileFrom(x, y, angle, target, options = {}) {
  return this.combat.spawnSpecialProjectileFrom(x, y, angle, target, options);
}
```

## Schritt 1: CombatSystem anlegen

- `constructor(scene)` speichert `this.scene`
- verwendet bestehende Scene-Arrays weiter:
  - `scene.projectiles`
  - `scene.enemies`
  - `scene.projectileGroup`
- verwendet bestehende Scene-Methoden weiter:
  - `scene.showShotFeedback`
  - `scene.showHitFeedback`
  - `scene.killEnemy`
  - `scene.telemetry`
  - `scene.waveSystem`

## Schritt 2: Read-only Helper extrahieren

In `CombatSystem` verschieben:

- `findNearestEnemy()`
- `findNearestEnemyFrom(x, y)`
- `getShotPattern()`
- `getShotTargets(count, fallbackTarget)`

Danach testen:

```powershell
npm.cmd run build
npm.cmd run test:mechanics
```

## Schritt 3: Projectile-Spawning extrahieren

In `CombatSystem` verschieben:

- `spawnProjectile(angle, target, laneOffset = 0, options = {})`
- `spawnSpecialProjectile(angle, target, options = {})`
- `spawnSpecialProjectileFrom(x, y, angle, target, options = {})`

In `GameScene` nur Wrapper behalten.

Danach testen:

```powershell
npm.cmd run build
npm.cmd run test:mechanics
```

## Schritt 4: Auto-Schuss extrahieren

In `CombatSystem` verschieben:

- `autoShoot(time)`

Wichtig:

- `lastShotAt` bleibt kompatibel.
- `debugStats.shots` bleibt korrekt.
- `telemetry.addShot(...)` bleibt korrekt.
- Double/Triple Shot behalten Homing und Zielverteilung.

Danach testen:

```powershell
npm.cmd run build
npm.cmd run test:mechanics
```

## Schritt 5: Treffer- und Schadenslogik extrahieren

In `CombatSystem` verschieben:

- `checkProjectileHits()`
- `hitEnemy(projectile, enemy)`
- `damageEnemy(enemy, damage, x, y)`

Wichtig:

- `projectile.hitEnemies`
- `projectile.pierceRemaining`
- `projectile.destroy()`
- `scene.killEnemy(enemy)`
- Hit-Feedback und Telemetry

Danach testen:

```powershell
npm.cmd run build
npm.cmd run test:mechanics
npm.cmd run test:smoke
```

## Schritt 6: Abschlusspruefung

- `GameScene.js` Dateigroesse vergleichen
- `rg` auf doppelte Combat-Methoden ausfuehren
- sicherstellen, dass aktive Upgrades weiter funktionieren:
  - Golden Egg
  - Molotov Egg
  - Lightning Comb
  - Rocket Egg
  - Void Nest
  - Laser Comb
  - Orbit Eggs
  - Support Chick

## Erwartetes Ergebnis

- `GameScene` wird kleiner und bleibt hauptsaechlich Orchestrator.
- Combat-Code sitzt in `CombatSystem`.
- Existing Tests bleiben gruen.
- Kein Balance-Run ohne explizite Freigabe.

## Naechster moeglicher Folgeschritt

Wenn `CombatSystem` stabil ist:

- `ProjectileLifecycleSystem` fuer Updates/Cleanup
- oder `EnemyAttackSystem` fuer Spitter/Fan/Boss-Angriffe
