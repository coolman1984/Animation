// Measure a finished file: probe, loudness/true peak, frozen and black spans, contact sheet.
// Every gate is a number; gates() turns them into pass/fail lines for make.mjs and the ledger.
import { run } from './render.mjs';

export async function probe(file) {
  const { out } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = (v?.avg_frame_rate || '0/1').split('/').map(Number);
  return {
    duration: +j.format.duration, sizeMB: +(j.format.size / 2 ** 20).toFixed(2), bitrateKbps: Math.round(j.format.bit_rate / 1000),
    width: v?.width, height: v?.height, fps: +(n / d).toFixed(3), vcodec: v?.codec_name, pix_fmt: v?.pix_fmt, color: v?.color_space,
    acodec: a?.codec_name, sampleRate: a ? +a.sample_rate : null, channels: a?.channels,
  };
}

export async function loudness(file) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const sum = err.slice(err.lastIndexOf('Summary:'));
  const num = (re) => { const m = sum.match(re); return m ? +m[1] : null; };
  return { I: num(/I:\s+(-?[\d.]+) LUFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}

// Frozen spans: grain changes every frame, so judge on a small, blurred copy.
export async function frozen(file, { minDur = 1.0 } = {}) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-an', '-vf', `scale=180:-2,gblur=sigma=2,freezedetect=n=-58dB:d=${minDur}`, '-f', 'null', '-']);
  const starts = [...err.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...err.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => +m[1]);
  return starts.map((s, i) => ({ start: s, end: ends[i] ?? null }));
}

export async function black(file) {
  const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-an', '-vf', 'blackdetect=d=0.05:pix_th=0.08', '-f', 'null', '-']);
  return [...err.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => ({ start: +m[1], end: +m[2] }));
}

export async function contactSheet(file, out, { every = 2.5, cols = 6, width = 270 } = {}) {
  await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=1/${every},scale=${width}:-2,tile=${cols}x4:padding=4:color=0x202020`, '-frames:v', '1', out]);
  return out;
}

export function gates(m, brief) {
  const g = [];
  const add = (name, ok, value) => g.push({ name, ok: !!ok, value });
  add('plays (probe)', m.probe.width > 0 && m.probe.duration > 0, `${m.probe.width}x${m.probe.height} ${m.probe.fps}fps ${m.probe.vcodec}/${m.probe.acodec}`);
  add('size = brief', m.probe.width === brief.w && m.probe.height === brief.h, `${m.probe.width}x${m.probe.height}`);
  if (brief.fps) add('frame rate = brief', Math.abs(m.probe.fps - brief.fps) < 0.01, `${m.probe.fps} fps`);
  add('duration within ±10 %', Math.abs(m.probe.duration - brief.duration) <= brief.duration * 0.1, `${m.probe.duration.toFixed(2)} s`);
  if (m.loud) {
    add(`loudness ${brief.lufs} LUFS ±1`, Number.isFinite(m.loud.I) && Math.abs(m.loud.I - brief.lufs) <= 1, `${m.loud.I} LUFS`);
    add(`true peak ≤ ${brief.tp ?? -1.5} dBTP (+0.2 tol)`, Number.isFinite(m.loud.TP) && m.loud.TP <= (brief.tp ?? -1.5) + 0.2, `${m.loud.TP} dBTP`);
    add('LRA < 8 LU', Number.isFinite(m.loud.LRA) && m.loud.LRA < 8, `${m.loud.LRA} LU`);
  }
  const allowedFrozen = (brief.holds || []);
  const badFrozen = m.frozen.filter((f) => !allowedFrozen.some(([a, b]) => f.start >= a - 0.1 && (f.end ?? m.probe.duration) <= b + 0.1));
  add('no frozen span > 1 s', badFrozen.length === 0, badFrozen.length ? JSON.stringify(badFrozen) : `${m.frozen.length} (all logged holds)`);
  const badBlack = m.black.filter(b => !((b.start <= 0.05 && b.end <= 0.1) || b.start >= m.probe.duration - (brief.fadeOut || 0) - 0.1));
  add('no black frames mid-film', badBlack.length === 0, badBlack.length ? JSON.stringify(badBlack) : 'ok');
  if (m.text) add('text inside safe area, no overlaps', m.text.issues.length === 0, m.text.issues.length ? `${m.text.issues.length} issues, first: ${JSON.stringify(m.text.issues[0])}` : `${m.text.lines.length} lines checked every 0.1 s`);
  if (m.share) add(`share copy ≤ ${brief.shareMB} MB`, m.share.sizeMB <= brief.shareMB, `${m.share.sizeMB} MB`);
  return g;
}
