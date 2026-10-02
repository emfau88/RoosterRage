"""Extract immutable authored components; no per-frame drawing or generation."""
from collections import deque
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/characters/artillery-mascot-v1/generated'
OUTPUT = ROOT / 'art-source/characters/artillery-mascot-v1/parts'
# Source regions are explicit, reviewed pixel rectangles, not inferred per frame.
RECTS = {
 'head':(0,45,425,459),'comb':(425,25,811,430),'body':(805,48,1280,478),
 'wing-left':(0,463,423,871),'wing-right':(430,463,829,871),'tail':(820,478,1280,831),
 'foot-left':(0,892,423,1260),'foot-right':(427,892,829,1260),
}


def largest_component(image):
    """Ignore disconnected atlas neighbours; retain the source edge alpha."""
    width, height = image.size
    data = bytearray(image.getchannel('A').point(lambda a: 255 if a >= 16 else 0).tobytes())
    largest = []
    for start in range(len(data)):
        if not data[start]:
            continue
        data[start] = 0
        queue, component = deque([start]), []
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            for other in (index-1 if x else -1, index+1 if x+1<width else -1,
                          index-width if y else -1, index+width if y+1<height else -1):
                if other >= 0 and data[other]:
                    data[other] = 0
                    queue.append(other)
        if len(component) > len(largest):
            largest = component
    if len(largest) < 1000:
        raise ValueError('Missing or incomplete component')
    mask_data = bytearray(width*height)
    for index in largest:
        mask_data[index] = 255
    mask = Image.frombytes('L', image.size, bytes(mask_data)).filter(ImageFilter.MaxFilter(7))
    result = image.copy()
    result.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
    box = result.getchannel('A').point(lambda a: 255 if a >= 8 else 0).getbbox()
    return result.crop(box), box

def main():
    manifest = {'version': 1, 'parts': {}, 'directions': ['south','west','north'], 'east': 'exact mirror of west'}
    for direction in manifest['directions']:
        source = SOURCE / f'{direction}-kit.png'
        atlas = Image.open(source).convert('RGBA')
        if atlas.width != atlas.height or atlas.getchannel('A').getextrema() != (0,255):
            raise ValueError(f'Unexpected source atlas: {source}')
        for name, rect in RECTS.items():
            part_source, part_atlas = source, atlas
            if name == 'tail':
                part_source=SOURCE/'tail-fan.png';part_atlas=Image.open(part_source).convert('RGBA')
                column=0 if direction=='west' else 1
                rect=(round(column*part_atlas.width/2),0,round((column+1)*part_atlas.width/2),part_atlas.height)
            else:
                rect = tuple(round(value * part_atlas.width / 1280) for value in rect)
            part, box = largest_component(part_atlas.crop(rect))
            output = OUTPUT / direction / f'{name}.png'
            output.parent.mkdir(parents=True, exist_ok=True)
            part.save(output, optimize=True)
            manifest['parts'][f'{direction}/{name}'] = {
                'file': output.relative_to(ROOT).as_posix(), 'width':part.width,'height':part.height,
                'source': part_source.relative_to(ROOT).as_posix(),
                'sourceSha256':hashlib.sha256(part_source.read_bytes()).hexdigest(),
                'sourceRect':[rect[0]+box[0],rect[1]+box[1],rect[0]+box[2],rect[1]+box[3]],
                'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
            }
    (OUTPUT.parent / 'parts.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'parts':len(manifest['parts']),'output':str(OUTPUT)}))

if __name__ == '__main__':
    main()
