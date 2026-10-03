"""Resize and encode generated backdrops; portraits remain separate, unchanged assets."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/ui/portrait-backdrops-v1'
OUTPUT = ROOT / 'src/assets/ui/portrait-backdrops-v1'
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = []
for rooster in ['ace', 'artillery', 'storm']:
    source = SOURCE / f'{rooster}.png'
    target = OUTPUT / f'{rooster}.webp'
    with Image.open(source) as original:
        image = original.convert('RGB')
        image.thumbnail((1024, 576), Image.Resampling.LANCZOS)
        image.save(target, quality=88, method=6)
        manifest.append({'rooster': rooster, 'source': source.relative_to(ROOT).as_posix(),
                         'runtime': target.relative_to(ROOT).as_posix(), 'size': list(image.size),
                         'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                         'runtimeSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                         'bytes': target.stat().st_size})
(SOURCE / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f'Three independent portrait backdrops exported: {sum(a["bytes"] for a in manifest)} bytes.')
