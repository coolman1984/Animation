#!/usr/bin/env python3
"""The baker short: 9 Gemini stills + 4 Veo clips (assets/) → a ~42 s vertical oil-painted film.

  python3 studio-engine/films/baker/make.py [--stage=shots|captions|sound|final|qc|all]   (run from studio/)

Every step writes into studio-engine/films/baker/work/ (git-ignored) and the film into out/baker/.
- crop: the flat padding bands Gemini/Flow added are found (rows whose blurred colour barely varies) and cut away,
  then each picture is cover-fitted to 1080×1920 around a chosen focus point.
- stills: 2.5D parallax from a monocular depth map (Depth Anything V2 small, ONNX, models/depth/da2s.onnx): nearer pixels
  move and scale more than far ones as the camera drifts; firelight/window light flickers only where the picture is
  warm and bright (oven, windows, sun) with a seeded flicker curve.
- clips: band-cropped, cover-fitted, trimmed to their beat, audio removed.
- cuts on the beat grid of the score (84 BPM); narration = one local voice line per shot; captions = ≤ 5-word chunks
  in the calm top third, timed across each spoken line; music = the studio score ducked under the voice; −14 LUFS.
"""
import json, math, os, subprocess, sys
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
A, WORK, OUT = os.path.join(HERE, 'assets'), os.path.join(HERE, 'work'), os.path.join(STUDIO, 'out', 'baker')
W, H, FPS, BPM = 1080, 1920, 30, 84
BEAT = 60 / BPM
os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True)

# the film: one shot per narrated line; beats chosen so every line fits with a breath, cuts land on beats
SHOTS = [
    dict(id='s1', beats=9, clip='A', trim=0.4, focus=0.5),
    dict(id='s2', beats=8, clip='B', trim=0.8, focus=0.45),
    dict(id='s3', beats=6, clip='C', trim=1.2, focus=0.5),
    dict(id='s4', beats=7, still='04', focus=0.6, move=(0.0, -0.012, 0.035), flicker=0.10),
    dict(id='s5', beats=6, still='05', focus=0.42, move=(0.015, 0.0, 0.04), flicker=0.14),
    dict(id='s6', beats=6, still='06', focus=0.5, move=(-0.018, 0.0, 0.03), flicker=0.06),
    dict(id='s7', beats=8, clip='D', trim=1.3, focus=0.5),        # Veo's first second still shows the still's padding band
    dict(id='s8', beats=9, still='08', focus=0.5, move=(0.0, 0.006, 0.06), flicker=0.05, fadeout=1.0),
]
LINES = [l.strip() for l in open(os.path.join(HERE, 'script.txt'), encoding='utf-8') if l.strip()]
assert len(LINES) == len(SHOTS)

def run(*cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode: raise SystemExit(f'{cmd[0]} failed:\n{r.stderr[-2000:]}')
    return r.stdout

def probe(f): return float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f))

# ---------- crop ----------
def content_rows(img, thr=4.0):
    """the longest run of rows that are not a flat padding band (blurred row colour varies by more than thr)"""
    b = cv2.GaussianBlur(img.astype(np.float32), (0, 0), 12)
    rs = b.std(axis=1).mean(axis=1)
    ok, best, s = rs > thr, (0, img.shape[0]), None
    best = (0, 0)
    for y, c in enumerate(list(ok) + [False]):
        if c and s is None: s = y
        if not c and s is not None:
            if y - s > best[1] - best[0]: best = (s, y)
            s = None
    y0, y1 = best
    return (y0 + 6, y1 - 6) if y1 - y0 < img.shape[0] else (0, img.shape[0])   # a few px off the soft band edge

def cover(img, focus, margin=1.0):
    """cover-fit the content to W×H (× margin, for parallax room) around focus x"""
    y0, y1 = content_rows(img); img = img[y0:y1]
    h, w = img.shape[:2]; tw, th = int(W * margin), int(H * margin)
    s = max(tw / w, th / h); img = cv2.resize(img, (math.ceil(w * s), math.ceil(h * s)), interpolation=cv2.INTER_LANCZOS4)
    h, w = img.shape[:2]; x = int(np.clip(focus * w - tw / 2, 0, w - tw)); y = (h - th) // 2
    return img[y:y + th, x:x + tw], (y0, y1)

# ---------- depth ----------
_sess = None
def depth(img):
    global _sess
    import onnxruntime as ort
    if _sess is None: _sess = ort.InferenceSession(os.path.join(STUDIO, 'models', 'depth', 'da2s.onnx'), providers=['CPUExecutionProvider'])
    inp = _sess.get_inputs()[0]
    sz = 518
    x = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), (sz, sz), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255
    x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
    d = _sess.run(None, {inp.name: x})[0].squeeze()
    d = cv2.resize(d, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    d = (d - np.percentile(d, 2)) / max(1e-6, np.percentile(d, 98) - np.percentile(d, 2))
    return cv2.GaussianBlur(np.clip(d, 0, 1).astype(np.float32), (0, 0), 6)     # 1 = near

def flicker_curve(t, seed):
    """firelight: two slow sines and a seeded jitter, mean 0, range about ±1"""
    rng = np.random.default_rng(seed); ph = rng.uniform(0, 6.28, 4)
    return 0.55 * math.sin(t * 6.1 + ph[0]) + 0.3 * math.sin(t * 13.7 + ph[1]) + 0.15 * math.sin(t * 23.3 + ph[2])

def still_shot(sh, dur, path):
    src = cv2.imread(os.path.join(A, sh['still'] + '.jpeg'))
    M = 1.12                                                    # parallax margin
    img, band = cover(src, sh['focus'], M)
    d = depth(img); hh, ww = img.shape[:2]
    warm = img.astype(np.float32) / 255
    lum = warm.mean(axis=2); heat = np.clip((warm[..., 2] - warm[..., 0]) * 2.2, 0, 1) * np.clip((lum - 0.35) * 2.5, 0, 1)
    heat = cv2.GaussianBlur(heat, (0, 0), 25)[..., None]
    gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    n = round(dur * FPS); dx, dy, zoom = sh['move']
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
    seed = int(sh['still'])
    dn = cv2.resize(d, (W, H))                                  # nearness at each output pixel (1 = near)
    for i in range(n):
        p = i / max(1, n - 1); e = p * p * (3 - 2 * p)
        # output pixel → source pixel in the M-times bigger picture: near things move and grow more than far ones
        z = 1 + zoom * e * (0.4 + 0.6 * dn)
        cx = ww / 2 + dx * W * (e - 0.5) * (0.3 + 0.7 * dn); cy = hh / 2 + dy * H * (e - 0.5) * (0.3 + 0.7 * dn)
        mx = (cx + (gx - W / 2) / z).astype(np.float32); my = (cy + (gy - H / 2) / z).astype(np.float32)
        frame = cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        if sh.get('flicker'):
            k = 1 + sh['flicker'] * flicker_curve(i / FPS, seed)
            hm = cv2.remap(heat, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)[..., None]
            f = frame.astype(np.float32) * (1 + (k - 1) * hm * np.array([0.55, 0.85, 1.15], np.float32))
            frame = np.clip(f, 0, 255).astype(np.uint8)
        if sh.get('fadeout'):
            fo = np.clip((dur - i / FPS) / sh['fadeout'], 0, 1); frame = (frame.astype(np.float32) * fo).astype(np.uint8)
        ff.stdin.write(frame.tobytes())
    ff.stdin.close(); ff.wait()
    return dict(band=band)

def clip_shot(sh, dur, path):
    src = os.path.join(A, sh['clip'] + '.mp4')
    probe_frame = os.path.join(WORK, f"{sh['clip']}-probe.png")
    run('ffmpeg', '-v', 'error', '-y', '-ss', '2', '-i', src, '-frames:v', '1', probe_frame)
    y0, y1 = content_rows(cv2.imread(probe_frame))
    if (y0, y1) != (0, 1920): y0, y1 = y0 + 18, y1 - 18                     # video bands have a soft edge
    ch = y1 - y0; s = max(W / 1080, H / ch); sw = math.ceil(1080 * s); sh_ = math.ceil(ch * s)
    x = int(np.clip(sh['focus'] * sw - W / 2, 0, sw - W))
    vf = f"crop=1080:{ch}:0:{y0},scale={sw}:{sh_}:flags=lanczos,crop={W}:{H}:{x}:{(sh_ - H) // 2},fps={FPS},setsar=1"
    run('ffmpeg', '-v', 'error', '-y', '-ss', str(sh['trim']), '-i', src, '-t', f'{dur:.3f}', '-an', '-vf', vf,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', path)
    if probe(path) < dur - 0.05: raise SystemExit(f"{sh['id']}: clip {sh['clip']} too short for {dur:.2f} s after trim {sh['trim']}")
    return dict(band=(y0, y1))

def stage_shots(plan):
    for sh, slot in zip(SHOTS, plan):
        path = os.path.join(WORK, f"{sh['id']}.mp4")
        info = still_shot(sh, slot['dur'], path) if 'still' in sh else clip_shot(sh, slot['dur'], path)
        print(f"[baker] {sh['id']}: {'still ' + sh['still'] if 'still' in sh else 'clip ' + sh['clip']} {slot['dur']:.2f} s, content rows {info['band']}")

# ---------- timing ----------
def plan_timeline():
    vdir = os.path.join(WORK, 'voice')
    t, plan = 0.0, []
    for i, sh in enumerate(SHOTS):
        dur = sh['beats'] * BEAT; v = probe(os.path.join(vdir, f'line_{i + 1:03d}.wav')); lead = 0.6 if i == 0 else 0.3
        if lead + v > dur - 0.2: raise SystemExit(f"{sh['id']}: line {i + 1} ({v:.2f} s) does not fit {sh['beats']} beats")
        plan.append(dict(start=t, dur=dur, voice_at=t + lead, voice_len=v, line=LINES[i])); t += dur
    return plan, t

# ---------- captions: chunks of ≤ 5 words, balanced, breaking at punctuation ----------
def chunks(text, n=5):
    w = text.split()
    if len(w) <= n: return [text]
    parts = math.ceil(len(w) / n); out, i = [], 0
    for left in range(parts, 1, -1):
        size = round((len(w) - i) / left)
        for dd in (0, 1, -1):
            s2 = size + dd
            if 2 <= s2 <= n and len(w) - i - s2 >= 2 and w[i + s2 - 1][-1] in ',.،؛؟!:': size = s2; break
        out.append(' '.join(w[i:i + size])); i += size
    out.append(' '.join(w[i:])); return out

def stage_captions(plan):
    """each chunk → a transparent PNG (Chromium shapes the Arabic), plus its time window"""
    items = []
    for li, sl in enumerate(plan):
        cs = chunks(sl['line']); tot = sum(len(c) + 2 for c in cs); acc = 0
        for ci, c in enumerate(cs):
            a = sl['voice_at'] + sl['voice_len'] * acc / tot - (0.15 if ci == 0 else 0); acc += len(c) + 2
            b = sl['voice_at'] + sl['voice_len'] * acc / tot if ci < len(cs) - 1 else min(sl['start'] + sl['dur'] - 0.1, sl['voice_at'] + sl['voice_len'] + 0.6)
            items.append(dict(text=c, a=round(a, 3), b=round(b - (0.12 if ci < len(cs) - 1 else 0), 3), png=os.path.join(WORK, f'cap-{li + 1}-{ci + 1}.png')))
    font = os.path.join(STUDIO, 'assets', 'fonts', 'Alexandria-arabic.woff2')
    js = os.path.join(WORK, 'captions.cjs')
    open(js, 'w').write("""
const { chromium } = require('playwright'); const items = %s; const font = %s;
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: %d, height: 400 }, deviceScaleFactor: 1 });
  for (const it of items) {
    await p.setContent(`<html><head><style>@font-face{font-family:A;src:url(file://${font})}html,body{margin:0;background:transparent}
      div{width:%dpx;height:400px;display:flex;align-items:center;justify-content:center;direction:rtl;font:600 64px/1.35 A;color:#fff8ec;
      text-shadow:0 3px 18px rgba(0,0,0,.7),0 0 3px rgba(0,0,0,.8);padding:0 70px;box-sizing:border-box;text-align:center}</style></head>
      <body><div>${it.text}</div></body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: it.png, omitBackground: true });
  }
  await b.close(); })();
""" % (json.dumps(items), json.dumps(font), W, W))
    run('node', js, cwd=STUDIO)
    json.dump(items, open(os.path.join(WORK, 'captions.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'[baker] captions: {len(items)} chunks')
    return items

# ---------- sound ----------
def stage_sound(plan, total):
    vdir = os.path.join(WORK, 'voice'); voice = os.path.join(WORK, 'voice.wav')
    ins = sum([['-i', os.path.join(vdir, f'line_{i + 1:03d}.wav')] for i in range(len(plan))], [])
    fl = ';'.join(f"[{i}:a]aresample=48000,adelay={round(sl['voice_at'] * 1000)}:all=1[v{i}]" for i, sl in enumerate(plan))
    run('ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', f"{fl};{''.join(f'[v{i}]' for i in range(len(plan)))}amix=inputs={len(plan)}:normalize=0,apad[o]",
        '-map', '[o]', '-t', f'{total:.3f}', '-ac', '1', voice)
    spec = dict(title='baker', bpm=BPM, music=dict(progression=['Am', 'F', 'C', 'G'], final='C'),
                scenes=[dict(id=sh['id'], beats=sh['beats'], music='finale' if i == len(SHOTS) - 1 else 'verse', elements=[]) for i, sh in enumerate(SHOTS)])
    json.dump(spec, open(os.path.join(WORK, 'score-spec.json'), 'w'))
    js = os.path.join(WORK, 'score.mjs')
    open(js, 'w').write(f"""import {{ readFileSync }} from 'node:fs';
import {{ renderScore }} from '{os.path.join(STUDIO, 'studio-engine', 'lib', 'sound.mjs')}';
import {{ decode }} from '{os.path.join(STUDIO, 'studio-engine', 'lib', 'analyze.mjs')}';
renderScore(JSON.parse(readFileSync('{os.path.join(WORK, 'score-spec.json')}', 'utf8')), '{os.path.join(WORK, 'score')}', {{ voice: decode('{voice}') }});
""")
    run('node', js, cwd=STUDIO)
    print('[baker] score + narration mixed (music ducks under the voice)')

# ---------- final ----------
def stage_final(plan, total, items):
    lst = os.path.join(WORK, 'shots.txt')
    open(lst, 'w').write(''.join(f"file '{os.path.join(WORK, sh['id'] + '.mp4')}'\n" for sh in SHOTS))
    pic = os.path.join(WORK, 'picture.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', pic)
    ins, chain, last = ['-i', pic, '-i', os.path.join(WORK, 'score', 'mix.wav')], [], '0:v'
    for k, it in enumerate(items):
        ins += ['-loop', '1', '-t', f'{total:.3f}', '-i', it['png']]
        f = f"[{k + 2}:v]format=rgba,fade=in:st={it['a']}:d=0.15:alpha=1,fade=out:st={max(it['a'], it['b'] - 0.15):.3f}:d=0.15:alpha=1[c{k}]"
        chain.append(f); chain.append(f"[{last}][c{k}]overlay=0:{int(H * 0.2) - 200}:enable='between(t,{it['a']},{it['b']})'[o{k}]"); last = f'o{k}'
    film = os.path.join(OUT, 'baker-reel.mp4')
    run('ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(chain), '-map', f'[{last}]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-af', f'afade=out:st={total - 1.2:.2f}:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k',
        '-t', f'{total:.3f}', '-movflags', '+faststart', film)
    print(f'[baker] film: {film}')
    return film

# ---------- QC ----------
def stage_qc(film, total):
    rep = {}
    v = json.loads(run('ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', film))
    vs = [s for s in v['streams'] if s['codec_type'] == 'video'][0]
    rep['size'] = f"{vs['width']}x{vs['height']}"; rep['fps'] = vs['r_frame_rate']; rep['duration'] = round(float(v['format']['duration']), 2)
    e = subprocess.run(['ffmpeg', '-hide_banner', '-i', film, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    import re
    rep['lufs'] = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]); rep['true_peak'] = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1]); rep['lra'] = float(re.findall(r'LRA:\s+(-?[\d.]+) LU', e)[-1])
    bl = subprocess.run(['ffmpeg', '-hide_banner', '-i', film, '-vf', 'blackdetect=d=0.25:pix_th=0.06', '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
    rep['black'] = [l.split('black_start:')[1].split()[0] for l in bl.splitlines() if 'black_start' in l]
    fr = subprocess.run(['ffmpeg', '-hide_banner', '-i', film, '-vf', 'freezedetect=n=0.0008:d=1.2', '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
    rep['frozen'] = [l.split('freeze_start: ')[1].strip() for l in fr.splitlines() if 'freeze_start' in l]
    checks = [('size 1080x1920', rep['size'] == f'{W}x{H}'), ('duration ±0.1 s', abs(rep['duration'] - total) <= 0.1), ('loudness -14 ±1 LUFS', abs(rep['lufs'] + 14) <= 1),
              ('true peak ≤ -1 dBTP', rep['true_peak'] <= -1.0), ('LRA < 8 LU', rep['lra'] < 8), ('no black mid-film', all(float(b) > total - 1.5 for b in rep['black'])),
              ('no frozen span > 1.2 s', not rep['frozen'])]
    sheet = os.path.join(OUT, 'sheet.jpg')
    run('ffmpeg', '-v', 'error', '-y', '-i', film, '-vf', 'fps=1/2,scale=216:-2,tile=7x3:padding=4:color=0x111111', '-frames:v', '1', sheet)
    rep['checks'] = {k: ('PASS' if ok else 'FAIL') for k, ok in checks}
    json.dump(rep, open(os.path.join(OUT, 'qc.json'), 'w'), indent=1)
    for k, ok in checks: print(f"  {'PASS' if ok else 'FAIL'}  {k}")
    print(f"[baker] qc: {json.dumps({k: rep[k] for k in ['size', 'fps', 'duration', 'lufs', 'true_peak', 'lra']})} · sheet {sheet}")
    return all(ok for _, ok in checks)

if __name__ == '__main__':
    stage = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--stage=')), 'all')
    plan, total = plan_timeline()
    print(f'[baker] {len(SHOTS)} shots, {total:.2f} s at {BPM} BPM')
    if stage in ('shots', 'all'): stage_shots(plan)
    items = stage_captions(plan) if stage in ('captions', 'all', 'final') else None
    if stage in ('sound', 'all'): stage_sound(plan, total)
    film = stage_final(plan, total, items) if stage in ('final', 'all') else os.path.join(OUT, 'baker-reel.mp4')
    if stage in ('qc', 'all', 'final'): sys.exit(0 if stage_qc(film, total) else 1)
