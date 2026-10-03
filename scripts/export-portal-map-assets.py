"""Normalize generated art for runtime export; preserve every original asset."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/map/portal-v3'
RUNTIME = ROOT / 'src/assets/map/portal-v3'
RUNTIME.mkdir(parents=True, exist_ok=True)
manifest_path = ROOT / 'src/assets/runtime-assets.json'
manifest = json.loads(manifest_path.read_text())
entries = {entry['runtime']: entry for entry in manifest['assets']}

for name in ['crate', 'bale', 'ground-a', 'ground-b', 'ground-c']:
    generated = Image.open(SOURCE / f'{name}-generated.png').convert('RGBA')
    if name in ['crate', 'bale']:
        original = Image.open(ROOT / f'src/assets/map/arena-{name}.webp').convert('RGBA')
        bounds = original.getchannel('A').point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
        # Ignore nearly transparent generator fringes when matching the real
        # footprint. Otherwise the visible prop shrinks inside its collider.
        generated_bounds = generated.getchannel('A').point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
        generated = generated.crop(generated_bounds)
        generated = generated.resize((bounds[2] - bounds[0], bounds[3] - bounds[1]), Image.Resampling.LANCZOS)
        normalized = Image.new('RGBA', original.size)
        normalized.alpha_composite(generated, bounds[:2])
    else:
        normalized = generated.resize((700, 700), Image.Resampling.LANCZOS)
    source = SOURCE / f'{name}.png'
    runtime = RUNTIME / f'{name}.webp'
    normalized.save(source, 'PNG', optimize=True)
    normalized.save(runtime, 'WEBP', quality=88, method=6, alpha_quality=100)
    entry = {'source': source.relative_to(ROOT).as_posix(),
             'sourceSha256': sha256(source.read_bytes()).hexdigest(),
             'runtime': runtime.relative_to(ROOT).as_posix(),
             'runtimeSha256': sha256(runtime.read_bytes()).hexdigest(),
             'width': normalized.width, 'height': normalized.height,
             'bytes': runtime.stat().st_size}
    entries[entry['runtime']] = entry
    print(f"{name}: {normalized.size}, {entry['bytes']} bytes")
manifest['assets'] = list(entries.values())
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='ascii')
