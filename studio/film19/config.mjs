// Film 19 — PIXEL Plus agency ad — reference-matched to an owner-supplied SaaS promo (grammar, not assets).
// 20 s, ONE delivery: 9:16 Reels 1080×1920 @ 30 fps. 120 BPM: beat 0.5 s, bar 2 s, 10 bars.
export default {
  title: 'PIXEL Plus — إعلان «عندك فكرة حلوة عايزها تتشاف؟» (20 s Reels)',
  film: 'film19/film.js',
  score: 'film19/score.mjs',
  production: 'film19/production.json',
  ownerRequest: { delivery: 'reels20', w: 1080, h: 1920, duration: 20, fps: 30 }, // AUTONOMOUS_FILM.md
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  gpu: true, // the mascot and objects are WebGL (SwiftShader) ray-marched renders
  preview: { delivery: 'reels20', range: [0, 10] },
  deliveries: [
    // 9:16 safe rectangle used by earlier Reels films (commonly published Meta guidance, not verified in Meta's preview).
    { name: 'reels20', duration: 20, safe: [65, 269, 1015, 1248], shareMB: 12, poster: 18.8, holds: [[18.3, 20]], darkSpans: [[12.95, 13.4]] },
  ],
  thumbs: [],
  holds: [],
};
