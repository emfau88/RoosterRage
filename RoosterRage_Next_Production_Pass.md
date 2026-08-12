# RoosterRage – Next Production Pass
## Hauptmenü zuerst, danach Micro-Fodder & echtes Survivor-Hordegefühl

Repository:
https://github.com/emfau88/RoosterRage

## Umsetzungsstand – 12.08.2026

**Punkte/Phasen 1–6 umgesetzt und technisch abgenommen.** Der vollständige
Production Gate aus Phase 7 bleibt ein eigener späterer Pass.

**Aktueller Stand:** Hauptmenü, Horde-/XP-Pass, Enemy-Art-Pass und der bewusst
fokussierte Champion-Pass sind auf `master`. README, Desktop-/Mobile-Gates und
der frühere Analytics-Fehler sind auf diesem Stand grün.

- **Kamerarelative Zielerfassung: als isolierter Versuch umgesetzt.** Neue
  Erstziele liegen höchstens im sichtbaren Kamerafenster plus einer halben
  Bildschirmgröße Rand je Seite. Das passt sich an Desktop, Mobile-Zoom und
  Orientierung an; fliegende Projektile, lokale Ketten/Ricochets, Spawns und
  Schaden bleiben unverändert. Ein eigener Commit macht den Versuch separat
  rücknehmbar. Details: `docs/TARGET_ACQUISITION_GATE.md`.

- **Phase 1 – Hauptmenü: erledigt.** Default ist jetzt `Spielen` mit einem
  kompakten Rooster-Hero, Challenge/Arena-Block und dominantem `RUN STARTEN`.
  `Hähne`, `Training` und `Archiv` halten die vorhandenen Meta-Inhalte erreichbar.
  Fullscreen und Einstellungen bleiben separat in der Topbar. Desktop,
  390×844-Retina-Portrait und 844×390-Landscape sind geprüft; der Canvas behält
  auf Mobile den 2×-Backing-Store. Im Landscape nutzt das Hub-Panel die volle
  sichere Viewport-Höhe; CTA und Navigation bleiben ohne Scrollen sichtbar.
- **Phase 2 – Micro-Fodder: erledigt.** Neuer Gegner `Kornkrabbler`: 7 HP,
  2 Contact Damage, Speed 96, kleiner 12px-Body, keine HP-Bar, keine Fähigkeit,
  Aura oder eigene State-Machine. Er verwendet das bestehende Enemy-Pooling
  (Pool-Limit 170) und ein echtes 16-Frame-Sheet: je vier nicht-yoyo Frames für
  links, rechts, oben und unten. Die Richtung wird aus dem Bewegungsvektor
  gewählt; oben/unten sind eigene Vorder-/Rückansichten und keine Rotation.
- **Micro-Fodder-XP-Bremse: erledigt.** Kornkrabbler erhalten intern nur 20 %
  des jeweiligen Wave-/Segment-XP-Werts. Bruchteile werden deterministisch in
  einer Bank gesammelt und erst als ganze, räumlich weiterhin zusammengeführte
  XP-Drops freigegeben. Dadurch entsteht nicht ein Orb pro Micro-Kill.
- **Phase 3 – Horde Density: erledigt.** Spezialgegnerzahlen blieben unverändert;
  ausschließlich Kornkrabbler erhöhen die Masse. Desktop-Zielpeaks W1–W9:
  `28 / 42 / 52 / 62 / 76 / 90 / 105 / 120 / 140`. Mobile-Caps:
  `26 / 36 / 44 / 50 / 58 / 66 / 74 / 82 / 90`. Wave-Gesamtbudgets:
  `48 / 62 / 78 / 92 / 112 / 132 / 156 / 180 / 210`; W10 bleibt der Boss.
- **Phase 4 – XP + Pickups: erledigt.** Die Waves 1–9 besitzen feste
  XP-Budgets von `90 / 114 / 138 / 165 / 195 / 228 / 340 / 384 / 448`
  (gesamt 2.102 XP vor dem Boss), verteilt auf die tatsächlichen Segmente und
  Gegnerrollen. Dadurch bleibt die Levelgeschwindigkeit trotz der neuen
  Hordenmenge kontrolliert. Sichtbare XP-Orbs, Magnetzug, Pickup-Sound und
  Level-up-Feedback bleiben vollständig erhalten. Nahe Orbs bündeln sich; bei
  72 aktiven Orbs auf Desktop bzw. 48 auf Mobile wird weiterer Wert verlustfrei
  in vorhandene, sichtbar größere Orbs integriert. Heal, Magnet und Bomb sind
  nun an sieben definierte Wave-/Encounter-Momente statt an globale Killzahlen
  gekoppelt; Elite-Truhen und Pickup-Budgets bleiben unverändert.
- **Phase 5 – Enemy Animation Polish: erledigt.** Kornkrabbler, Runner, Brute,
  Brood Tender, Nest Caller, Gilded Talon/Stormclaw und Brood King besitzen echte
  4-Richtungs-Locomotion. Der Combat-Bulk ergänzt Spitter, Fan-Spitter, Bomber
  und Elite-Spitter. Der Slime bleibt bewusst beim richtungsneutralen Wobble;
  zustandsgebundene Angriffs-Sheets der Spezialgegner bleiben getrennt.
- **AOE Combat Polish: umgesetzt.** Void Nest und Laser besitzen längere,
  klar getrennte Präsentationsphasen. Molotov Egg nutzt ein neues Impact-/Loop-/
  Ausglüh-Sheet, echte Rangskalierung, gestaffelten Doppelwurf, begrenztes
  Vorhalte-Aiming und einen dreisekündigen animierten Burn-Status. Die globale
  Zielreichweite wurde in diesem Pass ausdrücklich nicht verändert. Details:
  `docs/AOE_COMBAT_POLISH.md`.
- **Messwerte:** 75, 110 und 150 aktive Kornkrabbler jeweils 16,7 ms p95 im
  automatisierten Desktop-Lastgate, keine Enemy-Pool-Drops. Das bestehende
  390×844-Pressure-Gate für Wave 7 besteht mit allen drei Hähnen; Peak der
  gegnerischen Projektile bleibt 12. Build, Asset-Manifest, Mechanik, Pacing,
  Smoke, Arena/Pickups, Audio/Settings und Meta/Challenges sind grün. Der
  XP-Werterhalt und beide Orb-Caps besitzen eigene Browser-Regressionstests.
- **QA-Bilder:** Menü-Nachherbilder liegen unter
  `docs/qa/next-production-pass/` für Desktop, Portrait und Landscape.

**Noch offen:** das vollständige Multi-Seed-/Real-Run-Production-Gate aus
Phase 7. Späte echte Runs können noch Feintuning bei
Contact-Druck oder Wave-Dauer nahelegen; deshalb sind die Peaks Messkorridore.

## Rolle

Arbeite als erfahrener Gameplay-/UI-Engineer und Game-Designer an einem bestehenden Phaser/Vite-JavaScript-Spiel.

Wichtig: Dies ist **kein Neustart** und kein Auftrag, funktionierende Systeme großflächig umzubauen. Der aktuelle Stand hat bereits mehrere starke Reworks erhalten. Ziel dieses Passes ist, die größten noch sichtbaren Produktprobleme zu lösen, ohne die inzwischen funktionierenden Kernsysteme wieder zu destabilisieren.

---

# 0. ZUERST: aktuellen Master vollständig prüfen

Bevor du Code änderst:

1. aktuellen `master` auschecken / aktualisieren;
2. relevante Dateien tatsächlich lesen;
3. Spiel lokal bauen und starten;
4. Hauptmenü/Hennenhütte auf Desktop und Mobile ansehen;
5. mindestens einen normalen Run bis in mittlere Waves spielen;
6. aktuelle Gegnerdichte, Spawn-System, XP, Pickups, Animationen und Performance prüfen;
7. vorhandene Tests/Gates verstehen.

Nutze **den tatsächlich aktuellen Repository-Stand als Source of Truth**.
Wenn Werte inzwischen geändert wurden, passe diesen Plan an den echten aktuellen Stand an, behalte aber die hier definierte Produktabsicht bei.

Vor größeren Änderungen kurz dokumentieren:

- Was ist aktuell schon gut?
- Was ist tatsächlich das Problem?
- Welche Dateien/Systeme müssen dafür geändert werden?
- Was soll ausdrücklich unangetastet bleiben?

---

# 1. Oberste Priorität: Hauptmenü / „Hennenhütte“ neu ordnen

## Problem

Das aktuelle Hauptmenü enthält bereits viele gute und optisch brauchbare Elemente:

- Rooster-Portraits;
- Mastery;
- Körner;
- Challenges;
- Talentnest;
- Stats;
- Bestwerte;
- Run-History;
- Gegner-Lexikon;
- EVO-Rezepte;
- Cosmetics;
- Settings.

Das Problem ist **nicht**, dass zu wenig vorhanden ist.

Das Problem ist:

- falsche Informationshierarchie;
- zu viele Systeme gleichzeitig sichtbar;
- der wichtigste Call-to-Action „Run starten“ dominiert nicht;
- Talentnest/Meta steht zu prominent;
- der Screen wirkt teilweise wie ein Entwickler-/Management-Dashboard statt wie ein fertiges Spielmenü;
- auf Mobile ist die Menge an Information besonders kritisch.

## Ziel

Das Menü soll:

- optisch hochwertig bleiben;
- bestehende gute Art/Portraits/Badges weiterverwenden;
- aufgeräumter und klarer werden;
- innerhalb weniger Sekunden verständlich sein;
- den nächsten Run klar in den Mittelpunkt stellen;
- trotzdem alle bestehenden Meta-Systeme zugänglich halten.

**Keine sterile Standard-UI bauen.**
Die Hennenhütte soll weiterhin Charakter haben und wie ein echter, bewusst gestalteter Game-Hub aussehen.

---

## 1.1 Empfohlene Informationsarchitektur

Default-Screen = **Spielen**

### Topbar

Zeige kompakt:

- `ROOSTER RAGE`
- aktuelle Körner
- Settings-Button
- optional kleines Profil-/Mastery-Signal

Keine langen Stats in die Topbar pressen.

---

### Hero-Bereich

Groß und visuell attraktiv:

- aktuell ausgewählter Rooster;
- großes Portrait;
- Name;
- Rolle / kurzer Spielstil;
- Mastery-Level + kompakter Fortschritt;
- kleine Rooster-Wechselmöglichkeit.

Nicht drei riesige Rooster-Karten permanent nebeneinander als primäre Menüstruktur anzeigen, wenn das den Screen überlädt.

Rooster-Auswahl kann über:

- horizontale Cards;
- Carousel;
- Tabs;
- oder eigenen Unterbereich

gelöst werden.

---

### Zentraler Run-Block

Der wichtigste Bereich des gesamten Screens.

Soll ungefähr vermitteln:

**OPEN YARD**

**STANDARD RUN**

beste bisherige Leistung
mögliche First-Clear-Belohnung / Challenge-Hinweis

und einen klaren großen Button:

**RUN STARTEN**

Der Startbutton muss visuell die stärkste Interaktion sein.

Challenge-/Arena-Auswahl darf in diesem Bereich kompakt wechselbar sein.

---

## 1.2 Navigation

Empfohlene Hauptbereiche:

### Spielen
- aktueller Rooster
- aktueller Run / Challenge
- Arena
- Startbutton
- relevante First-Clear-Info

### Hähne
- alle Rooster
- Stats
- Mastery
- Cosmetics
- Unlockbedingungen

### Training
- Talentnest
- Körner
- Talentfortschritt

### Archiv
- Bestwerte
- letzte Runs
- Gegner-Lexikon
- EVO-Rezepte

Settings bleibt separat.

Auf Mobile darf dies als Bottom-Navigation, kompakte Tab-Bar oder vergleichbare klare Navigation umgesetzt werden.

---

## 1.3 Bestehende Elemente NICHT wegwerfen

Wenn aktuelle UI-Elemente visuell gut sind:

- wiederverwenden;
- neu gruppieren;
- verkleinern;
- in Unterbereiche verschieben;
- besser gewichten.

Nicht alles neu zeichnen, nur weil die Hierarchie geändert wird.

Insbesondere bestehende:

- Rooster-Portraits;
- Mastery-Badges;
- Körner-Icon;
- Upgrade-/Talent-Icons;
- Challenge-Cards;
- bestehende Audio-UI-Feedbacks

sollen sinnvoll weiterverwendet werden.

---

## 1.4 UX-Anforderungen

Ein neuer Spieler soll ohne Erklärung sofort erkennen:

1. welchen Hahn er spielt;
2. welche Challenge / Arena ausgewählt ist;
3. was er als Nächstes tun soll;
4. wie er einen Run startet.

Meta-Systeme sollen sichtbar bleiben, aber nicht den Start eines Runs blockieren.

---

## 1.5 Responsive Anforderungen

Prüfen auf mindestens:

- Desktop 960×540;
- Mobile Portrait 390×844;
- Mobile Landscape 844×390.

Kein:

- abgeschnittener Startbutton;
- horizontales Scroll-Chaos;
- winziger Text;
- unnötige Scrollstrecke bis zum Run-Start;
- überlappende Cards;
- unlesbare Talent-/Rooster-Infos.

---

## 1.6 Menu Acceptance Criteria

Der Menü-Pass ist erst fertig, wenn:

- „Run starten“ auf jedem Ziel-Viewport sofort sichtbar oder maximal eine sehr kleine natürliche Bewegung entfernt ist;
- der aktuelle Rooster visuell klar ist;
- Challenge-/Arena-Status klar ist;
- Talentnest nicht mehr den Default-Screen dominiert;
- Archivelemente nicht permanent den Hauptscreen überladen;
- alle bisherigen Funktionen weiterhin erreichbar sind;
- bestehende Saves/Mastery/Körner/Unlocks funktionieren;
- keine Meta-Funktion verloren geht;
- UI-Sounds weiter funktionieren;
- keine Browser-/Runtimefehler auftreten.

Erstelle Vorher-/Nachher-Screenshots.

---

# 2. Zweite Priorität: hochwertiges, aber simples Micro-Fodder

## Problem

RoosterRage besitzt inzwischen starke Waffen, R1–R4-Pfade und EVOs.

Die Waffen sehen und fühlen sich nach Massenschlacht an, aber aktuell bekommen sie zu wenig schwache Körper zum Vernichten.

Die bisherigen Waves besitzen zwar Spezialgegner und gute Rollen, aber das „Survivor-Massakergefühl“ fehlt.

Wir wollen NICHT einfach alle bisherigen Gegner vervierfachen.

Das würde:

- Contact Damage unfair erhöhen;
- XP explodieren lassen;
- Spezialgegner unlesbar machen;
- Performance unnötig belasten.

---

## 2.1 Neue Gegnerklasse: Micro-Fodder

Implementiere mindestens **einen echten Micro-Fodder-Typ**.

Arbeitstitel darf passend zum RoosterRage-Setting gewählt werden, z. B.:

- Broodling
- Grain Mite
- Kornkrabbler
- Hatchling

Der endgültige Name darf humorvoll sein, aber nicht albern wirken.

---

## 2.2 Gameplay-Eigenschaften

Ziel:

- extrem niedrige HP;
- niedriger Contact Damage;
- kleine Kollisionsgröße;
- sehr billig zu simulieren;
- erscheint in Gruppen;
- stirbt schnell;
- erzeugt visuell „Masse“;
- liefert Waffen viele Ziele;
- keine komplexe KI;
- keine Fernkampfattacke;
- keine Aura;
- keine komplizierten State-Machines.

Startwerte als Tuning-Vorschlag:

- HP: ca. 6–10
- Contact Damage: ca. 1–2
- Speed: moderat, nicht schneller als Runner
- keine HP-Bar
- kleine XP-Auszahlung oder gebündelte XP

Diese Werte sind **nicht blind zu übernehmen**. Testen und anhand des echten Spiels justieren.

---

# 2.3 Animation: sichtbar hochwertiger als aktuelle Fodder-Lösung

Dieser Gegner ist technisch simpel, soll aber **nicht billig aussehen**.

Wichtig:

Aktuelle Gegneranimationen bestehen teilweise aus sehr kurzen 3-Frame-Yoyo-Loops. Das erzeugt leicht den Eindruck eines ausgeschnittenen Bildes, das nur hin- und herwackelt.

Für Micro-Fodder mindestens:

- echte 4-Frame-Locomotion;
- eindeutige Bewegungsrichtung / Bewegungsenergie;
- keine reine Yoyo-Skalierungsanimation;
- gutes Timing;
- saubere Transparenz;
- klare Silhouette;
- lesbar bei kleiner Darstellung.

Optional:

- sehr kurzer Squash/Pop beim Tod;
- kann teilweise procedural/tween-basiert sein, wenn dadurch keine große Assetproduktion nötig ist.

Das Ziel ist **hochwertige Wahrnehmung bei niedriger technischer Komplexität**.

Kein 20-Frame-Animationsmonster bauen.

---

## 2.4 Performance

Micro-Fodder muss für hohe Stückzahlen optimiert sein.

Prüfe:

- Object Pooling;
- Physics-Body-Kosten;
- unnötige Tweens;
- Partikelkosten;
- HP-Bar-Verzicht;
- Death-FX-Budget;
- XP-Orb-Anzahl;
- Draw Calls / Sprite-Anzahl soweit relevant.

Nicht pro Micro-Fodder:

- komplexe Aura;
- teure Partikelketten;
- eigene langen Audio-Loops;
- komplizierte Pathfinding-Logik.

---

# 3. Horde Density Pass

## Grundregel

Mehr Gegner sollen vor allem durch **mehr schwache Gegner** entstehen.

Die Zahl gefährlicher Spezialgegner soll zunächst weitgehend stabil bleiben.

Nicht das bereits gelöste Projectile-Problem wieder zurückbringen.

---

## 3.1 Ziel-Peaks als Testkorridor

Aktueller Stand lag zuletzt ungefähr bei:

- W1 Peak 18
- W2 Peak 24
- W3 Peak 28
- W4 Peak 32
- W5 Peak 38
- W6 Peak 45
- W7 Peak 50
- W8 Peak 58
- W9 Peak 65

Ziel für einen neuen Testkorridor:

- W1: 25–30
- W2: 35–45
- W3: 45–55
- W4: 55–65
- W5: 70–80
- W6: 80–95
- W7: 95–110
- W8: 110–125
- W9: 130–150

Diese Peaks sind **Messziele**, keine Pflichtwerte.

Wenn Performance oder Lesbarkeit früher kippt, sauber dokumentieren und niedrigeren Sweet Spot wählen.

---

## 3.2 Nicht alle Waves gleich aufblasen

Die Waves sollen weiterhin eigene Identität besitzen.

Beispiel:

- W1: erstes schwaches Gewusel;
- W2: kleine Runner-Linien zwischen Fodder;
- W3: erste Brutes/Elite vor dichterem Hintergrund;
- W4: einzelne Spitter als klar erkennbare Priority Targets;
- W5: mehr Körperdruck + wenige Fan-Spitter;
- W6: Elite eingebettet in Masse;
- W7: Bomber als Positionsgefahr innerhalb der Horde;
- W8: gemischter Druck;
- W9: echter Vor-Boss-Climax mit deutlich größter Körpermasse.

Wave 9 soll sich wie ein **Schlachtfeld** anfühlen, nicht wie eine etwas größere Arena-Wave.

---

# 4. Spezialgegner nicht wieder überladen

Das aktuelle Rework hat die Fernkampfquote bewusst reduziert und ein normales Projectile-Budget eingeführt.

Das soll grundsätzlich erhalten bleiben.

Nicht:

- wieder 15–25 % Shooter/Summoner in jede Late-Wave packen;
- Projectile-Wände erzeugen;
- jeden neuen Gegnertyp mit Fernkampf versehen.

Die Gefahren sollen aus unterschiedlichen Quellen kommen:

- Körpermasse;
- Bewegung;
- Bomber;
- Brutes;
- wenige Shooter;
- Supports;
- Summoner;
- Elites;
- später einzelne neue besondere Gegner.

---

# 5. XP-System von Gegnerzahl entkoppeln

Mehr Micro-Fodder darf nicht automatisch 3× so viele Level-Ups erzeugen.

Aktuell ist XP stark an Enemy Kills gekoppelt.

Das muss für Horde-Skalierung robuster werden.

Mögliche Lösungen:

### Variante A – fractional/internal XP
Micro-Fodder zählt intern z. B. nur 0,2–0,3 XP.

### Variante B – gebündelte Drops
Nicht jeder Micro-Gegner erzeugt einen Orb. Mehrere Kills werden in einen XP-Drop gebündelt.

### Variante C – Wave-XP-Budget
Jede Wave besitzt ein ungefähres XP-Budget, unabhängig von der exakten Anzahl schwacher Gegner.

Empfehlung:

**Wave-/Segment-XP-Budget oder Drop-Bündelung**, damit:

- Kill-Fantasy;
- Gegnerzahl;
- Orb-Anzahl;
- Levelgeschwindigkeit

separat steuerbar werden.

---

## 5.1 XP-Orb-Performance

Bei 100–150 Gegnern gleichzeitig darf nicht aus jedem Kill ein dauerhaft liegenbleibender Physik-/Sprite-Orb werden, wenn dadurch Performance oder Lesbarkeit leidet.

Prüfen:

- Orb-Pooling;
- Merge/Bündelung;
- maximale aktive Orb-Zahl;
- größere Orbs mit höherem Wert;
- Magnet-Verhalten.

---

# 6. Pickup-System an neue Killzahlen anpassen

Die bisherigen festen Kill-Milestones dürfen nicht unverändert bleiben, wenn die Killrate massiv steigt.

Sonst erscheinen Heal/Magnet/Bomb viel zu früh.

Daher:

- Kill-Milestones prüfen;
- besser an Wave-/Zeit-/Encounter-Pacing koppeln;
- nicht einfach alle alten Zahlen ×3 rechnen;
- sicherstellen, dass Pickups strategische Momente bleiben.

## Magnet

Der aktuelle zeitlich begrenzte Magnet-Effekt kann bestehen, aber prüfen:

- ob er bei größeren Maps/Horden sinnvoll genug ist;
- ob ein seltener globaler „Vacuum“-Moment mehr Befriedigung bringt;
- ob Orb-Bündelung bereits genug löst.

Keine unnötige Komplexisierung.

---

# 7. Enemy-Art-Pass – nach Micro-Fodder

Micro-Fodder zuerst.

Danach die bestehenden Gegner schrittweise verbessern.

## Aktuelles Qualitätsproblem

Einige Enemy-Sheets funktionieren technisch, wirken aber durch:

- nur 3 Frames;
- permanente Yoyo-Loops;
- Attack-Animation als Dauer-Idle;
- wiederverwendete Spitter-Basis;
- Tint-Varianten

noch prototypisch.

Besonders Support und Summoner sollen langfristig **eigene visuelle Identität** bekommen.

---

## 7.1 Zielstruktur

### Swarm-Gegner
- Micro-Fodder
- Slime
- Runner
- optional später 1 weitere rein visuelle Swarm-Spezies

Anforderung:
- einfache echte Locomotion;
- keine HP-Bar;
- klare Silhouetten.

### Specials
- Brute
- Bomber
- Spitter
- Fan Spitter
- Support
- Summoner

Anforderung:
- Locomotion getrennt von Attack;
- Attack nur beim tatsächlichen Angriff;
- klare telegraphierte Funktion.

### Elites/Boss
- eigenes hochwertigeres Animationsset;
- eigene Attack States;
- keine bloße Tint-Variante.

---

# 7.2 State-driven Animation

Beispiel:

Brute:
- Walk Loop
- Stomp Windup
- Stomp Impact
- Recovery

Spitter:
- Move/Idle
- Windup
- Shot/Recoil

Bomber:
- Move
- Arming
- Explosion

Support:
- Move
- Aura Pulse

Summoner:
- Move
- Summon Charge
- Summon Resolve

Nicht jede Animation braucht viele Frames.

4 Frames Movement + 3–5 Frames Spezialaktion können bereits reichen.

---

# 8. Neue besondere Gegner – nur sehr gezielt

Erst NACH:

- Menü;
- Micro-Fodder;
- Horde-Density;
- XP-Anpassung.

Dann maximal 1–2 neue Gameplay-Specials testen.

Empfohlen:

## Charger

- größerer Körper;
- klare Charge-Linie;
- kurze Telegraph-Zeit;
- gerade Dash-Bewegung;
- keine Projektile;
- vorhandene Dash-Technik der Elite Runner möglichst wiederverwenden.

## Burrower / Leaper

- verschwindet / springt kurz;
- Landeposition wird deutlich markiert;
- zwingt zu Bewegung;
- kein Projectile-Spam.

Optional später:

## Shielded Enemy

- frontaler Schutz;
- Seite/Rücken verwundbar;
- nur einzelne Exemplare;
- darf Auto-Aim nicht unfair frustrieren.

Keine neue Gegnergattung hinzufügen, nur um mehr Content zu haben.

---

# 9. Champion-Schicht zwischen Normal und Elite

Prüfe nach dem Horde-Pass eine einfache Champion-Variante.

Ziel:

> In der Masse befindet sich gelegentlich ein sichtbar wichtiger Gegner.

Champion:

- 2–2,5× größer;
- 4–6× HP;
- klarer Marker;
- eine bekannte Fähigkeit oder einfache Modifikation;
- bessere XP;
- keine komplette Elite-Chest;
- kein minutenlanger Kampf.

Champion-System möglichst aus bestehenden Gegnerdefinitionen ableiten, nicht für jeden Champion neue AI schreiben.

---

# 10. HP-Bars reduzieren

Bei hohen Gegnerzahlen:

### Keine HP-Bar:
- Micro-Fodder
- Slime
- Runner

### HP-Bar:
- Brute
- Support
- Summoner
- Champion
- ggf. besonders relevante Specials

### Deutlich:
- Elite
- Boss

Ziel:
weniger visueller Müll und stärkere Zielhierarchie.

---

# 11. Schwierigkeit professionell messen

Nicht nur testen:

> „Gewonnen / verloren“

sondern mindestens erfassen:

pro Wave:

- authored enemy count;
- Peak aktive Gegner;
- Peak Micro-Fodder;
- Peak Specials;
- Kills/sec;
- durchschnittliche Kills/sec;
- Damage taken;
- Contact Damage;
- Projectile Damage;
- Hazard Damage;
- Zeit unter 30 % HP;
- maximale gleichzeitig lebende Special Targets;
- durchschnittliche Fodder-TTK;
- Level-Ups pro Minute;
- aktive XP-Orbs;
- Frame p95/p99;
- Death Cause.

Zusätzlich bei manuellen Runs subjektiv notieren:

- „Hordegefühl“ 1–5;
- „Massakergefühl“ 1–5;
- „Spezialgegner erkennbar“ ja/nein;
- „Bild zu chaotisch“ ja/nein;
- „zu leer“ ja/nein;
- „Kontakt unfair“ ja/nein.

---

# 12. Performance-Gates

Der neue Horde-Pass darf Mobile nicht zerstören.

Automatisierte Stresstests mindestens:

- 75 Gegner;
- 110 Gegner;
- 150 Gegner;

plus realistische Spielerprojektile/FX.

Viewport:

- 960×540;
- 390×844;
- 844×390.

Prüfen:

- p95 Frame Time;
- p99;
- Garbage/Pool Drops soweit messbar;
- Physics-Auslastung;
- aktive Gegner;
- aktive Projektile;
- aktive XP-Orbs;
- aktive FX.

Wenn 150 nicht sauber tragbar sind:

- nicht tricksen;
- Sweet Spot finden;
- dokumentieren;
- Fodder-Aufwand reduzieren.

---

# 13. Systeme, die NICHT grundlos wieder aufgerissen werden sollen

Folgende Bereiche wurden bereits sinnvoll reworked und sollen nur bei belegtem Problem verändert werden:

- R1–R4 Startwaffen;
- EVO-System;
- normale Projectile-Scheduler/Budget-Logik;
- Boss-Sequenzen;
- Boss-Phasen;
- Open-Yard-Streaming;
- Vertical-Run-Streaming;
- Meta-Save;
- Mastery;
- Körnerwirtschaft;
- bestehende Challenge-Unlocks.

Kein „Clean Architecture“-Rewrite ohne messbaren Produktnutzen.

---

# 14. Reihenfolge der Umsetzung

Unbedingt in dieser Reihenfolge arbeiten:

## Phase 1 – Hauptmenü
**Status: erledigt.**
- [x] prüfen;
- [x] neue Hierarchie;
- [x] UI implementieren;
- [x] responsive testen;
- [x] Screenshots;
- [x] Regressionstests.

## Phase 2 – Micro-Fodder
**Status: erledigt.**
- [x] Design;
- [x] Asset/Animation (16 Frames, vier Richtungen);
- [x] Entity-Konfiguration;
- [x] Pooling;
- [x] Spawnintegration;
- [x] Death/gebündelte Fractional-XP-Ausgabe;
- [x] Performance-Test.

## Phase 3 – Horde Density
**Status: erledigt; Real-Run-Feintuning bleibt Teil von Phase 7.**
- [x] Wave-Budgets;
- [x] Peak-Ziele mit separaten Mobile-Caps;
- [x] Fodder/Special-Verhältnis;
- [x] automatisierte Balance-, Pressure- und Lastgates.

## Phase 4 – XP + Pickups
**Status: erledigt.**
- [x] feste Wave-/Segment-XP-Budgets und Micro-Fodder-Gewichtung;
- [x] verlustfreie Orb-Bündelung mit Desktop-/Mobile-Caps;
- [x] wertabhängig größere Orbs, Magnet- und Sammelgefühl erhalten;
- [x] Pickup-Pacing an Wave-/Encounter-Fortschritt gekoppelt;
- [x] Mechanik-, Mobile-, Arena-, Pacing- und Performance-Regressionstests.

## Phase 5 – Enemy Animation Polish
**Status: abgeschlossen am 11.08.2026.**
- [x] Support und Summoner besitzen eigene, vereinfachte 4×4-Sheets mit je
  vier Laufphasen für links, rechts, oben und unten.
- [x] Brute, Spitter, Fan-Spitter, Bomber und die betroffenen Elites laufen
  state-driven statt als permanenter Attack-Loop.
- [x] Die übrigen Spezialgegner koppeln Windup, Resolve und Recovery an ihre
  Fähigkeiten; Support/Summoner behalten währenddessen die Richtungsanimation
  und nutzen Aura/Telegraph für die Fähigkeitslesbarkeit.
- [x] Mobile Laufzeitgröße, Collider und Asset-Budget technisch abgenommen.
- [x] Movement-Bulk ergänzt: Runner, Brute, Gilded Talon/Stormclaw Champion und
  Brood King besitzen je vier echte Laufphasen für links, rechts, oben und unten.
- [x] Combat-Bulk ergänzt: Spitter, Fan-Spitter, Bomber und Elite-Spitter
  besitzen eigene 4×4-Walksheets; die vorhandenen Angriffsposen übernehmen
  weiterhin ausschließlich während Windup, Resolve und Recovery.
- [x] Elite-Spitter-Rückenreihe korrigiert: dritte Zeile ohne Gesicht und
  vorderes Mittelrohr, vierte Zeile als Front mit allen drei Rohren.
- [x] Slime bewusst unverändert: seine runde Silhouette und der Wobble sind
  richtungsneutral bereits lesbar.
- [x] Alle 128 neuen Runtime-Frames auf Mittelpunkt, Bodenlinie, Zellgrenzen und
  sichtbare Vorder-/Rückansicht geprüft; maximal 0,5 px Mittelpunktabweichung.

Details: `docs/ENEMY_ANIMATION_POLISH.md`.

## Phase 6 – optional neue Specials/Champions
**Status: abgeschlossen am 11.08.2026; bewusst fokussiert.**
- [x] Stormclaw Champion als seltener Charger in Wave 6 und 8.
- [x] 520-ms-Charge-Telegraph, Ankunftsbanner und eigener Goldmarker.
- [x] garantierte Golden Chest; kein neuer Projektil-/Hazard-Typ.

Der Kern war nach Phase 5 stabil genug. Statt mehrere neue Gegnertypen halb
auszuarbeiten, ergänzt genau ein kontrollierter Champion die Zielpriorität.
Details: `docs/REWARD_REWORK.md`.

## Phase 7 – Balance & Production Gate
**Status: offen; nach dem Enemy-Art-Pass.**
- echte Runs;
- Multi-Seed;
- alle Rooster;
- Desktop/Mobile;
- dokumentierter Vergleich vorher/nachher.

---

# 15. Definition of Done

Dieser Produktionspass ist nicht abgeschlossen, nur weil Tests grün sind.

Er ist abgeschlossen, wenn folgende Produktziele sichtbar erreicht sind:

### Hauptmenü
- deutlich übersichtlicher;
- Start eines Runs ist die klare Hauptaktion;
- bestehende gute Assets bleiben präsent;
- Meta bleibt erreichbar;
- Mobile funktioniert.

### Horde
- mittlere/späte Waves fühlen sich sichtbar voller an;
- Spielerwaffen können Gegnergruppen regelrecht „wegmähen“;
- Spezialgegner bleiben erkennbar;
- keine neue Projectile-Wand.

### Micro-Fodder
- sieht trotz Einfachheit sauber animiert aus;
- wirkt nicht wie billig wackelndes PNG;
- kann in hoher Zahl laufen;
- stirbt befriedigend;
- macht das Spiel nicht unfair schwer.

### Progression
- Level-Up-Geschwindigkeit bleibt kontrolliert;
- XP-Orbs überfluten das Bild nicht;
- Pickups erscheinen weiterhin sinnvoll.

### Schwierigkeit
- mehr Gegner ≠ einfach nur mehr Schaden;
- Fodder liefert Masse;
- Specials liefern Gefahr;
- Elites liefern Fokusmomente;
- Boss bleibt ein separater Abschluss.

### Technik
- keine Regression bei bestehenden Waffen/EVOs/Boss/Maps/Meta;
- Build sauber;
- Tests sauber;
- keine Browserfehler;
- Mobile Performance akzeptabel.

---

# 16. Abschlussbericht des Agents

Am Ende bitte liefern:

1. kurze Bestandsaufnahme des Ausgangszustands;
2. Liste der tatsächlich geänderten Dateien;
3. Vorher/Nachher-Bilder des Hauptmenüs:
   - Desktop;
   - Portrait;
   - Landscape;
4. Screenshot einer frühen Wave;
5. Screenshot einer späten Horde-Wave;
6. Screenshot Micro-Fodder in Bewegung;
7. Performance-Messwerte für 75 / 110 / 150 aktive Gegner;
8. Wave-Peaks vorher/nachher;
9. XP-/Level-Up-Pacing vorher/nachher;
10. bekannte Restrisiken;
11. klare Empfehlung, ob als Nächstes Enemy-Art, neue Specials oder Content-Ausbau priorisiert werden sollte.

---

# Produktleitlinie

RoosterRage soll **nicht** versuchen, Survivor.io 1:1 zu kopieren.

Das Ziel ist:

> eine klar lesbare, humorvolle, hochwertige Hühner-Survivor-Variante mit starken Waffen, sichtbarer Progression, sehr vielen schwachen Gegnern und wenigen klar erkennbaren gefährlichen Gegnern.

Die Stärke soll aus dem Kontrast entstehen:

**Masse + Vernichtung + einzelne echte Bedrohungen.**

Nicht:

**wenige zähe Gegner + Projektilchaos.**

Und ebenso wichtig:

Das Hauptmenü soll nicht wie eine Sammlung implementierter Features wirken, sondern wie die Startseite eines fertigen Spiels.
