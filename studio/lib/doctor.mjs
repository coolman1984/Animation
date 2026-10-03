// studio doctor: probe the machine and print what the studio can use.
// Pure Node (>=22), no packages. Writes takes/doctor.json for other tools.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, mkdtempSync, rmSync, statfsSync, statSync } from 'node:fs';
import { cpus, totalmem, freemem, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WINDOWS, PYTHON, isMain, browserCandidates, onPath, memoryBudget, plannedWorkers } from './platform.mjs';
import { orphans } from './procs.mjs';
import { shutdown } from './cdp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000, ...opts });
  } catch (e) {
    return null;
  }
}

export function findChromium() {
  const candidates = browserCandidates();
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
    for (const d of readdirSync(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
      if (/^chromium-\d+$/.test(d)) candidates.push(join(process.env.PLAYWRIGHT_BROWSERS_PATH, d, ...(WINDOWS ? ['chrome-win', 'chrome.exe'] : ['chrome-linux', 'chrome'])));
    }
  }
  return candidates.find((p) => existsSync(p)) || null;
}

// Launch headless Chromium at a device scale, read one screenshot's PNG width.
async function probeChromium(bin, scale = 2) {
  const dir = mkdtempSync(join(tmpdir(), 'doctor-'));
  const proc = spawn(bin, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
    `--force-device-scale-factor=${scale}`, '--window-size=400,300', `--user-data-dir=${dir}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsUrl;
  try {
    wsUrl = await new Promise((res, rej) => {
      let buf = '';
      const t = setTimeout(() => rej(new Error('no DevTools URL')), 15000);
      proc.stderr.on('data', (d) => {
        buf += d;
        const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) { clearTimeout(t); res(m[1]); }
      });
    });
    const port = new URL(wsUrl).port;
    // Version from DevTools: `chrome.exe --version` on Windows opens a browser window instead of printing.
    const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser?.replace('/', ' ') || null;
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = new Map();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const png = Buffer.from(shot.result.data, 'base64');
    const width = png.readUInt32BE(16);
    const metrics = await send('Runtime.evaluate', { expression: 'innerWidth', returnByValue: true });
    ws.close();
    return { ok: true, cssWidth: metrics.result.result.value, deviceWidth: width, scale, version };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  } finally {
    if (wsUrl) await shutdown(proc, wsUrl, dir);
    else { proc.kill('SIGKILL'); proc.stderr.destroy(); try { rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch {} }
  }
}

async function probeAttached(scale = 2) {
  const { launch } = await import('./cdp.mjs');
  let client;
  try {
    client = await launch({ width: 400, height: 300, scale });
    const png = Buffer.from((await client.send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
    return { ok: true, cssWidth: await client.eval('innerWidth'), deviceWidth: png.readUInt32BE(16), scale, version: client.version?.replace('/', ' ') || null };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
  finally { await client?.close(); }
}

function ffmpegCaps({ gpuProbe = true } = {}) {
  const enc = run('ffmpeg', ['-hide_banner', '-encoders']) || '';
  const fil = run('ffmpeg', ['-hide_banner', '-filters']) || '';
  const has = (txt, name) => new RegExp(`\\s${name}\\s`).test(txt);
  const encoders = Object.fromEntries(['libx264', 'libx265', 'aac', 'libopus', 'libvpx-vp9', 'libwebp', 'png', 'h264_nvenc', 'h264_vaapi', 'h264_qsv'].map((n) => [n, has(enc, n)]));
  const filters = Object.fromEntries(['loudnorm', 'alimiter', 'ebur128', 'freezedetect', 'blackdetect', 'tile', 'subtitles', 'palettegen', 'zscale'].map((n) => [n, has(fil, n)]));
  // A listed GPU encoder is only usable if a real 1-frame encode succeeds.
  const gpu = {};
  for (const g of ['h264_nvenc', 'h264_vaapi', 'h264_qsv']) {
    if (!encoders[g] || !gpuProbe) { gpu[g] = false; continue; }
    gpu[g] = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.1', '-frames:v', '1', '-c:v', g, '-f', 'null', '-']) !== null;
  }
  return { encoders, filters, gpu };
}

function fonts() {
  const fam = (q) => (run('fc-list', [q, 'family']) || '').split('\n').map((s) => s.split(',')[0].trim()).filter(Boolean);
  const all = [...new Set(fam(':'))].sort();
  const arabic = [...new Set(fam(':lang=ar'))].sort();
  const bundled = existsSync(join(ROOT, 'assets', 'fonts')) ? readdirSync(join(ROOT, 'assets', 'fonts')).filter((f) => /\.(ttf|otf|woff2?)$/i.test(f)) : [];
  return { count: all.length, arabic, bundled };
}

// optional: false (make.mjs) checks only what a build needs: no Python imports, GPU test-encodes or report file.
export async function doctor({ quiet = false, optional = true } = {}) {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  // Attach mode (STUDIO_CDP_URL, lib/cdp.mjs): the browser belongs to an approved launcher; probe it through a private context.
  const attached = process.env.STUDIO_CDP_URL;
  const chromium = attached ? `attach:${attached}` : findChromium();
  const ffv = (run('ffmpeg', ['-version']) || '').split('\n')[0];
  const caps = ffv ? ffmpegCaps({ gpuProbe: optional }) : null;
  const probe = attached ? await probeAttached(2) : chromium ? await probeChromium(chromium, 2) : { ok: false, error: 'no chromium' };
  const chromiumVersion = probe.version || (chromium && !WINDOWS ? (run(chromium, ['--version']) || '').trim() : null);
  const f = optional ? fonts() : { count: 0, arabic: [], bundled: [] };
  const mem = optional ? memoryBudget() : null, orph = orphans().length;
  let df = null;
  try { const s = statfsSync(ROOT); df = `${Math.floor((s.bavail * s.bsize) / 2 ** 30)}G`; } catch {}
  const report = {
    at: new Date().toISOString(),
    node: { version: process.versions.node, ok: nodeMajor >= 22 && typeof WebSocket === 'function' },
    chromium: { path: chromium, version: chromiumVersion, scaleProbe: probe },
    ffmpeg: { version: ffv || null, ...caps },
    ffprobe: !!run('ffprobe', ['-version']),
    python: optional ? (run(PYTHON, ['--version']) || '').trim() || null : null,
    // Precise forensics (tools/motion_curves.py, tools/audio_deep.py): which optional modules are importable.
    // Live-action toolkit (tools/live.py): segmentation/tracking, VAD, ASR/TTS. Models live in studio/models/ (live.py models).
    live: optional && (run(PYTHON, ['-c', "import importlib\nfor m in ('mediapipe','onnxruntime','sherpa_onnx','soundfile'):\n  try: importlib.import_module(m); print(m, end=' ')\n  except Exception: pass"]) || '').trim() || null,
    forensics: optional && (run(PYTHON, ['-c', "import importlib\nfor m in ('numpy','scipy','cv2','librosa','scenedetect'):\n  try: importlib.import_module(m); print(m, end=' ')\n  except Exception: pass"]) || '').trim() || null,
    // Faithful raster-logo tracing (tools/logo_trace.py).
    logo: optional && run(PYTHON, ['-c', 'import potrace, PIL, cv2']) !== null,
    machine: { cores: cpus().length, ramGB: +(totalmem() / 2 ** 30).toFixed(1), freeRamGB: +(freemem() / 2 ** 30).toFixed(1), diskFree: df || null,
      ...(mem ? { headroomGB: mem.headroomGB, commitFreeGB: mem.commitFreeGB, commitLimitGB: mem.commitLimitGB, pagefileMB: mem.pagefileMB, pagefileAuto: mem.pagefileAuto } : {}), orphans: orph },
    fonts: f,
  };
  const plan1080 = mem ? plannedWorkers({ requested: 4, w: 1920, h: 1080, gpu: true, budget: mem }).workers : Math.max(1, Math.min(4, cpus().length - 1));
  const scaleOk = probe.ok && probe.deviceWidth === probe.cssWidth * probe.scale;
  const rows = [
    ['Node >= 22 + WebSocket', report.node.ok, report.node.version],
    ['Chromium', !!chromium, chromiumVersion || 'missing'],
    ['Device-scale gate (2x)', scaleOk, probe.ok ? `css ${probe.cssWidth} -> png ${probe.deviceWidth}` : probe.error],
    ['ffmpeg / ffprobe', !!ffv && report.ffprobe, ffv ? ffv.split(' ').slice(0, 3).join(' ') : 'missing'],
    ['x264 + AAC', !!caps?.encoders.libx264 && !!caps?.encoders.aac, ''],
    ['loudnorm/alimiter/ebur128', !!(caps?.filters.loudnorm && caps?.filters.alimiter && caps?.filters.ebur128), ''],
    ['freezedetect/blackdetect/tile', !!(caps?.filters.freezedetect && caps?.filters.blackdetect && caps?.filters.tile), ''],
    ['subtitles (libass) burn-in', !!caps?.filters.subtitles, ''],
    ['GIF/WebP preview', !!(caps?.filters.palettegen && caps?.encoders.libwebp), ''],
    ['GPU encoder (usable)', Object.values(caps?.gpu || {}).some(Boolean), Object.entries(caps?.gpu || {}).filter(([, v]) => v).map(([k]) => k).join(',') || 'none -> CPU x264'],
    ['Arabic-capable fonts', f.arabic.length > 0 || f.bundled.length > 0, `${f.arabic.slice(0, 4).join(', ')}${f.bundled.length ? ` + bundled ${f.bundled.length}` : ''}`],
    ['CPU cores', report.machine.cores >= 2, `${report.machine.cores} -> ${plan1080} render workers for a 1080p 3D film right now`],
    ['RAM', report.machine.ramGB >= 4, `${report.machine.ramGB} GB`],
    ['Memory headroom', !mem || mem.headroomGB >= 4, mem ? `${mem.headroomGB} GB usable${mem.commitFreeGB !== null ? ` (commit free ${mem.commitFreeGB} of ${mem.commitLimitGB} GB; page file ${mem.pagefileMB} MB ${mem.pagefileAuto ? 'system-managed' : 'FIXED -> set it to system-managed for more render workers'})` : ''}` : 'not checked in build mode'],
    ['Orphan render browsers', !orph, orph ? `${orph} left by a crashed run -> node studio.mjs cleanup` : 'none'],
    ['Disk free', true, report.machine.diskFree],
    ['Python (optional)', true, report.python || 'none'],
    ['Live-action modules (optional)', true, report.live ? `${report.live}${/mediapipe/.test(report.live) && /sherpa_onnx/.test(report.live) ? '' : '  (pip install -r tools/requirements-live.txt)'}` : `none  (pip install -r tools/requirements-live.txt; ${PYTHON} tools/live.py models)`],
    ['Logo tracer (optional)', true, report.logo ? 'potrace + Pillow + OpenCV' : 'none  (pip install potracer pillow opencv-python-headless)'],
    ['Forensics modules (optional)', true, report.forensics ? `${report.forensics}${/cv2/.test(report.forensics) && /librosa/.test(report.forensics) ? '' : '  (pip install -r reference/requirements-optional.txt)'}` : 'none'],
  ];
  report.ok = rows.slice(0, 9).every((r) => r[1]);
  if (!quiet) {
    const w = Math.max(...rows.map((r) => r[0].length));
    console.log('\nSTUDIO DOCTOR');
    for (const [name, ok, note] of rows) console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${name.padEnd(w)}  ${note ?? ''}`);
    console.log(`\n  verdict: ${report.ok ? 'studio can run' : 'missing required tools (see FAIL rows)'}\n`);
  }
  if (!optional) return report; // a partial check must not overwrite the full takes/doctor.json
  const out = join(ROOT, 'takes');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'doctor.json'), JSON.stringify(report, null, 2));
  return report;
}

// Builds reuse the last PASSING required check while node, Chromium, ffmpeg and ffprobe are the same files (path, size,
// mtime): the check costs ~10 s of process launches on Windows. render.mjs still gates every worker's first frame width.
export async function buildCheck() {
  const file = join(ROOT, 'takes', 'doctor-build.json');
  const stamp = (p) => { try { const s = statSync(p); return [p, s.size, s.mtimeMs]; } catch { return [p]; } };
  const browser = process.env.STUDIO_CDP_URL ? [`attach:${process.env.STUDIO_CDP_URL}`] : stamp(findChromium());
  const key = JSON.stringify([process.version, browser, ...[onPath('ffmpeg'), onPath('ffprobe')].map(stamp)]);
  try { const saved = JSON.parse(readFileSync(file, 'utf8')); if (saved.key === key && saved.report.ok) return { ...saved.report, reused: true }; } catch {}
  const report = await doctor({ quiet: true, optional: false });
  if (report.ok) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify({ key, report })); }
  return report;
}

if (isMain(import.meta.url)) {
  const r = await doctor();
  process.exit(r.ok ? 0 : 1);
}
