# Rooster Rage – Umsetzungsplan zum Portal-Release

Planstand: 1. Oktober 2026 · Pakete 0/1 abgeschlossen · Basis-Quellstand: `fe75523` mit dokumentierten lokalen Paket-1-Änderungen

**Ziel:** Ein visuell geschlossenes, gut lesbares und auf den unterstützten Geräten zuverlässig spielbares Release-Paket. Schwerpunkt sind Maps, Charakterdarstellung, Menüs und Belohnungsbildschirme. Paket 0 wurde am 1. Oktober 2026 als dokumentierte Ausgangslage ohne Spielcodeänderung abgeschlossen. Paket 1 ist umgesetzt und frisch geprüft; Belege und Prüfgrenzen stehen im [Paket-1-Bericht](qa/portal-package-1/README.md). Pakete 2–6 sind noch nicht umgesetzt.

Planungsannahme: Kongregate ist das erste Ziel, weil bereits ein Paketierungsweg vorhanden ist. Diese Wahl ist noch nicht vom Nutzer bestätigt. Die Arbeitspakete 0–5 gelten unabhängig vom Portal; Paket 6 enthält die getrennten Portalvarianten. Eine Einreichung oder Veröffentlichung ist ein späterer eigener Schritt.

**Was die Prüfung tatsächlich belegt**

Grundlage sind das vorangegangene Audit, der aktuelle Quellcode und die vorhandenen Abnahmeunterlagen. Die ursprünglichen Browseransichten entstanden im Entwicklungsmodus mit Canvas. Paket 0 ergänzt 85 Ansichten des unveränderten WebGL-Release-Builds, fünf regulär ausgespielte Bot-Runs, Größenmessungen und eine separate frühe Leistungsprobe. Ergebnisse und Prüfgrenzen stehen im [Paket-0-Bericht](qa/portal-package-0/README.md). Historisch bestandene Tests werden nicht als frisch ausgeführte Tests ausgegeben.

Die Aussage, sämtliche ersten acht Auditpunkte müssten zwingend vor Release umgebaut werden, war zu pauschal. Insbesondere Mapgestaltung und Kampfdichte brauchen eine engere Bewertung:

| Auditpunkt | Prüfung und Einordnung | Entscheidung für die Umsetzung |
| --- | --- | --- |
| 1. Upgrade-Lesbarkeit | Bestätigt: unter 700 px Fensterhöhe 7-px-Effekttexte; Beschreibung, Synergie und EVO-Hinweis werden per CSS ausgeblendet. | Verbindlich korrigieren, Paket 1. |
| 2. Desktop-Hauptmenü | Bei 960×540 sichtbare Überschneidung von Beschriftungen und schlechte Flächennutzung. | Verbindlich korrigieren, Paket 1. |
| 3. Unterschiedlicher Grafikstil | Visuell nachvollziehbare Qualitätsbewertung, kein Funktionsfehler. | Kleine verbindliche Stilreferenz und gezielte Angleichung, Pakete 0/3. Kein vollständiger Assettausch. |
| 4. Kleine Figur in Feed Alley | Größenunterschied sichtbar; Kamera und Gassenbreite sind bewusst angepasst. Eine größere Figur ist noch keine bewiesene Lösung. | Auf echten Geräten und in regulären Runs prüfen; Korrektur nach messbarer Lesbarkeit, Paket 2. |
| 5. Wiederholter Mapboden | Streaming verwendet je Arena dieselbe Bodenquelle. Paket 0 zeigt wiederkehrende Muster auf regulären Yard-/Alley-Wegen; die Kampfmitte bleibt ruhig. | Begrenzten Variantenversuch durchführen; nur bei sichtbarer Verbesserung übernehmen, Paket 3. |
| 6. Ähnliche Mapfarben | Gestalterische Empfehlung. Die drei Maps haben bereits unterschiedliche Geometrie und Kulissen. | Farbklima und Randmotive schärfen; ruhige Kampfmitten erhalten, Paket 3. |
| 7. Porträtzuschnitt und gesperrte Karten | Ungünstiger Stormcrest-Ausschnitt und schwach lesbare gesperrte Inhalte sichtbar. | Verbindlich korrigieren, Paket 1. |
| 8. Kampfüberladung | Die erste Auditaufnahme war künstlich. Paket 0 erfasst regulär bis zu 68 sichtbare Gegner in Yard-Wave 8 und 65 in Alley-Wave 8; späte Coop-Wellen bleiben offen. Kornkrabbler haben bereits keine HP-Balken. | Sichtvergleich in Paket 2; keine pauschale Änderung von Gegnerzahl oder Balken aus einem Dichtemaximum ableiten. |
| 9. Truhen/EVO-Präsentation | Boss-Belohnung bietet tatsächlich vier Karten; das Desktop-Raster verwendet drei Spalten. Eine stärkere Inszenierung ist eine Qualitätsentscheidung. | Viererkartenlayout verbindlich korrigieren; kurze Belohnungsinszenierung in Paket 4. |
| 10. Wiederverwendete Icons | Bestätigt durch Alias-Mapping. Primärwaffen-Rangangebote können auf generische Icons zurückfallen. | Eindeutige Zuordnung und gezielter Icon-Satz, Paket 3. |
| 11. Zusätzliche Angriffsanimationen | Kein bestätigter Mangel. Finale Figuren besitzen bereits vier Richtungen mit jeweils acht Lauf- und Idle-Frames und dokumentierter Abnahme. | Optional nach den verbindlichen Release-Punkten. |
| 12. Überlappende Kampfmeldungen | Boss-Einblendung/Bossbalken überschneiden sich in reproduzierbarer UI-Fixture. Die Kill-Chain verdeckt den Bossbereich zusätzlich im regulären Ace-Run in Wave 10. | Kollisionsfreie Meldungsbereiche verbindlich herstellen, Paket 2. |
| 13. Ergebnisbildschirm | Hohe Informationsdichte sichtbar; stärkere Belohnungshierarchie ist eine sinnvolle Produktverbesserung. | Paket 4; primäre Aktion und Freischaltungen zuerst. |
| 14. Sprache/Bezeichnungen | Bestätigt: „NEU“ und „EVO-ZIEL“ in englischen Karten; Training/Talents wechseln nach Viewport. | Verbindlich vereinheitlichen, Paket 1. |

Der Map-Lesbarkeitspass vom August entfernte absichtlich den Apfelhain, verringerte Scheunen/Brunnen und beruhigte Feed Alley. Eine Rückkehr zu dichter Dekoration oder zusätzlichen Hindernissen ist durch das neue Audit nicht begründet. Diese Entscheidungen aus `RoosterRage_Next_Production_Pass.md` und `docs/MAP_REWORK.md` bilden die Ausgangslage.

Pause, Speicher-Fallback, relative Release-Pfade, Ausschluss alter Charaktergenerationen und ein Produktions-WebGL-Starttest sind bereits implementiert. Sie werden erneut geprüft, wenn die Änderungen fertig sind. Der vorhandene `tests/release-gate.mjs` prüft Start, Einstellungen/Escape, Unterpfad, iframe und blockierten Speicher, aber keinen vollständigen Run bis Sieg.

**Reihenfolge, Aufwand und Verantwortung**

Personentage sind grobe Planungswerte für konzentrierte Arbeit einschließlich der jeweiligen Prüfung, keine Zusage einer Fertigstellungszeit. Die Rollen beschreiben die benötigte Arbeit und setzen kein mehrköpfiges Team voraus.

| Paket | Ergebnis | Rolle | Abhängigkeit | Aufwand |
| --- | --- | --- | --- | --- |
| 0 | Verifizierte Ausgangslage und verbindliche Stilreferenz | Entwicklung / Art / QA | – | 0,5–1 Tag |
| 1 | Lesbare und sauber skalierende Menüs/Upgrades | UI-Entwicklung | 0 | 2–3 Tage |
| 2 | Erkennbare Figuren und freie Kampf-/HUD-Flächen | Gameplay-Entwicklung / QA | 0, gemeinsame UI-Maße aus 1 | 1–2 Tage |
| 3 | Einheitlichere Map-, Prop- und Icon-Darstellung | Art / Entwicklung | 0, Maße aus 1/2 | 2–4 Tage |
| 4 | Klarere Belohnungen und Run-Abschlüsse | UI-Entwicklung / Art | 1 und Icon-Zuordnung aus 3 | 1–2 Tage |
| 5 | Produktions-, Geräte- und Erstspieler-Abnahme | QA / Entwicklung | 1–4 | 2–3 Tage |
| 6 | Geprüftes Zielportalpaket und Einreichungsmedien | Entwicklung / Produkt | 5; Metadaten können früher vorbereitet werden | 1–2 Tage |

Geplanter Kernumfang: etwa **10–17 Personentage**, zuzüglich Wartezeit für Geräte, externe Tester und Portalreview sowie erst dabei entdeckter größerer Fehler. Ein zusätzlicher SDK-/Cloud-Save-/Monetarisierungsumfang ist darin nicht enthalten. Zusätzliche Charakter-Angriffsanimationen sind ebenfalls separat.

**Paket 0 – Ausgangslage und visuelle Leitplanken**

**Status: abgeschlossen als Baseline, 1. Oktober 2026.** [Prüfbericht](qa/portal-package-0/README.md), [Stilreferenz](qa/portal-package-0/STYLE_REFERENCE.md), [Abschlusskontrolle](qa/portal-package-0/verification.json). Der frische Release-Gate bestand; 143 Dateien / 18,45 MiB. Alle Klassen und Arenen sind regulär abgedeckt; Ace erreicht den Sieg. Späte Coop-Square-Wellen, echte Mobilgeräte und menschliche Erkennung bleiben offene Proben in Paket 2/5. Die separate 60-Sekunden-Frameprobe umfasst frühe Wellen auf PC/Software-WebGL und ist keine Gerätefreigabe. Der ursprüngliche Paketumfang folgt als Referenz:

1. Den aktuellen Implementierungsstand und einen unveränderten Release-Build dokumentieren. Neue Vorherbilder im Produktionsrenderer aufnehmen: Hauptmenü, Roosters, Talents inklusive Detail, Archive, Settings, Level-up, Elite-/Boss-Truhe, EVO-Angebot, Sieg und Niederlage.
2. Eine kleine Referenztafel aus den bestehenden finalen Hähnen, einem Gegner, Heuballen/Kiste, Boden, HUD, Upgrade-Karte und Porträt zusammenstellen. Festlegen: gemeinsame Lichtrichtung, Konturen, Bodenkontakt, warme Goldakzente, dunkle ruhige Leseflächen und dezente Holz-/Federmotive. Den bestehenden Stil konkretisieren.
3. Drei reguläre Vergleichsruns über mehrere Seeds und alle drei Klassen aufnehmen. Dabei alle Arenen abdecken und besonders Wellen 7–10 betrachten. Normale Gegnerkonfigurationen verwenden. Künstliche Stresstests separat kennzeichnen.
4. Erstnutzerstand und fortgeschrittenen Spielstand als reproduzierbare Testszenarien festlegen. Das betrifft lange Texte, gesperrte Inhalte, volle Builds, EVO-Voraussetzungen und mehrere nacheinander anstehende Belohnungen.
5. Releasegröße, Startressourcen und Framezeiten als Baseline erfassen. Die Referenzgeräte samt Browser, DPR und Grafikpfad im Prüfprotokoll benennen.

**Abnahme:** Für jeden bestätigten Befund existiert eine reproduzierbare Ansicht. Für bedingte Änderungen ist der Vergleich vor/nach klar definiert. Die Stilreferenz ist dokumentiert und alle weiteren Assets werden daran geprüft.

Relevante Stellen: `src/data/presentationStandards.js`, `src/config/aceVisual.js`, `src/systems/DisplayResolutionSystem.js`, `docs/qa/rooster-final-v1/`, `tests/release-gate.mjs`.

**Paket 1 – Menüs und Upgrade-Entscheidungen**

**Status: abgeschlossen am 1. Oktober 2026.** Play-/Upgrade-CSS konsolidiert, Startbereich dauerhaft sichtbar, Pflichttexte lesbar, Boss-Angebote als 2×2/vertikale Liste, Porträts und englische Bezeichnungen korrigiert. Talent-/Settings-/Archive-Texte und kurze Scrolllayouts mitgeprüft. Menütest auf 20 Viewports plus vier Bedienungsszenarien sowie Release-, Meta-, EVO-, HUD-/Report- und Pause-Tests bestanden. Vorher/Nachher, Produktions-Grenzansichten und Build-SHA-256 im [Abnahmebericht](qa/portal-package-1/README.md). Reale Geräte und die gemeinsame Portalabnahme folgen in Paket 5.

1. Die sich überlagernden CSS-Regeln für die tatsächlich betroffenen Hub- und Upgrade-Komponenten konsolidieren. Aufeinander abgestimmte Varianten für breite, niedrige und schmale Fenster erstellen. Bestehende responsive Funktionen erhalten und an den Grenzen prüfen.
2. Im Play-Screen Mapname, Modus und Runwerte in getrennte Bereiche setzen. Die Vorschau erhält die verbleibende Fläche. Charakterauswahl und Startknopf bilden einen dauerhaft sichtbaren Bereich; bei wenig Höhe wird zuerst dekorative Fläche reduziert.
3. Kurze Upgrade-Dialoge in beiden Achsen zentrieren. Hohe Dialoge bekommen sichere Ränder, einen klaren Scrollbereich und erreichbare Aktionen. Dekorative Rahmenelemente dürfen weder Text noch Schaltflächen schneiden.
4. Upgrade-Karten auf Icon, Name/Rang, konkrete Änderung und gegebenenfalls EVO-Voraussetzungen konzentrieren. Doppelte Sätze kürzen. Synergien, die eine Wahl beeinflussen, bleiben sichtbar. Keine entscheidungsrelevanten Informationen nur wegen geringer Fensterhöhe entfernen.
5. Drei Angebote auf breiten Flächen gleichwertig nebeneinander darstellen. Vier Boss-Angebote ab ausreichender Breite als 2×2; schmale Fenster verwenden eine vertikale Liste. Die vierte Karte muss gleichwertig erreichbar sein. Wiederholte Level-ups und die letzte Auswahl berücksichtigen.
6. Als interne Gestaltungsziele: entscheidende Texte mindestens 12 CSS-Pixel auf Desktop und 13 auf Mobilgeräten, Kartentitel 16 Pixel; wichtige Touch-Aktionen mindestens 44×44 CSS-Pixel. Bei Platzmangel Inhalte staffeln oder scrollen. Diese Werte sind eigene Qualitätsziele, keine behauptete Portalvorschrift.
7. Porträtfokus je Hahn setzen, sodass Augen und Gesicht im sichtbaren Ausschnitt bleiben. Gesperrte Karten mit lesbarem Schloss/Unlock-Text und zurückhaltender Abdunklung gestalten. Auswahl und Start müssen als unterschiedliche Aktionen verständlich bleiben.
8. Englische Oberflächentexte vereinheitlichen: `NEW`, `EVO RECIPE`, durchgehend `Talents`; doppelte oder intern klingende Benennungen bereinigen. Zahlen, Wirkungen und Freischaltbedingungen inhaltlich unverändert übernehmen.
9. Talents, Detaildialog, Archive und Settings in denselben Typografie-/Abstandsregeln mitprüfen. Vorhandene Struktur nur dort ändern, wo Texte, Aktionen oder Scrollbereiche die Abnahme verfehlen.

**Abnahme:** Auf der unten definierten Viewportmatrix keine überlappenden Texte oder verdeckten Aktionen. Der Startknopf ist sofort sichtbar. Jede Upgradewahl zeigt Name, Rang, Wirkung und vorhandene EVO-Bedingungen. Keine gemischte Sprache. Die vierte Boss-Karte, Reroll und Fortsetzen funktionieren mit Maus, Tastatur und Touch. Fokusmarkierungen sind sichtbar.

Dateien: `src/styles.css`, `src/ui/HUD.js`, `src/data/upgradePresentation.js`, `src/systems/UpgradeSystem.js`. Gezielte Prüfungen: `test:menus`, `test:hud-report`, `test:meta`, `test:evolution`; die bestehenden Tests um Informationssichtbarkeit und die konkreten Überschneidungen ergänzen.

**Paket 2 – Figurenlesbarkeit und Kampfmeldungen**

1. In Feed Alley die tatsächliche sichtbare Figurenhöhe in CSS-Pixeln für alle drei Hähne messen; transparente Sheet-Ränder nicht mitzählen. Auf realen Geräten kontrollieren, ob Figur, Bewegungsrichtung und Abstand zu Gefahren schnell erkennbar sind.
2. Zuerst dezente Kontur/Bodenmarkierung und einen an die sichtbare Figur gebundenen HP-Abstand ausprobieren. Nur bei weiter unzureichender Erkennbarkeit die Darstellung moderat skalieren. Sichtfeld, Laufwege, Trefferflächen und Bild-/Kollisionsübereinstimmung gemeinsam prüfen; kein pauschales Hineinzoomen.
3. Das Meldungslayout aus den tatsächlichen HUD- und Bossbalkenmaßen ableiten. Bossphase/ernste Warnung erhält Vorrang vor Upgradebestätigung und Kill-Serie. Nachrangige Meldungen verzögern oder zusammenfassen; die zentrale Ausweichfläche bleibt frei.
4. Gegnerbalken erst anhand regulärer Aufnahmen ändern. Falls nötig, Balken gewöhnlicher Gegner nach Schaden zeitlich begrenzt anzeigen; Eliten/Boss bleiben zuverlässig erkennbar. Die schon balkenlosen Kornkrabbler beibehalten.
5. Eigene Flächen, gegnerische Vorwarnungen und aktive Gefahr bei gleichzeitiger Nutzung vergleichen. Nur tatsächlich verwechslungsanfällige Kombinationen in Randform, Helligkeit oder Animation nacharbeiten. Die bereits eingeführte Dominanz schwerer Warnungen erhalten.

**Abnahme:** In regulären Waves 7–10 lassen sich Spielerposition und sichere Ausweichrichtung erkennen. Keine Meldung überdeckt Boss-HP, Pause, Touchsteuerung oder andere Pflichtinformationen. Die gewählte Figurenanpassung erzeugt keine irreführende Trefferfläche. Abgeschaltete Blitze/Shake funktionieren weiterhin. Vergleichsbilder und kurze Clips belegen die Verbesserung.

Dateien: `src/scenes/GameScene.js`, `src/entities/Player.js`, `src/entities/Enemy.js`, `src/systems/RoosterClassSystem.js`, `src/systems/CombatFeedbackSystem.js`, `src/ui/HUD.js`, `src/styles.css`. Gezielte Prüfungen nach betroffener Funktion: `test:pressure`, `test:telegraphs`, `test:boss`, `test:pause`, `test:character-lab`.

**Paket 3 – Begrenzter Art-Pass für Maps, Props und Icons**

1. Zunächst je eine repräsentative Kiste, einen Heuballen und eine Mapfläche an die Stilreferenz angleichen. Konturstärke, Schärfe, Kontaktschatten und Lichtwirkung in echter Spielgröße vergleichen. Erst nach einem überzeugenden Muster weitere betroffene Assets bearbeiten.
2. Die Mapidentität vor allem über Farbabstimmung und vorhandene Randkulissen schärfen: Harvest Yard warm mit grünen Randakzenten, Feed Alley helle ruhige Spur mit kühleren Gebäudeschatten, Coop Square klar eingefasster trockener Hof. Vorhandene Geometrie, zerstörbare Objekte und sichere Wege erhalten.
3. Für den am stärksten wiederholten Streamingboden zunächst drei kompatible Varianten oder wenige schwache großflächige Dekore testen. Varianten deterministisch verteilen; keine zufällige Spiegelung von gerichteten Schatten/Fahrspuren. Nahtfreiheit über mehrere Chunkwechsel prüfen. Ausweitung nur bei sichtbarem Nutzen.
4. Gemeinsame Icon-Zuordnung über stabile Fähigkeits-IDs definieren. Zuerst fehlende Primärwaffen-/Rangzuordnungen reparieren. Danach eigene Symbole für die verwechslungsanfälligen Paare anlegen: Critical Yolk/Fire Eggs, Ricochet/Piercing, Shell Shock/Bigger Eggs, Second Wind/Heal und nötige Klassenpassive. Sachlich gleiche Funktionen dürfen dasselbe Symbol behalten.
5. Icons in Upgrade-Auswahl, HUD, Talenten und Ergebnisbericht gegen denselben Katalog prüfen. Einheitliche optische Größe und Ränder festlegen. Neue Bilddateien optimieren und nur tatsächlich benötigte Assets in den Release-Build aufnehmen.

**Abnahme:** Mapunterschiede sind auch im kleinen Screenshot erkennbar; Figuren und Projektile bleiben auf dem Boden dominant. Keine sichtbaren Chunknähte, keine neue Kollision und kein blockierter Weg. Primärwaffen haben passende Symbole; verwechslungsanfällige Fähigkeiten sind im realen Iconmaß unterscheidbar. Das vorhandene Releasebudget von 19 MiB wird eingehalten. Textur-/Speicherkosten neuer Varianten werden mitgemessen.

Dateien: `src/systems/ArenaSystem.js`, `src/systems/assets/AssetLoader.js`, `src/systems/assets/ArenaRenderer.js`, `src/assets/map/`, `src/assets/ui/`, `src/ui/HUD.js`. Prüfungen: `assets:check`, `test:arena`, `test:map-streaming`, `test:release`; Screenshots nach Kartenwechsel und längeren Wegen.

**Paket 4 – Belohnungen und Abschluss eines Runs**

1. Level-up, Elite-Truhe und Boss-Truhe mit derselben Kartenlogik, aber eigenem Emblem, Akzent und kurzem Übergang darstellen. Angebote nach spätestens etwa 0,6 Sekunden bedienbar machen; keine wiederkehrende lange Öffnungssequenz.
2. Bei EVOs Resultaticon und fertige Kombination deutlich zeigen. Bestehendes EVO-Feedback verwenden und angleichen, statt einen zweiten konkurrierenden Effekt einzubauen. Pausen- und Reward-Queue-Verhalten erhalten.
3. Ergebnisbildschirm in der Reihenfolge Ergebnis/Charakter, Belohnung und Fortschritt, neue Freischaltungen, kurzer Buildüberblick gestalten. Schäden, Trefferquote und Overkill unter „Run details“ aufklappbar machen.
4. Die Rückkehraktion dauerhaft erreichbar halten. Sieg, frühe Niederlage, voller Build, mehrere Freischaltungen und lange Namen prüfen. Der Runabschluss darf Kernels/Mastery/Unlocks weder doppelt vergeben noch verlieren.

**Abnahme:** Belohnungsart und Fortschritt sind auf den ersten Blick verständlich. Jede Aktion bleibt in niedrigen Frames und auf kleinen Telefonen erreichbar. Ein mehrfacher Klick vergibt keine doppelten Belohnungen. Detaildaten bleiben vollständig erreichbar. Neue Animationen halten sich an die Effekteinstellungen.

Dateien: `src/ui/HUD.js`, `src/styles.css`, `src/systems/RunStateSystem.js`, `src/systems/EvolutionVisuals.js`. Prüfungen: `test:hud-report`, `test:meta`, `test:evolution`, `test:mechanics`, `test:pause`.

**Paket 5 – Release-Kandidat und Abnahme**

Die abschließende Abnahme läuft auf dem gebauten Release-Kandidaten im WebGL-Renderer und im iframe. Dev-Test-API-Szenarien bleiben für reproduzierbare Mechanik- und Layoutprüfungen nützlich, ersetzen aber keine Bedienung des ausgelieferten Builds.

Zusätzlicher Prüfpunkt aus Paket 0: Der Start lädt bereits rund 17,59 MiB Ressourcen, darunter die Bossmusik. Unter gedrosseltem Netz den Erststart messen und Bedarfsnachladen der Bossmusik nur übernehmen, wenn der spätere Bossübergang ohne Audio-/Ladeunterbrechung bleibt. Die Loopback-Messung ersetzt diese Portalprobe nicht.

| Prüfung | Konkreter Umfang | Erfolgsbedingung |
| --- | --- | --- |
| UI-Matrix | 1920×1080, 1280×720, 1216×684, 1077×606, 960×540, 907×510, 821×462, 800×450, 844×390, 390×844 und 320×568; DPR 1 sowie Mobil-DPR 2+ | Pflichttexte und Hauptaktionen lesbar/erreichbar; keine Überdeckung; kein horizontaler Seitenüberlauf. |
| Zustände | Erststart, gesperrt/freigeschaltet, langer Text, voller Build, EVO bereit/nicht bereit, drei/vier Angebote, mehrere Rewards, Sieg/Niederlage | Auswahl und dargestellter Zustand stimmen überein; verständlicher Rückweg. |
| Reguläre Runs | Mindestens ein vollständiger Produktionsrun je Klasse; alle drei Maps abdecken; weitere gezielte frühe/mittlere/späte Zustände | Keine sichtbaren Darstellungsfehler, Hänger, fehlenden Belohnungen oder schwer verständlichen Gefahren. |
| Reale Geräte | Chrome/Edge-Desktop, Android-Chrome, iPhone-Safari sowie ein schwächeres Notebook/Chromebook; Unterstützung pro Gerät dokumentieren | Keine Abstürze/Steuerungsausfälle; Start, Rotation, Fokusverlust und Audiowiederkehr funktionieren. |
| Performance | Gleiche Szenen vor/nach auf benannten Referenzgeräten; zehn Minuten inklusive dichter Waves; RAM-/Texturverlauf beobachten | Ziel 60 FPS auf Referenzdesktop; auf schwächster unterstützter Konfiguration stabil spielbare mindestens 30 FPS. Keine wiederholten mehrsekündigen Hänger oder wachsende Ressourcenverluste. Das sind interne Ziele. |
| Portalumgebung | Unterpfad, iframe, blockierter Speicher, Tabwechsel, Rückkehr, Reload und gespeicherter Fortschritt | Keine Laufzeit-/Netzwerkfehler; Pause und Speicherung folgen den zugesagten Funktionen. |
| Erstspieler | 5–8 Personen ohne Erklärung; normale Erstnutzerstände | Mindestens 4 von 5 finden Start und Bewegung ohne Hilfe und können die Wirkung ihres ersten Upgrades erklären; wiederholte Stolperstellen werden behoben. Interne Abnahmekriterien, keine Portalgarantie. |

Vor dem finalen Kandidaten die betroffenen fokussierten Tests ausführen. Danach einmal die gemeinsame Kernabnahme: `test:release`, `test:menus`, `test:hud-report`, `test:pause`, `test:audio`, `test:mechanics`, `test:meta`, `test:evolution`, `test:boss`, `test:pressure`, `test:product`, `assets:check`. Bei Änderungen an Karten zusätzlich `test:arena`/`test:map-streaming`, bei Figuren `test:character-lab`. `test:late-run` und vollständige Produktionsruns sichern den langen Betrieb ab; die Dev-Suiten sind keine Produktions-Hardwaremessung. `test:pages` vor einer späteren Pages-Aktualisierung ausführen.

Für neue Tests die konkreten Risiken absichern: sichtbare EVO-Voraussetzungen, korrektes Viererkartenlayout, erreichbare Aktionen, Meldungsüberschneidungen und idempotente Belohnung. Reine Dekorationsdetails brauchen keine eigenen Logiktests.

**Abnahmeprotokoll:** Build/Commit, Gerät, Browser, Renderer, Viewport/DPR, Szenario, Ergebnis, Screenshots/Clip und offene Punkte. Ein nicht verfügbares Gerät bleibt als ausstehende Prüfung markiert. Bestehende alte grüne Reports schließen diese Lücke nicht.

**Paket 6 – Zielportalpaket und Einreichungsvorbereitung**

**Kongregate als angenommener Erstweg:** Den bestehenden Befehl `npm run package:kongregate` nach erfolgreicher Abnahme nutzen. Er baut/prüft den Release und erzeugt das vollständige ZIP. Das daraus entpackte Paket erneut unter einem fremden Unterpfad im iframe starten. Paketchecksumme und Buildzuordnung festhalten. Die Dateien in `releases/kongregate/` werden durch den Paketierungsweg aktualisiert; sie dürfen nur aus dem abgenommenen Stand stammen.

Aktuelle Screenshots der finalen Figuren, ein kurzer Gameplayclip, englische Beschreibung/Steuerung sowie die Angaben zu Altersstufe und AI-Nutzung vorbereiten. Entwicklerfreigabe und anschließendes Spielreview im Portal berücksichtigen. Diese Anforderungen stehen in der [offiziellen Kongregate-Einreichungsanleitung](https://blog.kongregate.com/hc/en-us/articles/44395849259661-SUBMISSION-How-do-I-submit-a-game-to-Kongregate-It-s-Easy), geprüft am 30. September 2026. API-Funktionen werden nach dem konkret gewählten Portalumfang ergänzt, nicht pauschal als neues System eingeplant.

**Alternative CrazyGames:** Einen getrennten Portalmodus vorsehen, der eigene Fullscreen-Schaltflächen entfernt. Lesbarkeit bei DPR 1 und den genannten kleinen iframe-Größen prüfen; englische Oberfläche vollständig halten. Für Full Launch zusätzlich den direkten Einstieg beziehungsweise höchstens einen Klick bis zum Gameplay sicherstellen. Grundlage: [offizielle Gameplay-Anforderungen](https://docs.crazygames.com/requirements/gameplay/), geprüft am 30. September 2026.

Für CrazyGames Basic ist SDK-Integration optional; Full verlangt weitergehende Integration. Der mobile Startdownload darf für die Homepage-Eignung 20 MB nicht überschreiten; ohne SDK zählt hierfür das Gesamtpaket. Die Messung anhand der konkreten Release-Dateien gegen die Portalgrenze durchführen. Gameplay-Start/Stop und gegebenenfalls Fortschrittsspeicherung als separates Arbeitspaket kalkulieren, sobald Full Launch gewählt wird. Grundlage: [offizielle technische Anforderungen](https://docs.crazygames.com/requirements/technical/), geprüft am 30. September 2026.

**Gemeinsame Medienabnahme:** Portalcover und Bilder in den beim Upload gültigen Zielformaten exportieren. Screenshots und Clip zeigen den tatsächlich ausgelieferten Stand. Vorhandene Audioquellen aus `AUDIO_LICENSES.md` und Bildherkunft/Ableitungen in einem vollständigen Release-Assetverzeichnis zusammenführen; Lücken einzeln prüfen. Beschreibung und Steuerungsangaben stimmen mit dem Spiel überein.

**Abnahme:** Das geprüfte ZIP, die finalen Medien, Metadaten und das Testprotokoll gehören zur selben Version. Noch offene Portal- oder Geräteprüfungen sind benannt. Der nächste Schritt ist die Einreichung zum Portalreview; eine Annahme wird durch diesen Plan nicht vorweggenommen.

**Optionale Arbeiten nach dem verbindlichen Umfang**

- Kurze klassenbezogene Angriffs-/Reaktionsanimationen für die vorhandenen finalen Hähne. Erst einen Charakter als Muster umsetzen; Silhouette, Loopübergänge und gleichzeitige Bewegung erhalten. Nur übernehmen, wenn der Effekt in normaler Spielgröße sichtbar hilft.
- Weitere Bodenvarianten oder zusätzliche dekorative Landmarken nur nach bestandenem Variantenvergleich und innerhalb des Asset-/Lesbarkeitsbudgets.
- Ein stärker illustriertes Enemy-/EVO-Lexikon, wenn die Erstspielerprüfung dessen Nutzung bestätigt. Die bestehenden zugänglichen Informationen haben Vorrang.

Diese Arbeiten blockieren den ersten Release nicht, solange die konkreten Abnahmekriterien bestanden sind.

**Freigabeentscheidung**

Der Kandidat ist aus eigener Entwicklungssicht einreichungsbereit, wenn alle verbindlichen UI-Mängel behoben sind, die regulären Kampfszenen die Lesbarkeitsprüfung bestehen, alle zugesagten Geräte getestet sind, die betroffenen Regressionstests bestehen und das endgültige Portalpaket samt Medien separat geprüft wurde. Bedingte Art-Änderungen dürfen entfallen, wenn der Vergleich keinen Nutzen zeigt; die Entscheidung wird festgehalten.

Pakete 0 und 1 sind abgeschlossen. Als Nächstes folgt Paket 2 mit Figurenlesbarkeit und Kampfmeldungen. Jeder abgeschlossene Bereich wird anhand derselben Ansichten vor/nach verglichen und als zusammenhängende Änderung geprüft. Bei einer Regression wird nur der betroffene Bereich nachgebessert; zusätzliche Inhalte oder Balanceänderungen werden aus diesem visuellen Release-Pass nicht abgeleitet.

**Lokale Belege aus dem vorangegangenen Audit**

- [Desktop-Menü 960×540](C:/Users/madde/.codex/visualizations/2026/09/30/01a0f435-1ce9-7e52-ade1-581a3dead42a/audit-desktop-play.png)
- [Upgrade-Auswahl mit Primärwaffen-Rang](C:/Users/madde/.codex/visualizations/2026/09/30/01a0f435-1ce9-7e52-ade1-581a3dead42a/audit-desktop-advanced-upgrade.png)
- [Charakterkarten und Porträtzuschnitt](C:/Users/madde/.codex/visualizations/2026/09/30/01a0f435-1ce9-7e52-ade1-581a3dead42a/audit-large-roosters-unlocked.png)
- [Feed Alley im Hochformat](C:/Users/madde/.codex/visualizations/2026/09/30/01a0f435-1ce9-7e52-ade1-581a3dead42a/audit-vertical-run-portrait.png)
- [Vier Angebote in der Boss-Truhe](C:/Users/madde/.codex/visualizations/2026/09/30/01a0f435-1ce9-7e52-ade1-581a3dead42a/audit-desktop-chest.png)
- [Inszenierter Bosszustand mit Meldungsüberdeckung](C:/Users/madde/.codex/visualizations/2026/09/30/01a0f435-1ce9-7e52-ade1-581a3dead42a/audit-desktop-boss.png)

Diese Bilder sind lokale Auditbelege und liegen außerhalb des Git-Repositories. Neue Abnahmebelege aus Paket 0–5 werden gemeinsam mit dem jeweiligen Releasebericht abgelegt.
