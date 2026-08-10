# Phase 18 - kommerzielle Validierung

Stand: 10.08.2026

## Entscheidung

Empfohlen wird **Demo plus einmal bezahlte Premium-Vollversion**.

Der aktuelle Slice ist bereits ein hochwertiger kompletter 7-9-Minuten-Run und eignet sich deshalb als kostenlose, klar begrenzte Demo. Die Vollproduktion sollte mehr Akte, Gegner-/Bossvarianten, Rooster und langfristige Challenges liefern und einmalig bezahlt werden. Faire kosmetische Pakete sind erst nach bewiesener Nachfrage eine Option; sie bleiben rein visuell. Werbung, Energie, Gacha, bezahlte Stats, Zufallskisten und absichtlich erzeugte Reibung passen nicht zum skill- und buildbasierten Kern.

Steam beschreibt Demos als kleinen, hochwertigen Ausschnitt, der die Kernmechaniken vermittelt und Lust auf mehr macht; genau diese Rolle erfuellt der Slice. Eine Demo besitzt dort eine eigene App-ID und kann mit einer Coming-Soon-Seite verbunden werden: [Steamworks Demos](https://partner.steamgames.com/doc/store/application/demos?language=english).

Apple verlangt echte In-App-Aufnahmen fuer Screenshots und erlaubt fuer App Previews nur Screen-Capture des Produkts; die vorbereiteten Assets folgen diesem Grundsatz: [App Review Guidelines 2.3.3 und 2.3.4](https://developer.apple.com/app-store/review/guidelines/). Digitale Vollversions-Unlocks in nativen Mobile-Apps muessen die jeweils gueltigen Store-Zahlungsregeln beachten. Das gilt auch fuer Google Play: [Google Play Payments Policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

## Modellvergleich

| Modell | Staerken | Risiken | Urteil |
| --- | --- | --- | --- |
| Reines Premium | klare Erwartung, kein Live-Ops-Zwang, guter Fit zum Kern | unbekannte Marke muss vor Kauf ueberzeugen; weniger Funnel-Daten | fuer die Vollversion geeignet, als erster Kontakt schwach |
| Demo plus Premium | Spielgefuehl beweist sich selbst; Wunschlisten- und Zweitrun-Signal vor grossem Budget | Demo muss bewusst begrenzt bleiben; zwei Store-Artefakte auf Steam | **empfohlen** |
| Kostenlos plus Kosmetik | niedrige Einstiegshuerde; faire optionale Erweiterung moeglich | Content-/Live-Ops-Druck, niedrige Zahlungsquote, Gefahr falscher Prioritaeten | erst nach Produktbeweis, nur kosmetisch |
| Klassisches F2P | hohe Reichweite bei starkem UA/Live Ops | Ads, Energie, Gacha und Grind wuerden den Kern beschaedigen; hoher Betriebsbedarf | ausgeschlossen |

Preis wird nicht vor Nachfragebeweis festgelegt. Fuer Tests dienen nur Bandbreiten: etwa 5,99-9,99 EUR auf Mobile und 9,99-14,99 EUR auf PC fuer eine inhaltlich deutlich groessere Vollversion. Regionale Preise, Store-Gebuehren und Umfang muessen vor Freigabe neu kalkuliert werden.

## Datensparsame Messung

Die Messung ist opt-in und standardmaessig aus. Ohne `VITE_TELEMETRY_ENDPOINT` bleibt sie rein lokal im Arbeitsspeicher und versendet nichts. Einwilligung wird als `granted` oder `denied` lokal gespeichert; Events selbst werden nicht persistent im Browser abgelegt.

Erlaubte Ereignisse:

| Event | Zweck | Minimale Properties |
| --- | --- | --- |
| `hub_viewed` | Demo erreicht | keine |
| `rooster_selected` / `run_started` | Startfunnel und Klassenwahl | Rooster, Challenge, Arena |
| `first_upgrade` | Kernloop verstanden | Upgrade, Wave |
| `evo_obtained` | Build-Hoehepunkt erreicht | EVO, Wave |
| `elite_chest_opened` | Belohnungsschiene genutzt | Upgrade, Wave |
| `boss_reached` | Run-Tiefe | Wave |
| `run_finished` | Abschluss und Pacing | Outcome, Wave, grober 30-s-Zeitbucket, Rooster/Challenge/Arena |
| `second_run_started` | unmittelbarer Wiederholungswunsch | Rooster, Challenge, Arena |
| `wishlist_clicked` | Kaufinteresse | keine |

Gemeinsamer Kontext: zufaellige ID nur fuer die aktuelle Browser-Sitzung, Ereignisreihenfolge, grobe Geraeteklasse, Portrait/Landscape und zweistelliges Sprachkuerzel. Nicht erlaubt: Name, E-Mail, Account, exakte IP-Speicherung, Werbe-ID, dauerhafte Nutzer-ID, Fingerprinting, voller User Agent, genaue Bildschirmmasse oder Freitext.

Der spaetere Endpunkt muss Requests ohne Credentials akzeptieren, IP-Adressen vor Speicherung verwerfen oder kuerzen, Rohdaten hoechstens 30 Tage halten und nur aggregierte Kennzahlen langfristig speichern. Vor oeffentlichem Deploy sind Datenschutzerklaerung, Verantwortlicher, Hosting-Region, Loeschweg und Einwilligungswiderruf zu dokumentieren.

## Go/No-Go-Fenster

Bewertung fruehestens nach vier Wochen oder 300 eingewilligten Demo-Sitzungen, davon mindestens 150 `run_started`. Zusaetzlich muessen die zehn unbeeinflussten Phase-17-Beobachtungen abgeschlossen sein.

| Kennzahl | Go | Beobachten | No-Go / grundlegende Iteration |
| --- | ---: | ---: | ---: |
| Hub -> Run gestartet | >= 75% | 55-74% | < 55% |
| Run abgeschlossen | 35-70% | 25-34% oder 71-80% | < 25% oder > 80% |
| Zweiter Run gestartet | >= 40% | 25-39% | < 25% |
| Boss erreicht | >= 30% | 20-29% | < 20% |
| Wunschliste / Run-Start | >= 7% | 3-6,9% | < 3% |
| Keine Klasse unter allen Starts | >= 20% | 12-19% | < 12% |
| Externe verstehen Upgrade/EVO/Truhe/Boss | >= 70% | 50-69% | < 50% |
| Externe wollen freiwillig einen zweiten Run | >= 50% | 35-49% | < 35% |

**Go Vollproduktion:** beide qualitativen Ziele und mindestens vier der sechs quantitativen Ziele gruen; keine reproduzierbare Blockade oder Crashrate ueber ein Prozent.

**Conditional Go:** qualitative Ziele gruen, aber nur zwei oder drei quantitative Ziele; genau einen vierwoechigen Iterationszyklus an Onboarding, Pacing oder Positionierung finanzieren und erneut messen.

**No-Go/Pivot:** qualitative Ziele verfehlt und hoechstens ein quantitatives Ziel gruen. Keine Ausweitung von Content oder Monetarisierung; zuerst Hook, Lesbarkeit oder Zielgruppe neu entscheiden.

## Noch vor dem oeffentlichen Deploy

1. Manuellen Phase-17-End-to-End-Test und zehn externe Beobachtungen abschliessen.
2. Arbeitsname rechtlich und ueber Domains/Handles freigeben.
3. Telemetrie-Endpunkt, Datenschutzerklaerung, 30-Tage-Loeschung und aggregiertes Dashboard bereitstellen.
4. Store-/Landing-Wishlist-Ziel anschliessen und `wishlist_clicked` nur bei echter Aktion senden.
5. Branch nach Freigabe reviewen, auf `master` mergen und Pages-Workflow beobachten.
6. Erst reale Messwerte eintragen; keine Bot- oder interne Testdaten in Produktentscheidungen mischen.
