"""Key and package Blitzkamm's authored direction kits into immutable rig parts."""

from pathlib import Path
import hashlib
import json

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/storm-production-v1/generated"
OUTPUT = ROOT / "src/assets/characters/storm-four-direction"

SHEETS = {
    "south": ("south-parts-chroma-v1.png", "south-parts-alpha-v1.png"),
    "east": ("east-parts-chroma-v1.png", "east-parts-alpha-v1.png"),
    "north": ("north-parts-chroma-v1.png", "north-parts-alpha-v1.png"),
}


def remove_green_background(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    result = Image.new("RGBA", rgb.size)
    output = []
    for red, green, blue in rgb.getdata():
        secondary = max(red, blue)
        dominance = green - secondary
        if dominance >= 15 and green >= secondary * 1.085:
            output.append((0, 0, 0, 0))
            continue
        if green > secondary + 9:
            green = secondary + 9
        output.append((red, green, blue, 255))
    result.putdata(output)
    return result


def crop_part(source: Image.Image, rect: tuple[int, int, int, int]):
    cell = source.crop(rect)
    original_alpha = cell.getchannel("A")
    alpha = original_alpha.point(lambda value: 255 if value else 0)
    alpha = alpha.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    pixels = alpha.load()
    width, height = alpha.size
    seen = set()
    largest = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in seen:
                continue
            component = []
            queue = [(x, y)]
            seen.add((x, y))
            while queue:
                current_x, current_y = queue.pop()
                component.append((current_x, current_y))
                for next_x, next_y in (
                    (current_x - 1, current_y), (current_x + 1, current_y),
                    (current_x, current_y - 1), (current_x, current_y + 1),
                ):
                    if (
                        0 <= next_x < width and 0 <= next_y < height
                        and pixels[next_x, next_y] != 0
                        and (next_x, next_y) not in seen
                    ):
                        seen.add((next_x, next_y))
                        queue.append((next_x, next_y))
            if len(component) > len(largest):
                largest = component
    if not largest:
        raise ValueError(f"Empty component at {rect}")
    clean_alpha = Image.new("L", cell.size)
    clean_pixels = clean_alpha.load()
    for x, y in largest:
        clean_pixels[x, y] = 255
    support = clean_alpha.filter(ImageFilter.MaxFilter(9))
    cell.putalpha(ImageChops.multiply(original_alpha, support))
    bbox = cell.getchannel("A").getbbox()
    bbox = (
        max(0, bbox[0] - 4), max(0, bbox[1] - 4),
        min(cell.width, bbox[2] + 4), min(cell.height, bbox[3] + 4),
    )
    return cell.crop(bbox), (rect[0] + bbox[0], rect[1] + bbox[1])


def save_part(manifest, direction, name, source_name, source, rect):
    part, origin = crop_part(source, rect)
    direction_dir = OUTPUT / direction
    direction_dir.mkdir(parents=True, exist_ok=True)
    path = direction_dir / f"{name}.webp"
    part.save(path, lossless=True, method=6)
    manifest["directions"][direction]["parts"][name] = {
        "width": part.width,
        "height": part.height,
        "source": source_name,
        "sourceRect": [origin[0], origin[1], part.width, part.height],
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def main():
    alpha_sources = {}
    for key, (chroma_name, alpha_name) in SHEETS.items():
        chroma_path = SOURCE / chroma_name
        chroma = Image.open(chroma_path).convert("RGB")
        if chroma.size != (1536, 1024):
            raise ValueError(f"Unexpected generated canvas size: {chroma_path}: {chroma.size}")
        alpha = remove_green_background(chroma)
        alpha.save(SOURCE / alpha_name, optimize=True)
        alpha_sources[key] = alpha

    manifest = {
        "version": 1,
        "frameSize": 256,
        "westDerivedFrom": "east-mirrored",
        "directions": {direction: {"parts": {}} for direction in ("south", "east", "north")},
    }
    layouts = {
        "south": (545, ("body", "wing-left", "wing-right", "leg-left", "leg-right", "action-wing")),
        "east": (550, ("body", "wing-near", "wing-far", "leg-near", "leg-far", "tail")),
        "north": (535, ("body", "wing-left", "wing-right", "leg-left", "leg-right", "tail")),
    }
    for direction, (split, names) in layouts.items():
        rects = (
            (0, 0, 512, split), (512, 0, 1024, split), (1024, 0, 1536, split),
            (0, split, 512, 1024), (512, split, 1024, 1024), (1024, split, 1536, 1024),
        )
        source_name = SHEETS[direction][1]
        for name, rect in zip(names, rects):
            save_part(manifest, direction, name, source_name, alpha_sources[direction], rect)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
