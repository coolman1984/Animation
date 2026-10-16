// Film 24 — 3D fly-over of the AI Essentials Academy landing page. 14.5 s, 1440×1152 @ 60 fps (owner brief), one delivery.
// WebGL2 on SwiftShader (no GPU in this container): motion blur is accumulated inside the engine (16 subframes over 0.7 frame),
// so the renderer captures one image per frame (config.subframes stays 1). Shared clock: film24/timing.js.
export default {
  title: 'AI Essentials Academy — landing page fly-over (14.5 s)',
  film: 'film24/film.js',
  score: 'film24/score.mjs',
  production: 'film24/production.json',
  ownerRequest: { delivery: 'flyover', w: 1440, h: 1152, duration: 14.5, fps: 60 },
  w: 1440, h: 1152, fps: 60, lufs: -14, tp: -1.5, shareMB: 40,
  gpu: true,
  dither: true,
  preview: { delivery: 'flyover', range: [0, 14.5] },
  cacheInputs: ['film24/timing.js', 'film24/capture/layout.json', 'assets/fonts/Geist-500-latin.woff2'],
  deliveries: [
    // the end card holds still on purpose (10.6–14.5: creeping 2 %, tiles drifting a few px) and the overhead strip holds 9.25–9.47
    { name: 'flyover', duration: 14.5, safe: [24, 20, 1416, 1132], shareMB: 40, poster: 12.5, holds: [[10.6, 14.5]] },
  ],
  thumbs: [],
  holds: [],
};
