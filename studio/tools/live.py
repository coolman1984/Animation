#!/usr/bin/env python3
"""Live-action footage toolkit — turn real video of real people into data the studio can edit and animate around.

Everything runs OFFLINE after `models` (MediaPipe models from storage.googleapis.com, Silero VAD and sherpa-onnx Whisper
from GitHub; Hugging Face is not needed). Analysis results are cached JSON/PNG in a "footage pack" folder (git-ignored);
films read the pack, so renders stay deterministic even though some models are not (MediaPipe issue #5253).

  python3 tools/live.py models [--asr turbo|base]          download + verify models into studio/models/
  python3 tools/live.py ingest VIDEO PACK [--ss 0 --t 20 --fps 30 --width 1080 --interp dup|blend|mci]
  python3 tools/live.py vad PACK                           speech segments + 10 ms loudness (Silero VAD v5, ONNX)
  python3 tools/live.py transcribe PACK [--lang ar]        Whisper (sherpa-onnx) segments → word timings
  python3 tools/live.py align PACK --script FILE           known script → word timings on the real speech
  python3 tools/live.py scenes PACK                        hard cuts (PySceneDetect content detector)
  python3 tools/live.py matte PACK [--model multiclass|selfie] [--scale 0.5]   soft person alpha per frame
  python3 tools/live.py track PACK                         faces + poses → smoothed anchors per person
  python3 tools/live.py space PACK                         where text can go without covering people (per scene)
  python3 tools/live.py reframe PACK [--aspect 9:16]       subject-following crop path (zero-lag offline smoothing)
  python3 tools/live.py preview PACK OUT.mp4               burn the analysis (matte, anchors, crop, words) into a QA video
  python3 tools/live.py tts SCRIPT.txt OUT.wav [--gap=0.7]  scratch Arabic voiceover (Piper ar_JO via sherpa-onnx) to time an edit
                                                           before the real voice is recorded — never ship it as the client's voice
  python3 tools/live.py all VIDEO PACK [ingest options]    everything above that applies

Pack layout: pack.json · frames/f000001.jpg · audio16k.wav · audio48k.wav · speech.json · transcript.json · scenes.json ·
matte/f000001.png · tracks.json · space.json · reframe.json. Coordinates in JSON are normalised 0..1 of the frame.
Needs: pip install mediapipe onnxruntime sherpa-onnx soundfile opencv-python-headless numpy scenedetect
"""
import json, os, subprocess, sys, math, hashlib, urllib.request, tarfile, shutil
import numpy as np
import sys as _sys; [s.reconfigure(encoding='utf-8') for s in (_sys.stdout, _sys.stderr)]  # Windows pipes default to cp1252; Arabic/≈ output crashed

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get('STUDIO_MODELS', os.path.join(os.path.dirname(HERE), 'models'))
MP = 'https://storage.googleapis.com/mediapipe-models'
CATALOG = {
    'selfie_multiclass_256x256.tflite': f'{MP}/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
    'selfie_segmenter.tflite': f'{MP}/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
    'face_landmarker.task': f'{MP}/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
    'pose_landmarker_full.task': f'{MP}/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
    'hand_landmarker.task': f'{MP}/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
    'magic_touch.tflite': f'{MP}/interactive_segmenter/magic_touch/float32/latest/magic_touch.tflite',
    'silero_vad.onnx': 'https://raw.githubusercontent.com/snakers4/silero-vad/master/src/silero_vad/data/silero_vad.onnx',
}
TTS = ('vits-piper-ar_JO-kareem-medium', 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ar_JO-kareem-medium.tar.bz2')
ASR = {'turbo': 'sherpa-onnx-whisper-turbo', 'base': 'sherpa-onnx-whisper-base', 'small': 'sherpa-onnx-whisper-small'}
ASR_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/{}.tar.bz2'


def log(*a): print('[live]', *a, file=sys.stderr, flush=True)
def opts(argv):
    o, pos = {}, []
    for a in argv:
        if a.startswith('--'):
            k, _, v = a[2:].partition('='); o[k] = v if v else True
        else: pos.append(a)
    return pos, o
def jload(p, default=None):
    try: return json.load(open(p, encoding='utf-8'))
    except FileNotFoundError: return default
def jsave(p, d):
    with open(p, 'w', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False)
    return d
def run(cmd): subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
def model(name):
    p = os.path.join(MODELS, name)
    if not os.path.exists(p): raise SystemExit(f'missing model {name}: run `python3 tools/live.py models`')
    return p


# ---------------------------------------------------------------------------------------------------------- models
def cmd_models(pos, o):
    os.makedirs(MODELS, exist_ok=True)
    for name, url in CATALOG.items():
        p = os.path.join(MODELS, name)
        if not os.path.exists(p): log('download', name); urllib.request.urlretrieve(url, p)
        log('ok', name, os.path.getsize(p), hashlib.sha256(open(p, 'rb').read()).hexdigest()[:12])
    asr = o.get('asr', 'turbo')
    if asr and asr != 'none':
        d = os.path.join(MODELS, ASR[asr])
        if not os.path.isdir(d):
            tmp = d + '.tar.bz2'; log('download', ASR[asr], '(hundreds of MB)'); urllib.request.urlretrieve(ASR_URL.format(ASR[asr]), tmp)
            with tarfile.open(tmp) as tf: tf.extractall(MODELS)
            os.remove(tmp)
        log('ok', ASR[asr])
    if o.get('tts'):
        d = os.path.join(MODELS, TTS[0])
        if not os.path.isdir(d):
            tmp = d + '.tar.bz2'; urllib.request.urlretrieve(TTS[1], tmp)
            with tarfile.open(tmp) as tf: tf.extractall(MODELS)
            os.remove(tmp)
        log('ok', TTS[0])


# ---------------------------------------------------------------------------------------------------------- ingest
def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=index,codec_type,width,height,r_frame_rate,sample_rate',
                          '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def cmd_ingest(pos, o):
    src, pack = pos[0], pos[1]
    os.makedirs(os.path.join(pack, 'frames'), exist_ok=True)
    fps, width, interp = int(o.get('fps', 30)), int(o.get('width', 1080)), o.get('interp', 'dup')
    cut = (['-ss', str(o['ss'])] if 'ss' in o else []) + (['-t', str(o['t'])] if 't' in o else [])
    # Frame-rate conform: dup = repeat frames (honest, may stutter), blend = cross-fade frames, mci = motion-compensated
    # interpolation (smooth, can warp fast limbs). RIFE (Practical-RIFE / rife-ncnn-vulkan) is the higher-quality option.
    rate = {'dup': f'fps={fps}', 'blend': f'framerate=fps={fps}', 'mci': f'minterpolate=fps={fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'}[interp]
    for f in os.listdir(os.path.join(pack, 'frames')): os.remove(os.path.join(pack, 'frames', f))
    run(['ffmpeg', '-y', *cut, '-i', src, '-vf', f'{rate},scale={width}:-2:flags=lanczos', '-q:v', '2', os.path.join(pack, 'frames', 'f%06d.jpg')])
    has_audio = any(s['codec_type'] == 'audio' for s in probe(src)['streams'])
    if has_audio:
        run(['ffmpeg', '-y', *cut, '-i', src, '-vn', '-ac', '1', '-ar', '16000', os.path.join(pack, 'audio16k.wav')])
        run(['ffmpeg', '-y', *cut, '-i', src, '-vn', '-ac', '2', '-ar', '48000', os.path.join(pack, 'audio48k.wav')])
    n = len([f for f in os.listdir(os.path.join(pack, 'frames')) if f.endswith('.jpg')])
    import cv2
    h, w = cv2.imread(os.path.join(pack, 'frames', 'f000001.jpg')).shape[:2]
    info = jsave(os.path.join(pack, 'pack.json'), {'source': os.path.abspath(src), 'ss': float(o.get('ss', 0)), 'fps': fps, 'frames': n, 'w': w, 'h': h,
                                                   'duration': n / fps, 'interp': interp, 'audio': has_audio, 'probe': probe(src)})
    log('ingest', n, 'frames', f'{w}x{h}', f'{fps} fps', 'audio' if has_audio else 'no audio')
    return info

def pack_info(pack):
    info = jload(os.path.join(pack, 'pack.json'))
    if not info: raise SystemExit(f'{pack}: run ingest first')
    return info
def frame_path(pack, n): return os.path.join(pack, 'frames', f'f{n:06d}.jpg')


# ---------------------------------------------------------------------------------------------------------- audio
def read_wav(path):
    import soundfile as sf
    x, sr = sf.read(path, dtype='float32', always_2d=True)
    return x.mean(axis=1), sr

def silero_probs(x, sr=16000):
    """Silero VAD v5 over 512-sample windows (32 ms) with the 64-sample context the v5 ONNX wrapper keeps."""
    import onnxruntime as ort
    so = ort.SessionOptions(); so.intra_op_num_threads = 1; so.inter_op_num_threads = 1
    sess = ort.InferenceSession(model('silero_vad.onnx'), so, providers=['CPUExecutionProvider'])
    state, ctx, probs = np.zeros((2, 1, 128), np.float32), np.zeros(64, np.float32), []
    for i in range(0, len(x) - 511, 512):
        chunk = np.concatenate([ctx, x[i:i + 512]])[None, :].astype(np.float32)
        out, state = sess.run(None, {'input': chunk, 'state': state, 'sr': np.array(sr, np.int64)})
        probs.append(float(out[0][0])); ctx = x[i + 448:i + 512]
    return np.array(probs), 512 / sr

def speech_segments(probs, hop, threshold=0.5, min_speech=0.25, min_silence=0.12, pad=0.05):
    neg, segs, on, start, silent_since = threshold - 0.15, [], False, 0.0, None
    for i, p in enumerate(probs):
        t = i * hop
        if not on and p >= threshold: on, start, silent_since = True, t, None
        elif on and p < neg:
            silent_since = t if silent_since is None else silent_since
            if t - silent_since >= min_silence:
                if silent_since - start >= min_speech: segs.append([start, silent_since])
                on, silent_since = False, None
        elif on: silent_since = None
    if on and len(probs) * hop - start >= min_speech: segs.append([start, len(probs) * hop])
    total = len(probs) * hop
    return [[round(max(0, a - pad), 3), round(min(total, b + pad), 3)] for a, b in segs]

def rms_curve(x, sr, hop=0.01):
    n = int(sr * hop)
    frames = x[:len(x) // n * n].reshape(-1, n)
    return np.sqrt((frames ** 2).mean(axis=1) + 1e-12)

def cmd_vad(pos, o):
    pack = pos[0]; info = pack_info(pack)
    wav = o.get('wav') or os.path.join(pack, 'audio16k.wav')
    if not os.path.exists(wav): raise SystemExit('no audio in this pack (pass --wav=voice.wav for a separate voice track)')
    x, sr = read_wav(wav)
    if sr != 16000:
        import cv2  # cheap resample through numpy interpolation
        x = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32); sr = 16000
    probs, hop = silero_probs(x, sr)
    segs = speech_segments(probs, hop, float(o.get('threshold', 0.5)))
    rms = rms_curve(x, sr)
    d = {'source': os.path.abspath(wav), 'hop': 0.01, 'segments': segs, 'speechSeconds': round(sum(b - a for a, b in segs), 3),
         'rmsDb': [round(float(20 * np.log10(v)), 1) for v in rms], 'vadHop': hop, 'vad': [round(float(p), 3) for p in probs]}
    jsave(os.path.join(pack, 'speech.json'), d)
    log('vad', len(segs), 'segments,', d['speechSeconds'], 's of speech')
    return d


# ---------------------------------------------------------------------------------------------------------- words
def word_weights(words):
    # Spoken length grows with letters; Arabic diacritics/tatweel do not add time.
    strip = lambda w: ''.join(ch for ch in w if not ('ً' <= ch <= 'ٟ' or ch in 'ـ.,،؟?!:؛'))
    return [max(1, len(strip(w))) + 1.5 for w in words]

def micro_gaps(spans, rms_db, hop=0.01, drop=22.0, min_len=0.03):
    """Short pauses inside speech: runs of 10 ms frames at least `drop` dB under the span's speech level."""
    if rms_db is None or not len(rms_db): return []
    r, out = np.array(rms_db), []
    for a, b in spans:
        k0, k1 = int(a / hop), min(len(r), int(b / hop))
        if k1 - k0 < 5: continue
        seg = r[k0:k1]; thr = np.percentile(seg, 90) - drop; run = None
        for i, v in enumerate(np.append(seg, np.inf)):
            if v < thr and run is None: run = i
            elif v >= thr and run is not None:
                if (i - run) * hop >= min_len and run > 0 and i < len(seg): out.append(((k0 + (run + i) / 2) * hop, (i - run) * hop))
                run = None
    return out

def place_words(words, spans, rms_db=None, hop=0.01, snap=None):
    """Spread words over speech-active time in proportion to their spoken length, then anchor boundaries on real micro-pauses
    (energy gaps) near their estimate and re-spread the words between anchors. spans: [[a, b], …] speech intervals in order.
    Measured on TTS with known word edges: median boundary error ≈ 0.05 s (see test/live.test.mjs)."""
    spans = [s for s in spans if s[1] > s[0]]
    if not words or not spans: return []
    total = sum(b - a for a, b in spans); wts = word_weights(words); W = sum(wts)
    def a2t(u):
        for a, b in spans:
            if u <= b - a: return a + u
            u -= b - a
        return spans[-1][1]
    def t2a(t):
        acc = 0.0
        for a, b in spans:
            if t <= b: return acc + max(0.0, t - a)
            acc += b - a
        return total
    cum = np.cumsum([0.0] + wts)
    est = [c / W * total for c in cum]  # boundaries in active time
    anchors = {0: 0.0, len(words): total}
    tol = max(0.12, 0.6 * total / len(words))
    for t, length in sorted(micro_gaps(spans, rms_db, hop), key=lambda g: -g[1]):
        u = t2a(t); i = min(range(1, len(words)), key=lambda k: abs(est[k] - u), default=None)
        if i is None or i in anchors or abs(est[i] - u) > tol: continue
        lo = max((k for k in anchors if k < i), default=0); hi = min((k for k in anchors if k > i), default=len(words))
        if anchors[lo] + 0.06 * (i - lo) < u < anchors[hi] - 0.06 * (hi - i): anchors[i] = u
    keys = sorted(anchors); bnd = [0.0] * (len(words) + 1)
    for k0, k1 in zip(keys, keys[1:]):  # re-spread inside each anchored stretch by word weight
        for k in range(k0, k1 + 1): bnd[k] = anchors[k0] + (anchors[k1] - anchors[k0]) * (cum[k] - cum[k0]) / max(cum[k1] - cum[k0], 1e-9)
    times = [a2t(u) for u in bnd]
    return [{'w': w, 'start': round(times[i], 3), 'end': round(times[i + 1], 3)} for i, w in enumerate(words)]

def group_spans(segs, n, min_gap=0.0):
    """Merge VAD segments into exactly n groups by keeping the n-1 longest gaps (sentence pauses)."""
    if n <= 0 or not segs: return []
    if len(segs) <= n: return [[s] for s in segs]
    gaps = sorted(range(1, len(segs)), key=lambda i: segs[i][0] - segs[i - 1][1], reverse=True)[:n - 1]
    groups, cur = [], [segs[0]]
    for i in range(1, len(segs)):
        if i in gaps: groups.append(cur); cur = []
        cur.append(segs[i])
    groups.append(cur)
    return groups

def cmd_transcribe(pos, o):
    pack = pos[0]; pack_info(pack)
    import sherpa_onnx
    name = ASR[o.get('model', 'turbo')]; d = os.path.join(MODELS, name); p = name.split('-')[-1]
    if not os.path.isdir(d): raise SystemExit(f'missing {name}: run `python3 tools/live.py models --asr={o.get("model", "turbo")}`')
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{d}/{p}-encoder.int8.onnx', decoder=f'{d}/{p}-decoder.int8.onnx', tokens=f'{d}/{p}-tokens.txt',
                                                     language=o.get('lang', 'ar'), task='transcribe', num_threads=os.cpu_count() or 2, enable_segment_timestamps=True)
    wav = o.get('wav') or os.path.join(pack, 'audio16k.wav')
    x, sr = read_wav(wav)
    speech = jload(os.path.join(pack, 'speech.json')) or cmd_vad([pack], {'wav': wav} if o.get('wav') else {})
    s = rec.create_stream(); s.accept_waveform(sr, x); rec.decode_stream(s); r = s.result
    segs, words = [], []
    for txt, st, du in zip(r.segment_texts or [r.text], r.segment_timestamps or [0.0], r.segment_durations or [len(x) / sr]):
        a, b = float(st), float(st) + float(du)
        active = [[max(a, s0), min(b, s1)] for s0, s1 in speech['segments'] if min(b, s1) > max(a, s0)] or [[a, b]]
        segs.append({'start': round(a, 3), 'end': round(b, 3), 'text': txt.strip()})
        words += place_words(txt.split(), active, speech.get('rmsDb'))
    d = jsave(os.path.join(pack, 'transcript.json'), {'model': name, 'lang': o.get('lang', 'ar'), 'text': r.text.strip(), 'segments': segs, 'words': words,
                                                      'wordTiming': 'proportional within Whisper segments, snapped to loudness dips (not forced alignment)'})
    log('transcribe', len(segs), 'segments,', len(words), 'words:', d['text'][:80])
    return d

def cmd_align(pos, o):
    pack = pos[0]; pack_info(pack)
    if 'script' not in o: raise SystemExit('align needs --script=FILE (one sentence per line)')
    lines = [l.strip() for l in open(o['script'], encoding='utf-8') if l.strip()]
    speech = jload(os.path.join(pack, 'speech.json')) or cmd_vad([pack], {})
    groups = group_spans(speech['segments'], len(lines))
    words = []
    if len(groups) == len(lines):
        for line, g in zip(lines, groups): words += [dict(wd, line=i) for wd in place_words(line.split(), g, speech.get('rmsDb')) for i in [lines.index(line)]]
    else:
        words = place_words(' '.join(lines).split(), speech['segments'], speech.get('rmsDb'))
    d = jsave(os.path.join(pack, 'transcript.json'), {'model': 'script', 'text': ' '.join(lines), 'lines': lines, 'words': words,
                                                      'wordTiming': 'script words over VAD speech (sentence = speech group), snapped to loudness dips'})
    log('align', len(words), 'words over', len(groups), 'speech groups')
    return d


# ---------------------------------------------------------------------------------------------------------- scenes
def cmd_scenes(pos, o):
    pack = pos[0]; info = pack_info(pack)
    import cv2
    prev, cuts, thr = None, [], float(o.get('threshold', 27))
    for n in range(1, info['frames'] + 1):  # content detector on the conformed frames (HSV delta, PySceneDetect's default idea)
        hsv = cv2.cvtColor(cv2.resize(cv2.imread(frame_path(pack, n)), (160, 90)), cv2.COLOR_BGR2HSV).astype(np.float32)
        if prev is not None and float(np.abs(hsv - prev).mean(axis=(0, 1)).mean()) > thr and (not cuts or n - cuts[-1] > info['fps'] // 2): cuts.append(n)
        prev = hsv
    d = jsave(os.path.join(pack, 'scenes.json'), {'threshold': thr, 'cutFrames': cuts, 'cuts': [round((c - 1) / info['fps'], 3) for c in cuts],
                                                  'shots': [[round((a - 1) / info['fps'], 3), round((b - 1) / info['fps'], 3)] for a, b in zip([1] + cuts, cuts + [info['frames'] + 1])]})
    log('scenes', len(cuts), 'cuts')
    return d


# ---------------------------------------------------------------------------------------------------------- matte
def guided(I, p, r=6, eps=1e-3):
    """He et al. guided filter (box filters): edge-aware upsampling of a coarse alpha onto the frame's own edges."""
    import cv2
    box = lambda m: cv2.boxFilter(m, -1, (2 * r + 1, 2 * r + 1))
    mI, mp_, corr = box(I), box(p), box(I * p)
    var = box(I * I) - mI * mI; a = (corr - mI * mp_) / (var + eps); b = mp_ - a * mI
    return box(a) * I + box(b)

def cmd_matte(pos, o):
    pack = pos[0]; info = pack_info(pack)
    import cv2, mediapipe as mp
    from mediapipe.tasks.python import vision, BaseOptions
    kind = o.get('model', 'multiclass'); scale = float(o.get('scale', 0.5))
    mfile = 'selfie_multiclass_256x256.tflite' if kind == 'multiclass' else 'selfie_segmenter.tflite'
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=BaseOptions(model_asset_path=model(mfile)),
                                                    running_mode=vision.RunningMode.IMAGE, output_confidence_masks=True, output_category_mask=False))
    out = os.path.join(pack, 'matte'); os.makedirs(out, exist_ok=True)
    W, H = int(info['w'] * scale) // 2 * 2, int(info['h'] * scale) // 2 * 2
    prev, cover = None, []
    for n in range(1, info['frames'] + 1):
        bgr = cv2.imread(frame_path(pack, n)); rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        res = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        conf = res.confidence_masks
        a = 1.0 - conf[0].numpy_view().astype(np.float32) if kind == 'multiclass' else conf[-1].numpy_view().astype(np.float32)
        a = cv2.resize(a, (W, H), interpolation=cv2.INTER_LINEAR)
        g = cv2.cvtColor(cv2.resize(bgr, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        a = np.clip(guided(g, a, r=max(2, int(6 * scale * 2)), eps=2e-3), 0, 1)
        if prev is not None:  # temporal steadiness only where the alpha barely changed (no ghosting on fast motion)
            calm = (np.abs(a - prev) < 0.25).astype(np.float32); a = calm * (0.65 * a + 0.35 * prev) + (1 - calm) * a
        prev = a
        a = np.clip((a - 0.08) / 0.84, 0, 1)  # remove the low-confidence veil, keep soft edges
        cv2.imwrite(os.path.join(out, f'f{n:06d}.png'), (a * 255).astype(np.uint8))
        cover.append(round(float(a.mean()), 4))
    seg.close()
    d = jsave(os.path.join(pack, 'matte.json'), {'model': mfile, 'size': [W, H], 'coverage': cover, 'mode': 'IMAGE (deterministic per frame)'})
    log('matte', info['frames'], 'frames', f'{W}x{H}', 'mean coverage', round(float(np.mean(cover)), 3))
    return d


# ---------------------------------------------------------------------------------------------------------- tracking
class OneEuro:
    """Casiez, Roussel & Vogel (CHI 2012) 1€ filter: low jitter when still, low lag when moving."""
    def __init__(self, freq, mincutoff=1.2, beta=0.25, dcutoff=1.0): self.f, self.mc, self.b, self.dc, self.x, self.dx = freq, mincutoff, beta, dcutoff, None, 0.0
    def a(self, cutoff): te = 1.0 / self.f; tau = 1.0 / (2 * math.pi * cutoff); return 1.0 / (1.0 + tau / te)
    def __call__(self, x):
        if self.x is None: self.x = x; return x
        dx = (x - self.x) * self.f; self.dx += self.a(self.dc) * (dx - self.dx)
        self.x += self.a(self.mc + self.b * abs(self.dx)) * (x - self.x); return self.x

def cmd_track(pos, o):
    pack = pos[0]; info = pack_info(pack)
    import cv2, mediapipe as mp
    from mediapipe.tasks.python import vision, BaseOptions
    maxp = int(o.get('people', 4))
    face = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=model('face_landmarker.task')),
                                                     running_mode=vision.RunningMode.IMAGE, num_faces=maxp, min_face_detection_confidence=0.4))
    pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path=model('pose_landmarker_full.task')),
                                                     running_mode=vision.RunningMode.IMAGE, num_poses=maxp, min_pose_detection_confidence=0.4))
    raw = []
    for n in range(1, info['frames'] + 1):
        rgb = cv2.cvtColor(cv2.imread(frame_path(pack, n)), cv2.COLOR_BGR2RGB); img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        fr, pr, people = face.detect(img), pose.detect(img), []
        for lm in fr.face_landmarks:
            xs, ys = [p.x for p in lm], [p.y for p in lm]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys); fh = y1 - y0
            people.append({'face': [x0, y0, x1 - x0, fh], 'c': [lm[1].x, lm[1].y], 'faceFrom': 'mesh', 'head': [lm[10].x, lm[10].y - 0.35 * fh],
                           'mouth': [(lm[13].x + lm[14].x) / 2, (lm[13].y + lm[14].y) / 2], 'mouthOpen': abs(lm[14].y - lm[13].y) / max(fh, 1e-6),
                           'eyes': [[lm[33].x, lm[33].y], [lm[263].x, lm[263].y]], 'nose': [lm[1].x, lm[1].y]})
        for pl in pr.pose_landmarks:  # attach body points to the nearest face (or create a body-only person)
            nose = [pl[0].x, pl[0].y]; body = {'shoulders': [[pl[11].x, pl[11].y], [pl[12].x, pl[12].y]], 'wrists': [[pl[15].x, pl[15].y], [pl[16].x, pl[16].y]],
                                               'hips': [[pl[23].x, pl[23].y], [pl[24].x, pl[24].y]]}
            body['torso'] = [(pl[11].x + pl[12].x + pl[23].x + pl[24].x) / 4, (pl[11].y + pl[12].y + pl[23].y + pl[24].y) / 4]
            best = min(people, key=lambda q: math.dist(q['nose'], nose), default=None)
            if best is not None and math.dist(best['nose'], nose) < 0.08: best.update(body)
            else:  # the face mesh missed this face (small/blurred): estimate face anchors from the pose's face points
                ey, my = (pl[2].y + pl[5].y) / 2, (pl[9].y + pl[10].y) / 2; fh = max(abs(my - ey) / 0.35, 0.02); fw = max(abs(pl[7].x - pl[8].x) * 1.15, fh * 0.7)
                people.append({'c': nose, 'nose': nose, 'face': [nose[0] - fw / 2, ey - 0.45 * fh, fw, fh], 'head': [nose[0], ey - 0.62 * fh],
                               'mouth': [(pl[9].x + pl[10].x) / 2, my], 'eyes': [[pl[2].x, pl[2].y], [pl[5].x, pl[5].y]], 'faceFrom': 'pose', **body})
        raw.append(people)
    face.close(); pose.close()
    # identities: greedy nearest-centre association frame to frame; a track ends after 0.5 s unseen
    tracks, live, nid, gap = {}, {}, 0, info['fps'] // 2
    for n, people in enumerate(raw, start=1):
        free = dict(live)
        for q in sorted(people, key=lambda q: -(q.get('face', [0, 0, 0, 0])[3])):
            best = min(free.items(), key=lambda kv: math.dist(kv[1][1], q['c']), default=None)
            if best and math.dist(best[1][1], q['c']) < 0.18: pid = best[0]; del free[pid]
            else: pid = nid; nid += 1
            live[pid] = (n, q['c']); tracks.setdefault(pid, {})[n] = q
        for pid, (last, _) in list(live.items()):
            if n - last > gap: del live[pid]
    # merge fragments: a track that starts within 0.5 s of another's end, near where it ended, is the same person
    order = sorted(tracks, key=lambda k: min(tracks[k]))
    for i, a in enumerate(order):
        if a not in tracks: continue
        for b in order[i + 1:]:
            if b not in tracks: continue
            ea, sb = max(tracks[a]), min(tracks[b])
            if 0 < sb - ea <= gap and math.dist(tracks[a][ea]['c'], tracks[b][sb]['c']) < 0.2: tracks[a].update(tracks.pop(b))
    # 1€ smoothing per track and per scalar, then speaking score (mouth-motion energy over ~0.5 s)
    out = []
    for pid, frames in tracks.items():
        if len(frames) < info['fps'] // 3: continue
        filt, sm = {}, {}
        for n in sorted(frames):
            q, s = frames[n], {}
            def walk(v, key):
                if isinstance(v, (int, float)):
                    f = filt.setdefault(key, OneEuro(info['fps'])); return round(f(float(v)), 4)
                return [walk(x, f'{key}.{i}') for i, x in enumerate(v)]
            for k, v in q.items(): s[k] = v if isinstance(v, str) else walk(v, k)
            sm[n] = s
        ns = sorted(sm); mo = np.array([sm[n].get('mouthOpen', 0) for n in ns]); w = max(1, info['fps'] // 2)
        energy = np.convolve(np.abs(np.diff(mo, prepend=mo[0])), np.ones(w) / w, mode='same') if len(mo) else mo
        for n, e in zip(ns, energy): sm[n]['speaking'] = round(float(e) * 100, 3)
        out.append({'id': pid, 'first': ns[0], 'last': ns[-1], 'frames': {str(n): sm[n] for n in ns}})
    d = jsave(os.path.join(pack, 'tracks.json'), {'fps': info['fps'], 'w': info['w'], 'h': info['h'], 'people': out,
                                                  'note': 'normalised coords; IMAGE-mode detection per frame + 1€ smoothing; speaking = mouth-motion energy (heuristic)'})
    log('track', len(out), 'people tracks')
    return d


# ---------------------------------------------------------------------------------------------------------- space
def cmd_space(pos, o):
    """Free space for type: per shot, average person occupancy + edge busyness on a grid; best rectangle for a box."""
    pack = pos[0]; info = pack_info(pack)
    import cv2
    scenes = jload(os.path.join(pack, 'scenes.json')) or cmd_scenes([pack], {})
    bw, bh = [float(v) for v in o.get('box', '0.6x0.18').split('x')]
    G = (24, max(8, int(24 * info['h'] / info['w'])))
    res = []
    for a, b in scenes['shots']:
        f0, f1 = int(a * info['fps']) + 1, min(info['frames'], int(b * info['fps']))
        occ = np.zeros(G[::-1], np.float32); busy = np.zeros(G[::-1], np.float32); k = 0
        for n in range(f0, f1 + 1, max(1, (f1 - f0) // 12 or 1)):
            m = os.path.join(pack, 'matte', f'f{n:06d}.png')
            if os.path.exists(m): occ = np.maximum(occ, cv2.resize(cv2.imread(m, 0), G, interpolation=cv2.INTER_AREA).astype(np.float32) / 255)
            e = cv2.Canny(cv2.cvtColor(cv2.imread(frame_path(pack, n)), cv2.COLOR_BGR2GRAY), 60, 160)
            busy += cv2.resize(e, G, interpolation=cv2.INTER_AREA).astype(np.float32) / 255; k += 1
        cost = occ * 4 + (busy / max(k, 1)) * 2
        gw, gh = max(1, round(bw * G[0])), max(1, round(bh * G[1]))
        best = None
        for y in range(0, G[1] - gh + 1):
            for x in range(0, G[0] - gw + 1):
                c = float(cost[y:y + gh, x:x + gw].mean()) + 0.15 * abs((x + gw / 2) / G[0] - 0.5)  # prefer centred lines
                if best is None or c < best[0]: best = (c, x, y)
        c, x, y = best
        res.append({'shot': [a, b], 'rect': [round(x / G[0], 3), round(y / G[1], 3), round(gw / G[0], 3), round(gh / G[1], 3)], 'cost': round(c, 3),
                    'occupancyGrid': [[round(float(v), 2) for v in row] for row in occ]})
    d = jsave(os.path.join(pack, 'space.json'), {'grid': list(G), 'box': [bw, bh], 'shots': res})
    log('space', len(res), 'shots')
    return d


# ---------------------------------------------------------------------------------------------------------- reframe
def zero_lag(x, cutoff_frames):
    """Forward-backward exponential smoothing: an offline edit can look ahead, so the camera leads instead of lagging."""
    a = 1.0 / max(1.0, cutoff_frames); y = np.array(x, np.float64)
    for i in range(1, len(y)): y[i] = y[i - 1] + a * (y[i] - y[i - 1])
    for i in range(len(y) - 2, -1, -1): y[i] = y[i + 1] + a * (y[i] - y[i + 1])
    return y

def cmd_reframe(pos, o):
    pack = pos[0]; info = pack_info(pack)
    tracks = jload(os.path.join(pack, 'tracks.json')) or cmd_track([pack], {})
    scenes = jload(os.path.join(pack, 'scenes.json')) or cmd_scenes([pack], {})
    an, ad = [float(v) for v in o.get('aspect', '9:16').split(':')]
    W, H, N, fps = info['w'], info['h'], info['frames'], info['fps']
    cw = min(1.0, (H * an / ad) / W)  # crop width (normalised) at full height
    target, have = np.full(N, 0.5), np.zeros(N, bool)
    for n in range(1, N + 1):
        cands = [p['frames'][str(n)] for p in tracks['people'] if str(n) in p['frames']]
        if not cands: continue
        # subject = the most "present" person: face size + speaking energy; body-only people count less
        pick = max(cands, key=lambda q: (q.get('face', [0, 0, 0, 0.02])[3]) * (1 + q.get('speaking', 0)) + (0.0 if 'face' in q else -0.05))
        target[n - 1] = pick.get('nose', pick['c'])[0]; have[n - 1] = True
    if have.any():  # hold the last subject through gaps instead of drifting to centre
        last = target[np.argmax(have)]
        for i in range(N):
            if have[i]: last = target[i]
            else: target[i] = last
    dead = float(o.get('deadzone', 0.06)); cam = target.copy()
    for i in range(1, N):  # dead zone: ignore small moves (a locked-off look), follow real moves
        cam[i] = cam[i - 1] if abs(target[i] - cam[i - 1]) < dead else target[i] - math.copysign(dead, target[i] - cam[i - 1])
    xs = np.zeros(N); cuts = [0] + [c - 1 for c in scenes['cutFrames']] + [N]
    for a, b in zip(cuts, cuts[1:]): xs[a:b] = zero_lag(cam[a:b], fps * float(o.get('smooth', 0.35)))  # reset at every cut
    xs = np.clip(xs, cw / 2, 1 - cw / 2)
    d = jsave(os.path.join(pack, 'reframe.json'), {'aspect': [an, ad], 'cropW': round(cw, 4), 'cropH': 1.0,
                                                   'cx': [round(float(v), 4) for v in xs], 'subject': [round(float(v), 4) for v in target]})
    log('reframe', f'{an:g}:{ad:g}', 'crop width', round(cw, 3))
    return d


# ---------------------------------------------------------------------------------------------------------- preview
def cmd_preview(pos, o):
    """QA video: matte tint, anchors, free-space box, crop window and the current words — look at it before building on it."""
    pack, out = pos[0], pos[1]; info = pack_info(pack)
    import cv2
    tr, rf, sp, ts = (jload(os.path.join(pack, f)) for f in ('tracks.json', 'reframe.json', 'space.json', 'transcript.json'))
    W, H = info['w'], info['h']
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(info['fps']), '-i', '-',
                           *(['-i', os.path.join(pack, 'audio48k.wav'), '-shortest'] if info.get('audio') else []), '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for n in range(1, info['frames'] + 1):
        img = cv2.imread(frame_path(pack, n)); t = (n - 1) / info['fps']
        m = os.path.join(pack, 'matte', f'f{n:06d}.png')
        if os.path.exists(m):
            a = cv2.resize(cv2.imread(m, 0), (W, H)).astype(np.float32)[..., None] / 255
            img = (img * (1 - 0.35 * a) + np.array([255, 80, 0], np.float32) * 0.35 * a).astype(np.uint8)
        for p in (tr or {}).get('people', []):
            q = p['frames'].get(str(n))
            if not q: continue
            P = lambda v: (int(v[0] * W), int(v[1] * H))
            if 'face' in q: x, y, w, h = q['face']; cv2.rectangle(img, P([x, y]), P([x + w, y + h]), (0, 255, 255), 1)
            for k in ('head', 'mouth', 'torso'):
                if k in q: cv2.circle(img, P(q[k]), 4, (0, 0, 255) if k == 'mouth' else (0, 255, 0), -1)
            cv2.putText(img, f"#{p['id']} spk {q.get('speaking', 0):.1f}", P(q.get('head', q['c'])), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        if rf: cx = rf['cx'][n - 1]; cv2.rectangle(img, (int((cx - rf['cropW'] / 2) * W), 0), (int((cx + rf['cropW'] / 2) * W), H - 1), (255, 255, 255), 2)
        for s in (sp or {}).get('shots', []):
            if s['shot'][0] <= t < s['shot'][1]: x, y, w, h = s['rect']; cv2.rectangle(img, (int(x * W), int(y * H)), (int((x + w) * W), int((y + h) * H)), (0, 200, 0), 1)
        if ts:
            cur = [wd['w'] for wd in ts.get('words', []) if wd['start'] <= t < wd['end']]
            if cur: cv2.putText(img, f'word {len(cur)}', (10, H - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        ff.stdin.write(img.tobytes())
    ff.stdin.close(); ff.wait(); log('preview', out)


def cmd_tts(pos, o):
    import sherpa_onnx, soundfile as sf
    d = os.path.join(MODELS, TTS[0])
    if not os.path.isdir(d): raise SystemExit('missing TTS voice: run `python3 tools/live.py models --tts=1`')
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
        model=f'{d}/ar_JO-kareem-medium.onnx', tokens=f'{d}/tokens.txt', data_dir=f'{d}/espeak-ng-data'), num_threads=os.cpu_count() or 2)))
    lines = [l.strip() for l in open(pos[0], encoding='utf-8') if l.strip()]; gap = float(o.get('gap', 0.7)); sr = 22050
    parts = [np.zeros(int(sr * float(o.get('lead', 0.4))), np.float32)]
    for l in lines:
        a = tts.generate(l, sid=0, speed=float(o.get('speed', 1.0))); sr = a.sample_rate
        parts += [np.array(a.samples, np.float32), np.zeros(int(sr * gap), np.float32)]
    sf.write(pos[1], np.concatenate(parts), sr); log('tts', len(lines), 'lines →', pos[1])


def cmd_all(pos, o):
    src, pack = pos[0], pos[1]
    info = cmd_ingest([src, pack], o)
    if info['audio']:
        cmd_vad([pack], {})
        if o.get('script'): cmd_align([pack], o)
        elif os.path.isdir(os.path.join(MODELS, ASR[o.get('model', 'turbo')])): cmd_transcribe([pack], o)
    cmd_scenes([pack], {}); cmd_matte([pack], o); cmd_track([pack], o); cmd_space([pack], o); cmd_reframe([pack], o)


COMMANDS = {'models': cmd_models, 'ingest': cmd_ingest, 'vad': cmd_vad, 'transcribe': cmd_transcribe, 'align': cmd_align, 'scenes': cmd_scenes,
            'matte': cmd_matte, 'track': cmd_track, 'space': cmd_space, 'reframe': cmd_reframe, 'preview': cmd_preview, 'tts': cmd_tts, 'all': cmd_all}
if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS: print(__doc__); sys.exit(2)
    pos, o = opts(sys.argv[2:]); COMMANDS[sys.argv[1]](pos, o)
