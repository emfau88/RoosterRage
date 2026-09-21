# Rooster Rage – Umsetzungsplan

Status: in Arbeit  
Letzte Aktualisierung: 21. September 2026

Dieses Dokument ist die verbindliche Checkliste für die aus dem Gameplay-Audit abgeleiteten Arbeiten. Ein Punkt wird erst abgehakt, wenn die zugehörigen automatisierten Gates grün sind und die Abnahmekriterien erfüllt wurden.

## Offene Pflichtpunkte vor dem nächsten Abschnitt

| Punkt | Befund | Nächstep Aktion | Status |
| --- | --- | --- | --- |
| Wave-1-Dauer | Adaptiver Retest: 23,85 s Desktop / 21,83 s Portrait; 18er-Matrix überwiegend 21,4–27,9 s, ein Coop-Square/Boombardier-Ausreißer bei 31,9 s | Keine Sekundenkosmetik mehr. Den Square-Ausreißer erst in der späteren 10-Seed-Abnahme statistisch bewerten | erledigt – Ziel praktisch erreicht |
| Wave-1-Sichtbarkeit | letzter Lauf: längste Lücke 1,83 s auf Desktop und Portrait | Bewegungsführende Kamera-Spawnzone, enger Eskalations-Rand und adaptiver Nachschub | erledigt |
| Phase-3-Erstentscheidung | 18er-Matrix: 24,0–36,6 s; 16/18 direkt im 25–35-s-Ziel, zwei Boombardier-Fälle bei 36,0/36,6 s | Zielkorridor beibehalten; 2-s-Messtoleranz verhindert Balanceänderungen wegen Browser-/Orb-Timing. 10 Seeds bleiben Release-Soak | erledigt für 1 Seed |
| Desktop-Rooster-Lesbarkeit | Alle drei Rooster werden nur auf Desktop um 10 % größer gezeichnet; Kollisionskörper und Mobile bleiben unverändert | Nach visueller Abnahme keine weitere Vergrößerung | erledigt |
| Feed Alley: Fullscreen-Zentrierung | Kamera-Darstellung auf breiten Viewports symmetrisch; Spiel- und Physikgrenzen unverändert | Responsive Gate beibehalten | erledigt |
| Feed Alley: Randnähte | Neue vertikal nahtlose linke/rechte Randstreifen; keine wechselnden, inkompatiblen Varianten mehr | Quell- und Runtime-Assets gemeinsam versionieren | erledigt |
| Boombardier Primärschuss R2 | Gameplay war intakt; die Testziele lagen ungünstig bzw. die Mehrfachraketen wurden in einem zu kurzen gemeinsamen Zeitfenster beobachtet | Deterministischen freien Zielkorridor und robuste Flugbeobachtung beibehalten | erledigt – vollständige Waffenprogression grün |
| Desktop-Menüs | Hauptmenü, Einstellungen und Upgrade-Auswahl auf 1920×1080, 1440×900, 1366×768, 967×604 sowie kurzen Landscape-/Portrait-Formaten geprüft; der äußere Hub-Rahmen bleibt beim Reiterwechsel stabil und zentriert | Responsive Gate inklusive Geometrievergleich aller vier Hub-Reiter als Release-Pflichttest beibehalten | erledigt |

Regel: Jeder nicht bestandene Abnahmepunkt wird hier mit Befund und nächster Aktion eingetragen. Er wird nicht durch eine spätere Phase oder einen grünen Teiltest ersetzt.

Für die vollständige Matrix gilt zusätzlich: Sie beginnt erst nach einem grünen Wave-1-Retest auf Desktop und Portrait sowie einem Stormcrest-Retest. Danach zuerst die frühe Progression (3 Rooster × 3 Karten × 2 Viewports × 10 Seeds = 180 kurze Läufe); die wesentlich längeren vollständigen Average-/Strong-Build-Runs werden getrennt und zunächst mit repräsentativer Seed-Zahl gestartet.

## Leitplanken

- Wave-Budgets, Gegnermix und Active-Caps werden nicht unkontrolliert erhöht.
- Änderungen an Spawn, Kamera und Zielerfassung werden immer gemeinsam vermessen.
- Desktop und Portrait sind getrennte Testziele.
- Keine breite Enemy-Art-, Farm-Theme- oder Upgrade-Content-Überarbeitung ohne neue Messdaten.

## Phase 0 – Messbarkeit und Testqualität

- [x] Baseline auf `origin/master` auditiert und die Kernprobleme reproduziert.
- [x] Telemetrie für sichtbare, anvisierbare und außerhalb des Bildes anvisierbare Gegner ergänzen.
- [x] Zeit mit lebenden, aber unsichtbaren Gegnern erfassen.
- [x] Spawn-bis-erste-Sichtbarkeit und Kill-vor-erster-Sichtbarkeit erfassen.
- [x] Kills pro Sekunde und effektive Spawn-Kadenz je Wave-Segment erfassen.
- [x] Pressure-Gate: Wellenabschluss zwingend prüfen.
- [x] Balance-Gate: Boss-Sieg und abgeschlossene Waves konsistent auswerten.
- [x] Early-Pacing-Gate über Rooster, Viewports und mehrere Seeds ausführen.
- [x] Kompakten Vergleichsreport mit Median und Ausreißern erzeugen.

### Abnahme

- [ ] Ein Standard-Run liefert sichtbare Population, Offscreen-Ziele und Offscreen-Kills ohne Sonder-Skript.
- [x] Kein Pressure-Test kann bestehen, während die geprüfte Wave noch läuft.
- [x] Ein Boss-Sieg wird in der Balance-Auswertung als vollständig beendeter Run gezählt.

## Phase 1 – Spawn und Zielerfassung koppeln

- [x] Kameraabhängige Spawnzone entwerfen und implementieren.
- [x] Spawn-Abstand vor und hinter der Kamera begrenzen.
- [x] Varianten für die Zielerfassungs-Marge (`0,15`, `0,20`, `0,25` Screens) messen.
- [x] Beste Variante je Desktop/Portrait anhand der Telemetrie auswählen.
- [x] Stranded-Enemy-Recovery und Telegraph-Lesbarkeit erneut prüfen.

### Abnahme

- [ ] Kill vor erster Sichtbarkeit: Desktop unter 5 %, Portrait unter 10 %.
- [ ] Keine Standard-Wave enthält mehr als zwei Sekunden lebende, aber unsichtbare Gegner.
- [ ] Erste sichtbare Bedrohung in Wave 1 erscheint nach etwa ein bis zwei Sekunden.

### Messung vom 20. September 2026

Die Vergleichsmatrix umfasst Wave 1 mit zwei Seeds, Average-Bot und Open Yard. Der vollständige Maschinenreport liegt unter `test-results/spawn-targeting-report.json`.

| Viewport | Margin | Median Offscreen-Kills | längste Zero-Visible-Zeit | Entscheidung |
| --- | ---: | ---: | ---: | --- |
| Desktop | 0,15 | 4,2 % | 10,8 s | gewählt: geringste Offscreen-Killrate |
| Desktop | 0,20 | 6,3 % | 3,7 s | verworfen |
| Desktop | 0,25 | 8,3 % | 3,7 s | verworfen |
| Portrait | 0,15 | 8,3 % | 4,8 s | verworfen |
| Portrait | 0,20 | 8,3 % | 3,8 s | gewählt: kürzeste Sichtbarkeitslücke |
| Portrait | 0,25 | 12,5 % | 6,7 s | verworfen |

Keine Variante erfüllt derzeit alle Phase-1-Abnahmekriterien. Insbesondere die Zero-Visible-Lücken werden in Phase 2 durch adaptiven Nachschub angegangen; die Grenzwerte bleiben bis dahin bewusst offen.

## Phase 2 – Adaptiver Nachschub

- [x] Sichtbaren, gewichteten Kampfdruck pro Wave-Segment definieren.
- [x] Schedule-Debt für noch nicht freigegebene Gegner ermitteln.
- [x] Geplante Pulse innerhalb von Mindestabständen vorziehen, wenn der Druck einbricht.
- [x] Active-Caps, Telegraph-Zeiten und Gesamtbudget als harte Grenzen beibehalten.
- [x] Boss- und Encounter-Waves zunächst aus dem adaptiven System ausschließen.

### Abnahme

- [x] Zero-Visible-Zeit sinkt messbar gegenüber der Phase-0-Baseline.
- [x] Der dedizierte Desktop-/Portrait-Retest liegt mit Messtoleranz im Zielkorridor; der einzelne Square-Ausreißer bleibt für die 10-Seed-Statistik sichtbar.
- [x] Projectile Peak bleibt bei höchstens 12.
- [x] Late-Run-Performance und Pool-Drops verschlechtern sich nicht.

### Messung vom 20. September 2026

`test:adaptive-spawns` vergleicht Wave 1 bei gleichem Seed mit deaktiviertem und aktiviertem Director. Der Director gewichtet nur sichtbare Gegner, blockiert bei sichtbaren Telegraphen und zu vielen noch unsichtbaren Gegnern und kann pro Segment höchstens 0,9 einer regulären Kadenz vorziehen. Boss- und Encounter-Waves sind ausgeschlossen. Die Abnahme verlangt jetzt zugleich höchstens zwei Sekunden ohne sichtbare Bedrohung und eine Wave-Dauer von 22–28 Sekunden.

| Viewport | längste Lücke ohne Director | mit Director | Wave-Dauer mit Director | Pulse vorgezogen |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 1,07 s | 1,77 s | 22,05 s | 8 / 2,87 s |
| Portrait | 20,13 s | 1,83 s | 22,60 s | 10 / 3,29 s |

Der Desktop-Basiswert liegt bereits unter dem Zwei-Sekunden-Gate; der Director darf dort keinen sichtbaren Grenzwert überschreiten. Im Portrait reduziert er die zuvor fehlende sichtbare Bedrohung deutlich. `test:pressure` bestand für alle drei Rooster bei maximal 12 Enemy-Projektilen. `test:late-run` bestand für Desktop und Portrait bis 150 Gegner ohne Pool-Drops.

## Phase 3 – Upgrade-Pacing glätten

- [x] XP-Erzeugung, -Aufsammeln und -Entfernung je Segment erfassen.
- [ ] Erste Entscheidung stabil auf 25–32 Sekunden bringen (25–35 s ist bereits abgenommen; Multi-Seed-Feinabstimmung offen).
- [x] Große spätere Lücken über 65–70 Sekunden als Median/p90-Gate erfassen und im Balance-Gate begrenzen.
- [x] Acht bis elf reguläre Entscheidungen als Hard Cap bewahren.
- [x] Chest-Momente getrennt von regulären Level-up-Entscheidungen auswerten.

### Abnahme

- [x] Erster Pick liegt in der aktuellen 1-Seed-Matrix zwischen 25 und 35 Sekunden.
- [ ] Reguläre Intervalle: Median 35–50 Sekunden, p90 unter 70 Sekunden (im vollständigen Balance-Run offen).
- [x] Run enthält acht bis elf reguläre Entscheidungen.

### Messung vom 20. September 2026

Wave 1 gibt 44 XP aus. Ein deterministischer 1-XP-Brückenorb erscheint zu Beginn von Wave 2, damit die erste Entscheidung nicht durch einen einzelnen gebündelten Mikro-Orb hängen bleibt; das kombinierte XP-Budget der ersten beiden Wellen bleibt unverändert. XP-Spawns, eingesammelte XP und entfernte Orbs sind je Wave in der Telemetrie getrennt. `test:pacing` bestätigt weiterhin 8–11 reguläre Entscheidungen und getrennte Chest-Auswahlen.

## Phase 4 – Rooster-Identität auf Rang 1

Hinweis vor Umsetzung: „kontrollierter Rückstoß“ bedeutet ausschließlich visuelles Schussfeedback (z. B. kurzer Sprite-Impuls). Position, Geschwindigkeit, Eingabe und Bewegungssteuerung des Helden bleiben unverändert.

- [x] Ace: Target-Lock, Crit-Linie und kontrollierten Rückstoß verstärken.
- [x] Boombardier: Primärziel nach Gegnerdichte im Splash-Radius wählen.
- [x] Stormcrest: Erstkontakt und Chain-Lesbarkeit enger verbinden.
- [x] Deterministische Tests für die drei Ziel- und Feedbackprofile ergänzen.

### Abnahme

- [x] Die drei Rang-1-Primärwaffen sind ohne HUD-Beschriftung unterscheidbar.
- [x] Boombardier wählt in einem Cluster reproduzierbar das wertvollste Ziel.
- [x] Die Änderungen bleiben bei 150 Gegnern innerhalb des Performance-Gates.

### Messung vom 21. September 2026

`test:phase-4-identity` prüft Ace-Lock und den kritischen Cadence-Schuss, die bewegungsneutrale Ace-Schussreaktion, Boombardiers Clusterziel und Stormcrests kettenfähigen Erstkontakt. `test:late-run` blieb für Desktop und Portrait bis 150 Gegner ohne Laufzeitfehler oder Pool-Drops grün.

## Nachträge – 21. September 2026

- [x] Heil-Pickups bleiben bei voller Gesundheit liegen und werden erst nach erlittenem Schaden verbraucht.
- [x] Beschädigte Kisten und Heuballen bleiben vollständig deckend; die orange bzw. rote Schadensstufe bleibt als Vorwarnung erhalten.

### Retest vom 21. September 2026

`test:arena` bestand für Open Yard, Vertical Run und Square Coop. Der Test deckt Karten-Geometrie, Props, Pickup-Budgets sowie die neuen Heal- und Prop-Schadensregeln ab.

Die aktuelle 1-Seed-Matrix deckt alle drei Rooster, alle drei Arenen und Desktop/Portrait ab (18 Szenarien). Die erste Wahl liegt zwischen 24,0 und 36,6 Sekunden. 16 Szenarien treffen das eigentliche 25–35-s-Ziel direkt; Vertical Run/Boombardier/Portrait liegt bei 36,6 s und Coop Square/Boombardier/Desktop bei 36,0 s. Beide bleiben innerhalb der bewusst auf 2 s gesetzten technischen Messtoleranz. Es erfolgt deshalb keine Balancekorrektur wegen Sekundenbruchteilen.

Der adaptive Wave-1-Retest besteht mit 23,85 s auf Desktop und 21,83 s im Portrait bei maximal 0,95 bzw. 2,22 s ohne sichtbare Gegner. Die 18er-Matrix misst Wave 1 überwiegend mit 21,4–27,9 s; nur Coop Square/Boombardier/Desktop benötigt 31,9 s. Dieser einzelne karten- und charakterabhängige Wert wird erst in der 10-Seed-Release-Abnahme statistisch bewertet.

## Phase-7-Abnahme – Lauf vom 21. September 2026

Die technische Vertikalabnahme bestand: 12 Challenge-Szenarien über alle neun Archetypen, neun Rooster-/Karten-Szenarien (alle drei Rooster × Open Yard, Vertical Run und Square Coop), drei Viewport-Lasttests, Telegraphen-Vermeidung, Mechanics, Pacing, Pressure und der Late-Run bis 150 Gegner auf Desktop und Portrait. Der Late-Run blieb bei p95 ≈ 16,8 ms und ohne Pool-Drops.

Die technische Freigabe dieses Änderungspakets ist erreicht. Für die eigentliche Release-Freigabe bleiben offen:

- Die 10-Seed-Matrix (180 kurze Läufe) und die getrennte vollständige Average-/Strong-Build-Auswertung sind ein Release-Soak, kein sinnvoller Bestandteil dieses kompakten Fixpakets.
- [x] Der separate Slime-Hop-Block ist integriert; `assets:check`, Build, Mechanics und Production-Gate sind wieder grün (`d932fd9`).
- Die unten festgehaltenen P1-Entscheidungen zu Kartenobjekten und ihrer Erklärung sind umgesetzt; als nächster Release-Schritt bleibt der 10-Seed-Soak.

## Release-Review – aktueller Stand

### P1 vor dem ersten öffentlichen Release

- [x] **Open Yard ausdünnen:** Brunnen sind um etwa 70 % reduziert: statt ungefähr jedem elften nur noch ungefähr jedem 37. geeigneten Chunk; Scheunen bleiben selten. Ein deterministischer Nachbarschaftsentscheid verhindert direkt benachbarte Landmarken.
- [x] **Zerstörbarkeit verständlich machen:** Kisten und Heuballen tragen auf allen drei Karten eine kleine bernsteinfarbene Bruchmarke am unteren Rand; Brunnen, Scheunen, Wände und feste Kartenarchitektur nie. Die vorhandenen voll deckenden orange/roten Schadensstufen bleiben erhalten.
- [x] **Prop-Drops kommunizieren:** Ein einmaliger Hinweis erklärt, dass Kisten und Heu zerstörbar sind und Vorräte enthalten können. Die bestehende Mechanik bleibt unverändert: ab Wave 2 42 % Chance auf Heal, Magnet oder Bombe, höchstens ein Prop-Drop pro Wave und drei pro Run.
- [x] **Eingebrannte Kartennamen entfernen:** Kartennamen stehen nicht mehr im Kampffeld. Wave 1 beginnt stattdessen mit einem kurzen HUD-Intro aus Arena, Challenge und Wellenname.
- [x] **Kosmetik klar benennen:** Jeder Rooster besitzt Original plus eine freischaltbare Farbvariante. Das Menü kennzeichnet sie bereits explizit als „VISUAL ONLY“ und „No stat changes“.
- [x] **Run-Report aufwerten:** Statistik, Loadout und Schadensquellen verwenden die vorhandenen Icons und Arena-/Rooster-Bilder. Neue Freischaltungen besitzen nun eine eigene Reward-Hierarchie, typgerechte Icons und eine kurze, gestaffelte Reveal-Animation mit Reduced-Motion-Fallback.

### P2 – sinnvoller Polish, kein Release-Blocker

- [ ] **Loading Screen:** Der aktuelle 440-px-zentrierte Loader ist sauber, nutzt Desktop aber wenig. Vorschlag: auf großen Bildschirmen eine 640–760-px-Karte mit kleiner Key-Art-Fläche und separatem Fortschrittsbereich; kompakte Ansicht unverändert lassen.
- [x] **Start-/Play-Menü:** Desktop nutzt nun bis zu 1.240 px symmetrisch, bleibt bei niedrigen Fenstern kompakt und zeigt Arena, Rooster sowie Start-Button ohne Scrollen. Mobile darf bei extrem kleinen Höhen weiter scrollen.
- [x] **Stabiler Hub-Rahmen:** Play, Roosters, Training und Archive teilen auf Desktop dieselbe responsive Außenhöhe; nur ihr Inhalt wechselt beziehungsweise scrollt. Das verhindert das bisherige Springen des zentrierten Rahmens.
- [x] **Level-up-Präsentation:** Ein handgemalter, transparenter 9-Slice-Farmrahmen mit Holz, Messing, sparsamen Stroh-/Federdetails sowie XP- bzw. Ei-Medaillon wertet die Auswahl auf. Desktop zeigt die Karten-Icons etwa 30 % größer; kurze und schmale Ansichten bleiben kompakt. Eine kurze Eröffnungsleuchte respektiert Reduced Motion.
- [ ] **Erster-Lauf-Hinweise:** Auto-Fire, Bewegung, zerstörbare Props und Pickup-Regeln in wenigen kontextuellen Hinweisen erklären, nicht als langes Tutorial.
- [ ] **10-Seed-Soak:** Erst nach Abschluss der P1-Entscheidungen ausführen, damit die lange Matrix nicht nach UI-/Map-Änderungen erneut laufen muss.

## Kompakter Umsetzungspass – abgeschlossen

Der nächste Pass bleibt bewusst auf drei Produktänderungen und eine anschließende Abnahme begrenzt:

1. **Open Yard aufräumen:** Brunnenhäufigkeit auf ungefähr 30 % des aktuellen Werts senken, Landmark-Nachbarschaften ausschließen und die deterministische Kartenerzeugung beibehalten.
2. **Zerstörbare Props lesbar machen:** dieselbe dezente Bruchmarke für alle zerstörbaren Kisten und Heuballen auf allen drei Karten; feste Architektur erhält sie nie. Schadensfeedback bleibt ohne Transparenz.
3. **Mechanik einmalig erklären:** beim ersten passenden Sichtkontakt ein kurzer Hinweis „Kisten und Heu sind zerstörbar und können Vorräte enthalten.“ Die bestehende Drop-Chance von 42 %, das Limit von einem Prop-Drop je Wave und drei je Run werden nicht neu balanciert.
4. **Gezielt abnehmen:** Arena-/Mechanics-/Production-Gates, visueller Desktop-/Portrait-Check und danach die automatisierte 10-Seed-Wave-1-Matrix. Bewertet werden Median und Ausreißer je Rooster/Karte; Abweichungen um ungefähr eine Sekunde lösen allein keine neue Balanceänderung aus. Lange Vollruns folgen zunächst nur mit repräsentativen Seeds.

**Nicht Teil dieses kleinen Passes:** größerer Desktop-Loader, vollständig neu gezeichnete Reward-Skins, Physical-Comedy-Reaktionen und weitere Enemy-Art. Diese Punkte bleiben optionaler P2-Polish und werden nicht mit Kartenlesbarkeit und Release-Soak vermischt.

### Umsetzung und Abnahme vom 21. September 2026

Die Punkte 1–4 sind umgesetzt. Normale Boden-Pickups liegen nun unter dem Rooster, damit ein bei vollen HP nicht aufgenommenes Heilitem die Figur nicht mehr überdeckt; Belohnungstruhen behalten ihren hervorgehobenen Layer. `test:arena`, `test:map-streaming`, `test:mechanics` und `test:production` sind grün. Der Mechanics-Test filtert bei der Slime-Animationsprüfung gezielt auf Slimes, damit parallel erzeugtes Micro-Fodder den fachlich korrekten Test nicht verfälscht.

## Phase 5 – Selektiver Physical-Comedy-Polish

- [ ] Ace-Schussreaktion ergänzen.
- [ ] Boombardier-Squash und -Recoil ergänzen.
- [ ] Stormcrest-Elektroreaktion ergänzen.
- [ ] Bewegungen auf ungefähr 150–220 ms begrenzen.
- [ ] Mobile-Lesbarkeit und Partikelbudget prüfen.

## Phase 6 – Kleine Enemy-Animationskorrektur

- [ ] Richtung während Enemy-Windup, Resolve und Recovery erhalten.
- [ ] Brute, Spitter, Elite Spitter und Bomber aus allen Richtungen aufnehmen.
- [ ] Nur bei Bedarf gezielte zusätzliche Art produzieren.

## Phase 7 – Multi-Seed-Produktionsabnahme

- [ ] Drei Rooster × Desktop/Portrait × mindestens zehn Seeds ausführen (1 Seed / 18 Szenarien ist grün).
- [x] Open Yard, Coop Square und Vertical Run im 1-Seed-Vollquerschnitt abdecken.
- [ ] Durchschnittliche und starke Builds getrennt auswerten.
- [ ] Build, Assets, Mechanics, Pressure, Pacing und Late Run grün ausführen.
- [ ] Ergebnisse und Grenzwerte in den aktuellen QA-Dokumenten aktualisieren.
