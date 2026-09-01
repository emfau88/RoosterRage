"""Key and package Bummbert's authored direction kits into immutable rig parts."""

from pathlib import Path
import hashlib
import json

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/artillery-production-v1/generated"
OUTPUT = ROOT / "src/assets/characters/artillery-four-direction"

SHEETS = {
    "south": ("south-parts-chroma-v1.png", "south-parts-alpha-v1.png"),
    "west": ("west-parts-chroma-v1.png", "west-parts-alpha-v1.png"),
    "north": ("north-parts-chroma-v1.png", "north-parts-alpha-v1.png"),
    "north-legs": ("north-legs-chroma-v2.png", "north-legs-alpha-v2.png"),
}


def remove_green_background(source: Image.Image) -> Image.Image:
    """Remove generated chroma green and neutralize its colour spill."""
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
    # Generated chroma masters occasionally contain one-pixel dark or saturated
    # scan lines. An opening breaks those lines before component selection; the
    # final dilated support mask restores the authored anti-aliased edge.
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
    if not bbox:
        raise ValueError(f"Empty component at {rect}")
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
    SOURCE.mkdir(parents=True, exist_ok=True)
    for key, (chroma_name, alpha_name) in SHEETS.items():
        chroma_path = SOURCE / chroma_name
        chroma = Image.open(chroma_path).convert("RGB")
        if chroma.size != (1536, 1024):
            raise ValueError(f"Unexpected generated canvas size: {chroma_path}: {chroma.size}")
        alpha = remove_green_background(chroma)
        alpha_path = SOURCE / alpha_name
        alpha.save(alpha_path, optimize=True)
        alpha_sources[key] = alpha

    manifest = {
        "version": 1,
        "frameSize": 256,
        "eastDerivedFrom": "west-mirrored",
        "directions": {
            direction: {"parts": {}} for direction in ("south", "west", "north")
        },
    }

    cell_width = 512
    layouts = {
        "south": {
            "split": 530,
            "parts": ("body", "wing-left", "wing-right", "leg-left", "leg-right", "action-wing"),
        },
        "west": {
            "split": 540,
            "parts": ("body", "wing-near", "wing-far", "leg-near", "leg-far", "tail"),
        },
        "north": {
            "split": 545,
            "parts": ("body", "wing-left", "wing-right", None, None, "tail"),
        },
    }
    for direction, layout in layouts.items():
        split = layout["split"]
        rects = (
            (0, 0, cell_width, split),
            (cell_width, 0, cell_width * 2, split),
            (cell_width * 2, 0, cell_width * 3, split),
            (0, split, cell_width, 1024),
            (cell_width, split, cell_width * 2, 1024),
            (cell_width * 2, split, cell_width * 3, 1024),
        )
        source_name = SHEETS[direction][1]
        for name, rect in zip(layout["parts"], rects):
            if name:
                save_part(manifest, direction, name, source_name, alpha_sources[direction], rect)

    north_legs = alpha_sources["north-legs"]
    north_legs_name = SHEETS["north-legs"][1]
    save_part(manifest, "north", "leg-left", north_legs_name, north_legs, (0, 0, 768, 1024))
    save_part(manifest, "north", "leg-right", north_legs_name, north_legs, (768, 0, 1536, 1024))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
