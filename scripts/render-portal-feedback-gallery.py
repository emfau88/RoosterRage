"""Lay out captured screenshots; never retouch the game or generated artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'docs/qa/portal-feedback'
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/arial.ttf',n)
sections=[('portraits','Rooster-Portraits','Die freigegebenen Spielfiguren sind jetzt auch im Menü erkennbar. Mehr Abstand zeigt Kamm und Ausrüstung; die bisherige Nahaufnahme war zu dominant.'),
 ('pickups','Kleine Welt-Pickups','44 statt 63 Welteinheiten, ohne weißen Sticker-Rand. Sanftes Schweben und Bodenschatten statt dauerndem Drehen: Die Symbole bleiben erkennbar.'),
 ('elite','Erstes Elite-Muster','Die Turbo-Gans passt besser zum Humor und hat eine eigene Silhouette. Die goldene Champion-Variante ist allein noch keine ausreichende Elite-Vielfalt. Zwei weitere eigenständige Typen bleiben offen.'),
 ('icons','Eindeutige Upgrade-Icons','Krit, Abprallen, Rückstoß und Wiederbelebung haben eigene Symbole. Auch die drei Primärwaffen bekommen getrennte Icons. Der bestehende Atlas bleibt für andere Inhalte erhalten.'),
 ('destruction','Material statt Universalexplosion','Kisten zerfallen in Holzsplitter, Heu in kurze Halme. Kurze Effekte und ein festes Limit halten Warnzonen lesbar. Kein zusätzlicher AOE-Schaden.'),
 ('reward','Belohnungen','Truhenfarben unterscheiden die Herkunft des Rewards. Die Öffnung dauert 520 statt 760 ms und läuft über das zentrale Pausesystem. Keine zusätzliche Vergabe und keine neue Währung.'),
 ('result','Ergebnis und Fortschritt','Kernels und neue Freischaltungen zuerst; Build danach, Kampfdaten einklappbar. Die Rückkehraktion bleibt erreichbar. Das Bild verwendet in beiden Versionen denselben QA-Beispielbericht.')]
html=['<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Portal-Polish – Vorher / Nachher</title><style>body{margin:0;background:#101c22;color:#e6eee9;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:24px}h1,h2{color:#f2cf7b}nav{display:flex;gap:14px;flex-wrap:wrap}a{color:#8bd7e7}section{margin:42px 0;padding:20px;background:#18282d;border-radius:14px}img{max-width:100%;height:auto;display:block;border-radius:8px}.mobile{max-width:820px}p{max-width:980px}small{color:#b2c1b9}figure{margin:20px 0}summary{cursor:pointer}.walk{width:720px}</style><main><h1>Portal-Polish: Vorher / Nachher</h1><p>Lokaler geprüfter Entwurf. Links: Basis d776dd1. Rechts: aktueller Stand. Jeder Direktvergleich ist eine einzelne Bilddatei. Die ursprünglichen Assets bleiben erhalten.</p><nav>']
for key,title,note in sections:html.append(f'<a href="#{key}">{title}</a>')
html.append('</nav>')
for key,title,note in sections:
    html.append(f'<section id="{key}"><h2>{title}</h2><p>{note}</p>')
    for width in [1440,390]:
        left=Image.open(QA/f'{key}-{width}-before.png').convert('RGB');right=Image.open(QA/f'{key}-{width}-after.png').convert('RGB')
        gap=16;head=56;board=Image.new('RGB',(left.width+right.width+gap,max(left.height,right.height)+head),'#22323a');d=ImageDraw.Draw(board)
        d.text((16,13),'VORHER',font=font(23),fill='#fff1ce');d.text((left.width+gap+16,13),'NACHHER',font=font(23),fill='#fff1ce')
        board.paste(left,(0,head));board.paste(right,(left.width+gap,head));name=f'{key}-{width}-vergleich.webp';board.save(QA/name,quality=92)
        html.append(f'<figure class="{"mobile" if width==390 else "desktop"}"><figcaption>{"Mobil hochkant" if width==390 else "Desktop"} · <a href="{name}" target="_blank">Originalgröße öffnen</a></figcaption><img src="{name}" loading="lazy" alt="{title}: Vorher links, nachher rechts"></figure>')
    if key=='elite':
        old=Image.open(ROOT/'src/assets/enemies/animations/enemy-elite-runner-run.webp').convert('RGBA');new=Image.open(ROOT/'src/assets/enemies/portal-v1/enemy-turbo-goose-run.webp').convert('RGBA');animation=[]
        for i in range(4):
            b=Image.new('RGB',(720,340),'#263832');d=ImageDraw.Draw(b);d.text((22,10),'ALTER TALON',font=font(22),fill='#fff1ce');d.text((382,10),'TURBO-GANS',font=font(22),fill='#fff1ce')
            for c,im in enumerate([old,new]):
                frame=im.crop((i*256,0,(i+1)*256,256));b.paste(frame,(52+c*360,68),frame)
            animation.append(b)
        animation[0].save(QA/'elite-walk-vergleich.gif',save_all=True,append_images=animation[1:],duration=83,loop=0)
        html.append('<figure><figcaption>Isolierte Laufanimation, gleiche Frame-Größe</figcaption><img class="walk" src="elite-walk-vergleich.gif" alt="Alte und neue Elite-Laufanimation nebeneinander"></figure>')
    html.append('</section>')
html.append('<p>Offen: Elite-Vielfalt, echtes Mobilgeräte-/Erstspielerfeedback, optionale AOE-/Combo-Experimente. Keine pauschale Release-Freigabe. <a href="../../PORTAL_FEEDBACK_POLISH_PLAN_2026-10-03.md">Umsetzungsplan</a></p></main></html>')
(QA/'index.html').write_text(''.join(html),encoding='utf-8')
print('Seven before/after topics, desktop and portrait, plus one animated comparison.')
