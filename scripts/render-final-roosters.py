"""Bake all three approved final rigs into reversible eight-frame sheets and QA."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/rooster-final-v1/four-direction-poses.json"
ASSETS = ROOT / "src/assets/characters"
QA = ROOT / "docs/qa/rooster-final-v1"
SIZE = 256
SUPERSAMPLE = 2
SAMPLE_INDICES = (0, 3, 6, 9, 12, 15, 18, 21)

CONFIGS = (
    {"id": "ace", "label": "ACE / ASS", "accent": "#f2bd4c", "parts": "ace-four-direction", "side": "west"},
    {"id": "artillery", "label": "BUMMBERT", "accent": "#e6903f", "parts": "artillery-four-direction", "side": "west"},
    {"id": "storm", "label": "BLITZKAMM", "accent": "#55d9ff", "parts": "storm-four-direction", "side": "east"},
)


def font(size: int, bold: bool = False):
    filename = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


def load_parts(config):
    result = {}
    base = ASSETS / config["parts"]
    for direction in ("south", config["side"], "north"):
        for path in (base / direction).glob("*.webp"):
            result[f"{direction}/{path.stem}"] = Image.open(path).convert("RGBA")
    final = ASSETS / "final-parts"
    if config["id"] == "ace":
        result["final/ace-west-tail-fan-v1"] = Image.open(final / "ace/west/tail-fan-v1.webp").convert("RGBA")
        result["final/ace-north-tail-fan-v1"] = Image.open(final / "ace/north/tail-fan-v1.webp").convert("RGBA")
    elif config["id"] == "artillery":
        result["final/artillery-west-body-v1"] = Image.open(final / "artillery/west/body-v1.webp").convert("RGBA")
        result["final/artillery-west-fist-near-v1"] = Image.open(final / "artillery/west/fist-near-v1.webp").convert("RGBA")
    return result


def render_pose(pose, images):
    frame = Image.new("RGBA", (SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE))
    for item in pose["parts"]:
        source = images[item["key"]]
        cosine, sine = math.cos(item["rotation"]), math.sin(item["rotation"])
        scale_x = item["scaleX"] * SUPERSAMPLE
        scale_y = item["scaleY"] * SUPERSAMPLE
        x, y = item["x"] * SUPERSAMPLE, item["y"] * SUPERSAMPLE
        origin_x = source.width * item["originX"]
        origin_y = source.height * item["originY"]
        matrix = (
            cosine / scale_x, sine / scale_x, origin_x - (cosine * x + sine * y) / scale_x,
            -sine / scale_y, cosine / scale_y, origin_y - (-sine * x + cosine * y) / scale_y,
        )
        layer = source.convert("RGBa").transform(
            frame.size, Image.Transform.AFFINE, matrix, Image.Resampling.BICUBIC
        ).convert("RGBA")
        frame.alpha_composite(layer)
    frame = frame.convert("RGBa").resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGBA")
    frame.putalpha(frame.getchannel("A").point(lambda alpha: 0 if alpha <= 12 else alpha))
    return frame


def frame_hash(frame):
    return hashlib.sha256(frame.tobytes()).hexdigest()


def preview_frame(frame, label, accent):
    canvas = Image.new("RGB", (320, 300), "black")
    canvas.paste(frame, (32, 5), frame)
    ImageDraw.Draw(canvas).text((160, 280), label, anchor="mm", font=font(12, True), fill=accent)
    return canvas


def contact_sheet(config, mode, runtime_frames):
    cell_w, cell_h = 154, 180
    sheet = Image.new("RGB", (cell_w * 8, 52 + cell_h * 4), "black")
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 14), f"{config['label']} · FINAL {mode.upper()} · 8 PHASEN",
              font=font(18, True), fill=config["accent"])
    for row, direction in enumerate(("south", "west", "east", "north")):
        draw.text((8, 54 + row * cell_h), direction.upper(), font=font(10, True), fill=config["accent"])
        for column, frame in enumerate(runtime_frames[(direction, mode)]):
            rendered = frame.resize((150, 150), Image.Resampling.LANCZOS)
            sheet.paste(rendered, (column * cell_w + 2, 70 + row * cell_h), rendered)
            draw.text((column * cell_w + 77, 211 + row * cell_h), str(column + 1),
                      anchor="mm", font=font(9), fill="#aeb5b8")
    sheet.save(QA / f"{config['id']}-final-{mode}-contacts.png")


def bake_character(config, character):
    images = load_parts(config)
    runtime = ASSETS / f"{config['id']}-final"
    runtime.mkdir(parents=True, exist_ok=True)
    frames_24 = {}
    report = []

    for clip in character["clips"]:
        frames = [render_pose(pose, images) for pose in clip["poses"]]
        frames_24[(clip["direction"], clip["mode"])] = frames
        boxes = []
        minimum_margin = SIZE
        for index, frame in enumerate(frames):
            box = frame.getchannel("A").point(lambda value: 255 if value > 12 else 0).getbbox()
            if not box:
                raise ValueError(f"Empty frame: {config['id']} {clip['direction']} {clip['mode']} {index}")
            margin = min(box[0], box[1], SIZE - box[2], SIZE - box[3])
            if margin < 5:
                raise ValueError(f"Clipped frame: {config['id']} {clip['direction']} {clip['mode']} {index}: {box}")
            minimum_margin = min(minimum_margin, margin)
            boxes.append(box)
        report.append({
            "direction": clip["direction"], "mode": clip["mode"], "sourceFrames": 24,
            "minimumMarginPx": minimum_margin,
            "widthRangePx": [min(box[2] - box[0] for box in boxes), max(box[2] - box[0] for box in boxes)],
            "heightRangePx": [min(box[3] - box[1] for box in boxes), max(box[3] - box[1] for box in boxes)],
        })

    runtime_frames = {}
    manifest = {"version": 1, "frameWidth": SIZE, "frameHeight": SIZE, "rows": {}, "clips": {}}
    for mode in ("walk", "idle"):
        for direction in ("south", "west", "east", "north"):
            runtime_frames[(direction, mode)] = [frames_24[(direction, mode)][index] for index in SAMPLE_INDICES]

        sheet = Image.new("RGBA", (SIZE * 8, SIZE * 4))
        for row, direction in enumerate(("south", config["side"], config["side"], "north")):
            manifest["rows"][("south", "west", "east", "north")[row]] = row
            for column, frame in enumerate(runtime_frames[(direction, mode)]):
                sheet.alpha_composite(frame, (column * SIZE, row * SIZE))
        filename = f"rooster-{config['id']}-final-{mode}.webp"
        sheet.save(runtime / filename, lossless=True, method=6)
        duration = next(clip["duration"] for clip in character["clips"] if clip["mode"] == mode)
        manifest["clips"][mode] = {
            "file": filename, "columns": 8, "sampledFrames": list(SAMPLE_INDICES), "durationMs": duration,
        }

        for direction in ("south", "west", "east", "north"):
            gif = [preview_frame(frame, f"{config['label']} / {direction.upper()} / {mode.upper()}", config["accent"])
                   for frame in runtime_frames[(direction, mode)]]
            delay = round(duration / 8 / 10) * 10
            gif[0].save(QA / f"{config['id']}-final-{direction}-{mode}.gif", save_all=True,
                        append_images=gif[1:], duration=delay, loop=0, disposal=2, optimize=False)
        contact_sheet(config, mode, runtime_frames)

    distinct = {
        f"{direction}-{mode}": len({frame_hash(frame) for frame in runtime_frames[(direction, mode)]})
        for direction in ("south", "west", "east", "north") for mode in ("walk", "idle")
    }
    if any(value != 8 for value in distinct.values()):
        raise ValueError(f"Non-distinct final frames for {config['id']}: {distinct}")
    (runtime / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {"scale": character["scale"], "clips": report, "distinctRuntimeFrames": distinct}


def main():
    QA.mkdir(parents=True, exist_ok=True)
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    report = {config["id"]: bake_character(config, data["characters"][config["id"]]) for config in CONFIGS}
    (QA / "final-asset-check.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: {"scale": value["scale"], "clips": len(value["clips"])} for key, value in report.items()}, indent=2))


if __name__ == "__main__":
    main()
