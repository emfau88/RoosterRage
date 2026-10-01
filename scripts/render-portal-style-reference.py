"""Compose existing assets and production captures into a QA reference, not new game art."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/qa/portal-package-0'
BOARD = Image.new('RGB', (1600, 1160), '#101b20')
DRAW = ImageDraw.Draw(BOARD)
FONT = Path('C:/Windows/Fonts/segoeui.ttf')
BOLD = Path('C:/Windows/Fonts/segoeuib.ttf')
def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)
def text(x, y, value, size=20, color='#e5e9df', bold=False):
    DRAW.text((x, y), value, font=font(size, bold), fill=color)
def tile(x, y, w, h, title, caption):
    DRAW.rounded_rectangle((x,y,x+w,y+h), radius=14, fill='#18292e', outline='#596348', width=1)
    text(x+18,y+12,title,22,bold=True)
    text(x+18,y+h-36,caption,16,color='#bbc7c5')
def place(img, box):
    x,y,w,h=box
    img=ImageOps.contain(img.convert('RGBA'), (w,h), Image.Resampling.LANCZOS)
    BOARD.paste(img, (x+(w-img.width)//2,y+(h-img.height)//2), img)
def asset(relative, frame=False):
    img=Image.open(ROOT / relative).convert('RGBA')
    if frame: img=img.crop((0,0,256,256))
    bbox=img.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
    return img.crop(bbox) if bbox else img

text(28,18,'ROOSTER RAGE / PAKET 0',30,color='#ffd35c',bold=True)
text(28,58,'Bestehende Release-Assets und WebGL-Aufnahmen · keine neuen Spielgrafiken',21)
text(28,92,'Figuren/Props vergrößert. Verbindliche Zielregeln und Quellen: STYLE_REFERENCE.md',18,color='#bbc7c5')
metrics=[]
for index, (rooster,label) in enumerate([('ace','Barnyard Ace'),('artillery','Boombardier'),('storm','Stormcrest')]):
    x=28+index*393
    tile(x,138,377,292,label,'Finale Südansicht · Idle, Frame 0')
    relative=f'src/assets/characters/{rooster}-final/rooster-{rooster}-final-idle.webp'
    img=Image.open(ROOT / relative).convert('RGBA').crop((0,0,256,256))
    bbox=img.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
    metrics.append({'id':rooster,'frame':'south-idle-0','alphaThreshold':16,'alphaBounds':bbox,'visibleHeightPixels':bbox[3]-bbox[1]})
    place(img.crop(bbox),(x+25,181,327,202))
x=1207
tile(x,138,365,292,'Porträt','Stormcrest · bestehendes Vollbild')
place(asset('src/assets/characters/rooster-storm-portrait.webp'),(x+40,181,285,202))

tile(28,446,377,266,'Gegner','Runner · Animationsframe 0')
place(asset('src/assets/enemies/animations/enemy-runner-run.webp',True),(70,491,290,166))
tile(421,446,377,266,'Bodenkontakt / Materialien','Kiste und Heuballen · Originalassets')
place(asset('src/assets/map/arena-crate.webp'),(445,500,155,147))
place(asset('src/assets/map/arena-bale.webp'),(613,500,160,147))
tile(814,446,365,266,'Ruhiger Boden','Harvest Yard · unveränderte Quelle')
place(Image.open(ROOT / 'src/assets/map/arena-ground-farm.webp'),(835,491,323,172))
tile(1207,446,365,266,'Map-Kontrast','Feed Alley / Coop Square · Quellen')
place(Image.open(ROOT / 'src/assets/map/arena-ground-road.webp'),(1222,491,162,172))
place(Image.open(ROOT / 'src/assets/map/coop-square-ground.webp'),(1390,491,162,172))

tile(28,728,770,335,'HUD und Spielfeld','Produktionsaufnahme: regulärer Ace-Run, Wave 1')
place(Image.open(OUT / 'runs/ace-yard/wave-01.png'),(45,773,736,240))
tile(814,728,758,335,'Upgrade-Karte und Rahmen','Produktionsaufnahme: UI-Fixture, 960 × 540')
img=Image.open(OUT / 'desktop-queued-level-up.png').crop((150,0,814,295))
place(img,(832,773,720,240))
for index,(name,color) in enumerate([('Spieler','#fff3b0'),('Gefahr','#ff3048'),('Heilung','#65ef8b'),('Belohnung','#ffd35c'),('EVO','#ffe16a')]):
    x=28+index*311
    DRAW.rounded_rectangle((x,1090,x+24,1114),radius=5,fill=color)
    text(x+34,1089,name,20)
BOARD.save(OUT / 'style-reference.png', optimize=True)
(OUT / 'sprite-alpha-bounds.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
print(OUT / 'style-reference.png')
