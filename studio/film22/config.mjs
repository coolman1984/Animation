// Film 22 — «Claude Code» — 10 s, ONE delivery: Facebook / Instagram Reels 9:16 (no placement named → studio default).
// 120 BPM: beat 0.5 s, bar 2 s, 5 bars = 10.0 s. Authored 1080×1920 @ 30 fps. Shared clock: film22/timing.js.
export default {
  title: 'Claude Code (10 s Reels)',
  film: 'film22/film.js',
  score: 'film22/score.mjs',
  production: 'film22/production.json',
  ownerRequest: { delivery: 'reels10', w: 1080, h: 1920, duration: 10, fps: 30 }, // AUTONOMOUS_FILM.md: exactly one requested delivery
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  dither: true,    // flat dark fields: error-diffused RGB→YUV (CRAFT 36)
  subframes: 4,    // 180° shutter motion blur: 4 captures per frame averaged in linear-ish light (TECHNIQUES 2026-10-11)
  preview: { delivery: 'reels10', range: [0, 10] },
  cacheInputs: ['film22/timing.js', 'film22/motion.js'],
  deliveries: [
    // 9:16 safe rectangle: commonly published Meta guidance (top ~14 %, bottom ~35 %, sides ~6 %), not verified in Meta's own preview.
    { name: 'reels10', duration: 10, safe: [65, 269, 1015, 1248], shareMB: 12, poster: 9.2, holds: [[8.9, 10]] },
  ],
  thumbs: [],
  holds: [],
};
