#!/usr/bin/env node
// Side-by-side proof: the same timestamps from two exports, original (top) vs engine (bottom), plus a per-pair motion
// energy number (mean frame difference over ±1 frame) so "less motion" shows up as a number, not an impression.
//   node studio-engine/compare.mjs <original.mp4> <engine.mp4> <out.png> [t1,t2,…]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
const [A, Bv, out, ts] = process.argv.slice(2);
const times = (ts || '1.5,5,9.5,13.5,17.5,22,28,33,37.5,42.5').split(',').map(Number);
const tmp = join(dirname(out), 'cmp-frames'); mkdirSync(tmp, { recursive: true });
const grab = (v, t, f) => spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', v, '-frames:v', '1', '-vf', 'scale=480:-2', f]);
const energy = (v, t) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-ss', String(Math.max(0, t - 0.2)), '-t', '0.4', '-i', v, '-vf', 'scale=320:-2,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const v2 = [...r.stderr.matchAll(/YAVG=([\d.]+)/g)].map((m) => +m[1]); return v2.length ? +(v2.reduce((a, b) => a + b, 0) / v2.length).toFixed(2) : 0; };
const rows = [];
times.forEach((t, i) => { grab(A, t, join(tmp, `a${i}.png`)); grab(Bv, t, join(tmp, `b${i}.png`)); rows.push([t, energy(A, t), energy(Bv, t)]); });
const n = times.length, inputs = times.flatMap((_, i) => ['-i', join(tmp, `a${i}.png`)]).concat(times.flatMap((_, i) => ['-i', join(tmp, `b${i}.png`)]));
const layout = [...Array(2 * n).keys()].map((k) => `${(k % n) * 480}_${Math.floor(k / n) === 0 ? 0 : 'h0'}`).join('|');
spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `xstack=inputs=${2 * n}:layout=${layout}`, out]);
console.log('t      motion(original)  motion(engine)');
for (const [t, a, b] of rows) console.log(`${t.toFixed(1).padStart(5)}  ${String(a).padStart(8)}  ${String(b).padStart(14)}`);
const sa = rows.reduce((s, r) => s + r[1], 0), sb = rows.reduce((s, r) => s + r[2], 0);
console.log(`total motion energy: original ${sa.toFixed(1)} · engine ${sb.toFixed(1)} (${((sb / sa) * 100).toFixed(0)}%) → ${out}`);
