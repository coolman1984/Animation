// Film 5 — BALACONBAR Beni Suef — "طعم زمان.. بمذاق النهارده" — 25 s, ONE delivery: 9:16 Reels (also valid for Facebook Reels).
// 120 BPM: beat 0.5 s, bar 2 s, 12 bars + a 1 s tail = 25.0 s. Authored 1080×1920 @ 30 fps.
export default {
  title: 'BALACONBAR Beni Suef — طعم زمان.. بمذاق النهارده (25 s Reels)',
  film: 'film5/film.js',
  score: 'film5/score.mjs',
  production: 'film5/production.json',
  ownerRequest: { delivery: 'reels25', w: 1080, h: 1920, duration: 25, fps: 30 }, // AUTONOMOUS_FILM.md: exactly one requested delivery
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  preview: { delivery: 'reels25', range: [0, 12] },
  cacheInputs: ['film5/plates'],
  deliveries: [
    // 9:16 safe rectangle: commonly published Meta guidance (top ~14 %, bottom ~35 %, sides ~6 %), not verified in Meta's own preview.
    { name: 'reels25', duration: 25, safe: [65, 269, 1015, 1248], shareMB: 12, poster: 21.4, holds: [[22.9, 25]] },
  ],
  thumbs: [],
  holds: [],
};
