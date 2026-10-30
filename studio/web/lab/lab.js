// Motion lab UI. All numbers come from labcore.mjs (no network, no library).
import {
  PRESETS, CSS_EASINGS, HOUSE, FPS_LIST, clamp, fmt, houseFn, cubicBezier, sampleSpring, linearEase,
  cssCode, waapiCode, gsapCode, filmCode, frameCount, frameState, addMarker, removeMarker, secondMarks, exportCommands,
} from './labcore.mjs';

const $ = (id) => document.getElementById(id);
const IN = 8, SPAN = 84;
const X = (x) => IN + x * SPAN;
const Y = (y) => IN + (1 - y) * SPAN;

const state = {
  x1: 0.25, y1: 0.1, x2: 0.25, y2: 1,
  preset: 'ease', house: null, springOn: false,
  zeta: 1, stiffness: 180, spring: null, springKey: '',
  previewSec: 0.8, duration: 8, fps: 30, frame: 0, markers: [],
  film: 'demo', aspect: '9:16', mode: 'preview', demoU: null,
};
let raf = 0;

const reducedNow = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}
function setVal(id, value) {
  const el = $(id);
  if (document.activeElement === el) return;
  const s = String(value);
  if (el.value !== s) el.value = s;
}
function ensureSpring() {
  const key = `${state.zeta}/${state.stiffness}`;
  if (!state.spring || state.springKey !== key) {
    state.spring = sampleSpring({ dampingRatio: state.zeta, stiffness: state.stiffness, steps: 16 });
    state.springKey = key;
  }
  return state.spring;
}
function drawn() {
  if (state.springOn) return linearEase(ensureSpring().values);
  return cubicBezier(state.x1, state.y1, state.x2, state.y2);
}
function shownU() {
  if (state.demoU !== null) return state.demoU;
  const frames = frameCount(state.duration, state.fps);
  return frames ? state.frame / frames : 0;
}
function stopDemo() {
  state.demoU = null;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  $('play').textContent = 'Play';
}

function paintCurve(ease, u) {
  let d = '';
  for (let i = 0; i <= 64; i++) {
    const x = i / 64;
    d += `${i ? 'L' : 'M'}${X(x).toFixed(2)} ${Y(ease(x)).toFixed(2)}`;
  }
  $('curve').setAttribute('d', d);
  const arms = state.springOn
    ? ''
    : `M${X(0)} ${Y(0)} L${X(state.x1)} ${Y(state.y1)} M${X(1)} ${Y(1)} L${X(state.x2)} ${Y(state.y2)}`;
  $('arms').setAttribute('d', arms);
  const vx = X(u);
  $('vline').setAttribute('x1', vx);
  $('vline').setAttribute('x2', vx);
  $('vline').setAttribute('y1', Y(1));
  $('vline').setAttribute('y2', Y(0));
  $('cdot').setAttribute('cx', vx);
  $('cdot').setAttribute('cy', Y(ease(u)));
  $('end0').setAttribute('cx', X(0));
  $('end0').setAttribute('cy', Y(0));
  $('end1').setAttribute('cx', X(1));
  $('end1').setAttribute('cy', Y(1));
}

function paintLane(eased) {
  const shown = clamp(eased, 0, 1);
  $('lane-bar').style.width = `calc(11px + ${shown} * (100% - 22px))`;
  $('lane-dot').style.left = `calc(${shown} * (100% - 22px))`;
}

function padPlot() {
  const size = $('plot').clientWidth || 280;
  const top = state.springOn ? 8 : Math.max(8, (Math.max(state.y1, state.y2) - 1) * (SPAN / 100) * size + 28);
  const bot = state.springOn ? 8 : Math.max(8, (0 - Math.min(state.y1, state.y2)) * (SPAN / 100) * size + 8);
  $('plot-wrap').style.paddingTop = `${top}px`;
  $('plot-wrap').style.paddingBottom = `${bot}px`;
}

function renderTicks() {
  const key = `${state.duration}:${state.fps}:${state.markers.join(',')}`;
  if (renderTicks.key === key) return;
  renderTicks.key = key;
  const ticks = $('ticks');
  ticks.replaceChildren();
  for (const s of secondMarks(state.duration)) {
    const span = document.createElement('span');
    span.style.left = `calc(14px + (100% - 28px) * ${s / state.duration})`;
    span.textContent = String(s);
    ticks.append(span);
  }
  const pins = $('pins');
  pins.replaceChildren();
  const frames = frameCount(state.duration, state.fps);
  for (const f of state.markers) {
    const mark = document.createElement('i');
    mark.style.left = `calc(14px + (100% - 28px) * ${frames ? f / frames : 0})`;
    pins.append(mark);
  }
}

function renderMarks() {
  const key = `${state.markers.join(',')}|${state.frame}`;
  if (renderMarks.key === key) return;
  renderMarks.key = key;
  const ul = $('marks');
  ul.replaceChildren();
  if (!state.markers.length) {
    const li = document.createElement('li');
    li.textContent = 'No keyframes yet.';
    ul.append(li);
    return;
  }
  for (const f of state.markers) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = f === state.frame ? `Remove ${f}` : `Remove ${f}`;
    b.addEventListener('click', () => {
      state.markers = removeMarker(state.markers, f);
      render();
    });
    li.append(b);
    ul.append(li);
  }
}

function paintCodes() {
  const model = {
    x1: state.x1, y1: state.y1, x2: state.x2, y2: state.y2,
    seconds: state.previewSec,
    house: state.springOn ? null : state.house,
    spring: state.springOn ? ensureSpring() : null,
  };
  setText($('out-css'), cssCode(model));
  setText($('out-waapi'), waapiCode(model));
  setText($('out-gsap'), gsapCode(model));
  setText($('out-film'), filmCode(model));
}

function paintCommands() {
  try {
    const cmd = exportCommands({
      film: state.film, aspect: state.aspect, fps: state.fps, duration: state.duration, mode: state.mode,
    });
    setText($('out-engine'), cmd.engine);
    setText($('out-hand'), cmd.hand);
  } catch (e) {
    setText($('out-engine'), e.message);
    setText($('out-hand'), e.message);
  }
}

function render({ live = false } = {}) {
  const ease = drawn();
  const u = shownU();
  paintCurve(ease, u);
  paintLane(ease(u));
  if (live) return;
  padPlot();
  $('handle-a').hidden = state.springOn;
  $('handle-b').hidden = state.springOn;
  $('bezier-fields').hidden = state.springOn;
  if (!state.springOn) {
    $('handle-a').style.left = `${X(state.x1)}%`;
    $('handle-a').style.top = `${Y(state.y1)}%`;
    $('handle-b').style.left = `${X(state.x2)}%`;
    $('handle-b').style.top = `${Y(state.y2)}%`;
    $('handle-a').setAttribute('aria-label', `First handle, x ${fmt(state.x1)}, y ${fmt(state.y1)}. Arrows nudge. Shift jumps.`);
    $('handle-b').setAttribute('aria-label', `Second handle, x ${fmt(state.x2)}, y ${fmt(state.y2)}. Arrows nudge. Shift jumps.`);
    setVal('x1', fmt(state.x1));
    setVal('y1', fmt(state.y1));
    setVal('x2', fmt(state.x2));
    setVal('y2', fmt(state.y2));
  }
  setVal('zeta', state.zeta);
  setVal('stiff', state.stiffness);
  setVal('preview-sec', state.previewSec);
  setVal('dur', state.duration);
  setVal('dur2', state.duration);
  setVal('film', state.film);
  const info = frameState(state.frame, state.fps, state.duration, ease);
  const scrub = $('scrub');
  scrub.max = String(info.frames);
  if (document.activeElement !== scrub) scrub.value = String(state.frame);
  setText($('frame-no'), `${info.frame} / ${info.frames}`);
  setText($('seconds'), info.seconds.toFixed(3));
  setText($('tc'), info.smpte);
  setText($('eased'), fmt(info.eased));
  const house = $('house-row');
  if (state.house && !state.springOn) {
    house.hidden = false;
    setText($('house-name'), `ease.${state.house}`);
    setText($('house-eased'), fmt(houseFn(state.house)(info.linear)));
  } else house.hidden = true;
  if (state.demoU === null) setText($('play-note'), 'The dot sits on this frame. Play runs the ease on its own.');
  else if (reducedNow()) setText($('play-note'), 'Reduced motion: the dot jumps to the end. Scrub to come back.');
  else setText($('play-note'), 'Preview playing. The ruler stays on its frame.');
  for (const b of document.querySelectorAll('[data-preset]')) b.setAttribute('aria-pressed', String(b.dataset.preset === state.preset));
  for (const b of document.querySelectorAll('[data-fps]')) b.setAttribute('aria-pressed', String(Number(b.dataset.fps) === state.fps));
  for (const b of document.querySelectorAll('[data-aspect]')) b.setAttribute('aria-pressed', String(b.dataset.aspect === state.aspect));
  for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode));
  renderTicks();
  renderMarks();
  paintCodes();
  paintCommands();
}

function setFrame(frame) {
  const max = frameCount(state.duration, state.fps);
  state.frame = clamp(Math.round(frame), 0, max);
  stopDemo();
  render();
}
function setFps(fps) {
  state.fps = fps;
  const max = frameCount(state.duration, state.fps);
  state.frame = Math.min(state.frame, max);
  state.markers = state.markers.filter((f) => f <= max);
  stopDemo();
  render();
}
function setDuration(v) {
  if (!(v > 0)) return;
  state.duration = clamp(v, 0.5, 120);
  const max = frameCount(state.duration, state.fps);
  state.frame = Math.min(state.frame, max);
  state.markers = state.markers.filter((f) => f <= max);
  stopDemo();
  render();
}
function applyPreset(id) {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return;
  stopDemo();
  state.preset = id;
  if (preset.kind === 'spring') {
    state.springOn = true;
    state.house = null;
    render();
    return;
  }
  state.springOn = false;
  const bez = preset.kind === 'css' ? CSS_EASINGS[id] : HOUSE[id].bezier;
  [state.x1, state.y1, state.x2, state.y2] = bez;
  state.house = preset.kind === 'house' ? id : null;
  render();
}
function breakCubic() {
  state.house = null;
  state.springOn = false;
  state.preset = null;
}

function fromPointer(e) {
  const r = $('plot').getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * 100;
  const py = ((e.clientY - r.top) / r.height) * 100;
  return {
    x: clamp(Math.round(((px - IN) / SPAN) * 1000) / 1000, 0, 1),
    y: clamp(Math.round((1 - (py - IN) / SPAN) * 1000) / 1000, -0.5, 1.75),
  };
}
function bindHandle(id, xk, yk) {
  const el = $(id);
  const move = (e) => {
    if (el.dataset.drag !== '1' || state.springOn) return;
    const p = fromPointer(e);
    state[xk] = p.x;
    state[yk] = p.y;
    breakCubic();
    render();
  };
  el.addEventListener('pointerdown', (e) => {
    if (state.springOn) return;
    el.dataset.drag = '1';
    el.setPointerCapture(e.pointerId);
    move(e);
    e.preventDefault();
  });
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', () => { el.dataset.drag = '0'; });
  el.addEventListener('pointercancel', () => { el.dataset.drag = '0'; });
  el.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.1 : 0.01;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!dir || state.springOn) return;
    e.preventDefault();
    state[xk] = clamp(Math.round((state[xk] + dir[0] * step) * 1000) / 1000, 0, 1);
    state[yk] = clamp(Math.round((state[yk] + dir[1] * step) * 1000) / 1000, -0.5, 1.75);
    breakCubic();
    render();
  });
}
function bindNum(id, apply) {
  const el = $(id);
  el.addEventListener('input', () => {
    const v = Number(el.value);
    if (!Number.isFinite(v)) return;
    apply(v);
  });
  el.addEventListener('blur', () => render());
}

function play() {
  if (raf) { stopDemo(); render(); return; }
  if (reducedNow()) {
    state.demoU = state.demoU === 1 ? null : 1;
    render();
    return;
  }
  const t0 = performance.now();
  const ms = Math.max(80, state.previewSec * 1000);
  $('play').textContent = 'Stop';
  const tick = (now) => {
    state.demoU = Math.min(1, (now - t0) / ms);
    render({ live: true });
    if (state.demoU < 1) raf = requestAnimationFrame(tick);
    else { state.demoU = null; raf = 0; $('play').textContent = 'Play'; render(); }
  };
  raf = requestAnimationFrame(tick);
}

function boot() {
  const grid = [];
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    grid.push(`M${X(t)} ${Y(0)} L${X(t)} ${Y(1)} M${X(0)} ${Y(t)} L${X(1)} ${Y(t)}`);
  }
  $('grid').setAttribute('d', grid.join(' '));
  const box = $('box');
  box.setAttribute('x', X(0));
  box.setAttribute('y', Y(1));
  box.setAttribute('width', SPAN);
  box.setAttribute('height', SPAN);
  const clip = $('plot-clip-rect');
  clip.setAttribute('x', X(0));
  clip.setAttribute('y', Y(1));
  clip.setAttribute('width', SPAN);
  clip.setAttribute('height', SPAN);

  const presets = $('presets');
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.preset = p.id;
    b.textContent = p.label;
    b.addEventListener('click', () => applyPreset(p.id));
    presets.append(b);
  }
  for (const root of [$('fps'), $('fps2')]) {
    for (const fps of FPS_LIST) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.fps = String(fps);
      b.textContent = String(fps);
      b.addEventListener('click', () => setFps(fps));
      root.append(b);
    }
  }
  bindHandle('handle-a', 'x1', 'y1');
  bindHandle('handle-b', 'x2', 'y2');
  bindNum('x1', (v) => { state.x1 = clamp(v, 0, 1); breakCubic(); render(); });
  bindNum('y1', (v) => { state.y1 = clamp(v, -0.5, 1.75); breakCubic(); render(); });
  bindNum('x2', (v) => { state.x2 = clamp(v, 0, 1); breakCubic(); render(); });
  bindNum('y2', (v) => { state.y2 = clamp(v, -0.5, 1.75); breakCubic(); render(); });
  bindNum('zeta', (v) => {
    state.zeta = clamp(v, 0.05, 2);
    state.spring = null;
    state.springOn = true;
    state.house = null;
    state.preset = 'spring';
    render();
  });
  bindNum('stiff', (v) => {
    state.stiffness = clamp(v, 20, 800);
    state.spring = null;
    state.springOn = true;
    state.house = null;
    state.preset = 'spring';
    render();
  });
  bindNum('preview-sec', (v) => { state.previewSec = clamp(v, 0.1, 8); render(); });
  bindNum('dur', setDuration);
  bindNum('dur2', setDuration);
  $('film').addEventListener('input', () => { state.film = $('film').value.trim(); render(); });
  $('scrub').addEventListener('input', () => setFrame(Number($('scrub').value)));
  $('scrub').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setFrame(state.frame + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1));
  });
  $('play').addEventListener('click', play);
  $('add-mark').addEventListener('click', () => { state.markers = addMarker(state.markers, state.frame); render(); });
  $('del-mark').addEventListener('click', () => { state.markers = removeMarker(state.markers, state.frame); render(); });
  for (const b of document.querySelectorAll('[data-aspect]')) b.addEventListener('click', () => { state.aspect = b.dataset.aspect; render(); });
  for (const b of document.querySelectorAll('[data-mode]')) b.addEventListener('click', () => { state.mode = b.dataset.mode; render(); });
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest?.('[data-copy]');
    if (!btn) return;
    const map = { css: 'out-css', waapi: 'out-waapi', gsap: 'out-gsap', film: 'out-film', engine: 'out-engine', hand: 'out-hand' };
    const text = $(map[btn.dataset.copy]).textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
      $('status').textContent = 'Copied';
    } catch {
      const range = document.createRange();
      range.selectNodeContents($(map[btn.dataset.copy]));
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = 'Selected';
      $('status').textContent = 'Code selected';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
  });
  render();
}

boot();
