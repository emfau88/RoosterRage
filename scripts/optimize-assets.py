from argparse import ArgumentParser
from hashlib import sha256
import json
from pathlib import Path

try:
    from PIL import Image
except ImportError as error:
    raise SystemExit("Pillow is required: python -m pip install Pillow") from error


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "art-source"
RUNTIME_ROOT = PROJECT_ROOT / "src" / "assets"
MANIFEST_PATH = RUNTIME_ROOT / "runtime-assets.json"

RUNTIME_IMAGES = (
    "characters/rooster-walk-v2.png",
    "companions/support-chick-orb.png",
    "enemy-slime.png",
    "enemies/animations/enemy-slime-wobble.png",
    "enemies/animations/enemy-runner-walk.png",
    "enemies/animations/enemy-brute-stomp.png",
    "enemies/animations/enemy-spitter-pulse.png",
    "enemies/animations/enemy-fan-spitter-recoil.png",
    "enemies/animations/enemy-bomber-bob.png",
    "enemies/animations/enemy-elite-runner-walk.png",
    "enemies/animations/enemy-elite-brute-stomp.png",
    "enemies/animations/enemy-elite-spitter-pulse.png",
    "enemies/animations/enemy-boss-heavy.png",
    "fx/fx-atlas-v1-sheet.png",
    "map/arena-ground.png",
    "ui/ui-icons-v1-sheet.png",
)


def target_for(relative_source):
    return (RUNTIME_ROOT / relative_source).with_suffix(".webp")


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def optimize_assets():
    source_bytes = 0
    runtime_bytes = 0
    manifest_assets = []
    for relative_name in RUNTIME_IMAGES:
        source = SOURCE_ROOT / relative_name
        target = target_for(relative_name)
        if not source.exists():
            raise SystemExit(f"Missing source asset: {source.relative_to(PROJECT_ROOT)}")
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            width, height = image.size
            image.save(target, "WEBP", quality=88, method=6, alpha_quality=100)
        source_bytes += source.stat().st_size
        runtime_bytes += target.stat().st_size
        manifest_assets.append({
            "source": source.relative_to(PROJECT_ROOT).as_posix(),
            "sourceSha256": digest(source),
            "runtime": target.relative_to(PROJECT_ROOT).as_posix(),
            "runtimeSha256": digest(target),
            "width": width,
            "height": height,
            "bytes": target.stat().st_size,
        })
        print(f"{source.relative_to(PROJECT_ROOT)} -> {target.relative_to(PROJECT_ROOT)}")
    MANIFEST_PATH.write_text(json.dumps({
        "version": 1,
        "format": "webp",
        "quality": 88,
        "assets": manifest_assets,
    }, indent=2) + "\n", encoding="ascii")
    reduction = 1 - runtime_bytes / source_bytes
    print(f"Runtime images: {source_bytes:,} -> {runtime_bytes:,} bytes ({reduction:.1%} smaller).")


def main():
    parser = ArgumentParser(description="Build optimized Rooster Rage runtime images.")
    parser.parse_args()
    optimize_assets()


if __name__ == "__main__":
    main()
