// Film 4 — BALACONBAR "Your Matcha Moment" — 20 s. Authored 9:16; 4:5 recomposed in film.js.
// Music 96 BPM: bar 2.5 s, 8 bars = 20.0 s (hook bar 1, lift at 10 s, resolution at 17.5 s).
export default {
  title: 'BALACONBAR — Your Matcha Moment (20 s)',
  film: 'film4/film.js',
  score: 'film4/score.mjs',
  production: 'film4/production.json',
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  preview: { delivery: 'reels20', range: [0, 12] },
  cacheInputs: ['film4/plates'],
  deliveries: [
    // 9:16: commonly published Meta guidance (top ~14 %, bottom ~35 %, sides ~6 %) — not verified in Meta's own preview.
    { name: 'reels20', duration: 20, safe: [65, 269, 1015, 1248], shareMB: 12, poster: 18.8, holds: [[18.2, 20]] },
    { name: 'feed20', duration: 20, w: 1080, h: 1350, safe: [60, 60, 1020, 1290], shareMB: 12, poster: 18.8, holds: [[18.2, 20]] },
  ],
  thumbs: [],
  holds: [],
};
