"""Deterministic sprite export and portraits composed from approved immutable rigs."""
from pathlib import Path
import json, math
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'src/assets/pickups/portal-v1'; out.mkdir(parents=True,exist_ok=True)
for kind in ['heal','bomb','magnet']:
    source=ROOT/f'art-source/pickups/portal-v1/{kind}.png'
    if not source.exists(): continue
    im=Image.open(source).convert('RGBA')
    box=im.getchannel('A').getbbox()
    sprite=im.crop(box); sprite.thumbnail((224,224),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(256,256)); canvas.alpha_composite(sprite,((256-sprite.width)//2,(256-sprite.height)//2))
    canvas.save(out/f'pickup-{kind}.webp',lossless=True)

portraits=ROOT/'src/assets/characters/portraits-mascot'; portraits.mkdir(parents=True,exist_ok=True)
for rooster in ['ace','storm','artillery']:
    source=ROOT/f'art-source/characters/{rooster}-mascot-v1'
    parts=json.loads((source/'parts.json').read_text())['parts']
    poses=json.loads((source/'poses.json').read_text())['clips']
    pose=next(c for c in poses if c['direction']=='south' and c['mode']=='idle')['frames'][0]
    frame=Image.new('RGBA',(1024,1024))
    for p in pose['parts']:
        im=Image.open(ROOT/parts[p['key']]['file']).convert('RGBA')
        sx,sy=p['width']/im.width*4,p['height']/im.height*4
        c,s=math.cos(p['rotation']),math.sin(p['rotation']); x,y=p['x']*4,p['y']*4
        ox,oy=im.width*p['originX'],im.height*p['originY']
        matrix=(c/sx,s/sx,ox-(c*x+s*y)/sx,-s/sy,c/sy,oy-(-s*x+c*y)/sy)
        layer=im.convert('RGBa').transform(frame.size,Image.Transform.AFFINE,matrix,Image.Resampling.BICUBIC).convert('RGBA')
        frame.alpha_composite(layer)
    # Same square composition for all: comb, face, chest and equipped weapon.
    frame=frame.crop((128,0,896,768)).resize((512,512),Image.Resampling.LANCZOS)
    frame.save(portraits/f'rooster-{rooster}-portrait.webp',lossless=True)
print('Portal pickup exports and mascot portraits prepared; source originals retained.')
