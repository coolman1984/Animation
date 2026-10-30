// PHYSICS STUDY — the same drop, twice: hand-tuned easing on the left, a Rapier bake on the right.
// Picture only (no score). Short preview, the studio's draft path:
//   node make.mjs examples/physics-study --profile=draft --workers=1
// which renders preview.range (1 s, 15 fps) with config.gpu. One range is enough to see the fall.
export default {
  title: 'Easing vs physics (4 s)',
  film: 'examples/physics-study/film.js',
  score: 'examples/physics-study/score.mjs',
  w: 1080, h: 1350, fps: 30,
  gpu: true,
  preview: { delivery: 'feed4', range: [0, 1] },
  deliveries: [{ name: 'feed4', duration: 4, safe: [48, 48, 1032, 1302] }],
};
