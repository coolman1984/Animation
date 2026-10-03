// Film 8 — Pixel Plus — «المحطة القادمة» — 25 s formal pitch film for a factory's top management. ONE delivery: 16:9 presentation screen.
// 96 BPM: beat 0.625 s, bar 2.5 s, 10 bars = 25.0 s. Authored 1920×1080 @ 30 fps.
export default {
  title: 'Pixel Plus — factory pitch (25 s, 16:9)',
  film: 'film8/film.js',
  score: 'film8/score.mjs',
  production: 'film8/production.json',
  ownerRequest: { delivery: 'pitch25', w: 1920, h: 1080, duration: 25, fps: 30 }, // presentation in a meeting room → landscape screen
  w: 1920, h: 1080, fps: 30, lufs: -16, tp: -1.5, shareMB: 14,
  dither: true,
  preview: { delivery: 'pitch25', range: [0, 12] },
  cacheInputs: ['film6/plates'],
  deliveries: [
    { name: 'pitch25', duration: 25, safe: [96, 54, 1824, 1026], shareMB: 14, poster: 24.0, holds: [[23.3, 25]] },
  ],
  thumbs: [],
  holds: [],
};
