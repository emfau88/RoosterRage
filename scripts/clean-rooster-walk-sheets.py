from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / "src" / "assets" / "characters"
FRAME_SIZE = 256
SIDE_ROW = 2
ALPHA_THRESHOLD = 20

SHEETS = (
    ("rooster-artillery-walk-v2.webp", "rooster-artillery-walk-v3.webp"),
    ("rooster-storm-walk-v2.webp", "rooster-storm-walk-v3.webp"),
)


def connected_components(alpha: Image.Image) -> list[list[tuple[int, int]]]:
    pixels = alpha.load()
    width, height = alpha.size
    seen: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            if pixels[x, y] <= ALPHA_THRESHOLD or (x, y) in seen:
                continue
            component = []
            queue = [(x, y)]
            seen.add((x, y))
            while queue:
                current_x, current_y = queue.pop()
                component.append((current_x, current_y))
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if (
                        0 <= next_x < width
                        and 0 <= next_y < height
                        and pixels[next_x, next_y] > ALPHA_THRESHOLD
                        and (next_x, next_y) not in seen
                    ):
                        seen.add((next_x, next_y))
                        queue.append((next_x, next_y))
            components.append(component)
    return components


def bounds(component: list[tuple[int, int]]) -> tuple[int, int, int, int]:
    xs, ys = zip(*component)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def remove_row_spill(image: Image.Image) -> int:
    removed = 0
    pixels = image.load()
    for column in range(4):
        left = column * FRAME_SIZE
        top = SIDE_ROW * FRAME_SIZE
        frame = image.crop((left, top, left + FRAME_SIZE, top + FRAME_SIZE))
        components = connected_components(frame.getchannel("A"))
        if not components:
            raise RuntimeError(f"Side frame {column} is empty")
        largest = max(components, key=len)
        for component in components:
            if component is largest:
                continue
            component_left, component_top, component_right, component_bottom = bounds(component)
            # Only remove the small, detached spill from the north-facing row.
            if component_top < 210 or len(component) > len(largest) * 0.04:
                continue
            for y in range(max(0, component_top - 2), min(FRAME_SIZE, component_bottom + 2)):
                for x in range(max(0, component_left - 2), min(FRAME_SIZE, component_right + 2)):
                    pixels[left + x, top + y] = (0, 0, 0, 0)
            removed += 1
    return removed


def main() -> None:
    for source_name, target_name in SHEETS:
        source = ASSET_ROOT / source_name
        target = ASSET_ROOT / target_name
        with Image.open(source) as source_image:
            sheet = source_image.convert("RGBA")
        removed = remove_row_spill(sheet)
        if removed != 4:
            raise RuntimeError(f"Expected four spill fragments in {source_name}, found {removed}")
        sheet.save(target, "WEBP", quality=92, method=6)
        print(f"{source_name} -> {target_name}: removed {removed} row-spill fragments")


if __name__ == "__main__":
    main()
