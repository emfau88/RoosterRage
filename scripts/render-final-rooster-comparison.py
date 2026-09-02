"""Render the final Legacy / Next / Gameplay comparison for all player roosters."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src/assets/characters"
OUTPUT = ROOT / "docs/qa/final-rooster-comparison"
FRAME = 256

CHARACTERS = (
    {
        "id": "ace", "name": "ACE / ASS", "role": "Allrounder", "scale": 0.25,
        "accent": "#f0b63f", "side_flip": True,
        "sheets": {
            "legacy": ASSETS / "rooster-ace-walk-v2.webp",
            "next": ASSETS / "ace-next/rooster-ace-next-walk.webp",
            "gameplay": ASSETS / "ace-gameplay/rooster-ace-gameplay-walk.webp",
        },
    },
    {
        "id": "artillery", "name": "BUMMBERT", "role": "Schwerer Flächenschaden", "scale": 0.275,
        "accent": "#e18b3d", "side_flip": True,
        "sheets": {
            "legacy": ASSETS / "rooster-artillery-walk-v3.webp",
            "next": ASSETS / "artillery-next/rooster-artillery-next-walk.webp",
            "gameplay": ASSETS / "artillery-gameplay/rooster-artillery-gameplay-walk.webp",
        },
    },
    {
        "id": "storm", "name": "BLITZKAMM", "role": "Schneller Kettenangriff", "scale": 0.235,
        "accent": "#54d8ff", "side_flip": False,
        "sheets": {
            "legacy": ASSETS / "rooster-storm-walk-v3.webp",
            "next": ASSETS / "storm-next/rooster-storm-next-walk.webp",
            "gameplay": ASSETS / "storm-gameplay/rooster-storm-gameplay-walk.webp",
        },
    },
)

VARIANTS = (
    {"id": "legacy", "name": "ALT / LEGACY", "subtitle": "ursprünglich im Spiel", "accent": "#c8a56a"},
    {"id": "next", "name": "ZWISCHENVERSION / NEXT", "subtitle": "detailreicher Neuaufbau", "accent": "#8caec2"},
    {"id": "gameplay", "name": "AKTUELL / GAMEPLAY", "subtitle": "für Kampflesbarkeit überarbeitet", "accent": "#efb633"},
)

DIRECTION_ROWS = {"south": 0, "east": 1, "north": 3}
DIRECTION_NAMES = {"south": "SÜD", "east": "SEITE", "north": "NORD"}


def font(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


FONTS = {
    "title": font(38, True), "subtitle": font(18), "variant": font(23, True),
    "character": font(27, True), "label": font(15, True), "small": font(13),
}


def dark_canvas(size):
    image = Image.new("RGBA", size, "#111315")
    draw = ImageDraw.Draw(image)
    for y in range(size[1]):
        shade = round(16 + y / size[1] * 10)
        draw.line((0, y, size[0], y), fill=(shade, shade + 1, shade + 3, 255))
    return image


def load_sheets():
    return {
        character["id"]: {
            variant["id"]: Image.open(character["sheets"][variant["id"]]).convert("RGBA")
            for variant in VARIANTS
        }
        for character in CHARACTERS
    }


def frame_count(sheet):
    return sheet.width // FRAME


def get_frame(sheet, character, direction, normalized_index=0):
    count = frame_count(sheet)
    index = round((normalized_index % 8) / 8 * count) % count
    row = DIRECTION_ROWS[direction]
    result = sheet.crop((index * FRAME, row * FRAME, (index + 1) * FRAME, (row + 1) * FRAME))
    if direction == "east" and character["side_flip"]:
        result = result.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return result


def paste_frame(canvas, source, center, size):
    rendered = source.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(rendered, (round(center[0] - size / 2), round(center[1] - size / 2)))


def arena_crop(size):
    ground = Image.open(ROOT / "src/assets/map/arena-ground.webp").convert("RGB")
    ratio = size[0] / size[1]
    if ground.width / ground.height > ratio:
        width = round(ground.height * ratio)
        left = (ground.width - width) // 2
        ground = ground.crop((left, 0, left + width, ground.height))
    else:
        height = round(ground.width / ratio)
        top = (ground.height - height) // 2
        ground = ground.crop((0, top, ground.width, top + height))
    ground = ground.resize(size, Image.Resampling.LANCZOS)
    return ImageEnhance.Brightness(ground).enhance(0.72).convert("RGBA")


def render_turnaround(sheets):
    width, height = 1900, 1690
    canvas = dark_canvas((width, height))
    draw = ImageDraw.Draw(canvas)
    draw.text((54, 35), "SPIELBARE HÄHNE · FINALE DREI-WEGE-GEGENÜBERSTELLUNG",
              font=FONTS["title"], fill="#f5ead5")
    draw.text((56, 86), "Legacy → Zwischenversion → aktueller Gameplay-Kandidat · identische Rahmen und Kontaktphase",
              font=FONTS["subtitle"], fill="#adb4b9")

    left, top = 205, 135
    column_width, row_height = 555, 495
    for column, variant in enumerate(VARIANTS):
        x = left + column * column_width
        draw.rounded_rectangle((x + 8, top, x + column_width - 8, top + 78), radius=14,
                               fill="#191c20", outline=variant["accent"], width=2)
        draw.text((x + column_width / 2, top + 17), variant["name"], anchor="ma",
                  font=FONTS["variant"], fill=variant["accent"])
        draw.text((x + column_width / 2, top + 50), variant["subtitle"], anchor="ma",
                  font=FONTS["small"], fill="#c9cdd0")

    for row, character in enumerate(CHARACTERS):
        y = top + 92 + row * row_height
        draw.text((30, y + 178), character["name"], font=FONTS["character"], fill=character["accent"])
        draw.text((31, y + 216), character["role"], font=FONTS["small"], fill="#c2c7ca")
        for column, variant in enumerate(VARIANTS):
            x = left + column * column_width
            draw.rounded_rectangle((x + 8, y, x + column_width - 8, y + row_height - 18), radius=16,
                                   fill="#15181b", outline="#363b40", width=2)
            centers = (x + 100, x + 278, x + 455)
            for direction, center_x in zip(("south", "east", "north"), centers):
                current = get_frame(sheets[character["id"]][variant["id"]], character, direction, 0)
                paste_frame(canvas, current, (center_x, y + 226), 205)
                draw.text((center_x, y + 405), DIRECTION_NAMES[direction], anchor="ma",
                          font=FONTS["label"], fill="#d6dadd")

    canvas.convert("RGB").save(OUTPUT / "all-roosters-legacy-next-gameplay-turnaround.png", quality=96)


def health_bar(draw, x, y):
    draw.rounded_rectangle((x - 29, y, x + 29, y + 7), radius=3, fill="#211719", outline="#eeeeee", width=1)
    draw.rounded_rectangle((x - 27, y + 2, x + 27, y + 5), radius=1, fill="#5cff74")


def render_game_scale(sheets):
    width, height = 1660, 930
    canvas = dark_canvas((width, height))
    draw = ImageDraw.Draw(canvas)
    draw.text((48, 31), "DIREKTVERGLEICH IN ECHTER DESKTOP-SPIELGRÖSSE",
              font=FONTS["title"], fill="#f5ead5")
    draw.text((50, 82), "Individuelle Produktionsscales: Ace 0,250 · Bummbert 0,275 · Blitzkamm 0,235",
              font=FONTS["subtitle"], fill="#adb4b9")
    left, top, cell_w, cell_h = 190, 125, 475, 250
    ground = arena_crop((cell_w - 12, cell_h - 12))
    for column, variant in enumerate(VARIANTS):
        x = left + column * cell_w
        draw.text((x + cell_w / 2, top - 12), variant["name"], anchor="ms",
                  font=FONTS["variant"], fill=variant["accent"])
    for row, character in enumerate(CHARACTERS):
        y = top + 18 + row * cell_h
        draw.text((24, y + 92), character["name"], font=FONTS["character"], fill=character["accent"])
        draw.text((25, y + 129), character["role"], font=FONTS["small"], fill="#c2c7ca")
        source_size = round(FRAME * character["scale"])
        for column, variant in enumerate(VARIANTS):
            x = left + column * cell_w
            panel = ground.copy()
            pdraw = ImageDraw.Draw(panel)
            for index, direction in enumerate(("south", "east", "north")):
                center_x = 80 + index * 154
                center_y = 126
                health_bar(pdraw, center_x, center_y - 48)
                current = get_frame(sheets[character["id"]][variant["id"]], character, direction, 0)
                paste_frame(panel, current, (center_x, center_y), source_size)
                pdraw.text((center_x, 194), DIRECTION_NAMES[direction], anchor="ma",
                           font=FONTS["small"], fill="#f2eadc")
            canvas.alpha_composite(panel, (x + 6, y + 6))
            draw.rounded_rectangle((x + 6, y + 6, x + cell_w - 6, y + cell_h - 6), radius=10,
                                   outline=variant["accent"], width=2)
    canvas.convert("RGB").save(OUTPUT / "all-roosters-legacy-next-gameplay-real-game-scale.png", quality=96)


def render_side_gif(sheets, character):
    width, height = 1390, 650
    frames = []
    for phase in range(8):
        canvas = dark_canvas((width, height))
        draw = ImageDraw.Draw(canvas)
        draw.text((42, 29), f"{character['name']} · SEITENLAUF IM DIREKTVERGLEICH",
                  font=FONTS["title"], fill=character["accent"])
        draw.text((44, 80), "Synchronisierte Laufphase · unten jeweils echte Desktop-Spielgröße",
                  font=FONTS["subtitle"], fill="#adb4b9")
        for column, variant in enumerate(VARIANTS):
            x0 = 30 + column * 455
            draw.rounded_rectangle((x0, 120, x0 + 430, 620), radius=15, fill="#15181b",
                                   outline=variant["accent"], width=2)
            draw.text((x0 + 215, 144), variant["name"], anchor="ma",
                      font=FONTS["variant"], fill=variant["accent"])
            sheet = sheets[character["id"]][variant["id"]]
            current = get_frame(sheet, character, "east", phase)
            paste_frame(canvas, current, (x0 + 215, 320), 300)
            draw.text((x0 + 24, 476), "4,7×-PRÜFANSICHT", font=FONTS["small"], fill="#cbd0d3")
            draw.line((x0 + 24, 500, x0 + 406, 500), fill="#3d4247", width=1)
            health_bar(draw, x0 + 215, 530)
            paste_frame(canvas, current, (x0 + 215, 572), round(FRAME * character["scale"]))
        frames.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=256))
    frames[0].save(OUTPUT / f"{character['id']}-legacy-next-gameplay-side-walk.gif",
                   save_all=True, append_images=frames[1:], duration=85, loop=0,
                   disposal=2, optimize=False)


def render_metrics(sheets):
    metrics = {}
    for character in CHARACTERS:
        variants = {}
        for variant in VARIANTS:
            sheet = sheets[character["id"]][variant["id"]]
            directions = {}
            for direction in ("south", "east", "north"):
                boxes = [get_frame(sheet, character, direction, phase).getchannel("A").getbbox()
                         for phase in range(8)]
                widths = [box[2] - box[0] for box in boxes]
                heights = [box[3] - box[1] for box in boxes]
                directions[direction] = {
                    "sourceWidthRange": [min(widths), max(widths)],
                    "sourceHeightRange": [min(heights), max(heights)],
                    "gameVisibleWidthRange": [round(min(widths) * character["scale"], 1),
                                               round(max(widths) * character["scale"], 1)],
                    "gameVisibleHeightRange": [round(min(heights) * character["scale"], 1),
                                                round(max(heights) * character["scale"], 1)],
                    "walkFrames": frame_count(sheet),
                }
            variants[variant["id"]] = directions
        metrics[character["id"]] = variants
    (OUTPUT / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheets = load_sheets()
    render_turnaround(sheets)
    render_game_scale(sheets)
    for character in CHARACTERS:
        render_side_gif(sheets, character)
    render_metrics(sheets)
    print(f"Rendered final comparison to {OUTPUT}")


if __name__ == "__main__":
    main()
