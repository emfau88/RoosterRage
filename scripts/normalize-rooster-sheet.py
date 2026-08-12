#!/usr/bin/env python3
"""Normalize a 4x4 RGBA rooster sheet to stable 256px gameplay frames."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


GRID_SIZE = 4
FRAME_SIZE = 256
TARGET_SIZE = GRID_SIZE * FRAME_SIZE
MAX_SPRITE_WIDTH = 206
MAX_SPRITE_HEIGHT = 218
FOOTLINE_Y = 240
WEBP_QUALITY = 92


def clear_hidden_rgb(source: Image.Image) -> Image.Image:
    """Zero RGB in transparent pixels before any crop or resampling work."""
    result = source.convert("RGBA")
    result.putdata([
        (0, 0, 0, 0) if alpha == 0 else (red, green, blue, alpha)
        for red, green, blue, alpha in result.getdata()
    ])
    return result


def remove_checker_background(source: Image.Image) -> Image.Image:
    """Remove a connected neutral checker backdrop without touching enclosed whites."""
    rgb = source.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    background = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def is_checker(x: int, y: int) -> bool:
        red, green, blue = pixels[x, y]
        return min(red, green, blue) >= 150 and max(red, green, blue) - min(red, green, blue) <= 18

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if background[index] or not is_checker(x, y):
            return
        background[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for index, value in enumerate(background):
        if value:
            alpha_pixels[index % width, index // width] = 0
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    result = source.convert("RGBA")
    result.putalpha(alpha)
    return result


def cell_edges(length: int) -> list[int]:
    return [round(index * length / GRID_SIZE) for index in range(GRID_SIZE + 1)]


def extract_sprites(source: Image.Image) -> list[Image.Image]:
    x_edges = cell_edges(source.width)
    y_edges = cell_edges(source.height)
    sprites: list[Image.Image] = []
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            cell = source.crop((
                x_edges[column],
                y_edges[row],
                x_edges[column + 1],
                y_edges[row + 1],
            ))
            bounds = cell.getchannel("A").getbbox()
            if bounds is None:
                raise ValueError(f"Empty sprite cell at row {row + 1}, column {column + 1}")
            sprites.append(cell.crop(bounds))
    return sprites


def compose_sheet(sprites: list[Image.Image]) -> tuple[Image.Image, float]:
    scale = min(
        MAX_SPRITE_WIDTH / max(sprite.width for sprite in sprites),
        MAX_SPRITE_HEIGHT / max(sprite.height for sprite in sprites),
    )
    sheet = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    for index, sprite in enumerate(sprites):
        row, column = divmod(index, GRID_SIZE)
        size = (
            max(1, round(sprite.width * scale)),
            max(1, round(sprite.height * scale)),
        )
        # Resize premultiplied RGBA so fully transparent generator pixels cannot
        # bleed hidden chroma/artifact colours into the visible sprite edge.
        resized = sprite.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")
        x = column * FRAME_SIZE + (FRAME_SIZE - resized.width) // 2
        y = row * FRAME_SIZE + FOOTLINE_Y - resized.height
        sheet.alpha_composite(resized, (x, y))
    return sheet, scale


def apply_reference_mask(sheet: Image.Image, reference: Image.Image) -> Image.Image:
    allowed_sheet = Image.new("L", sheet.size, 0)
    reference_alpha = reference.getchannel("A")
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            y0, y1 = row * FRAME_SIZE, (row + 1) * FRAME_SIZE
            x0, x1 = column * FRAME_SIZE, (column + 1) * FRAME_SIZE
            allowed = reference_alpha.crop((x0, y0, x1, y1))
            allowed = allowed.point(lambda value: 255 if value > 16 else 0)
            allowed = allowed.filter(ImageFilter.MaxFilter(7))
            allowed_sheet.paste(allowed, (x0, y0))
    result = sheet.copy()
    result.putalpha(ImageChops.multiply(result.getchannel("A"), allowed_sheet))
    return result


def normalize(
    source_path: Path,
    output_path: Path,
    remove_checker: bool = False,
    mask_reference: Path | None = None,
) -> None:
    source = Image.open(source_path)
    source = remove_checker_background(source) if remove_checker else source.convert("RGBA")
    source = clear_hidden_rgb(source)
    sprites = extract_sprites(source)
    sheet, scale = compose_sheet(sprites)
    if mask_reference:
        reference_source = Image.open(mask_reference).convert("RGBA")
        reference_sheet, _ = compose_sheet(extract_sprites(reference_source))
        sheet = apply_reference_mask(sheet, reference_sheet)
    # Canonicalize fully transparent pixels. WebP may otherwise preserve the
    # generator's hidden RGB blocks even though their alpha is zero.
    sheet = Image.alpha_composite(Image.new("RGBA", sheet.size, (0, 0, 0, 0)), sheet)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"Wrote {output_path} ({TARGET_SIZE}x{TARGET_SIZE}, scale={scale:.4f})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--remove-checker", action="store_true")
    parser.add_argument("--mask-reference", type=Path)
    args = parser.parse_args()
    normalize(args.input, args.output, args.remove_checker, args.mask_reference)


if __name__ == "__main__":
    main()
