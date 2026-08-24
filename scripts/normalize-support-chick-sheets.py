#!/usr/bin/env python3
"""Convert generated 4x4 Support Chick sheets into stable transparent game assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


GRID_SIZE = 4
FRAME_SIZE = 256
TARGET_SIZE = GRID_SIZE * FRAME_SIZE
MAX_WIDTH = 188
MAX_HEIGHT = 202
FOOTLINE_Y = 230
WEBP_QUALITY = 94


def remove_green_background(source: Image.Image) -> Image.Image:
    """Key the generated green backdrop with a soft, despilled edge."""
    rgb = source.convert("RGB")
    result = Image.new("RGBA", rgb.size)
    output = []
    for red, green, blue in rgb.getdata():
        secondary = max(red, blue)
        dominance = green - secondary
        # Key even dark green pixels. The generated backdrop has a mild
        # gradient, so absolute brightness is not a reliable discriminator.
        # Authored yellow has red >= green and cyan has blue >= green.
        alpha = 0 if dominance >= 16 and green >= secondary * 1.1 else 255

        if alpha == 0:
            output.append((0, 0, 0, 0))
            continue

        # Green pixels remaining on a soft antialiased edge are spill from the
        # chroma backdrop, not authored plumage or cyan equipment.
        if green > secondary + 10:
            green = secondary + 10
        output.append((red, green, blue, alpha))
    result.putdata(output)
    return result


def cell_edges(length: int) -> list[int]:
    return [round(index * length / GRID_SIZE) for index in range(GRID_SIZE + 1)]


def extract_frames(source: Image.Image) -> list[Image.Image]:
    x_edges = cell_edges(source.width)
    y_edges = cell_edges(source.height)
    frames = []
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            cell = source.crop((
                x_edges[column],
                y_edges[row],
                x_edges[column + 1],
                y_edges[row + 1],
            ))
            bounds = cell.getchannel("A").getbbox()
            if not bounds:
                raise SystemExit(f"Empty frame at row {row + 1}, column {column + 1}")
            frames.append(cell.crop(bounds))
    return frames


def compose_sheet(frames: list[Image.Image]) -> Image.Image:
    scale = min(
        MAX_WIDTH / max(frame.width for frame in frames),
        MAX_HEIGHT / max(frame.height for frame in frames),
    )
    sheet = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        row, column = divmod(index, GRID_SIZE)
        resized = frame.convert("RGBa").resize(
            (
                max(1, round(frame.width * scale)),
                max(1, round(frame.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        ).convert("RGBA")
        x = column * FRAME_SIZE + (FRAME_SIZE - resized.width) // 2
        y = row * FRAME_SIZE + FOOTLINE_Y - resized.height
        sheet.alpha_composite(resized, (x, y))
    return Image.alpha_composite(Image.new("RGBA", sheet.size), sheet)


def validate(sheet: Image.Image) -> None:
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            cell = sheet.crop((
                column * FRAME_SIZE,
                row * FRAME_SIZE,
                (column + 1) * FRAME_SIZE,
                (row + 1) * FRAME_SIZE,
            ))
            bounds = cell.getchannel("A").getbbox()
            if not bounds:
                raise SystemExit(f"Empty normalized frame at row {row + 1}, column {column + 1}")
            left, top, right, bottom = bounds
            if bottom != FOOTLINE_Y:
                raise SystemExit(f"Footline drift at row {row + 1}, column {column + 1}: {bottom}")
            if min(left, top, FRAME_SIZE - right, FRAME_SIZE - bottom) < 12:
                raise SystemExit(f"Unsafe frame margin at row {row + 1}, column {column + 1}")


def normalize(source_path: Path, png_path: Path, webp_path: Path) -> None:
    with Image.open(source_path) as source:
        transparent = remove_green_background(source)
    sheet = compose_sheet(extract_frames(transparent))
    validate(sheet)
    png_path.parent.mkdir(parents=True, exist_ok=True)
    webp_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(png_path, "PNG", optimize=True)
    sheet.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"{source_path.name} -> {webp_path} ({TARGET_SIZE}x{TARGET_SIZE})")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("png", type=Path)
    parser.add_argument("webp", type=Path)
    args = parser.parse_args()
    normalize(args.source, args.png, args.webp)


if __name__ == "__main__":
    main()
