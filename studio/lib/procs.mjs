// Registry of browser processes the studio launches (takes/.studio-procs.json). Why: when a render's node dies hard
// (out-of-memory fatal error, the host app killed), its Chromium workers survive. Measured 2026-10-03: 32 orphan Chrome
// processes (1.9 GB) + one hung node from two crashed runs, which starved the NEXT runs and the host app of memory.
// Every launch registers { pid, parent, profile }; the next studio start reaps entries whose parent is gone.
import { readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
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
/** @param {{ log?: (m: string) => void }} [opts] */
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

// ONE render or browser job at a time (AGENTS.md; audit L1): a second job exhausted memory and took the owner's host app down.
// The lock lives in takes/.studio-lock.json. Re-entrant for its holder; children inherit it through STUDIO_LOCK_PID (set in this
// process's env, so every spawn after acquiring passes it on). A lock whose holder is dead is taken over. `node --test` children
// (NODE_TEST_CONTEXT) skip it unless STUDIO_LOCK_IN_TESTS is set: test files run in parallel and are not studio jobs.
const LOCK = process.env.STUDIO_LOCK_FILE || join(dirname(fileURLToPath(import.meta.url)), '..', 'takes', '.studio-lock.json');
const readLock = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
export const lockHolder = (file = LOCK) => { const l = readLock(file); return l && alive(l.pid) ? l : null; };
export function acquireLock({ what = process.argv.slice(1).map((a) => a.split(/[\\/]/).slice(-2).join('/')).join(' '), file = LOCK, env = process.env, pid = process.pid, onExit = true } = {}) {
  if (env.NODE_TEST_CONTEXT && !env.STUDIO_LOCK_IN_TESTS) return { skipped: true };
  for (let attempt = 0; attempt < 2; attempt++) {
    const cur = readLock(file);
    if (cur?.pid === pid) return { held: true };
    if (cur && alive(cur.pid)) {
      if (Number(env.STUDIO_LOCK_PID) === cur.pid) return { inherited: true, holder: cur };
      throw Object.assign(new Error(`another studio job is using the browser: "${cur.what}" (pid ${cur.pid}, since ${cur.started}). One render or browser job at a time: wait for it, or if it crashed run node studio.mjs cleanup`), { code: 'STUDIO_BUSY', holder: cur });
    }
    if (cur) { try { unlinkSync(file); } catch {} }   // stale: its holder is dead
    try {
      mkdirSync(dirname(file), { recursive: true });
      const fd = openSync(file, 'wx'); writeFileSync(fd, JSON.stringify({ pid, what, started: new Date().toISOString() })); closeSync(fd);
    } catch (error) { if (error.code === 'EEXIST') continue; throw error; }   // someone else won the race: look again
    env.STUDIO_LOCK_PID = String(pid);
    if (onExit) process.once('exit', () => releaseLock({ file, pid }));
    return { acquired: true, ...(cur ? { tookOverFrom: cur.pid } : {}) };
  }
  throw new Error('could not take the studio lock (another job started at the same moment); try again');
}
export function releaseLock({ file = LOCK, pid = process.pid } = {}) { const cur = readLock(file); if (cur?.pid === pid) { try { unlinkSync(file); } catch {} return true; } return false; }
// cleanup: remove a lock whose holder is dead; report a live one.
export function clearStaleLock(file = LOCK) { const cur = readLock(file); if (!cur) return null; if (alive(cur.pid)) return { live: cur }; try { unlinkSync(file); } catch {} return { removed: cur }; }
