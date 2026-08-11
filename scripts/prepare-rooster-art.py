from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CHARACTER_ROOT = PROJECT_ROOT / "art-source" / "characters"
GENERATED_ROOT = CHARACTER_ROOT / "generated"

ROOSTERS = ("ace", "artillery", "storm")
SHEET_SIZE = (1024, 1024)
PORTRAIT_SIZE = (512, 512)
FRAME_SIZE = 256
MAX_CHARACTER_SIZE = (214, 214)
CHARACTER_BASELINE = 232


def resize_rgba(source: Path, target: Path, size: tuple[int, int]) -> None:
    with Image.open(source) as image:
        converted = image.convert("RGBA")
        resized = converted.resize(size, Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        resized.save(target, "PNG", optimize=True)


def crop_character(frame: Image.Image, label: str) -> Image.Image:
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        raise SystemExit(f"Empty source frame {label}")
    return frame.crop(bbox)


def normalize_character(character: Image.Image) -> Image.Image:
    character.thumbnail(MAX_CHARACTER_SIZE, Image.Resampling.LANCZOS)
    if character.width / character.height < 0.78:
        character = character.resize(
            (round(character.height * 0.78), character.height),
            Image.Resampling.LANCZOS,
        )
    return character


def load_optional_strip(source: Path | None) -> Image.Image | None:
    if not source or not source.exists():
        return None
    with Image.open(source) as image:
        return image.convert("RGBA").copy()


def build_normalized_sheet(
    source: Path,
    target: Path,
    south_source: Path | None = None,
    north_source: Path | None = None,
) -> None:
    with Image.open(source) as image:
        converted = image.convert("RGBA")
        direction_strips = {
            0: load_optional_strip(south_source),
            3: load_optional_strip(north_source),
        }
        sheet = Image.new("RGBA", SHEET_SIZE, (0, 0, 0, 0))
        for index in range(16):
            column = index % 4
            row = index // 4
            strip = direction_strips.get(row)
            frame_source = strip if strip is not None else converted
            source_rows = 1 if strip is not None else 4
            source_row = 0 if strip is not None else row
            left = round(column * frame_source.width / 4)
            top = round(source_row * frame_source.height / source_rows)
            right = round((column + 1) * frame_source.width / 4)
            bottom = round((source_row + 1) * frame_source.height / source_rows)
            raw_frame = frame_source.crop((left, top, right, bottom))
            character = normalize_character(crop_character(raw_frame, f"{index} in {source}"))
            x = column * FRAME_SIZE + (FRAME_SIZE - character.width) // 2
            y = row * FRAME_SIZE + CHARACTER_BASELINE - character.height
            sheet.alpha_composite(character, (x, y))
        target.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(target, "PNG", optimize=True)


def validate_sheet(path: Path) -> list[dict[str, int | float]]:
    with Image.open(path) as image:
        if image.size != SHEET_SIZE or image.mode != "RGBA":
            raise SystemExit(f"Invalid sheet format: {path} is {image.mode} {image.size}")
        alpha = image.getchannel("A")
        frame_metrics = []
        for index in range(16):
            column = index % 4
            row = index // 4
            frame = alpha.crop((
                column * FRAME_SIZE,
                row * FRAME_SIZE,
                (column + 1) * FRAME_SIZE,
                (row + 1) * FRAME_SIZE,
            ))
            bbox = frame.getbbox()
            if bbox is None:
                raise SystemExit(f"Empty frame {index} in {path}")
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]
            ratio = width / height
            if not 0.72 <= ratio <= 1.35:
                raise SystemExit(
                    f"Frame {index} in {path} is not compact enough: {width}x{height} ({ratio:.2f})"
                )
            if min(bbox[0], bbox[1], FRAME_SIZE - bbox[2], FRAME_SIZE - bbox[3]) < 2:
                raise SystemExit(f"Frame {index} in {path} touches its cell edge: {bbox}")
            frame_metrics.append({
                "frame": index,
                "width": width,
                "height": height,
                "center_x": (bbox[0] + bbox[2]) / 2,
                "baseline": bbox[3],
                "ratio": round(ratio, 2),
            })
        for row in range(4):
            row_metrics = frame_metrics[row * 4:(row + 1) * 4]
            centers = [frame["center_x"] for frame in row_metrics]
            baselines = [frame["baseline"] for frame in row_metrics]
            if max(centers) - min(centers) > 1:
                raise SystemExit(f"Row {row} in {path} jitters horizontally: {centers}")
            if max(baselines) - min(baselines) > 1:
                raise SystemExit(f"Row {row} in {path} has an unstable baseline: {baselines}")
        return frame_metrics


def validate_portrait(path: Path) -> None:
    with Image.open(path) as image:
        if image.size != PORTRAIT_SIZE or image.mode != "RGBA":
            raise SystemExit(f"Invalid portrait format: {path} is {image.mode} {image.size}")


def main() -> None:
    for rooster in ROOSTERS:
        sheet_source = GENERATED_ROOT / f"rooster-{rooster}-walk-alpha.png"
        south_source = GENERATED_ROOT / f"rooster-{rooster}-south-alpha.png"
        north_source = GENERATED_ROOT / f"rooster-{rooster}-north-alpha.png"
        portrait_source = GENERATED_ROOT / f"rooster-{rooster}-portrait-master.png"
        sheet_target = CHARACTER_ROOT / f"rooster-{rooster}-walk.png"
        portrait_target = CHARACTER_ROOT / f"rooster-{rooster}-portrait.png"

        build_normalized_sheet(sheet_source, sheet_target, south_source, north_source)
        resize_rgba(portrait_source, portrait_target, PORTRAIT_SIZE)
        metrics = validate_sheet(sheet_target)
        validate_portrait(portrait_target)
        min_ratio = min(frame["ratio"] for frame in metrics)
        max_ratio = max(frame["ratio"] for frame in metrics)
        print(
            f"{rooster}: sheet {sheet_target.relative_to(PROJECT_ROOT)} "
            f"(frame ratios {min_ratio:.2f}-{max_ratio:.2f}), "
            f"portrait {portrait_target.relative_to(PROJECT_ROOT)}"
        )


if __name__ == "__main__":
    main()
