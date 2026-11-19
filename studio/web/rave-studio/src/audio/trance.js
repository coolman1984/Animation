// Built-in trance generator: four original tracks synthesised live with Web Audio (no samples, no files).
// Every track follows one arrangement (intro → build → drop → break → build → drop → outro) so the show
// knows where the drops are in advance. Notes are scheduled ahead on the audio clock (lookahead scheduler).

const ARRANGEMENT = [
  ['intro', 16], ['build', 8], ['drop', 16], ['break', 16], ['build', 8], ['drop', 32], ['outro', 16],
];

// Chords are semitone offsets from the key root (minor keys). i, VI, III, VII and friends.
const I = [0, 3, 7], VI = [-4, 0, 3], III = [3, 7, 10], VII = [-2, 2, 5], IV = [5, 8, 12], V = [7, 10, 14];

export const PRESETS = {
  canyon: { name: 'وادي الصخر', bpm: 140, root: 50, prog: [I, VII, VI, VII], arp: [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 3, 4, 3, 2, 1], acid: 0, bright: 1 },
  warehouse: { name: 'المخزن', bpm: 132, root: 53, prog: [I, VI, IV, V], arp: [0, 0, 2, 0, 1, 0, 3, 0, 0, 2, 0, 1, 0, 3, 2, 1], acid: 1, bright: 0.7 },
  eclipse: { name: 'ليلة الكسوف', bpm: 138, root: 57, prog: [I, VI, III, VII], arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 4, 3, 2, 1, 2], acid: 0, bright: 1.15 },
  cosmic: { name: 'المعبد الكوني', bpm: 136, root: 52, prog: [I, III, VII, VI], arp: [0, 2, 1, 3, 2, 4, 3, 2, 0, 2, 1, 3, 4, 2, 3, 1], acid: 0.4, bright: 0.9 },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

let NOISE = null;
function noiseBuffer(ctx) {
  if (NOISE && NOISE.sampleRate === ctx.sampleRate) return NOISE;
  const len = ctx.sampleRate * 2;
  NOISE = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = NOISE.getChannelData(0);
  let s = 1234567;
  for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  return NOISE;
}

export function impulseResponse(ctx, seconds = 3.2, decay = 2.6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let s = 99 + c * 7;
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const t = i / len;
      d[i] = ((s / 4294967296) * 2 - 1) * Math.pow(1 - t, decay) * (i < 90 ? i / 90 : 1);
    }
  }
  return ir;
}

export class TranceGenerator {
  constructor(ctx, preset, { voices = 5 } = {}) {
    this.ctx = ctx;
    this.p = preset;
    this.voices = voices;
    this.bpm = preset.bpm;
    this.playing = false;
    this.origin = 0; // ctx time of beat 0
    this.pausedBeat = 0;
    this.nextStep = 0;
    this.loop = null; // { start, end } in beats
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.noise = noiseBuffer(ctx);
    // buses
    this.drums = ctx.createGain(); this.drums.gain.value = 0.9; this.drums.connect(this.out);
    this.bassBus = ctx.createGain(); this.bassBus.gain.value = 0.55; this.bassBus.connect(this.out);
    this.leadBus = ctx.createGain(); this.leadBus.gain.value = 0.16; this.leadBus.connect(this.out);
    this.padBus = ctx.createGain(); this.padBus.gain.value = 0.11; this.padBus.connect(this.out);
    this.fxBus = ctx.createGain(); this.fxBus.gain.value = 0.5; this.fxBus.connect(this.out);
    // shared space: dotted-eighth echo + hall
    this.rev = ctx.createConvolver(); this.rev.buffer = impulseResponse(ctx, 3.4, 2.4);
    this.revSend = ctx.createGain(); this.revSend.gain.value = 0.55;
    this.revSend.connect(this.rev); this.rev.connect(this.out);
    this.echo = ctx.createDelay(2); this.echoFb = ctx.createGain(); this.echoFb.gain.value = 0.38;
    this.echoLp = ctx.createBiquadFilter(); this.echoLp.type = 'lowpass'; this.echoLp.frequency.value = 3200;
    this.echoSend = ctx.createGain(); this.echoSend.gain.value = 0.32;
    this.echoSend.connect(this.echo); this.echo.connect(this.echoLp); this.echoLp.connect(this.echoFb); this.echoFb.connect(this.echo);
    this.echoLp.connect(this.out); this.echoLp.connect(this.revSend);
    this.leadBus.connect(this.echoSend); this.leadBus.connect(this.revSend);
    this.padBus.connect(this.revSend); this.fxBus.connect(this.revSend);
    this.setTempoNodes();
    // arrangement in beats
    this.sections = [];
    let b = 0;
    for (const [type, bars] of ARRANGEMENT) { this.sections.push({ type, start: b, end: b + bars * 4 }); b += bars * 4; }
    this.totalBeats = b;
  }

  get spb() { return 60 / this.bpm; }
  setTempoNodes() { this.echo.delayTime.setTargetAtTime(this.spb * 0.75, this.ctx.currentTime, 0.05); }

  beatPos(now = this.ctx.currentTime) { return this.playing ? (now - this.origin) / this.spb : this.pausedBeat; }
  timeOfBeat(beat) { return this.origin + beat * this.spb; }

  sectionAt(beat) {
    const b = ((beat % this.totalBeats) + this.totalBeats) % this.totalBeats;
    for (const s of this.sections) if (b >= s.start && b < s.end) return s;
    return this.sections[0];
  }

  setBpm(bpm) {
    const now = this.ctx.currentTime, beat = this.beatPos(now);
    this.bpm = bpm;
    if (this.playing) this.origin = now - beat * this.spb;
    this.setTempoNodes();
  }

  start(fromBeat = this.pausedBeat) {
    const now = this.ctx.currentTime + 0.04;
    this.origin = now - fromBeat * this.spb;
    this.nextStep = Math.ceil(fromBeat * 4 - 1e-6);
    this.playing = true;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(1, now, 0.01);
  }

  stop() {
    if (!this.playing) return;
    this.pausedBeat = this.beatPos();
    this.playing = false;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(0, now, 0.015);
  }

  // Move the playhead keeping the beat phase (quantised jump, like a CDJ hot cue).
  jumpToBeat(target) {
    if (!this.playing) { this.pausedBeat = target; return; }
    const now = this.ctx.currentTime, beat = this.beatPos(now);
    const frac = beat - Math.floor(beat);
    const tgt = Math.floor(target) + frac;
    this.origin = now - tgt * this.spb;
    this.nextStep = Math.ceil(tgt * 4 - 1e-6);
  }

  // Shift by whole beats (beat jump) or fractions (phase alignment), without stopping.
  shiftBeats(delta) {
    if (!this.playing) { this.pausedBeat = Math.max(0, this.pausedBeat + delta); return; }
    this.origin -= delta * this.spb;
    this.nextStep = Math.ceil(this.beatPos() * 4 + 0.5);
  }

  // lookahead grows when the page is busy (slow frames) so notes are never dropped
  schedule(lookahead = 0.15) {
    if (!this.playing) return;
    const ctx = this.ctx, horizon = ctx.currentTime + lookahead;
    let guard = 0;
    while (guard++ < 64) {
      const stepBeat = this.nextStep / 4;
      if (this.loop && stepBeat >= this.loop.end) {
        const len = this.loop.end - this.loop.start;
        this.origin += len * this.spb;
        this.nextStep -= len * 4;
        continue;
      }
      const t = this.timeOfBeat(stepBeat);
      if (t > horizon) break;
      if (t > ctx.currentTime - 0.12) this.playStep(this.nextStep, Math.max(t, ctx.currentTime));
      this.nextStep++;
    }
  }

  playStep(step, t) {
    const beatAbs = step / 4;
    const sec = this.sectionAt(beatAbs);
    const inSec = (((beatAbs % this.totalBeats) + this.totalBeats) % this.totalBeats) - sec.start; // beats into the section
    const secLen = sec.end - sec.start;
    const bar = Math.floor(inSec / 4), s = step % 16 < 0 ? step % 16 + 16 : step % 16;
    const p = this.p, type = sec.type;
    const barAbs = Math.floor((((beatAbs % this.totalBeats) + this.totalBeats) % this.totalBeats) / 4);
    const chordBars = type === 'break' ? 2 : 1;
    const chord = p.prog[Math.floor(barAbs / chordBars) % p.prog.length];
    const lastBar = bar === secLen / 4 - 1;
    const spb = this.spb;
    const progress = inSec / secLen;

    // drums
    const kickOn = type === 'intro' || type === 'drop' || type === 'outro' || (type === 'build' && bar < secLen / 4 - 2);
    if (kickOn && s % 4 === 0) this.kick(t, 1);
    if (type === 'drop' && inSec === 0) { this.crash(t); this.subDrop(t); }
    if (type === 'break' && inSec === 0) this.crash(t, 0.5);
    const hatsOn = (type === 'intro' && bar >= 4) || type === 'drop' || type === 'outro' || (type === 'build' && !lastBar);
    if (hatsOn && s % 4 === 2) this.hat(t, true, 0.22);
    if (type === 'drop' && s % 4 !== 2) this.hat(t, false, s % 2 ? 0.06 : 0.1);
    const clapOn = type === 'drop' || type === 'outro' || (type === 'build' && bar < secLen / 4 - 2);
    if (clapOn && s % 8 === 4) this.clap(t);
    if (type === 'build') {
      const roll = progress < 0.5 ? 4 : progress < 0.75 ? 2 : 1; // snare every beat, then 8ths, then 16ths
      if (s % roll === 0) this.snare(t, 0.12 + progress * 0.3, 1 + progress * 0.8);
      if (inSec === 0) this.riser(t, secLen * spb);
    }

    // bass: rolling offbeat 16ths
    const bassOn = type === 'drop' || type === 'outro' || (type === 'intro' && bar >= 8) || (type === 'build' && bar < secLen / 4 - 2);
    if (bassOn && s % 4 !== 0) {
      const oct = p.acid > 0.5 && s % 4 === 3 && (s / 4) % 2 ? 12 : 0;
      const cutoff = type === 'intro' ? 300 + progress * 900 : 900 + p.acid * 700 * (0.5 + 0.5 * Math.sin(barAbs * 0.7));
      this.bass(t, p.root - 12 + chord[0] + oct, spb / 4 * 0.9, cutoff);
    }

    // lead arpeggio (supersaw)
    const leadOn = type === 'drop' || (type === 'break' && progress >= 0.5) || type === 'build';
    if (leadOn) {
      const idx = p.arp[s];
      const tones = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12];
      const m = p.root + 12 + tones[idx];
      let cutoff = 5200 * p.bright;
      if (type === 'break') cutoff = 600 + (progress - 0.5) * 2 * 3000;
      if (type === 'build') cutoff = 900 + progress * 4800;
      const vol = type === 'drop' ? 1 : 0.75;
      if (!(type === 'build' && lastBar && s >= 8)) this.lead(t, m, spb / 4 * 0.85, cutoff, vol);
    }

    // pads: whole chord, one per chord change
    const padOn = type === 'break' || (type === 'intro' && bar >= 8) || type === 'drop';
    const chordStart = s === 0 && barAbs % chordBars === 0;
    if (padOn && chordStart) {
      const dur = chordBars * 4 * spb;
      const vol = type === 'break' ? 1 : 0.5;
      this.pad(t, chord.map((c) => p.root + c), dur, type === 'break' ? 1800 : 1200, vol);
    }
  }

  // ------------------------------------------------------------ voices
  env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  noiseSrc(t, dur) {
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    n.start(t, Math.random() * 1.5, dur);
    return n;
  }

  kick(t, vel) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(165, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    g.gain.setValueAtTime(vel, t);
    g.gain.setValueAtTime(vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(this.drums);
    o.start(t); o.stop(t + 0.45);
    const n = this.noiseSrc(t, 0.012), hp = c.createBiquadFilter(), ng = c.createGain();
    hp.type = 'highpass'; hp.frequency.value = 2500; ng.gain.value = 0.18;
    n.connect(hp); hp.connect(ng); ng.connect(this.drums);
  }

  hat(t, open, vol) {
    const c = this.ctx, dur = open ? 0.16 : 0.05;
    const n = this.noiseSrc(t, dur + 0.02), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'highpass'; f.frequency.value = open ? 7500 : 9000;
    this.env(g, t, vol, 0.002, dur);
    n.connect(f); f.connect(g); g.connect(this.drums);
  }

  clap(t) {
    const c = this.ctx, n = this.noiseSrc(t, 0.3), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    for (const d of [0, 0.011, 0.022]) { g.gain.setValueAtTime(0.5, t + d); g.gain.exponentialRampToValueAtTime(0.08, t + d + 0.009); }
    g.gain.setValueAtTime(0.4, t + 0.031);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    n.connect(f); f.connect(g); g.connect(this.drums); g.connect(this.revSend);
  }

  snare(t, vol, pitch) {
    const c = this.ctx, n = this.noiseSrc(t, 0.16), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.frequency.value = 1700 * pitch; f.Q.value = 0.9;
    this.env(g, t, vol, 0.001, 0.12);
    n.connect(f); f.connect(g); g.connect(this.drums); g.connect(this.revSend);
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(210 * pitch, t); o.frequency.exponentialRampToValueAtTime(140 * pitch, t + 0.08);
    this.env(og, t, vol * 0.6, 0.001, 0.09);
    o.connect(og); og.connect(this.drums); o.start(t); o.stop(t + 0.12);
  }

  bass(t, m, dur, cutoff) {
    const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 2 + this.p.acid * 9;
    f.frequency.setValueAtTime(cutoff * 3, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.6), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.7, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g); g.connect(this.bassBus);
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.02);
    }
    const sub = c.createOscillator(), sg = c.createGain();
    sub.type = 'sine'; sub.frequency.value = mtof(m - 12);
    this.env(sg, t, 0.5, 0.004, dur);
    sub.connect(sg); sg.connect(this.bassBus); sub.start(t); sub.stop(t + dur + 0.02);
  }

  lead(t, m, dur, cutoff, vol) {
    const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(Math.min(16000, cutoff * 1.8), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
    f.connect(g); g.connect(this.leadBus);
    const n = this.voices, freq = mtof(m);
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = n > 1 ? (i / (n - 1) - 0.5) * 36 : 0;
      o.connect(f); o.start(t); o.stop(t + dur + 0.08);
    }
  }

  pad(t, notes, dur, cutoff, vol) {
    const c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.8, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    f.connect(g); g.connect(this.padBus);
    for (const m of notes) for (const det of [-12, 0, 12]) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.7);
    }
  }

  riser(t, dur) {
    const c = this.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = this.noise; n.loop = true;
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.97); g.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(f); f.connect(g); g.connect(this.fxBus);
    n.start(t); n.stop(t + dur);
  }

  crash(t, vol = 0.8) {
    const c = this.ctx, n = this.noiseSrc(t, 2.4), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'highpass'; f.frequency.value = 4500;
    this.env(g, t, vol * 0.5, 0.002, 2.2);
    n.connect(f); f.connect(g); g.connect(this.fxBus);
  }

  subDrop(t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.4);
    this.env(g, t, 0.7, 0.005, 1.4);
    o.connect(g); g.connect(this.drums); o.start(t); o.stop(t + 1.5);
  }

  dispose() {
    this.stop();
    try { this.out.disconnect(); } catch { /* already gone */ }
  }
}
