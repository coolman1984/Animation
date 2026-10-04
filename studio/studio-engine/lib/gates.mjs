// Studio Engine — quality gates that the studio's make.mjs does not already run.
// lint (before any browser), frames (on the stills sheet), sync + motion (on the export). Each failure names its scene.
import { spawnSync } from 'node:child_process';
import { timeline, eventsOf } from './events.js';
import { onsets } from './analyze.mjs';

const ARABIC = /[؀-ۿ]/, LATIN = /[A-Za-z]{2,}/;
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const KNOWN = new Set(['words', 'stack', 'extrude', 'lockup', 'storm', 'slice', 'cards', 'ring', 'pill', 'wipes', 'slab', 'hosts', 'mark', 'sparks', 'shape', 'path', 'icon', 'image', 'ribbon', 'cursor']);

export function lint(spec, brand) {
  const tl = timeline(spec), errors = [], warns = [], B = brand.colors, hex = (c, d) => (c ? (B[c] || c) : d);
  const bgOf = (s) => (/^#[0-9a-f]{6}$/i.test(s.bg || '') ? s.bg : s.bg === 'light' ? '#E8EEF8' : s.bg === 'blue' ? '#0A2A8C' : B.ink);
  tl.scenes.forEach((s, i) => {
    const where = `scene ${s.id}`;
    if (!(s.beats > 0)) errors.push(`${where}: beats must be > 0`);
    if (!s.elements?.length) errors.push(`${where}: no elements — a scene must move`);
    if (i > 0 && (s.transition || 'cut') === 'cut' && s.elements?.some((e) => e.type === 'shape') && tl.scenes[i - 1].elements?.some((e) => e.type === 'shape' && !e.morphTo)) warns.push(`${where}: hard cut between two scenes with shapes — a morphTo would carry the eye`);
    for (const e of s.elements || []) {
      if (!KNOWN.has(e.type)) errors.push(`${where}: unknown element "${e.type}"`);
      for (const k of ['at', 'out', 'cutAt', 'midAt', 'pushAt', 'implodeAt', 'start', 'step']) if (e[k] != null && Math.abs(e[k] * 4 - Math.round(e[k] * 4)) > 1e-6 && Math.abs(e[k] * 10 - Math.round(e[k] * 10)) > 1e-6) warns.push(`${where}: ${e.type}.${k}=${e[k]} is off the 16th grid`);
      if (e.at != null && e.at > s.beats) errors.push(`${where}: ${e.type} starts after the scene ends`);
      const texts = [e.text, ...(e.lines || []).map((l) => l.text), ...(e.parts || []).map((p) => (typeof p === 'string' ? p : p.text))].filter(Boolean);
      for (const t of texts) { const lat = t.match(/[A-Za-z][A-Za-z&-]*/g) || []; if (e.type !== 'cards' && ARABIC.test(t) && (lat.length > 1 || lat.some((w) => w.length > 4))) warns.push(`${where}: "${t}" mixes Arabic with Latin words — bidi can reorder them; use pill parts or two lines`); }
      if (e.type === 'words') { const vis = ((e.out ?? s.beats) - (e.at ?? 0)) * tl.B, need = Math.max(0.8, [...e.text].length / 17); if (vis < need) warns.push(`${where}: "${e.text}" is readable ${vis.toFixed(1)} s, needs ~${need.toFixed(1)} s`);
        const c = contrast(hex(e.color, B.text), e.on ? hex(e.on) : bgOf(s)); /* `on` = what the text sits on */ if (c < 3) errors.push(`${where}: "${e.text}" contrast ${c.toFixed(1)}:1 on the scene background`); }
      if (e.type === 'image' && e.role === 'logo' && (e.w ?? 800) > 0.22 * 1920) warns.push(`${where}: logo wider than 22% of the frame`);
    }
  });
  if (Math.abs(tl.duration - Math.round(tl.duration)) > 0.01) warns.push(`duration ${tl.duration.toFixed(2)} s is not a whole second`);
  return { errors, warns, duration: tl.duration };
}
// stills boxes (from lib/render.mjs stills → boxes.json): text inside the safe box and no overlaps, per time
export function frames(boxes, safe, tl) {
  const out = [];
  for (const [t, list] of Object.entries(boxes)) {
    const sc = tl.scenes.find((s) => +t >= s.a && +t < s.b)?.id;
    for (const b of list) if (b.x0 < safe[0] - 2 || b.y0 < safe[1] - 2 || b.x1 > safe[2] + 2 || b.y1 > safe[3] + 2) out.push(`${(+t).toFixed(2)} s (${sc}): "${b.text}" leaves the safe area`);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); if (ox > 4 && oy > 4) out.push(`${(+t).toFixed(2)} s (${sc}): "${a.text}" overlaps "${b.text}"`); }
  }
  return out;
}
// sounded events must land within tol of an onset in the SFX stem
export function sync(spec, sfxWav, tol = 0.07) {
  // a hit may start up to 100 ms early (the whoosh/riser lead-in is the anticipation of the hit), never more than `tol` late
  const ev = eventsOf(spec).filter((e) => ['slam', 'impact', 'flash', 'smash', 'wipe', 'flip', 'slash'].includes(e.kind)), on = onsets(sfxWav, { thresh: 0.3 });
  const miss = ev.filter((e) => !on.some((o) => o >= e.t - 0.1 - (e.kind === 'flip' ? 0.3 : 0) && o <= e.t + tol));
  return { checked: ev.length, missed: miss.map((e) => `${e.t.toFixed(2)} s ${e.kind} (${e.id})`) };
}
// no span longer than maxStill without visible motion (stricter than the studio's 1 s freeze gate), holds excluded
export function motion(video, tl, { maxStill = 0.7, holds = [] } = {}) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', video, '-vf', `freezedetect=n=-60dB:d=${maxStill}`, '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const starts = [...r.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => +m[1]), ends = [...r.stderr.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => +m[1]);
  return starts.map((s, i) => [s, ends[i] ?? tl.duration]).filter(([s, e]) => !holds.some(([a, b]) => s >= a - 0.05 && e <= b + 0.05)).map(([s, e]) => `${s.toFixed(2)}–${e.toFixed(2)} s (${tl.scenes.find((q) => s >= q.a && s < q.b)?.id}) has no motion`);
}
