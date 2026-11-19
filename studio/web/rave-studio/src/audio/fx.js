// Master FX rack: sweep filter → (dry + echo + hall + flanger) → bit crusher → trance gate.
// Echo time and gate steps follow the master clock (tempo-synced). Plus two performance tools:
// a noise riser you hold to build tension, and an impact (boom + crash) that lands the drop.
import { impulseResponse } from './trance.js';

const DIVS = { '1/4': 0.25, '1/2': 0.5, '3/4': 0.75, '1': 1, '2': 2 };
export const GATE_PATTERNS = {
  classic: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  pulse: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  stutter: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1],
  half: [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0],
};

export class FXRack {
  constructor(engine) {
    const ctx = (this.ctx = engine.ctx);
    this.engine = engine;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.hp = ctx.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 10;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 22000;
    this.pre = ctx.createGain();
    this.post = ctx.createGain();
    this.input.connect(this.hp); this.hp.connect(this.lp); this.lp.connect(this.pre);
    this.pre.connect(this.post); // dry
    // echo
    this.echoSend = ctx.createGain(); this.echoSend.gain.value = 0;
    this.delay = ctx.createDelay(4); this.fb = ctx.createGain(); this.fb.gain.value = 0.45;
    this.echoLp = ctx.createBiquadFilter(); this.echoLp.type = 'lowpass'; this.echoLp.frequency.value = 3800;
    this.pre.connect(this.echoSend); this.echoSend.connect(this.delay); this.delay.connect(this.echoLp);
    this.echoLp.connect(this.fb); this.fb.connect(this.delay); this.echoLp.connect(this.post);
    // hall
    this.revSend = ctx.createGain(); this.revSend.gain.value = 0;
    this.conv = ctx.createConvolver(); this.conv.buffer = impulseResponse(ctx, 4.2, 2.2);
    this.pre.connect(this.revSend); this.revSend.connect(this.conv); this.conv.connect(this.post);
    // flanger
    this.flSend = ctx.createGain(); this.flSend.gain.value = 0;
    this.flDelay = ctx.createDelay(0.05); this.flDelay.delayTime.value = 0.004;
    this.flFb = ctx.createGain(); this.flFb.gain.value = 0.6;
    this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 0.2;
    this.lfoAmt = ctx.createGain(); this.lfoAmt.gain.value = 0.0028;
    this.lfo.connect(this.lfoAmt); this.lfoAmt.connect(this.flDelay.delayTime); this.lfo.start();
    this.pre.connect(this.flSend); this.flSend.connect(this.flDelay); this.flDelay.connect(this.flFb); this.flFb.connect(this.flDelay);
    this.flDelay.connect(this.post);
    // crusher (wet/dry insert)
    this.crushDry = ctx.createGain(); this.crushWet = ctx.createGain(); this.crushWet.gain.value = 0;
    this.shaper = ctx.createWaveShaper();
    this.post.connect(this.crushDry); this.post.connect(this.shaper); this.shaper.connect(this.crushWet);
    // gate
    this.gate = ctx.createGain();
    this.crushDry.connect(this.gate); this.crushWet.connect(this.gate);
    this.gate.connect(this.output);
    // performance FX bus (after the gate so the riser is never chopped)
    this.perf = ctx.createGain(); this.perf.connect(this.output); this.perf.connect(this.revSend);

    this.state = {
      filter: 0.5,
      echo: { on: false, amount: 0.5, div: '3/4', feedback: 0.45 },
      reverb: { on: false, amount: 0.5 },
      flanger: { on: false, amount: 0.6, rate: 0.2 },
      crush: { on: false, amount: 0.6, bits: 6 },
      gate: { on: false, depth: 0.85, pattern: 'classic' },
    };
    this.gateStep = null;
    this.setCrushBits(6);
    this.apply();
  }

  setCrushBits(bits) {
    const n = 1024, curve = new Float32Array(n), steps = Math.pow(2, bits);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.round(x * steps) / steps; }
    this.shaper.curve = curve;
  }

  setFilter(v) {
    this.state.filter = v;
    const t = this.ctx.currentTime, d = v - 0.5, k = 0.015;
    this.lp.frequency.setTargetAtTime(d < -0.02 ? 150 * Math.pow(22000 / 150, 1 + d * 2) : 22000, t, k);
    this.hp.frequency.setTargetAtTime(d > 0.02 ? 10 * Math.pow(6000 / 10, d * 2) : 10, t, k);
    const q = Math.abs(d) > 0.02 ? 3 : 0.7;
    this.lp.Q.setTargetAtTime(q, t, k); this.hp.Q.setTargetAtTime(q, t, k);
  }

  set(unit, patch) { Object.assign(this.state[unit], patch); this.apply(); }

  apply() {
    const s = this.state, t = this.ctx.currentTime, k = 0.03;
    this.echoSend.gain.setTargetAtTime(s.echo.on ? s.echo.amount : 0, t, k);
    this.fb.gain.setTargetAtTime(s.echo.feedback, t, k);
    this.revSend.gain.setTargetAtTime(s.reverb.on ? s.reverb.amount * 0.9 : 0, t, k);
    this.flSend.gain.setTargetAtTime(s.flanger.on ? s.flanger.amount : 0, t, k);
    this.lfo.frequency.setTargetAtTime(0.05 + s.flanger.rate * 2, t, k);
    this.crushWet.gain.setTargetAtTime(s.crush.on ? s.crush.amount : 0, t, k);
    this.crushDry.gain.setTargetAtTime(s.crush.on ? 1 - s.crush.amount * 0.8 : 1, t, k);
    if (!s.gate.on) { this.gate.gain.cancelScheduledValues(t); this.gate.gain.setTargetAtTime(1, t, 0.01); this.gateStep = null; }
    this.syncTempo();
  }

  syncTempo() {
    const clock = this.engine.clock;
    const spb = clock && clock.bpm ? 60 / clock.bpm : 0.45;
    this.delay.delayTime.setTargetAtTime(Math.min(3.9, spb * (DIVS[this.state.echo.div] || 0.75)), this.ctx.currentTime, 0.05);
  }

  // Called every 25 ms: schedule gate steps on the master deck's grid.
  schedule(lookahead = 0.12) {
    const g = this.state.gate;
    const deck = this.engine.masterDeck();
    if (!g.on || !deck || !deck.playing) return;
    const now = this.ctx.currentTime;
    const beat = deck.beat(now);
    const cur = Math.floor(beat * 4);
    if (this.gateStep == null || this.gateStep < cur) this.gateStep = cur;
    const pat = GATE_PATTERNS[g.pattern] || GATE_PATTERNS.classic;
    let guard = 0;
    while (guard++ < 16) {
      const t = deck.timeOfBeat(this.gateStep / 4);
      if (t > now + lookahead) break;
      const on = pat[((this.gateStep % 16) + 16) % 16];
      const v = on ? 1 : 1 - g.depth;
      const at = Math.max(now, t);
      this.gate.gain.setValueAtTime(this.gate.gain.value, at);
      this.gate.gain.linearRampToValueAtTime(v, at + 0.004);
      this.gateStep++;
    }
  }

  // hold to build: band-passed noise sweeping up over 8 beats
  riserStart() {
    if (this.riser) return;
    const c = this.ctx, t = c.currentTime;
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf; n.loop = true;
    const dur = 8 * (60 / (this.engine.clock.bpm || 138));
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(9500, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45, t + dur);
    n.connect(f); f.connect(g); g.connect(this.perf);
    n.start(t);
    this.riser = { n, g, t0: t, dur };
  }

  riserStop() {
    const r = this.riser;
    if (!r) return 0;
    const t = this.ctx.currentTime;
    r.g.gain.cancelScheduledValues(t); r.g.gain.setValueAtTime(r.g.gain.value, t); r.g.gain.linearRampToValueAtTime(0, t + 0.05);
    r.n.stop(t + 0.06);
    this.riser = null;
    return Math.min(1, (t - r.t0) / r.dur);
  }

  impact() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.5);
    og.gain.setValueAtTime(0.9, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(og); og.connect(this.perf); o.start(t); o.stop(t + 1.7);
    const len = c.sampleRate * 2.5, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const n = c.createBufferSource(), hp = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 3500; ng.gain.value = 0.35;
    n.connect(hp); hp.connect(ng); ng.connect(this.perf); n.start(t);
  }
}
