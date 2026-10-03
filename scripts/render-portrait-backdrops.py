"""Arrange screenshots side by side without retouching the artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / 'docs/qa/portrait-backdrops-v1'
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 23)
html = ['<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Portrait-Hintergründe: Direktvergleich</title><style>body{background:#101c22;color:#eee;font:16px/1.5 system-ui;margin:24px}main{max-width:1500px;margin:auto}img{max-width:100%;height:auto}a{color:#8bd7e7}section{margin:30px 0}h1{color:#f2cf7b}</style><main><h1>Portrait-Hintergründe</h1><p>Links die freigegebenen neuen Porträts ohne Hintergrund, rechts dieselben Figuren mit Hintergrund. Größe, Ausschnitt und Position sind identisch. Die Hintergründe liegen als separate Assets hinter den transparenten Figuren.</p>']
for width, label in [(1440,'Desktop'), (390,'Handy hochkant'), (844,'Handy quer')]:
    left = Image.open(QA / f'portraits-{width}-before.png').convert('RGB')
    right = Image.open(QA / f'portraits-{width}-after.png').convert('RGB')
    board = Image.new('RGB', (left.width+right.width+16, left.height+56), '#22323a')
    draw = ImageDraw.Draw(board)
    draw.text((16,13), 'OHNE HINTERGRUND', font=font, fill='#fff1ce')
    draw.text((left.width+32,13), 'MIT HINTERGRUND', font=font, fill='#fff1ce')
    board.paste(left,(0,56)); board.paste(right,(left.width+16,56))
    name = f'portraits-{width}-vergleich.webp'
    board.save(QA/name, quality=92)
    html.append(f'<section><h2>{label}</h2><a href="{name}">Originalgröße</a><img src="{name}" alt="Neue Portraits ohne und mit Hintergrund direkt nebeneinander"></section>')
html.append('<p>Bewertung: Der Hintergrund gibt den Karten Tiefe und verbindet sie mit der Farmwelt. Die Figuren behalten Luft um Kamm und Ausrüstung. Ruhige Mitten und gedeckte Ränder halten den Blick auf dem Charakter. Ace: goldenes Farmlicht; Boombardier: warme Scheune; Stormcrest: blauer Sturmhimmel.</p><p><a href="../portal-feedback/index.html">Gesamter Portal-Polish-Vergleich</a></p></main></html>')
(QA/'index.html').write_text(''.join(html), encoding='utf-8')
print('Three single-image portrait backdrop comparisons rendered.')
