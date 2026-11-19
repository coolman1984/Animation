// One DJ deck: a source (a decoded file or a built-in generator) and its channel strip
// (trim → 3-band EQ with kill → colour filter → channel fader → crossfader gain → master bus).
import { analyzeBuffer } from './analyze-file.js';
import { PRESETS, TranceGenerator } from './trance.js';

const dbGain = (db) => Math.pow(10, db / 20);
// EQ knob 0..1: 0 = kill (−40 dB), 0.5 = flat, 1 = +6 dB
export const eqDb = (v) => (v <= 0.5 ? (v <= 0.02 ? -40 : -26 * (1 - v / 0.5)) : (v - 0.5) * 12);

export class Deck {
  constructor(engine, index) {
    this.engine = engine;
    this.index = index;
    const ctx = (this.ctx = engine.ctx);
    this.input = ctx.createGain();
    this.trim = ctx.createGain();
    this.low = ctx.createBiquadFilter(); this.low.type = 'lowshelf'; this.low.frequency.value = 220;
    this.mid = ctx.createBiquadFilter(); this.mid.type = 'peaking'; this.mid.frequency.value = 1100; this.mid.Q.value = 0.7;
    this.high = ctx.createBiquadFilter(); this.high.type = 'highshelf'; this.high.frequency.value = 3600;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 22000; this.lp.Q.value = 0.9;
    this.hp = ctx.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 10; this.hp.Q.value = 0.9;
    this.fader = ctx.createGain();
    this.xfGain = ctx.createGain();
    this.meter = ctx.createAnalyser(); this.meter.fftSize = 512;
    this.input.connect(this.trim); this.trim.connect(this.low); this.low.connect(this.mid); this.mid.connect(this.high);
    this.high.connect(this.lp); this.lp.connect(this.hp); this.hp.connect(this.fader); this.fader.connect(this.xfGain);
    this.xfGain.connect(engine.bus);
    this.fader.connect(this.meter);
    this.meterBuf = new Float32Array(this.meter.fftSize);
    this.level = 0;
    this.kind = null;
    this.title = '';
    this.baseBpm = 128;
    this.rate = 1;
    this.range = 0.08;
    this.bend = 0;
    this.playing = false;
    this.pos = 0; // seconds (file) or beats (generator) while paused
    this.cue = 0;
    this.hot = [null, null, null, null];
    this.loopBeats = 4;
    this.loop = null; // { start, end } in beats
    this.sections = [];
    this.sectionIdx = -1;
    this.knobs = { trim: 0.5, high: 0.5, mid: 0.5, low: 0.5, filter: 0.5, fader: 0.85 };
    for (const k of Object.keys(this.knobs)) this.setKnob(k, this.knobs[k]);
  }

  emit(ev, ...a) { this.engine.emit(ev, this, ...a); }

  // ------------------------------------------------------------ loading
  async loadFile(file) {
    this.pause();
    this.disposeGen();
    this.emit('loading', file.name);
    const data = await file.arrayBuffer();
    const buf = await this.ctx.decodeAudioData(data);
    await new Promise((r) => setTimeout(r, 0));
    const info = analyzeBuffer(buf);
    this.kind = 'file';
    this.buffer = buf;
    this.title = file.name.replace(/\.[^.]+$/, '');
    this.baseBpm = info.bpm;
    this.firstBeat = info.firstBeat;
    this.peaks = info.peaks;
    this.sections = info.sections;
    this.duration = buf.duration;
    this.rate = 1; this.bend = 0;
    this.pos = 0; this.cue = info.firstBeat;
    this.hot = [null, null, null, null];
    this.loop = null; this.sectionIdx = -1;
    this.emit('load');
  }

  loadGenerator(key) {
    this.pause();
    this.disposeGen();
    const p = PRESETS[key];
    this.genKey = key;
    this.gen = new TranceGenerator(this.ctx, p, { voices: this.engine.lite ? 3 : 5 });
    this.gen.out.connect(this.input);
    this.kind = 'gen';
    this.buffer = null; this.peaks = null;
    this.title = p.name;
    this.baseBpm = p.bpm;
    this.firstBeat = 0;
    this.sections = this.gen.sections;
    this.duration = (this.gen.totalBeats * 60) / p.bpm;
    this.rate = 1; this.bend = 0;
    this.pos = 0; this.cue = 0;
    // hot cues on the generator jump to its sections
    this.hot = [0, this.gen.sections[2].start, this.gen.sections[3].start, this.gen.sections[5].start];
    this.loop = null; this.sectionIdx = -1;
    this.emit('load');
  }

  disposeGen() { if (this.gen) { this.gen.dispose(); this.gen = null; } }

  // ------------------------------------------------------------ clock
  get loaded() { return !!this.kind; }
  get effRate() { return this.rate * (1 + this.bend); }
  bpm() { return this.baseBpm * this.effRate; }
  spb() { return 60 / this.bpm(); }

  // file position in seconds (generator: beats converted at the base tempo)
  filePos(now = this.ctx.currentTime) {
    if (!this.playing) return this.pos;
    let p = this.startPos + (now - this.startCtx) * this.effRate;
    if (this.loop && this.loopSec && p >= this.loopSec.end) {
      const len = this.loopSec.end - this.loopSec.start;
      p = this.loopSec.start + ((p - this.loopSec.start) % len);
    }
    return Math.min(p, this.duration);
  }

  beat(now = this.ctx.currentTime) {
    if (this.kind === 'gen') return this.gen.beatPos(now);
    if (this.kind === 'file') return (this.filePos(now) - this.firstBeat) / (60 / this.baseBpm);
    return 0;
  }

  // seconds elapsed in the track (for the clock read-out and progress)
  time() {
    if (this.kind === 'gen') { const b = this.beat(); return ((((b % this.gen.totalBeats) + this.gen.totalBeats) % this.gen.totalBeats) * 60) / this.baseBpm; }
    return this.filePos();
  }

  progress() { return this.duration ? this.time() / this.duration : 0; }

  // audio-clock time at which a given beat sounds (used by the trance gate and sync)
  timeOfBeat(beat) {
    if (this.kind === 'gen') return this.gen.timeOfBeat(beat);
    const fileSec = this.firstBeat + beat * (60 / this.baseBpm);
    return this.startCtx + (fileSec - this.startPos) / this.effRate;
  }

  sectionAt(beat) {
    if (this.kind === 'gen') return this.gen.sectionAt(beat);
    for (const s of this.sections) if (beat >= s.start && beat < s.end) return s;
    return null;
  }

  // ------------------------------------------------------------ transport
  play() {
    if (!this.loaded || this.playing) return;
    if (this.kind === 'gen') { this.gen.loop = this.loop; this.gen.start(this.pos); this.playing = true; }
    else this.startSource(this.pos);
    this.emit('transport');
  }

  pause() {
    if (!this.playing) return;
    if (this.kind === 'gen') { this.pos = this.gen.beatPos(); this.gen.stop(); }
    else { this.pos = this.filePos(); this.stopSource(); }
    this.playing = false;
    this.emit('transport');
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  startSource(at) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = this.effRate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.006);
    src.connect(g); g.connect(this.input);
    this.applyLoopToSource(src);
    src.start(ctx.currentTime, Math.max(0, Math.min(at, this.duration - 0.01)));
    src.onended = () => { if (this.src === src && this.playing && !src.loop) { this.playing = false; this.pos = this.duration; this.emit('transport'); this.emit('ended'); } };
    this.src = src; this.srcGain = g;
    this.startCtx = ctx.currentTime; this.startPos = at;
    this.playing = true;
  }

  stopSource() {
    const src = this.src, g = this.srcGain;
    if (!src) return;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.006);
    try { src.stop(t + 0.01); } catch { /* not started */ }
    this.src = null;
  }

  seek(seconds) {
    if (!this.loaded) return;
    if (this.kind === 'gen') { this.seekBeat((seconds * this.baseBpm) / 60); return; }
    const s = Math.max(0, Math.min(seconds, this.duration - 0.05));
    if (this.playing) { this.stopSource(); this.startSource(s); } else this.pos = s;
    this.emit('seek');
  }

  seekBeat(beat) {
    if (this.kind === 'gen') { if (this.playing) this.gen.jumpToBeat(beat); else this.pos = beat; this.emit('seek'); return; }
    this.seek(this.firstBeat + beat * (60 / this.baseBpm));
  }

  // CDJ cue: paused → set cue here (snapped to the grid); playing → return to cue and stop.
  cuePress() {
    if (!this.loaded) return;
    if (this.playing) { this.pause(); this.seekBeat(this.cue); }
    else { this.cue = Math.round(this.beat()); this.seekBeat(this.cue); }
    this.emit('cue');
  }

  hotCue(i, clear = false) {
    if (!this.loaded) return;
    if (clear) { this.hot[i] = null; this.emit('cue'); return; }
    if (this.hot[i] == null) { this.hot[i] = Math.round(this.beat()); this.emit('cue'); return; }
    this.seekBeat(this.hot[i]);
    if (!this.playing) this.play();
  }

  beatJump(beats) { if (this.loaded) this.seekBeat(this.beat() + beats); }

  // ------------------------------------------------------------ loops (in beats, quantised)
  setLoop(beats) {
    if (!this.loaded) return;
    if (this.loop && beats === this.loopBeats) { this.exitLoop(); return; }
    this.loopBeats = beats;
    const start = Math.floor(this.beat() * 4) / 4;
    this.loop = { start, end: start + beats };
    this.syncLoop();
  }

  resizeLoop(f) {
    const nb = Math.min(32, Math.max(0.25, this.loopBeats * f));
    this.loopBeats = nb;
    if (this.loop) { this.loop.end = this.loop.start + nb; this.syncLoop(); }
    this.emit('loop');
  }

  exitLoop() {
    if (!this.loop) return;
    if (this.kind === 'file' && this.playing) {
      const p = this.filePos();
      this.loop = null; this.loopSec = null;
      if (this.src) this.src.loop = false;
      this.startPos = p; this.startCtx = this.ctx.currentTime;
    } else { this.loop = null; this.loopSec = null; }
    if (this.gen) this.gen.loop = null;
    this.emit('loop');
  }

  syncLoop() {
    if (this.kind === 'gen') { this.gen.loop = this.loop; }
    else {
      const spbBase = 60 / this.baseBpm;
      this.loopSec = this.loop ? { start: this.firstBeat + this.loop.start * spbBase, end: this.firstBeat + this.loop.end * spbBase } : null;
      if (this.playing && this.src) {
        const p = this.filePos();
        this.startPos = p; this.startCtx = this.ctx.currentTime;
        this.applyLoopToSource(this.src);
      }
    }
    this.emit('loop');
  }

  applyLoopToSource(src) {
    if (this.loop && this.loopSec) { src.loop = true; src.loopStart = this.loopSec.start; src.loopEnd = this.loopSec.end; }
    else src.loop = false;
  }

  // ------------------------------------------------------------ tempo
  setPitch(v) { // v in -1..1 of the range
    this.applyRate(1 + v * this.range);
  }

  applyRate(rate) {
    const now = this.ctx.currentTime;
    if (this.kind === 'file' && this.playing) { this.startPos = this.filePos(now); this.startCtx = now; }
    this.rate = rate;
    if (this.src) this.src.playbackRate.setTargetAtTime(this.effRate, now, 0.01);
    if (this.gen) this.gen.setBpm(this.bpm());
    this.emit('tempo');
  }

  nudge(dir) { // hold to bend: dir = -1, 0, +1
    const now = this.ctx.currentTime;
    if (this.kind === 'file' && this.playing) { this.startPos = this.filePos(now); this.startCtx = now; }
    this.bend = dir * 0.04;
    if (this.src) this.src.playbackRate.setTargetAtTime(this.effRate, now, 0.005);
    if (this.gen) this.gen.setBpm(this.bpm());
  }

  // Match tempo and bar phase to another deck.
  syncTo(other) {
    if (!this.loaded || !other || !other.loaded) return;
    const target = other.bpm();
    const rate = target / this.baseBpm;
    this.range = Math.max(this.range, Math.min(0.5, Math.abs(rate - 1) + 0.02));
    this.applyRate(rate);
    if (!(this.playing && other.playing)) { this.emit('tempo'); return; }
    const now = this.ctx.currentTime;
    const po = other.beat(now), pt = this.beat(now);
    let d = ((po % 4) + 4) % 4 - (((pt % 4) + 4) % 4);
    if (d > 2) d -= 4;
    if (d < -2) d += 4;
    if (this.kind === 'gen') this.gen.shiftBeats(d);
    else this.seekBeat(pt + d);
    this.emit('tempo');
  }

  // ------------------------------------------------------------ channel strip
  setKnob(name, v) {
    this.knobs[name] = v;
    const t = this.ctx.currentTime, k = 0.012;
    if (name === 'trim') this.trim.gain.setTargetAtTime(dbGain((v - 0.5) * 24), t, k);
    else if (name === 'low') this.low.gain.setTargetAtTime(eqDb(v), t, k);
    else if (name === 'mid') this.mid.gain.setTargetAtTime(eqDb(v), t, k);
    else if (name === 'high') this.high.gain.setTargetAtTime(eqDb(v), t, k);
    else if (name === 'fader') this.fader.gain.setTargetAtTime(v * v, t, k);
    else if (name === 'filter') {
      // centre = open; left sweeps a low-pass down, right sweeps a high-pass up
      const d = v - 0.5;
      const lp = d < -0.02 ? 120 * Math.pow(22000 / 120, 1 + d * 2) : 22000;
      const hp = d > 0.02 ? 10 * Math.pow(7000 / 10, d * 2) : 10;
      this.lp.frequency.setTargetAtTime(lp, t, k);
      this.hp.frequency.setTargetAtTime(hp, t, k);
      const q = Math.abs(d) > 0.02 ? 2.2 : 0.7;
      this.lp.Q.setTargetAtTime(q, t, k); this.hp.Q.setTargetAtTime(q, t, k);
    }
  }

  // called every animation frame
  update() {
    this.meter.getFloatTimeDomainData(this.meterBuf);
    let pk = 0;
    for (let i = 0; i < this.meterBuf.length; i++) { const a = Math.abs(this.meterBuf[i]); if (a > pk) pk = a; }
    this.level = Math.max(pk, this.level * 0.9);
    if (!this.playing || !this.loaded) return;
    const b = this.beat();
    const s = this.sectionAt(b);
    const idx = s ? this.sections.indexOf(s) : -1;
    if (idx !== this.sectionIdx) {
      this.sectionIdx = idx;
      if (s) this.emit('section', s);
    }
  }
}
