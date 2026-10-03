// Film 9 — NeuroAnara — «Decode the Case» — 20 s, ONE delivery: Facebook Reels 9:16. No music (owner request): sound effects only.
export default {
  title: 'NeuroAnara — Decode the Case (20 s Reels, no music)',
  film: 'film9/film.js',
  score: 'film9/score.mjs',
  production: 'film9/production.json',
  ownerRequest: { delivery: 'reels20', w: 1080, h: 1920, duration: 20, fps: 30 },
  w: 1080, h: 1920, fps: 30, lufs: -16, tp: -1.5, shareMB: 10,
  dither: true,
  preview: { delivery: 'reels20', range: [0, 12] },
  cacheInputs: [],
  deliveries: [
    { name: 'reels20', duration: 20, safe: [65, 269, 1015, 1248], shareMB: 10, poster: 19.5, holds: [[19.3, 20]] },
  ],
  thumbs: [],
  holds: [],
};
