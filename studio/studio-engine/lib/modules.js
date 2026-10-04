// Studio Engine — Motion Library. Each element type is a parametric module: build(ctx, e) → render(t) (t = film seconds).
// Tools, not templates: every module exposes timing (beats), geometry, colour roles, motion style and intensity,
// so two films built from the same modules can look unrelated. Times in a spec are BEATS from the scene start.
import { clamp, lerp, ramp, hash, px, oE, ioC, ioQ, sm, spr, div, T3, setBlur, obj, words, kinetic, extrude, icon, IC, col, canvas, isArabic, el } from './core.js';

const K = (ctx) => Math.min(ctx.W, ctx.H) / 1080;                       // size unit: px at a 1080 short side
const tin = (ctx, e, d = 0) => ctx.T(e.at ?? d), tout = (ctx, e) => (e.out != null ? ctx.T(e.out) : ctx.b - 0.12);
const shadowOf = (e) => (e.shadow === false ? '' : e.shadow || '0 0 40px rgba(0,0,0,0.5)');

export const MODULES = {
  // ---------- kinetic typography: one line ----------
  words(ctx, e) {
    const L = words(ctx.root, e.text, ctx, { size: e.size * K(ctx), weight: e.weight ?? 900, color: col(ctx.brand, e.color), x: e.x ?? 0.5, y: e.y ?? 0.5, width: e.width && e.width * K(ctx), font: e.font && (ctx.brand.fonts[e.font] || e.font), accent: Object.fromEntries(Object.entries(e.accent || {}).map(([k, v]) => [k, col(ctx.brand, v)])), z: e.z ?? 9, shadow: shadowOf(e) });
    const a = tin(ctx, e), o = tout(ctx, e);
    return (t) => kinetic(L, t, a, o, { style: e.style || 'slam', s0: e.s0 ?? 2.2, stagger: e.stagger ?? 0.07, blur: e.blur ?? 22, dur: e.dur ?? 0.36, outDur: e.outDur ?? 0.18 });
  },
  // ---------- several lines laid out without overlap (auto vertical rhythm) ----------
  stack(ctx, e) {
    const k = K(ctx), gap = (e.gap ?? 0.12), lines = e.lines.map((l) => ({ ...l, s: (l.size || e.size || 120) * k }));
    const total = lines.reduce((s, l) => s + l.s * 1.2, 0) + gap * k * 100 * (lines.length - 1);
    let y = (e.y ?? 0.5) * ctx.H - total / 2;
    const Ls = lines.map((l, i) => { const cy = y + l.s * 0.6; y += l.s * 1.2 + gap * k * 100;
      return { l, i, L: words(ctx.root, l.text, ctx, { size: l.s, weight: l.weight ?? 900, color: col(ctx.brand, l.color), x: l.x ?? e.x ?? 0.5, cy, accent: Object.fromEntries(Object.entries(l.accent || {}).map(([kk, v]) => [kk, col(ctx.brand, v)])), z: 9, shadow: shadowOf(e) }) }; });
    return (t) => Ls.forEach(({ l, i, L }) => kinetic(L, t, ctx.T(l.at ?? (e.at ?? 0) + i * 0.5), tout(ctx, e), { style: l.style || e.style || 'slam', s0: l.s0 ?? e.s0 ?? 2.2, blur: e.blur ?? 22, outDur: 0.14 }));
  },
  // ---------- extruded 3D word: flies out of the camera, spins, settles; optional implosion ----------
  extrude(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors;
    const g = extrude(ctx.cam, e.text, { size: (e.size ?? 520) * k, layers: e.layers ?? 26, step: (e.step ?? 4) * k, face: e.face || ['#FFFFFF', '#9FE6FF'], side: col(ctx.brand, e.side, '#1B63F0'), sideDark: col(ctx.brand, e.sideDark, '#071B66'), glow: e.glow ?? 'rgba(79,216,255,0.65)' });
    const halo = e.halo === false ? null : [obj(ctx.cam, 900 * k, 900 * k, { borderRadius: '50%', background: `radial-gradient(closest-side, ${B.glow}8C, ${B.primary}40 55%, transparent)` }),
      obj(ctx.cam, 1100 * k, 1100 * k, { borderRadius: '50%', border: `3px solid ${B.glow}CC` }), obj(ctx.cam, 760 * k, 760 * k, { borderRadius: '50%', border: `2px dashed ${B.accent}CC` })];
    const a = tin(ctx, e), imp = e.implodeAt != null ? ctx.T(e.implodeAt) : null, end = ctx.b, X = ((e.x ?? 0.5) - 0.5) * ctx.W, Y = ((e.y ?? 0.5) - 0.5) * ctx.H;
    return (t) => {
      const pop = spr(t, a, 0.7, 0.3), im = imp ? ioQ(ramp(t, imp, end)) : 0;
      const az = lerp(1100, 0, clamp(pop, 0, 1.1)) - 1500 * im, spin = lerp(e.spin ?? 220, 0, clamp(pop, 0, 1.05)) + 12 * Math.sin((t - a) * 1.4);
      g.style.transform = T3(X * (1 - im), Y * (1 - im), az, -8 * Math.sin((t - a) * 1.1), spin, 0, 1 - 0.7 * im);
      g.style.opacity = (sm(a - 0.02, a + 0.06, t) * (1 - sm(end - 0.18, end - 0.02, t))).toFixed(3);
      if (halo) { const rg = sm(a + 0.1, a + 0.5, t) * (1 - sm(end - 0.2, end, t));
        halo[0].style.transform = T3(0, 0, -400, 0, 0, 0, 0.9 + 0.12 * Math.sin(t * 5) + 1.6 * im); halo[0].style.opacity = (sm(a - 0.1, a + 0.2, t) * (1 - sm(end - 0.05, end + 0.08, t))).toFixed(3);
        halo[1].style.transform = T3(0, 0, -300, 72, 0, t * 70, 1 - 0.9 * im); halo[2].style.transform = T3(0, 0, -300, 72, 0, -t * 110, 1 - 0.9 * im);
        halo[1].style.opacity = (rg * 0.8).toFixed(3); halo[2].style.opacity = (rg * 0.7).toFixed(3); }
    };
  },
  // ---------- title lock-up: left · symbol · right in extruded 3D, orbiting camera, floor reflection ----------
  lockup(ctx, e) {
    const k = K(ctx) * (ctx.portrait ? 0.62 : 1), [L, M, R] = e.parts, size = (e.size ?? 560) * k, gapX = (e.gap ?? 445) * k;
    const mk = (parent, flip) => {
      const g = obj(parent, 10, 10, flip ? { transform: 'scaleY(-1)' } : {});
      const nodes = [L, M, R].map(() => div(g, { transformStyle: 'preserve-3d' }));
      extrude(nodes[0], L, { size, layers: flip ? 5 : 20, step: flip ? 23 * k : 5.8 * k, face: ['#FFFFFF', '#8FE3FF'], side: '#1A5FEF', sideDark: '#071B66', glow: flip ? null : 'rgba(79,216,255,0.7)' });
      extrude(nodes[1], M, { size: size * 0.82, layers: flip ? 4 : 16, step: flip ? 24 * k : 6 * k, face: ['#FFF3A8', col(ctx.brand, 'accent')], side: col(ctx.brand, 'accentDark'), sideDark: '#7A4A00', glow: flip ? null : 'rgba(255,210,31,0.7)' });
      extrude(nodes[2], R, { size, layers: flip ? 5 : 20, step: flip ? 23 * k : 5.8 * k, face: ['#FFFFFF', '#DCE6FF'], side: '#3C58B8', sideDark: '#0B1C5C', glow: flip ? null : 'rgba(255,255,255,0.4)' });
      return nodes;
    };
    const Y = ((e.y ?? 0.42) - 0.5) * ctx.H;
    const stage = obj(ctx.cam, 10, 10, { transform: `translate3d(0,${Y}px,0)` }), main = mk(stage, false);
    const refl = e.reflection === false ? null : obj(ctx.cam, 10, 10, { transform: `translate3d(0,${Y + 0.84 * size}px,0)`, opacity: '0', webkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 90%)' });
    const rl = refl ? mk(refl, true) : null;
    const a = tin(ctx, e), xa = ctx.T(e.midAt ?? (e.at ?? 0) + 1), end = ctx.b;
    return (t) => {
      const u = t - a, ex = spr(t, a, 0.7, 0.25), xs = spr(t, xa, 0.75, 0.3), dur = Math.max(1, end - a);
      if (e.orbit !== false) ctx.cam.style.transform = `translate3d(0,0,${lerp(-260, 60, ioC(clamp(u / dur))).toFixed(1)}px) rotateX(-4deg) rotateY(${lerp(-26, 9, ioC(clamp(u / dur))).toFixed(2)}deg)`;
      for (const n of rl ? [main, rl] : [main]) {
        n[0].style.transform = T3(-gapX - (1 - clamp(ex)) * 900 * k, -40 * k, 0, 0, (1 - clamp(ex)) * 80, 0); n[2].style.transform = T3(gapX + (1 - clamp(ex)) * 900 * k, -40 * k, 0, 0, -(1 - clamp(ex)) * 80, 0);
        n[1].style.transform = T3(0, -40 * k, 60, 0, lerp(-540, 0, clamp(xs, 0, 1.1)) + 12 * Math.sin(t * 2), -30 * Math.sin(t * 1.3) + (1 - clamp(xs)) * 720, lerp(0.1, 1, clamp(xs, 0, 1.15)));
      }
      stage.style.opacity = sm(a - 0.02, a + 0.05, t).toFixed(3);
      if (refl) { const ro = 0.16 * sm(a + 0.2, a + 0.8, t); refl.style.opacity = ro.toFixed(3); refl.style.display = ro > 0.002 ? 'block' : 'none'; }
    };
  },
  // ---------- paper storm: a tunnel of cards rushing the camera ----------
  storm(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors, n = Math.min(e.count ?? 38, 48), texts = e.texts || [];
    const cards = Array.from({ length: n }, (_, i) => {
      const c = obj(ctx.cam, 360 * k, 470 * k, { background: 'linear-gradient(160deg, #FFFFFF, #E9EEF8)', borderRadius: '10px', boxShadow: `0 0 40px ${B.glow}59` });
      div(c, { left: px(28 * k), top: px(30 * k), width: px(150 * k), height: px(18 * k), background: B.primary, borderRadius: '4px' });
      for (let j = 0; j < 7; j++) div(c, { left: px(28 * k), top: px((86 + j * 40) * k), width: px((160 + hash(i, j) * 140) * k), height: px(10 * k), background: 'rgba(30,60,120,0.28)', borderRadius: '5px' });
      if (texts.length && i % 4 === 0) { const L = div(c, { left: px(24 * k), top: px(170 * k), width: px(320 * k), fontFamily: `'${ctx.brand.fonts.display}'`, fontWeight: '800', fontSize: px(50 * k), color: '#0B1E5A', lineHeight: '1.1', direction: isArabic(texts[0]) ? 'rtl' : 'ltr', transform: 'rotate(-6deg)' }); L.textContent = texts[(i / 4) % texts.length]; }
      return c;
    });
    const a = ctx.a, len = ctx.b - ctx.a;
    return (t) => {
      const u = t - a, kk = 0.25 * u + 0.2 * Math.pow(u / len, 3.2) * len * (e.speed ?? 1);
      cards.forEach((c, i) => {
        const p = (hash(i, 1) + kk * (0.6 + 0.8 * hash(i, 2))) % 1, z = lerp(-3400, 980, p), ang = hash(i, 3) * 6.283 + u * 0.35 * (hash(i, 4) - 0.5), rad = (380 + 720 * hash(i, 5)) * k;
        c.style.transform = T3(Math.cos(ang) * rad * (ctx.portrait ? 0.9 : 1.5), Math.sin(ang) * rad * (ctx.portrait ? 1.5 : 0.9), z, 40 * Math.sin(u + i), 60 * Math.sin(u * 0.7 + i * 2) + i * 9, 40 * (hash(i, 6) - 0.5) + u * 30 * (hash(i, 7) - 0.5));
        c.style.opacity = (sm(-3400, -2400, z) * (1 - sm(780, 980, z)) * sm(a, a + 0.15, t)).toFixed(3);
      });
      ctx.cam.style.transform = `rotateZ(${(-6 * Math.sin(u * 0.8) * sm(0, 3, u)).toFixed(2)}deg)`;
    };
  },
  // ---------- a word glitches in and a slab slices it in two ----------
  slice(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors, X = (e.x ?? 0.25) * ctx.W, Y = (e.y ?? 0.65) * ctx.H, w = 720 * k, h = 260 * k;
    const box = div(ctx.root, { left: px(X - w / 2), top: px(Y - h / 2), width: px(w), height: px(h), zIndex: '9' });
    const half = (clip) => { const n = div(box, { width: px(w), height: px(h), clipPath: clip, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: `'${ctx.brand.fonts.display}'`, fontWeight: '900', fontSize: px((e.size ?? 190) * k), color: col(ctx.brand, e.color, '#C7D4F2'), textShadow: '0 0 30px rgba(0,0,0,0.5)', direction: isArabic(e.text) ? 'rtl' : 'ltr' }); n.textContent = e.text; return n; };
    const A = half('polygon(0 0, 100% 0, 0 100%)'), Bn = half('polygon(100% 0, 100% 100%, 0 100%)');
    const slab = div(ctx.root, { left: px(-300 * k), top: px(Y - 10 * k), width: px(ctx.W + 300 * k), height: px(120 * k), background: `linear-gradient(90deg, ${B.accentDark}, ${B.accent} 30%, #FFE97A)`, transform: 'rotate(-14deg) skewX(-20deg)', transformOrigin: '0 50%', zIndex: '11', boxShadow: `0 0 60px ${B.accent}B3` });
    const a = tin(ctx, e), c = ctx.T(e.cutAt ?? (e.at ?? 0) + 1);
    return (t) => {
      const ti = sm(a, a + 0.12, t), gl = t > a && t < c ? 10 * Math.sin(t * 90) * hash(Math.round(t * 60), 9) : 0, cut = ioC(ramp(t, c + 0.08, c + 0.7)), fade = 1 - sm(c + 0.35, c + 0.75, t);
      box.style.display = t >= a && t < c + 0.9 ? 'block' : 'none';
      A.style.transform = `translate(${(gl - 360 * k * cut).toFixed(1)}px, ${(-260 * k * cut).toFixed(1)}px) rotate(${(-26 * cut).toFixed(1)}deg)`;
      Bn.style.transform = `translate(${(-gl + 330 * k * cut).toFixed(1)}px, ${((420 * cut * cut + 40 * cut) * k).toFixed(1)}px) rotate(${(32 * cut).toFixed(1)}deg)`;
      A.style.opacity = Bn.style.opacity = (ti * fade).toFixed(3);
      const sl = ramp(t, c - 0.02, c + 0.22); slab.style.display = sl > 0 && sl < 1 ? 'block' : 'none';
      slab.style.transform = `translateX(${lerp(-200, ctx.W + 300, oE(sl)).toFixed(0)}px) rotate(-14deg) skewX(-20deg)`;
    };
  },
  // ---------- before/after cards that turn on the beat (text rides the card; never blank) ----------
  cards(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors, P = ctx.portrait, items = e.items;
    const CW = P ? 940 * k : 1640 * k, CH = P ? 1180 * k : 760 * k, HD = 206 * k;
    const frame = obj(ctx.cam, CW, CH, { transform: `translate3d(0,${40 * k}px,0)` });
    const hx = (txt, i, sub) => words(ctx.root, txt, ctx, { size: (sub ? 30 : 52) * k * (P ? 1.1 : 1), weight: sub ? 500 : 900, x: P ? 0.5 : (i ? 0.69 : 0.31), y: P ? (sub ? 0.09 + i * 0.07 : 0.065 + i * 0.07) : (sub ? 0.155 : 0.11), color: sub ? (i ? B.ice : B.muted) : (i ? B.glow : B.warm), z: 9, width: (P ? 900 : 700) * k });
    const hdr = e.header ? [hx(e.header[0], 0), hx(e.header[1], 1), ...(e.sub ? [hx(e.sub[0], 0, 1), hx(e.sub[1], 1, 1)] : [])] : [];
    const dots = items.map((_, i) => div(ctx.root, { left: px(ctx.W / 2 - 30 * k * (items.length - 1) + i * 60 * k - 9 * k), top: px(ctx.H - (P ? 300 : 75) * k), width: px(18 * k), height: px(18 * k), borderRadius: '50%', background: 'rgba(255,255,255,0.25)', zIndex: '9' }));
    const fsz = (txt, maxW, base, f = 0.56) => Math.min(base, Math.floor(maxW / (Math.max(1, [...txt].length) * f)));
    const sideW = P ? CW : CW / 2, sideH = P ? (CH - HD) / 2 : CH - HD;
    const cards = items.map((a) => {
      const c = div(frame, { width: px(CW), height: px(CH), transformStyle: 'preserve-3d', transformOrigin: '50% 100%' });
      const oS = div(c, { left: '0', top: px(HD), width: px(sideW), height: px(sideH), background: `linear-gradient(160deg, ${B.paper}, #D8CBAE)`, borderRadius: P ? '0' : `0 0 0 ${30 * k}px` });
      const nS = div(c, { left: px(P ? 0 : sideW), top: px(P ? HD + sideH : HD), width: px(sideW), height: px(sideH), background: `linear-gradient(160deg, #1C58E8, #0A2A8C 70%, #071B66)`, borderRadius: P ? `0 0 ${30 * k}px ${30 * k}px` : `0 0 ${30 * k}px 0`, boxShadow: `0 0 80px ${B.glow}59` });
      div(c, { width: px(CW), height: px(HD), background: 'linear-gradient(90deg, rgba(5,16,60,0.96), rgba(10,44,140,0.96))', borderRadius: `${30 * k}px ${30 * k}px 0 0`, borderBottom: `4px solid ${B.accent}` });
      const sub = (parent, text, size, cy, color, weight, dir) => text ? words(parent, text, { ...ctx, safe: [0, 0, sideW, sideH] }, { size: fsz(text, sideW * 0.9, size * k, dir === 'rtl' ? 0.5 : 0.56), weight, cx: sideW / 2, cy, color, width: sideW * 0.92, z: 10, dir }) : null;
      const L = [words(c, a.title, { ...ctx, safe: [0, 0, CW, HD] }, { size: fsz(a.title, CW * 0.9, 76 * k, 0.6), weight: 900, cx: CW / 2, cy: 78 * k, color: '#fff', width: CW * 0.95, z: 10 }),
        a.titleAr ? words(c, a.titleAr, { ...ctx, safe: [0, 0, CW, HD] }, { size: 48 * k, weight: 700, cx: CW / 2, cy: 152 * k, color: B.accent, width: CW * 0.95, z: 10 }) : null,
        sub(oS, a.old, 46, sideH * 0.66, '#3A2E18', 700), sub(oS, a.oldAr, 40, sideH * 0.8, '#5B4A28', 600, 'rtl')];
      const nt = [sub(nS, a.new, 46, sideH * 0.66, '#FFFFFF', 800), sub(nS, a.newAr, 40, sideH * 0.8, B.ice, 600, 'rtl')];
      const is = Math.min(260 * k, sideH * 0.42), oI = div(oS, { left: px(sideW / 2 - is / 2), top: px(sideH * 0.1), width: px(is), height: px(is) }), nI = div(nS, { left: px(sideW / 2 - is / 2), top: px(sideH * 0.1), width: px(is), height: px(is) });
      (a.oldIcons || []).forEach((p) => icon(oI, IC[p] || p, is, '#3A2E18', 3.4)); (a.newIcons || []).forEach((p, j, arr) => icon(nI, IC[p] || p, is, j === arr.length - 1 && j > 0 ? B.accent : B.ice, 3.4));
      const badge = div(nS, { left: px(sideW - 230 * k), top: px(sideH * 0.06), width: px(130 * k), height: px(72 * k), borderRadius: px(36 * k), background: B.accent, color: '#0A1A52', fontFamily: `'${ctx.brand.fonts.display}'`, fontWeight: '900', fontSize: px(44 * k), textAlign: 'center', lineHeight: px(72 * k) }); badge.textContent = e.badge ?? 'AI';
      return { c, L: L.filter(Boolean), nt: nt.filter(Boolean), oI, nI, badge };
    });
    const st = ctx.T(e.start ?? 1), step = (e.step ?? 5) * ctx.B, A = ctx.a, Z = ctx.b;
    return (t) => {
      const inn = ioC(ramp(t, A - 0.18, A + 0.16)), out = ioC(ramp(t, Z - 0.14, Z + 0.14)), idx = clamp(Math.floor((t - st) / step), 0, items.length - 1);
      ctx.root.style.opacity = (inn * (1 - out)).toFixed(3);
      ctx.cam.style.transform = `translate3d(${(-30 + 60 * ramp(t, A, Z)).toFixed(1)}px,0,${lerp(-300, 120, ioC(ramp(t, A - 0.15, Z))).toFixed(1)}px) rotateY(${(-6 + 12 * ramp(t, A, Z)).toFixed(2)}deg)`;
      frame.style.transform = `translate3d(0,${40 * k}px,0) scale(${lerp(0.4, 1, spr(t, A - 0.15, 0.5, 0.15)).toFixed(3)})`;
      dots.forEach((d, i) => { d.style.background = i <= idx && t >= A ? B.accent : 'rgba(255,255,255,0.25)'; d.style.transform = i === idx ? `scale(${(1.4 + 0.3 * Math.sin(t * 10)).toFixed(2)})` : 'scale(1)'; });
      for (const L of hdr) { L.line.style.display = 'flex'; L.words.forEach((w) => { w.style.opacity = (inn * (1 - out)).toFixed(3); }); }
      cards.forEach((q, i) => {
        const t0 = st + i * step, t1 = t0 + step, live = t >= (i ? t0 - 0.32 : A - 0.2) && t < t1 + 0.02;
        q.c.style.display = live ? 'block' : 'none';
        for (const L of [...q.L, ...q.nt]) L.line.style.display = live ? 'flex' : 'none';
        if (!live) return;
        const a = i === 0 ? spr(t, A, 0.55, 0.18) : spr(t, t0 - 0.3, 0.5, 0.18), b = ioC(ramp(t, t1 - 0.3, t1));
        q.c.style.transform = `rotateX(${(lerp(88, 0, clamp(a, 0, 1.05)) - (i < items.length - 1 ? 92 * b : 0)).toFixed(2)}deg)`;
        for (const L of q.L) L.words.forEach((w) => { w.style.opacity = '1'; w.style.transform = 'none'; });
        const m = ioC(ramp(t, t0 + 0.45, t0 + 0.85));
        q.oI.style.opacity = (1 - 0.55 * m).toFixed(3); q.oI.style.transform = `scale(${(1 - 0.12 * m).toFixed(3)})`;
        q.nI.style.opacity = m.toFixed(3); q.nI.style.transform = `scale(${(0.6 + 0.4 * clamp(spr(t, t0 + 0.45, 0.45, 0.3), 0, 1.2)).toFixed(3)}) rotate(${((1 - m) * -30).toFixed(1)}deg)`;
        q.badge.style.opacity = m.toFixed(3); q.badge.style.transform = `scale(${clamp(spr(t, t0 + 0.6, 0.4, 0.4), 0, 1.3).toFixed(3)})`;
        for (const L of q.nt) L.words.forEach((w) => { w.style.opacity = m.toFixed(3); w.style.transform = 'none'; });
      });
    };
  },
  // ---------- ingredients on a 3D cylinder around a glowing core, push-through with speed lines ----------
  ring(ctx, e) {
    const k = K(ctx) * (ctx.portrait ? 0.8 : 1), B = ctx.brand.colors, items = e.items, n = items.length, R = (e.radius ?? 760) * k * (ctx.portrait ? 0.62 : 1);
    const core = obj(ctx.cam, 360 * k, 360 * k, { borderRadius: '50%', background: `radial-gradient(circle at 38% 35%, #FFFFFF, #7FE3FF 25%, ${B.primary} 70%, ${B.primaryDark})`, boxShadow: `0 0 120px ${B.glow}E6` });
    const ct = div(core, { width: px(360 * k), height: px(360 * k), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: `'${ctx.brand.fonts.display}'`, fontWeight: '900', fontSize: px(84 * k), color: '#fff', textShadow: '0 0 30px rgba(10,60,200,0.9)' }); ct.textContent = e.core || '';
    const tracks = [1500, 1180].map((d, i) => obj(ctx.cam, d * k, d * k, { borderRadius: '50%', border: `${3 - i}px solid rgba(79,216,255,${0.6 - i * 0.2})` }));
    const cards = items.map(([en, ar, ic]) => {
      const c = obj(ctx.cam, 460 * k, 290 * k, { borderRadius: px(24 * k), background: 'linear-gradient(160deg, rgba(40,100,240,0.92), rgba(10,34,120,0.92))', border: '2px solid rgba(160,230,255,0.9)', boxShadow: `0 0 50px ${B.glow}80` });
      const ib = div(c, { left: px(30 * k), top: px(50 * k), width: px(124 * k), height: px(124 * k) }); icon(ib, IC[ic] || ic || IC.spark, 124 * k, B.accent, 4.2);
      div(c, { left: px(30 * k), top: px(206 * k), width: px(400 * k), height: '3px', background: 'rgba(160,230,255,0.5)' });
      const t1 = div(c, { left: px(176 * k), top: px(58 * k), width: px(270 * k), fontFamily: `'${ctx.brand.fonts.display}'`, fontWeight: '800', fontSize: px(40 * k), color: '#fff', lineHeight: '1.12', direction: isArabic(en) ? 'rtl' : 'ltr' }); t1.textContent = en;
      if (ar) { const t2 = div(c, { left: px(20 * k), top: px(222 * k), width: px(420 * k), textAlign: 'center', fontFamily: `'${ctx.brand.fonts.display}'`, fontWeight: '600', fontSize: px(34 * k), color: B.ice, direction: 'rtl' }); t2.textContent = ar; }
      return c;
    });
    const g = canvas(ctx.root, ctx.W, ctx.H, 10), A = ctx.a, Z = ctx.b, pa = e.pushAt != null ? ctx.T(e.pushAt) : Z;
    return (t) => {
      const u = t - A, inn = sm(A - 0.15, A + 0.1, t), out = ioC(ramp(t, Z - 0.12, Z + 0.12));
      ctx.root.style.opacity = (inn * (1 - out)).toFixed(3);
      const spin = 760 * (1 - Math.pow(1 - clamp(u / 2.2), 3)) + 28 * Math.max(0, u - 2.2), push = ioQ(ramp(t, pa, Z)) * 1400, cz = -330 + push * 0.55;
      ctx.cam.style.transform = `translate3d(0,0,${(push * 0.35).toFixed(1)}px) rotateX(${(-10 + 6 * Math.sin(t * 0.8)).toFixed(2)}deg)`;
      core.style.transform = T3(0, 0, cz, 0, 0, 0, (0.4 + 0.6 * clamp(spr(t, A, 0.6, 0.3), 0, 1.15)) * (1 + 0.05 * Math.sin(t * 12)));
      tracks.forEach((n2, i) => { n2.style.transform = T3(0, 0, cz, 90, 0, t * (40 + 30 * i)); });
      cards.forEach((c, i) => { const d = (i * 360 / n + spin), ang = d * Math.PI / 180, fr = (Math.cos(ang) + 1) / 2, pin = spr(t, A + 0.05 + i * 0.05, 0.5, 0.25);
        c.style.transform = T3(Math.sin(ang) * R, -10 + 14 * Math.sin(t * 3 + i), cz + Math.cos(ang) * R, 0, d % 360, 0, clamp(pin, 0, 1.1));
        c.style.opacity = (clamp(pin * 2) * (0.35 + 0.65 * fr)).toFixed(3); c.style.filter = fr < 0.35 ? `blur(${((0.35 - fr) * 8).toFixed(1)}px)` : 'none'; });
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ctx.W, ctx.H);
      const pu = ramp(t, pa, Z);
      if (pu > 0) for (let i = 0; i < 90; i++) { const a = hash(i, 11) * 6.283, r0 = (160 + 640 * hash(i, 12)) * k, len = (40 + 700 * pu * hash(i, 13)) * k; g.globalAlpha = 0.55 * pu * (1 - out); g.strokeStyle = i % 4 ? B.ice : B.accent; g.lineWidth = 2 + 3 * hash(i, 14); g.beginPath(); g.moveTo(ctx.W / 2 + Math.cos(a) * r0, ctx.H / 2 + Math.sin(a) * r0 * 0.62); g.lineTo(ctx.W / 2 + Math.cos(a) * (r0 + len), ctx.H / 2 + Math.sin(a) * (r0 + len) * 0.62); g.stroke(); }
      g.globalAlpha = 1;
    };
  },
  // ---------- a pill / bar with text (CTA, captions); parts let Arabic and Latin sit side by side without bidi bugs ----------
  pill(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors, w = Math.min((e.w ?? 1240) * k, ctx.safe[2] - ctx.safe[0]), h = (e.h ?? 120) * k, X = (e.x ?? 0.5) * ctx.W, Y = (e.y ?? 0.82) * ctx.H;
    const bg = { white: 'linear-gradient(160deg, #FFFFFF, #DCE6FF)', accent: `linear-gradient(90deg, ${B.accentDark}, ${B.accent} 40%, #FFE97A)`, glass: 'rgba(8,24,70,0.7)' }[e.bg || 'white'] || e.bg;
    const box = div(ctx.root, { left: px(X - w / 2), top: px(Y - h / 2), width: px(w), height: px(h), borderRadius: px(h / 2), background: bg, border: e.border ? `4px solid ${col(ctx.brand, e.border)}` : 'none', zIndex: '9', boxShadow: `0 0 70px ${B.glow}99` });
    const parts = e.parts || [{ text: e.text }], n = parts.length;
    const Ls = parts.map((p, i) => words(ctx.root, p.text, ctx, { size: (p.size ?? e.size ?? 56) * k, weight: 900, color: col(ctx.brand, p.color || e.color, '#0A1A52'), cx: X - w / 2 + w * (i + 0.5) / n, cy: Y, width: w / n * 0.94, z: 10 }));
    const a = tin(ctx, e), o = e.out != null ? ctx.T(e.out) : 1e9;
    return (t) => {
      const p = spr(t, a, 0.55, 0.25), out = ioC(ramp(t, o, o + 0.15));
      box.style.display = t >= a - 0.02 ? 'block' : 'none'; box.style.opacity = (clamp(p * 2) * (1 - out)).toFixed(3); box.style.transform = `scale(${lerp(e.grow === 'x' ? 1 : 0.6, 1, clamp(p, 0, 1.08)).toFixed(3)}) ${e.grow === 'x' ? `scaleX(${lerp(0.1, 1, clamp(p, 0, 1.06)).toFixed(3)})` : ''}`;
      Ls.forEach((L, i) => kinetic(L, t, a + 0.1 + 0.1 * i, o, { s0: 1.3, blur: 10, stagger: 0.06, dur: 0.36, outDur: 0.12 }));
    };
  },
  // ---------- full-frame colour wipes, one word each ----------
  wipes(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors;
    const W = e.items.map((it, i) => {
      const slab = div(ctx.root, { width: px(ctx.W), height: px(ctx.H), background: col(ctx.brand, it.bg), zIndex: String(20 + i), display: 'none', overflow: 'hidden' });
      div(slab, { width: px(ctx.W), height: px(ctx.H), backgroundImage: `repeating-linear-gradient(115deg, transparent 0 60px, ${it.stripe || 'rgba(255,255,255,0.10)'} 60px 120px)` });
      const L = words(slab, it.text, ctx, { size: (it.size ?? 250) * k, weight: 900, color: col(ctx.brand, it.fg, '#0A1A52'), y: 0.54, z: 3, shadow: '' });
      const is = 260 * k, ib = div(slab, { left: px(ctx.W / 2 - is / 2), top: px(ctx.H * 0.54 - 0.5 * L.fs - is - 40 * k), width: px(is), height: px(is) }); if (it.icon) icon(ib, IC[it.icon] || it.icon, is, col(ctx.brand, it.fg, '#0A1A52'), 3.4);
      return { slab, L, ib, a: ctx.T(it.at) };
    });
    return (t) => W.forEach((w, i) => {
      const e2 = oE(ramp(t, w.a, w.a + 0.2)), live = t >= w.a - 0.01 && t < ctx.b + 0.1;
      const covered = W[i + 1] && t > W[i + 1].a + 0.25;                 // a wipe that is fully covered leaves the DOM (no hidden text overlaps)
      w.slab.style.display = live && !covered ? 'block' : 'none'; if (covered) { w.L.line.style.display = 'none'; return; }
      w.slab.style.transform = `translateX(${((1 - e2) * 100).toFixed(2)}%) skewX(${(-12 * (1 - e2)).toFixed(2)}deg)`;
      kinetic(w.L, t, w.a + 0.08, 1e9, { s0: 2.4, blur: 18, dur: 0.32 });
      const ip = spr(t, w.a + 0.1, 0.4, 0.35); w.ib.style.transform = `scale(${clamp(ip, 0, 1.25).toFixed(3)}) rotate(${((1 - clamp(ip)) * -90).toFixed(1)}deg)`; w.ib.style.opacity = clamp(ip * 2).toFixed(3);
    });
  },
  // ---------- the slab smash: an angled colour block with stacked display lines ----------
  slab(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors, w = Math.min(1560 * k, ctx.W * 0.92), h = (e.h ?? 380) * k, Y = (e.y ?? 0.52) * ctx.H;
    const s = div(ctx.root, { left: px(ctx.W / 2 - w / 2), top: px(Y - h / 2), width: px(w), height: px(h), background: `linear-gradient(90deg, ${B.accentDark}, ${B.accent} 25%, #FFE97A 60%, ${B.accent})`, boxShadow: `0 0 90px ${B.accent}99`, zIndex: '6' });
    const lines = e.lines || [], tot = lines.reduce((q, l) => q + (l.size ?? 200) * k * 1.0, 0);
    let y = Y - tot / 2;
    const Ls = lines.map((l) => { const sz = (l.size ?? 200) * k, cy = y + sz * 0.5; y += sz;
      return { L: words(ctx.root, l.text, ctx, { size: sz, weight: 900, cy, width: w * 0.94, color: col(ctx.brand, l.color, '#0A1A52'), lh: 1.0, z: 8, shadow: '' }), at: ctx.T(l.at ?? e.at ?? 0) }; });
    const a = tin(ctx, e);
    return (t) => { const u = t - a, p = spr(t, a, 0.5, 0.28);
      s.style.opacity = clamp(p * 3).toFixed(3); s.style.transform = `skewX(-10deg) scale(${lerp(3.2, 1, clamp(p, 0, 1.06)).toFixed(3)}) translateY(${(lerp(-40, 0, clamp(p)) - 10 * k * Math.sin(u * 0.9)).toFixed(1)}px)`;
      Ls.forEach((q, i) => kinetic(q.L, t, q.at + (i ? 0 : 0.1), 1e9, { stagger: 0.04 + 0.08 * i, s0: 1.7, blur: 20, dur: 0.38 })); };
  },
  // ---------- the people: names stacked big, split by a light line, a symbol links them, HUD rings ----------
  hosts(ctx, e) {
    const k = K(ctx), B = ctx.brand.colors, P = ctx.portrait, ppl = e.people;
    const cxs = P ? [0.5, 0.5] : [0.25, 0.75], cyB = P ? [0.3, 0.66] : [0.5, 0.5];
    const grp = obj(ctx.cam, 10, 10, {});
    const rings = ppl.map((_, j) => [0, 1, 2].map((q) => { const d = (560 - q * 110) * k * (P ? 0.9 : 1); return obj(grp, d, d, { left: px((cxs[j] - 0.5) * ctx.W - d / 2), top: px((cyB[j] - 0.5) * ctx.H - d / 2), borderRadius: '50%', border: `${q === 1 ? 3 : 2}px solid transparent`, borderTopColor: q === 1 ? B.accent : B.glow, borderLeftColor: q === 2 ? B.glow : 'transparent' }); }));
    const sym = extrude(grp, e.symbol ?? '×', { size: 220 * k, layers: 12, step: 4 * k, face: ['#FFF3A8', B.accent], side: B.accentDark, sideDark: '#7A4A00', glow: 'rgba(255,210,31,0.7)' });
    const line = div(ctx.root, P ? { left: px(ctx.W / 2 - 300 * k), top: px(ctx.H * 0.48 - 3), width: px(600 * k), height: '6px' } : { left: px(ctx.W / 2 - 3), top: px(ctx.H * 0.555 - 300 * k), width: '6px', height: px(600 * k) });
    Object.assign(line.style, { background: `linear-gradient(${P ? 90 : 180}deg, transparent, ${B.glow} 30%, #FFFFFF 50%, ${B.glow} 70%, transparent)`, boxShadow: `0 0 30px ${B.glow}E6`, zIndex: '7' });
    const H = ppl.map((p, j) => { const X = cxs[j], Y0 = cyB[j] * ctx.H - 100 * k, sz = 150 * k * (P ? 0.85 : 1);
      const a = words(ctx.root, p.first, ctx, { size: sz, weight: 900, x: X, cy: Y0, width: 800 * k, lh: 1.0, z: 9, shadow: `0 0 40px ${B.primary}99` });
      const b = words(ctx.root, p.last, ctx, { size: sz, weight: 900, x: X, cy: Y0 + 155 * k * (P ? 0.85 : 1), width: 800 * k, lh: 1.0, z: 9, shadow: `0 0 40px ${B.primary}99` });
      const rule = div(ctx.root, { left: px(X * ctx.W - 300 * k), top: px(Y0 + 265 * k * (P ? 0.9 : 1)), width: px(600 * k), height: '6px', borderRadius: '3px', background: B.accent, boxShadow: `0 0 20px ${B.accent}B3`, zIndex: '9' });
      const r = words(ctx.root, p.role, ctx, { size: 52 * k, weight: 700, x: X, cy: Y0 + 332 * k * (P ? 0.9 : 1), width: 800 * k, color: B.glow, z: 9 });
      return { a, b, rule, r }; });
    const A = tin(ctx, e), Z = ctx.b;
    return (t) => {
      const u = t - A, inn = sm(A - 0.05, A + 0.15, t), out = ioC(ramp(t, Z - 0.2, Z + 0.1));
      ctx.root.style.opacity = (inn * (1 - out)).toFixed(3);
      ctx.cam.style.transform = `translate3d(0,0,${lerp(-200, 80, ioC(clamp(u / (Z - A)))).toFixed(1)}px) rotateY(${lerp(P ? -4 : -10, P ? 4 : 8, ioC(clamp(u / (Z - A)))).toFixed(2)}deg) rotateX(${(4 * Math.sin(u * 0.8)).toFixed(2)}deg)`;
      rings.forEach((set, j) => set.forEach((r, q) => { const p = clamp(spr(t, A + 0.1 + 0.08 * q + 0.25 * j, 0.6, 0.2), 0, 1.1);
        r.style.transform = `translate3d(0,0,${(-120 - 60 * q).toFixed(0)}px) rotateZ(${((q % 2 ? -1 : 1) * (t * (40 + 25 * q)) + 200 * (1 - p)).toFixed(1)}deg) scale(${(0.5 + 0.5 * p).toFixed(3)})`; r.style.opacity = (0.55 * clamp(p * 2)).toFixed(3); }));
      const xp = spr(t, A + 0.2, 0.7, 0.3); sym.style.transform = T3(0, (P ? -0.02 : 0.04) * ctx.H, 40, 0, (1 - clamp(xp)) * 360 + 10 * Math.sin(t * 2), t * 25, clamp(xp, 0, 1.12) * 0.9); sym.style.opacity = clamp(xp * 2).toFixed(3);
      const lp = ioC(ramp(t, A, A + 0.45)); line.style.transform = P ? `scaleX(${lp.toFixed(3)})` : `scaleY(${lp.toFixed(3)})`; line.style.opacity = (0.4 + 0.6 * lp * (0.85 + 0.15 * Math.sin(t * 9))).toFixed(3);
      H.forEach((h, j) => { const t0 = A + (0.5 + j) * ctx.B;
        kinetic(h.a, t, t0, Z - 0.25, { stagger: 0.1, s0: 1.8, blur: 18, dur: 0.42, outDur: 0.2 }); kinetic(h.b, t, t0 + 0.14, Z - 0.25, { stagger: 0.1, s0: 1.8, blur: 18, dur: 0.42, outDur: 0.2 });
        const rp = ioC(ramp(t, t0 + 0.35, t0 + 0.75)); h.rule.style.transform = `scaleX(${rp.toFixed(3)})`; h.rule.style.opacity = (rp * (1 - out)).toFixed(3);
        kinetic(h.r, t, Math.max(t0 + 0.5, A + 2.5 * ctx.B - (j ? 0 : 0.25)), Z - 0.25, { stagger: 0.08, s0: 1.3, blur: 10, dur: 0.38, outDur: 0.2 }); });
    };
  },
  // ---------- 3D lock-up small (end card) ----------
  mark(ctx, e) {
    const k = K(ctx) * (ctx.portrait ? 0.8 : 1), [L, M, R] = e.parts, Y = ((e.y ?? 0.16) - 0.5) * ctx.H, s = (e.size ?? 250) * k;
    const g = obj(ctx.cam, 10, 10, {});
    const A = extrude(g, L, { size: s, layers: 20, step: 3 * k, face: ['#FFFFFF', '#8FE3FF'], side: '#1A5FEF', sideDark: '#071B66' });
    const X = extrude(g, M, { size: s * 0.84, layers: 16, step: 3 * k, face: ['#FFF3A8', ctx.brand.colors.accent], side: ctx.brand.colors.accentDark, sideDark: '#7A4A00', glow: 'rgba(255,210,31,0.7)' });
    const R2 = extrude(g, R, { size: s, layers: 20, step: 3 * k, face: ['#FFFFFF', '#DCE6FF'], side: '#3C58B8', sideDark: '#0B1C5C' });
    const a = tin(ctx, e);
    return (t) => { const lg = spr(t, a, 0.6, 0.25);
      g.style.transform = `translate3d(0,${Y.toFixed(0)}px,${(clamp(lg, 0, 1.05) * 120 - 120).toFixed(0)}px) rotateY(${(Math.sin(t * 1.2) * 8).toFixed(2)}deg)`;
      A.style.transform = T3(-300 * k, 0, 0); X.style.transform = T3(0, 0, 20, 0, 0, t * 40); R2.style.transform = T3(300 * k, 0, 0); g.style.opacity = clamp(lg * 2).toFixed(3); };
  },
  // ---------- spark burst ----------
  sparks(ctx, e) {
    const g = canvas(ctx.root, ctx.W, ctx.H, 12), B = ctx.brand.colors, a = tin(ctx, e), X = (e.x ?? 0.5) * ctx.W, Y = (e.y ?? 0.52) * ctx.H, n = e.count ?? 120;
    return (t) => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ctx.W, ctx.H); const u = t - a;
      for (let i = 0; i < n; i++) { const tau = u - 0.02 - hash(i, 1) * 0.05; if (tau < 0 || tau > 1.6) continue; const an = hash(i, 2) * 6.283, v = 300 + 1500 * hash(i, 3), d = v * (1 - Math.exp(-tau * 3.2)) / 3.2;
        g.globalAlpha = Math.max(0, 1 - tau / 1.6); g.fillStyle = i % 3 ? B.accent : B.ice; const r = 3 + 6 * hash(i, 4); g.fillRect(X + Math.cos(an) * d - r / 2, Y + Math.sin(an) * d * 0.7 + 260 * tau * tau - r / 2, r, r); }
      g.globalAlpha = 1; };
  },
  // ---------- shared-element shape: a box/pill/circle that MORPHS into another shape (same or next scene) ----------
  shape(ctx, e) {
    const k = K(ctx), geo = (s) => ({ x: (s.x ?? 0.5) * ctx.W, y: (s.y ?? 0.5) * ctx.H, w: (s.w ?? 200) * k, h: (s.h ?? 200) * k, r: (s.r ?? 0) * k, c: col(ctx.brand, s.color, ctx.brand.colors.primary), rot: s.rot ?? 0 });
    const n = div(ctx.root, { zIndex: String(e.z ?? 7), boxShadow: e.glow ? `0 0 60px ${col(ctx.brand, e.glow)}` : 'none' });
    const steps = [{ ...geo(e), t: tin(ctx, e) }, ...(e.morph || []).map((m) => ({ ...geo({ ...e, ...m }), t: ctx.T(m.at), d: (m.dur ?? 1) * ctx.B }))];
    const target = e.morphTo ? ctx.find(e.morphTo) : null;
    const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const mixC = (a, b, u) => { const A = hx(a), Bc = hx(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, Bc[i], u))).join(',')})`; };
    return (t) => {
      if (t < steps[0].t) { n.style.display = 'none'; return; } n.style.display = 'block';
      let g = steps[0], appear = spr(t, steps[0].t, 0.5, 0.3);
      for (let i = 1; i < steps.length; i++) { const s = steps[i]; if (t < s.t) break; const u = spr(t, s.t, s.d, 0.18), p = steps[i - 1];
        g = { x: lerp(p.x, s.x, u), y: lerp(p.y, s.y, u), w: lerp(p.w, s.w, u), h: lerp(p.h, s.h, u), r: lerp(p.r, s.r, u), c: mixC(p.c, s.c, clamp(u)), rot: lerp(p.rot, s.rot, u) }; steps[i].g = g; }
      if (target && t > ctx.b - (target.dur ?? 0.5)) { const u = ioC(ramp(t, ctx.b - (target.dur ?? 0.5), ctx.b)); const q = target.geo; g = { x: lerp(g.x, q.x, u), y: lerp(g.y, q.y, u), w: lerp(g.w, q.w, u), h: lerp(g.h, q.h, u), r: lerp(g.r, q.r, u), c: mixC(g.c.startsWith('#') ? g.c : '#1E6BFF', q.c, u), rot: g.rot }; }
      Object.assign(n.style, { left: px(g.x - g.w / 2), top: px(g.y - g.h / 2), width: px(g.w), height: px(g.h), borderRadius: px(Math.min(g.r, g.w / 2, g.h / 2)), background: g.c, transform: `rotate(${g.rot}deg) scale(${clamp(appear, 0, 1.1).toFixed(3)})` });
    };
  },
  // ---------- SVG path morph: resamples each path to N points and interpolates (MorphSVG-like, deterministic) ----------
  path(ctx, e) {
    const k = K(ctx), size = (e.size ?? 400) * k, X = (e.x ?? 0.5) * ctx.W, Y = (e.y ?? 0.5) * ctx.H, N = 160;
    const sv = el('svg', { viewBox: '0 0 100 100', style: { position: 'absolute', left: px(X - size / 2), top: px(Y - size / 2), width: px(size), height: px(size), overflow: 'visible', zIndex: String(e.z ?? 8) } }, ctx.root);
    const probe = el('path', { d: 'M0 0' }, sv); probe.style.display = 'none';
    const pts = (e.paths || []).map((d) => { probe.setAttribute('d', IC[d] || d); const L = probe.getTotalLength(); return Array.from({ length: N }, (_, i) => { const p = probe.getPointAtLength(L * i / N); return [p.x, p.y]; }); });
    const shape = el('path', { d: '', fill: e.fill ? col(ctx.brand, e.fill) : 'none', stroke: col(ctx.brand, e.stroke, ctx.brand.colors.glow), 'stroke-width': e.width ?? 3, 'stroke-linejoin': 'round' }, sv);
    const times = (e.times || pts.map((_, i) => (e.at ?? 0) + i * 2)).map((b) => ctx.T(b)), dur = (e.dur ?? 0.8) * ctx.B * 2;
    return (t) => {
      if (t < times[0]) { sv.style.display = 'none'; return; } sv.style.display = 'block';
      let i = 0; while (i < times.length - 1 && t >= times[i + 1]) i++;
      const nx = Math.min(i + 1, pts.length - 1), u = i === nx ? 0 : ioC(ramp(t, times[i + 1] - dur, times[i + 1]));
      const A = pts[i], Bp = pts[nx]; let d = '';
      for (let j = 0; j < N; j++) { const x = lerp(A[j][0], Bp[j][0], u), y = lerp(A[j][1], Bp[j][1], u); d += (j ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); }
      shape.setAttribute('d', d + 'Z'); sv.style.opacity = sm(times[0], times[0] + 0.2, t).toFixed(3);
      shape.setAttribute('stroke-dasharray', `${(ramp(t, times[0], times[0] + 0.6) * 1000).toFixed(0)} 1000`);
    };
  },
  // ---------- icon pop ----------
  icon(ctx, e) {
    const k = K(ctx), s = (e.size ?? 200) * k, n = div(ctx.root, { left: px((e.x ?? 0.5) * ctx.W - s / 2), top: px((e.y ?? 0.5) * ctx.H - s / 2), width: px(s), height: px(s), zIndex: '9' });
    icon(n, IC[e.name] || e.name, s, col(ctx.brand, e.color, ctx.brand.colors.accent), e.width ?? 4);
    const a = tin(ctx, e), o = tout(ctx, e);
    return (t) => { const p = spr(t, a, 0.45, 0.35), out = ioC(ramp(t, o, o + 0.15)); n.style.opacity = (clamp(p * 2) * (1 - out)).toFixed(3); n.style.transform = `scale(${clamp(p, 0, 1.25).toFixed(3)}) rotate(${((1 - clamp(p)) * -90).toFixed(1)}deg)`; };
  },
  // ---------- image asset (generated or supplied) with parallax / ken-burns depth ----------
  image(ctx, e) {
    const k = K(ctx), w = (e.w ?? 800) * k, h = (e.h ?? 800) * k, X = (e.x ?? 0.5) * ctx.W, Y = (e.y ?? 0.5) * ctx.H;
    const n = el('img', { src: e.src, style: { position: 'absolute', left: px(X - w / 2), top: px(Y - h / 2), width: px(w), height: px(h), objectFit: e.fit || 'cover', borderRadius: px((e.r ?? 0) * k), zIndex: String(e.z ?? 5) } }, ctx.root);
    const a = tin(ctx, e), o = tout(ctx, e);
    return (t) => { const p = spr(t, a, 0.6, 0.2), u = ramp(t, a, o); n.style.opacity = (clamp(p * 2) * (1 - ioC(ramp(t, o, o + 0.2)))).toFixed(3); n.style.transform = `translate(${((e.drift ?? 40) * k * (u - 0.5)).toFixed(1)}px,0) scale(${(lerp(0.9, 1, clamp(p)) * (1 + 0.06 * u)).toFixed(4)})`; };
  },
};
