"""Render the shared first-approval master board for the three final roosters."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FRAME = 256
OUTPUT = ROOT / "docs/qa/rooster-final-v1"
POSES = ROOT / "art-source/characters/rooster-final-v1/master-poses.json"
ASSETS = ROOT / "src/assets/characters"

CHARACTERS = (
    {
        "id": "ace", "name": "ACE / ASS", "role": "ALLROUNDER", "accent": "#f2bd4c",
        "parts": ASSETS / "ace-four-direction", "side": "west", "base_scale": 0.25,
        "legacy": ASSETS / "rooster-ace-walk-v2.webp",
        "gameplay": ASSETS / "ace-gameplay/rooster-ace-gameplay-walk.webp",
    },
    {
        "id": "artillery", "name": "BUMMBERT", "role": "SCHWERER FLÄCHENSCHADEN", "accent": "#e6903f",
        "parts": ASSETS / "artillery-four-direction", "side": "west", "base_scale": 0.275,
        "legacy": ASSETS / "rooster-artillery-walk-v3.webp",
        "gameplay": ASSETS / "artillery-gameplay/rooster-artillery-gameplay-walk.webp",
    },
    {
        "id": "storm", "name": "BLITZKAMM", "role": "SCHNELLER KETTENANGRIFF", "accent": "#55d9ff",
        "parts": ASSETS / "storm-four-direction", "side": "east", "base_scale": 0.235,
        "legacy": ASSETS / "rooster-storm-walk-v3.webp",
        "gameplay": ASSETS / "storm-gameplay/rooster-storm-gameplay-walk.webp",
    },
)


def font(size: int, bold: bool = False):
    filename = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


FONTS = {
    "title": font(37, True), "subtitle": font(18), "name": font(29, True),
    "role": font(13, True), "label": font(15, True), "small": font(12),
    "variant": font(21, True),
}


def canvas(size: tuple[int, int]):
    image = Image.new("RGBA", size, "#101214")
    draw = ImageDraw.Draw(image)
    for y in range(size[1]):
        shade = round(15 + y / size[1] * 9)
        draw.line((0, y, size[0], y), fill=(shade, shade + 1, shade + 3, 255))
    return image


def arena_crop(size: tuple[int, int]):
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
    return ImageEnhance.Brightness(ground).enhance(0.66).convert("RGBA")


def load_parts(config):
    result = {}
    for direction in ("south", config["side"], "north"):
        for path in (config["parts"] / direction).glob("*.webp"):
            result[f"{direction}/{path.stem}"] = Image.open(path).convert("RGBA")
    final = ASSETS / "final-parts"
    if config["id"] == "ace":
        result["final/ace-west-tail-fan-v1"] = Image.open(final / "ace/west/tail-fan-v1.webp").convert("RGBA")
        result["final/ace-north-tail-fan-v1"] = Image.open(final / "ace/north/tail-fan-v1.webp").convert("RGBA")
    if config["id"] == "artillery":
        result["final/artillery-west-body-v1"] = Image.open(final / "artillery/west/body-v1.webp").convert("RGBA")
        result["final/artillery-west-fist-near-v1"] = Image.open(final / "artillery/west/fist-near-v1.webp").convert("RGBA")
    return result


def render_pose(pose, images):
    frame = Image.new("RGBA", (FRAME * 2, FRAME * 2))
    for item in pose["parts"]:
        image = images[item["key"]]
        c, s = math.cos(item["rotation"]), math.sin(item["rotation"])
        sx, sy = item["scaleX"] * 2, item["scaleY"] * 2
        x, y = item["x"] * 2, item["y"] * 2
        ox, oy = image.width * item["originX"], image.height * item["originY"]
        matrix = (
            c / sx, s / sx, ox - (c * x + s * y) / sx,
            -s / sy, c / sy, oy - (-s * x + c * y) / sy,
        )
        layer = image.convert("RGBa").transform(
            frame.size, Image.Transform.AFFINE, matrix, Image.Resampling.BICUBIC
        ).convert("RGBA")
        frame.alpha_composite(layer)
    frame = frame.convert("RGBa").resize((FRAME, FRAME), Image.Resampling.LANCZOS).convert("RGBA")
    frame.putalpha(frame.getchannel("A").point(lambda value: 0 if value <= 12 else value))
    return frame


def health_bar(draw, x: int, y: int, width: int = 58):
    draw.rounded_rectangle((x - width // 2, y, x + width // 2, y + 7), radius=3,
                           fill="#221719", outline="#f3eee4", width=1)
    draw.rounded_rectangle((x - width // 2 + 2, y + 2, x + width // 2 - 2, y + 5), radius=1,
                           fill="#5cff74")


def paste_center(target, source, center, size):
    rendered = source.resize((size, size), Image.Resampling.LANCZOS)
    target.alpha_composite(rendered, (round(center[0] - size / 2), round(center[1] - size / 2)))


def render_master_board(data, rendered):
    image = canvas((1900, 1260))
    draw = ImageDraw.Draw(image)
    draw.text((50, 32), "FINALE SPIELBARE HÄHNE · GEMEINSAME MASTER-ABNAHME 1",
              font=FONTS["title"], fill="#f6ecd9")
    draw.text((52, 82), "Neutrale Masteransichten · getrennte Final-v1-Pipeline · rechts echte Desktop-Spielgröße",
              font=FONTS["subtitle"], fill="#aeb6bb")

    labels = (("south", "SÜD"), ("side", "SEITE"), ("north", "NORD"))
    # Reserve a dedicated left column for the full character and role names;
    # the previous card placement painted over the final letters.
    large_x = (400, 710, 1020)
    for row, config in enumerate(CHARACTERS):
        top = 128 + row * 370
        draw.rounded_rectangle((24, top, 1876, top + 344), radius=18,
                               fill="#15181b", outline="#373d42", width=2)
        draw.text((52, top + 48), config["name"], font=FONTS["name"], fill=config["accent"])
        draw.text((54, top + 91), config["role"], font=FONTS["role"], fill="#c3c9cc")
        direction_map = {"south": "south", "side": config["side"], "north": "north"}
        for (key, label), x in zip(labels, large_x):
            draw.rounded_rectangle((x - 145, top + 18, x + 145, top + 324), radius=14,
                                   fill="#0b0d0f", outline="#2e3438", width=1)
            paste_center(image, rendered[config["id"]][direction_map[key]], (x, top + 163), 250)
            draw.text((x, top + 305), label, anchor="mm", font=FONTS["label"], fill="#e2e4e5")

        panel = arena_crop((650, 306))
        pdraw = ImageDraw.Draw(panel)
        pdraw.rectangle((0, 0, 650, 38), fill=(15, 17, 19, 222))
        pdraw.text((18, 12), f"ECHTE SCALE · {data['scales'][config['id']]:.3f}",
                   font=FONTS["label"], fill=config["accent"])
        for index, (key, label) in enumerate(labels):
            x = 105 + index * 216
            y = 166
            health_bar(pdraw, x, y - 62)
            direction = direction_map[key]
            paste_center(panel, rendered[config["id"]][direction], (x, y),
                         round(FRAME * data["scales"][config["id"]]))
            pdraw.text((x, 264), label, anchor="mm", font=FONTS["small"], fill="#f3eadc")
        image.alpha_composite(panel, (1200, top + 18))
        draw.rounded_rectangle((1200, top + 18, 1850, top + 324), radius=14,
                               outline=config["accent"], width=2)
    image.convert("RGB").save(OUTPUT / "rooster-final-master-review.png", quality=96)


def baseline_frame(sheet, direction):
    row = {"south": 0, "side": 1, "north": 3}[direction]
    return sheet.crop((0, row * FRAME, FRAME, (row + 1) * FRAME))


def render_baseline_comparison(data, rendered, contact_rendered):
    image = canvas((1740, 1020))
    draw = ImageDraw.Draw(image)
    draw.text((50, 32), "LEGACY → GAMEPLAY → FINAL V1 · ECHTE DESKTOP-SPIELGRÖSSE",
              font=FONTS["title"], fill="#f6ecd9")
    draw.text((52, 82), "Identische Arena, Kontaktphase und Healthbar · Blitzkamm Final mit 0,255",
              font=FONTS["subtitle"], fill="#aeb6bb")
    variants = (("legacy", "ALT / LEGACY", "#c8a56a"),
                ("gameplay", "AKTUELL / GAMEPLAY", "#e7b23f"),
                ("final", "FINAL V1", "#78d8a7"))
    left, top, cell_w, cell_h = 215, 138, 495, 280
    ground = arena_crop((cell_w - 12, cell_h - 12))
    for column, (_, label, accent) in enumerate(variants):
        x = left + column * cell_w
        draw.text((x + cell_w / 2, top - 14), label, anchor="ms", font=FONTS["variant"], fill=accent)
    for row, config in enumerate(CHARACTERS):
        y = top + 15 + row * cell_h
        draw.text((28, y + 105), config["name"], font=FONTS["name"], fill=config["accent"])
        draw.text((30, y + 147), config["role"], font=FONTS["role"], fill="#c3c9cc")
        legacy = Image.open(config["legacy"]).convert("RGBA")
        gameplay = Image.open(config["gameplay"]).convert("RGBA")
        for column, (variant, _, accent) in enumerate(variants):
            x0 = left + column * cell_w
            panel = ground.copy()
            pdraw = ImageDraw.Draw(panel)
            for index, direction in enumerate(("south", "side", "north")):
                x = 82 + index * 158
                y0 = 145
                health_bar(pdraw, x, y0 - 58)
                if variant == "final":
                    source_direction = config["side"] if direction == "side" else direction
                    current = contact_rendered[config["id"]][source_direction]
                    scale = data["scales"][config["id"]]
                else:
                    current = baseline_frame(legacy if variant == "legacy" else gameplay, direction)
                    scale = config["base_scale"]
                paste_center(panel, current, (x, y0), round(FRAME * scale))
                pdraw.text((x, 224), {"south": "SÜD", "side": "SEITE", "north": "NORD"}[direction],
                           anchor="mm", font=FONTS["small"], fill="#f3eadc")
            image.alpha_composite(panel, (x0 + 6, y + 6))
            draw.rounded_rectangle((x0 + 6, y + 6, x0 + cell_w - 6, y + cell_h - 6), radius=12,
                                   outline=accent, width=2)
    image.convert("RGB").save(OUTPUT / "legacy-gameplay-final-real-scale.png", quality=96)


def write_metrics(data, rendered):
    metrics = {}
    for config in CHARACTERS:
        directions = {}
        for direction in ("south", config["side"], "north"):
            box = rendered[config["id"]][direction].getchannel("A").getbbox()
            width, height = box[2] - box[0], box[3] - box[1]
            directions[direction] = {
                "sourceBox": list(box),
                "sourceVisibleSize": [width, height],
                "gameVisibleSize": [round(width * data["scales"][config["id"]], 1),
                                    round(height * data["scales"][config["id"]], 1)],
            }
        metrics[config["id"]] = {"scale": data["scales"][config["id"]], "directions": directions}
    (OUTPUT / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    data = json.loads(POSES.read_text(encoding="utf-8"))
    rendered = {}
    contact_rendered = {}
    for config in CHARACTERS:
        images = load_parts(config)
        rendered[config["id"]] = {
            direction: render_pose(pose, images)
            for direction, pose in data["characters"][config["id"]]["neutral"].items()
        }
        contact_rendered[config["id"]] = {
            direction: render_pose(pose, images)
            for direction, pose in data["characters"][config["id"]]["contact"].items()
        }
    render_master_board(data, rendered)
    render_baseline_comparison(data, rendered, contact_rendered)
    write_metrics(data, rendered)
    print(f"Rendered final master review to {OUTPUT}")


if __name__ == "__main__":
    main()
