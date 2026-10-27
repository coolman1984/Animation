#!/usr/bin/env python3
"""Text boxes for frame triage (lib/triage.mjs): WHERE text is in every sampled frame of a video, not what it says.

  python3 tools/textboxes.py models                         fetch the detector once (2.4 MB) into studio/models/
  python3 tools/textboxes.py VIDEO [--fps=4] [--short=540]  → JSON on stdout: {"w","h","fps","frames":[[[x,y,w,h,score],...],...]}

The detector is PaddleOCR's PP-OCRv3 text detection network (DBNet, Apache-2.0), language-agnostic enough for Arabic and
Latin type. Its ONNX file ships inside the rapidocr-onnxruntime 1.2.3 wheel on PyPI (pinned by SHA-256; PyPI is reachable
where model hubs are blocked). Boxes are in decoded pixels (the video scaled so its short side is --short).
Needs: pip install onnxruntime opencv-python-headless numpy
"""
import hashlib, io, json, os, subprocess, sys, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get('STUDIO_MODELS', os.path.join(os.path.dirname(HERE), 'models'))
MODEL = os.path.join(MODELS, 'ppocr_v3_det.onnx')
WHEEL = ('https://files.pythonhosted.org/packages/b7/ef/0df9a58310895ab357f85df67935af6a8fb98f0965c7476cee6fcb966a7e/'
         'rapidocr_onnxruntime-1.2.3-py3-none-any.whl', 'c707d3a6eb72d13119afe9602d3cc36d8b2a4a4d74e9575cf1b0e67ed6a27819',
         'rapidocr_onnxruntime/models/ch_PP-OCRv3_det_infer.onnx')
MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)
THRESH, BOX_THRESH, UNCLIP = 0.3, 0.5, 1.6


def opts(argv):
    o, pos = {}, []
    for a in argv:
        if a.startswith('--'): k, _, v = a[2:].partition('='); o[k] = v if v else True
        else: pos.append(a)
    return pos, o


def cmd_models():
    if os.path.exists(MODEL): print(f'ok {MODEL}'); return
    os.makedirs(MODELS, exist_ok=True)
    url, sha, member = WHEEL
    data = urllib.request.urlopen(url).read()
    got = hashlib.sha256(data).hexdigest()
    if got != sha: raise SystemExit(f'wheel SHA-256 mismatch: {got} (want {sha})')
    with zipfile.ZipFile(io.BytesIO(data)) as z, open(MODEL + '.part', 'wb') as f: f.write(z.read(member))
    os.replace(MODEL + '.part', MODEL)
    print(f'ok {MODEL} {os.path.getsize(MODEL)} bytes')


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path],
                       capture_output=True, text=True)
    if r.returncode: raise SystemExit(f'cannot read {path}: {r.stderr.strip()[:200]}')
    s = json.loads(r.stdout)['streams'][0]
    return s['width'], s['height']


def boxes(sess, rgb, np, cv2):
    h, w = rgb.shape[:2]
    H, W = max(32, round(h / 32) * 32), max(32, round(w / 32) * 32)
    x = cv2.resize(rgb, (W, H)).astype(np.float32) / 255.0
    x = ((x[..., ::-1] - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)   # the network was trained on BGR
    prob = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    mask = cv2.dilate((prob > THRESH).astype(np.uint8), np.ones((2, 2), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = []
    for i in range(1, n):
        bx, by, bw, bh, area = stats[i]
        if min(bw, bh) < 2: continue
        score = float(prob[lab == i].mean())
        if score < BOX_THRESH: continue
        d = area * UNCLIP / (2 * (bw + bh))   # DBNet predicts a shrunk kernel; grow it back (unclip)
        x0, y0, x1, y1 = (bx - d) * w / W, (by - d) * h / H, (bx + bw + d) * w / W, (by + bh + d) * h / H
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
        out.append([round(x0), round(y0), round(x1 - x0), round(y1 - y0), round(score, 3)])
    return out


def cmd_video(path, o):
    import numpy as np, cv2, onnxruntime as ort
    if not os.path.exists(MODEL): raise SystemExit('missing the text detector: run `python3 tools/textboxes.py models`')
    fps, short = float(o.get('fps', 4)), int(o.get('short', 540))
    sw, sh = probe(path)
    k = min(1.0, short / min(sw, sh)); w, h = round(sw * k / 2) * 2, round(sh * k / 2) * 2
    so = ort.SessionOptions(); so.log_severity_level = 3
    sess = ort.InferenceSession(MODEL, so, providers=['CPUExecutionProvider'])
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={fps},scale={w}:{h}:flags=area,format=rgb24', '-f', 'rawvideo', '-'],
                         stdout=subprocess.PIPE)
    frames, size = [], w * h * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size: break
        frames.append(boxes(sess, np.frombuffer(buf, np.uint8).reshape(h, w, 3), np, cv2))
    if p.wait(): raise SystemExit(f'ffmpeg could not decode {path}')
    json.dump({'w': w, 'h': h, 'fps': fps, 'frames': frames}, sys.stdout)


if __name__ == '__main__':
    pos, o = opts(sys.argv[1:])
    if pos[:1] == ['models']: cmd_models()
    elif pos: cmd_video(pos[0], o)
    else: print(__doc__)
