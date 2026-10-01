// Prepare recorded/original music at an exact duration. No automatic looping or silent padding.
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './render.mjs';
import { probe } from './measure.mjs';
import { masterAudio } from './finish.mjs';

export async function prepareMusic({ src, out, start = 0, duration, fadeIn = 0.08, fadeOut = 1, lufs = -14, tp = -1.5 }) {
  if (!src || !out || resolve(src) === resolve(out)) throw new Error('separate music source and output paths required');
  if (![start, duration, fadeIn, fadeOut].every(Number.isFinite) || start < 0 || duration <= 0
      || fadeIn < 0 || fadeOut < 0 || fadeIn + fadeOut > duration) throw new Error('invalid music timing');
  const p = await probe(src);
  if (!p.acodec || start + duration > p.duration + 1 / p.sampleRate) throw new Error('music source too short: choose another section/arrangement');
  const edited = out + '.edit.wav';
  const filters = [`atrim=start=${start}:duration=${duration}`, 'asetpts=PTS-STARTPTS', 'aresample=48000'];
  if (fadeIn) filters.push(`afade=t=in:d=${fadeIn}`);
  if (fadeOut) filters.push(`afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`);
  try {
    await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vn', '-af', filters.join(','), '-ac', '2', '-c:a', 'pcm_f32le', edited]);
    // Containers may have a video track longer than their actual audio track.
    if (Math.abs((await probe(edited)).duration - duration) > 0.002)
      throw new Error('decoded music source too short for requested duration');
    const measured = await masterAudio(edited, out, { lufs, tp });
    if (Math.abs(measured.I - lufs) > 1 || measured.TP > tp + 0.2) throw new Error('prepared music failed loudness targets');
    return { file: out, duration: (await probe(out)).duration, loudness: measured };
  } finally { rmSync(edited, { force: true }); rmSync(out + '.pre.wav', { force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [src, out, duration, start = '0'] = process.argv.slice(2);
  if (!src || !out || !duration) throw new Error('usage: node lib/music.mjs source.wav output.wav duration [start]');
  console.log(JSON.stringify(await prepareMusic({ src, out, duration: Number(duration), start: Number(start) }), null, 2));
}
