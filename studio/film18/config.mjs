// Film 18 — MIZAN (ميزان) — «بيع بسهولة.. وحاسب بثقة» — 25 s, ONE delivery: Facebook / Instagram Reels 9:16 (no placement named → studio default).
// 120 BPM: beat 0.5 s, bar 2 s, 12 bars + 1 s ring-out = 25.0 s. Authored 1080×1920 @ 30 fps. Shared clock: film18/timing.js.
export default {
  title: 'MIZAN — بيع بسهولة وحاسب بثقة (25 s Reels)',
  film: 'film18/film.js',
  score: 'film18/score.mjs',
  production: 'film18/production.json',
  ownerRequest: { delivery: 'reels25', w: 1080, h: 1920, duration: 25, fps: 30 }, // AUTONOMOUS_FILM.md: exactly one requested delivery
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 16,
  dither: true, // navy radial glows: error-diffused RGB→YUV so the chroma does not step into rings (CRAFT 36)
  preview: { delivery: 'reels25', range: [0, 12] },
  cacheInputs: ['film18/timing.js'],
  deliveries: [
    // 9:16 safe rectangle: commonly published Meta guidance (top ~14 %, bottom ~35 %, sides ~6 %), not verified in Meta's own preview.
    { name: 'reels25', duration: 25, safe: [65, 269, 1015, 1248], shareMB: 16, poster: 23.6, holds: [[23.6, 25]] },
  ],
  thumbs: [],
  holds: [],
};
