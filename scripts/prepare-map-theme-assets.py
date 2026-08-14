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


def grade_feed_ground(image):
    image = ImageEnhance.Color(image).enhance(0.76)
    image = ImageEnhance.Contrast(image).enhance(0.86)
    return ImageEnhance.Brightness(image).enhance(0.9)


def grade_feed_edge(image):
    image = ImageEnhance.Color(image).enhance(0.72)
    image = ImageEnhance.Contrast(image).enhance(0.88)
    return ImageEnhance.Brightness(image).enhance(0.84)


def prepare_feed_edge(image, side):
    # The generated strips are coherent north-up scenes. Crop only the quiet
    # outer buffer so the retaining wall meets the lane; never seam-shift or
    # rotate architectural content.
    margin = round(image.width * 0.1)
    if side == "left":
        image = image.crop((0, 0, image.width - margin, image.height))
    else:
        image = image.crop((margin, 0, image.width, image.height))
    return grade_feed_edge(fit_cover(image, (300, 600)))


def main():
    parser = ArgumentParser(description="Prepare readable Harvest Yard and Feed Alley theme assets.")
    parser.add_argument("--harvest-ground")
    parser.add_argument("--feed-alley-ground")
    parser.add_argument("--feed-alley-left")
    parser.add_argument("--feed-alley-right")
    args = parser.parse_args()

    MAP_ROOT.mkdir(parents=True, exist_ok=True)
    if args.harvest_ground:
        with Image.open(args.harvest_ground) as source:
            harvest = make_seamless(source.convert("RGB"), (700, 700))
            harvest = ImageEnhance.Color(harvest).enhance(0.88)
            harvest = ImageEnhance.Brightness(harvest).enhance(0.95)
            harvest.save(MAP_ROOT / "arena-ground-farm.png", "PNG", optimize=True)

    feed_inputs = (args.feed_alley_ground, args.feed_alley_left, args.feed_alley_right)
    if any(feed_inputs) and not all(feed_inputs):
        parser.error("Feed Alley requires ground, left and right inputs together.")
    if all(feed_inputs):
        with Image.open(args.feed_alley_ground) as source:
            ground = grade_feed_ground(fit_cover(source.convert("RGB"), (800, 600)))
            ground.save(MAP_ROOT / "arena-ground-road.png", "PNG", optimize=True)
        with Image.open(args.feed_alley_left) as source:
            left = prepare_feed_edge(source.convert("RGB"), "left")
            left.save(MAP_ROOT / "arena-feed-alley-left.png", "PNG", optimize=True)
        with Image.open(args.feed_alley_right) as source:
            right = prepare_feed_edge(source.convert("RGB"), "right")
            right.save(MAP_ROOT / "arena-feed-alley-right.png", "PNG", optimize=True)


if __name__ == "__main__":
    main()
