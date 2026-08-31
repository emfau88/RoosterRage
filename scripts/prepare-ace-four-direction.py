"""Package the authored Ace direction kits without repainting the artwork."""

from pathlib import Path
import hashlib
import json

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/ace-production-v1/generated"
OUTPUT = ROOT / "src/assets/characters/ace-four-direction"

DIRECTIONS = {
    "south": {
        "source": "south-parts-alpha-v2.png",
        "split": 650,
        "parts": ("body", "wing-left", "wing-right", "foot-left", "foot-right", "action-wing"),
    },
    "west": {
        "source": "west-parts-alpha-v1.png",
        "split": 620,
        "parts": ("body", "wing-near", "wing-far", "foot-near", "foot-far", "tail"),
    },
    "north": {
        "source": "north-parts-alpha-v1.png",
        "split": 620,
        "parts": ("body", "wing-left", "wing-right", None, None, "tail"),
    },
}


def crop_part(source, rect):
    cell = source.crop(rect)
    bbox = cell.getchannel("A").point(lambda alpha: 255 if alpha > 8 else 0).getbbox()
    if not bbox:
        raise ValueError(f"Empty component at {rect}")
    bbox = (
        max(0, bbox[0] - 3), max(0, bbox[1] - 3),
        min(cell.width, bbox[2] + 3), min(cell.height, bbox[3] + 3),
    )
    return cell.crop(bbox), (rect[0] + bbox[0], rect[1] + bbox[1])


def main():
    manifest = {"version": 1, "frameSize": 256, "eastDerivedFrom": "west-mirrored", "directions": {}}
    for direction, config in DIRECTIONS.items():
        source_path = SOURCE / config["source"]
        source = Image.open(source_path).convert("RGBA")
        if source.size != (1536, 1024) or source.getchannel("A").getextrema() != (0, 255):
            raise ValueError(f"Invalid authored source: {source_path}")
        split = config["split"]
        rects = (
            (0, 0, 512, split), (512, 0, 1024, split), (1024, 0, 1536, split),
            (0, split, 512, 1024), (512, split, 1024, 1024), (1024, split, 1536, 1024),
        )
        direction_dir = OUTPUT / direction
        direction_dir.mkdir(parents=True, exist_ok=True)
        entry = {"source": config["source"], "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(), "parts": {}}
        for name, rect in zip(config["parts"], rects):
            if name is None:
                continue
            part, origin = crop_part(source, rect)
            path = direction_dir / f"{name}.webp"
            part.save(path, lossless=True, method=6)
            entry["parts"][name] = {
                "width": part.width, "height": part.height,
                "sourceRect": [origin[0], origin[1], part.width, part.height],
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        manifest["directions"][direction] = entry

    complete_legs_source_path = SOURCE / "north-complete-legs-alpha-v1.png"
    complete_legs_source = Image.open(complete_legs_source_path).convert("RGBA")
    north_entry = manifest["directions"]["north"]
    for name, rect in (("leg-left", (0, 0, 768, 1024)), ("leg-right", (768, 0, 1536, 1024))):
        leg_part, origin = crop_part(complete_legs_source, rect)
        path = OUTPUT / "north" / f"{name}.webp"
        leg_part.save(path, lossless=True, method=6)
        north_entry["parts"][name] = {
            "width": leg_part.width, "height": leg_part.height,
            "source": "north-complete-legs-alpha-v1.png",
            "sourceRect": [origin[0], origin[1], leg_part.width, leg_part.height],
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
