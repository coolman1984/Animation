// Visual review evidence from an EXPORTED film: the frames a director needs to look at, chosen by
// what happens in the film (shot boundaries, transitions, copy, camera peaks, musical landings),
// plus advisory diagnostics. Nothing here scores taste; it makes looking fast and targeted.
// Output: <dir>/index.html (gallery), review.json, frames/*.jpg, strips/*.jpg, crops/*.png, contact.jpg.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { run } from './render.mjs';
import { probe } from './measure.mjs';
import { readingTime } from './typography.js';
import { cameraDiagnostics } from './cinema.js';
import { describeTime } from './musicmap.mjs';
import { cueSync } from './cues.mjs';

const r2 = v => +v.toFixed(2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function still(video, t, out, { w } = {}) {
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(4), '-i', video, '-frames:v', '1', ...(w ? ['-vf', `scale=${w}:-2`] : []), '-q:v', '3', out]);
  return out;
}
// Horizontal strip of frames at the given times (one ffmpeg call per frame, then hstack).
async function strip(video, times, out, { h = 240 } = {}) {
  const tmp = times.map((t, i) => out + `.${i}.jpg`);
  for (const [i, t] of times.entries()) await run('ffmpeg', ['-v', 'error', '-y', '-ss', Math.max(0, t).toFixed(4), '-i', video, '-frames:v', '1', '-vf', `scale=-2:${h}`, '-q:v', '3', tmp[i]]);
  await run('ffmpeg', ['-v', 'error', '-y', ...tmp.flatMap(f => ['-i', f]), '-filter_complex', `${tmp.map((_, i) => `[${i}]`).join('')}hstack=inputs=${tmp.length}`, '-q:v', '3', out]);
  for (const f of tmp) execFileSync('rm', ['-f', f]);
  return out;
}
// Intersection of a box with the frame as integer crop geometry (even-sized minimum 2×2), or null when
// the box lies wholly outside: off-frame copy is a layout finding to report, never an FFmpeg failure.
export function clampCrop([x0, y0, x1, y1], vw, vh) {
  const ax = Math.max(0, Math.floor(x0)), ay = Math.max(0, Math.floor(y0)), bx = Math.min(vw, Math.ceil(x1)), by = Math.min(vh, Math.ceil(y1));
  if (bx - ax < 2 || by - ay < 2) return null;
  return { x: ax, y: ay, w: bx - ax, h: by - ay };
}
function rawCrop(video, t, box, vw, vh) {
  const c = clampCrop(box, vw, vh); if (!c) return null;
  return { buf: execFileSync('ffmpeg', ['-v', 'error', '-ss', t.toFixed(4), '-i', video, '-frames:v', '1', '-vf', `crop=${c.w}:${c.h}:${c.x}:${c.y},format=rgb24`, '-f', 'rawvideo', '-']), ...c };
}
const lum = (r, g, b) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };

// Contrast estimate inside a text box: ratio between the bright and dark ends of the luminance
// distribution (text vs its immediate background). Approximate; flags candidates for a closer look.
export function boxContrast(buf) {
  const L = []; for (let i = 0; i + 2 < buf.length; i += 3) L.push(lum(buf[i], buf[i + 1], buf[i + 2]));
  L.sort((a, b) => a - b);
  // 2nd/98th percentiles: small, thin glyphs cover few pixels (8/92 underestimated 15:1 text as 2:1).
  const lo = L[Math.floor(L.length * 0.02)], hi = L[Math.floor(L.length * 0.98)];
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}

// Per-frame motion energy (mean absolute luma change, 0..255) on a small copy of the video.
export async function motionEnergy(video, { width = 160 } = {}) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', video, '-an', '-vf', `scale=${width}:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG`, '-f', 'null', '-']);
  const vals = [...err.matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map(m => +m[1]);
  const times = [...err.matchAll(/pts_time:([\d.]+)/g)].map(m => +m[1]);
  return vals.map((v, i) => ({ t: times[i] ?? i, v }));
}

export async function silences(file, { noise = -50, min = 1 } = {}) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `silencedetect=n=${noise}dB:d=${min}`, '-f', 'null', '-']);
  const s = [...err.matchAll(/silence_start: (-?[\d.]+)/g)].map(m => +m[1]), e = [...err.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  return s.map((x, i) => ({ start: r2(Math.max(0, x)), end: e[i] !== undefined ? r2(e[i]) : null }));
}

// Tiny luma thumbnail (16×9 region-averages) for composition similarity.
function thumb(video, t, vw, vh) {
  const gw = 16, gh = Math.max(4, Math.round(16 * vh / vw));
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-ss', t.toFixed(4), '-i', video, '-frames:v', '1', '-vf', `scale=${gw}:${gh}:flags=area,format=gray`, '-f', 'rawvideo', '-']);
  const m = buf.reduce((a, b) => a + b, 0) / buf.length; return [...buf].map(v => v - m);
}
const corr = (a, b) => { let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; } return ab / Math.sqrt(aa * bb || 1); };

// Times worth looking at, each with reasons. Source-time plan is used only when timeline = source.
export function reviewSamples({ duration, fps, plan, text, camera, music, sourceTimeline = true }) {
  const map = new Map(), f = 1 / fps;
  const add = (t, why) => { if (!(t >= 0 && t < duration)) return; const k = Math.round(t * fps) / fps; const e = map.get(k) || []; if (!e.includes(why)) e.push(why); map.set(k, e); };
  add(0, 'first frame'); add(duration - f, 'last frame');
  if (plan && sourceTimeline) for (const s of plan.shots) {
    add(s.start + Math.min(0.3, (s.end - s.start) / 4), `${s.id}: entrance`); add((s.start + s.end) / 2, `${s.id}: hold`); add(s.end - Math.min(0.3, (s.end - s.start) / 4), `${s.id}: exit`);
    if (s.start > 0) { add(s.start - f, `${s.id}: frame before cut`); add(s.start, `${s.id}: first frame after cut`); }
  }
  if (plan?.creative?.styleFrames && sourceTimeline) for (const [k, t] of Object.entries(plan.creative.styleFrames)) add(t, `style frame: ${k}`);
  for (const l of text?.lines || []) add(Math.min(l.end - f, l.start + Math.min(0.6, (l.end - l.start) / 2)), `copy: ${l.text}`);
  if (camera?.peakSpeedTime !== undefined) add(camera.peakSpeedTime, 'camera: peak speed');
  for (const e of camera?.events || []) add(e.t, `camera: ${e.kind}`);
  if (music && sourceTimeline) { for (const r of music.releases) add(r.t, 'music: release'); for (const p of music.peaks) add(p.t, 'music: peak'); }
  if (map.size < 12) for (let i = 1; i < 12; i++) add((duration * i) / 12, 'uniform');
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([t, why]) => ({ t: +t.toFixed(4), why }));
}

// Build the evidence folder. Inputs: exported video, delivery info, optional plan/text/music/cues/sfx stem.
export async function reviewEvidence({ video, outDir, fps, plan, text, music, holds = [], sourceTimeline = true, sfxStem, cues, cropSize }) {
  mkdirSync(join(outDir, 'frames'), { recursive: true }); mkdirSync(join(outDir, 'strips'), { recursive: true }); mkdirSync(join(outDir, 'crops'), { recursive: true });
  const p = await probe(video), duration = p.duration, vw = p.width, vh = p.height;
  fps ||= p.fps;
  const notes = [];
  // Camera diagnostics from the composer's camera(t) samples (interpolated).
  let camera = null;
  if (text?.camera?.samples?.length > 4) {
    const S = text.camera.samples, t0 = S[0][0], dt = S[1][0] - S[0][0];
    const at = t => { const x = Math.min(S.length - 1.001, Math.max(0, (t - t0) / dt)), i = Math.floor(x), u = x - i, A = S[i], B = S[i + 1];
      return { x: A[1] + (B[1] - A[1]) * u, y: A[2] + (B[2] - A[2]) * u, zoom: A[3] * (B[3] / A[3]) ** u, focus: A[4] + (B[4] - A[4]) * u, aperture: A[5] + (B[5] - A[5]) * u }; };
    const cuts = plan && sourceTimeline ? plan.shots.slice(1).map(s => s.start) : [];
    camera = cameraDiagnostics(at, { start: t0 + dt, end: S.at(-1)[0] - dt, fps, viewport: { w: vw, h: vh }, holds, cuts });
  }
  const samples = reviewSamples({ duration, fps, plan, text, camera, music, sourceTimeline });
  for (const s of samples) {
    s.file = `frames/t${s.t.toFixed(2).padStart(6, '0')}.jpg`;
    await still(video, s.t, join(outDir, s.file), { w: Math.min(vw, 720) });
    if (music) s.music = describeTime(music, s.t);
  }
  // Boundary strips (−2f … +2f) and transition motion strips (8 frames across ±0.5 s).
  const strips = [];
  if (plan && sourceTimeline) for (const s of plan.shots.filter(s => s.start > 0)) {
    const f = 1 / fps, b = `strips/cut-${s.id}.jpg`, m = `strips/motion-${s.id}.jpg`;
    await strip(video, [-2, -1, 0, 1, 2].map(k => s.start + k * f), join(outDir, b), { h: 200 });
    await strip(video, Array.from({ length: 8 }, (_, i) => s.start - 0.5 + i / 7), join(outDir, m), { h: 160 });
    strips.push({ shot: s.id, t: s.start, boundary: b, motion: m, transition: s.craft?.transition || null, music: music ? describeTime(music, s.start) : null });
  }
  // 100% crops: centre at each shot's hold, and each line of copy at its readable middle.
  const crops = [], cs = cropSize || Math.round(Math.min(vw, vh) / 2);
  for (const s of (plan && sourceTimeline ? plan.shots : [{ id: 'mid', start: 0, end: duration }]).slice(0, 12)) {
    const t = (s.start + s.end) / 2, file = `crops/${s.id}-centre.png`;
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(4), '-i', video, '-frames:v', '1', '-vf', `crop=${cs}:${cs}:${Math.round((vw - cs) / 2)}:${Math.round((vh - cs) / 2)}`, join(outDir, file)]);
    crops.push({ t: r2(t), file, what: `${s.id} centre 100%` });
  }
  // Copy diagnostics: reading time, contrast; crop each line for a sharp look at shaping/edges.
  const copy = [];
  for (const [i, l] of (text?.lines || []).entries()) {
    const dur = l.end - l.start, need = readingTime(l.text), row = { text: l.text, start: l.start, end: l.end, seconds: r2(dur), needs: r2(need), readable: dur >= need };
    if (l.box) {
      // mid-span: entrance animations have finished
      const t = (l.start + l.end) / 2, pad = 12, box = [l.box[0] - pad, l.box[1] - pad, l.box[2] + pad, l.box[3] + pad];
      const crop = rawCrop(video, t, box, vw, vh);
      if (!crop) { row.offscreen = true; notes.push(`copy "${l.text}" lies outside the frame at ${r2(t)}s`); copy.push(row); continue; }
      row.contrast = boxContrast(crop.buf); row.lowContrast = row.contrast < 3;
      const file = `crops/copy-${i + 1}.png`;
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(4), '-i', video, '-frames:v', '1', '-vf', `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`, join(outDir, file)]);
      row.crop = file;
    }
    copy.push(row);
    if (!row.readable) notes.push(`copy "${l.text}" is on screen ${row.seconds}s; reading it needs about ${row.needs}s`);
    if (row.lowContrast) notes.push(`copy "${l.text}" contrast ≈ ${row.contrast}:1 at ${r2(l.start)}s; check legibility over the image`);
  }
  // Motion energy: suspicious stillness outside declared holds, and the busiest moments.
  const energy = await motionEnergy(video);
  const still_ = []; let s0 = null;
  for (const e of energy) {
    const quiet = e.v < 0.08 && !holds.some(([a, b]) => e.t >= a && e.t <= b);
    if (quiet && s0 === null) s0 = e.t; if (!quiet && s0 !== null) { if (e.t - s0 >= 1.5) still_.push({ start: r2(s0), end: r2(e.t) }); s0 = null; }
  }
  if (s0 !== null && duration - s0 >= 1.5) still_.push({ start: r2(s0), end: r2(duration) });
  for (const x of still_) notes.push(`picture nearly static ${x.start}–${x.end}s outside a declared hold: intended stillness or dead air?`);
  const busiest = [...energy].sort((a, b) => b.v - a.v).filter((e, i, arr) => arr.findIndex(o => Math.abs(o.t - e.t) < 1) === i).slice(0, 3).map(e => ({ t: r2(e.t), energy: r2(e.v) }));
  // Composition repetition between non-adjacent shots (same framing over and over).
  const repeats = [];
  if (plan && sourceTimeline && plan.shots.length >= 3) {
    const th = plan.shots.map(s => thumb(video, (s.start + s.end) / 2, vw, vh));
    for (let i = 0; i < th.length; i++) for (let j = i + 2; j < th.length; j++) { const c = corr(th[i], th[j]); if (c > 0.96) repeats.push({ a: plan.shots[i].id, b: plan.shots[j].id, similarity: r2(c) }); }
    for (const r of repeats) notes.push(`shots ${r.a} and ${r.b} have nearly the same composition (${r.similarity}); intentional bookend or repetition?`);
  }
  // Audio: silences inside the film; cue sync against the rendered SFX stem.
  const silence = p.acodec ? await silences(video) : [];
  for (const x of silence) if (x.start > 0.2 && (x.end ?? duration) < duration - 0.3) notes.push(`audio silent ${x.start}–${x.end}s`);
  let sync = null;
  if (cues?.length && sfxStem && existsSync(sfxStem)) {
    const { analyzeNode } = await import('./musicmap.mjs');
    const onsets = (await analyzeNode(sfxStem)).onsets;
    sync = cueSync(cues, onsets);
    for (const c of sync.filter(c => !c.ok)) notes.push(`cue ${c.id}: sound transient ${c.delta === null ? 'not found' : `${Math.round(c.delta * 1000)} ms off`} from picture time ${c.t}s`);
  }
  for (const e of camera?.events || []) notes.push(`camera ${e.kind} at ${e.t}s: ${e.message}`);
  await run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `fps=${Math.max(0.5, 24 / duration).toFixed(3)},scale=${Math.round(vw / Math.max(vw, vh) * 260)}:-2,tile=6x4:padding=4:color=0x202020`, '-frames:v', '1', join(outDir, 'contact.jpg')]);
  const report = { video: basename(video), duration: r2(duration), size: [vw, vh], timeline: sourceTimeline ? 'source = delivery' : 'delivery (cut-down: plan times not applied)',
    samples, strips, crops, copy, camera, stillness: still_, busiest, repeats, silence, sync, notes,
    disclaimer: 'Advisory evidence for a human/AI director. It does not judge taste and does not replace watching and listening to the film.' };
  writeFileSync(join(outDir, 'review.json'), JSON.stringify(report, null, 1));
  writeFileSync(join(outDir, 'index.html'), galleryHtml(report));
  return report;
}

function galleryHtml(r) {
  const fig = (src, cap) => `<figure><img loading="lazy" src="${esc(src)}"><figcaption>${cap}</figcaption></figure>`;
  return `<!doctype html><meta charset="utf-8"><title>Review ${esc(r.video)}</title>
<style>body{background:#151515;color:#ddd;font:14px system-ui;margin:24px}h2{margin-top:32px;font-weight:600}.g{display:flex;flex-wrap:wrap;gap:12px}
figure{margin:0;max-width:360px}img{max-width:100%;display:block;border:1px solid #333}figcaption{font-size:12px;color:#aaa;padding:4px 0}.w img{max-width:none;width:100%}
li{margin:4px 0}.n{color:#f0c674}</style>
<h1>${esc(r.video)} · ${r.duration}s · ${r.size.join('×')}</h1><p>${esc(r.disclaimer)}</p>
<h2>Notes to look at</h2><ul>${r.notes.map(n => `<li class="n">${esc(n)}</li>`).join('') || '<li>none</li>'}</ul>
<h2>Moments</h2><div class="g">${r.samples.map(s => fig(s.file, `<b>${s.t}s</b> ${esc(s.why.join(' · '))}${s.music ? `<br>${esc(s.music)}` : ''}`)).join('')}</div>
<h2>Cuts (−2f … +2f) and transition motion</h2>${r.strips.map(s => `<div class="w">${fig(s.boundary, `<b>${s.shot}</b> at ${s.t}s ${esc(s.transition || '')}${s.music ? ` · ${esc(s.music)}` : ''}`)}${fig(s.motion, 'transition ±0.5 s')}</div>`).join('') || '<p>no plan boundaries</p>'}
<h2>100% crops</h2><div class="g">${[...r.crops.map(c => fig(c.file, esc(c.what))), ...r.copy.filter(c => c.crop).map(c => fig(c.crop, `${esc(c.text)} · ${c.seconds}s (needs ${c.needs}s) · contrast ≈ ${c.contrast}:1`))].join('')}</div>
<h2>Contact sheet</h2><div class="w">${fig('contact.jpg', 'uniform sampling')}</div>`;
}

// Side-by-side aspect comparison at shared times (each frame scaled to the same height).
export async function aspectCompare(videos, times, out, { h = 360 } = {}) {
  const rows = [];
  for (const [i, t] of times.entries()) {
    const row = `${out}.row${i}.jpg`;
    const tmp = videos.map((v, k) => `${out}.${i}.${k}.jpg`);
    for (const [k, v] of videos.entries()) await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(4), '-i', v, '-frames:v', '1', '-vf', `scale=-2:${h}`, tmp[k]]);
    await run('ffmpeg', ['-v', 'error', '-y', ...tmp.flatMap(f => ['-i', f]), '-filter_complex', `${tmp.map((_, k) => `[${k}]`).join('')}hstack=inputs=${tmp.length}`, row]);
    for (const f of tmp) execFileSync('rm', ['-f', f]);
    rows.push(row);
  }
  if (rows.length === 1) execFileSync('mv', [rows[0], out]);
  else {
    // Rows can differ in width only if inputs differ in count; pad to the widest for vstack.
    await run('ffmpeg', ['-v', 'error', '-y', ...rows.flatMap(f => ['-i', f]), '-filter_complex', `${rows.map((_, k) => `[${k}]`).join('')}vstack=inputs=${rows.length}`, out]);
    for (const f of rows) execFileSync('rm', ['-f', f]);
  }
  return out;
}
