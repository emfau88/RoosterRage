"""Create runtime-ready sticker cut-outs from the approved concept sheet.

The generated files deliberately live alongside their source equivalents so a
future replacement sheet can be sliced with the same repeatable recipe.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source" / "ui" / "sticker-bundle-concept-v1.png"
TARGET_SIZE = (192, 192)
MAX_ART_SIZE = (176, 176)

STICKERS = {
    "killstreak": {
        "crop": (0, 0, 750, 640),
        "outputs": (
            "art-source/ui/stickers/killstreak-sticker-v1.png",
            "src/assets/ui/killstreak-sticker-v1.png",
        ),
    },
    "heal": {
        "crop": (745, 0, 1254, 640),
        "outputs": (
            "art-source/ui/stickers/pickup-heal-sticker-v1.png",
            "src/assets/pickups/pickup-heal-sticker-v1.png",
        ),
    },
    "bomb": {
        "crop": (0, 630, 730, 1254),
        "outputs": (
            "art-source/ui/stickers/pickup-bomb-sticker-v1.png",
            "src/assets/pickups/pickup-bomb-sticker-v1.png",
        ),
    },
    "magnet": {
        "crop": (720, 630, 1254, 1254),
        "outputs": (
            "art-source/ui/stickers/pickup-magnet-sticker-v1.png",
            "src/assets/pickups/pickup-magnet-sticker-v1.png",
        ),
    },
}


def trim_transparency(image: Image.Image) -> Image.Image:
    alpha_bounds = image.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise ValueError("Sticker crop contains no visible pixels")
    return image.crop(alpha_bounds)


def export_sticker(sheet: Image.Image, name: str, config: dict) -> None:
    sticker = trim_transparency(sheet.crop(config["crop"]))
    sticker.thumbnail(MAX_ART_SIZE, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", TARGET_SIZE)
    position = ((TARGET_SIZE[0] - sticker.width) // 2, (TARGET_SIZE[1] - sticker.height) // 2)
    canvas.alpha_composite(sticker, position)

    for relative_path in config["outputs"]:
        output = ROOT / relative_path
        output.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output, optimize=True)
        print(f"{name}: {output.relative_to(ROOT)}")


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing sticker concept: {SOURCE}")
    with Image.open(SOURCE) as source:
        sheet = source.convert("RGBA")
    for name, config in STICKERS.items():
        export_sticker(sheet, name, config)


if __name__ == "__main__":
    main()
