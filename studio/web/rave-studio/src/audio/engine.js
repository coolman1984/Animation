// The audio engine: two decks → crossfader → master FX → limiter → speakers, analyser and recorders.
// It also owns the master clock the whole show follows (tempo, beat, bar, section of the loudest deck),
// the automatic DJ transition and an optional line-in (visuals for an external DJ mixer).
import { Analysis } from './analysis.js';
import { Deck } from './deck.js';
import { FXRack } from './fx.js';
import { PRESETS } from './trance.js';
import { WavRecorder } from './wav.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.decks = [];
    this.xf = 0;
    this.xfCurve = 'smooth';
    this.listeners = {};
    this.clock = { bpm: 138, beat: 0, phase: 0, bar: 0, playing: false, section: null, sectionProgress: 0, source: 'idle' };
    this.autoMix = null;
    this.lite = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    this.idleT0 = performance.now() / 1000;
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { for (const f of this.listeners[ev] || []) { try { f(...a); } catch (e) { console.error(e); } } }

  async init() {
    if (this.ctx) { if (this.ctx.state !== 'running') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
    this.bus = ctx.createGain();
    this.fx = new FXRack(this);
    this.bus.connect(this.fx.input);
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -3; this.limiter.knee.value = 2; this.limiter.ratio.value = 16;
    this.limiter.attack.value = 0.003; this.limiter.release.value = 0.15;
    this.master = ctx.createGain(); this.master.gain.value = 0.85;
    this.fx.output.connect(this.limiter); this.limiter.connect(this.master);
    this.master.connect(ctx.destination);
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048; this.analyser.smoothingTimeConstant = 0.5;
    this.master.connect(this.analyser);
    this.recDest = ctx.createMediaStreamDestination();
    this.master.connect(this.recDest);
    this.decks = [new Deck(this, 0), new Deck(this, 1)];
    this.analysis = new Analysis(this.analyser);
    this.wav = new WavRecorder(ctx, this.master);
    this.applyCrossfader();
    this.lookahead = 0.15;
    this.timer = setInterval(() => this.schedule(), 25);
    this.emit('ready');
  }

  schedule() { for (const d of this.decks) if (d.gen) d.gen.schedule(this.lookahead); this.fx.schedule(this.lookahead); }

  setMasterVolume(v) { if (this.master) this.master.gain.setTargetAtTime(v * v, this.ctx.currentTime, 0.02); }

  setCrossfader(v) { this.xf = Math.max(0, Math.min(1, v)); this.applyCrossfader(); }

  xfWeights(x = this.xf) {
    if (this.xfCurve === 'cut') return [x > 0.94 ? 0 : 1, x < 0.06 ? 0 : 1];
    if (this.xfCurve === 'full') return [Math.min(1, 2 - 2 * x), Math.min(1, 2 * x)];
    return [Math.cos((x * Math.PI) / 2), Math.sin((x * Math.PI) / 2)];
  }

  applyCrossfader() {
    if (!this.ctx) return;
    const [a, b] = this.xfWeights();
    const t = this.ctx.currentTime;
    this.decks[0].xfGain.gain.setTargetAtTime(a, t, 0.008);
    this.decks[1].xfGain.gain.setTargetAtTime(b, t, 0.008);
  }

  audible(d) {
    if (!d.loaded || !d.playing) return 0;
    const w = this.xfWeights()[d.index];
    return d.knobs.fader * d.knobs.fader * w;
  }

  masterDeck() {
    if (!this.decks.length) return null;
    const [a, b] = this.decks;
    const wa = this.audible(a), wb = this.audible(b);
    if (!wa && !wb) return null;
    return wa >= wb ? a : b;
  }

  other(d) { return this.decks[1 - d.index]; }

  // ------------------------------------------------------------ line-in (external mixer → visuals only)
  async lineIn(on) {
    if (!on) { if (this.lineStream) { this.lineStream.getTracks().forEach((t) => t.stop()); this.lineSrc.disconnect(); this.lineStream = null; } return false; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.lineStream = stream;
    this.lineSrc = this.ctx.createMediaStreamSource(stream);
    this.lineSrc.connect(this.analyser); // analysis only: never to the speakers (no feedback)
    return true;
  }

  // ------------------------------------------------------------ automatic DJ transition
  async autoTransition(bars = 16) {
    const from = this.masterDeck() || this.decks[0];
    const to = this.other(from);
    if (!to.loaded) {
      const keys = Object.keys(PRESETS);
      const next = from.genKey ? keys[(keys.indexOf(from.genKey) + 1) % keys.length] : keys[0];
      to.loadGenerator(next);
    }
    if (!from.playing) { from.play(); }
    to.setKnob('low', 0);
    to.setKnob('fader', 0.85);
    to.syncTo(from);
    to.play();
    to.syncTo(from);
    const startBeat = from.beat();
    this.autoMix = { from, to, startBeat, len: bars * 4, startXf: this.xf, endXf: to.index === 1 ? 1 : 0, swapped: false };
    this.emit('automix', true);
  }

  cancelAutoMix() { if (this.autoMix) { this.autoMix = null; this.emit('automix', false); } }

  stepAutoMix() {
    const m = this.autoMix;
    if (!m) return;
    if (!m.from.playing || !m.to.playing) { this.cancelAutoMix(); return; }
    const p = Math.max(0, Math.min(1, (m.from.beat() - m.startBeat) / m.len));
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    this.setCrossfader(m.startXf + (m.endXf - m.startXf) * ease);
    if (!m.swapped && p >= 0.5) { m.swapped = true; m.from.setKnob('low', 0); m.to.setKnob('low', 0.5); this.emit('knobs'); }
    if (p >= 1) {
      m.from.pause();
      m.from.setKnob('low', 0.5);
      this.autoMix = null;
      this.emit('knobs');
      this.emit('automix', false);
    }
  }

  // ------------------------------------------------------------ per frame
  update(dt) {
    if (!this.ctx) return this.idleClock();
    const now = this.ctx.currentTime;
    // slow frames → schedule further ahead (up to 0.6 s), recover slowly when frames are smooth again
    this.lookahead = Math.min(0.6, Math.max(0.15, this.lookahead * 0.995, dt * 3));
    this.schedule();
    for (const d of this.decks) d.update();
    this.analysis.update(dt, now);
    this.stepAutoMix();
    const deck = this.masterDeck();
    const c = this.clock;
    if (deck) {
      c.bpm = deck.bpm();
      c.beat = deck.beat(now);
      c.playing = true;
      c.source = 'deck';
      c.deck = deck;
      const s = deck.sectionAt(c.beat);
      c.section = s ? s.type : 'main';
      if (s) {
        const b = deck.kind === 'gen' ? ((c.beat % deck.gen.totalBeats) + deck.gen.totalBeats) % deck.gen.totalBeats : c.beat;
        c.sectionProgress = (b - s.start) / (s.end - s.start);
        c.sectionBeatsLeft = s.end - b;
      } else { c.sectionProgress = 0; c.sectionBeatsLeft = 999; }
    } else if (this.lineStream) {
      const est = this.analysis.estimate(now);
      c.deck = null;
      c.source = 'line';
      if (est) {
        c.bpm += (est.bpm - c.bpm) * 0.05;
        const spb = 60 / c.bpm;
        if (est.last !== this.onsetSeen) { this.onsetSeen = est.last; this.onsetBeat = Math.round(c.beat); }
        c.beat = this.onsetBeat + (now - est.last) / spb;
        c.playing = true;
      } else { c.playing = this.analysis.level > 0.02; c.beat += (dt * c.bpm) / 60; }
      c.section = this.analysis.v.kick > 0.25 ? 'main' : 'break';
      c.sectionProgress = 0;
    } else return this.idleClock(dt);
    this.finishClock();
  }

  idleClock(dt = 0.016) {
    const c = this.clock;
    c.playing = false; c.source = 'idle'; c.deck = null; c.section = 'idle'; c.sectionProgress = 0;
    c.bpm = 120;
    c.beat += (dt * c.bpm) / 60;
    this.finishClock();
  }

  finishClock() {
    const c = this.clock;
    c.phase = c.beat - Math.floor(c.beat);
    c.bar = Math.floor(c.beat / 4);
    c.barPhase = ((c.beat % 4) + 4) % 4 / 4;
    const bi = Math.floor(c.beat);
    if (this.lastBeat !== bi) {
      if (this.lastBeat != null && bi === this.lastBeat + 1) this.emit('beat', bi);
      this.lastBeat = bi;
    }
  }
}
