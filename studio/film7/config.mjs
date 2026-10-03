// Film 7 — SANAD (سند) — «معاك سند» — 15 s, ONE delivery: Facebook / Instagram Reels 9:16.
// 96 BPM: beat 0.625 s, bar 2.5 s, 6 bars = 15.0 s (owner cut the 10 s logo build). Authored 1080×1920 @ 30 fps.
export default {
  title: 'SANAD — معاك سند (15 s Reels)',
  film: 'film7/film.js',
  score: 'film7/score.mjs',
  production: 'film7/production.json',
  ownerRequest: { delivery: 'reels15', w: 1080, h: 1920, duration: 15, fps: 30 }, // AUTONOMOUS_FILM.md: exactly one requested delivery
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  dither: true, // navy / ivory radial gradients: error-diffused RGB→YUV so the chroma does not step into rings (lib/render.mjs encodeFilter)
  preview: { delivery: 'reels15', range: [0, 12] },
  cacheInputs: ['film7/plates'],
  deliveries: [
    // 9:16 safe rectangle: commonly published Meta guidance (top ~14 %, bottom ~35 %, sides ~6 %), not verified in Meta's own preview.
    { name: 'reels15', duration: 15, safe: [65, 269, 1015, 1248], shareMB: 10, poster: 14.0, holds: [[14.0, 15]] },
  ],
  thumbs: [],
  holds: [],
};
