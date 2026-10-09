// Film 20 — PIXEL Plus «ريل الموشن»: a 20 s motion-design showreel in one morphing gesture — 9:16 Reels, 144 BPM.
export default {
  title: 'PIXEL Plus — ريل الموشن (20 s Reels)',
  film: 'film20/film.js',
  score: 'film20/score.mjs',
  production: 'film20/production.json',
  ownerRequest: { delivery: 'reel20', w: 1080, h: 1920, duration: 20, fps: 30 },
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  gpu: true, // the brand card's character is a WebGL (SwiftShader) ray-marched render
  preview: { delivery: 'reel20', range: [0, 10] },
  cacheInputs: ['film19/mascot.js'],
  deliveries: [
    { name: 'reel20', duration: 20, safe: [65, 269, 1015, 1248], shareMB: 12, poster: 18.9, holds: [[18.6, 20]], darkSpans: [[13.3, 13.62], [14.44, 14.62]] },
  ],
  thumbs: [],
  holds: [],
};
