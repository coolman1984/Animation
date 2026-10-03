#!/usr/bin/env python3
"""Film 7 — split the SANAD icon (shield + infinity ribbon + arrow) into its colour pieces, faithfully traced, never redrawn.

Input  film7/source/logo-primary.jpg (owner's identity board, icon on white)
Output film7/plates/icon/{icon.json, icon-color.png, icon-check.png}
  pieces = connected components of each colour class (navy / gold / green), potrace outlines in SOURCE pixel coordinates;
  icon-color.png = the owner's colours (2x, white fringe inpainted) to sit under a clip-path: path() per piece.
Needs: pip install potracer pillow opencv-python-headless numpy
"""
import json, os, sys
import numpy as np, cv2, potrace

SRC = os.path.join(os.path.dirname(__file__), 'source', 'logo-primary.jpg')
OUT = os.path.join(os.path.dirname(__file__), 'plates', 'icon')
X0, Y0, X1, Y1 = 290, 110, 960, 860
UP = 4

def main():
    os.makedirs(OUT, exist_ok=True)
    full = cv2.imread(SRC)
    img = full[Y0:Y1, X0:X1].astype(np.float32)
    big = cv2.resize(img, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    d = 255 - big.min(axis=2)
    cov = np.clip(d / np.maximum(cv2.dilate(d, np.ones((9 * UP, 9 * UP), np.uint8)), 60), 0, 1)
    ink = cov > 0.5
    col = cv2.inpaint(np.clip(big, 0, 255).astype(np.uint8), ((cov <= 0.92) * 255).astype(np.uint8), 3, cv2.INPAINT_TELEA)
    hsv = cv2.cvtColor(col, cv2.COLOR_BGR2HSV_FULL).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 256, hsv[..., 1] / 255, hsv[..., 2] / 255
    gold = (h > 28) & (h < 70) & (s > 0.30)
    green = (h > 120) & (h < 195) & (s > 0.30)
    navy = ~gold & ~green
    classes = {'gold': gold & ink, 'green': green & ink, 'navy': navy & ink}
    half = cv2.resize(col, None, fx=2 / UP, fy=2 / UP, interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT, 'icon-color.png'), half)
    pieces, overlay = [], np.full(big.shape, 255, np.uint8)
    k = np.ones((3, 3), np.uint8)
    for name, m in classes.items():
        m8 = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, k, iterations=2)
        m8 = cv2.morphologyEx(m8, cv2.MORPH_CLOSE, k, iterations=3)
        m8 = (cv2.GaussianBlur(m8.astype(np.float32), (0, 0), 5) > 0.5).astype(np.uint8)  # smooth the JPEG-ragged class borders (≈1 source px)
        n, lab, stats, cen = cv2.connectedComponentsWithStats(m8, connectivity=8)
        for i in range(1, n):
            area = stats[i, cv2.CC_STAT_AREA]
            if area < 2500 * (UP / 4) ** 2: continue
            mask = (lab == i)
            # a small dilation so neighbouring colour pieces overlap instead of leaving a white seam
            mask = cv2.dilate(mask.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=1) > 0
            path = potrace.Bitmap(mask).trace(turdsize=60, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.25)
            sv = lambda p: (X0 + p.x / UP, Y0 + p.y / UP)
            cmds, xs, ys = [], [], []
            for c in path:
                cc, cx_, cy_ = ['M %.2f %.2f' % sv(c.start_point)], [sv(c.start_point)[0]], [sv(c.start_point)[1]]
                for sgm in c.segments:
                    if sgm.is_corner:
                        cc.append('L %.2f %.2f L %.2f %.2f' % (*sv(sgm.c), *sv(sgm.end_point))); pts = [sgm.c, sgm.end_point]
                    else:
                        cc.append('C %.2f %.2f %.2f %.2f %.2f %.2f' % (*sv(sgm.c1), *sv(sgm.c2), *sv(sgm.end_point))); pts = [sgm.end_point]
                    for p in pts: cx_.append(sv(p)[0]); cy_.append(sv(p)[1])
                if max(cx_) - min(cx_) > 0.9 * (X1 - X0) and max(cy_) - min(cy_) > 0.9 * (Y1 - Y0): continue  # frame around the crop, not a part
                cmds += cc + ['Z']; xs += cx_; ys += cy_
            ys_, xs_ = np.where(lab == i)
            cx, cy = xs_.mean() / UP + X0, ys_.mean() / UP + Y0
            pieces.append({'cls': name, 'area': int(area / UP / UP), 'bbox': [round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1)], 'centroid': [round(cx, 1), round(cy, 1)], 'd': ' '.join(cmds)})
            overlay[mask] = {'gold': (55, 175, 212), 'green': (129, 185, 16), 'navy': (47, 25, 10)}[name]
    pieces.sort(key=lambda p: -p['area'])
    for i, p in enumerate(pieces): p['id'] = i
    json.dump({'source': 'film7/source/logo-primary.jpg', 'crop': [X0, Y0, X1, Y1], 'colorScale': 2, 'pieces': pieces}, open(os.path.join(OUT, 'icon.json'), 'w'))
    check = np.hstack([cv2.resize(big, None, fx=0.25, fy=0.25).astype(np.uint8), cv2.resize(overlay, None, fx=0.25, fy=0.25)])
    cv2.imwrite(os.path.join(OUT, 'icon-check.png'), check)
    for p in pieces: print(p['id'], p['cls'], p['area'], p['bbox'], p['centroid'])

if __name__ == '__main__':
    main()
