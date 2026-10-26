// A film's own drawings: one function per shot name, drawn with the story kit (studio-engine/lib/storykit.js).
export default {
  lighthouse: (k) => {
    k.sky({ stops: ['#1b2a52', '#3b4a78', '#c97b6a'] });
    k.stars({ n: 60, y1: 0.4 });
    k.water({ y0: 0.66, color: '#22385e', glint: '#f4d58a' });
    k.shape({ pts: [[0.55, 0.7], [0.95, 0.7], [1.1, 0.8], [0.45, 0.8]], color: '#1c1f2b' });            // the rock
    const g = k.g, x = k.X(0.72), base = k.Y(0.7), top = k.Y(0.36), w = 0.06 * k.W;
    k.shape({ pts: [[0.72 - 0.035, 0.7], [0.72 + 0.035, 0.7], [0.72 + 0.022, 0.36], [0.72 - 0.022, 0.36]], color: '#e9e2d0' });
    g.fillStyle = '#b8473f'; for (let i = 0; i < 3; i++) g.fillRect(x - w * 0.42, base - (i * 2 + 1) * (base - top) / 7, w * 0.84, (base - top) / 14);
    const beam = Math.sin(k.t * 0.9) * 0.6;                                                           // the light turns
    k.rays({ x: 0.72, y: 0.33, n: 2, spread: 0.12, a: 0.22, color: '#ffe6a8', angle: Math.PI + beam });
    k.glow({ x: 0.72, y: 0.33, r: 0.08, a: 0.8 });
    k.person({ x: 0.3, y: 0.86, h: 0.2, pose: 'pray', facing: 'back', silhouette: '#121212', hair: 'hood', robe: true });
  },
  friends: (k) => {
    k.sky({ stops: ['#f4ecd0', '#e8dcb2'] }); k.clouds({ n: 6 });
    k.ridge({ y: 0.62, amp: 0.05, freq: 2, color: '#8fae86' });
    k.ground({ y: 0.62, color: '#5fa03a', stripes: 12, flowers: 80 });
    k.person({ x: 0.36, y: 0.86, h: 0.3, pose: 'walk', facing: 'back', robe: true, top: '#f1ece2', hair: 'long', hairColor: '#4a3020' });
    k.person({ x: 0.62, y: 0.86, h: 0.31, pose: 'wave', facing: 'back', top: '#1f2c6e', hair: 'short' });
  },
};
