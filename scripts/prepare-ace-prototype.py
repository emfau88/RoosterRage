"""Package authored Ace parts without repainting or per-frame rescaling.

The committed alpha master was extracted from the generated chroma source.
Only crop, premultiplied resize, and lossless packaging happen here.
"""
from pathlib import Path
import hashlib
import json

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/characters/ace-production-v1"
OUTPUT = ROOT / "src/assets/characters/ace-production-v1"

PARTS = {
    "body": (0, 0, 512, 650),
    "wing-left": (512, 0, 1024, 650),
    "wing-right": (1024, 0, 1536, 650),
    "foot-left": (0, 650, 512, 1024),
    "foot-right": (512, 650, 1024, 1024),
    "wing-throw": (1024, 650, 1536, 1024),
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE / "generated/south-parts-alpha-v2.png").convert("RGBA")
    assert source.size == (1536, 1024)
    assert source.getchannel("A").getextrema() == (0, 255)
    metadata = {"version": 2, "direction": "south", "frameSize": 256,
                "source": "generated/south-parts-alpha-v2.png", "parts": {}}
    for name, rect in PARTS.items():
        cell = source.crop(rect)
        bbox = cell.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        assert bbox, f"Empty component: {name}"
        bbox = (max(0, bbox[0] - 3), max(0, bbox[1] - 3),
                min(cell.width, bbox[2] + 3), min(cell.height, bbox[3] + 3))
        part = cell.crop(bbox)
        path = OUTPUT / f"{name}.webp"
        part.save(path, lossless=True, method=6)
        metadata["parts"][name] = {
            "width": part.width, "height": part.height,
            "sourceRect": [rect[0] + bbox[0], rect[1] + bbox[1], part.width, part.height],
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        }

    # Preserve the chat animation's authored relative positions. Do not fit each
    # frame independently; that would conceal source inconsistencies and bounce.
    chat = Image.open(SOURCE / "references/south-walk-chat.png").convert("RGBA")
    frames = []
    for row in range(2):
        for col in range(4):
            frames.append(chat.crop((round(col * chat.width / 4), round(row * chat.height / 2),
                                     round((col + 1) * chat.width / 4), round((row + 1) * chat.height / 2))))
    scale = 224 / max(frame.height for frame in frames)
    sheet = Image.new("RGBA", (1024, 512))
    for index, frame in enumerate(frames):
        resized = frame.convert("RGBa").resize(
            (round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS
        ).convert("RGBA")
        sheet.alpha_composite(resized, ((index % 4) * 256 + (256 - resized.width) // 2,
                                        (index // 4) * 256 + 16))
    sheet.save(OUTPUT / "chat-walk-comparison.webp", lossless=True, method=6)
    (OUTPUT / "parts.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
