#!/usr/bin/env python3
"""Film 15 plates (run once, needs film15/source/*): cut-outs used by film.js.
  pip install numpy opencv-python-headless mediapipe   (+ libegl1 on Debian/Ubuntu)
  curl -o /tmp/selfie_multiclass.tflite https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
  python3 film15/plates.py /tmp/selfie_multiclass.tflite
Frames: ffmpeg -ss 8.0 -i film15/source/channel-intro.mp4 -frames:v 1 film15/source/host.png
Outputs film15/plates/{players,host,pl-logo,trophy}-cut.png (RGBA)."""
import sys, os, numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, 'source'); OUT = os.path.join(HERE, 'plates'); os.makedirs(OUT, exist_ok=True)
model = sys.argv[1]
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=mpt.BaseOptions(model_asset_path=model), output_category_mask=False, output_confidence_masks=True))

def person_cut(src, dst):
    img = cv2.imread(src); res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)))
    a = (np.clip(((1.0 - res.confidence_masks[0].numpy_view()) - 0.3) / 0.4, 0, 1) * 255).astype(np.uint8)
    cv2.imwrite(dst, np.dstack([img, a]))

def smooth_alpha(rgba, sigma, lo=0.35, hi=0.65):
    a = cv2.GaussianBlur(rgba[..., 3].astype(np.float32) / 255.0, (0, 0), sigma)
    k = np.clip((a - lo) / (hi - lo), 0, 1); rgba[..., 3] = (k * k * (3 - 2 * k) * 255).astype(np.uint8); return rgba

person_cut(os.path.join(SRC, 'players.jpg'), os.path.join(OUT, 'players-cut.png'))
pc = cv2.imread(os.path.join(OUT, 'players-cut.png'), cv2.IMREAD_UNCHANGED); cv2.imwrite(os.path.join(OUT, 'players-cut.png'), smooth_alpha(pc, 2.0))
person_cut(os.path.join(SRC, 'host.png'), os.path.join(OUT, 'host-cut.png'))
# host: remove green turf spill, keep the largest component, erode 1 px, soften
im = cv2.imread(os.path.join(OUT, 'host-cut.png'), cv2.IMREAD_UNCHANGED); b, g, r, a = [im[..., i].astype(int) for i in range(4)]
a[(g > r + 14) & (g > b + 6)] = 0
n, lab, st, _ = cv2.connectedComponentsWithStats((a > 127).astype(np.uint8)); m = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
m = cv2.erode(cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)), np.ones((3, 3), np.uint8))
im[..., 3] = (m * 255).astype(np.uint8)
# the source frame is 848x478: upscale 2x (Lanczos), smooth the blocky model matte on the big grid, light unsharp on colour
im = cv2.resize(im, None, fx=2, fy=2, interpolation=cv2.INTER_LANCZOS4); im = smooth_alpha(im, 4.0)
blur = cv2.GaussianBlur(im[..., :3], (0, 0), 1.6); im[..., :3] = cv2.addWeighted(im[..., :3], 1.5, blur, -0.5, 0)
cv2.imwrite(os.path.join(OUT, 'host-cut.png'), im)
# PL logo: alpha = distance from the flat background green; colour = flat median of the opaque pixels
img = cv2.imread(os.path.join(SRC, 'pl-logo.jpg')); bg = np.median(img.reshape(-1, 3)[:2000], axis=0)
al = (np.clip((np.linalg.norm(img.astype(float) - bg, axis=2) - 70) / 60, 0, 1) * 255).astype(np.uint8)
col = np.median(img[al > 240], axis=0); cv2.imwrite(os.path.join(OUT, 'pl-logo-cut.png'), np.dstack([np.tile(col, (img.shape[0], img.shape[1], 1)).astype(np.uint8), al]))
# trophy: grabCut seeded with a rectangle + central ellipse, largest component
t = cv2.imread(os.path.join(SRC, 'trophy.jpg')); h, w = t.shape[:2]
mk = np.full((h, w), cv2.GC_PR_BGD, np.uint8); cv2.rectangle(mk, (int(w * .20), int(h * .02)), (int(w * .80), int(h * .99)), cv2.GC_PR_FGD, -1)
cv2.ellipse(mk, (w // 2, h // 2), (int(w * .16), int(h * .42)), 0, 0, 360, cv2.GC_FGD, -1)
mk[:int(h * .015), :] = cv2.GC_BGD; mk[:, :int(w * .12)] = cv2.GC_BGD; mk[:, int(w * .88):] = cv2.GC_BGD
cv2.grabCut(t, mk, None, np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_MASK)
m = cv2.morphologyEx(np.where((mk == cv2.GC_FGD) | (mk == cv2.GC_PR_FGD), 1, 0).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats(m)
m = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8) * 255; m[int(h * .80):, int(w * .80):] = 0
# drop grass/pitch spill outside the cup's own (green-reflecting) column, then clean up
bgr = t.astype(int); grass = (bgr[..., 1] > bgr[..., 2] + 8) & (bgr[..., 1] > bgr[..., 0] + 8); xs = np.arange(w)[None, :].repeat(h, 0)
m[grass & ((xs < int(w * .36)) | (xs > int(w * .66)))] = 0
ys = np.arange(h)[:, None].repeat(w, 1); val = bgr.max(axis=2)
m[(xs > int(w * .52)) & (ys < int(h * .40)) & (val < 110)] = 0; m[(xs > int(w * .60)) & (ys < int(h * .62)) & (val < 95)] = 0          # dark crowd arc to the right of the crown
m[(xs > int(w * .73)) & (ys > int(h * .78))] = 0                        # light crowd tile beside the base
m[int(h * .86):, :] = (m[int(h * .86):, :].astype(np.float32) * np.linspace(1, 0.0, h - int(h * .86))[:, None]).astype(np.uint8)  # bottom edge dissolves instead of a hard crop
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats((m > 127).astype(np.uint8)); m = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), m, 0).astype(np.uint8)
blur = cv2.GaussianBlur(t, (0, 0), 1.4); t = cv2.addWeighted(t, 1.7, blur, -0.7, 0)   # the source is soft: unsharp + a touch of saturation
hsv = cv2.cvtColor(t, cv2.COLOR_BGR2HSV).astype(np.float32); hsv[..., 1] = np.clip(hsv[..., 1] * 1.25, 0, 255); t = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
cv2.imwrite(os.path.join(OUT, 'trophy-cut.png'), np.dstack([t, cv2.GaussianBlur(m, (0, 0), 1.0)]))
print('plates written to', OUT)
