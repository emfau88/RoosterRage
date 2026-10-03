"""Cut the authored 3-view kit and bake a four-frame waddle in the existing atlas layout."""
from pathlib import Path
import json, math, hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'art-source/enemies/turbo-goose-v1'; out=ROOT/'src/assets/enemies/portal-v1';out.mkdir(parents=True,exist_ok=True)
kit=Image.open(src/'rig-kit.png').convert('RGBA'); w,h=kit.size
parts={}; frames=[]; report={}
for row,direction in enumerate(['left','down','up']):
    for col,key in enumerate(['body','left-foot','right-foot']):
        xa,xb=[(0,.425),(.445,.63),(.76,.96)][col]
        im=kit.crop((round(w*xa),round(h*row/3),round(w*xb),round(h*(row+1)/3)))
        im=im.crop(im.getchannel('A').getbbox());parts[(direction,key)]=im
        im.save(src/f'{direction}-{key}.png')
def render(direction,phase):
    canvas=Image.new('RGBA',(256,256));a=phase*math.pi/2
    body=parts[(direction,'body')].copy();body.thumbnail((194,174),Image.Resampling.LANCZOS)
    bob=abs(math.sin(a))*3
    # Legs overlap the sockets and are occluded by the torso.
    for i,key in enumerate(['left-foot','right-foot']):
        foot=parts[(direction,key)].copy();foot.thumbnail((38,35),Image.Resampling.LANCZOS)
        step=math.sin(a+i*math.pi)
        x=128+(-15 if i==0 else 15)+(step*8 if direction=='left' else 0)
        y=215+math.cos(a+i*math.pi)*2-max(0,step)*8
        canvas.alpha_composite(foot,(round(x-foot.width/2),round(y-foot.height)))
    canvas.alpha_composite(body,(round(128-body.width/2),round(191-body.height-bob)))
    return canvas
atlas=Image.new('RGBA',(1024,1024))
for row,direction in enumerate(['left','right','up','down']):
    clip=[]
    for phase in range(4):
        im=render('left' if direction=='right' else direction,phase)
        if direction=='right':im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        clip.append(im);atlas.alpha_composite(im,(phase*256,row*256))
    report[direction]={'bounds':[im.getchannel('A').getbbox() for im in clip],
      'distinctFrames':len({hashlib.sha256(im.tobytes()).hexdigest() for im in clip})}
    assert report[direction]['distinctFrames']==4
    assert all(min(b[0],b[1],256-b[2],256-b[3])>=12 for b in report[direction]['bounds'])
    clip[0].save(src/f'{direction}-walk.gif',save_all=True,append_images=clip[1:],duration=83,loop=0,disposal=2)
atlas.save(out/'enemy-turbo-goose-run.webp',lossless=True)
(src/'manifest.json').write_text(json.dumps({'frameSize':256,'rows':['left','right','up','down'],'frames':4,'frameRate':12,'checks':report},indent=2))
print('Turbo Goose atlas: 16 distinct, padded frames; old Talon atlas retained.')
