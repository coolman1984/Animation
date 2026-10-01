// Film 3 — 25 s, two compositions (4:5 feed, 9:16 Reels/Stories). Music 96 BPM, bar 2.5 s, 10 bars.
export default {
  title: 'BALACONBAR — خُد لحظتك (25 s)',
  film: 'film3/film.js',
  score: 'film3/score.mjs',
  w: 1080, h: 1350, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  preview: { delivery: 'feed25', range: [0, 12] },
  // Shared cut-outs/logo are copied into film3/plates by film3/plates.mjs from film2/plates.
  cacheInputs: ['film2/plates', 'film3/plates'],
  deliveries: [
    // Feed 4:5: keep text/logo/CTA ≥ 60 px from every edge.
    { name: 'feed25', duration: 25, safe: [60, 60, 1020, 1290], shareMB: 12, poster: 17.6, holds: [[21.7, 25]] },
    // 9:16: commonly published Meta guidance (top ~14 %, bottom ~35 %, sides ~6 %) — not verified in Meta's own
    // placement preview from this environment.
    { name: 'reels25', duration: 25, w: 1080, h: 1920, safe: [65, 269, 1015, 1248], shareMB: 12, poster: 17.6, holds: [[21.7, 25]] },
  ],
  thumbs: [],
  holds: [],
};
