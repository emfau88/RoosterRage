"""Export menu artwork from the preserved Imagegen originals, retaining alpha."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/ui/menu-preview-v1'
OUTPUT = ROOT / 'src/assets/ui/menu-preview-v1'
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = []
for name in ['farm-sunset', 'rooster-rage-logo', 'rooster-ace-fullbody-v1',
             'rooster-artillery-fullbody-v1', 'rooster-storm-fullbody-v1']:
    source = SOURCE / f'{name}.png'
    target = OUTPUT / f'{name}.webp'
    with Image.open(source) as original:
        image = original.convert('RGBA')
        if name == 'farm-sunset':
            image.thumbnail((1600, 900), Image.Resampling.LANCZOS)
        elif name == 'rooster-rage-logo':
            image = image.crop(image.getchannel('A').getbbox())
            image.thumbnail((960, 960), Image.Resampling.LANCZOS)
        else:
            image = image.resize((512, 512), Image.Resampling.LANCZOS)
        image.save(target, format='WEBP', quality=84 if name in ['farm-sunset', 'rooster-rage-logo'] else 88, method=6)
        manifest.append({'source': source.relative_to(ROOT).as_posix(),
                         'runtime': target.relative_to(ROOT).as_posix(),
                         'size': list(image.size), 'bytes': target.stat().st_size,
                         'sourceSha256': sha256(source.read_bytes()).hexdigest(),
                         'runtimeSha256': sha256(target.read_bytes()).hexdigest()})
(SOURCE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f'Menu artwork: {sum(asset["bytes"] for asset in manifest)} bytes.')
