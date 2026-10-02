// Pixel evidence, not semantic labels. Native fallback measures translation; OpenCV adds affine flow.
import { work, mean, diff, round } from './common.mjs';
export function frameStats(g, w = 160, h = 90) {
  const luminance = mean([...g]); let contrast = 0, edge = 0;
  for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) { const i = y * w + x; contrast += (g[i] - luminance) ** 2; edge += Math.abs(g[i] - g[i - 1]) + Math.abs(g[i] - g[i - w]); }
  return { luminance: round(luminance / 255), contrast: round(Math.sqrt(contrast / g.length) / 255), sharpness: round(edge / g.length / 510) };
}
export function translation(a, b, w = 160, h = 90) {
  let best = Infinity, dx = 0, dy = 0;
  for (let yoff = -5; yoff <= 5; yoff++) for (let xoff = -5; xoff <= 5; xoff++) {
    let s = 0, n = 0;
    for (let y = 8; y < h - 8; y += 5) for (let x = 8; x < w - 8; x += 5) { s += Math.abs(a[y * w + x] - b[(y + yoff) * w + x + xoff]); n++; }
    // Penalise nonzero shifts in flat scenes: choose static instead of an arbitrary search boundary.
    const score = s / n + (Math.abs(xoff) + Math.abs(yoff)) * 0.03;
    if (score < best) { best = score; dx = xoff; dy = yoff; }
  }
  const raw = diff(a, b), residual = best / 255, improvement = Math.max(0, raw - residual);
  return { dx: dx / w, dy: dy / h, magnitude: Math.hypot(dx / w, dy / h), residual: round(residual), confidence: round(Math.min(0.6, improvement / (raw || 1))), method: 'small-translation-block-match', classification: raw < 0.003 ? 'static hold' : improvement > raw * 0.3 ? 'camera-like translation candidate' : 'local movement or unmodelled global transform', alternatives: ['whole-scene layer translation', 'scale/rotation', 'lighting change', 'object motion'] };
}
export function seriesMetrics(frames, times, cuts = [], w = 160, h = 90) {
  const samples = frames.map((g, i) => ({ t: round(times[i]), ...frameStats(g, w, h) }));
  const pairs = []; let prevSpeed = 0;
  for (let i = 1; i < frames.length; i++) {
    const start = times[i - 1], t = times[i], dt = t - start;
    if (dt <= 0 || cuts.some(c => c > start && c <= t)) continue;
    const m = translation(frames[i - 1], frames[i], w, h), speed = m.magnitude / dt;
    pairs.push({ start: round(start), t: round(t), ...m, speed: round(speed), acceleration: round((speed - prevSpeed) / dt), direction: m.magnitude < 0.001 ? 'static' : Math.abs(m.dx) > Math.abs(m.dy) ? m.dx > 0 ? 'right' : 'left' : m.dy > 0 ? 'down' : 'up', visualChange: round(diff(frames[i - 1], frames[i])) }); prevSpeed = speed;
  }
  return { samples, pairs, units: 'normalized image displacement / second; acceleration / second squared', global: 'small-translation hypothesis only', local: 'alignment residual; not segmented objects', limitations: ['Low-resolution sampling cannot identify exact easing, physical camera movement, text or depth.', 'Global scene transforms and physical camera movement are visually ambiguous.'] };
}
export async function decodeMetrics(src, duration) {
  const fps = Math.min(6, 2400 / duration), size = 160 * 90;
  const { stdout } = await work('ffmpeg', ['-v', 'error', '-i', src, '-an', '-vf', `fps=${fps},scale=160:90,format=gray`, '-t', String(duration), '-f', 'rawvideo', '-']);
  const frames = Array.from({ length: Math.floor(stdout.length / size) }, (_, i) => stdout.subarray(i * size, (i + 1) * size));
  return { frames, times: frames.map((_, i) => i / fps), fps };
}
export async function cutTimes(src) {
  const r = await work('ffmpeg', ['-hide_banner', '-nostats', '-i', src, '-an', '-vf', "scale=160:90,select='gt(scene,0.20)',showinfo", '-f', 'null', '-']);
  return [...r.stderr.matchAll(/pts_time:([\d.]+)/g)].map(m => +m[1]);
}
export function findEvents(metrics, duration) {
  const out = [];
  for (let i = 1; i < metrics.samples.length - 1; i++) {
    const a = metrics.samples[i - 1], b = metrics.samples[i], c = metrics.samples[i + 1];
    if (b.luminance > 0.8 && b.luminance - Math.max(a.luminance, c.luminance) > 0.12) out.push({ t: b.t, kind: 'flash candidate', confidence: 0.5 });
    if (Math.abs(b.luminance - a.luminance) > 0.10 && Math.abs(c.luminance - b.luminance) > 0.035) out.push({ t: b.t, kind: 'fade/light-change candidate', confidence: 0.35 });
    if (Math.abs(b.sharpness - a.sharpness) > 0.025) out.push({ t: b.t, kind: 'focus/blur/detail-change candidate', confidence: 0.3 });
  }
  for (const p of [...metrics.pairs].sort((a, b) => b.visualChange - a.visualChange).slice(0, 8)) if (p.visualChange > 0.035 && p.t < duration) out.push({ t: p.t, kind: 'rapid motion/reveal/type candidate', confidence: 0.25 });
  return out;
}
export function motionCurve(pairs) {
  if (pairs.length < 3) return { likely: 'insufficient temporal evidence', confidence: 0 };
  const speeds = pairs.map(p => p.speed), peak = Math.max(...speeds), first = mean(speeds.slice(0, Math.ceil(speeds.length / 3))), last = mean(speeds.slice(-Math.ceil(speeds.length / 3)));
  let likely = peak < 0.003 ? 'static hold' : last < first * 0.5 ? 'ease-out / velocity then settle' : first < last * 0.5 ? 'ease-in' : peak > Math.max(first, last) * 1.8 ? 'smooth ease-in-out candidate' : 'approximately constant velocity';
  const reversals = pairs.slice(1).filter((p, i) => p.dx * pairs[i].dx + p.dy * pairs[i].dy < 0).length;
  if (reversals >= 2 && peak > 0.01) likely = 'oscillation / overshoot / stepped motion candidate';
  return { likely, confidence: 0.3, alternatives: ['changing object visibility', 'tracking error', 'editorial resampling'], objective: 'perceptually equivalent timing, not exact easing recovery' };
}
