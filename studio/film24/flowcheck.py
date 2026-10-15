# Film 24 — optical-flow check of a 30 fps preview (owner brief): during the flight the speed down the page must never dip,
# and the zoom must never turn into a zoom-in. Farneback flow on a 0.5× grey copy; centre band = the sharp, focused region.
import sys, cv2, numpy as np
cap = cv2.VideoCapture(sys.argv[1]); fps = cap.get(cv2.CAP_PROP_FPS) or 30
prev, rows, i = None, [], 0
while True:
    ok, fr = cap.read()
    if not ok: break
    g = cv2.cvtColor(cv2.resize(fr, None, fx=0.5, fy=0.5), cv2.COLOR_BGR2GRAY)
    if prev is not None:
        f = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 4, 25, 3, 7, 1.5, 0)
        h, w = g.shape; band = f[int(h*0.40):int(h*0.62), int(w*0.2):int(w*0.8)]
        vy = float(np.median(band[..., 1])) * 2           # px per frame at full size; content moves UP the frame (negative) as we glide
        xs = np.arange(band.shape[1]) - band.shape[1] / 2
        fx = band[..., 0]; mask = np.abs(fx) < 40
        a = float(np.polyfit(np.tile(xs, band.shape[0])[mask.ravel()], fx.ravel()[mask.ravel()], 1)[0]) if mask.sum() > 50 else 0.0
        rows.append(((i) / fps, -vy, a))                   # speed (px/frame, positive = gliding), horizontal divergence (<0 = zoom out)
    prev = g; i += 1
rows = np.array(rows)
fl = rows[(rows[:, 0] > 0.15) & (rows[:, 0] < 8.1)]
cruise = fl[(fl[:, 0] > 1.7) & (fl[:, 0] < 7.2)]
print(f"frames {len(rows)}; cruise 1.7–7.2 s: median {np.median(cruise[:,1]):.2f} px/frame, min {cruise[:,1].min():.2f}, max {cruise[:,1].max():.2f}")
# a dip = speed falling while the curve says it should hold or rise (0.15–7.3 s): compare with a 5-frame running max
dips = [(t, v) for (t, v, a) in fl if t < 7.3 and v < 0.8 * np.max(fl[(fl[:,0] > t - 0.35) & (fl[:,0] <= t), 1])]
print("dips (>20 % below the last 0.35 s max) during 0.15–7.3 s:", [(round(t,2), round(v,2)) for t, v in dips][:12] or 'none')
zin = [(round(t,2), round(a,4)) for (t, v, a) in fl if a > 0.0015]
print("zoom-in frames (divergence > +0.0015) during the flight:", zin[:12] or 'none')
np.savetxt(sys.argv[2] if len(sys.argv) > 2 else 'flow.csv', rows, delimiter=',', header='t,speed_px_per_frame,divergence', fmt='%.4f')
