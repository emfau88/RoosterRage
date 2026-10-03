"""Export the authored cutout rigs; bake readable locomotion and attack poses."""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/enemies/portal-elites-v2'
OUTPUT = ROOT / 'src/assets/enemies/portal-v2'
OUTPUT.mkdir(parents=True, exist_ok=True)
DIRECTIONS = ['left', 'right', 'up', 'down']
STATES = ['windup', 'resolve', 'recovery']
manifest = {}

for character, row_edges in [('tank', [0,396,798,1226]), ('chili', [0,415,806,1243])]:
    folder = SOURCE / character
    folder.mkdir(exist_ok=True)
    kit = Image.open(SOURCE / f'{character}-rig-kit.png').convert('RGBA')
    parts = {}
    for row, direction in enumerate(['left', 'down', 'up']):
        for part, (xa,xb) in zip(['body','left-foot','right-foot'], [(0,.433),(.448,.674),(.755,.985)]):
            image = kit.crop((round(kit.width*xa),row_edges[row],round(kit.width*xb),row_edges[row+1]))
            # Ignore barely visible generator specks when measuring a part;
            # retain the original edge alpha in the exported crop.
            bounds = image.getchannel('A').point(lambda a: 255 if a>32 else 0).getbbox()
            assert bounds, (character, direction, part)
            image = image.crop(bounds)
            image.save(folder / f'{direction}-{part}.png')
            if part == 'body': image.thumbnail((208,174) if character=='tank' else (178,181), Image.Resampling.LANCZOS)
            else: image.thumbnail((43,46) if character=='tank' else (35,47), Image.Resampling.LANCZOS)
            parts[(direction,part)] = image

    def render(direction, state, phase):
        source_direction = 'left' if direction=='right' else direction
        image = Image.new('RGBA',(256,256))
        angle = phase*math.pi/2
        sx,sy,bottom = 1,1,204
        foot_lift = [0,0]
        foot_shift = [0,0]
        if state=='walk':
            bottom -= abs(math.sin(angle))*(2 if character=='tank' else 3)
            foot_lift = [max(0,math.sin(angle+i*math.pi))*7 for i in range(2)]
            foot_shift = [math.sin(angle+i*math.pi)*6 for i in range(2)]
        elif character=='tank':
            if state=='windup': sx,sy,bottom = [(1,1,204),(1.035,.96,207),(1.065,.90,211),(1.08,.86,214)][phase]
            elif state=='resolve': sx,sy,bottom = [(.94,1.08,193),(1.12,.80,215),(1.055,.94,208),(1,1,204)][phase]
            else: sx,sy,bottom = [(1.055,.93,209),(1.035,.96,207),(1.012,.99,205),(1,1,204)][phase]
        else:
            if state=='windup': sx,sy,bottom = [(1,1,204),(1.025,1.01,204),(1.065,1.025,204),(1.095,1.035,204)][phase]
            elif state=='resolve': sx,sy,bottom = [(1.09,1.02,204),(.91,1.055,203),(.96,1.02,204),(1,1,204)][phase]
            else: sx,sy,bottom = [(.965,1.01,204),(.98,1.01,204),(.994,1,204),(1,1,204)][phase]
        for i,part in enumerate(['left-foot','right-foot']):
            foot = parts[(source_direction,part)]
            # Shins overlap the body sockets. All feet share a consistent ground line.
            x = 128+(-34 if i==0 else 34)
            if source_direction=='left': x += foot_shift[i]
            y = 227-foot_lift[i]+(math.cos(angle+i*math.pi)*1.5 if state=='walk' else 0)
            image.alpha_composite(foot,(round(x-foot.width/2),round(y-foot.height)))
        body = parts[(source_direction,'body')]
        body = body.resize((round(body.width*sx),round(body.height*sy)),Image.Resampling.LANCZOS)
        image.alpha_composite(body,(round(128-body.width/2),round(bottom-body.height)))
        if direction=='right': image=image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        return image

    checks = {}
    for kind, states in [('run',['walk']),('actions',STATES)]:
        # The right view mirrors the left row at runtime. Keep three unique
        # directions in the download and GPU texture rather than duplicating it.
        atlas = Image.new('RGBA',(256*4*len(states),768))
        for row,direction in enumerate(DIRECTIONS):
            for state_index,state in enumerate(states):
                clip = [render(direction,state,phase) for phase in range(4)]
                bounds = [frame.getchannel('A').getbbox() for frame in clip]
                assert all(min(b[0],b[1],256-b[2],256-b[3]) >= 8 for b in bounds), (character,state,bounds)
                distinct = len({hashlib.sha256(frame.tobytes()).hexdigest() for frame in clip})
                assert distinct==4, (character,state,direction,distinct)
                checks[f'{state}-{direction}']={'bounds':bounds,'distinctFrames':distinct}
                if direction!='right':
                    target_row=['left','up','down'].index(direction)
                    for phase,frame in enumerate(clip):atlas.alpha_composite(frame,((state_index*4+phase)*256,target_row*256))
                if direction=='left':
                    # Neutral opaque stage avoids GIF transparency/disposal artefacts.
                    previews=[]
                    for frame in clip:
                        stage=Image.new('RGB',(256,256),'#253730');stage.paste(frame,(0,0),frame);previews.append(stage)
                    previews[0].save(folder/f'{state}.gif',save_all=True,append_images=previews[1:],duration=140 if state=='windup' else 83,loop=0)
        atlas.save(OUTPUT/f'enemy-{character}-{kind}.webp',quality=84,alpha_quality=70,method=6,exact=True)
    manifest[character]={'frameSize':256,'directions':DIRECTIONS,'atlasRows':['left','up','down'],'mirrorRight':True,'walkFrames':4,'actionFramesPerState':4,
                         'actionStates':STATES,'checks':checks,'sourceSha256':hashlib.sha256((SOURCE/f'{character}-rig-kit.png').read_bytes()).hexdigest()}
(SOURCE/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Two elite rigs exported: four directions, walk and three distinct action states, padded frame bounds checked.')
