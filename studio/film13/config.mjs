// Film 13 — Hessa «٤ أسئلة» — the 9:16 Reels cut of film 12. ONE delivery: 1080×1920 @ 30 fps, 25 s. Same shared clock and score as film 12.
export default {
  title: 'Hessa — four questions (25 s, 9:16 Reels)',
  film: 'film13/film.js',
  score: 'film13/score.mjs',
  production: 'film12/production.json',
  ownerRequest: { delivery: 'reel25', w: 1080, h: 1920, duration: 25, fps: 30 },
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 28,
  dither: true,
  preview: { delivery: 'reel25', range: [0, 12] },
  cacheInputs: ['film12/timing.js', 'film12/kit.js', 'film12/score.mjs', 'film12/production.json'],
  deliveries: [
    { name: 'reel25', duration: 25, safe: [65, 269, 1015, 1248], shareMB: 28, poster: 24.0, holds: [[23.6, 25]] },
  ],
  thumbs: [],
  holds: [],
};
