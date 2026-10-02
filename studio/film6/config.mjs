// Film 6 — "living poster" (chrome title in space), original design inspired by the structure of a studied album teaser.
// 128 BPM: bar 1.875 s, 8 bars = 15.0 s. ONE delivery: 1080×1080 square (feed / WhatsApp / Instagram post).
export default {
  title: 'Living poster — MOTION STUDIO G3 (15 s, square)',
  film: 'film6/film.js',
  score: 'film6/score.mjs',
  production: 'film6/production.json',
  ownerRequest: { delivery: 'square15', w: 1080, h: 1080, duration: 15, fps: 30 },
  w: 1080, h: 1080, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  preview: { delivery: 'square15', range: [0, 6] },
  cacheInputs: ['film6'],
  deliveries: [{ name: 'square15', duration: 15, safe: [60, 60, 1020, 1020], shareMB: 12, poster: 9.4, holds: [] }],
  thumbs: [],
  holds: [],
  // 0–0.5 s: the poster fades up from black on purpose (cold open into space).
  darkSpans: [[0, 0.5]],
};
