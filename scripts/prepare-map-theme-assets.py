from argparse import ArgumentParser
from pathlib import Path

from PIL import Image, ImageEnhance


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAP_ROOT = PROJECT_ROOT / "art-source" / "map"


def fit_cover(image, size):
    source_ratio = image.width / image.height
    target_ratio = size[0] / size[1]
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    elif source_ratio < target_ratio:
        crop_height = round(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    return image.resize(size, Image.Resampling.LANCZOS)


def make_seamless(image, size):
    tile = fit_cover(image, size)
    # Rotate the source around both axes, then softly blend the central seams.
    # The wrap is exact without creating a mirrored kaleidoscope pattern.
    shifted = Image.new(tile.mode, size)
    half_x = size[0] // 2
    half_y = size[1] // 2
    shifted.paste(tile.crop((half_x, half_y, size[0], size[1])), (0, 0))
    shifted.paste(tile.crop((0, half_y, half_x, size[1])), (size[0] - half_x, 0))
    shifted.paste(tile.crop((half_x, 0, size[0], half_y)), (0, size[1] - half_y))
    shifted.paste(tile.crop((0, 0, half_x, half_y)), (size[0] - half_x, size[1] - half_y))
    blur_width = max(16, min(size) // 18)
    for x in range(half_x - blur_width, half_x + blur_width):
        alpha = abs(x - half_x) / blur_width
        opposite = (x + half_x) % size[0]
        strip = shifted.crop((opposite, 0, opposite + 1, size[1]))
        shifted.paste(Image.blend(strip, shifted.crop((x, 0, x + 1, size[1])), alpha), (x, 0))
    for y in range(half_y - blur_width, half_y + blur_width):
        alpha = abs(y - half_y) / blur_width
        opposite = (y + half_y) % size[1]
        strip = shifted.crop((0, opposite, size[0], opposite + 1))
        shifted.paste(Image.blend(strip, shifted.crop((0, y, size[0], y + 1)), alpha), (0, y))
    return shifted


def crop_prop(sheet, left_ratio, right_ratio, output_name):
    left = round(sheet.width * left_ratio)
    right = round(sheet.width * right_ratio)
    prop = sheet.crop((left, 0, right, sheet.height))
    alpha_bounds = prop.getchannel("A").getbbox()
    if not alpha_bounds:
        raise SystemExit(f"No visible pixels found for {output_name}")
    prop.crop(alpha_bounds).save(MAP_ROOT / output_name, "PNG", optimize=True)


def main():
    parser = ArgumentParser(description="Prepare the Open Yard and Vertical Run theme assets.")
    parser.add_argument("--harvest-ground", required=True)
    parser.add_argument("--feed-alley-ground", required=True)
    parser.add_argument("--feed-alley-left", required=True)
    parser.add_argument("--feed-alley-right", required=True)
    parser.add_argument("--props", required=True)
    args = parser.parse_args()

    MAP_ROOT.mkdir(parents=True, exist_ok=True)
    with Image.open(args.harvest_ground) as source:
        harvest = make_seamless(source.convert("RGB"), (700, 700))
        harvest = ImageEnhance.Color(harvest).enhance(0.88)
        harvest = ImageEnhance.Brightness(harvest).enhance(0.95)
        harvest.save(
            MAP_ROOT / "arena-ground-farm.png", "PNG", optimize=True
        )
    with Image.open(args.feed_alley_ground) as source:
        make_seamless(source.convert("RGB"), (800, 600)).save(
            MAP_ROOT / "arena-ground-road.png", "PNG", optimize=True
        )
    with Image.open(args.feed_alley_left) as source:
        make_seamless(source.convert("RGB"), (300, 600)).save(
            MAP_ROOT / "arena-feed-alley-left.png", "PNG", optimize=True
        )
    with Image.open(args.feed_alley_right) as source:
        make_seamless(source.convert("RGB"), (300, 600)).save(
            MAP_ROOT / "arena-feed-alley-right.png", "PNG", optimize=True
        )
    with Image.open(args.props) as source:
        sheet = source.convert("RGBA")
        crop_prop(sheet, 0.00, 0.405, "landmark-orchard.png")
        crop_prop(sheet, 0.405, 0.685, "landmark-silo.png")
        crop_prop(sheet, 0.685, 1.00, "landmark-feed-trough.png")


if __name__ == "__main__":
    main()
