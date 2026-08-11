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


def split_row(source: Image.Image) -> list[Image.Image]:
    alpha = source.getchannel("A")
    column_bands = find_content_bands(alpha, "x")
    frames = []
    for column in range(GRID_SIZE):
        if len(column_bands) == GRID_SIZE:
            left, right = column_bands[column]
        else:
            left = round(column * source.width / GRID_SIZE)
            right = round((column + 1) * source.width / GRID_SIZE)
        cell = source.crop((left, 0, right, source.height))
        bounds = cell.getchannel("A").getbbox()
        if not bounds:
            raise SystemExit(f"Empty override frame at column {column}")
        frames.append(cell.crop(bounds))
    return frames


def validate_sheet(sheet: Image.Image) -> None:
    """Fail when a normalized frame can visibly jump or touch its cell edge."""
    for row in range(GRID_SIZE):
        for column in range(GRID_SIZE):
            left = column * CELL_SIZE
            top = row * CELL_SIZE
            cell = sheet.crop((left, top, left + CELL_SIZE, top + CELL_SIZE))
            bounds = cell.getchannel("A").getbbox()
            if not bounds:
                raise SystemExit(f"Empty normalized frame at row {row}, column {column}")
            frame_left, frame_top, frame_right, frame_bottom = bounds
            center = (frame_left + frame_right) / 2
            if abs(center - CELL_SIZE / 2) > 0.5:
                raise SystemExit(
                    f"Off-center frame at row {row}, column {column}: {center:.1f}"
                )
            if frame_bottom != BASELINE:
                raise SystemExit(
                    f"Baseline drift at row {row}, column {column}: {frame_bottom}"
                )
            if min(
                frame_left,
                frame_top,
                CELL_SIZE - frame_right,
                CELL_SIZE - frame_bottom,
            ) < PADDING:
                raise SystemExit(
                    f"Frame touches safety margin at row {row}, column {column}"
                )


def normalize_sheet(
    source_path: Path,
    output_path: Path,
    row_overrides: dict[int, Path] | None = None,
) -> None:
    with Image.open(source_path) as source_file:
        rows = split_frames(source_file.convert("RGBA"))
    for row_index, override_path in (row_overrides or {}).items():
        if not 0 <= row_index < GRID_SIZE:
            raise SystemExit(f"Invalid row override index: {row_index}")
        with Image.open(override_path) as override_file:
            rows[row_index] = split_row(override_file.convert("RGBA"))

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

    validate_sheet(sheet)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, "PNG", optimize=True)
    print(f"{source_path} -> {output_path} ({sheet.width}x{sheet.height})")


def main() -> None:
    parser = ArgumentParser(
        description="Center and baseline-normalize a 4x4 directional enemy sheet"
    )
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--row-override",
        action="append",
        default=[],
        metavar="ROW=PATH",
        help="Replace a zero-based directional row with a horizontal four-frame strip",
    )
    args = parser.parse_args()
    row_overrides = {}
    for override in args.row_override:
        row_text, separator, path_text = override.partition("=")
        if not separator:
            raise SystemExit(f"Invalid row override: {override}")
        row_overrides[int(row_text)] = Path(path_text)
    normalize_sheet(args.source, args.output, row_overrides)


if __name__ == "__main__":
    main()
