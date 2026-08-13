from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "art-source" / "map"


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


def crop_object(sheet, bounds, output_name):
    image = sheet.crop(bounds)
    alpha_bounds = image.getchannel("A").getbbox()
    if not alpha_bounds:
        raise SystemExit(f"No visible pixels found for {output_name}")
    image.crop(alpha_bounds).save(SOURCE_ROOT / output_name, "PNG", optimize=True)


def main():
    parser = ArgumentParser(description="Prepare the Coop Square environment assets.")
    parser.add_argument("--background", required=True)
    parser.add_argument("--props", help="Optional chroma-keyed prop sheet with alpha")
    args = parser.parse_args()

    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    with Image.open(args.background) as background:
        fit_cover(background.convert("RGB"), (1400, 900)).save(
            SOURCE_ROOT / "coop-square-ground.png", "PNG", optimize=True
        )

    if args.props:
        with Image.open(args.props) as prop_sheet:
            sheet = prop_sheet.convert("RGBA")
            tractor_end = round(sheet.width * 0.4)
            trough_end = round(sheet.width * 0.66)
            crop_object(sheet, (0, 0, tractor_end, sheet.height), "coop-square-tractor.png")
            crop_object(sheet, (tractor_end, 0, trough_end, sheet.height), "coop-square-trough.png")
            crop_object(sheet, (trough_end, 0, sheet.width, sheet.height), "coop-square-hay-stack.png")


if __name__ == "__main__":
    main()
