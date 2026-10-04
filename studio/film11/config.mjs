// Film 11 — AI × HR workshop — 44 s showreel-grade Arabic motion graphics. ONE delivery: 1920×1080 @ 30 fps. v2 (owner 2026-10-04): slower and readable, +19 s.
// 120 BPM: beat 15 frames, bar 2 s, 22 bars = 44.0 s. Picture and sound share film11/timing.js.
export default {
  title: 'AI × HR — workshop showreel (44 s, 1080p30)',
  film: 'film11/film.js',
  score: 'film11/score.mjs',
  production: 'film11/production.json',
  ownerRequest: { delivery: 'showreel44', w: 1920, h: 1080, duration: 44, fps: 30 },
  w: 1920, h: 1080, fps: 30, lufs: -14, tp: -1.5, shareMB: 29,
  dither: true,
  preview: { delivery: 'showreel44', range: [0, 8] },
  cacheInputs: [],
  deliveries: [
    { name: 'showreel44', duration: 44, safe: [96, 54, 1824, 1026], shareMB: 29, poster: 43.0, holds: [[42.6, 44]] },
  ],
  thumbs: [],
  holds: [],
};
