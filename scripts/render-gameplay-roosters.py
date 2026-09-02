"""Bake the compact Bummbert and Blitzkamm gameplay rigs into review and runtime sheets."""

from pathlib import Path
import json
import math

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SIZE = 256
SCALE = 2
CONFIGS = (
    {
        "id": "artillery",
        "label": "BUMMBERT",
        "source": ROOT / "art-source/characters/artillery-gameplay-v1",
        "parts": ROOT / "src/assets/characters/artillery-four-direction",
        "directions": ("south", "west", "north"),
        "runtime_rows": ("south", "west", "east", "north"),
        "qa": ROOT / "docs/qa/artillery-gameplay",
        "runtime": ROOT / "src/assets/characters/artillery-gameplay",
        "mirror_key": "eastDerivedFrom",
        "mirror_value": "west-mirrored",
    },
    {
        "id": "storm",
        "label": "BLITZKAMM",
        "source": ROOT / "art-source/characters/storm-gameplay-v1",
        "parts": ROOT / "src/assets/characters/storm-four-direction",
        "directions": ("south", "east", "north"),
        "runtime_rows": ("south", "west", "east", "north"),
        "qa": ROOT / "docs/qa/storm-gameplay",
        "runtime": ROOT / "src/assets/characters/storm-gameplay",
        "mirror_key": "westDerivedFrom",
        "mirror_value": "east-mirrored",
    },
)


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


def render_character(config):
    source = config["source"]
    export = source / "exports/four-direction"
    export.mkdir(parents=True, exist_ok=True)
    config["qa"].mkdir(parents=True, exist_ok=True)
    data = json.loads((source / "four-direction-poses.json").read_text(encoding="utf-8"))
    images = {}
    for direction in config["directions"]:
        for path in (config["parts"] / direction).glob("*.webp"):
            images[f"{direction}/{path.stem}"] = Image.open(path).convert("RGBA")

    reports = []
    neutral_frames = {}
    runtime_frames = {}
    animation_manifest = {
        "version": 1,
        "frameWidth": SIZE,
        "frameHeight": SIZE,
        "columns": 8,
        config["mirror_key"]: config["mirror_value"],
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
                raise ValueError(f"Empty frame: {config['id']} {clip['direction']} {clip['mode']} {index}")
            margin = min(bbox[0], bbox[1], SIZE - bbox[2], SIZE - bbox[3])
            if margin < 7:
                raise ValueError(f"Clipped silhouette: {config['id']} {clip['direction']} {clip['mode']} {index}: {bbox}")
            minimum_margin = min(minimum_margin, margin)
            dimensions.append([bbox[2] - bbox[0], bbox[3] - bbox[1]])
            sheet.alpha_composite(frame, (index % 8 * SIZE, index // 8 * SIZE))
        name = f"{config['id']}-{clip['direction']}-{clip['mode']}"
        sheet.save(export / f"{name}.webp", lossless=True, method=6)
        gif_frames = [preview(frame, f"{config['label']} / {clip['direction'].upper()} / {clip['mode'].upper()}") for frame in frames]
        gif_duration = round(clip["duration"] / len(frames) / 10) * 10
        gif_frames[0].save(
            config["qa"] / f"{name}.gif",
            save_all=True,
            append_images=gif_frames[1:],
            duration=gif_duration,
            loop=0,
            optimize=False,
            disposal=2,
        )
        animation_manifest["clips"][f"{clip['direction']}-{clip['mode']}"] = {
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
        draw.text((position[0] + 128, position[1] + 268), direction.upper(),
                  font=font(13), fill="#d59452", anchor="mm")
    contact.save(config["qa"] / f"{config['id']}-gameplay-four-directions-neutral.png")

    config["runtime"].mkdir(parents=True, exist_ok=True)
    runtime_specs = {
        "walk": {"indices": (0, 3, 6, 9, 12, 15, 18, 21), "columns": 8},
        "idle": {"indices": (0, 3, 6, 9, 12, 15, 18, 21), "columns": 8},
    }
    runtime_manifest = {"frameWidth": SIZE, "frameHeight": SIZE, "rows": {}, "clips": {}}
    for mode, spec in runtime_specs.items():
        sheet = Image.new("RGBA", (SIZE * spec["columns"], SIZE * 4))
        for row, direction in enumerate(config["runtime_rows"]):
            runtime_manifest["rows"][direction] = row
            canonical_direction = direction
            if config["id"] == "artillery" and direction in ("west", "east"):
                canonical_direction = "west"
            if config["id"] == "storm" and direction in ("west", "east"):
                canonical_direction = "east"
            for column, frame_index in enumerate(spec["indices"]):
                sheet.alpha_composite(runtime_frames[(canonical_direction, mode)][frame_index], (column * SIZE, row * SIZE))
        filename = f"rooster-{config['id']}-gameplay-{mode}.webp"
        sheet.save(config["runtime"] / filename, lossless=True, method=6)
        duration = next(clip["duration"] for clip in data["clips"] if clip["mode"] == mode)
        runtime_manifest["clips"][mode] = {
            "file": filename,
            "columns": spec["columns"],
            "sampledFrames": list(spec["indices"]),
            "durationMs": duration,
        }
    (config["runtime"] / "manifest.json").write_text(json.dumps(runtime_manifest, indent=2) + "\n", encoding="utf-8")
    (export / "animations.json").write_text(json.dumps(animation_manifest, indent=2) + "\n", encoding="utf-8")
    (config["qa"] / "asset-check.json").write_text(json.dumps({
        "clips": reports,
        "frameSize": SIZE,
        "directions": ["south", "west", "north", "east"],
        config["mirror_key"]: True,
        "runtimeWalkFrames": 8,
        "sourcePartIdentity": "Same immutable direction parts in every frame",
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"id": config["id"], "clips": reports}, indent=2))


def main():
    for config in CONFIGS:
        render_character(config)


if __name__ == "__main__":
    main()
