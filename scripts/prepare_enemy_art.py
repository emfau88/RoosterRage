from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


CELL_SIZE = 256
FRAME_COUNT = 4
MARGIN = 12
BASELINE = 238


def build_sheet(source_path: Path, output_path: Path) -> None:
    with Image.open(source_path) as source:
        source = source.convert("RGBA")
        panel_width = source.width / FRAME_COUNT
        frames = []
        bounds = []
        for index in range(FRAME_COUNT):
            left = round(index * panel_width)
            right = round((index + 1) * panel_width)
            frame = source.crop((left, 0, right, source.height))
            alpha_bounds = frame.getchannel("A").getbbox()
            if not alpha_bounds:
                raise SystemExit(f"Frame {index} in {source_path} is empty")
            frames.append(frame.crop(alpha_bounds))
            bounds.append(alpha_bounds)

    max_width = max(frame.width for frame in frames)
    max_height = max(frame.height for frame in frames)
    scale = min(
        (CELL_SIZE - MARGIN * 2) / max_width,
        (CELL_SIZE - MARGIN - (CELL_SIZE - BASELINE)) / max_height,
    )
    sheet = Image.new("RGBA", (CELL_SIZE * FRAME_COUNT, CELL_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        resized = frame.resize(
            (max(1, round(frame.width * scale)), max(1, round(frame.height * scale))),
            Image.Resampling.LANCZOS,
        )
        x = index * CELL_SIZE + (CELL_SIZE - resized.width) // 2
        y = BASELINE - resized.height
        sheet.alpha_composite(resized, (x, y))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, "PNG", optimize=True)
    print(f"{source_path} -> {output_path} ({sheet.width}x{sheet.height})")


def main() -> None:
    parser = ArgumentParser(description="Normalize a four-pose enemy source into a Phaser sprite sheet")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build_sheet(args.source, args.output)


if __name__ == "__main__":
    main()
