# RoosterRage – Master-Rework-Plan für den Coding-Agenten

Repository: `https://github.com/emfau88/RoosterRage`

## Umsetzungsstand (2026-08-10)

| Phase | Status | Kernergebnis |
| --- | --- | --- |
| A – Baseline & Instrumentation | ✅ umgesetzt | Ausgangswerte, Telemetrie und reproduzierbare Gates dokumentiert |
| B – Weapon Progression | ✅ umgesetzt | R1–R4/EVO-Eskalation, Rank-FX und HUD-Kommunikation überarbeitet |
| C – Enemy Pressure | ✅ umgesetzt | Fernkampfanteil und Projectile-Dichte gesenkt, Bewegungsdruck gestärkt |
| D – Brood King | ✅ umgesetzt | geordnete Sequenzen, sichere Übergänge, maximal sechs Adds und Build-Matrix |
| E – Map Topology | ✅ umgesetzt | Open Yard und Vertical Run streamen recycelte Chunks; Coop Square bleibt geschlossen |
| F – Pickups & Chests | ✅ umgesetzt | Schadensstufen/Prop-Drops, drei Chest-Tiers, EVO-Prio und physische Royal Boss Chest |
| G – Meta Progression | ✅ umgesetzt | Körner, sechs Talentknoten, Rooster-Mastery, First Clears, v1→v2-Migration und Hub-Rework |
| H – Integration & Validation | ⏸ ausstehend | abschließende Matrix, Geräte- und Fremdtests |

### Geschätzter verbleibender Aufwand

Als eigentliche Masterplan-Phase bleibt nur **H mit rund 12 % des ursprünglichen Gesamtaufwands** offen. A–G sind umgesetzt. Weapon Mastery bleibt bewusst optional, bis reale Meta- und Reward-Tests einen Bedarf zeigen.

### Voraussichtlich noch benötigte Assets

- **Weapon/EVO Asset Bulk 1:** ✅ umgesetzt. Sunshot Array, Siegebreaker Shell, Tempest Crown, Solar Scramble, Phoenix Pan und Broodstorm besitzen je ein eigenes EVO-Icon, Kampfobjekt/Projektil und einen kurzen Impact-Effekt. Die Runtime-Größen sind auf 32–42 px für Projektile sowie 58–148 px sichtbaren Effekt-Durchmesser begrenzt. Die statischen Impacts sind als kurze 150–210-ms-Stufe bewusst kompakt; Phoenix/Broodstorm sind die ersten Kandidaten für spätere Frame-Animationen, falls Fremdtests die Bewegung vermissen.
- **Weapon/EVO Asset Bulk 2:** ✅ umgesetzt. Thunder Roost, Shell Halo, Singularity Nest, Dawn Prism (`evo-dawn-laser`) und Chick Squadron besitzen eigene EVO-Icons und mechanisch passende Kampfassets. Projektile bleiben 36–40 px, Companions 44 px, Treffer-FX 58–72 px/155–175 ms; die Singularity-Zone ist als einziges großes, dauerhaft rotierendes/pulsierendes Asset auf ca. 145–230 px begrenzt. Dawn Prisms drei Strahlen bleiben dynamisch gezeichnet, damit der Angriff lebendig und richtungsgenau bleibt.
- **Phase E:** ✅ abgeschlossen mit Farmboden, Farmstraße, Scheunen- und Brunnen-Landmark; vorhandene Kisten, Heuballen und Mauern werden modular wiederverwendet.
- **Phase F:** ✅ abgeschlossen. Magnet, Heal und Bomb bleiben als Welt-Pickups erhalten; Props besitzen zwei Schadensstufen und maximal drei budgetierte Drops. Elite-, Golden- und Royal-Chest sind über 59/65/72 px, Palette, Aura und animierte Siegel getrennt. Die Royal Chest liegt nach dem Boss physisch in der Arena und öffnet vier EVO-/Rank-priorisierte Choices.
- **Phase G:** ✅ abgeschlossen mit Körner-Währung, eigenem Körner-Icon sowie drei Rooster-Mastery-Badges; Talentzustände verwenden das bestehende klare Icon-System. Neue Rooster-Sprites waren nicht erforderlich.
- **Phase H:** zunächst keine fest eingeplanten neuen Gameplay-Assets; nur gezielte VFX-, UI- und Audio-Politur, falls Geräte- und externe Tests konkrete Lesbarkeitslücken zeigen.

Detailberichte: `docs/REWORK_BASELINE.md`, `docs/WEAPON_PROGRESSION_REWORK.md`, `docs/WEAPON_EVO_ASSET_BULK_1.md`, `docs/WEAPON_EVO_ASSET_BULK_2.md`, `docs/ENCOUNTER_PRESSURE_REWORK.md`, `docs/BOSS_SEQUENCE_REWORK.md`, `docs/MAP_REWORK.md`, `docs/META_REWORK.md`.

## Auftrag

Arbeite am **aktuellen Stand des Repositories** und entwickle RoosterRage gezielt von einem bereits funktionierenden Vertical Slice zu einem deutlich stärkeren, professionelleren Survivors-Like weiter.

Die zentrale Referenz ist dabei **nicht das heutige Live-Service-Monster Survivor.io mit all seinen Monetarisierungs- und Meta-Systemen**, sondern dessen besonders wirksame Grundprinzipien:

- sehr klarer Power-Growth innerhalb eines Runs,
- Waffen, deren Ränge **sichtbar und spielerisch** eskalieren,
- viele einfache Gegnerkörper statt permanentem Bullet-Hell,
- wenige, klar lesbare Sondergefahren,
- Bosskämpfe mit nachvollziehbaren Angriffsmustern und Recovery-Fenstern,
- Welt-Pickups als kleine strategische Entscheidungen,
- starke Reward-Momente,
- ein einfacher, motivierender Meta-Grind,
- klare Kommunikation von Fortschritt und EVO-Pfaden.

**Nicht kopieren:**
- keine 1:1-UI,
- keine Namen,
- keine Art Assets,
- keine konkreten Kapitel,
- keine Monetarisierungsmechaniken,
- keine Gacha-/Energy-/Ad-Struktur,
- keine direkte visuelle Nachahmung.

Das Ziel ist:

> **RoosterRage soll seine eigene Identität behalten, aber dieselben Designprinzipien besser ausnutzen: ein Hahn startet relativ überschaubar und endet als spektakuläre, bildschirmbeherrschende Kampfmaschine.**

---

# 0. Grundregel für diesen Rework

Bitte nicht einfach Feature nach Feature hinzufügen.

RoosterRage besitzt bereits genug Systeme:

- drei Rooster,
- drei Arenen,
- Challenges,
- normale Gegner,
- Support-/Summoner-Rollen,
- Elites,
- Boss,
- Pickups,
- Chests,
- aktive Waffen,
- Passives,
- EVOs,
- Meta-Unlocks,
- HUD,
- Audio,
- Run-Report.

Das Kernproblem ist jetzt **nicht Content-Mangel**, sondern:

1. Power-Eskalation ist noch zu wenig sichtbar.
2. Viele Upgrade-Ränge fühlen sich wie Zahlenänderungen an.
3. Gegnerdruck entsteht zu häufig durch Projektile statt durch Horde/Positionierung.
4. Boss Phase 3 stapelt zu viele Gefahren.
5. Karten erzeugen noch zu wenig Traversal-/Entdeckungsgefühl.
6. Drops sind zu systemisch vorhersehbar.
7. Meta-Progression motiviert noch nicht ausreichend zum Grinden.
8. UI zeigt viele Informationen, aber die Power-Journey könnte klarer verkauft werden.

Bitte jeden neuen Schritt daran messen.

---

# 1. Zuerst: aktuellen Stand erneut auditieren

Bevor Balance oder Content geändert wird:

## Prüfen

- aktuellen `master`
- `README.md`
- `ROADMAP.md`
- `src/data/upgradeDefinitions.js`
- `src/data/roosterDefinitions.js`
- `src/data/waveDefinitions.js`
- `src/data/arenaDefinitions.js`
- `src/data/challengeDefinitions.js`
- `src/systems/UpgradeSystem.js`
- `src/systems/LoadoutSystem.js`
- `src/systems/CombatSystem.js`
- `src/systems/ActiveAbilitySystem.js`
- `src/systems/EnemyAttackSystem.js`
- `src/systems/WaveSystem.js`
- `src/systems/SpawnDirector.js`
- `src/systems/PickupSystem.js`
- `src/systems/MetaProgressionSystem.js`
- `src/systems/RunStateSystem.js`
- `src/ui/HUD.js`
- alle Ability-Klassen unter `src/systems/abilities/`
- alle relevanten Projektile und FX
- vorhandene Tests
- vorhandene Telemetrie-/Balance-Gates

## Ziel des Audits

Vor Änderungen kurz dokumentieren:

- Welche aktiven Waffen existieren aktuell?
- Welche normalen Ränge haben sie?
- Welche Ränge verändern nur Werte?
- Welche Ränge verändern Verhalten?
- Welche EVOs verändern Verhalten?
- Welche Gegner können aktuell Projektile erzeugen?
- Welche Wellen erzeugen die höchste Projectile-Dichte?
- Wie viele Gefahren können im Worst Case gleichzeitig aktiv sein?
- Wie viele Adds kann der Boss gleichzeitig erzeugen?
- Wie funktionieren Heal/Bomb/Magnet aktuell?
- Wo und wann entstehen Chests?
- Welche Meta-Ressourcen existieren?
- Welche permanenten Power-Upgrades existieren?
- Wie werden Upgrade-Ränge und EVO-Rezepte im HUD kommuniziert?

Wenn der aktuelle Code vom unten beschriebenen Stand abweicht, **den aktuellen Code als Source of Truth verwenden** und diesen Plan entsprechend sinnvoll adaptieren.

---

# 2. Produktprinzipien

## Prinzip A – Power muss sichtbar wachsen

Ein Spieler muss nach 2–3 Upgrades **ohne HUD** erkennen können:

> „Meine Waffe ist deutlich weiter entwickelt.“

Nicht nur durch DPS.

Sondern durch:

- mehr Projektile,
- breitere Geometrie,
- zusätzliche Treffer,
- Split,
- Chain,
- Pierce,
- größere Zonen,
- zusätzliche Begleiter,
- stärkere Trails,
- neue Impact-FX,
- neue Formationen,
- neue Sekundäreffekte.

---

## Prinzip B – mindestens jeder zweite Waffen-Rang verändert die Form

Für aktive Waffen gilt künftig idealerweise:

- R1 = Grundfunktion
- R2 = erste sichtbare Eskalation
- R3 = neue Verhaltenskomponente
- R4 = starke Screen-Presence
- EVO = echte Transformation

Nicht:

- R1 48 Damage
- R2 62 Damage
- R3 76 Damage
- EVO anders

Sondern:

- R1 1 Rakete
- R2 größerer Blast + stärkere Trail
- R3 Cluster/Split
- R4 Doppel-/Stagger-Pattern
- EVO komplett neue Salve

---

## Prinzip C – der Spieler ist die Bullet-Hell, nicht die Gegner

Spät im Run soll der Bildschirm spektakulär werden.

Aber die spektakulären Projektile sollten primär vom **Spieler** kommen.

Gegner sollen überwiegend:

- Druck durch Körper,
- Formation,
- Geschwindigkeit,
- Einengung,
- Charge,
- Auren,
- Bomben-/Todeseffekte,
- wenige klare Fernkampfangriffe

erzeugen.

Zielwert:

> In normalen Situationen sollten ungefähr **75–85 % der sichtbaren Gegner keine dauerhaften Fernkampfprojektile erzeugen**.

---

## Prinzip D – Spezialgefahren sind Gewürz

Ein Spitter soll gefährlich sein, **weil wenige Spitter eine lesbare Gefahrenlinie erzeugen**.

Nicht weil 18 Stück den Bildschirm mit 50 Projektilen füllen.

---

## Prinzip E – Boss = Pattern + Recovery

Bosskämpfe sollen sich wie:

- erkennen,
- reagieren,
- Schaden machen,
- erneut erkennen

spielen.

Nicht wie permanentes Flüchten vor allen Systemen gleichzeitig.

---

## Prinzip F – Drops erzeugen Entscheidungen

Heal, Bomb, Magnet und Chests sollen:

- sichtbar in der Welt liegen,
- Positionierung beeinflussen,
- bewusst aufgehoben oder aufgehoben lassen werden können,
- kleine taktische Geschichten erzeugen.

---

## Prinzip G – Meta-Grind muss sichtbar etwas bringen

Nach jedem Run soll mindestens eines passieren:

- Ressource verdient,
- Mastery-Fortschritt,
- Unlock-Fortschritt,
- permanentes Upgrade,
- neue Build-Option,
- kosmetischer Fortschritt.

Aber ohne F2P-Gacha-Struktur.

---

# 3. Die zwölf Haupt-Reworks

---

# PRIORITÄT 1 – Alle aktiven Waffen auf echte Rank-Eskalation umbauen

## Ziel

Jede aktive Waffe bekommt idealerweise:

- vier normale Ränge
- danach EVO

Wenn ein System aus technischen oder Balancegründen bei drei normalen Rängen bleiben sollte, muss trotzdem gelten:

> **Jeder Rang braucht eine sichtbare oder spielerische Identität.**

## Anforderungen

Für jeden Rank prüfen:

- Anzahl Objekte
- Geometrie
- Radius
- Treffermuster
- Anzahl Ziele
- Laufzeit
- Sekundäreffekt
- Trail/Farbe/FX
- Sound-Gewicht

Nicht alles gleichzeitig erhöhen.

## Wichtig

Damage-Zahlen dürfen weiter skalieren.

Aber sie sind **nicht mehr der Hauptgrund**, warum ein neuer Rank interessant ist.

---

# PRIORITÄT 2 – Auch die drei Rooster-Startwaffen R1–R4 + EVO

Die Startwaffe ist der Angriff, den der Spieler während des gesamten Runs am häufigsten sieht.

Sie darf deshalb nicht praktisch als R1 feststehen und erst bei EVO transformiert werden.

## Barnyard Ace – Target Egg

### R1 – Target Egg
- aktueller Grundangriff
- ein präzises Homing-Ei
- saubere, leichte Trail

### R2 – Twin Lock
- leicht verbesserte Zielerfassung
- jeder zweite Angriff erhält eine sichtbare Doppel-Markierung oder einen kleinen zusätzlichen Split/Second Shot
- nicht zwingend einfach permanent Double Shot stapeln, wenn generisches Multi-Shot weiterhin existiert
- Ziel: sichtbar „präziser und technologischer“

### R3 – Deadeye Shell
- Crit-Treffer erhalten ein deutlich anderes Impact-FX
- Crit darf zusätzlich leicht piercen oder auf ein zweites Ziel springen
- Spieler erkennt den Rank über Impact-Verhalten

### R4 – Hunter Array
- Projektile erhalten merklich stärkere Trails
- verbesserte Zielwechsel-/Ricochet-Fähigkeit
- Salvenform sichtbar stärker
- hoher Crowd-Clear, ohne Artillery zu kopieren

### EVO – Sunshot Array
- aktuell vorhandene Identität beibehalten
- muss deutlich größer wirken als R4:
  - mehrere leuchtende Ziel-Eier
  - Pierce
  - Ricochet
  - goldene Trails
  - eigener EVO-Impact
  - klarer Burst bei Salvenstart

---

## Boombardier – Blast Shell

### R1 – Blast Shell
- aktueller schwerer Grundangriff
- langsameres schweres Ei
- kleine Splash-Zone

### R2 – Heavy Load
- Ei sichtbar größer
- stärkere Trail
- Splash-Ring klarer
- geringfügig größerer Radius

### R3 – Shrapnel Yolk
- Explosion erzeugt 3–4 sehr kurze kleine Splitter / Mini-Blasts
- kein permanentes neues Projektilchaos
- dient als sichtbare Formänderung

### R4 – Siege Load
- größere Granate
- deutlicherer Muzzle-/Launch-Effekt
- stärkere Explosion
- eventuell kurze zweite Druckwelle
- Ziel: das normale Primärgeschoss fühlt sich jetzt wirklich wie Artillery an

### EVO – Siegebreaker Shell
- vorhandene Doppelwelle/Pierce-Idee beibehalten
- visuell klar über R4:
  - massive Granate
  - gold-orange Trail
  - erste Explosion
  - expandierende zweite Druckwelle
  - kurzer Screen Shake
  - deutlich andere Silhouette

---

## Stormcrest – Storm Egg

### R1 – Storm Egg
- aktueller schneller elektrischer Schuss
- kleiner Chain

### R2 – Static Fork
- Chain trifft zuverlässiger ein zweites Ziel
- sichtbarer elektrischer Fork

### R3 – Arc Pair
- jeder Angriff erzeugt zwei leicht versetzte elektrische Impulse oder einen sichtbaren Doppel-Arc
- nicht bloß Damage erhöhen

### R4 – Storm Circuit
- deutlich größere Chain-Reichweite
- mehrere sichtbare Arc-Sprünge
- Projectile/Trail heller
- Treffer hinterlassen sehr kurzen elektrischen Afterimage

### EVO – Tempest Crown
- vorhandene Zwillings-/Multi-Chain-Identität beibehalten
- muss wie ein „elektrisches Netzwerk“ aussehen
- mehrere Ziele gleichzeitig
- violett/blauer Crown-Look
- stärkster elektrischer FX-Level im Spiel

---

# 4. Konkreter Rework der bestehenden aktiven Waffen

---

## Golden Egg

### R1
- ein großes Golden Egg
- mehrere Pierces
- längerer Cooldown

### R2
- deutlich größeres Projektil
- stärkerer goldener Trail
- breiterer Hit-Radius

### R3
- nach jedem zweiten/letzten Pierce kleiner Solar-Spark auf nahe Gegner
- sichtbar neue Sekundärkomponente

### R4
- zwei Golden Eggs leicht versetzt / kurze Doppel-Salve
- oder: ein Ei + Rückstoß-/Solar-Wave
- abhängig davon, was im aktuellen Spiel besser lesbar bleibt

### EVO – Solar Scramble
- vorhandene Golden-Egg/Fire-Egg-Kombination weiterentwickeln
- klarer Multi-Projectile-Solar-Burst
- starke gelb-orange Identität
- mehrere Eier in einer erkennbaren Formation
- nicht einfach nur „mehr Golden Eggs“

---

## Orbit Eggs

Orbit Eggs ist bereits strukturell gut geeignet.

### R1
- 1 Orbit Egg

### R2
- 2 Orbit Eggs
- größere Umlaufbahn

### R3
- 3 Orbit Eggs
- leichte Trail-Linie
- Treffer erzeugt kleines Shell-FX

### R4
- 4 Eggs oder alternierende innere/äußere Umlaufbahn
- deutlich stärkeres Rotationsbild
- kein unlesbarer Blob

### EVO – Shell Halo
- geschlossener Halo/mehrere Layer
- klar andere Formation
- eventuell pulsierende Außenwelle
- visuell wie echte Endform

---

## Molotov Egg

### R1
- 1 Brandzone

### R2
- größere Zone
- deutlich mehr sichtbare Flammen-/Glutpartikel

### R3
- beim Aufprall entstehen 2 kleine Nebenflammen
- oder Zone pulsiert in mehreren Damage-Ringen

### R4
- zweiter Molotov-Wurf in kurzer Verzögerung
- Fläche beginnt sich teilweise zu überlappen
- Screen Presence sichtbar größer

### EVO – Phoenix Pan
- zwei große Brandfelder / Feuerpfad / phoenixartige Flame-Arcs
- deutlich längere visuelle Präsenz
- eigenständige Farbe/FX
- nicht nur größerer Kreis

---

## Lightning Comb

### R1
- 3 Targets

### R2
- 4 Targets
- stärkere Beam-Stärke

### R3
- Chain kann einmal verzweigen
- kleine elektrische Burst-FX am letzten Ziel

### R4
- 6 Targets
- auffällige zentrale Entladung
- stärkere Chain-Animation

### EVO – Thunder Roost
- bis zu 8–10 Ziele
- große initiale Entladung
- danach verzweigte Chains
- stärkster einzelner „instant spectacle“-Moment im normalen Build

---

## Support Chick

Support Chick ist bereits einer der besten Pfade und sollte als Referenz dienen.

### R1
- 1 Chick
- einfacher Shot

### R2
- Doppel-Salve

### R3
- Slow / Debuff

### R4
- 2 Chicks

### ggf. R5 / Pre-EVO
- 3 Chicks
- schnelleres Feuer

### EVO – Chick Squadron
- 4 Chicks
- sichtbare Formation
- koordinierte Salven
- kurze Wing-Flap-/Formation-Bewegung
- nicht permanent gackern
- visuell klarer „Mini-Squadron“-Look

Wenn das aktuelle 5-Rank-System bereits gut funktioniert, nicht künstlich auf vier reduzieren. Hier zählt die Progression mehr als Einheitlichkeit.

---

## Rocket Egg

### R1
- 1 Rocket
- kleiner/mittlerer Blast

### R2
- stärkere Trail
- größerer Blast
- leichte Homing-Verbesserung

### R3
- Impact erzeugt 3 kurze Cluster-Blasts / Schrapnell-Explosionen
- sichtbare neue Mechanik

### R4
- zwei gestaffelte Rockets oder eine Rocket mit Secondary Blast
- Screen Presence klar höher

### EVO – Broodstorm Battery
- drei gestaffelte Rockets
- große Detonationen
- klarer Salvenrhythmus
- keine chaotische Dauerwand, sondern erkennbare Sequenz

---

## Void Nest

### R1
- 1 kleine Singularität

### R2
- größerer Pull-Radius
- sichtbar stärkerer Spiral-FX

### R3
- Singularität pulsiert
- Pull + Damage geschieht in sichtbaren Wellen

### R4
- zweite kurze Singularität oder stark verlängerte Zone
- deutlich größere Kontrolle

### EVO – Singularity Nest
- zwei große Singularitäten
- starke dunkle Spiral-/Ring-FX
- klare räumliche Kontrolle
- nicht zu dunkel, damit Gegner lesbar bleiben

---

## Laser Comb

### R1
- 1 schmaler Beam

### R2
- breiter
- stärkeres Impact-FX

### R3
- zusätzlicher kurzer Parallel- oder Side-Beam
- oder sichtbarer Sweep
- abhängig von technischer Lesbarkeit

### R4
- langer, deutlich breiter Hauptbeam
- kurze Nachentladung / zweite Linie
- starke Lichtspur

### EVO – Dawn Prism
- drei breite Beams
- klar definierte Geometrie
- gold/weißes Prism-FX
- hoher Screen-Wert
- Gegner-Telegraphs dürfen darunter nicht verschwinden

---

# 5. Generic Weapon Passives neu prüfen

Die folgenden Upgrades sind grundsätzlich sinnvoll:

- Faster Eggs
- Bigger Eggs
- Piercing Eggs
- Critical Yolk
- Ricochet Eggs
- Shell Shock
- Swift Shells
- Fire Eggs

Aber sie sollten nicht dazu führen, dass die Startwaffen nur über „Meta-Modifier“ wachsen und selbst keinen Rank-Pfad haben.

## Ziel

Generic Passives bleiben Build-Modifikatoren.

Startwaffe-Ranks definieren die eigentliche Klassenprogression.

## Beispiel

Ace Target Egg R3:
- Crit bekommt Ricochet

Critical Yolk:
- erhöht Crit-Chance

Ricochet Eggs:
- erhöht allgemeine Ricochet-Anzahl

Dadurch entsteht echte Synergie statt Redundanz.

---

# 6. PRIORITÄT 3 – Enemy Projectile Density massiv reduzieren

## Problem

RoosterRage soll sich stärker wie ein Horde-Survivor anfühlen und weniger wie ein Bullet-Hell-Arena-Spiel.

## Leitwert

Spät im Run:

- große Menge einfacher Gegner
- wenige gleichzeitig schießende Spezialgegner
- klare Prioritätsziele

## Zielwerte

Bitte messen und danach balancieren.

Richtwerte:

- normale Wave:
  - 75–85 % Non-Shooter
  - 10–20 % Sonderrollen
  - 5–10 % echte Ranged-Gefahr
- nicht mehr als ungefähr 8–12 normale feindliche Projektile gleichzeitig in durchschnittlichen Situationen
- sehr kurze Peaks dürfen höher sein
- Elite/Boss separat

Diese Zahlen sind **Designziele, keine hartcodierten Limits**, falls Tests bessere Werte zeigen.

---

## Wave-Rework

### Wave 1
- fast nur Fodder
- keine Projektile

### Wave 2
- Fodder + Runner
- keine Projektile

### Wave 3
- Fodder + Runner + wenige Brutes
- Elite Runner

### Wave 4
- erster Spitter
- nur sehr kleine Zahl
- Shooter als neue Information

### Wave 5
- wenige Fan-Spitter
- mehr Horde statt mehr Projektilmenge

### Wave 6
- Elite + Horde
- Spezialdruck, aber keine Projectile-Wand

### Wave 7
- Bomber prominent
- Fan-Spitter deutlich reduzieren
- Summoner 1–2 statt große Menge
- Bomber erzeugen Positionierungsdruck

### Wave 8
- wenige Spitter
- wenige Summoner
- viele Runner/Fodder
- Elite Spitter als Haupt-Fernkampfdruck

### Wave 9
- Brutes + Horde
- Fan-Spitter stark reduzieren
- Summoner stark reduzieren
- Elite Brute
- Ziel: „Royal Guard“ fühlt sich wie schwere Leibgarde an, nicht wie Kugelhagel

### Wave 10
- Boss

---

# 7. Abwechslung stärker aus Gegnerkörpern erzeugen

Bitte vorhandene Gegnerrollen behalten, aber die Unterschiede stärker über Bewegung vermitteln.

## Möglichkeiten

### Slime
- langsamer
- zahlreich
- Füllmasse

### Runner
- schnelle Linien
- flankierend
- kurze Bursts

### Brute
- groß
- blockiert
- hoher HP-Pool
- langsamer, klarer Druck

### Bomber
- nähert sich
- Tod erzeugt Explosion
- Spieler muss Kill-Position beachten

### Spitter
- wenige
- klare Linie
- leicht priorisierbar

### Fan Spitter
- selten
- Fläche statt Dauerfeuer

### Support
- keine Projektile
- Auraquelle
- Zielpriorität

### Summoner
- keine direkten Projektile
- klarer Telegraph
- Adds
- nur wenige gleichzeitig

## Zusätzlich prüfen

Abwechslung kann durch Spawnformationen kommen:

- Linie
- Ring
- Halbkreis
- Flanke links/rechts
- enge Horde
- langsame Wand
- Runner-Keil
- Brute-Vorhut
- Fodder hinter Spieler
- Elite mit Begleitgruppe

Damit kann viel Content erzeugt werden, ohne neue Gegnerart.

---

# 8. PRIORITÄT 4 – Brood King komplett neu balancieren

## Problem

Der Boss darf schwierig sein, aber aktuell können zu viele Systeme gleichzeitig aktiv werden.

## Neue Boss-Philosophie

Boss verwendet **Attack Sequences**.

Nicht:

- Fan feuert autonom
- Heavy feuert autonom
- Adds kommen gleichzeitig
- neue Shooter spawnen
- Bomber spawnen
- alles überlappt

Sondern:

> Telegraph → Angriff → kurze Recovery → nächster Angriff

---

## Phase 1 – Learn the King

### Muster
1. Fan Salvo
2. 0,8–1,1 s Recovery
3. kurze Bewegung/Chase
4. Heavy Fireball
5. 1,0–1,4 s Recovery

### Ziel
Spieler versteht:
- Fan
- Fireball
- Distanz

Keine Adds.

---

## Phase 2 – Royal Fury

Bei ca. 65 % HP.

### Übergang
- vorhandene Boss-Projektile entfernen
- Boss kurz invulnerable / animation
- großer Phase-Ring
- 0,8–1,2 s Atemraum
- Spawn weniger Adds

### Adds
z. B.:
- 6–8 Slimes
- oder 4 Runner

Nicht 12+ plus permanentem Feuer.

### Neues Pattern
- Fan wird etwas breiter
- oder Boss macht Charge
- aber nicht alles gleichzeitig

---

## Phase 3 – Last Hatch

Bei ca. 30–35 % HP.

### Übergang
wieder:
- Projectile Clear
- deutlicher Stinger
- kurze Pause

### Adds
maximal ungefähr 6–8 gleichzeitig.

Beispielsweise:
- 4 Runner
- 2 Spitter

**Keine fünf Bomber plus fünf Spitter plus acht Runner gleichzeitig.**

### Boss Pattern
Variante:

1. 7er Fan mit langem Telegraph
2. Recovery
3. Charge
4. Recovery
5. Heavy Fireball
6. Recovery
7. kurze Add Pulse
8. neuer Zyklus

---

## Boss HP

Nicht sofort radikal senken.

Erst Pattern vereinfachen.

Danach manuell messen.

Falls der Boss dann weiterhin für normale Builds zu zäh ist:

- HP in Richtung 9.000–10.000 testen
- oder Damage Window / Recovery vergrößern

## Boss-Zielwerte

Für durchschnittlich brauchbaren Build:

- 55–75 s Bossdauer
- erfolgreicher Spieler soll sichtbar Damage machen
- kein „ich renne 90 Sekunden nur weg“
- keine Phase soll mehr als 2 Hauptgefahren gleichzeitig verlangen

---

# 9. Boss-Build-Fairness

Nicht jede Waffe muss gleich gut gegen Boss sein.

Aber:

- mindestens 5–6 plausible Endbuilds müssen gewinnen können
- kein aktiver Skill darf vollständig nutzlos werden
- Crowd-Control-EVOs dürfen schwächer gegen Boss sein, sollten aber Adds stark kontrollieren
- Single-Target-Builds dürfen Boss deutlich schneller erledigen

Bitte Damage-Share und Boss-TTK im Run-Report nutzen.

---

# 10. PRIORITÄT 5 – Open Yard zu pseudo-unendlicher Farm machen

## Ziel

Open Yard soll sich nicht mehr wie eine kleine Arena anfühlen.

## Technische Richtung

Keine wirklich unendlich große Map notwendig.

Nutze:

- Chunk-Recycling
- Tile-/Ground-Repeating
- Landmark-Pools
- Props relativ zum Spieler nachladen
- alte Chunks recyceln

## Chunk-Inhalte

Beispiele:

- Feld
- Stall
- Heuballen
- kleine Scheune
- Zaun
- Traktor
- Futterkiste
- Brunnen
- Feldweg
- Hühnerstall
- Gemüsebeet
- Pfütze
- Holzstapel

Keine riesige Asset-Produktion erforderlich.

Ein kleines Set modularer Props reicht.

## Ziel

Spieler kann 1–2 Minuten in eine Richtung laufen, ohne auf harte Weltgrenze zu stoßen.

---

# 11. PRIORITÄT 6 – Vertical Run zu endloser vertikaler Farmstraße

## Topologie

- Welt bewegt/recycelt sich Nord/Süd
- Seiten bleiben begrenzt
- klare Korridoridentität
- Props/Blockaden erscheinen in wechselnden Mustern

## Vorteile

- sehr einfach technisch
- andere Waffenpräferenzen
- Pierce/Laser stärker
- Fluchtweg leicht lesbar
- guter Kontrast zur Open Farm

## Coop Square

Coop Square bleibt bewusst:

- klein
- abgeschlossen
- challenge-artig
- hohe Nahbereichsdichte

Damit hat RoosterRage drei wirklich unterschiedliche Map-Archetypen:

1. Open / pseudo-infinite
2. Linear / pseudo-infinite
3. Enclosed Arena

---

# 12. PRIORITÄT 7 – Drops aus Kill-Milestones lösen

## Aktuelles Design nicht komplett wegwerfen

Budgets sind gut.

Beispiel:

- max 3 Heal
- max 2 Bomb
- max 2 Magnet

Das verhindert Exploits.

## Rework

Die Budget-Entscheidung bleibt intern.

Aber die Welt entscheidet, **wo** die Items liegen.

### Quellen

- Futterkiste
- Eierkarton
- Heuballen
- kleine Supply Box
- Vogelscheuche
- Werkzeugkiste

## Spawnlogik

Beim Erzeugen eines neuen Chunks können Props Reward-Tokens besitzen.

Das Pickup-System zieht aus dem verbleibenden Run-Budget.

Dadurch:

- nicht exakt bei Kill 48
- Spieler entdeckt Item
- Item bleibt liegen
- Spieler kann zurückkehren

---

# 13. World Pickups

---

## Heal

- heilt z. B. 25 % Max HP
- bleibt liegen
- soll wertvoll genug sein, dass man ihn ggf. für später aufhebt

## Bomb

- screen-clear / starker AoE
- Normals sterben
- Elite/Boss begrenzter Schaden
- entfernt ggf. normale Enemy Projectiles
- spektakulärer Moment

## Magnet

Wichtigster Rework:

### Permanent Passive
`XP Magnet`
- erhöht Sammelradius

### World Magnet
- zieht sofort oder über sehr kurze Sequenz **alle relevanten XP-Orbs der aktuellen Umgebung** ein
- nicht bloß acht Sekunden Radiusbuff

Ziel:

> Spieler wartet absichtlich mit XP, holt Magnet, Bildschirm füllt sich mit fliegenden Orbs, mehrere Level-Ups folgen.

Das ist ein starker Reward-Moment.

---

# 14. PRIORITÄT 8 – Chests stärker staffeln

Aktuelle Elite-Chest ist bereits eine gute Basis.

## Neue Reward-Typen

### Standard Elite Chest
- 1 garantiert sinnvoller Rank-Up / EVO-Pfad

### Golden Chest – selten
- 2 Upgrade-Schritte
- oder 1 Upgrade + Bonus

### Royal Chest – Boss
- 2–3 Upgrade-Schritte
- priorisiert EVO
- wenn EVO verfügbar: sehr hohe Garantie
- eigener visueller Jackpot-Moment

Nicht zu oft.

## Grundregel

Chest soll die Build-Kurve **sprunghaft** verändern können.

Normale Level-Ups = stetiger Fortschritt.

Chest = Power Spike.

---

# 15. PRIORITÄT 9 – Meta-Grind hinzufügen

## Nicht Survivor.io kopieren

Kein:

- Equipment-Gacha
- fünf Währungen
- Energie
- Ads
- tägliche Pflichtsysteme

## Ziel

Eine kleine, elegante Webgame-Meta.

---

# 16. Eine Hauptressource: Körner

Arbeitstitel:

`Körner`

oder ein besser passender Name, falls UX/Theme etwas Besseres ergibt.

## Körner erhält man durch

- Wellenfortschritt
- Kills
- Elite
- Boss
- Challenge
- Victory Bonus
- eventuell First-Clear Bonus

Auch Niederlage gibt Fortschritt.

## Wichtig

Keine exponentielle Farm-Hölle.

Ein Spieler soll nach 1–3 Runs meistens eine Entscheidung treffen können.

---

# 17. Hennenhütten-Talentbaum

## Ziel

Kleine permanente Progression.

Etwa 12–15 Nodes für den ersten Vollstand.

## Beispiele

### Offensive
- +3 % Base Damage
- +3 % Attack Speed
- +5 % Crit Damage

### Defensive
- +5 Max HP
- +2 % Damage Reduction
- +5 % Heal Effect

### Utility
- +8 % XP Pickup Radius
- +1 Reroll pro Run
- leichte Chance auf bessere Chest
- +5 % Körner

## Grenzen

Keine gigantischen Werte.

Der Spieler soll durch Skill und Build gewinnen können.

Meta macht Runs:

- etwas leichter
- etwas flexibler
- motivierender

aber nicht trivial.

---

# 18. Rooster Mastery

Jeder Rooster bekommt eigenen Mastery-Level.

Beispiel Level 1–10.

## Fortschritt

Mastery-XP durch:

- Run mit diesem Rooster
- Wave Completion
- Elite
- Victory
- Challenge Completion

## Beispiel Rewards

### Lv 2
kleiner Startbonus

### Lv 3
alternative Start-Mutation / Upgradegewicht

### Lv 5
kleiner permanenter Klassenbonus

### Lv 7
neue Build-Option / alternative Synergie

### Lv 10
Skin / Prestige / kosmetischer Reward

Nicht jeder Level braucht Stats.

---

# 19. Weapon Mastery – erst zweite Stufe

Nicht sofort riesig bauen.

Nach Kern-Meta.

## Ziel

Waffen-Mastery soll **Build-Auswahl erweitern**, nicht nur Damage stapeln.

Beispiele:

`Rocket Egg Mastery 3`
- schaltet alternative R3-Option frei:
  - Cluster
  - oder Napalm Trail

`Lightning Mastery 3`
- alternative R3:
  - Fork
  - oder Overcharge

`Orbit Mastery`
- alternativer Orbit-Pfad

So entsteht langfristig Tiefe.

---

# 20. PRIORITÄT 10 – Hauptmenü von Statistik zu Progressions-Hub

Die Hennenhütte bleibt.

Aber erste Frage im Hub muss sein:

> **Was mache ich als Nächstes?**

Nicht:

> Wie viele Runs habe ich?

## Neue Hierarchie

### Oben
- ausgewählter Rooster
- Mastery-Level
- Körner
- aktueller permanent Upgrade-Fortschritt

### Hauptaktion
große Karte:

`NÄCHSTER RUN`

zeigt:
- Challenge
- Arena
- Difficulty/Modifikatoren
- erwartete Rewards

### Sekundär
- Rooster wechseln
- Talentbaum
- Mastery
- Challenges

### Tertiär
- Lexikon
- History
- Bestwerte
- Cosmetics
- Settings

Statistik bleibt, wird aber nicht Mittelpunkt.

---

# 21. PRIORITÄT 11 – Upgrade-UI als Power Journey

## Ingame Upgrade Card

Soll deutlich zeigen:

- Icon
- Name
- Rank
- Fortschritt
- qualitative Veränderung
- EVO-Rezept

## Beispiel

Nicht nur:

`Rocket Egg R3`
`+14 Damage, +12 Radius`

Sondern:

`ROCKET EGG ★★★`

**CLUSTER SHELL**
> Beim Einschlag entstehen 3 Mini-Explosionen.

Kleine Zahlen darunter:
- Damage +12 %
- Radius +8 %

---

## Rank-Darstellung

Nutze:

`★☆☆☆`
`★★☆☆`
`★★★☆`
`★★★★`
`EVO`

oder Pips, falls Sterne nicht zum Stil passen.

Aber Fortschritt muss mit einem Blick erkennbar sein.

---

## EVO-Kommunikation

Wenn Passive vorhanden:

`Rocket Egg ★★★★ + Bigger Eggs ★★★`

darunter:

`→ BROODSTORM BATTERY`

Wenn Passive fehlt:

`Benötigt Bigger Eggs`

Wenn Rank fehlt:

`Noch 1 Rank bis EVO`

Der Spieler soll nicht im Lexikon nachschlagen müssen.

Lexikon bleibt Bonus.

---

# 22. Loadout-HUD

Das aktuelle HUD ist grundsätzlich gut.

Nicht komplett neu bauen.

## Verbesserungen

Active Icons:

- Rank-Pips
- EVO-Rahmen
- Cooldown
- deutlich sichtbarer Slot

Passive Icons:

- kleiner
- Rank-Pips

Wenn EVO verfügbar:

- kurzer goldener Pulse am betroffenen Active Slot
- nicht permanent störend

---

# 23. PRIORITÄT 12 – Run-Struktur flüssiger machen

Aktuell zehn Waves.

Nicht zwangsläufig entfernen.

Aber spielerisch stärker als **kontinuierliche Pressure Timeline** behandeln.

## Ziel

Weniger:

`Wave 4 ist vorbei → komplette Pause → Wave 5`

Mehr:

`Druck ebbt kurz ab → neue Formation / neue Rolle → nächste Eskalation`

## Vorschlag

Interne Waves bleiben für:

- Balancing
- Telemetrie
- Progression
- Rewards

Aber visuell/spielerisch:

- kürzere Intermissions
- nicht immer kompletter Enemy Clear erforderlich
- Übergänge können sich überlappen
- nur Elite/Boss bekommt deutliche Encounter-Pause

## Alternative

Falls heutiges Clear-System gut funktioniert:
- nicht sofort umbauen
- zuerst Waffen/Gegner/Boss
- danach testen, ob Wave-Grenzen wirklich stören

Dieses Thema hat niedrigere Priorität als Combat.

---

# 24. Konkrete Umsetzungsphasen

Bitte **nicht alle zwölf Punkte in einem einzigen Monster-Commit** umsetzen.

Empfohlene Reihenfolge:

---

## PHASE A – Baseline & Instrumentation

**Status: ✅ umgesetzt.** Ausgangswerte für Kampf, Progression, Boss, Karten, Pickups, Performance und Produktionsbundle sind reproduzierbar dokumentiert. Bericht: `docs/REWORK_BASELINE.md`.

### Aufgaben

- ✅ aktuellen Stand auditieren
- ✅ bestehende Balance-Gates ausführen
- ✅ Projectile-Dichte messen
- ✅ Boss-TTK messen
- ✅ Damage Share messen
- ✅ Upgrade-Pick-Frequenz messen
- ✅ aktuelle Map-/Pickup-Daten dokumentieren

### Kein Gameplay-Rework

Nur Baseline.

### Output

`docs/REWORK_BASELINE.md`

---

## PHASE B – Weapon Progression Rework

**Status: ✅ umgesetzt.** Alle drei Startwaffen und acht aktive Waffen eskalieren über R1–R4 klarer; EVOs, Rank-FX, Beschreibungen, HUD-Pips und Rezepte wurden neu abgestimmt. Technische/codebasierte FX sind vollständig spielbar, finale individuelle Waffen-/EVO-Bitmapassets bleiben ein separater Produktionspass. Bericht: `docs/WEAPON_PROGRESSION_REWORK.md`.

### Aufgaben

- ✅ Startwaffen R1–R4
- ✅ aktive Waffen visuell eskalieren
- ✅ UpgradeDescriptions aktualisieren
- ✅ FX-Rank-Skalierung
- ✅ EVOs gegen neue R4-Versionen absetzen
- ✅ HUD Rank-Pips/EVO-Rezept verbessern

### Tests

- ✅ jede Waffe isoliert R1–R4 + EVO
- ✅ Screenshot-/Visual-Gate
- ✅ DPS sanity
- ✅ Mobile Lesbarkeit

### Output

`docs/WEAPON_PROGRESSION_REWORK.md`

---

## PHASE C – Enemy Pressure Rework

**Status: ✅ umgesetzt.** Fernkampfanteil in Wellen 4–9 auf 5–10 % begrenzt, normales Projectile-Budget auf 12 gesetzt und Druck zu Fodder/Runner/Brute, Formationen und Bewegung verschoben. Bericht: `docs/ENCOUNTER_PRESSURE_REWORK.md`.

### Aufgaben

- ✅ Fan-Spitter deutlich reduzieren
- ✅ Summoner reduzieren
- ✅ Projectile-Budget messen
- ✅ mehr Fodder/Runner/Brute
- ✅ Formationen nutzen
- ✅ Gefahr aus Bewegung statt Schüssen

### Tests

- ✅ Peak Projectiles
- ✅ Death Causes
- ✅ Average Movement
- ✅ Mobile Portrait
- ✅ 3 Rooster

### Output

`docs/ENCOUNTER_PRESSURE_REWORK.md`

---

## PHASE D – Brood King Rework

**Status: ✅ umgesetzt.** Abweichungen nach Messung: Boss-HP erst nach Sequenzumbau von 11.800 auf 10.000 gesenkt; Übergangsgruppen auf exakt sechs Adds begrenzt; Orbit, Void und Support Chick erhielten Boss-spezifische Skalierung, damit sechs unterschiedliche Endbuilds fair bleiben. Gemessen: 53,5–80,9 s TTK, alle sechs Builds siegreich, maximal Boss + sechs Adds. Vollständiger Bericht: `docs/BOSS_SEQUENCE_REWORK.md`.

### Aufgaben

- ✅ sequenzielle Angriffe
- ✅ Recovery Windows
- ✅ Projectile Clear bei Phasenwechsel
- ✅ Add-Anzahl senken
- ✅ Phase 3 vereinfachen
- ✅ HP danach neu testen

### Tests

- ✅ 6 plausible Builds
- ✅ 3 Rooster über die Build-/Archetyp-Gates
- ➖ 3 Arenen nicht separat nötig; der Boss nutzt aktuell dieselbe Kampfarena, Kartenregression folgt in E/H
- ✅ manueller sichtbarer Boss-Run
- ✅ Average-Bot-Matrix plus menschlicher Run

### Output

`docs/BOSS_SEQUENCE_REWORK.md`

---

## PHASE E – Map Topology Rework

**Status: ✅ umgesetzt; finaler Lesbarkeitspass am 14.08.2026.** Open Yard nutzt einen konstanten 5×5-Pool aus 700er-Chunks; Vertical Run einen 1×5-Pool aus 600er-Straßensegmenten mit festen Seiten. 131.072 Weltkoordinaten pro Achse erlauben mehr als zwei Minuten Lauf in jede vorgesehene Richtung. Harvest Yard und Feed Alley besitzen nun ruhige Kampfoberflächen ohne zufällige Chunk-Spiegelungen; Feed Alley's große Architektur liegt ausschließlich außerhalb der freien Lane. Coop Square blieb beim Korrekturpass unverändert geschlossen. Bericht und Vergleichsbilder: `docs/MAP_REWORK.md`, `docs/qa/map-readability-pass/`.

### Aufgaben

- ✅ pseudo-infinite Open Farm
- ✅ pseudo-infinite Vertical Road
- ✅ Coop Square enclosed erhalten
- ✅ konstantes Chunk-Recycling ohne Objektwachstum
- ✅ Scheunen- und Brunnen-Landmarks
- ✅ sichere Pickup-Platzierung
- ✅ Performance

### Tests

- ✅ echter 10-Minuten-Soak: 60 Zyklen, p95 16,7 ms, keine Drops
- ✅ keine Chunk-Lücken über 129 s äquivalente Richtungsdistanz
- ✅ keine Collider-Leaks
- ✅ keine unerreichbaren Pickups
- ✅ Desktop und Mobile Portrait manuell geprüft

### Output

`docs/MAP_REWORK.md`

---

## PHASE F – Pickup & Chest Rework

**Status: ✅ abgeschlossen am 11.08.2026.** XP-/Pickup-Pacing, Prop-Drops und
Chest-Tiers sind umgesetzt; Details stehen in `docs/REWARD_REWORK.md`.

### Aufgaben

- [x] zerstörbare World Props mit zwei Schadenszuständen
- [x] Run-Budgets für Heal, Bomb und Magnet beibehalten
- [x] budgetierte Drops aus Props (maximal drei pro Run/einer pro Wave)
- [x] World Magnet als zeitlich begrenztes XP Vacuum
- [x] Heal/Bomb bleiben sichtbar liegen und können bewusst eingesammelt werden
- [x] Kill-Meilensteine durch Wave-/Encounter-Pacing ersetzen
- [x] XP-Orbs verlustfrei bündeln und aktive Anzahl begrenzen
- [x] Elite-, Golden- und Royal-Chest als klare Tiers
- [x] physische Royal Boss Chest mit Vierer-Reward

### Tests

- [x] kein Pickup außerhalb erreichbarer Welt
- [x] Magnet sammelt korrekt
- [x] kein XP-Verlust bei Bündelung oder Mobile-/Desktop-Cap
- [x] Chest EVO-/Rank-Prio für alle Tiers
- [x] Bomb wirkt auf normale Gegner/Projektilräumung wie vorgesehen

### Output

Output: `docs/REWARD_REWORK.md`.

---

## PHASE G – Meta Progression

**Status: ✅ umgesetzt.** Körner werden pro Run, First Clear und Mastery-Meilenstein vergeben. Der Hub enthält einen persistenten, bewusst flach gedeckelten Talentbaum und individuelle Mastery-Anzeigen für alle drei Rooster. Alte v1-Saves werden nach v2 migriert; frischer Spieler, zehn Runs, Reset, Unlocks, beschädigte Daten und Legacy-Saves sind automatisiert abgedeckt. Details und Balancewerte: `docs/META_REWORK.md`.

### Aufgaben

- Körner
- Talentbaum
- Rooster Mastery
- First-clear Rewards
- persistente Datenmigration
- Hub-Rework

### Noch nicht zwingend

- Weapon Mastery nur wenn Kernsystem stabil

### Tests

- localStorage migration
- frischer Spieler
- 10 Runs
- Reset
- Unlocks
- alte Saves

### Output

`docs/META_REWORK.md`

---

## PHASE H – Final Integration & Validation

### Aufgaben

- vollständige Balance-Matrix
- manuelle Runs
- mobile portrait
- mobile landscape
- desktop
- audio mix
- UI
- performance
- difficulty
- second-run motivation

### Externe Tests

Wenn möglich mindestens:
- 10 unvorbereitete Tester

Messen:
- versteht Upgrade-Rank?
- versteht EVO?
- fühlt sich stärker?
- Projektilfrust?
- Boss fair?
- findet Drops?
- will zweites Spiel?

### Output

`docs/REWORK_VALIDATION.md`

---

# 25. Balance-Zielwerte

Diese Werte sind Richtwerte.

Nicht blind erfüllen.

---

## Run-Dauer

Für Web:

- etwa 7–9 Minuten weiterhin sinnvoll

Nicht auf 15 Minuten aufblasen, nur weil Survivor.io das tut.

---

## Upgrade-Kadenz

Ziel:

- frühe sichtbare Verbesserung innerhalb 20–30 s
- erste aktive Zweitwaffe spätestens ungefähr Minute 1
- erster deutlicher R3/R4-Power-Moment etwa Minute 2–3
- erste EVO realistisch Minute 4–6
- Endgame Build fühlt sich stark transformiert an

---

## Gegner

Early:
- niedrige Spezialdichte

Mid:
- 1–2 primäre Gefahrentypen

Late:
- max 2–3 echte Sondergefahren
- Rest Horde

---

## Projektile

Normaler Late-Game-Bildschirm soll nicht dauerhaft voll feindlicher Kugeln sein.

Besser:

- 50–80 Gegner
- davon 4–8 gefährliche Spezialgegner
- sichtbare, klare Projektile
- Spieler-FX dominiert Spektakel

---

## Boss

- 55–75 s Average
- Recovery Windows
- max 2 Hauptgefahren gleichzeitig
- Phase-Übergänge lesbar
- keine projectile soup

---

# 26. Visuelle Eskalationsregeln

## R1
sauber, klein, einfach.

## R2
etwa 15–25 % mehr visuelle Präsenz.

## R3
neue Mechanik.

## R4
deutlich „late-run“.

## EVO
neue Silhouette / Formation / Farb-/FX-Sprache.

## Wichtig

Nicht nur Scale hochdrehen.

Transformation kann sein:

- Anzahl
- Formation
- Trail
- FX
- Geometrie
- Sekundärburst
- Bewegungspfad

---

# 27. FX-Budget

Spektakulärer bedeutet nicht:

- zehnmal mehr Partikel,
- Screen Shake bei jedem Angriff,
- alles weiß blitzen.

## Priorität

1. klare Projectile-Silhouette
2. Trail
3. Impact
4. Anzahl/Form
5. leichte Partikel

Boss-Telegraphs müssen immer über Player-FX lesbar bleiben.

---

# 28. Mobile ist verbindlich

Alle neuen Effekte gegen:

- 720×1280 Portrait
- typische Landscape-Größe
- Desktop

testen.

Besonders:

- Laser
- Void
- Fire
- Orbit
- EVOs
- Boss Fan
- Drops
- Upgrade Modal

Keine EVO darf das Mobile-Gameplay unlesbar machen.

---

# 29. Performance

Pseudo-infinite Map und stärkere Weapon-FX dürfen vorhandene Performance nicht zerstören.

Nutze:

- Pools
- recycling
- kurze Lifetime
- Chunk pooling
- keine unendlichen Arrays
- keine DOM-Flut
- keine dauerhaften Offscreen-Objekte

Existing performance gates weiterverwenden.

---

# 30. Telemetrie erweitern

Für diesen Rework besonders sinnvoll:

## Weapon progression
- firstR2At
- firstR3At
- firstR4At
- firstEvoAt
- final ranks
- damage share

## Projectiles
- avgEnemyProjectiles
- peakEnemyProjectiles
- projectileHitsTaken
- projectileDeathShare

## Boss
- bossTime
- bossDamageTaken
- phaseDuration
- deathsPerPhase
- addsAlivePeak

## Drops
- pickupsSeen
- pickupsCollected
- pickupsLeftBehind
- magnetXpCollected
- bombKills

## Meta
- grainsEarned
- grainsSpent
- masteryProgress
- secondRunStarted

---

# 31. Manual Testing ist Pflicht

Die vorhandenen automatisierten Average-Bots sind wertvoll.

Aber sie können nicht beurteilen:

- fühlt sich Boss unfair an?
- ist Projectile-Dichte stressig?
- fühlt sich R3 spektakulär an?
- erkennt man EVO?
- macht Magnet Spaß?
- wirkt Open Farm wirklich größer?
- fühlt sich Grind motivierend an?

Nach Phase B, C, D, E und H jeweils mindestens ein echter manueller Run.

---

# 32. Was nicht gemacht werden soll

Bitte in diesem Rework **nicht** gleichzeitig:

- 20 neue Waffen
- 10 neue Gegner
- Online Accounts
- Cloud Saves
- Shop
- Echtgeld
- Battle Pass
- Daily Quests
- Energy
- Ads
- Gacha
- Multiplayer
- Story Campaign

Erst Kernspiel.

---

# 33. Erfolgskriterien

Der Rework ist erfolgreich, wenn ein externer Spieler nach einem Run ungefähr sagen würde:

> „Am Anfang hatte ich nur ein Ei. Später hatte ich mehrere komplett eskalierte Waffen, alles flog durch die Gegend und ich habe richtig gemerkt, wie mein Build wächst.“

und gleichzeitig:

> „Ich musste Gegnern und Bossangriffen ausweichen, aber ich hatte nicht das Gefühl, permanent in einem Bullet-Hell zu sein.“

und nach Niederlage:

> „Okay, ich habe trotzdem Körner/Mastery bekommen. Ich verbessere noch etwas und starte nochmal.“

---

# 34. Empfohlene erste konkrete Arbeitsanweisung

Wenn du diesen Plan jetzt ausführst, beginne **nicht mit Meta oder Maps**.

Beginne mit:

## Schritt 1
Baseline dokumentieren.

## Schritt 2
Weapon Progression Rework vollständig abschließen.

## Schritt 3
Projectile-/Enemy-Pressure-Rework.

## Schritt 4
Boss.

Erst wenn diese vier Schritte im realen Spiel besser sind:

- Maps
- Drops
- Chests
- Meta
- Hub

Denn:

> **Die stärkste wirtschaftliche und spielerische Verbesserung entsteht zuerst dadurch, dass ein einzelner Run spürbar besser wird.**

---

# 35. Entscheidungsfreiheit des Coding-Agenten

Dieser Plan ist eine **Produkt- und Designrichtung**, keine starre Implementierungsvorschrift.

Du darfst:

- konkrete Werte ändern,
- Rank-Effekte leicht anders lösen,
- technische Architektur refaktorieren,
- einzelne Vorschläge verwerfen,
- bessere Varianten bauen,

wenn du nach Analyse und realem Spieltest eine überzeugendere Lösung findest.

Aber bitte nicht die zentralen Ziele verwässern:

1. sichtbare Waffeneskalation
2. weniger Enemy Bullet-Hell
3. fairerer Boss
4. abwechslungsreichere Topologien
5. strategischere Drops
6. stärkere Reward-Spikes
7. motivierende, schlanke Meta-Progression
8. klareres Upgrade-Feedback

---

# 36. Abschlussbericht pro Phase

Nach jeder Phase kurz dokumentieren:

## Geändert
Was wurde tatsächlich umgesetzt?

## Bewusst nicht umgesetzt
Was aus dem Plan wurde verworfen und warum?

## Vorher/Nachher
Messwerte.

## Manuelles Ergebnis
Wie fühlte sich der Run an?

## Risiken
Was kann regressieren?

## Nächster Schritt
Nur der logisch nächste Rework.

---

# Kurzfassung für den Agenten

Wenn du nur eine Leitidee mitnimmst:

> **RoosterRage braucht nicht mehr Systeme. Es braucht eine deutlich stärkere Power-Kurve. Der Spieler soll visuell eskalieren, während die Gegenseite lesbarer und weniger projektil-lastig wird. Danach bekommt die Welt mehr Traversal, die Drops mehr Bedeutung und die Hennenhütte einen kleinen Grind-Loop.**

