// Console controls: knobs and faders that work with touch, mouse, keyboard and MIDI learn.
// RTL: horizontal faders fill from right to left (value 0 sits on the right, deck A's side).

export const registry = new Map();
let learnHook = null;
export function setLearnHook(fn) { learnHook = fn; document.body.classList.toggle('learning', !!fn); }

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}

const clamp = (v) => Math.max(0, Math.min(1, v));
const pct = (v) => `${Math.round(v * 100)}`;

function learnable(el, id) {
  if (!id) return false;
  el.dataset.midi = id;
  return true;
}

function intercept(id) {
  if (learnHook && id) { learnHook(id); return true; }
  return false;
}

export class Knob {
  constructor({ id, label, value = 0.5, def = value, color, format = pct, onInput, small, bipolar }) {
    this.v = value; this.def = def; this.format = format; this.onInput = onInput; this.bipolar = bipolar;
    const r = 15, C = 2 * Math.PI * r, arc = C * 0.75;
    this.arc = arc; this.C = C;
    this.svgVal = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    for (const c of [track, this.svgVal]) { c.setAttribute('cx', 20); c.setAttribute('cy', 20); c.setAttribute('r', r); c.setAttribute('fill', 'none'); c.setAttribute('transform', 'rotate(135 20 20)'); }
    track.setAttribute('class', 'k-track'); track.setAttribute('stroke-dasharray', `${arc} ${C}`);
    this.svgVal.setAttribute('class', 'k-val');
    this.dot = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.dot.setAttribute('x1', 20); this.dot.setAttribute('y1', 20); this.dot.setAttribute('x2', 20); this.dot.setAttribute('y2', 9); this.dot.setAttribute('class', 'k-dot');
    svg.append(track, this.svgVal, this.dot);
    this.readout = h('span', { class: 'k-read' });
    this.el = h('div', { class: `knob${small ? ' small' : ''}`, role: 'slider', tabindex: 0, 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, style: color ? { '--kc': color } : null },
      svg, h('span', { class: 'k-label' }, label), this.readout);
    learnable(this.el, id);
    let start = null;
    this.el.addEventListener('pointerdown', (e) => {
      if (intercept(id)) return;
      this.el.setPointerCapture(e.pointerId); start = { y: e.clientY, x: e.clientX, v: this.v }; this.el.classList.add('active');
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const d = (start.y - e.clientY + (e.clientX - start.x) * 0.3) / (e.shiftKey ? 600 : 180);
      this.set(start.v + d);
    });
    const end = () => { start = null; this.el.classList.remove('active'); };
    this.el.addEventListener('pointerup', end); this.el.addEventListener('pointercancel', end);
    this.el.addEventListener('dblclick', () => this.set(this.def));
    this.el.addEventListener('keydown', (e) => {
      const step = { ArrowUp: 0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowLeft: -0.02, PageUp: 0.1, PageDown: -0.1 }[e.key];
      if (step) { this.set(this.v + step); e.preventDefault(); }
      if (e.key === 'Home') this.set(0); if (e.key === 'End') this.set(1);
    });
    if (id) registry.set(id, { kind: 'range', set: (v) => this.set(v), el: this.el, label });
    this.sync(value);
  }

  set(v) { this.sync(v); this.onInput && this.onInput(this.v); }

  sync(v) {
    this.v = clamp(v);
    const len = this.arc * this.v;
    if (this.bipolar) {
      const mid = this.arc / 2, a = Math.min(mid, len), b = Math.abs(len - mid);
      this.svgVal.setAttribute('stroke-dasharray', `0 ${a} ${b} ${this.C}`);
    } else this.svgVal.setAttribute('stroke-dasharray', `${len} ${this.C}`);
    this.dot.setAttribute('transform', `rotate(${-135 + this.v * 270} 20 20)`);
    this.el.setAttribute('aria-valuenow', Math.round(this.v * 100));
    this.readout.textContent = this.format(this.v);
  }
}

export class Fader {
  constructor({ id, label, value = 0.5, def = value, vertical, color, onInput, format = pct, center, wide }) {
    this.v = value; this.def = def; this.vertical = vertical; this.onInput = onInput; this.format = format;
    this.fill = h('span', { class: 'f-fill' });
    this.thumb = h('span', { class: 'f-thumb' });
    this.track = h('span', { class: 'f-track' }, this.fill, center ? h('span', { class: 'f-center' }) : null, this.thumb);
    this.readout = h('span', { class: 'f-read' });
    this.el = h('div', { class: `fader ${vertical ? 'v' : 'h'}${wide ? ' wide' : ''}`, role: 'slider', tabindex: 0, 'aria-label': label, 'aria-orientation': vertical ? 'vertical' : 'horizontal', style: color ? { '--fc': color } : null },
      h('span', { class: 'f-label' }, label), this.track, this.readout);
    learnable(this.el, id);
    const fromEvent = (e) => {
      const r = this.track.getBoundingClientRect();
      if (vertical) return 1 - (e.clientY - r.top) / r.height;
      const rtl = getComputedStyle(this.el).direction === 'rtl';
      const x = (e.clientX - r.left) / r.width;
      return rtl ? 1 - x : x;
    };
    let drag = false;
    this.track.addEventListener('pointerdown', (e) => {
      if (intercept(id)) return;
      drag = true; this.track.setPointerCapture(e.pointerId); this.set(fromEvent(e)); this.el.classList.add('active');
    });
    this.track.addEventListener('pointermove', (e) => { if (drag) this.set(fromEvent(e)); });
    const end = () => { drag = false; this.el.classList.remove('active'); };
    this.track.addEventListener('pointerup', end); this.track.addEventListener('pointercancel', end);
    this.el.addEventListener('dblclick', () => this.set(this.def));
    this.el.addEventListener('keydown', (e) => {
      const rtl = getComputedStyle(this.el).direction === 'rtl';
      const map = { ArrowUp: 0.02, ArrowDown: -0.02, ArrowRight: rtl ? -0.02 : 0.02, ArrowLeft: rtl ? 0.02 : -0.02, PageUp: 0.1, PageDown: -0.1 };
      if (map[e.key] != null) { this.set(this.v + map[e.key]); e.preventDefault(); }
    });
    if (id) registry.set(id, { kind: 'range', set: (v) => this.set(v), el: this.el, label });
    this.sync(value);
  }

  set(v) { this.sync(v); this.onInput && this.onInput(this.v); }

  sync(v) {
    this.v = clamp(v);
    this.el.style.setProperty('--v', this.v);
    this.el.setAttribute('aria-valuenow', Math.round(this.v * 100));
    this.readout.textContent = this.format(this.v);
  }
}

// momentary or toggle button; hold buttons fire onPress/onRelease (pads, nudge, strobe)
export function btn(label, { id, cls = '', title, onPress, onRelease, hold, kbd, toggle, pressed } = {}) {
  const el = h('button', { type: 'button', class: `btn ${cls}`, title, 'aria-pressed': toggle ? String(!!pressed) : null }, label, kbd ? h('kbd', {}, kbd) : null);
  learnable(el, id);
  const press = (on) => {
    if (on) { el.classList.add('down'); onPress && onPress(); }
    else { el.classList.remove('down'); onRelease && onRelease(); }
  };
  if (hold) {
    el.addEventListener('pointerdown', (e) => { if (intercept(id)) return; el.setPointerCapture(e.pointerId); press(true); });
    el.addEventListener('pointerup', () => press(false));
    el.addEventListener('pointercancel', () => press(false));
    el.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { press(true); e.preventDefault(); } });
    el.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') press(false); });
  } else {
    el.addEventListener('click', () => { if (intercept(id)) return; onPress && onPress(); });
  }
  if (id) registry.set(id, { kind: 'button', el, label: typeof label === 'string' ? label : id, press: (on, isNote) => { if (hold) press(on); else if (on) onPress && onPress(); void isNote; } });
  return el;
}

export function setPressed(el, on) { el.setAttribute('aria-pressed', String(!!on)); }

export function select(options, value, onChange, { label, id } = {}) {
  const s = h('select', { 'aria-label': label, id });
  for (const [v, t] of Object.entries(options)) s.append(h('option', { value: v }, t));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return label ? h('label', { class: 'sel' }, h('span', {}, label), s) : s;
}

export function seg(options, value, onChange, { label, cls = '' } = {}) {
  const wrap = h('div', { class: `seg ${cls}`, role: 'radiogroup', 'aria-label': label });
  const buttons = {};
  for (const [v, t] of Object.entries(options)) {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(String(v) === String(value)) }, t);
    b.addEventListener('click', () => { wrap.set(v); onChange(v); });
    buttons[v] = b; wrap.append(b);
  }
  wrap.set = (v) => { for (const [k, b] of Object.entries(buttons)) b.setAttribute('aria-checked', String(String(k) === String(v))); };
  return label ? h('div', { class: 'seg-wrap' }, h('span', { class: 'seg-label' }, label), wrap) : wrap;
}

export function toast(msg, ms = 2600) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}
