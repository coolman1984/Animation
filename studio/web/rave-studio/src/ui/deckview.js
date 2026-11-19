// One deck on the console: readouts, colour waveform (zoomed + overview), transport, cues, loops, pitch.
import { btn, Fader, h, select, setPressed } from './controls.js';
import { PRESETS } from '../audio/trance.js';

export const SECTION_AR = { idle: 'هدوء', intro: 'مقدمة', main: 'شغّال', build: 'تصاعد', drop: 'الدروب', break: 'استراحة', outro: 'نهاية' };
const SECTION_COL = { intro: '#3a4250', main: '#46505e', build: '#c76a1c', drop: null, break: '#1f2f5a', outro: '#3a4250' };
const fmt = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), x = Math.floor(s % 60); return `${m}:${String(x).padStart(2, '0')}`; };

export class DeckView {
  constructor(app, index) {
    this.app = app;
    this.i = index;
    this.color = index === 0 ? 'var(--deck-a)' : 'var(--deck-b)';
    this.hex = index === 0 ? '#3fe0ff' : '#ff9a3c';
    const L = index === 0 ? 'أ' : 'ب';
    const id = (s) => `deck${index}.${s}`;
    const srcOpts = { '': 'اختار مصدر…' };
    for (const [k, p] of Object.entries(PRESETS)) srcOpts[`gen:${k}`] = `مولّد: ${p.name} · ${p.bpm}`;
    srcOpts.file = 'ملف من جهازك…';
    this.file = h('input', { type: 'file', accept: 'audio/*', hidden: true });
    this.file.addEventListener('change', () => { const f = this.file.files[0]; if (f) app.loadFile(index, f); this.file.value = ''; });
    this.src = select(srcOpts, '', (v) => {
      if (v === 'file') this.file.click();
      else if (v.startsWith('gen:')) app.loadGen(index, v.slice(4));
      this.srcSel.value = '';
    }, { label: 'المصدر' });
    this.srcSel = this.src.querySelector('select');
    this.title = h('div', { class: 'd-title' }, 'فاضي — اختار تراك');
    this.bpm = h('span', { class: 'd-bpm mono' }, '---.-');
    this.pitchRead = h('span', { class: 'd-pitch mono' }, '0.0%');
    this.time = h('span', { class: 'd-time mono' }, '0:00');
    this.remain = h('span', { class: 'd-remain mono' }, '-0:00');
    this.sec = h('span', { class: 'd-sec' }, '—');
    this.zoom = h('canvas', { class: 'wave-zoom', height: 70, 'aria-label': `موجة ديك ${L}` });
    this.over = h('canvas', { class: 'wave-over', height: 30, 'aria-label': `خريطة تراك ديك ${L}، اضغط للتنقل` });
    this.over.addEventListener('pointerdown', (e) => {
      const d = app.deck(index); if (!d || !d.loaded) return;
      const r = this.over.getBoundingClientRect();
      d.seek(((e.clientX - r.left) / r.width) * d.duration);
    });
    // transport
    this.play = btn('▶', { id: id('play'), cls: 'd-play', title: 'تشغيل / إيقاف', onPress: () => app.withDeck(index, (d) => d.toggle()) });
    const cue = btn('CUE', { id: id('cue'), cls: 'd-cue', title: 'كيو: وهو واقف يحفظ النقطة، وهو شغّال يرجع لها', onPress: () => app.withDeck(index, (d) => d.cuePress()) });
    this.sync = btn('SYNC', { id: id('sync'), cls: 'd-sync', title: 'ظبّط السرعة والإيقاع على الديك التاني', onPress: () => app.withDeck(index, (d) => d.syncTo(app.engine.other(d))) });
    this.hot = [0, 1, 2, 3].map((k) => {
      const b = btn(String(k + 1), { id: id(`hot${k}`), cls: 'hot', title: 'نقطة سريعة: ضغطة تحفظ أو تنط، ضغطة طويلة تمسح' });
      let timer = null;
      b.addEventListener('pointerdown', () => { timer = setTimeout(() => { timer = null; app.withDeck(index, (d) => d.hotCue(k, true)); }, 650); });
      b.addEventListener('pointerup', () => { if (timer) { clearTimeout(timer); timer = null; app.withDeck(index, (d) => d.hotCue(k)); } });
      return b;
    });
    this.loops = [1, 2, 4, 8, 16].map((n) => btn(String(n), { id: id(`loop${n}`), cls: 'loop', toggle: true, title: `لوب ${n} نبضة`, onPress: () => app.withDeck(index, (d) => d.setLoop(n)) }));
    const half = btn('½', { id: id('loophalf'), cls: 'loop', title: 'نص اللوب', onPress: () => app.withDeck(index, (d) => d.resizeLoop(0.5)) });
    const dbl = btn('×2', { id: id('loopdbl'), cls: 'loop', title: 'ضعف اللوب', onPress: () => app.withDeck(index, (d) => d.resizeLoop(2)) });
    const jb = btn('−4', { id: id('jumpb'), cls: 'jump', title: 'ارجع ٤ نبضات', onPress: () => app.withDeck(index, (d) => d.beatJump(-4)) });
    const jf = btn('+4', { id: id('jumpf'), cls: 'jump', title: 'قدّم ٤ نبضات', onPress: () => app.withDeck(index, (d) => d.beatJump(4)) });
    this.pitch = new Fader({ id: id('pitch'), label: 'السرعة', value: 0.5, def: 0.5, center: true, wide: true, color: this.hex,
      format: (v) => `${((v - 0.5) * 2 * (app.deck(index)?.range || 0.08) * 100).toFixed(1)}%`,
      onInput: (v) => app.withDeck(index, (d) => d.setPitch((v - 0.5) * 2)) });
    this.range = select({ 0.08: '±8%', 0.16: '±16%', 0.5: '±50%' }, '0.08', (v) => app.withDeck(index, (d) => { d.range = Number(v); d.setPitch((this.pitch.v - 0.5) * 2); }), { label: 'المدى' });
    const nb = btn('−', { id: id('nudgeb'), cls: 'nudge', hold: true, title: 'هدّي لحظة (اضغط واستمر)', onPress: () => app.withDeck(index, (d) => d.nudge(-1)), onRelease: () => app.withDeck(index, (d) => d.nudge(0)) });
    const nf = btn('+', { id: id('nudgef'), cls: 'nudge', hold: true, title: 'سرّع لحظة (اضغط واستمر)', onPress: () => app.withDeck(index, (d) => d.nudge(1)), onRelease: () => app.withDeck(index, (d) => d.nudge(0)) });

    this.el = h('section', { class: `deck deck-${index}`, style: { '--dc': this.color }, 'aria-label': `ديك ${L}` },
      h('header', { class: 'd-head' }, h('span', { class: 'd-letter' }, L), this.title, this.src, this.file),
      h('div', { class: 'd-read' }, h('span', { class: 'd-bpm-wrap' }, this.bpm, h('small', {}, 'BPM')), this.pitchRead, this.sec, h('span', { class: 'd-times' }, this.time, this.remain)),
      h('div', { class: 'd-waves', dir: 'ltr' }, this.zoom, this.over),
      h('div', { class: 'd-row d-transport' }, this.play, cue, this.sync, h('span', { class: 'd-hots' }, ...this.hot)),
      h('div', { class: 'd-row d-loops' }, h('span', { class: 'mini' }, 'لوب'), ...this.loops, half, dbl, h('span', { class: 'sp' }), jb, jf),
      h('div', { class: 'd-row d-pitch-row' }, this.pitch.el, nb, nf, this.range));
    this.overCache = null;
  }

  onLoad(d) {
    this.title.textContent = d.title;
    this.title.title = d.title;
    this.overCache = null;
    this.pitch.sync(0.5);
  }

  // overview drawn once per track (colour waveform or section map)
  buildOverview(d, w, hgt) {
    const c = document.createElement('canvas'); c.width = w; c.height = hgt;
    const g = c.getContext('2d');
    g.fillStyle = '#07090c'; g.fillRect(0, 0, w, hgt);
    if (d.kind === 'file') {
      const P = d.peaks, n = P.amp.length;
      for (let x = 0; x < w; x++) {
        const a = Math.floor((x / w) * n), b = Math.max(a + 1, Math.floor(((x + 1) / w) * n));
        let lo = 0, mi = 0, hi = 0;
        for (let i = a; i < b; i++) { if (P.low[i] > lo) lo = P.low[i]; if (P.mid[i] > mi) mi = P.mid[i]; if (P.high[i] > hi) hi = P.high[i]; }
        const mid = hgt / 2;
        g.fillStyle = this.hex; g.globalAlpha = 0.85; g.fillRect(x, mid - lo * mid, 1, lo * hgt);
        g.fillStyle = '#ffd6a0'; g.globalAlpha = 0.55; g.fillRect(x, mid - mi * mid * 0.7, 1, mi * hgt * 0.7);
        g.fillStyle = '#ffffff'; g.globalAlpha = 0.5; g.fillRect(x, mid - hi * mid * 0.45, 1, hi * hgt * 0.45);
      }
      g.globalAlpha = 1;
      const spbB = 60 / d.baseBpm;
      for (const s of d.sections) if (s.type === 'drop') { const x = ((d.firstBeat + s.start * spbB) / d.duration) * w; g.fillStyle = '#ff3b4e'; g.fillRect(x, 0, 2, hgt); }
    } else {
      const total = d.gen.totalBeats;
      for (const s of d.sections) {
        const x0 = (s.start / total) * w, x1 = (s.end / total) * w;
        g.fillStyle = SECTION_COL[s.type] || this.hex; g.globalAlpha = s.type === 'drop' ? 0.9 : 0.8;
        g.fillRect(x0 + 1, 3, x1 - x0 - 2, hgt - 6);
        g.globalAlpha = 1; g.fillStyle = '#e9eef5'; g.font = '600 10px "IBM Plex Sans Arabic", sans-serif'; g.textAlign = 'center'; g.direction = 'rtl';
        if (x1 - x0 > 34) g.fillText(SECTION_AR[s.type], (x0 + x1) / 2, hgt / 2 + 4);
      }
    }
    return c;
  }

  draw(d) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [this.zoom, this.over]) {
      const w = Math.round(c.clientWidth * dpr), hh = Math.round(c.clientHeight * dpr);
      if (w && (c.width !== w || c.height !== hh)) { c.width = w; c.height = hh; this.overCache = null; }
    }
    const gz = this.zoom.getContext('2d'), go = this.over.getContext('2d');
    const W = this.zoom.width, H = this.zoom.height;
    gz.fillStyle = '#05070a'; gz.fillRect(0, 0, W, H);
    go.fillStyle = '#05070a'; go.fillRect(0, 0, this.over.width, this.over.height);
    if (!d || !d.loaded) return;
    if (!this.overCache) this.overCache = this.buildOverview(d, this.over.width, this.over.height);
    go.drawImage(this.overCache, 0, 0);
    const prog = d.progress();
    go.fillStyle = 'rgba(0,0,0,0.45)'; go.fillRect(0, 0, prog * this.over.width, this.over.height);
    go.fillStyle = '#fff'; go.fillRect(prog * this.over.width - 1, 0, 2, this.over.height);
    // zoomed: ±4 bars around the playhead
    const beat = d.beat(), span = 16, bpx = W / (span * 2);
    const mid = H / 2;
    if (d.kind === 'file') {
      const P = d.peaks, spbB = 60 / d.baseBpm;
      for (let x = 0; x < W; x++) {
        const b = beat + (x - W / 2) / bpx;
        const sec = d.firstBeat + b * spbB, i = Math.floor(sec * P.rate);
        if (i < 0 || i >= P.amp.length) continue;
        const lo = P.low[i], mi = P.mid[i], hi = P.high[i];
        gz.fillStyle = this.hex; gz.globalAlpha = 0.9; gz.fillRect(x, mid - lo * mid * 0.95, 1, lo * H * 0.95);
        gz.fillStyle = '#ffd6a0'; gz.globalAlpha = 0.6; gz.fillRect(x, mid - mi * mid * 0.65, 1, mi * H * 0.65);
        gz.fillStyle = '#fff'; gz.globalAlpha = 0.55; gz.fillRect(x, mid - hi * mid * 0.4, 1, hi * H * 0.4);
      }
      gz.globalAlpha = 1;
    } else {
      // generator: draw the beat pattern of the current section (kicks + rolling bass)
      for (let k = Math.floor(beat - span); k <= beat + span; k++) {
        const s = d.sectionAt(k);
        if (!s) continue;
        const x = W / 2 + (k - beat) * bpx;
        const kick = s.type !== 'break' && !(s.type === 'build' && (s.end - (((k % d.gen.totalBeats) + d.gen.totalBeats) % d.gen.totalBeats)) <= 8);
        gz.fillStyle = s.type === 'drop' ? this.hex : SECTION_COL[s.type] || '#555';
        gz.globalAlpha = 0.9;
        if (kick) gz.fillRect(x, mid - H * 0.42, Math.max(2, bpx * 0.18), H * 0.84);
        gz.globalAlpha = 0.45;
        for (let q = 1; q < 4; q++) if (s.type !== 'break') gz.fillRect(x + (q * bpx) / 4, mid - H * 0.2, Math.max(1, bpx * 0.1), H * 0.4);
        if (s.type === 'break' || s.type === 'build') { gz.globalAlpha = 0.35; gz.fillRect(x, mid - H * 0.12, bpx, H * 0.24); }
      }
      gz.globalAlpha = 1;
    }
    // grid: bar lines brighter
    for (let k = Math.ceil(beat - span); k <= beat + span; k++) {
      const x = W / 2 + (k - beat) * bpx;
      gz.fillStyle = k % 4 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)';
      gz.fillRect(x, 0, 1, k % 4 === 0 ? H : 6);
    }
    if (d.loop) {
      const x0 = W / 2 + (d.loop.start - beat) * bpx, x1 = W / 2 + (d.loop.end - beat) * bpx;
      gz.fillStyle = 'rgba(63,224,255,0.16)'; gz.fillRect(x0, 0, x1 - x0, H);
      gz.fillStyle = '#3fe0ff'; gz.fillRect(x0, 0, 2, H); gz.fillRect(x1 - 2, 0, 2, H);
    }
    d.hot.forEach((hb, k) => { if (hb == null) return; const x = W / 2 + (hb - beat) * bpx; if (x < 0 || x > W) return; gz.fillStyle = '#ff3b8e'; gz.fillRect(x, 0, 2, H); gz.fillText(String(k + 1), x + 3, 10); });
    gz.fillStyle = '#ff3b4e'; gz.fillRect(W / 2 - 1, 0, 2, H);
  }

  update(d, isMaster) {
    this.el.classList.toggle('master', !!isMaster);
    if (!d || !d.loaded) return;
    this.play.textContent = d.playing ? '❚❚' : '▶';
    this.play.classList.toggle('on', d.playing);
    this.bpm.textContent = d.bpm().toFixed(1);
    const p = (d.effRate - 1) * 100;
    this.pitchRead.textContent = `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
    const t = d.time();
    this.time.textContent = fmt(t);
    this.remain.textContent = `-${fmt(d.duration - t)}`;
    const s = d.sectionAt(d.beat());
    this.sec.textContent = s ? SECTION_AR[s.type] : '—';
    this.sec.dataset.s = s ? s.type : '';
    this.loops.forEach((b, k) => setPressed(b, d.loop && d.loopBeats === [1, 2, 4, 8, 16][k]));
    this.hot.forEach((b, k) => b.classList.toggle('set', d.hot[k] != null));
  }
}
