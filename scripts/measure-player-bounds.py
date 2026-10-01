"""Measure every shipped player pose at alpha >= 16, without transparent padding."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', default='test-results/combat-readability')
args = parser.parse_args()
output = (root / args.output).resolve()
if not output.is_relative_to(root):
    raise ValueError('Output must stay inside the project')
frames, envelopes, sources = [], {}, []
for rooster in ['ace', 'artillery', 'storm']:
    top, bottom = 256, 0
    for pose in ['idle', 'walk']:
        source = root / f'src/assets/characters/{rooster}-final/rooster-{rooster}-final-{pose}.webp'
        sources.append({'path': source.relative_to(root).as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
        with Image.open(source) as image:
            image = image.convert('RGBA')
            for row in range(image.height // 256):
                for col in range(image.width // 256):
                    frame = image.crop((col*256, row*256, (col+1)*256, (row+1)*256))
                    bounds = frame.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
                    frames.append({'rooster': rooster, 'pose': pose, 'frame': row*(image.width//256)+col, 'bounds': bounds})
                    top, bottom = min(top, bounds[1]), max(bottom, bounds[3])
    envelopes[rooster] = {'top': top, 'bottom': bottom}
authored = (root / 'src/data/playerVisualBounds.js').read_text()
expected = json.loads(authored.split('export const PLAYER_VISUAL_BOUNDS = ', 1)[1].strip().rstrip(';'))
if envelopes != expected:
    raise ValueError(f'Player contact envelopes need updating: {envelopes}')
output.mkdir(parents=True, exist_ok=True)
(output / 'sprite-bounds.json').write_text(json.dumps({'alphaThreshold': 16, 'frames': frames, 'envelopes': envelopes, 'sources': sources}, indent=2)+'\n')
print(f'Measured {len(frames)} player frames; contact envelopes match production data.')
