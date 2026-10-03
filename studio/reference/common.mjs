// Bounded machine work. Raw reference media/evidence is private and never committed.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
export const STUDIO = resolve(import.meta.dirname, '..');
export const REFS = resolve(STUDIO, '..', 'references');
export const round = (v, n = 4) => +v.toFixed(n);
export const json = p => JSON.parse(readFileSync(p, 'utf8'));
export const save = (p, value) => writeFileSync(p, JSON.stringify(value, null, 2));
export function slugify(s) { const x = String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 64); return x || 'reference'; }
export function inside(root, path) { const p = resolve(root, path), r = relative(root, p); if (r.startsWith('..') || r.includes('\0')) throw new Error('Path must stay inside the reference pack'); return p; }
export function packPath(p) { const path = existsSync(p) ? resolve(p) : inside(REFS, p); if (!existsSync(join(path, 'metadata.json'))) throw new Error('Reference pack not found: ' + p); return path; }
export function safeURL(s) { const u = new URL(s); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('Only HTTP(S) URLs without embedded credentials are supported'); return u; }
export function publicURL(s) { const u = safeURL(s); u.search = ''; u.hash = ''; return u.href; }
export function work(cmd, args, { timeout = 90000, maxBytes = 64 << 20, input, cwd } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'], cwd });
    const out = [], err = []; let size = 0, esize = 0, failure;
    const stop = e => { failure ||= e; p.kill('SIGKILL'); };
    const timer = setTimeout(() => stop(new Error(`${cmd} exceeded ${timeout} ms; work stopped`)), timeout);
    p.on('error', e => { clearTimeout(timer); rej(e); });
    p.stdout.on('data', b => { size += b.length; if (size > maxBytes) stop(new Error(`${cmd} exceeded output budget`)); else out.push(b); });
    p.stderr.on('data', b => { esize += b.length; if (esize < 2 << 20) err.push(b); });
    p.on('close', code => { clearTimeout(timer); const stderr = Buffer.concat(err).toString(); if (failure || code !== 0) rej(failure || new Error(`${cmd} failed (${code}): ${stderr.slice(-1800)}`)); else res({ stdout: Buffer.concat(out), stderr }); });
    if (input) { p.stdin.on('error', () => {}); p.stdin.end(input); }
  });
}
export async function mediaProbe(src) {
  const r = await work('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', src]);
  const d = JSON.parse(r.stdout), v = d.streams.find(s => s.codec_type === 'video'), a = d.streams.find(s => s.codec_type === 'audio');
  const rate = s => { const [n, den = 1] = String(s || '0/1').split('/').map(Number); return den ? n / den : 0; };
  if (!v || !(+d.format.duration > 0)) throw new Error('A finite decodable video is required (live/protected streams are unsupported)');
  // Screen recordings often carry audio ~0.1–0.2 s longer than the picture: frame sampling must stay inside the VIDEO stream.
  const vd = +v.duration, duration = vd > 0 && vd < +d.format.duration ? vd : +d.format.duration;
  return { duration, width: v.width, height: v.height, fps: rate(v.avg_frame_rate) || rate(v.r_frame_rate), timeBase: v.time_base, videoCodec: v.codec_name, audio: a ? { codec: a.codec_name, sampleRate: +a.sample_rate, channels: a.channels } : null, route: 'ffmpeg', rotation: v.tags?.rotate || v.side_data_list?.find(x => x.rotation)?.rotation || 0 };
}
export async function sheet(files, out, labels = []) {
  if (!files.length) return null;
  mkdirSync(resolve(out, '..'), { recursive: true });
  // Images normalized independently: safe for portrait/landscape; no shell glob or concat injection.
  // drawtext gets a bundled font file (relative to the studio, the working directory below): without one FFmpeg asks
  // Fontconfig, which has no configuration on Windows builds and crashes the process.
  const args = files.flatMap(f => ['-i', resolve(f)]), cells = files.map((_, i) => `[${i}:v]scale=280:190:force_original_aspect_ratio=decrease,pad=280:220:(ow-iw)/2:5:color=0x171c24,setsar=1${labels[i] !== undefined ? `,drawtext=fontfile=assets/fonts/SpaceMono-Regular.ttf:text='${Number(labels[i]).toFixed(3)} s':x=10:y=200:fontsize=14:fontcolor=white` : ''}[v${i}]`);
  const cols = Math.min(4, files.length), layout = files.map((_, i) => `${i % cols * 280}_${Math.floor(i / cols) * 220}`).join('|');
  const filter = files.length===1?cells[0].replace('[v0]','[o]'):cells.join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${layout}:fill=0x171c24[o]`;
  await work('ffmpeg', ['-v', 'error', '-y', ...args, '-filter_complex_threads', '1', '-filter_complex', filter, '-map', '[o]', '-frames:v', '1', resolve(out)], { cwd: STUDIO });
  return out;
}
export async function grayOf(file, w = 160, h = 90) { return (await work('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h},format=gray`, '-frames:v', '1', '-f', 'rawvideo', '-'])).stdout; }
export const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
export const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255; };
