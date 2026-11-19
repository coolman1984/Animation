// Live analysis of the master output for the visuals: six bands with auto-gain, punch envelopes,
// a 128-bin log spectrum (uploaded as a texture) and kick onsets with a tempo estimate (used for line-in).

const BANDS = { sub: [20, 60], kick: [60, 130], bass: [130, 320], mid: [320, 2200], high: [2200, 7000], air: [7000, 16000] };

export class Analysis {
  constructor(analyser) {
    this.an = analyser;
    this.freq = new Uint8Array(analyser.frequencyBinCount);
    this.wave = new Float32Array(analyser.fftSize);
    this.sr = analyser.context.sampleRate;
    this.ranges = {};
    const hz = this.sr / analyser.fftSize;
    for (const [k, [a, b]] of Object.entries(BANDS)) this.ranges[k] = [Math.max(1, Math.floor(a / hz)), Math.max(2, Math.ceil(b / hz))];
    this.v = Object.fromEntries(Object.keys(BANDS).map((k) => [k, 0]));
    this.punch = Object.fromEntries(Object.keys(BANDS).map((k) => [k, 0]));
    this.ref = Object.fromEntries(Object.keys(BANDS).map((k) => [k, 0.35]));
    this.level = 0;
    this.spectrum = new Uint8Array(128);
    this.specIdx = [];
    for (let i = 0; i <= 128; i++) this.specIdx.push(Math.min(this.freq.length - 1, Math.round((30 * Math.pow(16000 / 30, i / 128)) / hz)));
    this.prevKick = 0;
    this.flux = [];
    this.onsets = [];
    this.lastOnset = 0;
    this.onset = false;
  }

  update(dt, now) {
    const an = this.an;
    an.getByteFrequencyData(this.freq);
    an.getFloatTimeDomainData(this.wave);
    let rms = 0;
    for (let i = 0; i < this.wave.length; i += 2) rms += this.wave[i] * this.wave[i];
    rms = Math.sqrt(rms / (this.wave.length / 2));
    this.level += (rms - this.level) * Math.min(1, dt * 12);
    const f = this.freq;
    for (const k in this.ranges) {
      const [a, b] = this.ranges[k];
      let s = 0;
      for (let i = a; i < b; i++) s += f[i];
      let x = s / (b - a) / 255;
      x = x * x; // the analyser is already in dB: square to restore contrast
      this.ref[k] = Math.max(x, this.ref[k] * Math.pow(0.86, dt), 0.06);
      const n = Math.min(1.2, x / this.ref[k]);
      const atk = n > this.v[k] ? 0.6 : 0.12;
      this.v[k] += (n - this.v[k]) * Math.min(1, atk * dt * 60);
      this.punch[k] = Math.max(n, this.punch[k] - dt * 3.2);
    }
    for (let i = 0; i < 128; i++) {
      let m = 0;
      for (let j = this.specIdx[i]; j <= this.specIdx[i + 1]; j++) if (f[j] > m) m = f[j];
      this.spectrum[i] = m;
    }
    // kick onset: positive flux over an adaptive threshold
    const kick = this.v.kick + this.v.sub * 0.5;
    const flux = Math.max(0, kick - this.prevKick);
    this.prevKick = kick;
    this.flux.push(flux);
    if (this.flux.length > 43) this.flux.shift();
    const mean = this.flux.reduce((a, b) => a + b, 0) / this.flux.length;
    const sd = Math.sqrt(this.flux.reduce((a, b) => a + (b - mean) * (b - mean), 0) / this.flux.length);
    this.onset = flux > mean + sd * 1.6 && flux > 0.08 && now - this.lastOnset > 0.28;
    if (this.onset) {
      this.lastOnset = now;
      this.onsets.push(now);
      if (this.onsets.length > 24) this.onsets.shift();
    }
  }

  // tempo + phase from recent kick onsets (median interval), for sources without a beat grid
  estimate(now) {
    const o = this.onsets;
    if (o.length < 6 || now - o[o.length - 1] > 2.5) return null;
    const iv = [];
    for (let i = 1; i < o.length; i++) iv.push(o[i] - o[i - 1]);
    iv.sort((a, b) => a - b);
    let beat = iv[Math.floor(iv.length / 2)];
    while (beat > 0.6) beat /= 2;
    while (beat < 0.3) beat *= 2;
    return { bpm: 60 / beat, last: o[o.length - 1] };
  }
}
