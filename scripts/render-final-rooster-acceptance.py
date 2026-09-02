from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
QA_DIR = ROOT / "docs" / "qa" / "rooster-final-v1"
CAPTURE_DIR = QA_DIR / "in-game"
OUTPUT = QA_DIR / "final-in-game-desktop-mobile.png"

ROWS = (
    ("ACE / ASS", "ace"),
    ("BUMMBERT", "artillery"),
    ("BLITZKAMM", "storm"),
)
COLS = (
    ("DESKTOP 1440 x 900", "desktop"),
    ("MOBILE 390 x 844", "mobile"),
)


def font(size: int, bold: bool = False):
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf") if bold else Path("C:/Windows/Fonts/segoeui.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    scale = min(target_w / image.width, target_h / image.height)
    width, height = round(image.width * scale), round(image.height * scale)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def main():
    canvas = Image.new("RGB", (1160, 1840), "#111720")
    draw = ImageDraw.Draw(canvas)
    draw.text((56, 38), "FINAL ROOSTERS — IN-GAME READABILITY", font=font(42, True), fill="#f7d56b")
    draw.text(
        (58, 94),
        "Live combat capture · final 8-frame walk cycles · reversible ?roosterVisual=final",
        font=font(21),
        fill="#b8c7d9",
    )

    cell_h = 450
    desktop_w = 720
    mobile_w = 208
    gap_x, gap_y = 50, 105
    origin_x, origin_y = 78, 210
    col_widths = (desktop_w, mobile_w)
    col_x = (origin_x, origin_x + desktop_w + gap_x)

    for col_index, (column_label, _) in enumerate(COLS):
        x = col_x[col_index]
        draw.text((x, 145), column_label, font=font(21, True), fill="#e7edf5")

    for row_index, (row_label, rooster_id) in enumerate(ROWS):
        y = origin_y + row_index * (cell_h + gap_y)
        draw.text((origin_x, y - 38), row_label, font=font(23, True), fill="#f7d56b")
        for col_index, (_, viewport_id) in enumerate(COLS):
            x = col_x[col_index]
            cell_w = col_widths[col_index]
            source = Image.open(CAPTURE_DIR / f"{rooster_id}-final-{viewport_id}-combat.png").convert("RGB")
            framed = contain(source, (cell_w, cell_h))
            frame_x = x + (cell_w - framed.width) // 2
            frame_y = y + (cell_h - framed.height) // 2
            canvas.paste(framed, (frame_x, frame_y))
            draw.rounded_rectangle(
                (frame_x - 2, frame_y - 2, frame_x + framed.width + 1, frame_y + framed.height + 1),
                radius=7,
                outline="#43566f",
                width=3,
            )

    draw.text(
        (56, 1792),
        "Prüffokus: Silhouette, Schrittlesbarkeit, Schwerpunkt, Effektkontrast und mobile Skalierung",
        font=font(19),
        fill="#93a8bf",
    )
    canvas.save(OUTPUT, quality=94)
    print(f"Rendered {OUTPUT}")


if __name__ == "__main__":
    main()
