"""Bake the live Blitzkamm rig poses into runtime sheets and review artifacts."""

from pathlib import Path
import json
import math

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/storm-production-v1"
PARTS = ROOT / "src/assets/characters/storm-four-direction"
EXPORT = SOURCE / "exports/four-direction"
QA = ROOT / "docs/qa/storm-four-direction"
RUNTIME = ROOT / "src/assets/characters/storm-next"
SIZE = 256
SCALE = 2


def render(pose, images):
    frame = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE))
    for item in pose["parts"]:
        image = images[item["key"]]
        c, s = math.cos(item["rotation"]), math.sin(item["rotation"])
        sx, sy = item["scaleX"] * SCALE, item["scaleY"] * SCALE
        x, y = item["x"] * SCALE, item["y"] * SCALE
        ox, oy = image.width * item["originX"], image.height * item["originY"]
        matrix = (
            c / sx, s / sx, ox - (c * x + s * y) / sx,
            -s / sy, c / sy, oy - (-s * x + c * y) / sy,
        )
        layer = image.convert("RGBa").transform(
            frame.size, Image.Transform.AFFINE, matrix, Image.Resampling.BICUBIC
        ).convert("RGBA")
        if item.get("alpha", 1) < 1:
            alpha = item["alpha"]
            layer.putalpha(layer.getchannel("A").point(lambda value: round(value * alpha)))
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
    draw = ImageDraw.Draw(canvas)
    draw.text((160, 280), label, font=font(12), fill="#d59452", anchor="mm")
    return canvas


def main():
    EXPORT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    data = json.loads((SOURCE / "four-direction-poses.json").read_text(encoding="utf-8"))
    images = {}
    for direction in ("south", "east", "north"):
        for path in (PARTS / direction).glob("*.webp"):
            images[f"{direction}/{path.stem}"] = Image.open(path).convert("RGBA")
    reports = []
    neutral_frames = {}
    runtime_frames = {}
    manifest = {
        "version": 1,
        "frameWidth": SIZE,
        "frameHeight": SIZE,
        "columns": 8,
        "westDerivedFrom": "east-mirrored",
        "clips": {},
    }
    for clip in data["clips"]:
        frames = [render(pose, images) for pose in clip["poses"]]
        runtime_frames[(clip["direction"], clip["mode"])] = frames
        sheet = Image.new("RGBA", (SIZE * 8, SIZE * math.ceil(len(frames) / 8)))
        minimum_margin = SIZE
        dimensions = []
        for index, frame in enumerate(frames):
            bbox = frame.getchannel("A").point(lambda alpha: 255 if alpha > 12 else 0).getbbox()
            if not bbox:
                raise ValueError(f"Empty frame: {clip['direction']} {clip['mode']} {index}")
            margin = min(bbox[0], bbox[1], SIZE - bbox[2], SIZE - bbox[3])
            if margin < 7:
                raise ValueError(f"Clipped silhouette: {clip['direction']} {clip['mode']} {index}: {bbox}")
            minimum_margin = min(minimum_margin, margin)
            dimensions.append([bbox[2] - bbox[0], bbox[3] - bbox[1]])
            sheet.alpha_composite(frame, (index % 8 * SIZE, index // 8 * SIZE))
        name = f"storm-{clip['direction']}-{clip['mode']}"
        sheet.save(EXPORT / f"{name}.png", optimize=True)
        sheet.save(EXPORT / f"{name}.webp", lossless=True, method=6)
        gif_frames = [preview(frame, f"BLITZKAMM / {clip['direction'].upper()} / {clip['mode'].upper()}") for frame in frames]
        gif_duration = round(clip["duration"] / len(frames) / 10) * 10
        gif_frames[0].save(
            QA / f"{name}.gif",
            save_all=True,
            append_images=gif_frames[1:],
            duration=gif_duration,
            loop=0,
            optimize=False,
            disposal=2,
        )
        manifest["clips"][f"{clip['direction']}-{clip['mode']}"] = {
            "file": f"{name}.webp",
            "frameCount": len(frames),
            "durationMs": clip["duration"],
            "frameRate": len(frames) * 1000 / clip["duration"],
            "repeat": -1,
        }
        if clip["mode"] == "idle":
            neutral_frames[clip["direction"]] = frames[0]
        widths = [value[0] for value in dimensions]
        heights = [value[1] for value in dimensions]
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
        contact.paste(neutral_frames[direction], position, neutral_frames[direction])
        draw.text(
            (position[0] + 128, position[1] + 268),
            direction.upper(),
            font=font(13),
            fill="#d59452",
            anchor="mm",
        )
    contact.save(QA / "storm-four-directions-neutral.png")

    RUNTIME.mkdir(parents=True, exist_ok=True)
    runtime_specs = {
        "walk": {"indices": (0, 6, 12, 18), "columns": 4},
        "idle": {"indices": (0, 3, 6, 9, 12, 15, 18, 21), "columns": 8},
    }
    runtime_manifest = {"frameWidth": SIZE, "frameHeight": SIZE, "rows": {}, "clips": {}}
    for mode, spec in runtime_specs.items():
        sheet = Image.new("RGBA", (SIZE * spec["columns"], SIZE * 4))
        for row, direction in enumerate(("south", "west", "east", "north")):
            runtime_manifest["rows"][direction] = row
            # The game mirrors Blitzkamm's canonical authored east row for west.
            # Keep that contract for legacy compatibility; the QA exports above
            # still contain true east and west poses.
            source_direction = "east" if direction in ("west", "east") else direction
            for column, frame_index in enumerate(spec["indices"]):
                sheet.alpha_composite(runtime_frames[(source_direction, mode)][frame_index], (column * SIZE, row * SIZE))
        filename = f"rooster-storm-next-{mode}.webp"
        sheet.save(RUNTIME / filename, lossless=True, method=6)
        duration = next(clip["duration"] for clip in data["clips"] if clip["mode"] == mode)
        runtime_manifest["clips"][mode] = {
            "file": filename,
            "columns": spec["columns"],
            "sampledFrames": list(spec["indices"]),
            "durationMs": duration,
        }
    (RUNTIME / "manifest.json").write_text(json.dumps(runtime_manifest, indent=2) + "\n", encoding="utf-8")
    (EXPORT / "animations.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (QA / "asset-check.json").write_text(json.dumps({
        "clips": reports,
        "frameSize": SIZE,
        "directions": ["south", "west", "north", "east"],
        "westMirrorsEast": True,
        "sourcePartIdentity": "Same immutable direction parts in every frame",
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
