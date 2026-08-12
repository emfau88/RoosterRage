# Enemy Projectile Visual Hierarchy

Status: umgesetzt und technisch abgenommen.

## Normale Flugprojektile

- kleine Kontur: Projektilradius plus 2 Welteinheiten
- 1 px Warnlinie mit 40 Prozent Deckkraft
- kein pulsierender Warnring
- deutlicher, gerichteter Elementfarben-Trail hinter dem Projektil
- Trail-Grunddeckkraft 40 Prozent, sofern ein Angriff keinen eigenen Wert setzt

## Schwere Projektile und Bossangriffe

- großer Warnring: Projektilradius plus 9 Welteinheiten
- 4 px rote Warnlinie mit 96 Prozent Deckkraft
- pulsierende Silhouette und kräftigerer Effekt bleiben erhalten

## Unverändert dominant

- Charge-Telegraphs
- Bossattacken
- schwere Projektile
- große AoE- und Explosionsgefahren

Damit kennzeichnet kräftiges Rot wieder eine bevorstehende oder besonders
schwere Gefahr. Normale bereits fliegende Projektile bleiben durch Körper,
Bewegungsschweif und eine ruhige Kontur lesbar.
