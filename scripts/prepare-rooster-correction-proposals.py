from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "qa" / "rooster-correction-proposals"
CHARACTERS = ROOT / "src" / "assets" / "characters"


def is_generated_background(pixel: tuple[int, int, int]) -> bool:
    """Match the neutral checkerboard baked into the generated previews."""
    high = min(pixel) >= 236
    neutral = max(pixel) - min(pixel) <= 14
    return high and neutral


def extract_connected_background(source: Path, destination: Path) -> Image.Image:
    image = Image.open(source).convert("RGB")
    width, height = image.size
    pixels = image.load()
    exterior = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        offset = y * width + x
        if not exterior[offset] and is_generated_background(pixels[x, y]):
            exterior[offset] = 1
            queue.append((x, y))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            offset = ny * width + nx
            if exterior[offset] or not is_generated_background(pixels[nx, ny]):
                continue
            exterior[offset] = 1
            queue.append((nx, ny))

    result = image.convert("RGBA")
    result_pixels = result.load()
    for y in range(height):
        for x in range(width):
            if exterior[y * width + x]:
                red, green, blue, _ = result_pixels[x, y]
                result_pixels[x, y] = (red, green, blue, 0)
    result.save(destination)
    return result


def fit_subject(image: Image.Image, destination: Path) -> None:
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError(f"No subject found in {destination.name}")
    subject = image.crop(bounds)
    scale = min(454 / subject.width, 454 / subject.height)
    target_size = (round(subject.width * scale), round(subject.height * scale))
    subject = subject.resize(target_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    x = (512 - subject.width) // 2
    y = 486 - subject.height
    canvas.alpha_composite(subject, (x, y))
    canvas.save(destination)


def subject_x_ranges(image: Image.Image) -> list[tuple[int, int]]:
    alpha = image.getchannel("A")
    width, height = image.size
    occupied = [alpha.crop((x, 0, x + 1, height)).getbbox() is not None for x in range(width)]
    ranges: list[tuple[int, int]] = []
    start: int | None = None
    for x, present in enumerate((*occupied, False)):
        if present and start is None:
            start = x
        elif not present and start is not None:
            if x - start > 24:
                ranges.append((start, x))
            start = None
    if len(ranges) != 3:
        raise RuntimeError(f"Expected three separated turnaround subjects, found {ranges}")
    return ranges


def split_turnaround(image: Image.Image, prefix: str, directions: tuple[str, str, str]) -> None:
    _, height = image.size
    for direction, (left, right) in zip(directions, subject_x_ranges(image), strict=True):
        panel = image.crop((max(0, left - 4), 0, min(image.width, right + 4), height))
        fit_subject(panel, OUT / f"{prefix}-{direction}-concept-v1.png")


def old_turnaround(sheet_path: Path, destination: Path, side_row: int) -> None:
    sheet = Image.open(sheet_path).convert("RGBA")
    frames = [sheet.crop((0, row * 256, 256, row * 256 + 256)) for row in (0, side_row, 3)]
    canvas = Image.new("RGBA", (768, 256), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        canvas.alpha_composite(frame, (index * 256, 0))
    canvas.save(destination)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bummbert = extract_connected_background(
        OUT / "bummbert-corrected-turnaround-v1.png",
        OUT / "bummbert-corrected-turnaround-v1-alpha.png",
    )
    blitzkamm = extract_connected_background(
        OUT / "blitzkamm-corrected-turnaround-v1.png",
        OUT / "blitzkamm-corrected-turnaround-v1-alpha.png",
    )
    split_turnaround(bummbert, "bummbert", ("south", "west", "north"))
    split_turnaround(blitzkamm, "blitzkamm", ("south", "east", "north"))
    blitzkamm_east = extract_connected_background(
        OUT / "blitzkamm-east-corrected-v1.png",
        OUT / "blitzkamm-east-corrected-v1-alpha.png",
    )
    fit_subject(blitzkamm_east, OUT / "blitzkamm-east-concept-v1.png")
    old_turnaround(
        CHARACTERS / "rooster-artillery-walk-v3.webp",
        OUT / "bummbert-original-turnaround.png",
        side_row=1,
    )
    old_turnaround(
        CHARACTERS / "rooster-storm-walk-v3.webp",
        OUT / "blitzkamm-original-turnaround.png",
        side_row=1,
    )


if __name__ == "__main__":
    main()
