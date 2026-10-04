// Film 11 — AI × HR workshop — 25 s showreel-grade Arabic motion graphics. ONE delivery: 1920×1080 @ 60 fps (owner's explicit request).
// 144 BPM: beat 25 frames, bar 100 frames, 15 bars = 25.0 s. Picture and sound share film11/timing.js.
export default {
  title: 'AI × HR — workshop showreel (25 s, 1080p60)',
  film: 'film11/film.js',
  score: 'film11/score.mjs',
  production: 'film11/production.json',
  ownerRequest: { delivery: 'showreel25', w: 1920, h: 1080, duration: 25, fps: 60 },
  w: 1920, h: 1080, fps: 60, lufs: -14, tp: -1.5, shareMB: 40,
  dither: true,
  preview: { delivery: 'showreel25', range: [0, 8] },
  cacheInputs: [],
  deliveries: [
    { name: 'showreel25', duration: 25, safe: [96, 54, 1824, 1026], shareMB: 40, poster: 24.0, holds: [[23.6, 25]] },
  ],
  thumbs: [],
  holds: [],
};
