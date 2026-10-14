// Film 23 — «أكاديمية أساسيات الذكاء الاصطناعي» — 30 s showreel-ad. ONE delivery: normal YouTube 16:9 (owner: «مقاس يوتيوب»).
// 120 BPM: beat 0.5 s, bar 2 s, 15 bars = 30 s. Authored 1920×1080 @ 30 fps. Shared clock: film23/timing.js.
export default {
  title: 'AI Essentials Academy — showreel (30 s, 16:9)',
  film: 'film23/film.js',
  score: 'film23/score.mjs',
  production: 'film23/production.json',
  ownerRequest: { delivery: 'youtube30', w: 1920, h: 1080, duration: 30, fps: 30 },
  w: 1920, h: 1080, fps: 30, lufs: -14, tp: -1.5, shareMB: 30,
  dither: true,    // soft gradients and the dark chapter (CRAFT 36)
  subframes: 4,    // 180° shutter motion blur (TECHNIQUES 2026-10-11)
  preview: { delivery: 'youtube30', range: [0, 12] },
  cacheInputs: ['film23/timing.js', 'film23/motion.js', 'assets/fonts/Inter-latin.woff2', 'assets/fonts/PlexArabic-600.woff2'],
  deliveries: [
    { name: 'youtube30', duration: 30, safe: [96, 54, 1824, 1026], shareMB: 30, poster: 28.5, holds: [[12.8, 13.9], [28.2, 30]] },  // 12.8–13.9: settled reading hold on the equation's result (logged in LEDGER)
  ],
  thumbs: [],
  holds: [],
};
