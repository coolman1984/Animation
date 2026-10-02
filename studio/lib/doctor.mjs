// studio doctor: probe the machine and print what the studio can use.
// Pure Node (>=22), no packages. Writes takes/doctor.json for other tools.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { cpus, totalmem, freemem, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000, ...opts });
  } catch (e) {
    return null;
  }
}

export function findChromium() {
  const candidates = [
    process.env.STUDIO_CHROMIUM,
    '/opt/pw-browsers/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
    for (const d of readdirSync(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
      if (/^chromium-\d+$/.test(d)) candidates.push(join(process.env.PLAYWRIGHT_BROWSERS_PATH, d, 'chrome-linux', 'chrome'));
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
  try {
    const wsUrl = await new Promise((res, rej) => {
      let buf = '';
      const t = setTimeout(() => rej(new Error('no DevTools URL')), 15000);
      proc.stderr.on('data', (d) => {
        buf += d;
        const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) { clearTimeout(t); res(m[1]); }
      });
    });
    const port = new URL(wsUrl).port;
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
    return { ok: true, cssWidth: metrics.result.result.value, deviceWidth: width, scale };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  } finally {
    proc.kill('SIGKILL');
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

function ffmpegCaps() {
  const enc = run('ffmpeg', ['-hide_banner', '-encoders']) || '';
  const fil = run('ffmpeg', ['-hide_banner', '-filters']) || '';
  const has = (txt, name) => new RegExp(`\\s${name}\\s`).test(txt);
  const encoders = Object.fromEntries(['libx264', 'libx265', 'aac', 'libopus', 'libvpx-vp9', 'libwebp', 'png', 'h264_nvenc', 'h264_vaapi', 'h264_qsv'].map((n) => [n, has(enc, n)]));
  const filters = Object.fromEntries(['loudnorm', 'alimiter', 'ebur128', 'freezedetect', 'blackdetect', 'tile', 'subtitles', 'palettegen', 'zscale'].map((n) => [n, has(fil, n)]));
  // A listed GPU encoder is only usable if a real 1-frame encode succeeds.
  const gpu = {};
  for (const g of ['h264_nvenc', 'h264_vaapi', 'h264_qsv']) {
    if (!encoders[g]) { gpu[g] = false; continue; }
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

export async function doctor({ quiet = false } = {}) {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const chromium = findChromium();
  const chromiumVersion = chromium ? (run(chromium, ['--version']) || '').trim() : null;
  const ffv = (run('ffmpeg', ['-version']) || '').split('\n')[0];
  const caps = ffv ? ffmpegCaps() : null;
  const probe = chromium ? await probeChromium(chromium, 2) : { ok: false, error: 'no chromium' };
  const f = fonts();
  const df = (run('df', ['-BG', '--output=avail', ROOT]) || '').split('\n')[1]?.trim();
  const report = {
    at: new Date().toISOString(),
    node: { version: process.versions.node, ok: nodeMajor >= 22 && typeof WebSocket === 'function' },
    chromium: { path: chromium, version: chromiumVersion, scaleProbe: probe },
    ffmpeg: { version: ffv || null, ...caps },
    ffprobe: !!run('ffprobe', ['-version']),
    python: (run('python3', ['--version']) || '').trim() || null,
    // Precise forensics (tools/motion_curves.py, tools/audio_deep.py): which optional modules are importable.
    forensics: (run('python3', ['-c', "import importlib\nfor m in ('numpy','scipy','cv2','librosa','scenedetect'):\n  try: importlib.import_module(m); print(m, end=' ')\n  except Exception: pass"]) || '').trim() || null,
    machine: { cores: cpus().length, ramGB: +(totalmem() / 2 ** 30).toFixed(1), freeRamGB: +(freemem() / 2 ** 30).toFixed(1), diskFree: df || null },
    fonts: f,
  };
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
    ['CPU cores', report.machine.cores >= 2, `${report.machine.cores} -> ${Math.max(1, Math.min(4, report.machine.cores - 0))} render workers`],
    ['RAM', report.machine.ramGB >= 4, `${report.machine.ramGB} GB`],
    ['Disk free', true, report.machine.diskFree],
    ['Python (optional)', true, report.python || 'none'],
    ['Forensics modules (optional)', true, report.forensics ? `${report.forensics}${/cv2/.test(report.forensics) && /librosa/.test(report.forensics) ? '' : '  (pip install -r reference/requirements-optional.txt)'}` : 'none'],
  ];
  report.ok = rows.slice(0, 9).every((r) => r[1]);
  if (!quiet) {
    const w = Math.max(...rows.map((r) => r[0].length));
    console.log('\nSTUDIO DOCTOR');
    for (const [name, ok, note] of rows) console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${name.padEnd(w)}  ${note ?? ''}`);
    console.log(`\n  verdict: ${report.ok ? 'studio can run' : 'missing required tools (see FAIL rows)'}\n`);
  }
  const out = join(ROOT, 'takes');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'doctor.json'), JSON.stringify(report, null, 2));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await doctor();
  process.exit(r.ok ? 0 : 1);
}
