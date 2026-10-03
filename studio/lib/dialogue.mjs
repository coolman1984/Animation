// Dialogue audio for live-action films: ffmpeg filter graphs + a runner. Pure builders are unit-tested; render() runs ffmpeg.
//   polish        voice chain: high-pass rumble, denoise (afftdn spectral or arnndn RNNoise model), gentle de-ess, level, compress
//   duck          music under the voice with sidechaincompress (the voice keys the compressor on the music)
//   stitch        the audio of a jump-cut edit: atrim per kept range with 8–12 ms fades so cuts never click
//   mixGraph      voice + music (+ sfx) into one bus, ready for the studio's loudness mastering (-14 LUFS for social)
// Order matters: denoise BEFORE compression (compression raises the noise floor), loudness last (masterAudio in lib/finish.mjs).
import { spawn } from 'node:child_process';

const f = (v) => +(+v).toFixed(4);
export function polish({ highpass = 80, denoise = 'afftdn', nr = 12, nf = -40, model, deess = true, comp = true, gain = 0 } = {}) {
  const chain = [`highpass=f=${highpass}`];
  if (denoise === 'afftdn') chain.push(`afftdn=nr=${nr}:nf=${nf}:tn=1`);
  else if (denoise === 'arnndn') { if (!model) throw new Error('arnndn needs a model file (.rnnn)'); chain.push(`arnndn=m='${model}'`); }
  else if (denoise !== 'none') throw new Error(`unknown denoise ${denoise}`);
  if (deess) chain.push('deesser=i=0.4:m=0.5:f=0.5');
  if (comp) chain.push('acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2');
  if (gain) chain.push(`volume=${f(gain)}dB`);
  return chain.join(',');
}
// threshold is linear (0..1) as ffmpeg expects; ~0.03 ≈ -30 dBFS. release long enough to avoid pumping between words.
// keepVoice: also output the voice as [<name>o] for the mix (the key copy is consumed by the compressor).
export function duck({ voice = 'v', music = 'm', out = 'md', threshold = 0.03, ratio = 8, attack = 20, release = 400, makeup = 1, keepVoice = true } = {}) {
  const id = voice.replace(/[^a-z0-9_]/gi, '') || 'v', key = keepVoice ? `${id}k` : voice;
  const split = keepVoice ? `[${voice}]asplit=2[${id}k][${id}o];` : '';
  return `${split}[${music}][${key}]sidechaincompress=threshold=${f(threshold)}:ratio=${ratio}:attack=${attack}:release=${release}:makeup=${makeup}[${out}]`;
}
export function stitch(keep, { input = '0:a', out = 'cut', fade = 0.01 } = {}) {
  if (!keep.length) throw new Error('stitch needs at least one kept range');
  const parts = keep.map(([a, b], i) => `[${input}]atrim=start=${f(a)}:end=${f(b)},asetpts=PTS-STARTPTS,afade=t=in:d=${f(fade)},afade=t=out:st=${f(Math.max(0, b - a - fade))}:d=${f(fade)}[s${i}]`);
  return `${parts.join(';')};${keep.map((_, i) => `[s${i}]`).join('')}concat=n=${keep.length}:v=0:a=1[${out}]`;
}
// Inputs: 0 = voice, 1 = music, 2 = sfx (optional). Output label [mix].
export function mixGraph({ polishOpts = {}, duckOpts = {}, musicGain = -6, sfx = false } = {}) {
  return [`[0:a]${polish(polishOpts)}[v]`, `[1:a]volume=${f(musicGain)}dB[m]`, duck({ voice: 'v', music: 'm', out: 'md', ...duckOpts }),
    `[vo][md]${sfx ? '[2:a]' : ''}amix=inputs=${sfx ? 3 : 2}:duration=longest:normalize=0[mix]`].join(';');
}
// Run ffmpeg with a filter_complex; resolves when the file is written.
export function render({ inputs, graph, map = '[mix]', out, rate = 48000, extra = [] }) {
  const args = ['-v', 'error', '-y', ...inputs.flatMap((i) => ['-i', i]), '-filter_complex', graph, '-map', map, '-ar', String(rate), ...extra, out];
  return new Promise((res, rej) => { const p = spawn('ffmpeg', args); let e = ''; p.stderr.on('data', (d) => (e += d)); p.on('close', (c) => (c ? rej(new Error(e)) : res(out))); });
}
