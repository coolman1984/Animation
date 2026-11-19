// Lossless master recorder: an AudioWorklet copies the master bus into 16-bit stereo chunks,
// and stop() returns a standard .wav Blob. Falls back to a ScriptProcessor where worklets are missing.

const WORKLET = `
class RecTap extends AudioWorkletProcessor {
  constructor() { super(); this.on = true; this.L = []; this.R = []; this.n = 0;
    this.port.onmessage = (e) => { if (e.data === 'stop') { this.flush(); this.on = false; } }; }
  flush() { if (!this.n) return; this.port.postMessage({ L: this.L, R: this.R }); this.L = []; this.R = []; this.n = 0; }
  process(inputs) {
    const i = inputs[0];
    if (this.on && i && i.length) { this.L.push(i[0].slice(0)); this.R.push((i[1] || i[0]).slice(0)); this.n += i[0].length; if (this.n >= 8192) this.flush(); }
    return this.on;
  }
}
registerProcessor('rec-tap', RecTap);`;

export class WavRecorder {
  constructor(ctx, source) {
    this.ctx = ctx;
    this.source = source;
    this.chunks = [];
    this.frames = 0;
    this.active = false;
  }

  async start() {
    const ctx = this.ctx;
    this.chunks = []; this.frames = 0;
    const take = (L, R) => {
      const n = L.length, out = new Int16Array(n * 2);
      for (let i = 0; i < n; i++) {
        const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i]));
        out[i * 2] = l < 0 ? l * 0x8000 : l * 0x7fff;
        out[i * 2 + 1] = r < 0 ? r * 0x8000 : r * 0x7fff;
      }
      this.chunks.push(out); this.frames += n;
    };
    // file:// pages have an opaque origin, where blob: worklets are refused: try data:, then blob:, then a ScriptProcessor
    let worklet = false;
    if (ctx.audioWorklet) {
      if (!WavRecorder.loaded) {
        for (const url of [`data:application/javascript;base64,${btoa(WORKLET)}`, URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))]) {
          try { await ctx.audioWorklet.addModule(url); WavRecorder.loaded = true; break; } catch { /* next */ }
        }
      }
      if (WavRecorder.loaded) {
        this.node = new AudioWorkletNode(ctx, 'rec-tap', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'explicit' });
        this.node.port.onmessage = (e) => { const { L, R } = e.data; for (let k = 0; k < L.length; k++) take(L[k], R[k]); };
        worklet = true;
      }
    }
    if (!worklet) {
      this.node = ctx.createScriptProcessor(4096, 2, 2);
      this.node.onaudioprocess = (e) => { if (this.active) take(e.inputBuffer.getChannelData(0).slice(0), e.inputBuffer.getChannelData(1).slice(0)); };
      this.mute = ctx.createGain(); this.mute.gain.value = 0;
      this.node.connect(this.mute); this.mute.connect(ctx.destination);
    }
    this.source.connect(this.node);
    this.active = true;
  }

  seconds() { return this.frames / this.ctx.sampleRate; }

  async stop() {
    if (!this.active) return null;
    this.active = false;
    if (this.node.port && this.node.port.postMessage) {
      this.node.port.postMessage('stop');
      await new Promise((r) => setTimeout(r, 120));
    }
    try { this.source.disconnect(this.node); } catch { /* fine */ }
    try { this.node.disconnect(); } catch { /* fine */ }
    if (this.mute) { try { this.mute.disconnect(); } catch { /* fine */ } this.mute = null; }
    const sr = this.ctx.sampleRate, n = this.frames, bytes = n * 4;
    const head = new DataView(new ArrayBuffer(44));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) head.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); head.setUint32(4, 36 + bytes, true); w(8, 'WAVE'); w(12, 'fmt ');
    head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 2, true);
    head.setUint32(24, sr, true); head.setUint32(28, sr * 4, true); head.setUint16(32, 4, true); head.setUint16(34, 16, true);
    w(36, 'data'); head.setUint32(40, bytes, true);
    const blob = new Blob([head, ...this.chunks], { type: 'audio/wav' });
    this.chunks = [];
    return blob;
  }
}
