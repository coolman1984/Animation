// Rave Studio — the conductor. Renderer, worlds, lighting desk, director, post, audio, recording, UI.
import * as THREE from 'three';
import { AudioEngine } from './audio/engine.js';
import { PRESETS } from './audio/trance.js';
import { loadAssets } from './visual/assets.js';
import { Post } from './visual/post.js';
import { PALETTES, Show } from './visual/show.js';
import { Director, SHOTS } from './visual/director.js';
import { Titles } from './visual/titles.js';
import { Confetti, Crowd, Haze, Particles } from './visual/fixtures.js';
import { WORLDS } from './visual/worlds.js';
import { extFor, saveBlob, shareBlob, stamp, VideoRecorder } from './record.js';
import { Midi } from './midi.js';
import { buildUI, FORMATS } from './ui/panels.js';
import { btn, h, registry, toast } from './ui/controls.js';

const DEFAULT_STATE = {
  world: 'canyon', palette: 'canyon', colors: [...PALETTES.canyon.c], colorDrift: true, paletteFollowWorld: true,
  program: 'auto', chase: 'auto', laserChase: 'auto', speed: 1, ledProgram: 0,
  master: { lasers: 0.9, beams: 0.9, strobe: 0.7, blinders: 0.8, led: 1, haze: 0.75, pyro: 0.85, crowd: 1 },
  autoDrop: true, autoPyro: true, autoConfetti: true, autoFireworks: true,
  titles: { party: 'ترانس بلس', dj: 'Trance Architect', word: 'ارفع إيدك', show: true, lower: true, onLed: true, opacity: 1 },
  vj: { program: 1, opacity: 0, blend: 1 },
  post: { bloom: 0.9, bloomRadius: 0.55, bloomThreshold: 0.62, trails: 0, mirror: 0, glitch: 0, chroma: 0.3, grain: 0.25, vignette: 0.55, letterbox: 0, exposure: 1, contrast: 1.05, saturation: 1.1, hue: 0 },
  camera: { shake: 0.5, punch: 0.6, transition: 'auto', cutEvery: 'auto' },
  quality: 'auto', crowd: 1, showFps: false, safe: false,
  rec: { format: 'screen', fps: 30, mbps: 16, hideUi: true },
  scenes: [],
};
const QUALITY = {
  low: { dpr: 0.75, crowd: 700, msaa: 0, haze: 12, name: 'موفّر' },
  mid: { dpr: 1, crowd: 1600, msaa: 0, haze: 20, name: 'متوازن' },
  high: { dpr: 1.5, crowd: 2800, msaa: 4, haze: 28, name: 'عالي' },
  ultra: { dpr: 2, crowd: 4500, msaa: 4, haze: 36, name: 'فائق' },
};
const LEVELS = ['low', 'mid', 'high', 'ultra'];
const SCENE_KEYS = ['world', 'palette', 'colors', 'program', 'chase', 'laserChase', 'speed', 'ledProgram', 'master', 'vj', 'post', 'camera'];
const MOBILE = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(screen.width, screen.height) < 600;

function merge(a, b) {
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
    else if (k in a) a[k] = b[k];
  }
  return a;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

class App {
  async boot() {
    const S = (this.state = clone(DEFAULT_STATE));
    try { merge(S, JSON.parse(localStorage.getItem('rave-state') || '{}')); } catch { /* fresh */ }
    this.canvas = document.getElementById('stage');
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance', alpha: false }));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 1400);
    this.spectrum = new Uint8Array(128);
    this.spectrumTex = new THREE.DataTexture(this.spectrum, 128, 1, THREE.RedFormat, THREE.UnsignedByteType);
    this.spectrumTex.needsUpdate = true;
    this.titles = new Titles();
    this.assets = await loadAssets(window.RAVE_GLB);
    this.engine = new AudioEngine();
    this.show = new Show(S);
    this.post = new Post(renderer, this.scene, this.camera, this.spectrumTex, this.titles.ovTex, this.titles.wordTex);
    this.director = new Director(this.camera, this.post);
    Object.assign(this.director.settings, S.camera);
    this.crowd = new Crowd(this.assets.geo('crowd_person'), 4500);
    this.particles = new Particles(5000);
    this.confetti = new Confetti(900);
    this.scene.add(this.crowd.mesh, this.crowd.phones, this.particles.points, this.confetti.mesh);
    this.worldCache = {};
    this.spots = {};
    this.vrec = new VideoRecorder(this.canvas);
    this.midi = new Midi(registry, (names, learned) => this.drawMidi(names, learned));
    this.fps = 60; this.frames = 0; this.fpsT = 0; this.slow = 0; this.fast = 0;
    this.autoLevel = MOBILE ? 'mid' : 'high';
    this.word = { t: 99, dur: 2.2 };
    this.t = 0;
    this.idleA = { v: { sub: 0, kick: 0, bass: 0, mid: 0, high: 0, air: 0 }, punch: { sub: 0, kick: 0, bass: 0, mid: 0, high: 0, air: 0 }, level: 0, spectrum: this.spectrum };

    this.show.on((kind, data) => this.onShow(kind, data));
    this.engine.on('load', (d) => { this.ui.deckLoaded(d); });
    this.engine.on('loading', (d, name) => toast(`بحلّل «${name}»… السرعة والدروبات`));
    this.engine.on('ended', (d) => { if (this.engine.audible(this.engine.other(d)) === 0 && this.state.autoDj) this.autoMix(16); });
    this.engine.on('automix', (on) => toast(on ? 'انتقال تلقائي شغّال' : 'الانتقال خلص'));
    this.engine.on('knobs', () => this.ui.syncMixer());

    this.ui = buildUI(this);
    this.setWorld(S.world, true);
    this.applyPost();
    this.applyQuality();
    this.applyTitles();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.layoutView()).observe(document.querySelector('.console'));
    document.addEventListener('visibilitychange', () => { this.hidden = document.hidden; });
    this.keyboard();
    this.pointer();
    this.entrance();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---------------------------------------------------------------- audio helpers
  deck(i) { return this.engine.decks[i]; }
  async withAudio(fn) { await this.ensureAudio(); return fn(); }
  async withDeck(i, fn) {
    await this.ensureAudio();
    const d = this.deck(i);
    if (!d.loaded) { toast('حمّل تراك على الديك الأول'); return; }
    fn(d);
  }
  async ensureAudio() {
    if (this.engine.ctx && this.engine.ctx.state === 'running') return;
    await this.engine.init();
    this.ui.syncMixer();
  }
  async loadFile(i, f) {
    await this.ensureAudio();
    try { await this.deck(i).loadFile(f); toast(`«${this.deck(i).title}» · ${this.deck(i).baseBpm.toFixed(1)} BPM`); } catch (e) { console.error(e); toast('الملف ده مش بيفتح كصوت'); }
  }
  async loadGen(i, key) { await this.ensureAudio(); this.deck(i).loadGenerator(key); }
  async autoMix(bars) { await this.ensureAudio(); await this.engine.autoTransition(bars); this.ui.syncMixer(); }
  async riser(on) {
    await this.ensureAudio();
    if (on) { this.engine.fx.riserStart(); this.show.hold('strobe', false); this.riserOn = true; return; }
    const p = this.engine.fx.riserStop();
    this.riserOn = false;
    if (p > 0.35) { this.engine.fx.impact(); this.show.fire('drop', { manual: true }); }
  }
  async lineIn(on) {
    await this.ensureAudio();
    try { return await this.engine.lineIn(on); } catch (e) { toast('مقدرتش أفتح المدخل الخارجي'); return false; }
  }
  async connectMidi() { try { await this.midi.connect(); } catch (e) { toast(e.message); } }
  drawMidi(names, learned) {
    const v = this.ui?.views;
    if (!v) return;
    if (names) v.midiStatus.textContent = names.length ? `متوصل: ${names.join('، ')}` : 'مفيش جهاز متوصل.';
    if (learned) { toast('اتربط ✓'); document.querySelectorAll('.armed').forEach((e) => e.classList.remove('armed')); }
    v.midiList.innerHTML = '';
    for (const [k, id] of Object.entries(this.midi.map)) v.midiList.append(h('li', {}, h('kbd', {}, k), ' → ', registry.get(id)?.label || id));
  }

  // ---------------------------------------------------------------- show events
  onShow(kind) {
    const W = this.world, S = this.state, clock = this.engine.clock;
    if (kind === 'drop') {
      this.director.onSection('drop', clock);
      this.flames(1.2); this.co2();
      if (S.autoConfetti) this.confetti.burst(W.emit.confetti.x, W.emit.confetti.y, W.emit.confetti.z, this.show.colors);
      if (S.autoFireworks) this.fireworks();
      this.titles.setWord(S.titles.word, S.colors[0]);
      this.word = { t: 0, dur: 2.4 };
      this.counting = null;
    } else if (kind === 'build' || kind === 'break') this.director.onSection(kind, clock);
    else if (kind === 'pyro') this.flames(1);
    else if (kind === 'bar') this.director.onBar(clock.bar, clock, this.show.look.section);
  }

  flames(power = 1) {
    const k = this.state.master.pyro;
    if (k <= 0.02) return;
    this.world.emit.flames.forEach((p, i) => setTimeout(() => this.particles.flame(p.x, p.y, p.z, power * (0.5 + k * 0.6)), i * 40));
  }
  co2() { this.world.emit.co2.forEach((p) => this.particles.co2(p.x, p.y, p.z)); }
  fireworks() {
    const fw = this.world.emit.fireworks;
    if (!fw.length) return;
    fw.forEach((p, i) => setTimeout(() => this.particles.firework(p.x + (Math.random() - 0.5) * 10, p.y, p.z, this.show.colors[i % 3]), i * 260 + Math.random() * 200));
  }

  fire(kind, data) {
    const W = this.world;
    if (kind === 'drop') {
      if (data?.manual && this.engine.ctx) this.engine.fx.impact();
      this.show.fire('drop', data);
    } else if (kind === 'pyro') this.flames(1.2);
    else if (kind === 'co2') this.co2();
    else if (kind === 'confetti') this.confetti.burst(W.emit.confetti.x, W.emit.confetti.y, W.emit.confetti.z, this.show.colors);
    else if (kind === 'fireworks') this.fireworks();
  }
  hold(name, on) { this.show.hold(name, on); }

  // ---------------------------------------------------------------- worlds
  setWorld(key, immediate) {
    if (!WORLDS[key]) return;
    const apply = () => {
      if (this.world) this.scene.remove(this.world.group);
      const ctx = { assets: this.assets, spectrum: this.spectrumTex, titleTex: this.titles.ledTex };
      const W = (this.worldCache[key] ||= new WORLDS[key].cls(ctx));
      this.world = W;
      this.scene.add(W.group);
      this.scene.fog = new THREE.FogExp2(W.fog.color, W.fog.density);
      this.scene.background = W.fog.color;
      this.renderer.toneMappingExposure = W.exposure;
      const spots = (this.spots[key] ||= W.crowdSpots(4500, { ...W.anchors.crowd, stage: W.anchors.stage }));
      this.crowd.layout(spots);
      const cu = this.crowd.mat.uniforms;
      cu.uStage.value.copy(W.anchors.stage); cu.uFog.value.copy(W.fog.color); cu.uFogD.value = W.fog.density;
      if (this.haze) { this.scene.remove(this.haze.mesh); this.haze.mesh.geometry.dispose(); }
      this.haze = new Haze(QUALITY[this.qLevel || 'mid'].haze, W.hazeArea);
      this.scene.add(this.haze.mesh);
      this.director.setWorld(W);
      this.particles.motes(240, [...W.hazeArea.min, ...W.hazeArea.max]);
      this.state.world = key;
      if (this.state.paletteFollowWorld) { this.show.setPalette(W.palette); this.ui?.views.drawSwatches(); this.ui?.views.colorInputs.forEach((c, i) => { c.value = this.state.colors[i]; }); }
      this.applyQuality(true);
      this.ui?.setWorld(key);
      this.saveState();
    };
    if (immediate) apply(); else this.post.transition(this.director.pickTransition('world'), 0.9, apply);
  }

  setPalette(k) { this.show.setPalette(k); this.applyTitles(); this.saveState(); }
  setColor(i, hex) { this.state.colors[i] = hex; this.state.palette = 'custom'; this.applyTitles(); this.saveState(); }

  nextShot() {
    const keys = Object.keys(SHOTS);
    const next = keys[(keys.indexOf(this.director.shot) + 1) % keys.length];
    if (this.director.mode === 'free') this.director.setMode('shot');
    this.director.cut(next, this.engine.clock, { beats: 32 });
  }

  // ---------------------------------------------------------------- look & quality
  applyPost() {
    const P = this.state.post, u = this.post.u, V = this.state.vj;
    u.uChroma.value = P.chroma; u.uGrain.value = P.grain; u.uVignette.value = P.vignette; u.uLetterbox.value = P.letterbox;
    u.uExposure.value = P.exposure; u.uContrast.value = P.contrast; u.uSat.value = P.saturation; u.uHue.value = P.hue; u.uMirror.value = P.mirror;
    u.uVJ.value = V.program; u.uVJOpacity.value = V.opacity; u.uVJBlend.value = V.blend;
    u.uOverlay.value = this.state.titles.show ? this.state.titles.opacity : 0;
    this.post.bloom.radius = P.bloomRadius; this.post.bloom.threshold = P.bloomThreshold;
    this.post.trails.enabled = P.trails > 0.01;
    this.post.trails.uniforms.damp.value = P.trails;
    this.saveState();
  }

  applyTitles() { this.titles.key = ''; this.saveState(); }

  setLogo(file) {
    if (!file) { this.titles.setLogo(null); return; }
    const img = new Image();
    img.onload = () => this.titles.setLogo(img);
    img.src = URL.createObjectURL(file);
  }

  applyQuality(skipResize) {
    const lvl = this.state.quality === 'auto' ? this.autoLevel : this.state.quality;
    this.qLevel = lvl;
    const Q = QUALITY[lvl];
    this.crowd.setCount(Math.round(Q.crowd * (0.2 + this.state.crowd * 0.8)));
    this.post.setSamples(Q.msaa);
    if (!skipResize) this.resize();
  }

  resize() {
    const F = FORMATS[this.state.rec.format] || FORMATS.screen;
    const Q = QUALITY[this.qLevel || 'mid'];
    const vw = window.innerWidth, vh = window.innerHeight;
    let w, hgt, pr;
    if (F.w) {
      w = F.w; hgt = F.h; pr = 1;
      const s = Math.min(vw / w, vh / hgt);
      this.canvas.style.width = `${Math.round(w * s)}px`; this.canvas.style.height = `${Math.round(hgt * s)}px`;
      document.body.classList.add('framed');
    } else {
      w = vw; hgt = vh; pr = Math.min(window.devicePixelRatio || 1, Q.dpr);
      this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
      document.body.classList.remove('framed');
    }
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, hgt, false);
    this.camera.aspect = w / hgt;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w, hgt, pr);
    this.titles.setSize(w * pr, hgt * pr);
    this.post.u.tOverlay.value = this.titles.ovTex;
    this.particles.setScale(hgt * pr * 0.55);
    this.crowd.phones.material.uniforms.uScale.value = hgt * pr * 0.5;
    this.size = { w, h: hgt, pr };
    this.layoutView();
  }

  // Frame the stage inside the part of the screen the console does not cover. The camera's vertical
  // field of view spans that band; the strip under the console simply shows more floor and crowd.
  layoutView() {
    const { w, h: hgt } = this.size || {};
    if (!w) return;
    const clean = document.body.classList.contains('clean');
    const framed = this.state.rec.format !== 'screen';
    const pads = document.querySelector('.pads');
    let band = hgt;
    // recordings and screenshots always get the full, centred composition
    if (!clean && !framed && pads && !this.vrec?.active && !this.capturing) band = Math.max(hgt * 0.42, Math.min(hgt, pads.getBoundingClientRect().top + 30));
    if (band < hgt - 2) {
      this.camera.aspect = w / band;
      this.camera.setViewOffset(w, band, 0, 0, w, hgt);
    } else {
      this.camera.clearViewOffset();
      this.camera.aspect = w / hgt;
    }
    this.camera.updateProjectionMatrix();
    const top = clean || framed ? 0 : 64 / hgt;
    this.safe = { top: +top.toFixed(3), bottom: +((hgt - band) / hgt).toFixed(3) };
    this.post.u.uWordY.value = 1 - band / hgt / 2;
  }

  // ---------------------------------------------------------------- the frame
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.hidden && !this.vrec.active) return;
    this.t += dt;
    const t = this.t;
    this.engine.update(dt);
    const clock = this.engine.clock;
    const a = this.engine.ctx ? this.engine.analysis : this.idleA;
    if (this.engine.ctx) { this.spectrum.set(a.spectrum); this.spectrumTex.needsUpdate = true; }
    const L = this.show.update(dt, t, clock, this.engine.ctx ? a : null);
    // build countdown on the last four beats before a drop
    if (L.section === 'build' && clock.sectionBeatsLeft <= 4 && clock.sectionBeatsLeft > 0) {
      const n = Math.ceil(clock.sectionBeatsLeft);
      if (n !== this.counting) { this.counting = n; this.titles.setWord(String(n), this.state.colors[0]); this.word = { t: 0, dur: 0.5 }; }
    }
    this.world.update(dt, t, L, clock, a);
    this.crowd.update(t, L, clock);
    this.particles.update(dt);
    this.confetti.update(dt);
    this.haze.update(t, L);
    this.director.update(dt, t, clock, L, this.engine.ctx ? a : null);
    // post uniforms
    const u = this.post.u, P = this.state.post;
    u.uTime.value = t; u.uBeat.value = clock.phase;
    u.uKick.value = a.punch.kick; u.uBass.value = a.v.bass; u.uHigh.value = a.v.high;
    u.uC0.value.copy(L.colors[0]); u.uC1.value.copy(L.colors[1]); u.uC2.value.copy(L.colors[2]);
    u.uFlash.value = L.flash; u.uBlack.value = L.black;
    u.uGlitch.value = Math.max(P.glitch, L.glitch);
    u.uZoom.value = L.dropAge < 0.4 ? (0.4 - L.dropAge) * 0.25 : 0;
    this.post.bloom.strength = P.bloom * (0.8 + L.intensity * 0.45 + L.flash * 0.6);
    this.word.t += dt;
    const wt = this.word.t / this.word.dur;
    u.uWord.value = wt < 1 ? Math.min(1, wt * 8) * (1 - Math.pow(wt, 3)) * (this.state.titles.show ? 1 : 0) : 0;
    u.uWordScale.value = 0.9 + Math.min(1, wt) * 0.18;
    this.titles.draw(this.state.titles, this.state.colors[0], this.safe);
    this.post.render(dt);
    if (this.capture) { const c = this.capture; this.capture = null; c(); }
    this.ui.frame(dt, clock, L);
    this.measure(now, dt);
  }

  measure(now, dt) {
    this.frames++; this.fpsT += dt;
    if (this.fpsT < 1) return;
    this.fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0;
    if (this.state.quality !== 'auto' || this.vrec.active) return;
    const i = LEVELS.indexOf(this.autoLevel);
    if (this.fps < 42) { this.slow++; this.fast = 0; } else if (this.fps > 57) { this.fast++; this.slow = 0; } else { this.slow = 0; this.fast = 0; }
    if (this.slow >= 2 && i > 0) { this.autoLevel = LEVELS[i - 1]; this.slow = 0; this.applyQuality(); }
    if (this.fast >= 8 && i < (MOBILE ? 1 : 2)) { this.autoLevel = LEVELS[i + 1]; this.fast = 0; this.applyQuality(); }
  }

  // ---------------------------------------------------------------- capture & recording
  screenshot(name) {
    this.capturing = true;
    this.layoutView();
    return new Promise((resolve) => {
      this.capture = () => this.canvas.toBlob(async (b) => {
        this.capturing = false;
        this.layoutView();
        const file = name || `rave-${stamp()}.png`;
        this.addTake(b, file);
        saveBlob(b, file);
        resolve();
      }, 'image/png');
    });
  }

  async poster() {
    const prev = this.state.rec.format;
    this.state.rec.format = 'k4';
    this.resize();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await this.screenshot(`rave-poster-4k-${stamp()}.png`);
    this.state.rec.format = prev;
    this.resize();
    toast('البوستر ٤K اتحفظ');
  }

  async toggleVideo() {
    if (this.vrec.active) {
      const blob = await this.vrec.stop();
      this.layoutView();
      this.ui.recState(false, 0);
      if (this.state.rec.hideUi) this.hideUI(false);
      if (blob) { const name = `rave-${stamp()}.${extFor(blob.type)}`; this.addTake(blob, name); saveBlob(blob, name); toast(`الفيديو اتحفظ (${(blob.size / 1e6).toFixed(1)} ميجا)`); }
      return;
    }
    if (this.engine.ctx) await this.ensureAudio();
    try {
      this.vrec.start({ fps: this.state.rec.fps, mbps: this.state.rec.mbps, audio: this.engine.recDest ? this.engine.recDest.stream : null });
      this.ui.recState(true, 0);
      this.layoutView();
      if (this.state.rec.hideUi) this.hideUI(true, true);
      toast(`بيسجّل ${this.vrec.type.includes('mp4') ? 'MP4' : 'WebM'}… اضغط R للإيقاف`);
    } catch (e) { toast(e.message); }
  }

  async toggleWav() {
    await this.ensureAudio();
    const w = this.engine.wav;
    if (w.active) {
      const blob = await w.stop();
      this.ui.views.wavBtn.textContent = 'سجّل المكس (WAV)';
      if (blob) { const name = `rave-mix-${stamp()}.wav`; this.addTake(blob, name); saveBlob(blob, name); toast(`المكس اتحفظ (${(blob.size / 1e6).toFixed(1)} ميجا)`); }
    } else { await w.start(); this.ui.views.wavBtn.classList.add('on'); toast('بيسجّل المكس…'); }
    this.ui.views.wavBtn.classList.toggle('on', w.active);
  }

  addTake(blob, name) {
    const url = URL.createObjectURL(blob);
    const li = h('li', {}, h('a', { href: url, download: name }, name), h('small', {}, ` ${(blob.size / 1e6).toFixed(1)} ميجا `),
      btn('شارك', { onPress: async () => { try { if (!(await shareBlob(blob, name))) toast('المشاركة مش مدعومة هنا، استخدم التحميل'); } catch { /* cancelled */ } } }));
    this.ui.views.takes.prepend(li);
  }

  hideUI(on, quiet) {
    document.body.classList.toggle('clean', on);
    this.layoutView();
    if (on && !quiet) toast('اضغط H أو المس الشاشة مرتين للرجوع');
  }

  fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => toast('ملء الشاشة مش متاح هنا'));
  }

  // ---------------------------------------------------------------- scenes & show files
  snapshot() { const o = {}; for (const k of SCENE_KEYS) o[k] = clone(this.state[k]); o.shot = this.director.shot; o.mode = this.director.mode; return o; }
  saveScene(i) { this.state.scenes[i] = this.snapshot(); this.saveState(); toast(`المشهد ${i + 1} اتحفظ`); }
  recallScene(i) {
    const sc = this.state.scenes[i];
    if (!sc) return;
    const world = sc.world;
    for (const k of SCENE_KEYS) if (k !== 'world') this.state[k] = clone(sc[k]);
    Object.assign(this.director.settings, this.state.camera);
    this.applyPost();
    const follow = this.state.paletteFollowWorld;
    this.state.paletteFollowWorld = false;
    if (world !== this.state.world) this.setWorld(world);
    this.state.paletteFollowWorld = follow;
    if (sc.mode !== 'free') { this.director.setMode(sc.mode); this.director.cut(sc.shot, this.engine.clock, { beats: 32 }); }
    this.ui.views.drawSwatches();
    toast(`المشهد ${i + 1}`);
  }
  exportShow() {
    const blob = new Blob([JSON.stringify({ app: 'rave-studio', version: 1, state: this.state }, null, 2)], { type: 'application/json' });
    saveBlob(blob, `rave-show-${stamp()}.json`);
  }
  async importShow(file) {
    try {
      const j = JSON.parse(await file.text());
      merge(this.state, j.state || {});
      this.saveState();
      toast('العرض اتحمّل، بنعيد التشغيل…');
      setTimeout(() => location.reload(), 600);
    } catch { toast('الملف ده مش عرض صالح'); }
  }

  saveState() {
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => { try { localStorage.setItem('rave-state', JSON.stringify(this.state)); } catch { /* private mode */ } }, 400);
  }

  // ---------------------------------------------------------------- input
  keyboard() {
    const down = new Set();
    const holdKeys = { s: 'strobe', b: 'blinder', l: 'laser', k: 'blackout', g: 'glitch' };
    window.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.target.closest && e.target.closest('button, [role=slider]') && (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow'))) return;
      const k = e.key.toLowerCase();
      if (e.repeat && (holdKeys[k] || k === 'u')) { e.preventDefault(); return; }
      const free = this.director.mode === 'free';
      if (free && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'pageup', 'pagedown'].includes(k)) {
        this.director.keys[{ arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd', pageup: 'e', pagedown: 'q' }[k]] = true; e.preventDefault(); return;
      }
      if (holdKeys[k]) { this.hold(holdKeys[k], true); down.add(k); return; }
      const W = Object.entries(WORLDS).find(([, w]) => w.key === e.key);
      if (W) { this.setWorld(W[0]); return; }
      switch (k) {
        case ' ': e.preventDefault(); this.withAudio(() => { const d = this.engine.masterDeck() || this.deck(0); if (d.loaded) d.toggle(); else this.startShow(); }); break;
        case 'z': this.withDeck(0, (d) => d.toggle()); break;
        case 'm': this.withDeck(1, (d) => d.toggle()); break;
        case 'x': this.withDeck(0, (d) => d.cuePress()); break;
        case 'n': this.withDeck(1, (d) => d.cuePress()); break;
        case 'arrowleft': case 'arrowright': {
          const rtl = document.dir === 'rtl';
          const step = (k === 'arrowleft' ? 1 : -1) * (rtl ? 1 : -1) * 0.05;
          this.withAudio(() => { this.engine.setCrossfader(this.engine.xf + step); this.ui.views.xf.sync(this.engine.xf); }); break;
        }
        case 't': this.autoMix(16); break;
        case 'd': this.fire('drop', { manual: true }); break;
        case 'p': this.fire('pyro'); break;
        case 'c': this.fire('co2'); break;
        case 'j': this.fire('confetti'); break;
        case 'f': this.fire('fireworks'); break;
        case 'u': this.riser(true); down.add('u'); break;
        case 'v': this.nextShot(); break;
        case 'o': this.screenshot(); break;
        case 'r': this.toggleVideo(); break;
        case 'h': this.hideUI(!document.body.classList.contains('clean')); break;
        case '?': document.querySelector('dialog.help').showModal(); break;
        default: return;
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      const map = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd', pageup: 'e', pagedown: 'q' };
      if (map[k]) this.director.keys[map[k]] = false;
      if (holdKeys[k] && down.has(k)) { this.hold(holdKeys[k], false); down.delete(k); }
      if (k === 'u' && down.has('u')) { down.delete('u'); this.riser(false); }
    });
    window.addEventListener('blur', () => { for (const k of down) if (holdKeys[k]) this.hold(holdKeys[k], false); down.clear(); });
  }

  pointer() {
    const c = this.canvas, pts = new Map();
    let lastTap = 0, pinch = 0;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const now = performance.now();
      if (now - lastTap < 300 && document.body.classList.contains('clean') && !this.vrec.active) this.hideUI(false);
      lastTap = now;
    });
    c.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) this.director.orbitBy(e.clientX - p.x, e.clientY - p.y);
      else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        p.x = e.clientX; p.y = e.clientY;
        const [a2, b2] = [...pts.values()];
        const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y);
        if (pinch && d0) this.director.zoomBy(d0 / d1);
        pinch = d1;
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.director.zoomBy(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });
  }

  // ---------------------------------------------------------------- entrance
  entrance() {
    const ov = document.getElementById('entrance');
    if (!ov) return;
    const go = async (mode) => {
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 700);
      if (mode === 'show') await this.startShow();
      else if (mode === 'file') document.querySelector('.deck-0 input[type=file]').click();
    };
    ov.querySelector('[data-go=show]').addEventListener('click', () => go('show'));
    ov.querySelector('[data-go=file]').addEventListener('click', () => go('file'));
    ov.querySelector('[data-go=look]').addEventListener('click', () => go('look'));
    const safe = ov.querySelector('[data-safe]');
    safe.setAttribute('aria-pressed', String(this.state.safe));
    safe.addEventListener('click', () => { this.state.safe = !this.state.safe; safe.setAttribute('aria-pressed', String(this.state.safe)); this.saveState(); });
  }

  // both decks loaded with the world's track and the next one; A plays
  async startShow() {
    await this.ensureAudio();
    const keys = Object.keys(PRESETS);
    const k = PRESETS[this.state.world] ? this.state.world : keys[0];
    if (!this.deck(0).loaded) this.deck(0).loadGenerator(k);
    if (!this.deck(1).loaded) this.deck(1).loadGenerator(keys[(keys.indexOf(k) + 1) % keys.length]);
    this.engine.setCrossfader(0);
    this.ui.syncMixer();
    this.deck(0).play();
    this.director.setMode('auto');
  }
}

const app = new App();
window.raveApp = app;
app.boot().catch((e) => {
  console.error(e);
  const f = document.getElementById('fatal');
  if (f) { f.hidden = false; f.textContent = `حصلت مشكلة في تشغيل الرسم ثلاثي الأبعاد: ${e.message}`; }
});
