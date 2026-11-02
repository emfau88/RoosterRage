# Freigegebene Effekte und neues Ladebild – 02.11.2026

Die bestätigten Auren und Raketen-Einschläge sind jetzt im Spiel eingebaut. Das neu mit ImageGen erzeugte, vollständige Rooster-Trio ersetzt die abgeschnittenen Einzelporträts im Ladebildschirm. Die separaten Entwurfsvergleiche bleiben erhalten.

## Verhalten

- Sechs animierte Auren, einschließlich der größeren Heil- und Boss-Varianten. Bodenlicht liegt unter Hindernissen; aufsteigende Stränge und Partikel bewegen sich hinter und vor den Figuren. Gegnerwechsel im Pool, Tod, Pause und Neustart räumen die Darstellung korrekt auf.
- R1–R4 und EVO nutzen die freigegebenen Comic-Flipbooks mit identischer X-/Y-Skalierung. Zeitversetzte Cluster, Druckwellen, Staub, Splitter und Glut unterscheiden die Stufen. Die bisherigen Schadenswerte, Radien und Cluster-Verzögerungen bleiben erhalten. Eine Begrenzung auf zwölf gleichzeitige Effektinstanzen betrifft ausschließlich die Darstellung.
- Das neue Ladebild ist eine eigene, gemeinsam gezeichnete Illustration mit vollständigen Körpern, Füßen und transparentem Rand. Quelle und beide ImageGen-Prompts liegen unter `art-source/ui/menu-preview-v1/`; die WebP-Datei wird mit `object-fit: contain` eingebunden.
- Die frühere interne 19-MiB-Abbruchgrenze wurde nach Rücksprache durch eine 150-MB-Plausibilitätsgrenze ersetzt. Das ist ausdrücklich keine Behauptung über Portal-Uploadlimits. Die Effektgrafiken wurden dafür nicht verkleinert oder verlustbehaftet neu komprimiert.

## Durchgeführte Prüfungen

- 17 Unit-Tests für Build-Fortsetzung, Kongregate, öffentliche Rooster-Auswahl und gespeicherte Skins bestanden.
- Vollständiges Release-Gate am gebauten Kongregate-Paket bestanden: Start im verschachtelten Iframe, blockierter Speicher, Kongregate-SDK verfügbar/ausgefallen, Sieg/Niederlage/Neustart ohne doppelte Statistikmeldungen, Sound, Auren, Ebenen, alle neuen Impacts, Raketenflug, Größenwechsel/Vollbild, Elite-Balance, Pickups und Bombeneffekte.
- Auren in WebGL und Canvas: sechs Stile, Pause, Mitbewegung, 50 Pool-Wiederverwendungen, feste Todeswarnung und unveränderte Buff-Reichweite.
- Impacts in WebGL und Canvas: alle fünf Stufen, 24 unbeschnittene Frames, gleichmäßige Skalierung, unveränderte Haupt-/Clusterschäden, Pause, Ablauf, Instanzbegrenzung und Szenenneustart.
- Zusätzlicher Raketen-/Support-Lauf in beiden Renderern: vollständige Einziel-Salven, neue Zielsuche bei Gegner-Wiederverwendung, Startposition beim bewegten Spieler, animierte Triebwerke, zurückbleibender Rauch, Aufräumen, alle sechs Support-Chick-Stufen einschließlich Slow-Ende und tatsächlicher Upgrade-Auswahl im HUD.
- Ladebild bei 1280×800, 960×540, 390×844, 844×390 und 320×568: keine abgeschnittene Darstellung; der tatsächlich angehaltene Ladevorgang setzt sich bis zum Hauptmenü fort.
- Y8: neun Unit-Tests, Werbepausen im echten Spiel bei Desktop-/Handygröße und neun Produktions-Iframe-Szenarien einschließlich echtem SDK-CDN-Start bestanden. SDK-Ausfall, ausbleibende Bereitschaft, Auth-Fehler, blockierter Speicher, fehlende Werbung und Anzeigenfehler verhindern den Spielstart nicht.
- Beide ZIP-Archive enthalten exakt die jeweils 161 Dateien des getesteten Builds; alle entpackten Bytes wurden verglichen. Neue Impact-Atlanten, Triebwerk-Flipbook und Ladebild sind in beiden Archiven enthalten. Dateigrößen und SHA-256 stehen in `packages.json`.

## Sichtprüfung

Tatsächlich angesehen wurden die sechs Auren auf dem Spieluntergrund, die Einschläge bei 40, 180, 360, 650 und 1100 ms sowie überlagerte EVO-Einschläge. Figurenmaßstab, vollständige Konturen, unverzerrte Flammen, offener EVO-Kern und Abklingen passen zur bestätigten Fassung. Der Ladebildschirm wurde auf Desktop, Hochformat und kurzem Querformat angesehen. Die beigefügten PNGs sind Aufnahmen aus dem Spiel bzw. dem echten Ladebildschirm, keine nachgezeichneten Mockups.

Die Testumgebung verwendete Chromium Headless Shell 1234. Die ersten Entwicklungsdurchläufe hatten lokale Netzwerkunterbrechungen mit einem anderen Browser; die dokumentierten finalen Durchläufe sind vollständig bestanden. Ein Rauch-Test wurde auf eine frische Rauchwolke umgestellt, weil die älteste während des Messfensters bereits korrekt ablaufen konnte.

## Paketstand und Grenzen

Beide Updatepakete sind technisch zum Hochladen vorbereitet. Der Upload und die Veröffentlichung wurden nicht ausgeführt. Anmeldung eines echten Portalspielers, tatsächliche Werbeauslieferung und die veröffentlichte Portal-Einbettung sind erst dort abschließend prüfbar; die lokalen Tests ersetzen diese Live-Vorschau nicht.

Die bereits vor diesem Auftrag vorhandenen Y8-SDK-/Werbe-/Build-Vorarbeiten wurden für den Y8-Test und das Y8-Paket verwendet und nicht als neue visuelle Änderung ausgegeben. Sie bleiben getrennt von diesem Commit. Das Y8-Buildprotokoll weist den Arbeitsbaum deshalb korrekt als nicht vollständig committed aus. Der frühere Y8-Build vom 16.10. bleibt erhalten; das neue Paket trägt das Datum 02.11.2026. Die Quellen der neuen Optik sind über `source-hashes.json` identifiziert.

Es gab keine festgestellte Regression in den beschriebenen Prüfungen. Ein vollständiger Test jedes möglichen Spielverlaufs und jeder Hardwarekonfiguration ist damit nicht behauptet.
