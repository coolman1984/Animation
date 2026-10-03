#!/usr/bin/env python3
"""Measure a music track for editing decisions (optional studio layer).

Requires numpy + librosa (+ soundfile, pulled in by librosa). Writes the RAW measurements of a
"music map" (schema version 1): tempo, beats, downbeats (heuristic), onsets, sections and
~20 Hz curves (energy, onset strength, brightness, low-end). Editorial events (quiet holds,
builds, peaks, drops, phrase candidates, transient density) are derived in Node by
lib/musicmap.mjs so both analyzers share one set of rules. Use:

    python3 tools/music_analysis.py track.wav -o track.musicmap.json [--bpm-hint 96] [--beats-per-bar 4]

The output is evidence for the editor, never an instruction to cut on every beat.
"""
import argparse
import json
import sys
import time
import sys as _sys; [s.reconfigure(encoding='utf-8') for s in (_sys.stdout, _sys.stderr)]  # Windows pipes default to cp1252; Arabic/≈ output crashed


def _norm(x, np):
    lo, hi = np.percentile(x, 5), np.percentile(x, 95)
    if hi - lo < 1e-9:
        return np.zeros_like(x)
    return np.clip((x - lo) / (hi - lo), 0.0, 1.0)


def _resample_curve(values, src_hop, dst_hop, duration, np):
    n = max(1, int(round(duration / dst_hop)))
    t_dst = np.arange(n) * dst_hop
    t_src = np.arange(len(values)) * src_hop
    return np.interp(t_dst, t_src, values).round(4).tolist()


def analyze(path, bpm_hint=None, beats_per_bar=4, curve_hop=0.05):
    import numpy as np
    import librosa

    started = time.time()
    y, sr = librosa.load(path, sr=22050, mono=True)
    duration = float(len(y) / sr)
    if duration < 1.0:
        raise ValueError("track shorter than 1 s")
    hop = 256  # ~12 ms frames: beat/onset times typically within ±30 ms of the perceived attack
    hop_s = hop / sr
    notes = []

    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    kwargs = {"start_bpm": float(bpm_hint)} if bpm_hint else {}
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop, **kwargs)
    bpm = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    if len(beats) >= 8:
        # The tracker's tempo is quantized to frames; the slope of beat time vs index is finer.
        slope = float(np.polyfit(np.arange(len(beats)), beats, 1)[0])
        if 0.2 < slope < 2.0:
            bpm = 60.0 / slope

    # Confidence: regularity of inter-beat intervals x how much beats coincide with onset energy.
    conf = 0.0
    if len(beats) >= 4:
        ibi = np.diff(beats)
        regularity = float(np.clip(1.0 - np.std(ibi) / max(np.mean(ibi), 1e-6) * 4.0, 0.0, 1.0))
        on_n = onset_env / (onset_env.max() + 1e-9)
        salience = float(np.clip(on_n[beat_frames].mean() / (on_n.mean() + 1e-9) / 3.0, 0.0, 1.0))
        conf = round(regularity * 0.5 + salience * 0.5, 3)
    else:
        notes.append("fewer than 4 beats detected: tempo/beat grid unreliable")

    # Downbeats (heuristic): the bar phase whose beats carry the most low-frequency attack plus
    # harmonic change. librosa has no downbeat model; confidence = margin over the runner-up phase.
    S_low = librosa.feature.melspectrogram(y=y, sr=sr, hop_length=hop, n_mels=24, fmax=250)
    low_env = librosa.onset.onset_strength(S=librosa.power_to_db(S_low), sr=sr, hop_length=hop)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop)
    chroma_change = np.concatenate([[0.0], np.linalg.norm(np.diff(chroma, axis=1), axis=0)])
    downbeats, db_conf = [], 0.0
    if len(beat_frames) >= beats_per_bar * 2:
        lo_n = low_env / (low_env.max() + 1e-9)
        ch_n = chroma_change / (chroma_change.max() + 1e-9)
        scores = []
        for k in range(beats_per_bar):
            idx = beat_frames[k::beats_per_bar]
            idx = idx[idx < len(lo_n)]
            scores.append(float(lo_n[idx].mean() * 0.7 + ch_n[idx].mean() * 0.3))
        order = np.argsort(scores)[::-1]
        best = int(order[0])
        db_conf = round(float((scores[order[0]] - scores[order[1]]) / (scores[order[0]] + 1e-9)), 3)
        downbeats = beats[best::beats_per_bar].round(4).tolist()
        if db_conf < 0.1:
            notes.append("downbeat phase ambiguous (confidence < 0.1): confirm bar 1 by listening")
    else:
        notes.append("too few beats to estimate downbeats")

    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=hop, units="time", backtrack=False)

    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    energy = _norm(librosa.amplitude_to_db(rms + 1e-9), np)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
    brightness = _norm(centroid, np)
    low = _norm(librosa.power_to_db(S_low.sum(axis=0) + 1e-12), np)
    onset_n = _norm(onset_env, np)

    # Sections: agglomerative clustering of beat-synchronous timbre+harmony, about one per 8-15 s.
    sections = []
    try:
        mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
        feats = np.vstack([librosa.util.normalize(mfcc, axis=1), chroma])
        if len(beat_frames) > 8:
            sync = librosa.util.sync(feats, beat_frames, aggregate=np.median)
            frames_for_bounds = np.concatenate([[0], beat_frames])
        else:
            sync, frames_for_bounds = feats, np.arange(feats.shape[1])
        k = int(np.clip(round(duration / 10.0), 2, 8))
        k = min(k, sync.shape[1] - 1) if sync.shape[1] > 2 else 1
        if k >= 2:
            bounds = librosa.segment.agglomerative(sync, k)
            times = librosa.frames_to_time(frames_for_bounds[np.clip(bounds, 0, len(frames_for_bounds) - 1)], sr=sr, hop_length=hop)
            times = sorted(set([0.0] + [float(t) for t in times if 0.5 < t < duration - 0.5] + [duration]))
            for i in range(len(times) - 1):
                a, b = times[i], times[i + 1]
                fa, fb = int(a / hop_s), max(int(a / hop_s) + 1, int(b / hop_s))
                sections.append({"start": round(a, 3), "end": round(b, 3), "label": f"S{i + 1}",
                                 "energy": round(float(energy[fa:fb].mean()), 3)})
    except Exception as exc:  # sections are optional evidence
        notes.append(f"section analysis failed: {exc}")
    if not sections:
        sections = [{"start": 0.0, "end": round(duration, 3), "label": "S1", "energy": round(float(energy.mean()), 3)}]

    return {
        "version": 1,
        "source": path,
        "analyzer": f"librosa {librosa.__version__}",
        "duration": round(duration, 4),
        "sampleRate": sr,
        "beatsPerBar": beats_per_bar,
        "tempo": {"bpm": round(bpm, 2), "confidence": conf},
        "beats": beats.round(4).tolist(),
        "downbeats": downbeats,
        "downbeatConfidence": db_conf,
        "downbeatMethod": "heuristic: low-frequency attack + harmonic change per bar phase",
        "onsets": [round(float(t), 4) for t in onsets],
        "sections": sections,
        "curves": {
            "hop": curve_hop,
            "energy": _resample_curve(energy, hop_s, curve_hop, duration, np),
            "onset": _resample_curve(onset_n, hop_s, curve_hop, duration, np),
            "brightness": _resample_curve(brightness, hop_s, curve_hop, duration, np),
            "low": _resample_curve(low, hop_s, curve_hop, duration, np),
        },
        "notes": notes,
        "analysisSeconds": round(time.time() - started, 2),
    }


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("input")
    p.add_argument("-o", "--output", required=True)
    p.add_argument("--bpm-hint", type=float, default=None)
    p.add_argument("--beats-per-bar", type=int, default=4)
    a = p.parse_args(argv)
    try:
        result = analyze(a.input, a.bpm_hint, a.beats_per_bar)
    except ImportError as exc:
        print(f"music_analysis: missing Python dependency ({exc}). pip install numpy librosa soundfile", file=sys.stderr)
        return 3
    with open(a.output, "w", encoding="utf-8") as f:
        json.dump(result, f)
    print(json.dumps({"output": a.output, "bpm": result["tempo"]["bpm"], "beats": len(result["beats"]),
                      "sections": len(result["sections"]), "seconds": result["analysisSeconds"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
