"""Derive non-overlapping lower-arm layers from Bummbert's immutable source parts."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PARTS = ROOT / "src/assets/characters/artillery-four-direction"


def lower_part(source, target, fade_start, opaque_start):
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    pixels = alpha.load()
    for y in range(image.height):
        if y < fade_start:
            multiplier = 0
        elif y >= opaque_start:
            multiplier = 255
        else:
            multiplier = round((y - fade_start) / (opaque_start - fade_start) * 255)
        for x in range(image.width):
            pixels[x, y] = round(pixels[x, y] * multiplier / 255)
    image.putalpha(alpha)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, lossless=True, method=6)


def profile_fist(source, target):
    """Keep only the orange fist below the diagonal profile gauntlet.

    The authored wing contains a complete second shoulder, arm and cuff.  A
    horizontal lower-half extraction therefore doubled the cuff in the
    gameplay rig.  The hand starts below a diagonal cuff edge, so following
    that edge preserves its black outline without retaining the metalwork.
    """
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    pixels = alpha.load()
    for y in range(image.height):
        for x in range(image.width):
            distance_below_cuff = y - (326 + x * 0.34)
            if distance_below_cuff <= 0:
                multiplier = 0
            elif distance_below_cuff >= 10:
                multiplier = 255
            else:
                multiplier = round(distance_below_cuff / 10 * 255)
            pixels[x, y] = round(pixels[x, y] * multiplier / 255)
    image.putalpha(alpha)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, lossless=True, method=6)


def compact_profile_body(source, target):
    """Narrow the profile cuff and open a curved, load-bearing hip join.

    The operation is deliberately local and reproducible.  It leaves the
    immutable four-direction body untouched and creates a gameplay-only body
    variant, so reverting remains a one-key pose change.
    """
    image = Image.open(source).convert("RGBA")
    left, top = 176, 356
    region = image.crop((left, top, image.width, image.height))
    compact_width = round(region.width * 0.82)
    compact = region.resize((compact_width, region.height), Image.Resampling.LANCZOS)
    result = image.copy()
    result.paste((0, 0, 0, 0), (left, top, image.width, image.height))
    result.alpha_composite(compact, (left, top))

    # The source torso ends in a long, nearly horizontal black edge.  Cut a
    # shallow arch where the thigh sits behind it so the feathered leg can
    # enter the torso instead of looking pasted below a rectangular belly.
    alpha = result.getchannel("A")
    pixels = alpha.load()
    center_x, radius, depth = 125, 65, 18
    for x in range(center_x - radius, center_x + radius + 1):
        normalized = (x - center_x) / radius
        boundary = 500 - depth * (1 - normalized * normalized)
        for y in range(max(0, round(boundary) - 4), result.height):
            distance = y - boundary
            if distance <= 0:
                multiplier = 255
            elif distance >= 6:
                multiplier = 0
            else:
                multiplier = round((1 - distance / 6) * 255)
            pixels[x, y] = round(pixels[x, y] * multiplier / 255)
    result.putalpha(alpha)
    result.save(target, lossless=True, method=6)


def main():
    specs = (
        ("south/wing-left.webp", "south/forearm-fist-left-v1.webp", 172, 208),
        ("south/wing-right.webp", "south/forearm-fist-right-v1.webp", 172, 208),
        ("north/wing-left.webp", "north/forearm-left-v1.webp", 178, 215),
        ("north/wing-right.webp", "north/forearm-right-v1.webp", 178, 215),
    )
    for source, target, fade_start, opaque_start in specs:
        lower_part(PARTS / source, PARTS / target, fade_start, opaque_start)
        print(f"Prepared {target}")
    profile_fist(PARTS / "west/wing-near.webp", PARTS / "west/fist-near-v1.webp")
    print("Prepared west/fist-near-v1.webp")
    compact_profile_body(PARTS / "west/body.webp", PARTS / "west/body-gameplay-v3.webp")
    print("Prepared west/body-gameplay-v3.webp")


if __name__ == "__main__":
    main()
