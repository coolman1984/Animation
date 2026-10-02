// Precise forensics commands (optional Python: numpy + scipy + OpenCV for motion, librosa for audio).
//   node reference.mjs track <pack|video> --roi=x,y,w,h [--ref=t] [--range=a:b] [--crop=x,y,w,h]   per-frame timing + fitted easing per move
//        (--ref = time where the element is fully visible; it is followed forwards and backwards from there)
//   node reference.mjs timeline <pack|video> [--crop=x,y,w,h]                             moving/still spans, cuts, motion energy
//   node reference.mjs strip <pack|video> --range=a:b [--crop=...]                         every decoded frame in a labelled sheet
//   node reference.mjs audio <pack|video> [--range=a:b]                                    tempo, grid, drums, key/mode, chords, melody, sections, SFX
// Results go to <pack>/forensics/ (or ./forensics-<name>/ for a bare video). Charts are PNGs meant to be LOOKED at.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { spawn } from 'node:child_process';
import { STUDIO } from './common.mjs';

const TOOLS = join(STUDIO, 'tools');
function run(py, args, timeout = 600000) {
  return new Promise((res, rej) => {
    const p = spawn(py, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); rej(new Error(`${args[0]} exceeded ${timeout} ms`)); }, timeout);
    p.stdout.on('data', b => { out += b; }); p.stderr.on('data', b => { err += b; });
    p.on('close', code => { clearTimeout(timer); if (code) rej(new Error(`${basename(args[0])} failed (${code}): ${err.slice(-1500)}`)); else res(out); });
  });
}
// A pack directory resolves to its private source media; anything else is a media path.
export function mediaOf(target, packDir) {
  if (packDir && existsSync(join(packDir, 'source.json'))) {
    const src = JSON.parse(readFileSync(join(packDir, 'source.json'), 'utf8'));
    const m = src.privateRuntimeMedia && (src.privateRuntimeMedia.startsWith('/') ? src.privateRuntimeMedia : join(packDir, src.privateRuntimeMedia));
    if (m && existsSync(m)) return { media: m, out: join(packDir, 'forensics') };
  }
  const media = resolve(target); if (!existsSync(media)) throw new Error('media not found: ' + target);
  return { media, out: resolve(`forensics-${basename(media).replace(/\W+/g, '_')}`) };
}
export async function forensics(cmd, target, packDir, { range, roi, crop, ref, python = 'python3' } = {}) {
  const { media, out } = mediaOf(target, packDir); mkdirSync(out, { recursive: true });
  const r = range ? ['--start', String(range[0]), '--end', String(range[1])] : [];
  const c = crop ? ['--crop', crop] : [];
  let raw;
  if (cmd === 'track') { if (!roi) throw new Error('track needs --roi=x,y,w,h (pixels of the source, or of the crop when --crop is given)'); raw = await run(python, [join(TOOLS, 'motion_curves.py'), 'track', media, '--roi', roi, ...r, ...c, ...(ref !== undefined ? ['--ref', String(ref)] : []), '--out', out]); }
  else if (cmd === 'timeline') raw = await run(python, [join(TOOLS, 'motion_curves.py'), 'timeline', media, ...c, '--out', out]);
  else if (cmd === 'strip') { if (!range) throw new Error('strip needs --range=a:b'); raw = await run(python, [join(TOOLS, 'motion_curves.py'), 'strip', media, ...r, ...c, '--out', out]); }
  else if (cmd === 'audio') raw = await run(python, [join(TOOLS, 'audio_deep.py'), media, ...r, '--out', out]);
  else throw new Error('unknown forensics command ' + cmd);
  const result = JSON.parse(raw.trim().split('\n').at(-1));
  if (result.unavailable) throw new Error(`${cmd}: ${result.unavailable} (pip install -r studio/reference/requirements-optional.txt)`);
  return { out, ...result };
}
