"""Read generated alpha only; produce frame coordinates without editing artwork."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent / 'assets'

def spans(values, threshold, min_length):
    result, start = [], None
    for at, value in enumerate(list(values) + [0]):
        if value > threshold and start is None:
            start = at
        if value <= threshold and start is not None:
            if at - start >= min_length:
                result.append((start, at))
            start = None
    return result

layouts = {}
for key, filename in [('blast', 'blast-flipbook.webp'), ('eruption', 'evo-eruption-flipbook.webp')]:
    im = Image.open(ROOT / filename).convert('RGBA')
    w, h = im.size
    alpha = im.getchannel('A')
    px = alpha.load()
    row_bands = spans([sum(px[x, y] > 64 for x in range(w)) for y in range(h)], 10, 30)
    if len(row_bands) != 3:
        raise ValueError(f'{key}: expected 3 separated rows, found {row_bands}')
    row_cuts = [0] + [(row_bands[i][1] + row_bands[i + 1][0]) // 2 for i in range(2)] + [h]
    frames = []
    for row in range(3):
        y, end_y = row_cuts[row:row+2]
        pieces = spans([sum(px[x, yy] > 64 for yy in range(y, end_y)) for x in range(w)], 5, 8)
        groups = [[] for _ in range(4)]
        for start, end in pieces:
            groups[min(3, int(((start + end) / 2) / (w / 4)))].append((start, end))
        if any(not group for group in groups):
            raise ValueError(f'{key}, row {row}: incomplete four-frame layout: {pieces}')
        columns = [(min(p[0] for p in group), max(p[1] for p in group)) for group in groups]
        cuts = [0] + [(columns[i][1] + columns[i+1][0]) // 2 for i in range(3)] + [w]
        for col in range(4):
            x, end_x = cuts[col:col+2]
            frames.append([x, y, end_x-x, end_y-y])
    layouts[key] = {'sourceWidth': w, 'sourceHeight': h, 'frames': frames}
    print(key, '12 complete frame regions', frames)
(ROOT / 'layout.json').write_text(json.dumps(layouts, indent=2), encoding='utf-8')
