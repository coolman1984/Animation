// LIVE 1 — live-action study (real footage + animation around a real person). 12 s, 9:16, 30 fps. Internal capability proof, not a client ad.
export default {
  title: 'Live 1 — real footage + motion study (12 s, 9:16)',
  film: 'live1/film.js',
  score: 'live1/score.mjs',
  production: 'live1/production.json',
  ownerRequest: { delivery: 'reels12', w: 1080, h: 1920, duration: 12, fps: 30 },
  w: 1080, h: 1920, fps: 30, lufs: -14, tp: -1.5, shareMB: 8,
  dither: true,
  preview: { delivery: 'reels12', range: [0, 12] },
  cacheInputs: ['live1/plates', 'live1/source'],
  deliveries: [
    { name: 'reels12', duration: 12, safe: [65, 269, 1015, 1248], shareMB: 8, poster: 4.2, holds: [[9.8, 12]] },
  ],
  thumbs: [],
  holds: [],
};
