// Film 7 — Pixel Plus company presentation — 180 s, ONE delivery: normal YouTube video, Full HD 1920×1080 @ 30 fps.
// 80 BPM: beat 0.75 s, bar 3 s, 60 bars. Music only, mastered low and smooth (−18 LUFS). See BRIEF.md.
export default {
  title: 'Pixel Plus — من فكرة صغيرة… لأنظمة بتشتغل كل يوم (3:00 YouTube)',
  film: 'film7/film.js',
  score: 'film7/score.mjs',
  production: 'film7/production.json',
  ownerRequest: { delivery: 'youtube180', w: 1920, h: 1080, duration: 180, fps: 30 }, // AUTONOMOUS_FILM.md
  w: 1920, h: 1080, fps: 30, lufs: -18, tp: -1.5,
  gpu: true,    // one real-3D chapter (Three.js, software WebGL for determinism)
  dither: true, // soft blue/white gradients: error-diffused RGB→YUV, no banding
  cacheInputs: ['film7/plates'],
  preview: { delivery: 'youtube180', range: [0, 12] },
  // YouTube re-encodes uploads: deliver the high-quality master (no size-capped share copy).
  deliveries: [{ name: 'youtube180', duration: 180, safe: [96, 54, 1824, 1026], poster: 176.5, holds: [[177.8, 180]] }],
  thumbs: [], holds: [],
};
