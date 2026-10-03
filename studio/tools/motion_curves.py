"""Precise motion timing and easing measurement for reference videos (optional OpenCV + SciPy; numpy required).

Modes (all decode EVERY frame with its real timestamp, so variable-frame-rate screen recordings are timed correctly):
  track    VIDEO --roi x,y,w,h [--start s --end s] [--out DIR]
           follows one element (template matching over position AND scale, drift-free), reports per-frame centre/scale/
           brightness/sharpness, segments it into moves (start/end to one frame), and fits each move's easing:
           linear, power in/out/in-out (2..5), expo, sine, back-out, spring (→ studio springStep {duration, bounce})
           and a free cubic-bezier (→ studio cubicBezier). Writes track.json + track.png (curves you can LOOK at).
  timeline VIDEO [--crop x,y,w,h] [--out DIR]
           whole-frame motion energy + dominant flow direction per frame, scene cuts, moving/still spans with exact
           times. Writes timeline.json + timeline.png.
  strip    VIDEO --start s --end s [--crop ...] [--out DIR]
           every decoded frame between start and end in one labelled sheet (native frame rate, real timestamps).
Measured numbers are evidence about pixels; they do not reveal the original software or keyframes.
"""
import argparse, json, math, sys
from pathlib import Path

import numpy as np
import sys as _sys; [s.reconfigure(encoding='utf-8') for s in (_sys.stdout, _sys.stderr)]  # Windows pipes default to cp1252; Arabic/≈ output crashed

def need_cv2():
    try:
        import cv2  # noqa
        return cv2
    except Exception as e:  # pragma: no cover
        print(json.dumps({'unavailable': f'OpenCV missing: {e}'})); sys.exit(0)

def parse_box(s):
    return None if not s else tuple(int(round(float(v))) for v in s.split(','))

def frames(path, start=0.0, end=None, crop=None):
    """Yield (t_seconds, BGR frame) for every decoded frame in [start, end]."""
    cv2 = need_cv2()
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened(): raise SystemExit('cannot decode video')
    if start > 0: cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, start - 0.5) * 1000)
    try:
        while True:
            ok, f = cap.read()
            if not ok: break
            t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
            if t < start - 1e-6: continue
            if end is not None and t > end + 1e-6: break
            if crop: x, y, w, h = crop; f = f[y:y + h, x:x + w]
            yield t, f
    finally:
        cap.release()

# ---------------------------------------------------------------- easing models (progress 0→1 over u 0→1)
def _bez(x1, y1, x2, y2):
    def f(u):
        u = np.clip(np.asarray(u, float), 0, 1); s = u.copy()
        for _ in range(12):  # Newton on x(s)=u
            x = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s ** 2 * x2 + s ** 3 - u
            dx = 3 * (1 - s) ** 2 * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s ** 2 * (1 - x2)
            s = np.clip(s - x / np.where(np.abs(dx) < 1e-6, 1e-6, dx), 0, 1)
        return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s ** 2 * y2 + s ** 3
    return f

NAMED = {'linear': lambda u: u}
for k in (2, 3, 4, 5):
    NAMED[f'in{k}'] = (lambda k: lambda u: u ** k)(k)
    NAMED[f'out{k}'] = (lambda k: lambda u: 1 - (1 - u) ** k)(k)
    NAMED[f'inOut{k}'] = (lambda k: lambda u: np.where(u < .5, 2 ** (k - 1) * u ** k, 1 - (-2 * u + 2) ** k / 2))(k)
NAMED['outExpo'] = lambda u: np.where(u >= 1, 1, 1 - 2 ** (-10 * u))
NAMED['inOutSine'] = lambda u: -(np.cos(np.pi * u) - 1) / 2
CSS = {'linear': (0, 0, 1, 1), 'out2': (0.5, 1, 0.89, 1), 'out3': (0.33, 1, 0.68, 1), 'out4': (0.25, 1, 0.5, 1), 'out5': (0.22, 1, 0.36, 1),
       'in2': (0.11, 0, 0.5, 0), 'in3': (0.32, 0, 0.67, 0), 'inOut2': (0.45, 0, 0.55, 1), 'inOut3': (0.65, 0, 0.35, 1), 'inOut4': (0.76, 0, 0.24, 1),
       'outExpo': (0.16, 1, 0.3, 1), 'inOutSine': (0.37, 0, 0.63, 1)}

def spring_curve(t, w0, zeta):
    """Unit step response, same maths as lib/kinetics.js springStep (v0 = 0)."""
    t = np.maximum(np.asarray(t, float), 0)
    if zeta < 1 - 1e-6:
        wd = w0 * math.sqrt(1 - zeta * zeta); b = (-zeta * w0) / wd
        return 1 + np.exp(-zeta * w0 * t) * (-np.cos(wd * t) + b * np.sin(wd * t))
    return 1 + np.exp(-w0 * t) * (-1 - w0 * t)

def fit_easing(tt, p):
    """Fit progress samples p at times tt (s, relative to the visible start; the window extends into the hold after the move).
    Every model is fitted together with its own keyframe start t0 and duration D, because an ease-out reaches 99 % long before its
    last keyframe: fitting only the visible span would distort both the curve and the timing. Returns fits ranked by RMSE."""
    from scipy.optimize import least_squares
    tt = np.asarray(tt, float); p = np.asarray(p, float); span = max(tt[-1], 1e-3)
    U = lambda q: np.clip((tt - q[0]) / max(q[1], 1e-4), 0, 1)
    lo, hi = [-0.25, 0.03], [0.15, 4 * span + 0.5]
    fits = []
    for name, f in NAMED.items():
        best = None
        for d0 in (0.5 * span, span):
            r = least_squares(lambda q: f(U(q)) - p, [0.0, d0], bounds=(lo, hi))
            if best is None or r.cost < best.cost: best = r
        fits.append({'model': name, 'rmse': float(np.sqrt(np.mean(best.fun ** 2))), 't0': float(best.x[0]), 'D': float(best.x[1]), 'cssCubicBezier': CSS.get(name)})
    r = least_squares(lambda q: _bez(*q[2:])(U(q)) - p, [0.0, span, 0.3, 0.3, 0.3, 1.0], bounds=(lo + [0, -1, 0, -1], hi + [1, 2.5, 1, 2.5]))
    fits.append({'model': 'cubicBezier', 'params': [round(float(v), 3) for v in r.x[2:]], 'rmse': float(np.sqrt(np.mean(r.fun ** 2))), 't0': float(r.x[0]), 'D': float(r.x[1])})
    rb = least_squares(lambda q: (lambda u: 1 + (q[2] + 1) * (u - 1) ** 3 + q[2] * (u - 1) ** 2)(U(q)) - p, [0.0, span, 1.7], bounds=(lo + [0], hi + [6]))
    fits.append({'model': 'backOut', 'rmse': float(np.sqrt(np.mean(rb.fun ** 2))), 't0': float(rb.x[0]), 'D': float(rb.x[1]), 'overshootParam': round(float(rb.x[2]), 3)})
    best = None
    for z0 in (0.3, 0.6, 0.95):
        rr = least_squares(lambda q: spring_curve(tt - q[0], q[1], q[2]) - p, [0.0, 2 * np.pi / span, z0], bounds=([-0.25, 0.5, 0.05], [0.15, 200, 1.0]))
        if best is None or rr.cost < best.cost: best = rr
    t0, w0, zeta = best.x
    fits.append({'model': 'spring', 'rmse': float(np.sqrt(np.mean(best.fun ** 2))), 't0': float(t0), 'D': None, 'studioSpring': {'duration': round(2 * math.pi / w0, 3), 'bounce': round(1 - zeta, 3)}})
    fits.sort(key=lambda f: f['rmse'])
    named = [f for f in fits if f['model'] in NAMED]
    if named and fits[0]['model'] == 'cubicBezier' and named[0]['rmse'] - fits[0]['rmse'] < 0.004: fits.insert(0, fits.pop(fits.index(named[0])))
    return fits

# ---------------------------------------------------------------- tracking
def track(path, roi, start, end, crop=None, ref_time=None):
    """Follow the element inside `roi` (taken from the frame at ref_time, default = first frame) forwards AND backwards,
    so an element can be measured while it enters the frame, from a reference time where it is fully visible."""
    cv2 = need_cv2()
    seq = list(frames(path, start, end, crop))
    if len(seq) < 3: raise SystemExit('need at least 3 frames in range')
    ts = np.array([t for t, _ in seq]); r0 = int(np.argmin(np.abs(ts - (ref_time if ref_time is not None else ts[0]))))
    x, y, w, h = roi
    g0 = cv2.cvtColor(seq[r0][1], cv2.COLOR_BGR2GRAY)
    tpl = g0[y:y + h, x:x + w].astype(np.float32)
    if tpl.size == 0 or tpl.shape != (h, w): raise SystemExit('roi outside the frame')
    H, W = g0.shape
    def follow(order):
        cx, cy, sc = x + w / 2, y + h / 2, 1.0; rows = []
        for k in order:
            t, f = seq[k]
            g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32); best = None
            for s in sc * np.array([0.9, 0.95, 0.98, 1.0, 1.02, 1.05, 1.1]):
                tw, th = max(8, int(round(w * s))), max(8, int(round(h * s)))
                if tw >= W or th >= H: continue
                t_s = cv2.resize(tpl, (tw, th), interpolation=cv2.INTER_AREA)
                m = max(w, h, 60)
                rx0, ry0 = int(max(0, cx - tw / 2 - m)), int(max(0, cy - th / 2 - m)); rx1, ry1 = int(min(W, cx + tw / 2 + m)), int(min(H, cy + th / 2 + m))
                area = g[ry0:ry1, rx0:rx1]
                if area.shape[0] < th or area.shape[1] < tw: continue
                res = cv2.matchTemplate(area, t_s, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(res)
                if best is None or mv > best[0]: best = (mv, rx0 + ml[0] + tw / 2, ry0 + ml[1] + th / 2, s, tw, th)
            if best is None: continue
            score, ncx, ncy, nsc, tw, th = best
            if score > 0.35: cx, cy, sc = ncx, ncy, nsc   # keep the last good lock when the element is lost (off-frame, faded)
            bx0, by0 = int(max(0, ncx - tw / 2)), int(max(0, ncy - th / 2)); patch = g[by0:by0 + th, bx0:bx0 + tw]
            rows.append({'t': round(float(t), 4), 'x': round(float(ncx), 2), 'y': round(float(ncy), 2), 'scale': round(float(nsc), 4), 'score': round(float(score), 3),
                         'brightness': round(float(patch.mean()), 2) if patch.size else None,
                         'sharpness': round(float(cv2.Laplacian(patch, cv2.CV_32F).var()), 1) if patch.size else None})
        return rows
    rows = follow(range(r0, -1, -1))[::-1][:-1] + follow(range(r0, len(seq)))
    good = [r for r in rows if r['score'] >= 0.35]
    return (good if len(good) >= 3 else rows), len(seq)

def segment(rows, min_px=2.0):
    """Moves = spans where the element is displaced; edges refined at 1 % / settle within 1 % of the total move."""
    t = np.array([r['t'] for r in rows]); x = np.array([r['x'] for r in rows]); y = np.array([r['y'] for r in rows]); s = np.array([r['scale'] for r in rows])
    ref = math.hypot(*(np.ptp(x), np.ptp(y))) or 1
    pos = np.stack([x, y, (s - 1) * ref], 1)
    sp = np.r_[0, np.linalg.norm(np.diff(pos, axis=0), axis=1)]
    k = np.convolve(sp, np.ones(3) / 3, mode='same')
    thr = max(min_px * 0.35, 0.04 * k.max())
    moving = k > thr
    events, i = [], 0
    while i < len(moving):
        if not moving[i]: i += 1; continue
        j = i
        while j + 1 < len(moving) and (moving[j + 1] or (j + 2 < len(moving) and moving[j + 2])): j += 1
        a, b = max(0, i - 2), min(len(t) - 1, j + 2)
        d = np.linalg.norm(pos[b] - pos[a])
        if d >= min_px: events.append((a, b))
        i = j + 1
    out = []
    starts = [ea for ea, _ in events]
    for k_, (a, b) in enumerate(events):
        # The move's target is where it RESTS afterwards (median of the hold until the next move or +0.5 s), not where the velocity
        # first reaches zero: a spring's first zero-velocity point is its overshoot peak.
        nxt = starts[k_ + 1] if k_ + 1 < len(starts) else len(t)
        stop = max(b + 1, min(nxt, int(np.searchsorted(t, t[b] + 0.5, side='right'))))
        target = np.median(pos[b:stop], axis=0) if stop - b >= 3 else pos[b]
        total = target - pos[a]; L = np.linalg.norm(total)
        if L < min_px: continue
        win = pos[a:stop]; prog = (win - pos[a]) @ total / (L * L)
        i0 = max(0, next((i for i, v in enumerate(prog) if v > 0.01), 0) - 1)
        settle = len(prog) - 1
        for i in range(len(prog) - 1, -1, -1):
            if abs(prog[i] - 1) > 0.01: settle = min(len(prog) - 1, i + 1); break
        ta, tb = t[a + i0], t[a + settle]
        pp = prog[i0:]; tt = t[a + i0:stop] - ta
        fits = fit_easing(tt, pp)
        for f_ in fits:
            if f_.get('t0') is not None: f_['keyframeStart'] = round(float(ta + f_['t0']), 4)
            if f_.get('D'): f_['keyframeEnd'] = round(float(ta + f_['t0'] + f_['D']), 4)
        # A visible overshoot is physically a spring: prefer it over a free bezier that only matches as well.
        sp_ = next((f_ for f_ in fits if f_['model'] == 'spring'), None)
        if sp_ and pp.max() > 1.01 and sp_['rmse'] - fits[0]['rmse'] < 0.0015 and fits[0] is not sp_: fits.insert(0, fits.pop(fits.index(sp_)))
        ppv = pp[: settle - i0 + 1]; ttv = tt[: settle - i0 + 1]
        u = ttv / max(tb - ta, 1e-6)
        vel = np.r_[0, np.diff(ppv) / np.maximum(np.diff(ttv), 1e-6)]
        out.append({'start': round(float(ta), 4), 'end': round(float(tb), 4), 'duration': round(float(tb - ta), 4), 'frames': int(settle - i0 + 1),
                    'dx': round(float(total[0]), 2), 'dy': round(float(total[1]), 2), 'dScale': round(float(total[2] / ref), 4),
                    'overshootPct': round(float(max(0, pp.max() - 1) * 100), 2), 'peakVelocityAt': round(float(u[int(np.argmax(vel))]), 3),
                    'best': fits[0], 'alternatives': fits[1:4], 'samples': [[round(float(a_), 4), round(float(b_), 4)] for a_, b_ in zip(tt, pp)]})
    return out

# ---------------------------------------------------------------- charts (drawn with OpenCV, no plotting dependency)
def chart(path, series, title, w=1100, h=420, spans=(), xlabel='seconds'):
    cv2 = need_cv2()
    img = np.full((h, w, 3), 24, np.uint8); L, R, T, B = 64, 20, 36, 40
    xs = [p[0] for s in series for p in s['pts']]; ys = [p[1] for s in series for p in s['pts']]
    if not xs: return
    x0, x1 = min(xs), max(xs); y0, y1 = min(ys), max(ys)
    if x1 - x0 < 1e-9: x1 = x0 + 1
    if y1 - y0 < 1e-9: y1 = y0 + 1
    X = lambda v: int(L + (v - x0) / (x1 - x0) * (w - L - R)); Y = lambda v: int(h - B - (v - y0) / (y1 - y0) * (h - T - B))
    for a, b in spans: cv2.rectangle(img, (X(a), T), (X(b), h - B), (60, 45, 25), -1)
    step = 10 ** math.floor(math.log10(max(x1 - x0, 1e-6))) / 2
    v = math.ceil(x0 / step) * step
    while v <= x1 + 1e-9:
        cv2.line(img, (X(v), T), (X(v), h - B), (50, 50, 50), 1); cv2.putText(img, f'{v:.2f}', (X(v) - 16, h - B + 16), 0, 0.38, (170, 170, 170), 1); v += step
    for yv in (y0, (y0 + y1) / 2, y1): cv2.putText(img, f'{yv:.2f}', (4, Y(yv) + 4), 0, 0.38, (170, 170, 170), 1)
    for s in series:
        pts = np.array([[X(a), Y(b)] for a, b in s['pts']], np.int32)
        if s.get('dots'):
            for p in pts: cv2.circle(img, tuple(int(c) for c in p), 2, s['color'], -1)
        else: cv2.polylines(img, [pts], False, s['color'], 2, cv2.LINE_AA)
    cv2.putText(img, title, (L, 22), 0, 0.55, (235, 235, 235), 1, cv2.LINE_AA)
    cv2.putText(img, xlabel, (w - 90, h - 8), 0, 0.4, (170, 170, 170), 1)
    yy = 22
    for s in series:
        if s.get('label'): cv2.putText(img, s['label'], (w - 360, yy), 0, 0.42, s['color'], 1, cv2.LINE_AA); yy += 16
    cv2.imwrite(str(path), img)

# ---------------------------------------------------------------- timeline + strip
def timeline(path, crop=None, out=None):
    cv2 = need_cv2()
    prev, rows = None, []
    for t, f in frames(path, 0, None, crop):
        g = cv2.cvtColor(cv2.resize(f, (320, int(320 * f.shape[0] / f.shape[1]))), cv2.COLOR_BGR2GRAY)
        if prev is not None:
            flow = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 15, 3, 5, 1.2, 0)
            mag = np.linalg.norm(flow, axis=2); m = float(mag.mean())
            dx, dy = float(np.median(flow[..., 0])), float(np.median(flow[..., 1]))
            rows.append({'t': round(t, 4), 'flow': round(m, 3), 'dx': round(dx, 3), 'dy': round(dy, 3), 'diff': round(float(np.abs(g.astype(np.int16) - prev).mean()), 3)})
        prev = g
    cuts = []
    try:
        from scenedetect import detect, AdaptiveDetector
        cuts = [round(s[0].get_seconds(), 4) for s in detect(str(path), AdaptiveDetector())][1:]
    except Exception as e:
        cuts = {'unavailable': str(e)[:160]}
    e = np.array([r['flow'] for r in rows]); thr = max(0.15, 0.12 * (np.percentile(e, 95) if len(e) else 1))
    spans, cur = [], None
    for r, v in zip(rows, e):
        if v > thr and cur is None: cur = [r['t'], r['t']]
        elif v > thr: cur[1] = r['t']
        elif cur is not None: spans.append(cur); cur = None
    if cur: spans.append(cur)
    still = []
    last = rows[0]['t'] if rows else 0
    for a, b in spans:
        if a - last > 0.25: still.append([round(last, 3), round(a, 3)])
        last = b
    res = {'frames': len(rows) + 1, 'moving': [[round(a, 3), round(b, 3)] for a, b in spans], 'still': still, 'cuts': cuts, 'threshold': round(float(thr), 3), 'perFrame': rows}
    if out:
        chart(Path(out) / 'timeline.png', [{'pts': [(r['t'], r['flow']) for r in rows], 'color': (255, 170, 60), 'label': 'mean optical flow px/frame'},
                                           {'pts': [(r['t'], r['diff'] / 4) for r in rows], 'color': (120, 220, 120), 'label': 'frame difference / 4'}],
              'whole-frame motion energy (shaded = moving)', spans=spans)
    return res

def strip(path, start, end, crop=None, out=None, cols=8):
    cv2 = need_cv2()
    seq = list(frames(path, start, end, crop))
    if not seq: raise SystemExit('no frames in range')
    cells = []
    for t, f in seq:
        c = cv2.resize(f, (240, int(240 * f.shape[0] / f.shape[1])))
        cv2.rectangle(c, (0, 0), (92, 18), (0, 0, 0), -1); cv2.putText(c, f'{t:.3f}s', (3, 13), 0, 0.42, (255, 255, 255), 1, cv2.LINE_AA)
        cells.append(c)
    hgt = cells[0].shape[0]; rows = []
    for i in range(0, len(cells), cols):
        r = cells[i:i + cols]; r += [np.zeros_like(cells[0])] * (cols - len(r)); rows.append(np.hstack(r))
    sheet = np.vstack(rows)
    if out: cv2.imwrite(str(Path(out) / f'strip_{start:.2f}-{end:.2f}.png'), sheet)
    return {'frames': len(seq), 'times': [round(t, 4) for t, _ in seq]}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('mode', choices=['track', 'timeline', 'strip']); ap.add_argument('video')
    ap.add_argument('--roi'); ap.add_argument('--crop'); ap.add_argument('--start', type=float, default=0.0); ap.add_argument('--end', type=float)
    ap.add_argument('--out', default='.'); ap.add_argument('--ref', type=float, help='time where the roi is fully visible (default: start)')
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    crop = parse_box(a.crop)
    if a.mode == 'track':
        if not a.roi: raise SystemExit('--roi x,y,w,h required (in cropped coordinates when --crop is used)')
        rows, n = track(a.video, parse_box(a.roi), a.start, a.end, crop, a.ref)
        moves = segment(rows)
        res = {'video': a.video, 'roi': a.roi, 'crop': a.crop, 'framesDecoded': n, 'tracked': len(rows), 'minScore': min(r['score'] for r in rows), 'moves': moves, 'perFrame': rows,
               'note': 'progress fits are perceptual models of measured pixels; cubic-bezier params plug into lib/kinetics.js cubicBezier, studioSpring into springStep'}
        (out / 'track.json').write_text(json.dumps(res, indent=1), encoding='utf-8')
        t0 = rows[0]['t']
        chart(out / 'track.png', [{'pts': [(r['t'], r['x'] - rows[0]['x']) for r in rows], 'color': (255, 170, 60), 'label': 'dx px'},
                                  {'pts': [(r['t'], r['y'] - rows[0]['y']) for r in rows], 'color': (120, 220, 120), 'label': 'dy px'},
                                  {'pts': [(r['t'], (r['scale'] - 1) * 400) for r in rows], 'color': (230, 120, 230), 'label': '(scale-1) x 400'}],
              'tracked element (shaded = detected moves)', spans=[(m['start'], m['end']) for m in moves])
        for i, m in enumerate(moves):
            b = m['best']; tmax = m['samples'][-1][0]; xs = np.linspace(0, tmax, 160)
            ser = [{'pts': m['samples'], 'color': (255, 255, 255), 'dots': True, 'label': 'measured progress'}]
            if b['model'] == 'spring': ys = spring_curve(xs - b['t0'], 2 * math.pi / b['studioSpring']['duration'], 1 - b['studioSpring']['bounce']); lab = f"spring {b['studioSpring']}"
            else:
                f = NAMED.get(b['model']) or (_bez(*b['params']) if b['model'] == 'cubicBezier' else (lambda u, s_=b.get('overshootParam', 1.7): 1 + (s_ + 1) * (u - 1) ** 3 + s_ * (u - 1) ** 2))
                ys = f(np.clip((xs - b['t0']) / b['D'], 0, 1)); lab = f"best: {b['model']} rmse {b['rmse']:.3f}"
            ser.append({'pts': list(zip(xs.tolist(), np.asarray(ys, float).tolist())), 'color': (80, 200, 255), 'label': lab})
            chart(out / f'move{i + 1}.png', ser, f"move {i + 1}: visible {m['start']:.3f}-{m['end']:.3f}s, keyframes {b.get('keyframeStart')}-{b.get('keyframeEnd')}s, overshoot {m['overshootPct']}%", xlabel='s since start')
        print(json.dumps({k: v for k, v in res.items() if k != 'perFrame'} | {'moves': [{k: v for k, v in m.items() if k != 'samples'} for m in moves]}))
    elif a.mode == 'timeline':
        res = timeline(a.video, crop, out); (out / 'timeline.json').write_text(json.dumps(res, indent=1), encoding='utf-8')
        print(json.dumps({k: v for k, v in res.items() if k != 'perFrame'}))
    else:
        if a.end is None: raise SystemExit('--end required')
        print(json.dumps(strip(a.video, a.start, a.end, crop, out)))

if __name__ == '__main__':
    main()
