// Registry of browser processes the studio launches (takes/.studio-procs.json). Why: when a render's node dies hard
// (out-of-memory fatal error, the host app killed), its Chromium workers survive. Measured 2026-10-03: 32 orphan Chrome
// processes (1.9 GB) + one hung node from two crashed runs, which starved the NEXT runs and the host app of memory.
// Every launch registers { pid, parent, profile }; the next studio start reaps entries whose parent is gone.
import { readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WINDOWS } from './platform.mjs';

const FILE = process.env.STUDIO_PROCS_FILE || join(dirname(fileURLToPath(import.meta.url)), '..', 'takes', '.studio-procs.json');
const read = () => { try { return JSON.parse(readFileSync(FILE, 'utf8')); } catch { return []; } };
const write = (list) => { mkdirSync(dirname(FILE), { recursive: true }); const tmp = `${FILE}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(list)); renameSync(tmp, FILE); };

// Signal 0 probes existence; EPERM means it exists but belongs to someone else.
export const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
export const register = (entry) => write([...read().filter((e) => e.pid !== entry.pid), { ...entry, parent: process.pid, at: Date.now() }]);
export const unregister = (pid) => write(read().filter((e) => e.pid !== pid));
export const liveEntries = () => read().filter((e) => alive(e.pid));
export function killTree(pid) {
  if (WINDOWS) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 15000 });
  else { try { process.kill(pid, 'SIGKILL'); } catch {} }
}
export const orphans = () => read().filter((e) => alive(e.pid) && !alive(e.parent));
// Kill browsers whose launching node is dead, remove their profiles, drop dead entries. Returns what was killed.
export function reap({ log } = {}) {
  const keep = [], killed = [];
  for (const e of read()) {
    const pidAlive = alive(e.pid);
    if (pidAlive && alive(e.parent)) { keep.push(e); continue; }
    if (pidAlive) { killTree(e.pid); killed.push(e); }
    if (e.profile) { try { rmSync(e.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {} }
  }
  write(keep);
  if (killed.length && log) log(`reaped ${killed.length} orphan browser process(es) left by an earlier crashed run`);
  return killed;
}
