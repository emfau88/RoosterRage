from argparse import ArgumentParser
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


def main():
    parser = ArgumentParser(description="Reduce combat-floor noise without changing tile orientation.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--color", type=float, default=0.78)
    parser.add_argument("--contrast", type=float, default=0.84)
    parser.add_argument("--brightness", type=float, default=0.94)
    parser.add_argument("--blur", type=float, default=0.45)
    args = parser.parse_args()

    with Image.open(args.input) as source:
        image = source.convert("RGB")
        image = ImageEnhance.Color(image).enhance(args.color)
        image = ImageEnhance.Contrast(image).enhance(args.contrast)
        image = ImageEnhance.Brightness(image).enhance(args.brightness)
        if args.blur > 0:
            image = image.filter(ImageFilter.GaussianBlur(args.blur))
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        image.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
