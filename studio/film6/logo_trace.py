# Film 6 — trace the owner's Pixel Plus logo (film6/source/logo.jpg) into crisp vector letter outlines.
# Output (git-ignored plates): plates/logo.json (one SVG path per letter, in source pixels) + plates/logo-color.png
# (the source colours with the anti-aliased white fringe replaced by interior colour, so a vector clip shows clean edges).
# The mark is not redrawn: outlines follow the owner's pixels (potrace on a 4x upsample), colours are the owner's pixels.
# Needs: pip install potracer pillow opencv-python-headless numpy
import json, os
import numpy as np, cv2, potrace

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'source', 'logo.jpg'), os.path.join(HERE, 'plates')
os.makedirs(OUT, exist_ok=True)
UP = 4
X0, Y0, X1, Y1 = 130, 370, 1125, 875  # logo area (the "08" sheet number at the bottom-left is outside it)

img = cv2.imread(SRC)[Y0:Y1, X0:X1].astype(np.float32)
big = cv2.resize(img, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
d = 255 - big.min(axis=2)                                   # distance from paper white; full ink varies per colour
full = cv2.dilate(d, np.ones((9 * UP, 9 * UP), np.uint8))     # local "full ink" level (dark ≈ 217, grey ≈ 120, blue ≈ 255)
cov = np.clip(d / np.maximum(full, 60), 0, 1)
ink = cov > 0.5

# Colour plate: keep interior pixels, propagate them outward over the fringe (no white halo inside the vector clip).
interior = (cov > 0.92).astype(np.uint8)
col = big.copy()
mask_fill = ((interior == 0)).astype(np.uint8) * 255
col = cv2.inpaint(np.clip(col, 0, 255).astype(np.uint8), mask_fill, 3, cv2.INPAINT_TELEA)
cv2.imwrite(os.path.join(OUT, 'logo-color.png'), cv2.resize(col, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))

bm = potrace.Bitmap(ink)
path = bm.trace(turdsize=40, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)

def sv(p): return f'{(X0 + p.x / UP):.2f} {(Y0 + p.y / UP):.2f}'
curves = []
for c in path:
    d_ = [f'M {sv(c.start_point)}']
    pts = [c.start_point]
    for s in c.segments:
        if s.is_corner: d_.append(f'L {sv(s.c)} L {sv(s.end_point)}'); pts += [s.c, s.end_point]
        else: d_.append(f'C {sv(s.c1)} {sv(s.c2)} {sv(s.end_point)}'); pts += [s.end_point]
    d_.append('Z')
    xs = [X0 + p.x / UP for p in pts]; ys = [Y0 + p.y / UP for p in pts]
    if max(xs) - min(xs) > 0.9 * (X1 - X0): continue  # the tracer's frame around the crop, not a letter
    curves.append({'d': ' '.join(d_), 'bbox': [min(xs), min(ys), max(xs), max(ys)]})

# Letter regions (source px). Row 1 "Pixel" (dark + blue), row 2 "Plus" (grey) + the blue plus sign.
L = [('P1', 140, 425, 380, 672), ('i1', 450, 522, 380, 655), ('x1', 524, 792, 380, 655), ('e1', 793, 1035, 380, 655), ('l1', 1040, 1115, 380, 655),
     ('P2', 195, 415, 662, 870), ('l2', 430, 488, 662, 870), ('u2', 500, 705, 662, 870), ('s2', 720, 915, 662, 870), ('plus', 916, 1115, 662, 870)]
letters = {k: {'paths': [], 'bbox': None} for k, *_ in L}
for c in curves:
    cx, cy = (c['bbox'][0] + c['bbox'][2]) / 2, (c['bbox'][1] + c['bbox'][3]) / 2
    best = min(L, key=lambda r: 0 if (r[1] <= cx <= r[2] and r[3] <= cy <= r[4]) else 1e9 + abs(cx - (r[1] + r[2]) / 2) + abs(cy - (r[3] + r[4]) / 2))
    letters[best[0]]['paths'].append(c['d'])
    b = letters[best[0]]['bbox']; cb = c['bbox']
    letters[best[0]]['bbox'] = cb if b is None else [min(b[0], cb[0]), min(b[1], cb[1]), max(b[2], cb[2]), max(b[3], cb[3])]
# The blue i-dot is its own part (it lands first in the film): split it from the i stem by height.
i_paths = letters['i1']['paths']
for c in curves:
    if c['d'] in i_paths and c['bbox'][3] < 460:
        letters['dot'] = {'paths': [c['d']], 'bbox': c['bbox']}
        letters['i1']['paths'] = [p for p in i_paths if p != c['d']]
        rest = [cc['bbox'] for cc in curves if cc['d'] in letters['i1']['paths']]
        letters['i1']['bbox'] = [min(b[0] for b in rest), min(b[1] for b in rest), max(b[2] for b in rest), max(b[3] for b in rest)]
for v in letters.values(): v['pathBoxes'] = [next(cc['bbox'] for cc in curves if cc['d'] == p) for p in v['paths']]
json.dump({'source': 'film6/source/logo.jpg', 'crop': [X0, Y0, X1, Y1], 'colorScale': UP / 2, 'letters': letters}, open(os.path.join(OUT, 'logo.json'), 'w'), indent=1)
print({k: (len(v['paths']), [round(x) for x in v['bbox']]) for k, v in letters.items()})

# Particle targets for the "pixel by pixel" assembly: one cell per GRID source px where the cell is mostly ink,
# coloured with the owner's pixel colour at the cell centre. Stored as [x, y, "#rrggbb", letter] in source px.
GRID = 11
parts = []
colour = cv2.imread(os.path.join(OUT, 'logo-color.png'))  # 2x source scale
def letter_at(x, y):
    if 459 <= x <= 519 and y < 462: return 'dot'
    for k, a, b, c_, d2 in L:
        if a <= x <= b and c_ <= y <= d2: return k
    return 'x1'
for gy in range(Y0, Y1, GRID):
    for gx in range(X0, X1, GRID):
        y0, x0 = (gy - Y0) * UP, (gx - X0) * UP
        cell = ink[y0:y0 + GRID * UP, x0:x0 + GRID * UP]
        if cell.size == 0 or cell.mean() < 0.55: continue
        cx, cy = gx + GRID / 2, gy + GRID / 2
        b_, g_, r_ = colour[int((cy - Y0) * 2), int((cx - X0) * 2)]
        parts.append([round(cx, 1), round(cy, 1), '#%02x%02x%02x' % (r_, g_, b_), letter_at(cx, cy)])
data = json.load(open(os.path.join(OUT, 'logo.json')))
data['grid'] = GRID; data['particles'] = parts
json.dump(data, open(os.path.join(OUT, 'logo.json'), 'w'))
print('particles', len(parts))
