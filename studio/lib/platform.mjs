// Operating-system differences in one place: the studio runs on Linux CI and on the owner's Windows machine.
import { existsSync } from 'node:fs';
import { devNull } from 'node:os';
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
