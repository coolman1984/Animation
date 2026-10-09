// Film 15 — "إتكلم كورة" 25 s motion-graphics showreel ad, 16:9. Music 115.2 BPM, bar 2.0833 s, 12 bars = 25.000 s.
export default {
  title: 'إتكلم كورة — showreel ad (25 s)',
  film: 'film15/film.js',
  score: 'film15/score.mjs',
  production: 'film15/production.json',
  ownerRequest: { delivery: 'wide25', w: 1920, h: 1080, duration: 25, fps: 30 }, // AUTONOMOUS_FILM.md
  dither: true,
  w: 1920, h: 1080, fps: 30, lufs: -14, tp: -1.5, shareMB: 24,
  preview: { delivery: 'wide25', range: [0, 12] },
  cacheInputs: ['film15/plates', 'film15/data'],
  deliveries: [
    // 16:9: text/graphics kept ≥ 5 % from every edge.
    { name: 'wide25', duration: 25, safe: [96, 54, 1824, 1026], shareMB: 24, poster: 21.4, holds: [] },
  ],
  thumbs: [],
  holds: [],
};
