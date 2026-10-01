import test from 'node:test';
import assert from 'node:assert/strict';
import { beatSeconds, beatGrid, nearestBeat, cutAlignment, phraseGrid } from '../lib/rhythm.mjs';

test('beat helpers expose exact editorial timing', () => {
  assert.equal(beatSeconds(120), 0.5);
  assert.deepEqual(nearestBeat(1.24, { bpm: 120 }), { time: 1, index: 2, delta: 0.24, step: 0.5 });
  const grid = beatGrid({ bpm: 120, duration: 2, beatsPerBar: 4 });
  assert.equal(grid.length, 5); assert.equal(grid[0].downbeat, true); assert.equal(grid[4].downbeat, true);
});

test('cut alignment reports evidence without forcing editorial choices', () => {
  const rows = cutAlignment([0.99, 1.13], { bpm: 120, tolerance: 0.05 });
  assert.equal(rows[0].aligned, true); assert.equal(rows[1].aligned, false);
});

test('phrase grid lands on musical phrase boundaries', () => {
  assert.deepEqual(phraseGrid({ bpm: 120, duration: 8, beatsPerBar: 4, barsPerPhrase: 2 }), [0, 4, 8]);
});
