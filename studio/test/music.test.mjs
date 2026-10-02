import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeTestTrack, TRACK } from './fixture/music-track.mjs';
import { analyzeMusic, pythonAvailable, fromBpm, deriveEvents, loadMusicMap, describeTime, cutReport, landings, beatAt, summary, validateMusicMap } from '../lib/musicmap.mjs';
import { Bus, SR, peak } from '../lib/audio.mjs';
import { SFX, impact, riser, whooshBy } from '../lib/sfx.mjs';
import { validateCues, placeCues, cueTime, cueSync } from '../lib/cues.mjs';
import { validateCreative, lookOverlap, deltaE } from '../lib/creative.mjs';

const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

function checkStructure(map, label) {
  near(map.tempo.bpm, TRACK.bpm, 1.5, `${label} tempo`);
  const loudBeats = map.beats.filter(b => b > TRACK.drop - 0.1);
  for (const b of loudBeats) { const k = Math.round((b - TRACK.offset) * 2); near(b, TRACK.offset + k / 2, 0.06, `${label} beat`); }
  const firstLoudDown = map.downbeats.find(d => d > TRACK.drop - 0.1);
  near(firstLoudDown, TRACK.drop, 0.06, `${label} downbeat phase`);
  assert.ok(map.quiet.some(q => q.start <= TRACK.quiet[0] + 0.3 && q.end >= 4), `${label} quiet hold ${JSON.stringify(map.quiet)}`);
  assert.ok(map.builds.some(b => b.end > TRACK.build[0] + 1 && b.start < TRACK.drop), `${label} build ${JSON.stringify(map.builds)}`);
  assert.ok(map.releases.some(r => Math.abs(r.t - TRACK.drop) < 0.15), `${label} release ${JSON.stringify(map.releases)}`);
  assert.ok(map.sections.length >= 2 && map.sections.some(s => Math.abs(s.start - TRACK.drop) < 0.4), `${label} sections`);
  const d = describeTime(map, TRACK.drop - 0.08);
  assert.match(d, /before the downbeat of bar \d+/); assert.match(d, /release/);
  assert.ok(cutReport(map, [firstLoudDown + 0.01])[0].onDownbeat, `${label} cut report`);
  assert.equal(landings(map, { from: 7, to: 9 })[0].kind, 'release');
  assert.match(summary(map), /BPM/);
}

test('built-in Node analyzer measures tempo, grid, quiet, build and release on a known track', { timeout: 60000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-music-'));
  try {
    const wav = join(dir, 'track.wav'); writeTestTrack(wav);
    const map = await analyzeMusic(wav, { engine: 'node', out: join(dir, 'map.json') });
    assert.equal(map.analyzer, 'node-basic'); checkStructure(map, 'node');
    assert.deepEqual(loadMusicMap(join(dir, 'map.json')), map, 'saved map round-trips');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('optional librosa analyzer (skipped when Python/librosa are absent)', { skip: !pythonAvailable() && 'numpy/librosa not installed', timeout: 240000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-music-py-'));
  try {
    const wav = join(dir, 'track.wav'); writeTestTrack(wav);
    const map = await analyzeMusic(wav, { engine: 'python' });
    assert.match(map.analyzer, /^librosa/); checkStructure(map, 'librosa');
    assert.ok(map.curves.energy.length > 100 && map.density.length === 16);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('manual BPM fallback keeps the lightweight path; raw maps derive events; invalid maps fail', () => {
  const m = fromBpm({ bpm: 96, duration: 20, offset: 0 });
  assert.equal(m.analyzer, 'manual-bpm'); assert.equal(m.downbeats[1], 2.5); assert.deepEqual(m.phrases, [0, 10, 20]);
  assert.equal(beatAt(m, 2.45).downbeat, true); assert.match(describeTime(m, 2.42), /80 ms before the downbeat of bar 2/);
  assert.throws(() => validateMusicMap({ version: 1, duration: 4, beats: [1, 0.5], downbeats: [] }), /strictly increasing/);
  const raw = { version: 1, duration: 4, beats: [0, 1, 2, 3], downbeats: [0], curves: { hop: 0.05, energy: Array.from({ length: 80 }, (_, i) => (i < 40 ? 0.05 : 0.9)) } };
  const d = deriveEvents(raw);
  assert.ok(d.quiet.length && d.releases.length && d.phrases.includes(0));
});

test('designed SFX land on the cue time: transient at t, riser ends at t, whoosh peaks at t', () => {
  const env = (bus, a, b) => { let m = 0; for (let i = Math.round(a * SR); i < Math.round(b * SR); i++) m = Math.max(m, Math.abs(bus.L[i])); return m; };
  const hit = new Bus(2); impact(hit, 1);
  assert.equal(env(hit, 0, 0.999), 0); assert.ok(env(hit, 1, 1.05) > 0.05);
  const rise = new Bus(4); riser(rise, 3, { dur: 2, tail: 0.005 });
  assert.equal(env(rise, 0, 0.99), 0); assert.ok(env(rise, 2.8, 3) > env(rise, 1.2, 1.4) * 3, 'riser grows'); assert.ok(env(rise, 3.05, 4) < 1e-6, 'ends on the cue');
  const w = new Bus(3); whooshBy(w, 1.5, { dur: 1 });
  const at = s => env(w, s - 0.05, s + 0.05); assert.ok(at(1.5) > at(1.2) && at(1.5) > at(1.85));
  for (const [name, def] of Object.entries(SFX)) { const b = new Bus(3); def.fn(b, 1.5, {}); assert.ok(peak(b) > 0, name); }
});

test('cue sheet: one source of truth, selective sound, measurable sync', () => {
  const plan = { duration: 10, shots: [{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 5, end: 10 }], cues: [
    { id: 'reveal', t: 2, kind: 'reveal', shot: 'a' },
    { id: 'cut1', t: 5, kind: 'transition', shot: 'b', sound: { type: 'whoosh', gain: 0.8 } },
    { id: 'land', t: 7, kind: 'impact', sound: { type: 'softHit' } },
  ] };
  assert.deepEqual(validateCues(plan), { errors: [], warnings: [] });
  assert.equal(cueTime(plan, 'land'), 7); assert.throws(() => cueTime(plan, 'typo'), /unknown cue/);
  const bus = new Bus(10); assert.equal(placeCues(bus, plan.cues), 2); assert.ok(peak(bus) > 0);
  const bad = validateCues({ ...plan, cues: [{ id: 'x', t: 6, kind: 'reveal', shot: 'a', sound: { type: 'laser' } }, { id: 'x', t: 1, kind: '' }] });
  for (const p of [/outside shot/, /unknown sound/, /unique/, /ordered/, /kind/]) assert.ok(bad.errors.some(e => p.test(e)), p);
  const busy = { duration: 10, cues: Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, t: 1 + i * 0.5, kind: 'transition', sound: { type: 'whoosh' } })) };
  const w = validateCues(busy).warnings; assert.ok(w.some(x => /accents within/.test(x)) && w.some(x => /transitions carry a sound/.test(x)));
  const sync = cueSync(plan.cues, [7.012]); assert.equal(sync.length, 1); assert.equal(sync[0].ok, true);
  assert.equal(cueSync(plan.cues, [7.2])[0].ok, false);
});

test('creative block validation and cross-film look overlap warnings', () => {
  const creative = { viewer: 'v', problem: 'p', promise: 'p', evidence: 'e', emotion: 'e', motif: 'paper folds', light: 'l', camera: 'slow lateral truck, locked holds', motion: 'm', sound: 's', pacing: 'p', payoff: 'p', cta: 'c',
    palette: ['#112233', '#f4eada', '#c9a55c'], typography: { display: 'El Messiri', text: 'Plex Arabic' }, transitions: ['matchCut', 'focusHandoff'], styleFrames: { hook: 1, proof: 6, payoff: 18 }, proof: { start: 0, end: 10 } };
  const plan = { duration: 20, creative, shots: [] };
  assert.deepEqual(validateCreative(plan), { errors: [], warnings: [] });
  assert.ok(validateCreative({ duration: 20 }).warnings[0].includes('no creative block'));
  const bad = validateCreative({ duration: 20, creative: { palette: ['red'], styleFrames: { hook: 99 }, proof: { start: 0, end: 3 } } });
  assert.ok(bad.errors.some(e => /palette/.test(e)) && bad.errors.some(e => /styleFrames.hook/.test(e)) && bad.warnings.some(w => /8–12 s/.test(w)));
  const twin = lookOverlap(plan, [{ name: 'film4', plan: { creative: { ...creative, palette: ['#112234', '#f5ebdb', '#caa65d'], motif: 'folded paper folds' } } }]);
  for (const p of [/font pairing/, /palette/, /motif/, /transition language/]) assert.ok(twin.some(w => p.test(w)), p);
  assert.deepEqual(lookOverlap(plan, [{ name: 'other', plan: { creative: { typography: { display: 'Montserrat' }, palette: ['#ff0000'], motif: 'neon rain', transitions: ['push', 'lightWipe'] } } }]), []);
  assert.ok(deltaE('#000000', '#ffffff') > 99);
});
