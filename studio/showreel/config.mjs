// Studio showreel — 15 s, 128 BPM (bar 1.875 s, 8 bars). Authored per aspect: 16:9 hero, 9:16 recomposed in film.js.
export default {
  title: 'Studio showreel — every craft, one studio (15 s)',
  film: 'showreel/film.js',
  score: 'showreel/score.mjs',
  production: 'showreel/production.json',
  w: 1920, h: 1080, fps: 30, lufs: -14, tp: -1.5, shareMB: 10,
  gpu: true,
  preview: { delivery: 'reel16x9', range: [0, 12] },
  cacheInputs: ['examples/app-film-study/capture'],
  deliveries: [
    { name: 'reel16x9', duration: 15, safe: [96, 54, 1824, 1026], shareMB: 10, poster: 14.6, holds: [[13.5, 15]] },
    { name: 'reel9x16', duration: 15, w: 1080, h: 1920, safe: [65, 269, 1015, 1248], shareMB: 10, poster: 14.6, holds: [[13.5, 15]] },
  ],
  thumbs: [],
  holds: [[13.5, 15]],
};
