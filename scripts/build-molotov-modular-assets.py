#!/usr/bin/env python3
"""Extract and normalize the modular Molotov source atlases."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FX_ROOT = PROJECT_ROOT / "art-source" / "fx" / "molotov-modular"
PROJECTILE_ROOT = PROJECT_ROOT / "art-source" / "projectiles" / "molotov-modular"
CELL_WIDTH = 512
CELL_HEIGHT = 512


def remove_green_background(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    result = Image.new("RGBA", rgb.size)
    pixels = []
    for red, green, blue in rgb.getdata():
        secondary = max(red, blue)
        dominance = green - secondary
        is_chroma = dominance >= 8 and green >= secondary * 1.08
        if is_chroma:
            pixels.append((0, 0, 0, 0))
            continue
        if green > secondary + 8:
            green = secondary + 8
        pixels.append((red, green, blue, 255))
    result.putdata(pixels)
    return result


def normalize_cell(
    atlas: Image.Image,
    index: int,
    canvas_size: tuple[int, int],
    max_visible: tuple[int, int],
) -> Image.Image:
    row, column = divmod(index, 3)
    cell = atlas.crop((
        column * CELL_WIDTH,
        row * CELL_HEIGHT,
        (column + 1) * CELL_WIDTH,
        (row + 1) * CELL_HEIGHT,
    ))
    transparent = remove_green_background(cell)
    transparent.putalpha(transparent.getchannel("A").filter(ImageFilter.MinFilter(5)))
    bounds = transparent.getchannel("A").getbbox()
    if not bounds:
        raise SystemExit(f"Empty atlas cell {index}")
    visible = transparent.crop(bounds)
    scale = min(max_visible[0] / visible.width, max_visible[1] / visible.height)
    resized = visible.convert("RGBa").resize(
        (max(1, round(visible.width * scale)), max(1, round(visible.height * scale))),
        Image.Resampling.LANCZOS,
    ).convert("RGBA")
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (
        (canvas_size[0] - resized.width) // 2,
        (canvas_size[1] - resized.height) // 2,
    ))
    return canvas


def extract(atlas_path: Path, output_root: Path, specs: list[tuple[str, tuple[int, int], tuple[int, int]]]) -> None:
    with Image.open(atlas_path) as atlas:
        if atlas.size != (1536, 1024):
            raise SystemExit(f"Unexpected atlas size for {atlas_path}: {atlas.size}")
        for index, (filename, canvas_size, max_visible) in enumerate(specs):
            output = normalize_cell(atlas, index, canvas_size, max_visible)
            target = output_root / filename
            output.save(target, "PNG", optimize=True)
            print(f"{atlas_path.name} cell {index} -> {target.relative_to(PROJECT_ROOT)}")


def main() -> None:
    extract(
        FX_ROOT / "molotov-ground-atlas-chroma.png",
        FX_ROOT,
        [
            ("molotov-ground-r1.png", (512, 256), (448, 190)),
            ("molotov-ground-r2.png", (512, 256), (458, 198)),
            ("molotov-ground-r3.png", (512, 256), (474, 210)),
            ("molotov-ground-r4.png", (512, 256), (454, 196)),
            ("molotov-ground-evo.png", (512, 256), (474, 218)),
        ],
    )
    extract(
        FX_ROOT / "molotov-emitter-atlas-chroma.png",
        FX_ROOT,
        [
            ("molotov-flame-small.png", (128, 128), (62, 102)),
            ("molotov-flame-medium.png", (128, 128), (90, 106)),
            ("molotov-flame-large.png", (128, 128), (106, 112)),
            ("molotov-embers.png", (128, 128), (102, 102)),
            ("molotov-ignition.png", (192, 192), (172, 172)),
            ("molotov-smoke.png", (192, 192), (170, 170)),
        ],
    )
    extract(
        PROJECTILE_ROOT / "molotov-projectile-atlas-chroma.png",
        PROJECTILE_ROOT,
        [
            ("molotov-egg-r1.png", (128, 128), (94, 110)),
            ("molotov-egg-r2.png", (128, 128), (100, 112)),
            ("molotov-egg-r3.png", (128, 128), (106, 114)),
            ("molotov-egg-r4.png", (128, 128), (106, 114)),
            ("molotov-egg-evo.png", (128, 128), (114, 116)),
        ],
    )


if __name__ == "__main__":
    main()
