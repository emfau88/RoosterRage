"""Bake the immutable Storm rig to the existing runtime format and visual QA."""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/characters/storm-mascot-v1'
RUNTIME = ROOT / 'src/assets/characters/storm-mascot'
QA = ROOT / 'docs/qa/storm-mascot-v1'
SIZE, SS = 256, 2
DIRECTIONS = ['south','west','east','north']

def render(pose, images):
    frame = Image.new('RGBA',(SIZE*SS,SIZE*SS))
    for p in pose['parts']:
        source = images[p['key']]
        sx,sy = p['width']/source.width*SS,p['height']/source.height*SS
        c,s=math.cos(p['rotation']),math.sin(p['rotation'])
        x,y=p['x']*SS,p['y']*SS
        ox,oy=source.width*p['originX'],source.height*p['originY']
        matrix=(c/sx,s/sx,ox-(c*x+s*y)/sx,-s/sy,c/sy,oy-(-s*x+c*y)/sy)
        layer=source.convert('RGBa').transform(frame.size,Image.Transform.AFFINE,matrix,Image.Resampling.BICUBIC).convert('RGBA')
        frame.alpha_composite(layer)
    frame=frame.convert('RGBa').resize((SIZE,SIZE),Image.Resampling.LANCZOS).convert('RGBA')
    frame.putalpha(frame.getchannel('A').point(lambda a:0 if a<=12 else a))
    return frame

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def font(size): return ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)

def main():
    RUNTIME.mkdir(parents=True,exist_ok=True); QA.mkdir(parents=True,exist_ok=True)
    source_manifest=json.loads((SOURCE/'parts.json').read_text())
    poses=json.loads((SOURCE/'poses.json').read_text())
    images={key:Image.open(ROOT/spec['file']).convert('RGBA') for key,spec in source_manifest['parts'].items()}
    frames={}; report={'frameSize':256,'origin':[0.5,0.5],'parts':source_manifest['parts'],'clips':{}}
    for clip in poses['clips']:
        key=f"{clip['direction']}-{clip['mode']}"
        baked=[render(pose,images) for pose in clip['frames']]
        boxes=[f.getchannel('A').getbbox() for f in baked]
        if any(not b or min(b[0],b[1],SIZE-b[2],SIZE-b[3])<5 for b in boxes):
            raise ValueError(f'Clipped or empty {key}: {boxes}')
        distinct=len({hashlib.sha256(f.tobytes()).hexdigest() for f in baked})
        if distinct!=8: raise ValueError(f'Non-distinct clip {key}: {distinct}')
        frames[key]=baked
        report['clips'][key]={'frames':8,'distinct':distinct,'bounds':boxes,'durationMs':clip['durationMs']}
        previews=[]
        for f in baked:
            canvas=Image.new('RGB',(320,300),'#22313a');canvas.paste(f,(32,4),f)
            ImageDraw.Draw(canvas).text((16,272),key,font=font(18),fill='#f1ce76');previews.append(canvas)
        previews[0].save(QA/f'{key}.gif',save_all=True,append_images=previews[1:],duration=round(clip['durationMs']/8/10)*10,loop=0,disposal=2)
    manifest={'version':1,'frameWidth':256,'frameHeight':256,'origin':[0.5,0.5],
              'rows':dict(zip(DIRECTIONS,range(4))),'westMirrorsEast':True,'clips':{}}
    for mode in ['idle','walk']:
        sheet=Image.new('RGBA',(2048,1024))
        for row,direction in enumerate(['south','east','east','north']):
            for col,frame in enumerate(frames[f'{direction}-{mode}']): sheet.alpha_composite(frame,(col*SIZE,row*SIZE))
        output=RUNTIME/f'rooster-storm-mascot-{mode}.webp'
        sheet.save(output,quality=94,alpha_quality=100,method=6)
        decoded=Image.open(output).convert('RGBA')
        if decoded.size!=(2048,1024): raise ValueError('Unexpected encoded sheet geometry')
        if decoded.getchannel('A').tobytes()!=sheet.getchannel('A').tobytes():
            raise ValueError('WebP export changed the authored alpha channel')
        manifest['clips'][mode]={'file':output.name,'columns':8,'durationMs':480 if mode=='walk' else 2400,'sha256':digest(output),'bytes':output.stat().st_size,'alphaPreserved':True}
        contact=Image.new('RGB',(1280,760),'#19272e');d=ImageDraw.Draw(contact)
        d.text((16,12),f'STORM MASCOT / {mode.upper()} / 8 PHASES',font=font(24),fill='#f4cf78')
        for row,direction in enumerate(DIRECTIONS):
            for col,frame in enumerate(frames[f'{direction}-{mode}']):
                f=frame.resize((160,160),Image.Resampling.LANCZOS);contact.paste(f,(col*160,54+row*174),f)
            d.text((8,46+row*174),direction,font=font(13),fill='#f4cf78')
        contact.save(QA/f'{mode}-contacts.png')
    for mode in ['idle','walk']:
        # Only three authored directions; west mirrors east in the runtime.
        sheet=Image.new('RGBA',(2048,1536))
        for stage in range(2):
            for row,direction in enumerate(['south','east','north']):
                for col,frame in enumerate(frames[f'{direction}-{mode}-attack-{stage}']):
                    sheet.alpha_composite(frame,(col*SIZE,(stage*3+row)*SIZE))
        output=RUNTIME/f'rooster-storm-mascot-{mode}-attack.webp'
        sheet.save(output,quality=68,alpha_quality=100,method=6)
        if Image.open(output).getchannel('A').tobytes()!=sheet.getchannel('A').tobytes():
            raise ValueError('Attack WebP alpha mismatch')
        manifest['clips'][f'{mode}-attack']={'file':output.name,'columns':8,'stages':2,'rowsPerStage':['south','east','north'],'quality':68,'alphaPreserved':True,'sha256':digest(output),'bytes':output.stat().st_size}
    all_boxes=[b for clip in report['clips'].values() for b in clip['bounds']]
    manifest['alphaBounds']={'left':min(b[0] for b in all_boxes),'top':min(b[1] for b in all_boxes),'right':max(b[2] for b in all_boxes),'bottom':max(b[3] for b in all_boxes)}
    (RUNTIME/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'src/data/stormMascotVisualBounds.js').write_text(
        '// Generated by scripts/render-storm-mascot.py from all eight clips, alpha > 12.\n'
        f"export const STORM_MASCOT_VISUAL_BOUNDS = Object.freeze({{ top: {manifest['alphaBounds']['top']}, bottom: {manifest['alphaBounds']['bottom']} }});\n")
    report['runtime']=manifest
    (QA/'asset-check.json').write_text(json.dumps(report,indent=2)+'\n')
    # Source drawings remain large; this board judges the baked figure at game sizes.
    board=Image.new('RGB',(1100,580),'#344537');draw=ImageDraw.Draw(board)
    draw.text((18,16),'OLD STORM / NEW STORM — SAME FRAME SCALE',font=font(25),fill='#fff1c5')
    old=Image.open(ROOT/'src/assets/characters/storm-final/rooster-storm-final-idle.webp').convert('RGBA')
    for row,direction in enumerate(DIRECTIONS):
        old_frame=old.crop(((0),row*256,256,(row+1)*256))
        if direction=='west': old_frame=old_frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        new_frame=frames[f'{direction}-idle'][0]
        y=65+row*126;draw.text((18,y+35),direction,font=font(17),fill='white')
        for col,size in enumerate([256,70,54,35]):
            for i,frame in enumerate([old_frame,new_frame]):
                f=frame.resize((size,size),Image.Resampling.LANCZOS)
                if size==256: f=frame.resize((112,112),Image.Resampling.LANCZOS)
                x=118+col*242+i*114;board.paste(f,(x,y),f)
    board.save(QA/'scale-comparison.png')
    print(json.dumps(manifest))

if __name__=='__main__': main()
