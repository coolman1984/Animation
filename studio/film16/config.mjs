// Film 16 — Hessa (حِصّة) — «٤ أسئلة» — 25 s motion-graphics showreel-ad. ONE delivery: 16:9.
// 120 BPM: beat 0.5 s, bar 2 s, 25 s = 12.5 bars. Authored 1920×1080 @ 30 fps.
export default {
  title: 'Hessa — four questions (25 s, 16:9)',
  film: 'film16/film.js',
  score: 'film16/score.mjs',
  production: 'film16/production.json',
  ownerRequest: { delivery: 'hessa25', w: 1920, h: 1080, duration: 25, fps: 30 },
  w: 1920, h: 1080, fps: 30, lufs: -14, tp: -1.5, shareMB: 28,
  dither: true,
  preview: { delivery: 'hessa25', range: [0, 12] },
  cacheInputs: ['film16/timing.js'],
  deliveries: [
    { name: 'hessa25', duration: 25, safe: [96, 54, 1824, 1026], shareMB: 28, poster: 24.0, holds: [[23.6, 25]] },
  ],
  thumbs: [],
  holds: [],
};
