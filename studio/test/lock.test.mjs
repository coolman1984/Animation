// One render or browser job at a time (audit L1): acquire, refuse a second job, let children inherit, take over a dead holder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { acquireLock, releaseLock, lockHolder, clearStaleLock } from '../lib/procs.mjs';

const deadPid = () => { const r = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }); return +r.stdout; };

test('the studio lock: first job takes it, a second is refused, a child inherits, a dead holder is replaced', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lock-')), file = join(dir, 'lock.json');
  try {
    const env = {};
    assert.equal(acquireLock({ file, env, what: 'build a', onExit: false }).acquired, true);
    assert.equal(env.STUDIO_LOCK_PID, String(process.pid));
    assert.equal(acquireLock({ file, env: {}, onExit: false }).held, true);   // re-entrant for the holder
    // another live process (our parent node --test runner is alive) holds it:
    writeFileSync(file, JSON.stringify({ pid: process.ppid, what: 'render b', started: 'now' }));
    assert.throws(() => acquireLock({ file, env: {}, onExit: false }), /another studio job.*render b/);
    assert.equal(acquireLock({ file, env: { STUDIO_LOCK_PID: String(process.ppid) }, onExit: false }).inherited, true);
    assert.equal(lockHolder(file).what, 'render b');
    assert.deepEqual(clearStaleLock(file).live.what, 'render b');
    // a dead holder is taken over, and cleanup removes a stale lock
    const dead = deadPid();
    writeFileSync(file, JSON.stringify({ pid: dead, what: 'crashed', started: 'then' }));
    assert.equal(lockHolder(file), null);
    assert.equal(acquireLock({ file, env: {}, onExit: false }).tookOverFrom, dead);
    assert.equal(releaseLock({ file }), true); assert.equal(existsSync(file), false);
    writeFileSync(file, JSON.stringify({ pid: dead, what: 'crashed' }));
    assert.equal(clearStaleLock(file).removed.what, 'crashed'); assert.equal(existsSync(file), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('test runner processes skip the lock unless asked', () => {
  assert.equal(acquireLock({ file: join(tmpdir(), 'never.json'), env: { NODE_TEST_CONTEXT: 'child' } }).skipped, true);
});
