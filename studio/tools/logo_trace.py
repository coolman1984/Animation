#!/usr/bin/env python3
"""Trace a client's raster logo (on a light background) into crisp vector outlines — faithfully, never redrawn.

Generalised from film6/logo_trace.py. Usage:
  python3 tools/logo_trace.py <logo.png|jpg> <out_dir> [--crop=x0,y0,x1,y1] [--grid=11] [--up=4]
Outputs in out_dir (keep it git-ignored, e.g. <film>/plates/):
  logo.json        {crop, parts: [{d, bbox, color}], particles: [[x, y, "#rrggbb"]], grid}  — source pixel coordinates
  logo-color.png   the owner's colours at 2× with the white anti-alias fringe inpainted (use under a vector clip)
  logo-check.png   source | filled trace | difference — LOOK at it before using the trace
Render each part (or a group of parts = one letter) as <img src=logo-color.png> + CSS clip-path: path() (awaited by the
composer's ready, unlike SVG <image>). Needs: pip install potracer pillow opencv-python-headless numpy
Coverage works for dark, grey and saturated strokes alike: distance-to-white divided by its local maximum, threshold 0.5.
"""
import json, os, sys
import numpy as np, cv2, potrace

def main(argv):
    if len(argv) < 2: print(__doc__); return 2
    src, out = argv[0], argv[1]
    opt = dict(a[2:].split('=', 1) for a in argv[2:] if a.startswith('--') and '=' in a)
    up, grid = int(opt.get('up', 4)), int(opt.get('grid', 11))
    os.makedirs(out, exist_ok=True)
    full = cv2.imread(src)
    if full is None: raise SystemExit(f'cannot read {src}')
    if 'crop' in opt: x0, y0, x1, y1 = map(int, opt['crop'].split(','))
    else:
        ys, xs = np.where(full.min(axis=2) < 200)
        if not len(xs): raise SystemExit('no ink found (expects a logo on a light background)')
        m = 12; x0, y0, x1, y1 = max(0, xs.min() - m), max(0, ys.min() - m), min(full.shape[1], xs.max() + m), min(full.shape[0], ys.max() + m)
    img = full[y0:y1, x0:x1].astype(np.float32)
    big = cv2.resize(img, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    d = 255 - big.min(axis=2)
    cov = np.clip(d / np.maximum(cv2.dilate(d, np.ones((9 * up, 9 * up), np.uint8)), 60), 0, 1)
    ink = cov > 0.5
    col = cv2.inpaint(np.clip(big, 0, 255).astype(np.uint8), ((cov <= 0.92) * 255).astype(np.uint8), 3, cv2.INPAINT_TELEA)
    half = cv2.resize(col, None, fx=2 / up, fy=2 / up, interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(out, 'logo-color.png'), half)
    path = potrace.Bitmap(ink).trace(turdsize=40, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)
    sv = lambda p: (x0 + p.x / up, y0 + p.y / up)
    parts = []
    for c in path:
        pts, cmds = [c.start_point], [f'M {sv(c.start_point)[0]:.2f} {sv(c.start_point)[1]:.2f}']
        for s in c.segments:
            if s.is_corner: cmds.append('L %.2f %.2f L %.2f %.2f' % (*sv(s.c), *sv(s.end_point))); pts += [s.c, s.end_point]
            else: cmds.append('C %.2f %.2f %.2f %.2f %.2f %.2f' % (*sv(s.c1), *sv(s.c2), *sv(s.end_point))); pts.append(s.end_point)
        xs = [sv(p)[0] for p in pts]; ys = [sv(p)[1] for p in pts]
        if max(xs) - min(xs) > 0.9 * (x1 - x0) and max(ys) - min(ys) > 0.9 * (y1 - y0): continue  # frame around the crop, not a part
        cx, cy = int(((min(xs) + max(xs)) / 2 - x0) * 2), int(((min(ys) + max(ys)) / 2 - y0) * 2)
        b, g, r = half[min(cy, half.shape[0] - 1), min(cx, half.shape[1] - 1)]
        parts.append({'d': ' '.join(cmds) + ' Z', 'bbox': [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)], 'color': '#%02x%02x%02x' % (r, g, b)})
    parts.sort(key=lambda p: (round(p['bbox'][1] / 80), p['bbox'][0]))  # rows, then left → right
    particles = []
    for gy in range(y0, y1, grid):
        for gx in range(x0, x1, grid):
            cell = ink[(gy - y0) * up:(gy - y0 + grid) * up, (gx - x0) * up:(gx - x0 + grid) * up]
            if cell.size == 0 or cell.mean() < 0.55: continue
            cx, cy = gx + grid / 2, gy + grid / 2
            b, g, r = half[min(int((cy - y0) * 2), half.shape[0] - 1), min(int((cx - x0) * 2), half.shape[1] - 1)]
            particles.append([round(cx, 1), round(cy, 1), '#%02x%02x%02x' % (r, g, b)])
    json.dump({'source': src, 'crop': [int(x0), int(y0), int(x1), int(y1)], 'colorScale': 2, 'parts': parts, 'grid': grid, 'particles': particles}, open(os.path.join(out, 'logo.json'), 'w'))
    # check image: filled trace rasterised with OpenCV polylines (curves sampled) vs the source
    mask = np.zeros(ink.shape, np.uint8)
    W2, H2 = (x1 - x0) * up, (y1 - y0) * up
    for c in path:
        cxs = [c.start_point.x] + [s.end_point.x for s in c.segments]; cys = [c.start_point.y] + [s.end_point.y for s in c.segments]
        if max(cxs) - min(cxs) > 0.9 * W2 and max(cys) - min(cys) > 0.9 * H2: continue
        poly = []
        prev = c.start_point; poly.append((prev.x, prev.y))
        for s in c.segments:
            if s.is_corner: poly += [(s.c.x, s.c.y), (s.end_point.x, s.end_point.y)]
            else:
                for u in np.linspace(0, 1, 12)[1:]:
                    v = 1 - u; poly.append((v**3 * prev.x + 3 * v * v * u * s.c1.x + 3 * v * u * u * s.c2.x + u**3 * s.end_point.x, v**3 * prev.y + 3 * v * v * u * s.c1.y + 3 * v * u * u * s.c2.y + u**3 * s.end_point.y))
            prev = s.end_point
        if len(poly) > 2: cv2.fillPoly(mask, [np.array(poly, np.int32)], 255)
    tr = cv2.resize(255 - mask, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    srcbw = cv2.resize(np.where(ink, 0, 255).astype(np.uint8), (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    diff = 255 - cv2.absdiff(srcbw, tr)
    cv2.imwrite(os.path.join(out, 'logo-check.png'), np.vstack([img.astype(np.uint8), cv2.cvtColor(tr, cv2.COLOR_GRAY2BGR), cv2.cvtColor(diff, cv2.COLOR_GRAY2BGR)]))
    print(json.dumps({'parts': len(parts), 'particles': len(particles), 'crop': [int(x0), int(y0), int(x1), int(y1)]}))
    return 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
