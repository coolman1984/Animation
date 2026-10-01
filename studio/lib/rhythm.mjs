// Musical timing helpers for editorial decisions. Evidence only; never force cuts to a beat.

const finite = (v, name) => {
  if (!Number.isFinite(v)) throw new Error(`${name} must be finite`);
  return v;
};

export function beatSeconds(bpm) {
  finite(bpm, 'bpm');
  if (bpm <= 0) throw new Error('bpm must be > 0');
  return 60 / bpm;
}

export function nearestBeat(t, { bpm, offset = 0, subdivision = 1 } = {}) {
  finite(t, 'time'); finite(offset, 'offset'); finite(subdivision, 'subdivision');
  if (!Number.isInteger(subdivision) || subdivision < 1 || subdivision > 16) throw new Error('subdivision must be an integer 1..16');
  const step = beatSeconds(bpm) / subdivision;
  const index = Math.round((t - offset) / step);
  const time = offset + index * step;
  return { time, index, delta: t - time, step };
}

export function beatGrid({ bpm, duration, offset = 0, beatsPerBar = 4, subdivision = 1 } = {}) {
  finite(duration, 'duration'); finite(offset, 'offset');
  if (duration <= 0) throw new Error('duration must be > 0');
  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1 || beatsPerBar > 16) throw new Error('beatsPerBar must be an integer 1..16');
  if (!Number.isInteger(subdivision) || subdivision < 1 || subdivision > 16) throw new Error('subdivision must be an integer 1..16');
  const step = beatSeconds(bpm) / subdivision;
  const startIndex = Math.ceil((0 - offset) / step);
  const points = [];
  for (let i = startIndex; ; i++) {
    const time = offset + i * step;
    if (time > duration + 1e-9) break;
    if (time < -1e-9) continue;
    const wholeBeat = Math.floor(i / subdivision);
    points.push({
      time: +time.toFixed(6), index: i,
      beat: ((wholeBeat % beatsPerBar) + beatsPerBar) % beatsPerBar + 1,
      bar: Math.floor(wholeBeat / beatsPerBar) + 1,
      downbeat: i % (beatsPerBar * subdivision) === 0,
    });
  }
  return points;
}

export function cutAlignment(cuts, { bpm, offset = 0, subdivision = 1, tolerance = 0.08 } = {}) {
  finite(tolerance, 'tolerance');
  if (tolerance < 0) throw new Error('tolerance must be >= 0');
  if (!Array.isArray(cuts) || cuts.some(t => !Number.isFinite(t))) throw new Error('cuts must be finite times');
  return cuts.map(time => {
    const n = nearestBeat(time, { bpm, offset, subdivision });
    return { time, nearest: n.time, delta: n.delta, aligned: Math.abs(n.delta) <= tolerance };
  });
}

export function phraseGrid({ bpm, duration, offset = 0, beatsPerBar = 4, barsPerPhrase = 4 } = {}) {
  if (!Number.isInteger(barsPerPhrase) || barsPerPhrase < 1 || barsPerPhrase > 32) throw new Error('barsPerPhrase must be an integer 1..32');
  const phrase = beatSeconds(bpm) * beatsPerBar * barsPerPhrase;
  const out = [];
  for (let i = Math.ceil((0 - offset) / phrase); ; i++) {
    const time = offset + i * phrase;
    if (time > duration + 1e-9) break;
    if (time >= -1e-9) out.push(+time.toFixed(6));
  }
  return out;
}
