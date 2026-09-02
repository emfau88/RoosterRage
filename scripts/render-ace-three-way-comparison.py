from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "qa" / "ace-three-way-comparison"
FRAME_SIZE = 256
MOBILE_SPRITE_SIZE = 54

VARIANTS = [
    {
        "id": "legacy",
        "name": "ALT / LEGACY",
        "subtitle": "breit, kompakt, statischer Idle",
        "accent": "#d7a44a",
        "sheet": ROOT / "src" / "assets" / "characters" / "rooster-ace-walk-v2.webp",
    },
    {
        "id": "next",
        "name": "GESTERN / NEXT",
        "subtitle": "saubere Details, feine Bewegung",
        "accent": "#65b5dc",
        "sheet": ROOT / "src" / "assets" / "characters" / "ace-next" / "rooster-ace-next-walk.webp",
    },
    {
        "id": "gameplay",
        "name": "AKTUELL / GAMEPLAY",
        "subtitle": "klare Schritte, Fäuste, mehr Volumen",
        "accent": "#e5a934",
        "sheet": ROOT / "src" / "assets" / "characters" / "ace-gameplay" / "rooster-ace-gameplay-walk.webp",
    },
]

ROW_BY_DIRECTION = {"south": 0, "west": 1, "north": 3}
LABEL_BY_DIRECTION = {"south": "SÜD", "west": "WEST", "east": "OST", "north": "NORD"}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / filename
    return ImageFont.truetype(str(path), size)


FONTS = {
    "title": font(42, True),
    "headline": font(26, True),
    "label": font(20, True),
    "body": font(17),
    "small": font(14),
}


def load_sheets() -> dict[str, Image.Image]:
    return {item["id"]: Image.open(item["sheet"]).convert("RGBA") for item in VARIANTS}


def get_frame(sheet: Image.Image, direction: str, index: int) -> Image.Image:
    source_direction = "west" if direction == "east" else direction
    row = ROW_BY_DIRECTION[source_direction]
    frame = sheet.crop((index * FRAME_SIZE, row * FRAME_SIZE,
                        (index + 1) * FRAME_SIZE, (row + 1) * FRAME_SIZE))
    return frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if direction == "east" else frame


def alpha_bbox(frame: Image.Image):
    return frame.getchannel("A").getbbox()


def paste_center(canvas: Image.Image, image: Image.Image, center: tuple[int, int], size: int):
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    x = round(center[0] - size / 2)
    y = round(center[1] - size / 2)
    canvas.alpha_composite(resized, (x, y))


def dark_canvas(size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGBA", size, "#111315")
    draw = ImageDraw.Draw(canvas)
    for y in range(size[1]):
        shade = int(17 + 9 * y / max(1, size[1] - 1))
        draw.line((0, y, size[0], y), fill=(shade, shade + 1, shade + 3, 255))
    return canvas


def rounded_panel(draw: ImageDraw.ImageDraw, box, fill="#181b1e", outline="#34383d", radius=18, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def render_turnaround(sheets: dict[str, Image.Image]):
    width, height = 1780, 1060
    canvas = dark_canvas((width, height))
    draw = ImageDraw.Draw(canvas)
    draw.text((70, 45), "ACE · DREI VERSIONEN IM DIREKTVERGLEICH", font=FONTS["title"], fill="#f5e9cf")
    draw.text((72, 100), "Gleicher 256×256-Rahmen · gleiche Ausrichtung · Kontaktpose des Laufzyklus",
              font=FONTS["body"], fill="#aeb4ba")

    left = 180
    col_width = 510
    header_y = 150
    for column, variant in enumerate(VARIANTS):
        x0 = left + column * col_width
        rounded_panel(draw, (x0 + 10, header_y, x0 + col_width - 10, height - 50),
                      outline=variant["accent"])
        draw.text((x0 + 34, header_y + 24), variant["name"], font=FONTS["headline"], fill=variant["accent"])
        draw.text((x0 + 34, header_y + 60), variant["subtitle"], font=FONTS["small"], fill="#c3c7ca")

    directions = ["south", "west", "north", "east"]
    row_top = 245
    row_height = 188
    for row, direction in enumerate(directions):
        cy = row_top + row * row_height + row_height // 2
        draw.text((55, cy - 12), LABEL_BY_DIRECTION[direction], font=FONTS["label"], fill="#d6d9dc")
        draw.line((160, cy + 93, width - 70, cy + 93), fill="#303438", width=1)
        for column, variant in enumerate(VARIANTS):
            cx = left + column * col_width + col_width // 2
            paste_center(canvas, get_frame(sheets[variant["id"]], direction, 0), (cx, cy), 184)

    path = OUTPUT / "ace-three-way-turnaround.png"
    canvas.convert("RGB").save(path, quality=95)


def render_walk_poses(sheets: dict[str, Image.Image], direction: str):
    width, height = 1640, 1040
    canvas = dark_canvas((width, height))
    draw = ImageDraw.Draw(canvas)
    draw.text((70, 42), f"ACE · {LABEL_BY_DIRECTION[direction]}-LAUF · VIER HAUPTPOSEN",
              font=FONTS["title"], fill="#f5e9cf")
    draw.text((72, 97), "Alle Varianten normalisiert auf denselben Rahmen; die Fußabstände bleiben unverändert.",
              font=FONTS["body"], fill="#aeb4ba")

    label_width = 310
    pose_width = 315
    top = 158
    row_height = 270
    for index in range(4):
        x = label_width + index * pose_width + pose_width // 2
        draw.text((x - 42, top - 2), f"POSE {index + 1}", font=FONTS["label"], fill="#c9cdd1")

    for row, variant in enumerate(VARIANTS):
        y0 = top + 42 + row * row_height
        rounded_panel(draw, (42, y0, width - 50, y0 + row_height - 18), outline=variant["accent"])
        draw.text((70, y0 + 72), variant["name"], font=FONTS["headline"], fill=variant["accent"])
        draw.text((70, y0 + 112), variant["subtitle"], font=FONTS["small"], fill="#b7bcc0")
        for index in range(4):
            center_x = label_width + index * pose_width + pose_width // 2
            paste_center(canvas, get_frame(sheets[variant["id"]], direction, index),
                         (center_x, y0 + 127), 230)

    path = OUTPUT / f"ace-three-way-{direction}-poses.png"
    canvas.convert("RGB").save(path, quality=95)


def arena_panel(size: tuple[int, int]) -> Image.Image:
    ground = Image.open(ROOT / "src" / "assets" / "map" / "arena-ground.webp").convert("RGB")
    target_ratio = size[0] / size[1]
    source_ratio = ground.width / ground.height
    if source_ratio > target_ratio:
        crop_width = round(ground.height * target_ratio)
        left = (ground.width - crop_width) // 2
        ground = ground.crop((left, 0, left + crop_width, ground.height))
    else:
        crop_height = round(ground.width / target_ratio)
        top = (ground.height - crop_height) // 2
        ground = ground.crop((0, top, ground.width, top + crop_height))
    ground = ground.resize(size, Image.Resampling.LANCZOS)
    ground = ImageEnhance.Brightness(ground).enhance(0.82)
    return ground.convert("RGBA")


def draw_health_bar(draw: ImageDraw.ImageDraw, center_x: int, y: int):
    draw.rounded_rectangle((center_x - 29, y, center_x + 29, y + 7), radius=3,
                           fill="#22181a", outline="#f5f5f5", width=1)
    draw.rounded_rectangle((center_x - 27, y + 2, center_x + 27, y + 5), radius=1, fill="#5cff74")


def render_mobile_scale(sheets: dict[str, Image.Image]):
    panel_w, panel_h = 390, 844
    gap = 24
    width = panel_w * 3 + gap * 4
    height = panel_h + 180
    canvas = dark_canvas((width, height))
    draw = ImageDraw.Draw(canvas)
    draw.text((48, 36), "ACE · ECHTE MOBILE SPIELGRÖSSE", font=FONTS["title"], fill="#f5e9cf")
    draw.text((50, 91), "Sprite jeweils 54×54 px (256 px × Spielscale 0,25 × Mobile-Kamera 0,85)",
              font=FONTS["body"], fill="#aeb4ba")

    ground = arena_panel((panel_w, panel_h))
    for column, variant in enumerate(VARIANTS):
        x0 = gap + column * (panel_w + gap)
        y0 = 140
        panel = ground.copy()
        pdraw = ImageDraw.Draw(panel)
        pdraw.rounded_rectangle((12, 12, panel_w - 12, 76), radius=13, fill=(20, 23, 26, 225),
                                outline=variant["accent"], width=2)
        pdraw.text((28, 25), variant["name"], font=FONTS["label"], fill=variant["accent"])
        pdraw.text((28, 52), variant["subtitle"], font=FONTS["small"], fill="#e1e4e5")
        center = (panel_w // 2, 455)
        draw_health_bar(pdraw, center[0], center[1] - 51)
        paste_center(panel, get_frame(sheets[variant["id"]], "west", 0), center, MOBILE_SPRITE_SIZE)
        pdraw.ellipse((46, 720, 98, 772), fill=(191, 226, 224, 105), outline=(220, 243, 240, 130), width=2)
        pdraw.rounded_rectangle((275, 620, 362, 674), radius=9, fill="#c17b22", outline="#4f2c16", width=3)
        canvas.alpha_composite(panel, (x0, y0))
        draw.rounded_rectangle((x0, y0, x0 + panel_w, y0 + panel_h), radius=2,
                               outline=variant["accent"], width=2)

    path = OUTPUT / "ace-three-way-mobile-game-scale.png"
    canvas.convert("RGB").save(path, quality=95)


def render_walk_gif(sheets: dict[str, Image.Image], direction: str):
    panel_w, panel_h = 390, 610
    gap = 18
    size = (panel_w * 3 + gap * 4, panel_h)
    base_ground = arena_panel((panel_w, panel_h))
    frames = []
    for frame_index in range(4):
        canvas = dark_canvas(size)
        for column, variant in enumerate(VARIANTS):
            x0 = gap + column * (panel_w + gap)
            panel = base_ground.copy()
            draw = ImageDraw.Draw(panel)
            draw.rounded_rectangle((12, 12, panel_w - 12, 76), radius=13, fill=(20, 23, 26, 230),
                                   outline=variant["accent"], width=2)
            draw.text((27, 24), variant["name"], font=FONTS["label"], fill=variant["accent"])
            draw.text((27, 51), f"{LABEL_BY_DIRECTION[direction]} · synchronisierte Pose", font=FONTS["small"], fill="#e1e4e5")
            current = get_frame(sheets[variant["id"]], direction, frame_index)
            paste_center(panel, current, (panel_w // 2, 250), 216)
            draw.text((24, 375), "4×-Ansicht", font=FONTS["small"], fill="#f1e8d6")
            draw.line((24, 399, panel_w - 24, 399), fill="#eee1c7", width=1)
            draw_health_bar(draw, panel_w // 2, 480)
            paste_center(panel, current, (panel_w // 2, 532), MOBILE_SPRITE_SIZE)
            draw.text((24, 568), "Echte mobile Größe · 54 px", font=FONTS["small"], fill="#f1e8d6")
            canvas.alpha_composite(panel, (x0, 0))
        frames.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=256))

    path = OUTPUT / f"ace-three-way-{direction}-walk.gif"
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=130,
                   loop=0, disposal=2, optimize=False)


def metrics(sheets: dict[str, Image.Image]):
    result = {}
    for variant in VARIANTS:
        entry = {}
        sheet = sheets[variant["id"]]
        for direction in ["south", "west", "north", "east"]:
            boxes = [alpha_bbox(get_frame(sheet, direction, index)) for index in range(4)]
            widths = [box[2] - box[0] for box in boxes if box]
            heights = [box[3] - box[1] for box in boxes if box]
            entry[direction] = {
                "sourceWidthRange": [min(widths), max(widths)],
                "sourceHeightRange": [min(heights), max(heights)],
                "mobileVisibleWidthRange": [round(min(widths) * MOBILE_SPRITE_SIZE / 256, 1),
                                             round(max(widths) * MOBILE_SPRITE_SIZE / 256, 1)],
                "mobileVisibleHeightRange": [round(min(heights) * MOBILE_SPRITE_SIZE / 256, 1),
                                              round(max(heights) * MOBILE_SPRITE_SIZE / 256, 1)],
            }
        result[variant["id"]] = entry
    (OUTPUT / "metrics.json").write_text(json.dumps(result, indent=2), encoding="utf-8")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheets = load_sheets()
    render_turnaround(sheets)
    render_walk_poses(sheets, "west")
    render_walk_poses(sheets, "south")
    render_walk_poses(sheets, "north")
    render_mobile_scale(sheets)
    for direction in ["west", "south", "north"]:
        render_walk_gif(sheets, direction)
    metrics(sheets)
    print(f"Rendered Ace three-way comparison to {OUTPUT}")


if __name__ == "__main__":
    main()
