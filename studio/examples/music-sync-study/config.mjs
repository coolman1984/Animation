// MUSIC-SYNC STUDY — a complete small film through make: node make.mjs examples/music-sync-study --profile=review
export default {
  title: 'Music-sync study (16 s)',
  film: 'examples/music-sync-study/film.js',
  score: 'examples/music-sync-study/score.mjs',
  production: 'examples/music-sync-study/production.json',
  w: 1080, h: 1350, fps: 30, lufs: -14, tp: -1.5, shareMB: 12,
  cacheInputs: ['test/fixture/music-track.mjs'],
  deliveries: [{ name: 'feed16', duration: 16, safe: [60, 60, 1020, 1290], holds: [[0, 1.2]] }],
  thumbs: [], holds: [[0, 1.2]],
};
