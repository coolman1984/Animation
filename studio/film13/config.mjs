// Film 13 — «اتكلم كورة» football-show motion showreel. 20 s, ONE delivery: Reels 1080×1920 @ 30 fps. 120 BPM, shared clock film13/timing.js.
export default {
  title: 'Talk football — 3D/2D motion showreel (20 s Reels)',
  film: 'film13/film.js',
  score: 'film13/score.mjs',
  production: 'film13/production.json',
  ownerRequest: { delivery: 'reels20', w: 1080, h: 1920, duration: 20, fps: 30 }, // AUTONOMOUS_FILM.md
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5,
  gpu: true,
  dither: true,
  preview: { delivery: 'reels20', range: [0, 12] },
  cacheInputs: ['film13/timing.js', 'film13/plates/host'],
  deliveries: [{ name: 'reels20', duration: 20, safe: [65, 269, 1015, 1248], shareMB: 14, poster: 19.5, holds: [[18.9, 20]], darkSpans: [[0, 0.4]] }],
  thumbs: [], holds: [],
};
