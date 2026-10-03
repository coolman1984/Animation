// Finishing: audio master (limiter → loudnorm → limiter, measured), mux, 2-pass share copy,
// captions (SRT + VTT) from the read-back text timeline, thumbnails, animated preview.
import { writeFileSync, readFileSync, rmSync } from 'node:fs';
import { run } from './render.mjs';
import { loudness, probe } from './measure.mjs';
import { devNull } from './platform.mjs';

// Cut at exact picture times. 20ms edge fades suppress clicks; these are NOT overlap crossfades.
// True crossfades would shorten the output unless handles were added to each picture edit.
export async function assembleAudio(src, out, { segments, fadeOut = 0 } = {}) {
  const info = await probe(src);
  if (!info.acodec || !Number.isFinite(info.duration)) throw new Error('source has no usable audio');
  if (info.vcodec) throw new Error('assembleAudio requires audio-only input; extract with prepareMusic first');
  if (!Number.isFinite(fadeOut) || fadeOut < 0) throw new Error('invalid audio fadeOut');
  if (!segments) {
    if (fadeOut > info.duration) throw new Error('audio fadeOut exceeds duration');
    const filters = fadeOut ? ['-af', `afade=t=out:st=${info.duration - fadeOut}:d=${fadeOut}`] : [];
    await run('ffmpeg', ['-v', 'error', '-y', '-i', src, ...filters, '-c:a', 'pcm_f32le', out]); return out;
  }
  const segs = segments.split(',').map((s) => s.split('-').map(Number));
  if (segs.some(s => s.length !== 2 || !s.every(Number.isFinite) || s[0] < 0 || s[1] <= s[0] || s[1] > info.duration + 1 / info.sampleRate))
    throw new Error('invalid audio segments or source too short');
  const parts = segs.map(([a, b], i) => {
    const edge = Math.min(0.02, (b - a) / 2);
    return `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=${edge},afade=t=out:st=${b - a - edge}:d=${edge}[s${i}]`;
  });
  const total = segs.reduce((x, [a, b]) => x + b - a, 0);
  if (fadeOut > total) throw new Error('audio fadeOut exceeds duration');
  const tail = fadeOut ? `,afade=t=out:st=${(total - fadeOut).toFixed(3)}:d=${fadeOut}` : '';
  const graph = `${parts.join(';')};${segs.map((_, i) => `[s${i}]`).join('')}concat=n=${segs.length}:v=0:a=1${tail}[out]`;
  await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', out]);
  return out;
}

// Loudness master to a target (LUFS) with a true-peak ceiling. Measured, not assumed.
export async function masterAudio(src, out, { lufs = -14, tp = -1.5 } = {}) {
  if (!Number.isFinite(lufs) || lufs < -70 || lufs > -5 || !Number.isFinite(tp) || tp < -9 || tp > 0)
    throw new Error('invalid loudness/true-peak target');
  const raw = await loudness(src);
  if (![raw.I, raw.TP, raw.LRA].every(Number.isFinite) || raw.I <= -70)
    throw new Error('cannot master silent or unmeasurable audio');
  const pre = lufs - raw.I + 1.5; // drive slightly hot into the limiter, loudnorm trims back
  const tmp = out + '.pre.wav';
  let ceiling = tp - 1.0;
  await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', `volume=${pre.toFixed(2)}dB,alimiter=limit=${Math.pow(10, (tp - 1) / 20).toFixed(4)}:attack=4:release=60:level=false`, '-c:a', 'pcm_f32le', tmp]);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { err } = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', tmp, '-af', `loudnorm=I=${lufs}:TP=${tp}:LRA=8:print_format=json`, '-f', 'null', '-']);
    const j = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
    const lim = Math.pow(10, ceiling / 20).toFixed(4);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af',
      `loudnorm=I=${lufs}:TP=${tp}:LRA=8:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,alimiter=limit=${lim}:attack=2:release=40:level=false,aresample=48000`,
      '-c:a', 'pcm_f32le', out]);
    const m = await loudness(out);
    if (m.TP <= tp + 0.05 && Math.abs(m.I - lufs) <= 0.6) { rmSync(tmp, { force: true }); return m; }
    ceiling -= 0.5;
  }
  rmSync(tmp, { force: true });
  return loudness(out);
}

export async function mux(video, audio, out) {
  const [v, a] = await Promise.all([probe(video), probe(audio)]);
  if (!a.acodec || !Number.isFinite(a.duration) || a.duration + 0.05 < v.duration)
    throw new Error('audio shorter than picture; refusing to truncate the film');
  await run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
  return out;
}

export async function shareCopy(master, out, { targetMB = 27, duration, audioKbps = 160 } = {}) {
  const totalKbps = (targetMB * 0.97 * 8 * 1024 * 1024) / duration / 1000;
  const v = Math.floor(totalKbps - audioKbps);
  const log = out + '.2pass';
  const common = ['-c:v', 'libx264', '-preset', 'slow', '-b:v', `${v}k`, '-maxrate', `${Math.round(v * 1.6)}k`, '-bufsize', `${v * 2}k`, '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-passlogfile', log];
  await run('ffmpeg', ['-v', 'error', '-y', '-i', master, ...common, '-pass', '1', '-an', '-f', 'mp4', devNull]);
  await run('ffmpeg', ['-v', 'error', '-y', '-i', master, ...common, '-pass', '2', '-c:a', 'aac', '-b:a', `${audioKbps}k`, '-movflags', '+faststart', out]);
  for (const ext of ['-0.log', '-0.log.mbtree']) rmSync(log + ext, { force: true });
  return { videoKbps: v };
}

const ts = (t, sep) => {
  const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(r).padStart(3, '0')}`;
};
export function captions(lines, base, { translate } = {}) {
  const cues = lines.map((l) => ({ ...l, text: translate ? (translate[l.text] ?? l.text) : l.text }));
  const srt = cues.map((c, i) => `${i + 1}\n${ts(c.start, ',')} --> ${ts(c.end, ',')}\n${c.text}\n`).join('\n');
  const vtt = 'WEBVTT\n\n' + cues.map((c) => `${ts(c.start, '.')} --> ${ts(c.end, '.')}\n${c.text}\n`).join('\n');
  writeFileSync(base + '.srt', srt); writeFileSync(base + '.vtt', vtt);
  return cues.length;
}

export async function stillAt(video, t, out) {
  // 1 ms early: a time just past the last frame's pts would decode no frame (see review.mjs ss()).
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', Math.max(0, t - 0.001).toFixed(4), '-i', video, '-frames:v', '1', '-q:v', '2', out]);
  return out;
}

export async function webpPreview(video, out, { width = 540, fps = 15 } = {}) {
  await run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `fps=${fps},scale=${width}:-2:flags=lanczos`, '-c:v', 'libwebp_anim', '-loop', '0', '-quality', '70', '-an', out]);
  return out;
}
