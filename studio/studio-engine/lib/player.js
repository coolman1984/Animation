// Studio Engine — spec player (browser). makeFilm(spec, brand) → the composer's { duration, fps, init, render }.
// World (glass room, floor grid, dust), scenes on the beat clock, camera rigs, shake from events, flashes, vignette.
import { clamp, lerp, ramp, hash, px, sm, div, rig, canvas, col } from './core.js';
import { MODULES } from './modules.js';
import { timeline, eventsOf } from './events.js';

const BG = {
  room: (B) => `radial-gradient(ellipse 70% 70% at 50% 46%, #14306E 0%, #0A1B4A 38%, #040B22 78%, #02050F 100%)`,
  blue: (B) => `radial-gradient(ellipse 70% 70% at 50% 46%, #1B4BCB 0%, #0A2A8C 45%, #050F3E 100%)`,
  ink: (B) => B.colors.ink, light: () => 'radial-gradient(ellipse 80% 80% at 50% 40%, #FFFFFF, #E8EEF8 70%, #D5DEEE)',
};

// A hard cut is opaque on its first frame. Wipes/fades keep the outgoing backing scene until coverage completes.
export function scenePresentation(s, next, t) {
  const fade = s.transition === 'fade', wipe = s.transition === 'wipe';
  const pre = fade ? (s.pre ?? .05) : 0;
  const nextSoft = next && ['fade', 'wipe'].includes(next.transition);
  const post = nextSoft ? Math.max(s.post ?? .22, next.transition === 'wipe' ? .4 : .3) : next ? 0 : (s.post ?? .22);
  return {
    visible: t >= s.a - pre && t < s.b + post,
    opacity: fade ? sm(s.a - pre, s.a + .3, t) : 1,
    clipPath: wipe ? `inset(0 ${(100 * (1 - sm(s.a, s.a + .4, t))).toFixed(2)}% 0 0)` : 'none',
  };
}

export function makeFilm(spec, brand) {
  const tl = timeline(spec), EV = eventsOf(spec), B = brand.colors;
  const HITS = EV.filter((e) => ['slam', 'impact', 'flash', 'smash', 'wipe', 'flip', 'line', 'slash', 'push'].includes(e.kind)).map((e) => [e.t, Math.min(1.8, e.amp)]);
  const FL = EV.filter((e) => ['flash', 'smash', 'slash'].includes(e.kind)).map((e) => [e.t, e.kind === 'slash' ? 0.35 : e.kind === 'smash' ? 0.9 : 1, e.kind === 'slash' ? 0.1 : 0.22]);
  let W = 1920, H = 1080, shell, flash, world, scenes = [];
  const shake = (t) => { let x = 0, y = 0, r = 0, k = Math.min(W, H) / 1080 * (spec.shake ?? 1);
    for (const [t0, a] of HITS) { const tau = t - t0; if (tau < 0 || tau > 0.55) continue; const d = Math.exp(-tau * 9) * a; x += Math.sin(tau * 75 + t0) * 13 * d; y += Math.cos(tau * 83 + t0 * 2) * 11 * d; r += Math.sin(tau * 61) * 0.5 * d; }
    return [x * k, y * k, r]; };
  // world speed integrates piecewise per scene, so the floor never jumps
  const speedAt = (t) => { const s = tl.scenes.find((q) => t >= q.a && t < q.b) || tl.scenes[tl.scenes.length - 1]; return 60 + 420 * (s.world?.speed ?? 1); };
  const distAt = (t) => { let d = 0; for (const s of tl.scenes) { const a = s.a, b = Math.min(s.b, t); if (b <= a) break; d += (60 + 420 * (s.world?.speed ?? 1)) * 0.25 * (b - a); } return d; };
  return {
    duration: tl.duration, fps: spec.fps || brand.export.fps,
    async init(st, { W: w, H: h }) {
      W = w; H = h; st.style.background = B.ink;
      // load every face the film uses before building, so text is measured with the real glyphs
      const fams = [...new Set(Object.values(brand.fonts))]; try { await Promise.all(fams.flatMap((f) => [400, 600, 800, 900].map((wt) => document.fonts.load(`${wt} 100px '${f}'`, 'AaHR مرحبا')))); await document.fonts.ready; } catch {}
      const portrait = H > W, fmt = brand.export.formats[portrait ? 'reel' : 'youtube'], safe = fmt && fmt.w === W ? fmt.safe : [W * 0.05, H * 0.05, W * 0.95, H * 0.95];
      shell = div(st, { width: px(W), height: px(H), overflow: 'hidden', zIndex: '1' });
      // world
      const wr = div(shell, { width: px(W), height: px(H), zIndex: '1' });
      const bg = div(wr, { width: px(W), height: px(H), background: BG[spec.background || 'room'](brand) });
      const hz = div(wr, { top: px(H * 0.435), width: px(W), height: px(240 * H / 1080), background: `linear-gradient(180deg, transparent, ${B.glow}47, transparent)`, zIndex: '1' });
      const grid = (top, flip) => { const p = div(wr, { width: px(W), height: px(H), perspective: '700px', perspectiveOrigin: `50% ${flip ? 60 : 40}%`, zIndex: '1', overflow: 'hidden', opacity: flip ? '0.5' : '1' });
        return div(p, { left: px(-1200), top: px(flip ? -3000 : H / 2), width: px(W + 2400), height: px(flip ? 3000 + H / 2 : 3000), transformOrigin: flip ? '50% 100%' : '50% 0', transform: `rotateX(${flip ? -78 : 78}deg)`,
          backgroundImage: `repeating-linear-gradient(0deg, rgba(120,190,255,${flip ? 0.35 : 0.5}) 0 2px, transparent 2px 110px), repeating-linear-gradient(90deg, rgba(120,190,255,${flip ? 0.35 : 0.5}) 0 2px, transparent 2px 110px)`,
          webkitMaskImage: `linear-gradient(${flip ? 0 : 180}deg, transparent 0%, #000 24%, #000 100%)` }); };
      const floor = spec.grid === false ? null : grid(H / 2, false), ceil = spec.grid === false ? null : grid(0, true);
      world = { bg, hz, floor, ceil, dg: canvas(wr, W, H, 2) };
      // scenes
      scenes = tl.scenes.map((s, i) => {
        const root = div(shell, { width: px(W), height: px(H), overflow: 'hidden', zIndex: String(3 + i), visibility: 'hidden' });
        if (s.bg) div(root, { width: px(W), height: px(H), background: (BG[s.bg] || (() => s.bg))(brand) });
        const { cam } = rig(root, W, H, s.camera?.persp ?? 1500);
        const ctx = { root, cam, W, H, safe, brand, portrait, a: s.a, b: s.b, B: tl.B, T: (beats) => s.a + beats * tl.B, find: (id) => findShape(id) };
        const renders = (s.elements || []).map((e) => { const m = MODULES[e.type]; if (!m) throw new Error(`unknown element type "${e.type}" in scene ${s.id}`); return m(ctx, e); });
        root.style.display = 'none'; root.style.visibility = 'visible';      // built visible so text can be measured, then parked
        return { s, root, cam, ctx, renders, pre: s.pre ?? 0.05, post: s.post ?? 0.22 };
      });
      function findShape(id) { for (const sc of tl.scenes) for (const e of sc.elements || []) if (e.id === id) { const k = Math.min(W, H) / 1080; return { dur: 0.5, geo: { x: (e.x ?? 0.5) * W, y: (e.y ?? 0.5) * H, w: (e.w ?? 200) * k, h: (e.h ?? 200) * k, r: (e.r ?? 0) * k, c: col(brand, e.color, B.primary) } }; } return null; }
      if (spec.vignette !== false) div(st, { width: px(W), height: px(H), zIndex: '60', pointerEvents: 'none', background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,10,0.55) 100%)' });
      flash = div(st, { width: px(W), height: px(H), zIndex: '70', background: '#FFFFFF', opacity: '0', pointerEvents: 'none' });
    },
    render(t) {
      // world: travelling grid, tint per scene, dust
      const d = distAt(t), cur = tl.scenes.find((q) => t >= q.a && t < q.b) || tl.scenes[tl.scenes.length - 1];
      if (world.floor) { world.floor.style.backgroundPosition = `0 ${(d % 110).toFixed(1)}px`; world.ceil.style.backgroundPosition = `0 ${(-d % 110).toFixed(1)}px`; }
      world.bg.style.filter = `hue-rotate(${cur.world?.tint ?? 0}deg) brightness(${(cur.world?.bright ?? 1).toFixed(2)})`;
      world.hz.style.opacity = (0.5 + 0.5 * sm(0, 1, t / Math.max(1, tl.scenes[0].b))).toFixed(3);
      const g = world.dg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) { const sp = 12 + hash(i, 1) * 40, x = (hash(i, 2) * W + t * sp * (hash(i, 3) < 0.5 ? 1 : -1) + W * 9) % W, y = (hash(i, 4) * H - t * sp * 0.6 + H * 9) % H;
        g.globalAlpha = 0.12 + 0.28 * hash(i, 6) * (0.5 + 0.5 * Math.sin(t * 2 + i)); g.fillStyle = i % 5 === 0 ? B.accent : B.glow; g.beginPath(); g.arc(x, y, 1 + hash(i, 5) * 2.6, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
      for (const sc of scenes) {
        const presentation = scenePresentation(sc.s, tl.scenes[sc.s.index + 1], t);
        sc.root.style.display = presentation.visible ? 'block' : 'none'; if (!presentation.visible) continue;
        sc.root.style.opacity = presentation.opacity.toFixed(3);
        sc.root.style.clipPath = presentation.clipPath;
        if (sc.s.camera?.drift !== false) sc.cam.style.transform = `translate3d(0,0,${lerp(sc.s.camera?.from ?? 0, sc.s.camera?.to ?? 0, clamp((t - sc.s.a) / (sc.s.b - sc.s.a))).toFixed(1)}px)`;
        for (const r of sc.renders) r(t);
        if (sc.s.breathe) sc.root.style.transform = `scale(${(1 + 0.012 * Math.sin((t - sc.s.a) * 0.9) + 0.02 * ramp(t, sc.s.a + 1.2, sc.s.b)).toFixed(4)})`;
      }
      const [dx, dy, r] = shake(t); shell.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(1.03)`;
      let f = 0; for (const [t0, a, dd] of FL) if (t >= t0) f += a * Math.pow(Math.max(0, 1 - (t - t0) / dd), 2);
      flash.style.opacity = Math.min(1, f).toFixed(3);
    },
  };
}
