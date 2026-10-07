// film14 — 20 s, ONE delivery: Facebook/Instagram Reels, YouTube Shorts (commonly published Meta safe band). Authored 1080×1920 @ 30 fps.
export default {
  title: 'Talk football — 2D motion showreel (20 s Reels)',
  film: 'film14/film.js',
  score: 'film14/score.mjs',
  production: 'film14/production.json',
  ownerRequest: { delivery: 'reels20', w: 1080, h: 1920, duration: 20, fps: 30 }, // AUTONOMOUS_FILM.md
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5,
  preview: { delivery: 'reels20', range: [0, 12] },
  deliveries: [{ name: "reels20", duration: 20, safe: [65,269,1015,1248], shareMB: 14, poster: 19.6, holds: [[18.6, 20]] }],
  thumbs: [], holds: [],
  dither: true,
};
