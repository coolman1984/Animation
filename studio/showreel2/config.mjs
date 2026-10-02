// Showreel 2 — "CLAUDE · motion designer", 15 s, 128 BPM, 1920×1080 @ 60 fps. Visual grammar studied from references/user-ref.
export default {
  title: 'Showreel 2 — CLAUDE motion designer (15 s)',
  film: 'showreel2/film.js',
  score: 'showreel2/score.mjs',
  production: 'showreel2/production.json',
  w: 1920, h: 1080, fps: 60, lufs: -14, tp: -1.5, shareMB: 12,
  preview: { delivery: 'reel', range: [0, 15] },
  cacheInputs: ['showreel2'],
  deliveries: [{ name: 'reel', duration: 15, safe: [40, 40, 1880, 1040], shareMB: 12, poster: 14.6, holds: [[14.4, 15]], darkSpans: [[0, 0.7], [1.7, 1.95]] }],
  thumbs: [],
  holds: [[14.4, 15]],
  // Declared dark passages (reasons): 0–0.7 s cold open (ring + dot on the dark field, as in the reference);
  // 1.7–1.95 s the burst collapses into one dot just before the iris punch.
  darkSpans: [[0, 0.7], [1.7, 1.95]],
};
