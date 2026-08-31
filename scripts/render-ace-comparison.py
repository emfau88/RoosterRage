"""Render a neutral legacy/new Ace comparison and measure the real game footprint."""

from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "src/assets/characters/rooster-ace-walk-v2.webp"
NEW_EXPORTS = ROOT / "art-source/characters/ace-production-v1/exports/four-direction"
OUTPUT = ROOT / "docs/qa/ace-four-direction"
FRAME = 256
GAME_SCALE = 0.25
DIRECTIONS = ("south", "west", "east", "north")
LEGACY_FRAME = {"south": 0, "west": 4, "east": 8, "north": 12}


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default(size=size)


def bbox(image):
    return image.getchannel("A").point(lambda alpha: 255 if alpha > 8 else 0).getbbox()


def legacy_frame(sheet, index):
    x, y = index % 4 * FRAME, index // 4 * FRAME
    return sheet.crop((x, y, x + FRAME, y + FRAME))


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    legacy = Image.open(LEGACY).convert("RGBA")
    canvas = Image.new("RGB", (680, 1120), "#080a09")
    draw = ImageDraw.Draw(canvas)
    draw.text((170, 30), "CURRENT GAME ACE", font=font(18, True), fill="#f0e8d5", anchor="mm")
    draw.text((510, 30), "NEW ACE", font=font(18, True), fill="#f0e8d5", anchor="mm")
    rows = []
    for row, direction in enumerate(DIRECTIONS):
        old = legacy_frame(legacy, LEGACY_FRAME[direction])
        new_sheet = Image.open(NEW_EXPORTS / f"ace-{direction}-idle.png").convert("RGBA")
        new = new_sheet.crop((0, 0, FRAME, FRAME))
        old_box, new_box = bbox(old), bbox(new)
        old_size = [old_box[2] - old_box[0], old_box[3] - old_box[1]]
        new_size = [new_box[2] - new_box[0], new_box[3] - new_box[1]]
        y = 52 + row * 264
        canvas.paste(old, (42, y), old)
        canvas.paste(new, (382, y), new)
        label_y = y + 240
        draw.text((340, y + 10), direction.upper(), font=font(12, True), fill="#c7a955", anchor="mm")
        draw.text((170, label_y), f"{old_size[0]}×{old_size[1]} px  |  game {old_size[0] * GAME_SCALE:.1f}×{old_size[1] * GAME_SCALE:.1f}",
                  font=font(11), fill="#aeb8b2", anchor="mm")
        draw.text((510, label_y), f"{new_size[0]}×{new_size[1]} px  |  game {new_size[0] * GAME_SCALE:.1f}×{new_size[1] * GAME_SCALE:.1f}",
                  font=font(11), fill="#aeb8b2", anchor="mm")
        rows.append({
            "direction": direction,
            "legacyFrame": LEGACY_FRAME[direction],
            "legacyVisiblePx": old_size,
            "newVisiblePx": new_size,
            "legacyAtGameScale": [round(value * GAME_SCALE, 2) for value in old_size],
            "newAtGameScale": [round(value * GAME_SCALE, 2) for value in new_size],
            "heightMatchScale": round(GAME_SCALE * old_size[1] / new_size[1], 4),
        })
    canvas.save(OUTPUT / "ace-legacy-vs-new.png", optimize=True)
    (OUTPUT / "ace-size-comparison.json").write_text(json.dumps({
        "frameSize": FRAME,
        "currentGameScale": GAME_SCALE,
        "comparison": rows,
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
