from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/qa/molotov-boundary'
RAW = ROOT / 'test-results/molotov-boundary/frames'
FONT = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 22)
SMALL = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 17)
STAGES = [('r1', 'Stufe 1', '4 → 32 Flammen'), ('r2', 'Stufe 2', '6 → 40 Flammen'),
          ('r3', 'Stufe 3', '8 → 48 Flammen'), ('r4', 'Stufe 4', '2 × 5 → 2 × 42 Flammen'),
          ('evo', 'Evolution', '2 × 6 → 2 × 56 Flammen')]

for stage, label, count in STAGES:
    for width in (960, 390):
        size = (640, 360) if width == 960 else (390, 844)
        canvas = Image.new('RGB', (size[0] * 2 + 36, size[1] + 118), '#101c22')
        draw = ImageDraw.Draw(canvas)
        draw.text((18, 12), f'{label} · {count}', font=FONT, fill='#ffe4a0')
        for column, version in enumerate(('before', 'after')):
            source = RAW / f'{stage}-{width}-{version}.png'
            # Accept the first captured frames from the QA directory as well.
            if not source.exists(): source = OUT / source.name
            image = Image.open(source).convert('RGB')
            image.save(OUT / f'{stage}-{width}-{version}.webp', quality=84)
            image = image.resize(size, Image.Resampling.LANCZOS)
            x = 12 + column * (size[0] + 12)
            draw.text((x, 51), 'VORHER' if column == 0 else 'NACHHER', font=SMALL, fill='#ecf2f4')
            canvas.paste(image, (x, 80))
        draw.text((18, size[1] + 91), 'Identischer Radius, Schaden und Dauer · gleiche Kamera und Animationsphase', font=SMALL, fill='#bdcdd2')
        canvas.save(OUT / f'{stage}-{width}-vergleich.webp', quality=88)

cards = '\n'.join(f'<section><h2>{label} — {count}</h2><img src="{stage}-960-vergleich.webp" alt="{label}: vorher und nachher"><details><summary>Mobil im Hochformat</summary><img src="{stage}-390-vergleich.webp" alt="Mobiler Direktvergleich {label}"></details></section>' for stage, label, count in STAGES)
html = f'''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Molotov – Brandfläche vorher / nachher</title><style>body{{margin:0;background:#101c22;color:#ecf2f4;font:17px/1.55 system-ui}}main{{max-width:1280px;margin:auto;padding:24px}}h1,h2{{color:#ffe4a0}}section{{margin:32px 0}}img{{display:block;width:100%;height:auto;border-radius:12px}}details{{margin-top:12px}}details img{{max-width:816px;margin:16px auto}}a{{color:#a4dfff}}</style><main><h1>Molotov: klare Brandflächen ab Stufe 1</h1><p>Jeder Vergleich zeigt vorher und nachher auf einem Bild. Bestehende Flammensprites, unveränderte Schadenswerte und identische Kameraposition. Die ursprüngliche ovale Bodenperspektive bleibt erhalten; nur die Flammenbesiedlung wird dichter.</p>{cards}<h2>Beurteilung</h2><p>Schon auf Stufe 1 füllen viele unterschiedlich große Flammen Rand und Mitte, ohne große Leerflächen. Stufe 2 und 3 verdichten die Fläche; Stufe 4 zeigt zwei blaue Felder und die Evolution zwei größere, dichtere Felder. Die Evolution darf im Hochformat über die Kamera hinausreichen: Der Weltbereich wird nicht künstlich verkleinert.</p><p>Die bewusst dezente Bodenmarkierung unterstützt die Flammen. Zusätzliche Rauchwolken oder Screen-Blitze würden Gegner und Geschosse verdecken und sind für dieses Ziel kein besserer Weg. Die vorhandene Perspektive passt weiterhin zur Spielgrafik und wurde beibehalten.</p><p><a href="README.md">Prüfung und Grenzen</a> · <a href="checks.json">Technische Messwerte</a></p></main></html>'''
(OUT / 'index.html').write_text(html, encoding='utf-8')
print('Molotov comparisons rendered: five stages × desktop and portrait.')
