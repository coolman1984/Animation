// The console: top bar, performance pads, and seven tabs (decks & mixer, FX, lights, camera, layers,
// recording, settings). Everything talks to the app through a small API (see main.js).
import { btn, Fader, h, Knob, registry, seg, select, setLearnHook, setPressed, toast } from './controls.js';
import { DeckView, SECTION_AR } from './deckview.js';
import { PALETTES, CHASES } from '../visual/show.js';
import { SHOTS } from '../visual/director.js';
import { TRANSITIONS } from '../visual/post.js';
import { WORLDS } from '../visual/worlds.js';
import { GATE_PATTERNS } from '../audio/fx.js';

const VJ_PROGS = { 1: 'نفق', 2: 'دوائر', 3: 'طيف الصوت', 4: 'ماسح', 5: 'نجوم', 6: 'خلايا سداسية', 7: 'بلازما', 8: 'مشكال' };
const TRANS_AR = { auto: 'تلقائي حسب اللحظة', cut: 'قطع', dissolve: 'ذوبان', flash: 'وميض أبيض', whip: 'لفّة سريعة', glitch: 'تشويش', iris: 'دايرة نور', zoom: 'زووم للداخل', slices: 'شرائح', luma: 'إضاءة أولاً', pixel: 'بكسلات' };
export const FORMATS = {
  screen: { name: 'مقاس الشاشة' }, yt: { name: 'يوتيوب ١٠٨٠', w: 1920, h: 1080 }, reel: { name: 'ريلز ٩:١٦', w: 1080, h: 1920 },
  square: { name: 'مربع', w: 1080, h: 1080 }, k4: { name: '٤K', w: 3840, h: 2160 },
};

export function buildUI(app) {
  const S = app.state;
  const root = document.getElementById('ui');
  const views = {};

  // ---------------------------------------------------------------- top bar
  const worldBtns = Object.entries(WORLDS).map(([k, w]) => {
    const b = btn(w.name, { id: `world.${k}`, cls: 'chip', kbd: w.key, toggle: true, pressed: S.world === k, onPress: () => app.setWorld(k) });
    b.dataset.k = k;
    return b;
  });
  const bpmBig = h('span', { class: 'mono big' }, '---');
  const secTag = h('span', { class: 'sec-tag' }, SECTION_AR.idle);
  const barTag = h('span', { class: 'mono bar-tag' }, '');
  const recDot = h('span', { class: 'rec-dot' });
  const recTime = h('span', { class: 'mono rec-time' }, '');
  const recBtn = btn([recDot, h('span', {}, 'تسجيل'), recTime], { id: 'rec.video', cls: 'rec', kbd: 'R', title: 'سجّل فيديو بالصوت', onPress: () => app.toggleVideo() });
  const fpsTag = h('span', { class: 'mono fps', hidden: !S.showFps }, '');
  const top = h('header', { class: 'topbar' },
    h('div', { class: 'brand' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { class: 'b-name' }, 'ترانس بلس'), h('span', { class: 'b-sub' }, 'ستوديو الحفلات')),
    h('nav', { class: 'worlds', 'aria-label': 'العوالم' }, ...worldBtns),
    h('div', { class: 'status', 'aria-live': 'polite' }, h('span', { class: 'bpm-wrap' }, bpmBig, h('small', {}, 'BPM')), secTag, barTag, fpsTag),
    h('div', { class: 'actions' }, recBtn,
      btn('لقطة', { id: 'shot', kbd: 'O', title: 'صورة PNG من الشاشة', onPress: () => app.screenshot() }),
      btn('إخفاء', { kbd: 'H', title: 'إخفاء الواجهة (اضغط H أو المس الشاشة مرتين للرجوع)', onPress: () => app.hideUI(true) }),
      btn('ملء الشاشة', { title: 'ملء الشاشة', onPress: () => app.fullscreen() }),
      btn('؟', { cls: 'help-btn', title: 'الاختصارات', onPress: () => help.showModal() })));

  // ---------------------------------------------------------------- performance pads
  const pad = (label, key, opts) => btn(label, { cls: `pad ${opts.cls || ''}`, kbd: key.toUpperCase(), ...opts });
  const pads = h('div', { class: 'pads', role: 'toolbar', 'aria-label': 'أزرار العرض' },
    pad('الدروب', 'd', { id: 'pad.drop', cls: 'drop', title: 'دروب: وميض، لهب، دخان، قصاصات وصوت ضربة', onPress: () => app.fire('drop', { manual: true }) }),
    pad('ستروب', 's', { id: 'pad.strobe', hold: true, onPress: () => app.hold('strobe', true), onRelease: () => app.hold('strobe', false) }),
    pad('بلايندر', 'b', { id: 'pad.blinder', hold: true, onPress: () => app.hold('blinder', true), onRelease: () => app.hold('blinder', false) }),
    pad('ليزر', 'l', { id: 'pad.laser', hold: true, onPress: () => app.hold('laser', true), onRelease: () => app.hold('laser', false) }),
    pad('لهب', 'p', { id: 'pad.pyro', onPress: () => app.fire('pyro') }),
    pad('دخان ثلج', 'c', { id: 'pad.co2', onPress: () => app.fire('co2') }),
    pad('قصاصات', 'j', { id: 'pad.confetti', onPress: () => app.fire('confetti') }),
    pad('ألعاب نارية', 'f', { id: 'pad.fireworks', onPress: () => app.fire('fireworks') }),
    pad('رايزر', 'u', { id: 'pad.riser', hold: true, title: 'اضغط واستمر يعلّي التوتر، سيب يضرب الدروب', onPress: () => app.riser(true), onRelease: () => app.riser(false) }),
    pad('تعتيم', 'k', { id: 'pad.blackout', hold: true, onPress: () => app.hold('blackout', true), onRelease: () => app.hold('blackout', false) }),
    pad('تشويش', 'g', { id: 'pad.glitch', hold: true, onPress: () => app.hold('glitch', true), onRelease: () => app.hold('glitch', false) }));

  // ---------------------------------------------------------------- tabs
  const tabs = [
    ['decks', 'الديكات'], ['fx', 'المؤثرات'], ['lights', 'الإضاءة'], ['camera', 'الكاميرا'], ['layers', 'الطبقات'], ['rec', 'التسجيل'], ['settings', 'الإعدادات'],
  ];
  const tabBar = h('div', { class: 'tabs', role: 'tablist' });
  const panes = h('div', { class: 'panes' });
  const tabEls = {};
  const paneEls = {};
  for (const [k, label] of tabs) {
    const t = h('button', { type: 'button', role: 'tab', id: `tab-${k}`, 'aria-controls': `pane-${k}`, 'aria-selected': 'false' }, label);
    t.addEventListener('click', () => openTab(k));
    tabEls[k] = t; tabBar.append(t);
    const p = h('div', { class: `pane pane-${k}`, role: 'tabpanel', id: `pane-${k}`, 'aria-labelledby': `tab-${k}`, hidden: true });
    paneEls[k] = p; panes.append(p);
  }
  const collapse = btn('⌄', { cls: 'collapse', title: 'صغّر / كبّر اللوحة', onPress: () => { consoleEl.classList.toggle('min'); app.resize(); } });
  tabBar.append(collapse);
  let current = null;
  function openTab(k) {
    if (current === k && !consoleEl.classList.contains('min')) { consoleEl.classList.add('min'); return; }
    consoleEl.classList.remove('min');
    current = k;
    for (const [kk, t] of Object.entries(tabEls)) { t.setAttribute('aria-selected', String(kk === k)); paneEls[kk].hidden = kk !== k; }
    try { localStorage.setItem('rave-tab', k); } catch { /* fine */ }
  }
  const consoleEl = h('section', { class: 'console', 'aria-label': 'لوحة التحكم' }, tabBar, panes);

  // ---------------------------------------------------------------- decks & mixer
  const dA = new DeckView(app, 0), dB = new DeckView(app, 1);
  views.decks = [dA, dB];
  const chan = (i) => {
    const d = () => app.deck(i);
    const col = i === 0 ? '#3fe0ff' : '#ff9a3c';
    const knob = (name, label, bip) => new Knob({ id: `mix${i}.${name}`, label, value: 0.5, def: 0.5, color: col, small: true, bipolar: bip,
      format: name === 'filter' ? (v) => (v < 0.48 ? 'منخفض' : v > 0.52 ? 'عالي' : '—') : (v) => (v <= 0.02 ? 'قطع' : `${Math.round((v - 0.5) * 2 * 100)}`),
      onInput: (v) => app.withDeck(i, (dd) => dd.setKnob(name, v)) });
    const k = { trim: knob('trim', 'كسب', true), high: knob('high', 'حاد', true), mid: knob('mid', 'وسط', true), low: knob('low', 'بيز', true), filter: knob('filter', 'فلتر', true) };
    const fader = new Fader({ id: `mix${i}.fader`, label: i === 0 ? 'أ' : 'ب', value: 0.85, def: 0.85, vertical: true, color: col, onInput: (v) => app.withDeck(i, (dd) => dd.setKnob('fader', v)) });
    const vu = h('span', { class: 'vu' }, h('i'));
    views[`chan${i}`] = { k, fader, vu, d };
    return h('div', { class: `chan chan-${i}` }, k.trim.el, k.high.el, k.mid.el, k.low.el, k.filter.el, h('div', { class: 'fader-vu' }, fader.el, vu));
  };
  const xf = new Fader({ id: 'mix.xf', label: 'الكروس فيدر', value: 0, def: 0.5, wide: true, format: (v) => (v < 0.05 ? 'أ' : v > 0.95 ? 'ب' : 'نص'), onInput: (v) => { app.engine.setCrossfader(v); app.engine.cancelAutoMix(); } });
  views.xf = xf;
  const master = new Knob({ id: 'mix.master', label: 'الماستر', value: 0.92, def: 0.92, onInput: (v) => app.engine.setMasterVolume(v) });
  const autoBars = { v: 16 };
  const autoBtn = btn('انتقال تلقائي', { id: 'mix.auto', cls: 'auto', kbd: 'T', title: 'الديك التاني يدخل متزامن، تبديل البيز في النص، والكروس فيدر يتحرك لوحده', onPress: () => app.autoMix(autoBars.v) });
  views.autoBtn = autoBtn;
  const lib = h('ul', { class: 'lib', 'aria-label': 'المكتبة' });
  const libInput = h('input', { type: 'file', accept: 'audio/*', multiple: true, hidden: true });
  libInput.addEventListener('change', () => { for (const f of libInput.files) addLib(f); libInput.value = ''; });
  function addLib(f) {
    const li = h('li', {}, h('span', { class: 'lib-name', title: f.name }, f.name.replace(/\.[^.]+$/, '')),
      btn('أ', { cls: 'lib-a', title: 'حمّل على ديك أ', onPress: () => app.loadFile(0, f) }),
      btn('ب', { cls: 'lib-b', title: 'حمّل على ديك ب', onPress: () => app.loadFile(1, f) }));
    lib.append(li);
  }
  views.addLib = addLib;
  const mixer = h('section', { class: 'mixer', 'aria-label': 'الميكسر' },
    h('div', { class: 'chans' }, chan(0), h('div', { class: 'mix-mid' }, master.el, h('span', { class: 'vu master-vu' }, h('i'))), chan(1)),
    h('div', { class: 'xf-row' }, xf.el),
    h('div', { class: 'd-row' }, seg({ smooth: 'ناعم', full: 'كامل', cut: 'قطع' }, 'smooth', (v) => { app.engine.xfCurve = v; app.engine.applyCrossfader(); }, { label: 'منحنى' })),
    h('div', { class: 'd-row' }, autoBtn, seg({ 8: '٨', 16: '١٦', 32: '٣٢' }, 16, (v) => { autoBars.v = Number(v); }, { label: 'بار' })),
    h('div', { class: 'lib-wrap' }, h('div', { class: 'd-row' }, h('strong', {}, 'المكتبة'), btn('أضف ملفات', { onPress: () => libInput.click() }), libInput), lib));
  paneEls.decks.append(h('div', { class: 'decks-grid' }, dA.el, mixer, dB.el));

  // ---------------------------------------------------------------- FX
  const fx = () => app.engine.fx;
  const unit = (key, title, parts) => {
    const on = btn(title, { id: `fx.${key}.on`, cls: 'fx-on', toggle: true, onPress: () => app.withAudio(() => { const st = fx().state[key]; fx().set(key, { on: !st.on }); setPressed(on, !st.on); }) });
    views[`fx_${key}`] = on;
    return h('div', { class: 'fx-unit' }, on, ...parts);
  };
  const fxKnob = (key, prop, label, v, map = (x) => x) => new Knob({ id: `fx.${key}.${prop}`, label, value: v, small: true, onInput: (x) => app.withAudio(() => fx().set(key, { [prop]: map(x) })) }).el;
  const filterKnob = new Knob({ id: 'fx.filter', label: 'فلتر الماستر', value: 0.5, def: 0.5, bipolar: true, format: (v) => (v < 0.48 ? 'منخفض' : v > 0.52 ? 'عالي' : 'مفتوح'), onInput: (v) => app.withAudio(() => fx().setFilter(v)) });
  paneEls.fx.append(h('div', { class: 'fx-grid' },
    h('div', { class: 'fx-unit big' }, filterKnob.el, h('p', { class: 'hint' }, 'لف شمال يقفل الحاد، يمين يشيل البيز. دبل كليك يرجّعه مفتوح.')),
    unit('echo', 'صدى', [fxKnob('echo', 'amount', 'الكمية', 0.5), fxKnob('echo', 'feedback', 'التكرار', 0.45, (x) => x * 0.9),
      select({ '1/4': '¼ نبضة', '1/2': '½ نبضة', '3/4': '¾ نبضة', 1: 'نبضة', 2: 'نبضتين' }, '3/4', (v) => app.withAudio(() => fx().set('echo', { div: v })), { label: 'المسافة' })]),
    unit('reverb', 'قاعة', [fxKnob('reverb', 'amount', 'الكمية', 0.5)]),
    unit('flanger', 'فلانجر', [fxKnob('flanger', 'amount', 'الكمية', 0.6), fxKnob('flanger', 'rate', 'السرعة', 0.2)]),
    unit('crush', 'تكسير', [fxKnob('crush', 'amount', 'الكمية', 0.6), select({ 4: '٤ بت', 6: '٦ بت', 8: '٨ بت' }, '6', (v) => app.withAudio(() => fx().setCrushBits(Number(v))), { label: 'الدقة' })]),
    unit('gate', 'تقطيع ترانس', [fxKnob('gate', 'depth', 'العمق', 0.85), select(Object.fromEntries(Object.keys(GATE_PATTERNS).map((k) => [k, { classic: 'كلاسيك', pulse: 'نبض', stutter: 'تلعثم', half: 'نص' }[k]])), 'classic', (v) => app.withAudio(() => fx().set('gate', { pattern: v })), { label: 'الإيقاع' })]),
    h('div', { class: 'fx-unit' }, h('strong', {}, 'أدوات العرض'),
      btn('رايزر (اضغط واستمر)', { id: 'fx.riser', hold: true, onPress: () => app.riser(true), onRelease: () => app.riser(false) }),
      btn('ضربة', { id: 'fx.impact', onPress: () => app.withAudio(() => fx().impact()) }))));

  // ---------------------------------------------------------------- lights
  const masters = [['lasers', 'الليزر'], ['beams', 'الحزم'], ['strobe', 'الستروب'], ['blinders', 'البلايندر'], ['led', 'الشاشات'], ['haze', 'الدخان'], ['pyro', 'اللهب'], ['crowd', 'الجمهور']];
  const swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'الألوان' });
  const colorInputs = [0, 1, 2].map((i) => {
    const inp = h('input', { type: 'color', value: S.colors[i], 'aria-label': `اللون ${i + 1}` });
    inp.addEventListener('input', () => app.setColor(i, inp.value));
    return inp;
  });
  views.colorInputs = colorInputs;
  const drawSwatches = () => {
    swatches.innerHTML = '';
    for (const [k, p] of Object.entries(PALETTES)) {
      const b = h('button', { type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(S.palette === k), title: p.name, style: { '--a': p.c[0], '--b': p.c[1], '--c': p.c[2] } }, h('span', {}, p.name));
      b.addEventListener('click', () => { app.setPalette(k); drawSwatches(); colorInputs.forEach((c, i) => { c.value = S.colors[i]; }); });
      swatches.append(b);
    }
  };
  drawSwatches();
  views.drawSwatches = drawSwatches;
  const tog = (label, key, obj = S) => {
    const b = btn(label, { cls: 'tog', toggle: true, pressed: obj[key], onPress: () => { obj[key] = !obj[key]; setPressed(b, obj[key]); app.saveState(); } });
    return b;
  };
  paneEls.lights.append(h('div', { class: 'lights-grid' },
    h('div', { class: 'block' }, h('h3', {}, 'البرنامج'),
      seg({ auto: 'تلقائي مع المزيكا', manual: 'يدوي' }, S.program, (v) => { S.program = v; app.saveState(); }),
      select(CHASES, S.chase, (v) => { S.chase = v; app.saveState(); }, { label: 'حركة الحزم' }),
      select({ auto: 'تلقائي', fan: 'مروحة', tunnel: 'نفق', scan: 'ماسح', crisscross: 'متقاطع', sheet: 'سقف ليزر' }, S.laserChase, (v) => { S.laserChase = v; app.saveState(); }, { label: 'شكل الليزر' }),
      seg({ 0.5: '×½', 1: '×١', 2: '×٢' }, S.speed, (v) => { S.speed = Number(v); app.saveState(); }, { label: 'السرعة' }),
      select({ 0: 'تلقائي', ...VJ_PROGS }, String(S.ledProgram), (v) => { S.ledProgram = Number(v); app.saveState(); }, { label: 'محتوى الشاشات' })),
    h('div', { class: 'block' }, h('h3', {}, 'الماسترز'), h('div', { class: 'masters' }, ...masters.map(([k, label]) => new Fader({ id: `master.${k}`, label, value: S.master[k], vertical: true, onInput: (v) => { S.master[k] = v; app.saveState(); } }).el))),
    h('div', { class: 'block' }, h('h3', {}, 'الألوان'), swatches, h('div', { class: 'd-row' }, ...colorInputs, tog('تبديل الألوان كل فقرة', 'colorDrift'), tog('الألوان تتبع العالم', 'paletteFollowWorld'))),
    h('div', { class: 'block' }, h('h3', {}, 'لحظات تلقائية'), h('div', { class: 'd-row wrap' }, tog('دروب مع المزيكا', 'autoDrop'), tog('لهب كل ٨ بار', 'autoPyro'), tog('قصاصات في الدروب', 'autoConfetti'), tog('ألعاب نارية في الدروب', 'autoFireworks'), tog('الاسم على الشاشات', 'onLed', S.titles)))));

  // ---------------------------------------------------------------- camera
  const modeSeg = seg({ auto: 'مخرج تلقائي', shot: 'لقطة ثابتة', free: 'كاميرا حرة' }, app.director.mode, (v) => app.director.setMode(v), { label: 'الوضع' });
  const shotBtns = Object.entries(SHOTS).map(([k, label]) => {
    const b = btn(label, { id: `cam.${k}`, cls: 'shot', toggle: true, onPress: () => { app.director.setMode('shot'); app.director.cut(k, app.engine.clock, { beats: 32 }); } });
    b.dataset.k = k;
    return b;
  });
  app.director.onChange((mode, shot) => { modeSeg.querySelector('.seg').set(mode); shotBtns.forEach((b) => setPressed(b, b.dataset.k === shot && mode !== 'free')); });
  const D = app.director.settings;
  paneEls.camera.append(h('div', { class: 'cam-grid' },
    h('div', { class: 'block' }, modeSeg, h('div', { class: 'shots' }, ...shotBtns), btn('اللقطة الجاية', { id: 'cam.next', kbd: 'V', onPress: () => app.nextShot() })),
    h('div', { class: 'block' },
      select(TRANS_AR, D.transition, (v) => { D.transition = v; S.camera.transition = v; app.saveState(); }, { label: 'الانتقال بين اللقطات' }),
      btn('جرّب الانتقال', { onPress: () => app.nextShot() }),
      select({ auto: 'حسب المزيكا', 1: 'كل بار', 2: 'كل ٢ بار', 4: 'كل ٤ بار', 8: 'كل ٨ بار', 16: 'كل ١٦ بار' }, String(D.cutEvery), (v) => { D.cutEvery = v; S.camera.cutEvery = v; app.saveState(); }, { label: 'القطع' })),
    h('div', { class: 'block row-knobs' },
      new Knob({ id: 'cam.shake', label: 'اهتزاز', value: D.shake, onInput: (v) => { D.shake = v; S.camera.shake = v; app.saveState(); } }).el,
      new Knob({ id: 'cam.punch', label: 'نبض العدسة', value: D.punch, onInput: (v) => { D.punch = v; S.camera.punch = v; app.saveState(); } }).el,
      h('p', { class: 'hint' }, 'الكاميرا الحرة: اسحب بصباع أو ماوس للف، صباعين أو العجلة للتقريب، والأسهم للحركة.'))));

  // ---------------------------------------------------------------- layers
  const P = S.post;
  const pk = (key, label, def, map = (v) => v, inv = (v) => v, fmt) => new Knob({ id: `post.${key}`, label, value: inv(P[key]), def: inv(def), small: true, format: fmt, onInput: (v) => { P[key] = map(v); app.applyPost(); } }).el;
  const layer = (title, eye, ...body) => h('div', { class: 'layer' }, h('div', { class: 'layer-head' }, eye || h('span', { class: 'eye-fixed' }), h('strong', {}, title)), h('div', { class: 'layer-body' }, ...body));
  const eye = (obj, key, label) => { const b = btn('👁', { cls: 'eye', toggle: true, pressed: obj[key], title: `إظهار ${label}`, onPress: () => { obj[key] = !obj[key]; setPressed(b, obj[key]); app.applyPost(); app.saveState(); } }); return b; };
  const T = S.titles;
  const txt = (label, key) => { const i = h('input', { type: 'text', value: T[key], 'aria-label': label, dir: 'auto' }); i.addEventListener('input', () => { T[key] = i.value; app.applyTitles(); }); return h('label', { class: 'txt' }, h('span', {}, label), i); };
  const logoIn = h('input', { type: 'file', accept: 'image/*', hidden: true });
  logoIn.addEventListener('change', () => { const f = logoIn.files[0]; if (f) app.setLogo(f); logoIn.value = ''; });
  const V = S.vj;
  paneEls.layers.append(h('div', { class: 'layers' },
    layer('العناوين واللوجو', eye(T, 'show', 'العناوين'), txt('اسم الحفلة', 'party'), txt('اسم الدي جي', 'dj'), txt('كلمة الدروب', 'word'),
      h('div', { class: 'd-row' }, tog('الشريط السفلي', 'lower', T), btn('ارفع لوجو', { onPress: () => logoIn.click() }), btn('شيل اللوجو', { onPress: () => app.setLogo(null) }), logoIn),
      new Knob({ id: 'layer.titles', label: 'الشفافية', value: T.opacity, small: true, onInput: (v) => { T.opacity = v; app.applyPost(); } }).el),
    layer('طبقة في جي فوق المشهد', null,
      select(VJ_PROGS, String(V.program), (v) => { V.program = Number(v); app.applyPost(); }, { label: 'البرنامج' }),
      seg({ 0: 'جمع', 1: 'شاشة', 2: 'ضرب', 3: 'فرق' }, V.blend, (v) => { V.blend = Number(v); app.applyPost(); }, { label: 'الدمج' }),
      new Knob({ id: 'layer.vj', label: 'الشفافية', value: V.opacity, small: true, onInput: (v) => { V.opacity = v; app.applyPost(); } }).el),
    layer('مؤثرات الصورة', null,
      seg({ 0: 'بدون', 1: 'مراية', 2: 'مقلوب', 3: 'رباعي', 4: 'مشكال' }, P.mirror, (v) => { P.mirror = Number(v); app.applyPost(); }, { label: 'مراية' }),
      h('div', { class: 'row-knobs' }, pk('trails', 'ذيول', 0, (v) => v * 0.94, (v) => v / 0.94), pk('glitch', 'تشويش', 0), pk('chroma', 'انكسار ألوان', 0.3), pk('grain', 'حبيبات', 0.25), pk('vignette', 'إطار غامق', 0.55), pk('letterbox', 'شريط سينما', 0))),
    layer('التلوين', null, h('div', { class: 'row-knobs' },
      pk('exposure', 'الإضاءة', 1, (v) => 0.4 + v * 1.2, (v) => (v - 0.4) / 1.2), pk('contrast', 'التباين', 1.05, (v) => 0.6 + v * 0.9, (v) => (v - 0.6) / 0.9),
      pk('saturation', 'التشبع', 1.1, (v) => v * 2, (v) => v / 2), pk('hue', 'درجة اللون', 0, (v) => (v - 0.5) * Math.PI * 2, (v) => v / (Math.PI * 2) + 0.5))),
    layer('التوهج', null, h('div', { class: 'row-knobs' },
      pk('bloom', 'القوة', 0.9, (v) => v * 2.5, (v) => v / 2.5), pk('bloomRadius', 'الانتشار', 0.55), pk('bloomThreshold', 'العتبة', 0.62))),
    layer('العالم ثلاثي الأبعاد', null, h('p', { class: 'hint' }, 'بلندر نحت البوابة والتراس والسماعات والجمهور؛ المحرك بيرسمهم مباشر مع الحزم والدخان والجزيئات.'),
      new Knob({ id: 'layer.crowd', label: 'كثافة الجمهور', value: S.crowd, small: true, onInput: (v) => { S.crowd = v; app.applyQuality(); } }).el)));

  // ---------------------------------------------------------------- record
  const takes = h('ul', { class: 'takes', 'aria-label': 'التسجيلات' });
  views.takes = takes;
  const R = S.rec;
  const wavBtn = btn('سجّل المكس (WAV)', { id: 'rec.wav', cls: 'rec2', onPress: () => app.toggleWav() });
  views.wavBtn = wavBtn;
  const recBig = btn('سجّل فيديو', { cls: 'rec2 big', onPress: () => app.toggleVideo() });
  views.recBig = recBig;
  paneEls.rec.append(h('div', { class: 'rec-grid' },
    h('div', { class: 'block' }, h('h3', {}, 'الإطار'),
      seg(Object.fromEntries(Object.entries(FORMATS).map(([k, f]) => [k, f.name])), R.format, (v) => { R.format = v; app.resize(); app.saveState(); }),
      seg({ 30: '٣٠ إطار', 60: '٦٠ إطار' }, R.fps, (v) => { R.fps = Number(v); app.saveState(); }, { label: 'السلاسة' }),
      seg({ 8: 'خفيف', 16: 'عالي', 30: 'ماستر' }, R.mbps, (v) => { R.mbps = Number(v); app.saveState(); }, { label: 'الجودة' }),
      h('div', { class: 'd-row' }, tog('إخفاء الواجهة أثناء التسجيل', 'hideUi', R))),
    h('div', { class: 'block' }, h('h3', {}, 'سجّل'), recBig, wavBtn,
      h('div', { class: 'd-row' }, btn('لقطة', { onPress: () => app.screenshot() }), btn('بوستر ٤K', { onPress: () => app.poster() })),
      h('p', { class: 'hint' }, 'الفيديو بيتسجل MP4 لو المتصفح بيدعمه، وإلا WebM. الصوت هو المكس النهائي بعد المؤثرات. المكس WAV بجودة الاستوديو ١٦ بت ستيريو.')),
    h('div', { class: 'block' }, h('h3', {}, 'التسجيلات'), takes)));

  // ---------------------------------------------------------------- settings
  const midiStatus = h('p', { class: 'hint' }, 'مفيش جهاز متوصل.');
  const midiList = h('ul', { class: 'midi-list' });
  views.midiStatus = midiStatus; views.midiList = midiList;
  const learnBtn = btn('وضع التعليم', { cls: 'tog', toggle: true, title: 'دوس على أي زرار في الشاشة وبعدين حرّك زرار في جهاز الميدي', onPress: () => {
    const on = !app.midi.learn; app.midi.learn = on; setPressed(learnBtn, on);
    setLearnHook(on ? (id) => { app.midi.arm(id); document.querySelectorAll('.armed').forEach((e) => e.classList.remove('armed')); registry.get(id)?.el.classList.add('armed'); toast('حرّك زرار في جهاز الميدي'); } : null);
  } });
  const scenes = h('div', { class: 'scenes' });
  const drawScenes = () => {
    scenes.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const has = !!S.scenes[i];
      const b = btn(String(i + 1), { cls: `scene${has ? ' set' : ''}`, title: has ? 'استرجع المشهد (ضغطة طويلة تحفظ مكانه)' : 'احفظ المشهد الحالي' });
      let timer = null;
      b.addEventListener('pointerdown', () => { timer = setTimeout(() => { timer = null; app.saveScene(i); drawScenes(); }, 700); });
      b.addEventListener('pointerup', () => { if (timer) { clearTimeout(timer); timer = null; if (S.scenes[i]) app.recallScene(i); else { app.saveScene(i); drawScenes(); } } });
      scenes.append(b);
    }
  };
  drawScenes();
  const showIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  showIn.addEventListener('change', () => { const f = showIn.files[0]; if (f) app.importShow(f); showIn.value = ''; });
  paneEls.settings.append(h('div', { class: 'settings-grid' },
    h('div', { class: 'block' }, h('h3', {}, 'الأداء'),
      seg({ auto: 'تلقائي', low: 'موفّر', mid: 'متوازن', high: 'عالي', ultra: 'فائق' }, S.quality, (v) => { S.quality = v; app.applyQuality(); app.saveState(); }, { label: 'الجودة' }),
      h('div', { class: 'd-row wrap' }, (() => { const b = btn('عدّاد الإطارات', { cls: 'tog', toggle: true, pressed: S.showFps, onPress: () => { S.showFps = !S.showFps; setPressed(b, S.showFps); fpsTag.hidden = !S.showFps; app.saveState(); } }); return b; })(),
        (() => { const b = btn('وضع آمن للعين', { cls: 'tog', toggle: true, pressed: S.safe, title: 'يقلل الوميض والستروب لأقل من ٣ مرات في الثانية', onPress: () => { S.safe = !S.safe; setPressed(b, S.safe); app.saveState(); } }); return b; })(),
        (() => { const b = btn('مدخل خارجي (ميكسر حقيقي)', { cls: 'tog', toggle: true, title: 'المشهد يتفاعل مع صوت داخل من الميكروفون أو كارت الصوت، من غير ما يطلع في السماعات', onPress: async () => { const on = await app.lineIn(b.getAttribute('aria-pressed') !== 'true'); setPressed(b, on); } }); return b; })())),
    h('div', { class: 'block' }, h('h3', {}, 'ميدي'), h('div', { class: 'd-row' }, btn('وصّل جهاز', { onPress: () => app.connectMidi() }), learnBtn, btn('امسح الربط', { onPress: () => { app.midi.clear(); app.drawMidi(); } })), midiStatus, midiList),
    h('div', { class: 'block' }, h('h3', {}, 'مشاهد محفوظة'), h('p', { class: 'hint' }, 'المشهد = العالم + الألوان + الإضاءة + الطبقات + الكاميرا.'), scenes,
      h('div', { class: 'd-row' }, btn('صدّر العرض', { onPress: () => app.exportShow() }), btn('استورد عرض', { onPress: () => showIn.click() }), showIn)),
    h('div', { class: 'block about' }, h('h3', {}, 'عن الاستوديو'),
      h('p', {}, 'ملف واحد يشتغل من غير نت. الرسم بمحرك Three.js، وأصول المسرح متنحوتة في بلندر ٤٫٥، ونفس الأصول بتفتح في جودو ٤٫٥ للتصدير كبرنامج أو فيديو.'),
      h('p', {}, 'المزيكا المدمجة متولّدة بالكود جوّه الصفحة (مش تسجيلات). الحفلات والمشاهد خيالية للعرض.'))));

  // ---------------------------------------------------------------- help dialog
  const keys = [['مسافة', 'تشغيل/إيقاف الديك الماستر'], ['Z / M', 'تشغيل ديك أ / ب'], ['X / N', 'كيو ديك أ / ب'], ['← →', 'الكروس فيدر'], ['T', 'انتقال تلقائي'],
    ['1 – 4', 'العوالم'], ['D', 'الدروب'], ['S', 'ستروب'], ['O', 'لقطة'], ['B', 'بلايندر'], ['L', 'ليزر'], ['P', 'لهب'], ['C', 'دخان ثلج'], ['J', 'قصاصات'], ['F', 'ألعاب نارية'],
    ['U', 'رايزر'], ['K', 'تعتيم'], ['G', 'تشويش'], ['V', 'اللقطة الجاية'], ['R', 'تسجيل فيديو'], ['H', 'إخفاء الواجهة']];
  const help = h('dialog', { class: 'help' }, h('h2', {}, 'الاختصارات'), h('dl', {}, ...keys.flatMap(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
    h('form', { method: 'dialog' }, h('button', { class: 'btn' }, 'تمام')));

  root.append(top, pads, consoleEl, help);
  let saved = 'decks';
  try { saved = localStorage.getItem('rave-tab') || 'decks'; } catch { /* fine */ }
  openTab(tabEls[saved] ? saved : 'decks');

  // ---------------------------------------------------------------- per-frame updates
  let acc = 0;
  return {
    views,
    worldBtns,
    setWorld(k) { worldBtns.forEach((b) => setPressed(b, b.dataset.k === k)); },
    deckLoaded(d) { views.decks[d.index].onLoad(d); },
    syncMixer() {
      for (const i of [0, 1]) {
        const d = app.deck(i); if (!d) continue;
        const c = views[`chan${i}`];
        for (const [k, kn] of Object.entries(c.k)) kn.sync(d.knobs[k]);
        c.fader.sync(d.knobs.fader);
      }
      xf.sync(app.engine.xf);
    },
    recState(on, secs) {
      recBtn.classList.toggle('on', on); recBig.classList.toggle('on', on);
      recBig.textContent = on ? 'وقّف التسجيل' : 'سجّل فيديو';
      recTime.textContent = on ? `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}` : '';
    },
    frame(dt, clock, look) {
      acc += dt;
      const eng = app.engine;
      if (eng.ctx && current === 'decks' && !consoleEl.classList.contains('min')) {
        const m = eng.masterDeck();
        for (const i of [0, 1]) views.decks[i].draw(eng.decks[i]);
        if (acc > 0.08) for (const i of [0, 1]) views.decks[i].update(eng.decks[i], m === eng.decks[i]);
        for (const i of [0, 1]) { const d = eng.decks[i]; views[`chan${i}`].vu.style.setProperty('--l', Math.min(1, d.level * 1.1)); }
        root.querySelector('.master-vu').style.setProperty('--l', Math.min(1, eng.analysis.level * 2.4));
        if (eng.autoMix) xf.sync(eng.xf);
        autoBtn.classList.toggle('on', !!eng.autoMix);
      }
      if (acc < 0.1) return;
      acc = 0;
      bpmBig.textContent = clock.playing ? clock.bpm.toFixed(1) : '---';
      secTag.textContent = SECTION_AR[look.section] || look.section;
      secTag.dataset.s = look.section;
      barTag.textContent = clock.playing ? `بار ${clock.bar + 1} · ${Math.floor(clock.beat % 4) + 1}` : '';
      if (S.showFps) fpsTag.textContent = `${app.fps.toFixed(0)} إطار · ${app.qLevel}`;
      if (app.vrec.active) this.recState(true, app.vrec.seconds());
      if (eng.wav && eng.wav.active) wavBtn.textContent = `وقّف المكس ${Math.floor(eng.wav.seconds() / 60)}:${String(Math.floor(eng.wav.seconds() % 60)).padStart(2, '0')}`;
    },
  };
}
