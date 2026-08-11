from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


CELL_SIZE = 256
GRID_SIZE = 4
PADDING = 14
BASELINE = 238


def find_content_bands(alpha: Image.Image, axis: str) -> list[tuple[int, int]]:
    """Return contiguous occupied bands along one axis of an alpha image."""
    length = alpha.width if axis == "x" else alpha.height
    occupied = []
    for position in range(length):
        strip = (
            alpha.crop((position, 0, position + 1, alpha.height))
            if axis == "x"
            else alpha.crop((0, position, alpha.width, position + 1))
        )
        occupied.append(strip.getbbox() is not None)

    bands = []
    start = None
    for position, has_content in enumerate(occupied + [False]):
        if has_content and start is None:
            start = position
        elif not has_content and start is not None:
            bands.append((start, position))
            start = None
    return bands


def split_frames(source: Image.Image) -> list[list[Image.Image]]:
    alpha = source.getchannel("A")
    column_bands = find_content_bands(alpha, "x")
    row_bands = find_content_bands(alpha, "y")
    use_content_grid = (
        len(column_bands) == GRID_SIZE and len(row_bands) == GRID_SIZE
    )

    rows = []
    for row in range(GRID_SIZE):
        frames = []
        for column in range(GRID_SIZE):
            if use_content_grid:
                left, right = column_bands[column]
                top, bottom = row_bands[row]
            else:
                left = round(column * source.width / GRID_SIZE)
                right = round((column + 1) * source.width / GRID_SIZE)
                top = round(row * source.height / GRID_SIZE)
                bottom = round((row + 1) * source.height / GRID_SIZE)
            cell = source.crop((left, top, right, bottom))
            bounds = cell.getchannel("A").getbbox()
            if not bounds:
                raise SystemExit(f"Empty frame at row {row}, column {column}")
            frames.append(cell.crop(bounds))
        rows.append(frames)
    return rows


def normalize_sheet(source_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as source_file:
        rows = split_frames(source_file.convert("RGBA"))

    sheet = Image.new(
        "RGBA",
        (CELL_SIZE * GRID_SIZE, CELL_SIZE * GRID_SIZE),
        (0, 0, 0, 0),
    )
    for row_index, frames in enumerate(rows):
        max_width = max(frame.width for frame in frames)
        max_height = max(frame.height for frame in frames)
        scale = min(
            (CELL_SIZE - PADDING * 2) / max_width,
            (BASELINE - PADDING) / max_height,
        )
        for column, frame in enumerate(frames):
            resized = frame.resize(
                (
                    max(1, round(frame.width * scale)),
                    max(1, round(frame.height * scale)),
                ),
                Image.Resampling.LANCZOS,
            )
            x = column * CELL_SIZE + (CELL_SIZE - resized.width) // 2
            y = row_index * CELL_SIZE + BASELINE - resized.height
            sheet.alpha_composite(resized, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, "PNG", optimize=True)
    print(f"{source_path} -> {output_path} ({sheet.width}x{sheet.height})")


def main() -> None:
    parser = ArgumentParser(
        description="Center and baseline-normalize a 4x4 directional enemy sheet"
    )
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    normalize_sheet(args.source, args.output)


if __name__ == "__main__":
    main()
