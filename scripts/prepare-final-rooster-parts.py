"""Normalize versioned ImageGen sources into deterministic final rig parts."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/rooster-final-v1/generated"
OUTPUT = ROOT / "src/assets/characters/final-parts"
GAMEPLAY_PARTS = ROOT / "src/assets/characters/artillery-four-direction"


def alpha_crop(image: Image.Image, threshold: int = 3) -> Image.Image:
    rgba = image.convert("RGBA")
    mask = rgba.getchannel("A").point(lambda value: 255 if value > threshold else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError("Generated part has no visible pixels")
    return rgba.crop(box)


def fit_part(source: Path, target: Path, size: tuple[int, int], *, stretch: bool = False) -> None:
    image = alpha_crop(Image.open(source))
    if stretch:
        rendered = image.resize(size, Image.Resampling.LANCZOS)
    else:
        scale = min(size[0] / image.width, size[1] / image.height)
        fitted = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
        rendered = Image.new("RGBA", size)
        rendered.alpha_composite(
            fitted,
            ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2),
        )

    # Transparent RGB is normalized to black to avoid colored edge bleed when
    # the part is transformed into a sprite sheet.
    pixels = rendered.load()
    for y in range(rendered.height):
        for x in range(rendered.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                pixels[x, y] = (0, 0, 0, 0)

    target.parent.mkdir(parents=True, exist_ok=True)
    rendered.save(target, lossless=True, method=6)
    print(f"Prepared {target.relative_to(ROOT)} ({rendered.width}x{rendered.height})")


def crop_part(source: Path, target: Path, padding: int = 2) -> None:
    image = alpha_crop(Image.open(source))
    rendered = Image.new("RGBA", (image.width + padding * 2, image.height + padding * 2))
    rendered.alpha_composite(image, (padding, padding))
    target.parent.mkdir(parents=True, exist_ok=True)
    rendered.save(target, lossless=True, method=6)
    print(f"Prepared {target.relative_to(ROOT)} ({rendered.width}x{rendered.height})")


def main() -> None:
    fit_part(
        SOURCE / "ace-west-tail-fan-v1.png",
        OUTPUT / "ace/west/tail-fan-v1.webp",
        (360, 260),
    )
    fit_part(
        SOURCE / "ace-north-tail-fan-v1.png",
        OUTPUT / "ace/north/tail-fan-v1.webp",
        (300, 280),
    )
    # The generated portrait was intentionally widened during normalization:
    # Bummbert's class silhouette must stay compact and load-bearing rather
    # than inherit a tall portrait aspect ratio.
    fit_part(
        SOURCE / "artillery-west-body-v1.png",
        OUTPUT / "artillery/west/body-v1.webp",
        (380, 520),
        stretch=True,
    )
    crop_part(
        GAMEPLAY_PARTS / "west/fist-near-v1.webp",
        OUTPUT / "artillery/west/fist-near-v1.webp",
    )


if __name__ == "__main__":
    main()
