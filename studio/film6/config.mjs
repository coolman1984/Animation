// Film 6 — Pixel Plus — «بكسل واحد» — 30 s, ONE delivery: Facebook Reels 9:16.
// 120 BPM: beat 0.5 s, bar 2 s, 15 bars = 30.0 s. Authored 1080×1920 @ 30 fps.
export default {
  title: 'Pixel Plus — بكسل واحد (30 s Facebook Reels)',
  film: 'film6/film.js',
  score: 'film6/score.mjs',
  production: 'film6/production.json',
  ownerRequest: { delivery: 'reels30', w: 1080, h: 1920, duration: 30, fps: 30 }, // AUTONOMOUS_FILM.md: exactly one requested delivery
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 14,
  dither: true, // dark/blue radial glows: error-diffused RGB→YUV so the chroma does not step into rings (lib/render.mjs encodeFilter)
  preview: { delivery: 'reels30', range: [0, 12] },
  cacheInputs: ['film6/plates'],
  deliveries: [
    // 9:16 safe rectangle: commonly published Meta guidance (top ~14 %, bottom ~35 %, sides ~6 %), not verified in Meta's own preview.
    { name: 'reels30', duration: 30, safe: [65, 269, 1015, 1248], shareMB: 14, poster: 26.0, holds: [[28.2, 30]] },
  ],
  thumbs: [],
  holds: [],
};
