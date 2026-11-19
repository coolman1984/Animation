// Offline analysis of a loaded track: colour waveform (low / mid / high per 10 ms), tempo, beat grid
// and a section map (break / build / drop / main) found from the bass energy per bar.
// Runs once per file in plain JS; a 7-minute track takes a fraction of a second on a laptop.

export function analyzeBuffer(buf) {
  const sr = buf.sampleRate;
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const hop = Math.round(sr / 100); // 100 bins per second
  const bins = Math.ceil(L.length / hop);
  const amp = new Float32Array(bins), low = new Float32Array(bins), mid = new Float32Array(bins), high = new Float32Array(bins);
  const aLow = Math.exp((-2 * Math.PI * 180) / sr), aMid = Math.exp((-2 * Math.PI * 2400) / sr);
  let sLow = 0, sMid = 0;
  for (let b = 0; b < bins; b++) {
    const i0 = b * hop, i1 = Math.min(L.length, i0 + hop);
    let pk = 0, el = 0, em = 0, eh = 0;
    for (let i = i0; i < i1; i++) {
      const x = (L[i] + R[i]) * 0.5;
      sLow = sLow * aLow + x * (1 - aLow);
      sMid = sMid * aMid + x * (1 - aMid);
      const ax = x < 0 ? -x : x;
      if (ax > pk) pk = ax;
      el += sLow * sLow;
      const m = sMid - sLow; em += m * m;
      const h = x - sMid; eh += h * h;
    }
    const n = Math.max(1, i1 - i0);
    amp[b] = pk; low[b] = Math.sqrt(el / n); mid[b] = Math.sqrt(em / n); high[b] = Math.sqrt(eh / n);
  }
  // normalise each band to its 98th percentile so the colours read on quiet and loud masters alike
  for (const arr of [low, mid, high, amp]) {
    const ref = percentile(arr, 0.98) || 1;
    for (let i = 0; i < arr.length; i++) arr[i] = Math.min(1.2, arr[i] / ref);
  }

  // onset envelope from low + mid energy (log difference, half-wave rectified)
  const onset = new Float32Array(bins);
  let prev = 0;
  for (let b = 0; b < bins; b++) {
    const e = Math.log(1e-4 + low[b] * 1.6 + mid[b] * 0.6);
    onset[b] = Math.max(0, e - prev);
    prev = e;
  }
  const { bpm, firstBeat } = tempo(onset, 100);
  const sections = sectionsFrom(low, bpm, firstBeat, buf.duration);
  return { peaks: { amp, low, mid, high, rate: 100 }, bpm, firstBeat, sections };
}

function percentile(arr, p) {
  const step = Math.max(1, Math.floor(arr.length / 4000));
  const s = [];
  for (let i = 0; i < arr.length; i += step) s.push(arr[i]);
  s.sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * p)];
}

function tempo(env, fps) {
  // coarse autocorrelation over 90–180 BPM, then a comb fit that also finds the phase
  const n = env.length;
  if (n < fps * 8) return { bpm: 128, firstBeat: 0 };
  let best = 0, bestLag = 0;
  const minLag = Math.floor((fps * 60) / 180), maxLag = Math.ceil((fps * 60) / 88);
  const ac = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i += 2) s += env[i] * env[i + lag];
    ac[lag] = s;
    // gentle preference for club tempos (118–150)
    const b = (fps * 60) / lag;
    const w = b >= 118 && b <= 150 ? 1.08 : 1;
    if (s * w > best) { best = s * w; bestLag = lag; }
  }
  let coarse = (fps * 60) / bestLag;
  if (coarse < 100) coarse *= 2;
  let top = { score: -1, bpm: coarse, phase: 0 };
  for (let b = coarse - 1.5; b <= coarse + 1.5; b += 0.02) {
    const fpb = (fps * 60) / b;
    for (let ph = 0; ph < fpb; ph += 1) {
      let s = 0;
      for (let k = ph; k < n; k += fpb) s += env[Math.round(k)] || 0;
      if (s > top.score) top = { score: s, bpm: b, phase: ph };
    }
  }
  const bpm = Math.round(top.bpm * 100) / 100;
  return { bpm, firstBeat: top.phase / fps };
}

function sectionsFrom(low, bpm, firstBeat, duration) {
  const spb = 60 / bpm;
  const bars = Math.floor((duration - firstBeat) / (spb * 4));
  if (bars < 8) return [{ type: 'main', start: 0, end: Math.max(4, bars * 4) }];
  const e = new Float32Array(bars);
  for (let b = 0; b < bars; b++) {
    const t0 = firstBeat + b * 4 * spb, t1 = t0 + 4 * spb;
    let s = 0, c = 0;
    for (let i = Math.floor(t0 * 100); i < Math.floor(t1 * 100) && i < low.length; i++) { s += low[i]; c++; }
    e[b] = c ? s / c : 0;
  }
  const med = percentile(e, 0.6) || 1;
  const quiet = Array.from(e, (v) => v < med * 0.5);
  const out = [];
  let b = 0;
  const push = (type, s, en) => { if (en > s) out.push({ type, start: s * 4, end: en * 4 }); };
  let afterLow = false;
  while (b < bars) {
    if (quiet[b]) {
      let j = b;
      while (j < bars && quiet[j]) j++;
      const len = j - b;
      if (len >= 4) {
        const build = Math.min(8, Math.floor(len / 2));
        push('break', b, j - build);
        push('build', j - build, j);
        afterLow = j < bars;
      } else push('main', b, j);
      b = j;
    } else {
      let j = b;
      while (j < bars && !quiet[j]) j++;
      if (afterLow) {
        const d = Math.min(j, b + 16);
        push('drop', b, d);
        push('main', d, j);
        afterLow = false;
      } else push('main', b, j);
      b = j;
    }
  }
  return out;
}
