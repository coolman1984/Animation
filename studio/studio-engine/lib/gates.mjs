// Studio Engine — quality gates that the studio's make.mjs does not already run.
// lint (before any browser), frames (on the stills sheet), sync + motion (on the export). Each failure names its scene.
import { spawnSync } from 'node:child_process';
import { timeline, eventsOf } from './events.js';
import { onsets } from './analyze.mjs';
import { ELEMENTS, SECTIONS, TRANSITIONS, BACKGROUNDS, CHORD_NAMES, HOOK_NAMES } from './vocab.js';

const ARABIC = /[؀-ۿ]/, LATIN = /[A-Za-z]{2,}/;
const lum = (hex) => { if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return NaN; const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export const KNOWN = new Set(ELEMENTS);

// format: the delivery format name (sizes come from brand.export.formats); defaults to spec.format, then youtube.
// brand.json shape (audit R2): a missing colour used to paint "undefined47" with no error. Keys = what the player and modules read.
export const BRAND_COLORS = ['ink', 'text', 'primary', 'primaryDark', 'glow', 'ice', 'accent', 'accentDark', 'warm', 'muted', 'paper'];
export function validateBrand(brand) {
  const e = [], hex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), num = (v) => Number.isFinite(v);
  if (!brand || typeof brand !== 'object') return ['brand must be an object'];
  for (const k of BRAND_COLORS) if (!hex(brand.colors?.[k])) e.push(`brand.colors.${k} must be a six-digit hex colour`);
  if (typeof brand.fonts?.display !== 'string' || !brand.fonts.display) e.push('brand.fonts.display must name a font family');
  const x = brand.export || {};
  if (!(Number.isInteger(x.fps) && x.fps > 0 && x.fps <= 120)) e.push('brand.export.fps must be an integer 1..120');
  if (!num(x.lufs) || !num(x.tp)) e.push('brand.export.lufs and tp must be numbers');
  if (!x.formats || !Object.keys(x.formats).length) e.push('brand.export.formats must list at least one format');
  for (const [name, f] of Object.entries(x.formats || {})) {
    if (!(Number.isInteger(f?.w) && Number.isInteger(f?.h) && f.w > 0 && f.h > 0)) { e.push(`brand.export.formats.${name}: w and h must be positive integers`); continue; }
    const s = f.safe; if (!(Array.isArray(s) && s.length === 4 && s.every(num) && s[0] >= 0 && s[1] >= 0 && s[2] <= f.w && s[3] <= f.h && s[0] < s[2] && s[1] < s[3])) e.push(`brand.export.formats.${name}.safe must be [x0, y0, x1, y1] inside ${f.w}×${f.h}`);
    if (!(num(f.shareMB) && f.shareMB > 0)) e.push(`brand.export.formats.${name}.shareMB must be positive`);
  }
  return e;
}

/** @param {any} spec @param {any} brand @param {{ format?: string }} [opts] */
export function lint(spec, brand, { format } = {}) {
  const errors = [], warns = [];
  let tl;
  try { tl = timeline(spec); } catch (error) { return { errors: [error.message], warns, duration: null }; }
  const brandErrors = validateBrand(brand);
  if (brandErrors.length) return { errors: brandErrors, warns, duration: tl.duration };
  if (spec.assets != null && (!Array.isArray(spec.assets) || spec.assets.some((a) => !a || typeof a !== 'object'))) errors.push('assets must be an array of objects');
  for (const key of ['music', 'voice']) if (spec.audio?.[key] != null && typeof spec.audio[key] !== 'string') errors.push(`audio.${key} must be a local file path`);
  // audio.sounds: recorded effects / ambience beds (Openverse first: node studio.mjs sfx "…" --download=<film>) placed on the film clock
  if (spec.audio?.sounds != null) {
    if (!Array.isArray(spec.audio.sounds)) errors.push('audio.sounds must be an array');
    else spec.audio.sounds.forEach((x, i) => {
      const at = `audio.sounds[${i}]`;
      if (!x || typeof x.file !== 'string' || !x.file) { errors.push(`${at}.file must be a local file path`); return; }
      if ((x.t == null) === (x.at == null)) errors.push(`${at}: give exactly one of t (seconds) or at (beats from the film start)`);
      for (const k of ['t', 'at']) if (x[k] != null && !(Number.isFinite(x[k]) && x[k] >= 0 && (k === 't' ? x[k] < tl.duration : x[k] < tl.beats))) errors.push(`${at}.${k} must be inside the film`);
      if (x.gain != null && !(Number.isFinite(x.gain) && x.gain >= 0 && x.gain <= 4)) errors.push(`${at}.gain must be 0..4`);
      if (x.role != null && !['effect', 'ambience'].includes(x.role)) errors.push(`${at}.role must be effect or ambience`);
    });
  }
  // closed word lists (audit R1): a typo used to fall back silently (A minor, a cut, a generic section) or crash in the browser
  const oneOf = (value, list, what) => { if (value != null && !list.includes(value)) errors.push(`${what} "${value}" is not one of: ${list.join(', ')}`); };
  oneOf(spec.background, BACKGROUNDS, 'background');
  for (const c of spec.music?.progression || []) oneOf(c, CHORD_NAMES, 'music.progression chord');
  oneOf(spec.music?.final, CHORD_NAMES, 'music.final chord');
  if (spec.music?.hook != null && !HOOK_NAMES.includes(spec.music.hook)) warns.push(`music.hook "${spec.music.hook}" has no written line; the automatic 3-3-2 hook plays (written hooks: ${HOOK_NAMES.join(', ')})`);
  const B = brand.colors, hex = (c, d) => (c ? (B[c] || c) : d);
  const bgOf = (s) => (/^#[0-9a-f]{6}$/i.test(s.bg || '') ? s.bg : s.bg === 'light' ? '#E8EEF8' : s.bg === 'blue' ? '#0A2A8C' : B.ink);
  tl.scenes.forEach((s, i) => {
    const where = `scene ${s.id}`;
    oneOf(s.music, SECTIONS, `${where}: music section`); oneOf(s.transition, TRANSITIONS, `${where}: transition`);
    if (!(s.beats > 0)) errors.push(`${where}: beats must be > 0`);
    if (!s.elements?.length) errors.push(`${where}: no elements — a scene must move`);
    if (i > 0 && (s.transition || 'cut') === 'cut' && s.elements?.some((e) => e.type === 'shape') && tl.scenes[i - 1].elements?.some((e) => e.type === 'shape' && !e.morphTo)) warns.push(`${where}: hard cut between two scenes with shapes — a morphTo would carry the eye`);
    for (const e of s.elements || []) {
      if (!KNOWN.has(e.type)) errors.push(`${where}: unknown element "${e.type}"`);
      for (const k of ['x', 'y', 'w', 'h', 'r', 'rot', 'size', 'speed', 'radius', 'width', 'tilt', 'fold', 'amp']) if (e[k] != null && !Number.isFinite(e[k])) errors.push(`${where}: ${e.type}.${k} must be a finite number`);
      for (const k of ['at', 'out', 'cutAt', 'midAt', 'pushAt', 'implodeAt', 'start', 'step', 'clickAt', 'dur']) if (e[k] != null && (!Number.isFinite(e[k]) || e[k] < 0)) errors.push(`${where}: ${e.type}.${k} must be a finite nonnegative number`);
      if (e.type === 'words' && typeof e.text !== 'string') { errors.push(`${where}: words.text must be a string`); continue; }
      for (const k of ['lines', 'parts', 'items', 'people', 'points', 'morph', 'paths', 'times']) if (e[k] != null && !Array.isArray(e[k])) errors.push(`${where}: ${e.type}.${k} must be an array`);
      if (['lines', 'parts'].some((k) => e[k] != null && !Array.isArray(e[k]))) continue;
      if ((e.lines || []).some((l) => !l || typeof l !== 'object') || (e.parts || []).some((p) => typeof p !== 'string' && (!p || typeof p !== 'object'))) { errors.push(`${where}: malformed text lines/parts`); continue; }
      if (e.type === 'path' && (!Array.isArray(e.paths) || !e.paths.length)) errors.push(`${where}: path.paths must be a nonempty array`);
      if (e.type === 'path' && Array.isArray(e.times) && (e.times.length !== e.paths?.length || e.times.some((v, i) => !Number.isFinite(v) || v < 0 || (i && v <= e.times[i - 1])))) errors.push(`${where}: path.times must match the paths and increase`);
      if (e.type === 'cursor' && (!Array.isArray(e.points) || !e.points.length || e.points.some((p) => !p || ![p.at, p.x, p.y].every(Number.isFinite)))) errors.push(`${where}: cursor.points must contain finite at/x/y coordinates`);
      if (e.type === 'ribbon') for (const key of ['count', 'cols']) if (e[key] != null && (!Number.isInteger(e[key]) || e[key] < 1 || e[key] > 24)) errors.push(`${where}: ribbon.${key} must be an integer between 1 and 24`);
      for (const k of ['at', 'out', 'cutAt', 'midAt', 'pushAt', 'implodeAt', 'start', 'step']) if (e[k] != null && Math.abs(e[k] * 4 - Math.round(e[k] * 4)) > 1e-6 && Math.abs(e[k] * 10 - Math.round(e[k] * 10)) > 1e-6) warns.push(`${where}: ${e.type}.${k}=${e[k]} is off the 16th grid`);
      if (e.at != null && e.at > s.beats) errors.push(`${where}: ${e.type} starts after the scene ends`);
      if (e.out != null && Number.isFinite(e.out) && e.out <= (e.at ?? 0)) errors.push(`${where}: ${e.type}.out (${e.out}) must come after its at (${e.at ?? 0})`);
      else if (e.out != null && e.out > s.beats + 1e-9) warns.push(`${where}: ${e.type}.out (${e.out}) is after the scene ends (${s.beats} beats); it is cut at the scene end`);
      const texts = [e.text, ...(e.lines || []).map((l) => l.text), ...(e.parts || []).map((p) => (typeof p === 'string' ? p : p.text))].filter(Boolean);
      if (texts.some((t) => typeof t !== 'string')) { errors.push(`${where}: text must be a string`); continue; }
      for (const t of texts) if (/[‹›]/.test(t)) errors.push(`${where}: placeholder left in "${t}" — write the real line`);
      for (const t of texts) { const lat = t.match(/[A-Za-z][A-Za-z&-]*/g) || []; if (e.type !== 'cards' && ARABIC.test(t) && (lat.length > 1 || lat.some((w) => w.length > 4))) warns.push(`${where}: "${t}" mixes Arabic with Latin words — bidi can reorder them; use pill parts or two lines`); }
      if (e.type === 'words') { const vis = ((e.out ?? s.beats) - (e.at ?? 0)) * tl.B, need = Math.max(0.8, [...e.text].length / 17); if (vis < need) warns.push(`${where}: "${e.text}" is readable ${vis.toFixed(1)} s, needs ~${need.toFixed(1)} s`);
        const c = contrast(hex(e.color, B.text), e.on ? hex(e.on) : bgOf(s)); /* `on` = what the text sits on */ if (!Number.isFinite(c)) errors.push(`${where}: words.color/on must resolve to a six-digit hex color`); else if (c < 3) errors.push(`${where}: "${e.text}" contrast ${c.toFixed(1)}:1 on the scene background`); }
      if (e.type === 'image' && e.role === 'logo') {   // audit B5: the real frame of this format, the module's real scale and default
        const F = brand.export?.formats?.[format || spec.format || 'youtube'] || { w: 1920, h: 1080 }, shown = (e.w ?? 800) * Math.min(F.w, F.h) / 1080;
        if (shown > 0.22 * F.w) warns.push(`${where}: logo is ${Math.round(100 * shown / F.w)}% of the frame width (house rule: at most 22%)`);
        if ((e.fit || 'cover') !== 'contain') warns.push(`${where}: logo uses fit "${e.fit || 'cover'}" and may be cropped; set fit: "contain" so it shows whole`);
      }
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
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', video, '-vf', `freezedetect=n=-60dB:d=${maxStill}`, '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 24 });
  if (r.error || r.status !== 0) throw new Error(`motion analysis failed: ${r.error?.message || r.stderr || 'ffmpeg did not complete'}`);
  const starts = [...r.stderr.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => +m[1]), ends = [...r.stderr.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => +m[1]);
  return starts.map((s, i) => [s, ends[i] ?? tl.duration]).filter(([s, e]) => !holds.some(([a, b]) => s >= a - 0.05 && e <= b + 0.05)).map(([s, e]) => `${s.toFixed(2)}–${e.toFixed(2)} s (${tl.scenes.find((q) => s >= q.a && s < q.b)?.id}) has no motion`);
}
