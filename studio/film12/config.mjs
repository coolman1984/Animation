// Film 12 — «مخطط المساحات» motion showreel for a 3D space-planning app. 20 s, ONE delivery: Reels 1080×1920 @ 30 fps.
// 120 BPM: beat 15 frames, bar 2 s, 10 bars = 20.0 s. Picture and sound share film12/timing.js. Real Three.js → gpu: true.
export default {
  title: 'Space planner — motion showreel (20 s Reels)',
  film: 'film12/film.js',
  score: 'film12/score.mjs',
  production: 'film12/production.json',
  ownerRequest: { delivery: 'reels20', w: 1080, h: 1920, duration: 20, fps: 30 }, // AUTONOMOUS_FILM.md
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5,
  gpu: true,
  dither: true,
  preview: { delivery: 'reels20', range: [0, 12] },
  cacheInputs: ['film12/timing.js', 'film12/plates/logo.png', 'film12/plates/app-3d.jpg'],
  deliveries: [{ name: 'reels20', duration: 20, safe: [65, 269, 1015, 1248], shareMB: 14, poster: 19.5, holds: [[18.95, 20]] }],
  thumbs: [], holds: [],
};
