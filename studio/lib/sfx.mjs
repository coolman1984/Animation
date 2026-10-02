// Designed sound effects on top of lib/audio.mjs (deterministic synthesis, no samples).
// Every function takes the time of the VISUAL EVENT: pre-roll is internal (a riser ends exactly on t,
// a whoosh peaks on t, an impact's transient starts on t), so picture and sound share one cue time.
// Sound reinforces important events; it is not a layer on every motion.
import { SR, Bus, biquad, pan, rng, noiseHit, whoosh, bell, mtof } from './audio.mjs';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// Weighty hit: sub-pitch drop + filtered noise transient. weight 0..1 shifts it from tap to boom.
export function impact(bus, t, { vel = 0.6, weight = 0.6, p = 0, seed = 11 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round((0.35 + weight * 0.9) * SR), [gl, gr] = pan(p);
  const r = rng(seed + Math.round(t * 1000)), lp = biquad('lp', 900 + 3000 * (1 - weight), 0.7);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const tt = k / SR, f = 38 + (90 + 60 * weight) * Math.exp(-tt / (0.03 + 0.05 * weight));
    ph += 2 * Math.PI * f / SR;
    const sub = Math.sin(ph) * Math.exp(-tt / (0.12 + 0.35 * weight)) * (0.6 + 0.6 * weight);
    const crack = lp(r() * 2 - 1) * Math.exp(-tt / (0.012 + 0.03 * weight)) * 0.8;
    const s = (sub + crack) * vel * 0.5 * Math.min(1, tt / 0.0008);
    bus.add(i0 + k, s * gl, s * gr);
  }
}

// Soft, felt-like hit for gentle accents (product lands, copy settles).
export function softHit(bus, t, { vel = 0.4, tone = 180, p = 0, seed = 5 } = {}) {
  noiseHit(bus, t, { dur: 0.05, vel: vel * 0.25, bp: tone * 4, q: 0.9, p, seed, tone, attack: 0.004 });
  const i0 = Math.round(t * SR), [gl, gr] = pan(p);
  for (let k = 0; k < SR * 0.4; k++) {
    const tt = k / SR, s = Math.sin(2 * Math.PI * tone * tt) * Math.exp(-tt / 0.09) * Math.min(1, tt / 0.004) * vel * 0.35;
    bus.add(i0 + k, s * gl, s * gr);
  }
}

// Air passing the lens, PEAKING at t. direction: 'lr' | 'rl' | 'center'.
export function whooshBy(bus, t, { dur = 0.6, vel = 0.25, direction = 'rl', low = 180, high = 1800, seed = 7 } = {}) {
  const [p0, p1] = direction === 'lr' ? [-0.8, 0.8] : direction === 'rl' ? [0.8, -0.8] : [0, 0];
  // audio.whoosh's envelope peaks near 43 % of its length.
  whoosh(bus, t - dur * 0.43, dur, vel, { f0: low, f1: high, p0, p1, seed, q: 0.9 });
}

// Tension riser ENDING exactly at t (hard stop, so the hit/cut owns the moment).
export function riser(bus, t, { dur = 2, vel = 0.3, f0 = 200, f1 = 5000, tonal = 0.35, seed = 9, tail = 0.01 } = {}) {
  const start = t - dur, i0 = Math.round(start * SR), len = Math.round((dur + tail) * SR), r = rng(seed);
  let state = { x1: 0, x2: 0, y1: 0, y2: 0 }, ph = 0;
  for (let k = 0; k < len; k++) {
    const u = Math.min(1, k / (dur * SR)), f = f0 * Math.pow(f1 / f0, u);
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), q = 1.2, a = s / (2 * q);
    const x = r() * 2 - 1, y = (a * x - a * state.x2 - (-2 * c) * state.y1 - (1 - a) * state.y2) / (1 + a);
    state = { x2: state.x1, x1: x, y2: state.y1, y1: y };
    ph += 2 * Math.PI * (f * 0.25) / SR;
    const env = Math.pow(u, 2.2) * (k > dur * SR ? Math.exp(-(k - dur * SR) / (tail * SR + 1)) : 1);
    const v = (y * (1 - tonal) + Math.sin(ph) * tonal * 0.5) * env * vel;
    const [gl, gr] = pan(Math.sin(u * Math.PI * 3) * 0.3 * u);
    bus.add(i0 + k, v * gl, v * gr);
  }
}

// Short filtered-noise sweep (up = brighter). Peaks at t.
export function sweep(bus, t, { dur = 0.45, vel = 0.15, up = true, seed = 13 } = {}) {
  whoosh(bus, t - dur * 0.43, dur, vel, { f0: up ? 500 : 6000, f1: up ? 6000 : 400, p0: 0, p1: 0, seed, q: 1.6 });
}

// Interface confirmation: two clean tones (default a rising fifth). For real-app films.
export function uiConfirm(bus, t, { vel = 0.25, notes = [84, 91], gap = 0.07, p = 0 } = {}) {
  notes.forEach((m, i) => bell(bus, t + i * gap, m, vel * (i ? 0.8 : 1), { p, decay: 0.35 }));
}

// Mechanical click / tick (switch, latch, cap). bright 0..1.
export function click(bus, t, { vel = 0.3, bright = 0.6, p = 0, seed = 17 } = {}) {
  noiseHit(bus, t, { dur: 0.004 + 0.006 * (1 - bright), vel: vel * 0.8, hp: 2500 + 5000 * bright, p, seed });
  noiseHit(bus, t + 0.001, { dur: 0.02, vel: vel * 0.25, bp: 1800 + 1500 * bright, q: 8, p, seed: seed + 1 });
}

// Servo / motor movement over [t, t + dur]: buzzy glide with a soft start and stop.
export function mechanical(bus, t, { dur = 0.6, vel = 0.12, f0 = 110, f1 = 160, p = 0 } = {}) {
  const i0 = Math.round(t * SR), len = Math.round(dur * SR), lp = biquad('lp', 1400, 0.8), [gl, gr] = pan(p);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const u = k / len, f = f0 + (f1 - f0) * Math.sin(u * Math.PI / 2);
    ph += 2 * Math.PI * f / SR;
    const saw = 2 * ((ph / (2 * Math.PI)) % 1) - 1, env = Math.sin(Math.PI * u) ** 0.5;
    const s = lp(saw) * env * vel; bus.add(i0 + k, s * gl, s * gr);
  }
}

// Room tone / texture bed from start to end. kind: 'room' (low hum air), 'air' (bright hiss), 'paper'.
export function texture(bus, start, end, { level = 0.02, kind = 'room', seed = 19, fade = 0.5 } = {}) {
  const i0 = Math.round(start * SR), len = Math.round((end - start) * SR), r = rng(seed);
  const fl = biquad(kind === 'air' ? 'hp' : 'lp', kind === 'air' ? 5000 : kind === 'paper' ? 2500 : 420, 0.7);
  const fr = biquad(kind === 'air' ? 'hp' : 'lp', kind === 'air' ? 5000 : kind === 'paper' ? 2500 : 420, 0.7);
  for (let k = 0; k < len; k++) {
    const tt = k / SR, env = clamp(tt / fade) * clamp((end - start - tt) / fade);
    const crackle = kind === 'paper' && r() > 0.9993 ? (r() * 2 - 1) * 6 : 0;
    bus.add(i0 + k, (fl(r() * 2 - 1) + crackle) * level * env, (fr(r() * 2 - 1) + crackle) * level * env);
  }
}

// Registry: purpose and timing semantics for each designed sound (used by cue validation).
export const SFX = Object.freeze({
  impact: { fn: impact, at: 'transient', purpose: 'a decisive arrival: hero lands, title slams, drop' },
  softHit: { fn: softHit, at: 'transient', purpose: 'a gentle confirmation: product settles, copy lands' },
  whoosh: { fn: whooshBy, at: 'peak', purpose: 'something passes the lens (foreground wipe, whip)' },
  riser: { fn: riser, at: 'end', purpose: 'tension into a release; ends exactly on the cue' },
  sweep: { fn: sweep, at: 'peak', purpose: 'a light/graphic sweep or quick transition' },
  ui: { fn: uiConfirm, at: 'transient', purpose: 'a real interface action succeeding' },
  click: { fn: click, at: 'transient', purpose: 'mechanical contact: cap, switch, tap' },
  mechanical: { fn: mechanical, at: 'start', purpose: 'a device moving for a duration' },
  texture: { fn: (bus, t, o = {}) => texture(bus, t, t + (o.dur ?? 2), o), at: 'start', purpose: 'room tone / air bed under a scene' },
});

export { Bus, mtof };
