"""Create compact contact sheets for reviewing every baked gameplay walk phase."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/qa/gameplay-roosters"
FRAME = 256


def font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)


def build(rooster, label, accent):
    sheet = Image.open(
        ROOT / f"src/assets/characters/{rooster}-gameplay/rooster-{rooster}-gameplay-walk.webp"
    ).convert("RGBA")
    scale = 0.62
    tile = round(FRAME * scale)
    top = 34
    row_height = tile + 26
    canvas = Image.new("RGB", (tile * 8, top + row_height * 4), "black")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), f"{label} · GAMEPLAY WALK · 8 PHASEN", font=font(15), fill=accent)
    for row, direction in enumerate(("SÜD", "WEST", "OST", "NORD")):
        y = top + row * row_height
        draw.text((8, y + 5), direction, font=font(10), fill=accent)
        for column in range(8):
            frame = sheet.crop((column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME))
            # Runtime stores one canonical side row and Player mirrors it.
            # Reproduce that behavior here so the labels show the true view.
            should_flip = ((rooster == "artillery" and direction == "OST") or
                           (rooster == "storm" and direction == "WEST"))
            if should_flip:
                frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            frame = frame.resize((tile, tile), Image.Resampling.LANCZOS)
            canvas.paste(frame, (column * tile, y), frame)
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT / f"{rooster}-gameplay-walk-contacts.png")

    # Larger side-only strip for checking toe direction and alternating
    # contacts without relying on the small full-character overview.
    side_canvas = Image.new("RGB", (FRAME * 4, FRAME * 2 + 48), "black")
    side_draw = ImageDraw.Draw(side_canvas)
    side_draw.text((12, 10), f"{label} · SIDE FEET · TRUE RUNTIME ORIENTATION",
                   font=font(15), fill=accent)
    canonical_row = 1
    for index, direction in enumerate(("WEST", "OST")):
        side_draw.text((8, 40 + index * FRAME), direction, font=font(11), fill=accent)
        for column, source_column in enumerate((0, 2, 4, 6)):
            frame = sheet.crop((source_column * FRAME, canonical_row * FRAME,
                                (source_column + 1) * FRAME, (canonical_row + 1) * FRAME))
            should_flip = ((rooster == "artillery" and direction == "OST") or
                           (rooster == "storm" and direction == "WEST"))
            if should_flip:
                frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            side_canvas.paste(frame, (column * FRAME, 32 + index * FRAME), frame)
    side_canvas.save(OUT / f"{rooster}-gameplay-side-feet.png")


build("artillery", "BUMMBERT", "#d59452")
build("storm", "BLITZKAMM", "#5ad7ff")
