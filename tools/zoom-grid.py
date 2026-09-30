"""Zooms a converted map grid in and crops it around the town.

Usage: python tools/zoom-grid.py <src/data/luzon/map.ts> <zoom> <width> <height>

Resamples the tile grid by `zoom` (nearest tile), crops a width × height window
centred on the houses, rewrites the file, and prints the offset and zoom so
hand-placed coordinates can be moved with: new = (old - offset) * zoom.
"""
import re
import sys


def decode(row):
    out = []
    for n, c in re.findall(r'(\d*)(\D)', row):
        out += [c] * (int(n) if n else 1)
    return out


def encode(row):
    out, i = '', 0
    while i < len(row):
        n = 1
        while i + n < len(row) and row[i + n] == row[i]:
            n += 1
        out += (str(n) if n > 1 else '') + row[i]
        i += n
    return out


path, zoom, W, H = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
src = open(path, encoding='utf-8').read()
rows = re.findall(r"^  '(.*)',$", src, re.M)
grid = [decode(r) for r in rows]
SH, SW = len(grid), len(grid[0])
houses = [(x, y) for y in range(SH) for x in range(SW) if grid[y][x] == '#']
xs = sorted(x for x, _ in houses) or [SW / 2]
ys = sorted(y for _, y in houses) or [SH / 2]
cx, cy = xs[len(xs) // 2] + 0.5, ys[len(ys) // 2] + 0.5
ow, oh = W / zoom, H / zoom
ox = min(max(cx - ow / 2, 0), SW - ow)
oy = min(max(cy - oh / 2, 0), SH - oh)
new = []
for y in range(H):
    sy = min(SH - 1, int(oy + (y + 0.5) / zoom))
    new.append([grid[sy][min(SW - 1, int(ox + (x + 0.5) / zoom))] for x in range(W)])
body = '\n'.join(f"  '{encode(r)}'," for r in new)
head, rest = src.split('= [\n', 1)
tail = rest.rsplit('];', 1)[1]
open(path, 'w', encoding='utf-8', newline='\n').write(head + '= [\n' + body + '\n];' + tail)
print(f'{path}: offset=({ox:.2f},{oy:.2f}) zoom={zoom}')
