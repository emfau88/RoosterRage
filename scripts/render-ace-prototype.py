"""Bake the exact sampled live-rig transforms into portable sprite sheets/GIFs.

No artwork is invented or repainted here. The source parts stay immutable.
"""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/ace-production-v1"
PARTS = ROOT / "src/assets/characters/ace-production-v1"
EXPORT = SOURCE / "exports"
QA = ROOT / "docs/qa/ace-production-v1"
SIZE = 256
SCALE = 2


def render(pose, images):
    frame = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE))
    for part in pose["parts"]:
        if part["alpha"] <= 0:
            continue
        image = images[part["key"]]
        c, s = math.cos(part["rotation"]), math.sin(part["rotation"])
        sx, sy = part["scaleX"] * SCALE, part["scaleY"] * SCALE
        x, y = part["x"] * SCALE, part["y"] * SCALE
        ox, oy = image.width * part["originX"], image.height * part["originY"]
        matrix = (c / sx, s / sx, ox - (c * x + s * y) / sx,
                  -s / sy, c / sy, oy - (-s * x + c * y) / sy)
        layer = image.convert("RGBa").transform(frame.size, Image.Transform.AFFINE, matrix,
                                                Image.Resampling.BICUBIC).convert("RGBA")
        if part["alpha"] < 1:
            layer.putalpha(layer.getchannel("A").point(lambda a: round(a * part["alpha"])))
        frame.alpha_composite(layer)
    return frame.convert("RGBa").resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGBA")


def preview(frame, label):
    canvas = Image.new("RGB", (320, 310), "#202b28")
    canvas.paste(frame, (32, 12), frame)
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("arial.ttf", 13)
    except OSError:
        font = ImageFont.load_default(size=13)
    draw.text((160, 287), label, font=font, fill="#e8dfc3", anchor="mm")
    return canvas


def main():
    EXPORT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    data = json.loads((SOURCE / "poses.json").read_text(encoding="utf-8"))
    images = {path.stem: Image.open(path).convert("RGBA") for path in PARTS.glob("*.webp") if path.stem != "chat-walk-comparison"}
    manifest = {"frameWidth": SIZE, "frameHeight": SIZE, "direction": "south", "origin": data["origin"],
                "physics": data["physics"], "shadowBaked": False, "clips": {}}
    reports = []
    for clip in data["clips"]:
        frames = [render(pose, images) for pose in clip["poses"]]
        sheet = Image.new("RGBA", (SIZE * 8, SIZE * math.ceil(len(frames) / 8)))
        minimum_margin = SIZE
        for i, frame in enumerate(frames):
            bbox = frame.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()
            assert bbox, f"Empty frame: {clip['name']} {i}"
            margin = min(bbox[0], bbox[1], SIZE - bbox[2], SIZE - bbox[3])
            assert margin >= 8, f"Clipped silhouette: {clip['name']} {i} {bbox}"
            minimum_margin = min(minimum_margin, margin)
            sheet.alpha_composite(frame, (i % 8 * SIZE, i // 8 * SIZE))
        name = f"ace-south-{clip['name']}"
        sheet.save(EXPORT / f"{name}.png", optimize=True)
        sheet.save(EXPORT / f"{name}.webp", lossless=True, method=6)
        looping = clip["name"] in ("walk", "idle", "walk-shot", "walk-hurt")
        manifest["clips"][clip["name"]] = {"file": f"{name}.webp", "frameCount": len(frames), "columns": 8,
            "durationMs": clip["duration"], "frameRate": len(frames) * 1000 / clip["duration"],
            "repeat": -1 if looping else 0, "projectileSpawn": "external gameplay event"}
        previews = [preview(f, f"ACE / SOUTH / {clip['name'].upper()}") for f in frames]
        # GIF has 10ms timing resolution. All authored clip durations divide exactly.
        duration = round(clip["duration"] / len(frames) / 10) * 10
        if not looping:
            previews += [preview(render(clip["poses"][0] if clip["name"] == "idle" else data["clips"][1]["poses"][0], images), "ACE / SOUTH / REST")] * 20
        previews[0].save(QA / f"{name}.gif", save_all=True, append_images=previews[1:], duration=duration,
                         loop=0, optimize=False, disposal=2)
        if clip["name"] == "idle":
            frames[0].save(QA / "ace-south-neutral.png")
        reports.append({"clip": clip["name"], "frames": len(frames), "minimumMarginPx": minimum_margin})
    (EXPORT / "animations.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (QA / "asset-check.json").write_text(json.dumps({"clips": reports, "artworkParts": 6, "frameSize": SIZE,
                                                    "sourcePartIdentity": "Same immutable parts in every frame"}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
