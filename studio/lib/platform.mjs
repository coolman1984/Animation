// Operating-system differences in one place: the studio runs on Linux CI and on the owner's Windows machine.
import { existsSync } from 'node:fs';
import { devNull, freemem, totalmem, cpus } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join, delimiter } from 'node:path';
import { pathToFileURL } from 'node:url';

export const WINDOWS = process.platform === 'win32';
export { devNull };

// Python launcher: STUDIO_PYTHON wins. On Windows `python3` is usually the Microsoft Store stub, so use `python`.
export const PYTHON = process.env.STUDIO_PYTHON || (WINDOWS ? 'python' : 'python3');

// True when the module at `metaUrl` is the script node was started with (works with spaces and drive letters).
export const isMain = (metaUrl) => !!process.argv[1] && metaUrl === pathToFileURL(process.argv[1]).href;

// Forward slashes for URLs and FFmpeg list files; FFmpeg and Chromium accept them on every platform.
export const slash = (path) => path.replaceAll('\\', '/');

// Memory that a render may actually use. On Windows the binding limit is often the COMMIT limit (RAM + page file), not free
// RAM: this machine had 15.7 GB RAM, a fixed 2 GB page file and only 1.7 GB of commit left, so six Chrome workers took the
// system (and the host app) down with native out-of-memory crashes. One PowerShell CIM call (~1 s), memoised per process.
let memo = null;
export function memoryBudget({ refresh = false } = {}) {
  if (memo && !refresh) return memo;
  const freeGB = freemem() / 2 ** 30, totalGB = totalmem() / 2 ** 30;
  let commitFreeGB = null, commitLimitGB = null, pagefileMB = null, pagefileAuto = null;
  if (WINDOWS) {
    const ps = '$o=Get-CimInstance Win32_OperatingSystem;$c=Get-CimInstance Win32_ComputerSystem;$p=Get-CimInstance Win32_PageFileUsage;"$($o.FreeVirtualMemory) $($o.TotalVirtualMemorySize) $(($p|Measure-Object AllocatedBaseSize -Sum).Sum) $($c.AutomaticManagedPagefile)"';
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 20000 });
    const m = (r.stdout || '').trim().split(/\s+/);
    if (m.length >= 4 && Number.isFinite(+m[0])) { commitFreeGB = +m[0] / 2 ** 20; commitLimitGB = +m[1] / 2 ** 20; pagefileMB = +m[2] || 0; pagefileAuto = /true/i.test(m[3]); }
  }
  const headroomGB = commitFreeGB === null ? freeGB : Math.min(freeGB, commitFreeGB);
  memo = { freeGB: +freeGB.toFixed(2), totalGB: +totalGB.toFixed(1), commitFreeGB: commitFreeGB === null ? null : +commitFreeGB.toFixed(2), commitLimitGB: commitLimitGB === null ? null : +commitLimitGB.toFixed(1), pagefileMB, pagefileAuto, headroomGB: +headroomGB.toFixed(2) };
  return memo;
}
// Render workers the machine can hold: each is a Chromium (+ SwiftShader when gpu) + ~10 frame-sized buffers + an ffmpeg.
// 1080p with gpu ≈ 1.0 GB. reserveGB stays free for the system and the host application. STUDIO_WORKERS forces a count.
export function plannedWorkers({ requested = 4, w = 1920, h = 1080, scale = 1, gpu = false, budget = memoryBudget(), reserveGB = 3 } = {}) {
  const perWorkerGB = 0.45 + (gpu ? 0.5 : 0) + (w * scale * h * scale * 4 * 10) / 2 ** 30;
  const cap = Math.max(1, Math.min(requested, cpus().length - 1));
  const fit = Math.floor((budget.headroomGB - reserveGB) / perWorkerGB);
  const forced = process.env.STUDIO_WORKERS ? Math.max(1, Math.min(16, +process.env.STUDIO_WORKERS)) : null;
  return { workers: forced || Math.max(1, Math.min(cap, fit)), perWorkerGB: +perWorkerGB.toFixed(2), fit, cap, low: fit < 1, forced: !!forced };
}

// Resolve a command on PATH without launching anything (process start costs ~1 s on the owner's Windows machine).
export function onPath(name, env = process.env) {
  const exts = WINDOWS ? (env.PATHEXT || '.EXE;.CMD;.BAT').split(';').map((e) => e.toLowerCase()) : [''];
  for (const dir of (env.PATH || env.Path || '').split(delimiter).filter(Boolean)) {
    for (const ext of exts) { const p = join(dir, name + ext); if (existsSync(p)) return p; }
  }
  return null;
}

// Browser executables in preference order. STUDIO_CHROMIUM overrides everything.
export function browserCandidates(env = process.env) {
  if (WINDOWS) {
    const roots = [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA].filter(Boolean);
    return [
      env.STUDIO_CHROMIUM,
      ...roots.map((r) => join(r, 'Google', 'Chrome', 'Application', 'chrome.exe')),
      ...roots.map((r) => join(r, 'Chromium', 'Application', 'chrome.exe')),
      ...roots.map((r) => join(r, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
    ].filter(Boolean);
  }
  if (process.platform === 'darwin') {
    return [env.STUDIO_CHROMIUM, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean);
  }
  return [env.STUDIO_CHROMIUM, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
}
