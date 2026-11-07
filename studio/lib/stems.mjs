// Split a mixed track into stems — 2026-11-06 (capability source-separation).
// AI route: python-audio-separator (nomadkaraoke, MIT; `node studio.mjs setup stems`) — one CLI over the Demucs / MDX-Net /
// Roformer model families (Demucs' own repo is archived). Models download on first use and each has its own licence: record the
// model file name in the LEDGER. Classic route (always available, our own, no model): mid/side for stereo — the centre (where
// dialogue and lead vocals sit) band-limited to speech and denoised, the sides as the "rest". It is a rough guide for timing
// and review, labelled approximate, never a delivery stem; mono input only gets a denoised voice track.
//   stems({ input, outDir, engine: 'auto'|'ai'|'classic', model }) → { method, files: { voice, rest } , sidecar }
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { onPath, isMain } from './platform.mjs';

export const findSeparator = (env = process.env) => onPath('audio-separator', env);
const sh = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', (d) => (e += d)); p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${basename(cmd)} exited ${c}: ${e.slice(-500)}`)))); });
const channels = (f) => +spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim() || 0;

/** FFmpeg filters of the classic route (exported for tests). */
export const VOICE_BAND = 'highpass=f=90,lowpass=f=7500,afftdn=nf=-28';
export const classicGraph = (stereo) => stereo
  ? `[0:a]pan=mono|c0=0.5*c0+0.5*c1,${VOICE_BAND}[voice];[0:a]pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0[rest]`
  : `[0:a]pan=mono|c0=c0,${VOICE_BAND}[voice]`;

export async function stems({ input, outDir, engine = 'auto', model }) {
  if (!existsSync(input)) throw new Error(`no such file ${input}`);
  mkdirSync(outDir, { recursive: true });
  const bin = findSeparator(), useAi = engine === 'ai' || (engine === 'auto' && bin), stem = basename(input, extname(input));
  if (engine === 'ai' && !bin) throw new Error('audio-separator not found: node studio.mjs setup stems');
  let method, files;
  if (useAi) {
    const before = new Set(readdirSync(outDir));
    await sh(bin, [input, '--output_dir', outDir, '--output_format', 'WAV', ...(model ? ['--model_filename', model] : [])]);
    const made = readdirSync(outDir).filter((f) => !before.has(f) && f.endsWith('.wav'));
    const pick = (re) => made.find((f) => re.test(f)); files = { voice: pick(/vocals|voice/i), rest: pick(/instrumental|no.?vocals|other/i) };
    method = `python-audio-separator${model ? ` (${model})` : ' (default model)'}`;
  } else {
    const stereo = channels(input) >= 2;
    files = { voice: `${stem}.voice-approx.wav`, rest: stereo ? `${stem}.rest-approx.wav` : null };
    await sh('ffmpeg', ['-v', 'error', '-y', '-i', input, '-filter_complex', classicGraph(stereo), '-map', '[voice]', join(outDir, files.voice), ...(stereo ? ['-map', '[rest]', join(outDir, files.rest)] : [])]);
    method = stereo ? 'classic mid/side + speech band + FFT denoise (approximate; not a delivery stem)' : 'classic speech band + FFT denoise on mono (no music stem possible without a model)';
  }
  const sidecar = join(outDir, `${stem}.stems.json`);
  writeFileSync(sidecar, JSON.stringify({ source: basename(input), method, files, rule: 'Record the method and model in the LEDGER; approximate stems are for timing and review only.' }, null, 2));
  return { method, files, sidecar };
}

if (isMain(import.meta.url)) {
  const [input, ...rest] = process.argv.slice(2), opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, '').split('=')));
  console.log(JSON.stringify(await stems({ input, outDir: opt.out || 'out/stems', engine: opt.engine || 'auto', model: opt.model })));
}
