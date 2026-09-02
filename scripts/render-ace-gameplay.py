"""Bake the gameplay-scale Ace rig into separate reversible runtime sheets."""

from pathlib import Path
import json
import math

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/ace-gameplay-v1"
PARTS = ROOT / "src/assets/characters/ace-four-direction"
EXPORT = SOURCE / "exports"
QA = ROOT / "docs/qa/ace-gameplay"
RUNTIME = ROOT / "src/assets/characters/ace-gameplay"
SIZE = 256
SCALE = 2


def render(pose, images):
    frame = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE))
    for item in pose["parts"]:
        image = images[item["key"]]
        cosine, sine = math.cos(item["rotation"]), math.sin(item["rotation"])
        scale_x, scale_y = item["scaleX"] * SCALE, item["scaleY"] * SCALE
        x, y = item["x"] * SCALE, item["y"] * SCALE
        origin_x = image.width * item["originX"]
        origin_y = image.height * item["originY"]
        matrix = (
            cosine / scale_x,
            sine / scale_x,
            origin_x - (cosine * x + sine * y) / scale_x,
            -sine / scale_y,
            cosine / scale_y,
            origin_y - (-sine * x + cosine * y) / scale_y,
        )
        layer = image.convert("RGBa").transform(
            frame.size, Image.Transform.AFFINE, matrix, Image.Resampling.BICUBIC
        ).convert("RGBA")
        frame.alpha_composite(layer)
    frame = frame.convert("RGBa").resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGBA")
    frame.putalpha(frame.getchannel("A").point(lambda alpha: 0 if alpha <= 12 else alpha))
    return frame


def font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default(size=size)


def preview(frame, label):
    canvas = Image.new("RGB", (320, 300), "black")
    canvas.paste(frame, (32, 5), frame)
    ImageDraw.Draw(canvas).text((160, 280), label, font=font(12), fill="#cbb46d", anchor="mm")
    return canvas


def main():
    EXPORT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    data = json.loads((SOURCE / "four-direction-poses.json").read_text(encoding="utf-8"))
    images = {}
    for direction in ("south", "west", "north"):
        for path in (PARTS / direction).glob("*.webp"):
            images[f"{direction}/{path.stem}"] = Image.open(path).convert("RGBA")

    reports = []
    neutral_frames = {}
    runtime_frames = {}
    for clip in data["clips"]:
        frames = [render(pose, images) for pose in clip["poses"]]
        runtime_frames[(clip["direction"], clip["mode"])] = frames
        sheet = Image.new("RGBA", (SIZE * 8, SIZE * math.ceil(len(frames) / 8)))
        dimensions = []
        minimum_margin = SIZE
        for index, frame in enumerate(frames):
            bounds = frame.getchannel("A").point(lambda alpha: 255 if alpha > 12 else 0).getbbox()
            if not bounds:
                raise ValueError(f"Empty frame: {clip['direction']} {clip['mode']} {index}")
            margin = min(bounds[0], bounds[1], SIZE - bounds[2], SIZE - bounds[3])
            if margin < 8:
                raise ValueError(f"Clipped silhouette: {clip['direction']} {clip['mode']} {index}: {bounds}")
            minimum_margin = min(minimum_margin, margin)
            dimensions.append([bounds[2] - bounds[0], bounds[3] - bounds[1]])
            sheet.alpha_composite(frame, (index % 8 * SIZE, index // 8 * SIZE))
        name = f"ace-gameplay-{clip['direction']}-{clip['mode']}"
        sheet.save(EXPORT / f"{name}.png", optimize=True)
        gif_frames = [preview(frame, f"ACE GAMEPLAY / {clip['direction'].upper()} / {clip['mode'].upper()}") for frame in frames]
        duration = round(clip["duration"] / len(frames) / 10) * 10
        gif_frames[0].save(
            QA / f"{name}.gif",
            save_all=True,
            append_images=gif_frames[1:],
            duration=duration,
            loop=0,
            optimize=False,
            disposal=2,
        )
        if clip["mode"] == "idle":
            neutral_frames[clip["direction"]] = frames[0]
        widths = [item[0] for item in dimensions]
        heights = [item[1] for item in dimensions]
        reports.append({
            "direction": clip["direction"],
            "mode": clip["mode"],
            "frames": len(frames),
            "minimumMarginPx": minimum_margin,
            "widthRangePx": [min(widths), max(widths)],
            "heightRangePx": [min(heights), max(heights)],
        })

    contact = Image.new("RGB", (640, 640), "black")
    draw = ImageDraw.Draw(contact)
    positions = {"south": (32, 20), "west": (352, 20), "north": (32, 320), "east": (352, 320)}
    for direction, position in positions.items():
        frame = neutral_frames[direction]
        contact.paste(frame, position, frame)
        draw.text((position[0] + 128, position[1] + 268), direction.upper(), font=font(13), fill="#cbb46d", anchor="mm")
    contact.save(QA / "ace-gameplay-four-directions-neutral.png")

    specs = {
        "walk": {"indices": (0, 6, 12, 18), "columns": 4},
        "idle": {"indices": (0, 3, 6, 9, 12, 15, 18, 21), "columns": 8},
    }
    manifest = {"frameWidth": SIZE, "frameHeight": SIZE, "rows": {}, "clips": {}}
    for mode, spec in specs.items():
        sheet = Image.new("RGBA", (SIZE * spec["columns"], SIZE * 4))
        for row, direction in enumerate(("south", "west", "east", "north")):
            manifest["rows"][direction] = row
            for column, frame_index in enumerate(spec["indices"]):
                sheet.alpha_composite(runtime_frames[(direction, mode)][frame_index], (column * SIZE, row * SIZE))
        filename = f"rooster-ace-gameplay-{mode}.webp"
        sheet.save(RUNTIME / filename, lossless=True, method=6)
        matching_clip = next(item for item in data["clips"] if item["mode"] == mode)
        manifest["clips"][mode] = {
            "file": filename,
            "columns": spec["columns"],
            "sampledFrames": list(spec["indices"]),
            "durationMs": matching_clip["duration"],
        }
    (RUNTIME / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (QA / "asset-check.json").write_text(json.dumps({
        "clips": reports,
        "frameSize": SIZE,
        "directions": ["south", "west", "north", "east"],
        "eastMirrorsWest": True,
        "runtimeScale": 0.25,
        "profile": "gameplay-readability",
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
