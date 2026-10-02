"""Deep, measurable audio description (librosa + numpy + scipy). It does not "listen"; it measures what a musician would name.

  python3 tools/audio_deep.py AUDIO_OR_VIDEO [--out DIR] [--start s --end s]

Outputs audio-deep.json + audio-deep.md + audio-deep.png (spectrogram, chroma, drum grid, loudness, all on one time axis):
  - tempo, beat grid and a downbeat estimate; bars
  - drums split by band from the percussive layer (HPSS): kick (<150 Hz), snare/clap (mid, noisy), hats (>6 kHz);
    a per-bar 16-step pattern for each and the most common bar pattern
  - key (Krumhansl-Schmuckler on harmonic chroma) and a chord per beat (major/minor/7 templates)
  - melody contour (pYIN on the harmonic layer) as note names with times
  - loudness curve (dB), sections (novelty on a self-similarity matrix), builds/drops, silences
  - sound-effect candidates: transients classified by spectral shape (impact / click / whoosh-like sweep / tonal hit)
  - voice likelihood per section (speech-band energy modulation); no transcript (no speech model is bundled)
Every label is a measured hypothesis with its numbers; musical taste still needs a human ear.
"""
import argparse, json, math, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

def load(path, start=None, end=None, sr=22050):
    import librosa
    src = path
    if Path(path).suffix.lower() in ('.mp4', '.mov', '.mkv', '.webm', '.m4v'):
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), tmp], check=True); src = tmp
    y, sr = librosa.load(src, sr=sr, mono=True, offset=start or 0.0, duration=(end - (start or 0)) if end else None)
    return y, sr

def key_estimate(chroma):
    prof = chroma.mean(axis=1); best = None
    for i in range(12):
        for mode, P in (('major', MAJ), ('minor', MIN)):
            r = np.corrcoef(prof, np.roll(P, i))[0, 1]
            if best is None or r > best[0]: best = (r, f'{NOTES[i]} {mode}')
    return {'key': best[1], 'confidence': round(float(best[0]), 3)}

def chord_templates():
    T = {}
    for i in range(12):
        for name, iv in (('', (0, 4, 7)), ('m', (0, 3, 7)), ('7', (0, 4, 7, 10)), ('m7', (0, 3, 7, 10))):
            v = np.zeros(12); v[[(i + k) % 12 for k in iv]] = 1; T[NOTES[i] + name] = v / np.linalg.norm(v)
    return T

def analyze(path, start=None, end=None):
    import librosa
    y, sr = load(path, start, end)
    dur = len(y) / sr; hop = 512
    yh, yp = librosa.effects.hpss(y)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop)
    bt0 = librosa.frames_to_time(beats, sr=sr, hop_length=hop)
    # Tempo from a straight-line fit through the tracked beats (frame-quantised BPM estimates are ~2 % off), then
    # the grid phase that best lines up with the percussive transients (a kick/clap grid, not the hats).
    period = float(np.polyfit(np.arange(len(bt0)), bt0, 1)[0]) if len(bt0) >= 4 else 60 / float(np.atleast_1d(tempo)[0])
    tempo = 60 / period
    pe = librosa.onset.onset_strength(y=yp, sr=sr, hop_length=hop); ft = librosa.frames_to_time(np.arange(len(pe)), sr=sr, hop_length=hop)
    def grid_score(ph):
        g = np.arange(ph, len(y) / sr, period); idx = np.clip(np.round(g * sr / hop).astype(int), 0, len(pe) - 1); return pe[idx].sum()
    phi = max(np.arange(0, period, 0.005), key=grid_score)
    bt = np.arange(phi, len(y) / sr - 1e-3, period)
    # downbeat: the beat phase (0..3) whose beats carry the most low-band onset energy
    S = np.abs(librosa.stft(yp, n_fft=2048, hop_length=hop)); freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    band = lambda lo, hi: S[(freqs >= lo) & (freqs < hi)].sum(axis=0)
    def onset_env(b):
        d = np.maximum(0, np.diff(np.log1p(b), prepend=np.log1p(b[:1]))); return d / (d.max() + 1e-9)
    kick, snare, hats = onset_env(band(20, 150)), onset_env(band(150, 2500) * librosa.feature.spectral_flatness(S=S + 1e-9)[0] ** 0.5), onset_env(band(6000, 11000))
    fr = lambda t: min(len(kick) - 1, int(round(t * sr / hop)))
    win = lambda env, t: float(env[max(0, fr(t) - 3):fr(t) + 4].max())   # ±70 ms: onsets never land exactly on a frame
    phase = int(np.argmax([sum(win(kick, t) for t in bt[p::4]) for p in range(4)])) if len(bt) >= 8 else 0
    downbeats = bt[phase::4]
    # 16-step patterns per bar (thresholded peaks per band)
    def pattern(env, thr=0.3):
        bars = []
        for a, b in zip(downbeats[:-1], downbeats[1:]):
            steps = []
            for k in range(16):   # bins centred on each step: a hit 30 ms early still belongs to its step
                t0 = a + (b - a) * (k - 0.5) / 16; t1 = a + (b - a) * (k + 0.5) / 16
                seg = env[max(0, fr(t0)):max(fr(t0) + 1, fr(t1))]; steps.append('x' if seg.size and seg.max() > thr else '.')
            bars.append(''.join(steps))
        busy = [b_ for b_ in bars if 'x' in b_]; common = max(set(busy), key=busy.count) if busy else (bars[0] if bars else None)
        return {'bars': bars, 'mostCommon': common}
    drums = {'kick': pattern(kick), 'snareClap': pattern(snare, 0.35), 'hats': pattern(hats, 0.35)}
    # key + chords
    chroma = librosa.feature.chroma_cqt(y=yh, sr=sr, hop_length=hop)
    key = key_estimate(chroma); T = chord_templates(); chords = []
    # Mode hint (useful for Arabic/Egyptian music): relative weight of the flat 2nd and the 3rds above the tonic.
    prof = chroma.mean(axis=1); tonic = NOTES.index(key['key'].split()[0]); rel = lambda k: float(prof[(tonic + k) % 12] / (prof.max() + 1e-9))
    b2, n2, m3, M3 = rel(1), rel(2), rel(3), rel(4)
    key['modeHint'] = ('Hijaz / Phrygian dominant (flat 2nd + major 3rd)' if b2 > n2 and M3 > m3 else 'Phrygian / Kurd (flat 2nd + minor 3rd)' if b2 > n2 else
                       'major-type' if M3 > m3 else 'minor-type')
    key['degreeWeights'] = {'b2': round(b2, 2), '2': round(n2, 2), 'b3': round(m3, 2), '3': round(M3, 2)}
    edges = list(bt) + [dur]
    for a, b in zip(edges[:-1], edges[1:]):
        c = chroma[:, fr(a):max(fr(a) + 1, fr(b))].mean(axis=1)
        if np.linalg.norm(c) < 1e-6: continue
        c = c / np.linalg.norm(c); name, sc = max(((n, float(v @ c)) for n, v in T.items()), key=lambda x: x[1])
        if not chords or chords[-1]['chord'] != name: chords.append({'t': round(float(a), 3), 'chord': name, 'fit': round(sc, 3)})
    # melody (pYIN on harmonic layer)
    f0, vflag, _ = librosa.pyin(yh, fmin=180, fmax=1500, sr=sr, hop_length=hop)
    voiced = float(np.nanmean(vflag.astype(float))) if len(vflag) else 0.0
    mel, cur = [], None
    for i, (f, v) in enumerate(zip(f0, vflag)):
        t = i * hop / sr
        n = librosa.hz_to_note(f) if v and f == f and f > 0 else None
        if n != (cur['note'] if cur else None):
            if cur and cur['note'] and t - cur['t'] >= 0.08: cur['dur'] = round(t - cur['t'], 3); mel.append(cur)
            cur = {'t': round(t, 3), 'note': n}
    # loudness, sections, silences
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]; db = 20 * np.log10(rms + 1e-9); tdb = librosa.frames_to_time(np.arange(len(db)), sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
    try:
        bounds = librosa.segment.agglomerative(np.vstack([mfcc, chroma[:, :mfcc.shape[1]]]), k=max(2, min(8, int(dur // 3))))
        sec = sorted(set([0.0] + [round(float(x), 2) for x in librosa.frames_to_time(bounds, sr=sr, hop_length=hop)] + [round(dur, 2)]))
    except Exception:
        sec = [0.0, round(dur, 2)]
    sections = []
    for a, b in zip(sec[:-1], sec[1:]):
        m = (tdb >= a) & (tdb < b)
        sections.append({'start': a, 'end': b, 'loudnessDb': round(float(db[m].mean()), 1) if m.any() else None,
                         'drumsDensity': round(float((kick[m[:len(kick)]] > 0.3).sum() / max(b - a, 1e-3)), 2) if m.any() else None})
    for i in range(1, len(sections)):
        d = (sections[i]['loudnessDb'] or 0) - (sections[i - 1]['loudnessDb'] or 0)
        sections[i]['change'] = 'drop/lift (+%.1f dB)' % d if d > 3 else ('breakdown (%.1f dB)' % d if d < -3 else 'steady')
    silences = []
    quiet = db < (db.max() - 40); i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j + 1 < len(quiet) and quiet[j + 1]: j += 1
            if tdb[j] - tdb[i] > 0.25: silences.append([round(float(tdb[i]), 2), round(float(tdb[j]), 2)])
            i = j + 1
        else: i += 1
    # SFX-like transients
    on = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop, units='time', backtrack=False)
    cen = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]; flat = librosa.feature.spectral_flatness(y=y, hop_length=hop)[0]
    sfx = []
    for t in on:
        k = fr(t); w = slice(k, min(len(cen), k + int(0.25 * sr / hop)))
        c0, c1 = float(cen[k]), float(cen[w].mean()); f = float(flat[w].mean()); loud = float(db[k:k + 6].max()) if k + 6 <= len(db) else float(db[k])
        if loud < db.max() - 10 or (sfx and t - sfx[-1]['t'] < 0.2): continue
        kind = 'impact (low, broadband)' if c0 < 1200 and f > 0.05 else 'click/tick (short, bright)' if c0 > 4000 and f > 0.1 else 'tonal hit (pitched)' if f < 0.02 else 'noisy hit'
        sweep = float(np.polyfit(np.arange(w.stop - w.start), cen[w], 1)[0]) if w.stop - w.start > 3 else 0
        if f > 0.08 and abs(sweep) > 40: kind = 'whoosh-like sweep (%s)' % ('rising' if sweep > 0 else 'falling')
        sfx.append({'t': round(float(t), 3), 'kind': kind, 'centroidHz': round(c0), 'flatness': round(f, 3), 'peakDb': round(loud, 1)})
    # voice likelihood: 4 Hz modulation of 300-3400 Hz energy
    Sm = np.abs(librosa.stft(y, n_fft=1024, hop_length=256)); fm = librosa.fft_frequencies(sr=sr, n_fft=1024)
    sp = Sm[(fm > 300) & (fm < 3400)].sum(axis=0); fs = sr / 256
    voice = []
    for s in sections:
        seg = sp[int(s['start'] * fs):int(s['end'] * fs)]
        if len(seg) < fs: continue
        x = seg - seg.mean(); P = np.abs(np.fft.rfft(x)); fq = np.fft.rfftfreq(len(x), 1 / fs)
        r = float(P[(fq > 3) & (fq < 6)].sum() / (P[(fq > 0.5) & (fq < 20)].sum() + 1e-9))
        voice.append({'start': s['start'], 'end': s['end'], 'syllableModulation': round(r, 3), 'likelyVoice': r > 0.32})
    return {'duration': round(dur, 3), 'tempoBpm': round(tempo, 2), 'beats': [round(float(t), 3) for t in bt], 'downbeats': [round(float(t), 3) for t in downbeats],
            'barSeconds': round(float(np.median(np.diff(downbeats))), 3) if len(downbeats) > 1 else None, 'drums': drums, 'key': key, 'chords': chords,
            'melody': mel[:120] if voiced >= 0.3 else [], 'melodyVoicedShare': round(voiced, 2), 'sections': sections, 'silences': silences, 'sfxCandidates': sfx[:80], 'voice': voice,
            'loudnessCurve': [[round(float(a), 2), round(float(b), 1)] for a, b in zip(tdb[::8], db[::8])],
            '_plot': {'S': S, 'chroma': chroma, 'kick': kick, 'snare': snare, 'hats': hats, 'db': db, 'sr': sr, 'hop': hop}}

def plot(res, out):
    import cv2
    P = res['_plot']; S, chroma, sr, hop = P['S'], P['chroma'], P['sr'], P['hop']; W = 1400
    spec = np.log1p(S[:400]); spec = (255 * spec / (spec.max() + 1e-9)).astype(np.uint8)[::-1]
    spec = cv2.applyColorMap(cv2.resize(spec, (W, 260)), cv2.COLORMAP_MAGMA)
    ch = (255 * chroma / (chroma.max() + 1e-9)).astype(np.uint8)[::-1]; ch = cv2.applyColorMap(cv2.resize(ch, (W, 120), interpolation=cv2.INTER_NEAREST), cv2.COLORMAP_VIRIDIS)
    lanes = np.full((150, W, 3), 22, np.uint8)
    for row, (name, env, col) in enumerate((('kick', P['kick'], (90, 160, 255)), ('snare/clap', P['snare'], (120, 230, 120)), ('hats', P['hats'], (230, 200, 90)))):
        y0 = 10 + row * 46
        xs = np.linspace(0, W - 1, len(env)).astype(int)
        for x, v in zip(xs, env):
            if v > 0.3: cv2.line(lanes, (int(x), y0 + 36), (int(x), int(y0 + 36 - 32 * v)), col, 1)
        cv2.putText(lanes, name, (6, y0 + 12), 0, 0.42, col, 1)
    loud = np.full((110, W, 3), 22, np.uint8); db = P['db']; d0, d1 = db.max() - 50, db.max()
    pts = np.array([[int(i * (W - 1) / (len(db) - 1)), int(100 - 90 * (np.clip(v, d0, d1) - d0) / (d1 - d0))] for i, v in enumerate(db)], np.int32)
    cv2.polylines(loud, [pts], False, (240, 240, 240), 1); cv2.putText(loud, 'loudness dB', (6, 14), 0, 0.42, (200, 200, 200), 1)
    img = np.vstack([spec, ch, lanes, loud]); dur = res['duration']
    for t in res['downbeats']: x = int(t / dur * (W - 1)); cv2.line(img, (x, 0), (x, img.shape[0]), (255, 255, 255), 1)
    for s in res['sections']: x = int(s['start'] / dur * (W - 1)); cv2.line(img, (x, 0), (x, img.shape[0]), (60, 60, 255), 2)
    for k in range(int(dur) + 1):
        x = int(k / dur * (W - 1)); cv2.putText(img, f'{k}s', (x + 2, img.shape[0] - 4), 0, 0.38, (200, 200, 200), 1)
    cv2.putText(img, f"tempo {res['tempoBpm']} BPM  key {res['key']['key']}  (white = downbeats, red = sections)", (8, 18), 0, 0.5, (255, 255, 255), 1)
    cv2.imwrite(str(out), img)

def markdown(r):
    d = r['drums']
    lines = [f"# Audio description (measured)", f"- Duration {r['duration']} s · tempo **{r['tempoBpm']} BPM** · bar ≈ {r['barSeconds']} s · key **{r['key']['key']}** (confidence {r['key']['confidence']}) · mode hint: {r['key'].get('modeHint')}",
             f"- Most common bar pattern (16 steps): kick `{d['kick']['mostCommon']}` · snare/clap `{d['snareClap']['mostCommon']}` · hats `{d['hats']['mostCommon']}`",
             f"- Chords: " + ' → '.join(f"{c['chord']}@{c['t']}" for c in r['chords'][:24]),
             f"- Melody (first notes): " + (' '.join(f"{m['note']}" for m in r['melody'][:24]) or f"no clear lead line (voiced share {r['melodyVoicedShare']})"),
             f"- Sections: " + ' | '.join(f"{s['start']}–{s['end']} s {s['loudnessDb']} dB {s.get('change', '')}" for s in r['sections']),
             f"- Silences: {r['silences'] or 'none'}",
             f"- SFX candidates: " + '; '.join(f"{s['t']} s {s['kind']}" for s in r['sfxCandidates'][:20]),
             f"- Voice likely in: " + (', '.join(f"{v['start']}–{v['end']} s" for v in r['voice'] if v['likelyVoice']) or 'no section'),
             "Hypotheses from measurement, not listening. No speech transcript (no speech model available offline)."]
    return '\n'.join(lines) + '\n'

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('media'); ap.add_argument('--out', default='.'); ap.add_argument('--start', type=float); ap.add_argument('--end', type=float)
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    try:
        import librosa  # noqa
    except Exception as e:
        print(json.dumps({'unavailable': f'librosa missing: {e}'})); return
    r = analyze(a.media, a.start, a.end)
    try: plot(r, out / 'audio-deep.png')
    except Exception as e: r['plotError'] = str(e)[:200]
    r.pop('_plot', None)
    (out / 'audio-deep.json').write_text(json.dumps(r, indent=1)); (out / 'audio-deep.md').write_text(markdown(r))
    print(json.dumps({k: v for k, v in r.items() if k not in ('beats', 'loudnessCurve', 'melody', 'sfxCandidates')}))

if __name__ == '__main__':
    main()
