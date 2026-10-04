// Film 11 — shared clock for picture (film.js, browser) and sound (score.mjs, Node). v2 (owner 2026-10-04: slower, readable, ≥ +10 s):
// 120 BPM: beat 0.5 s = 15 frames at 30 fps, bar 2 s, 22 bars = 44.000 s. Every chapter starts on a bar line.
export const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 44;
const b = (n) => n * BEAT;                      // beats → seconds
export const CH = { storm: 0, brain: b(8), title: b(16), hosts: b(24), flip: b(32), ring: b(64), mega: b(72), end: b(80), out: DUR };
export const EV = {
  words1: [b(0), b(2), b(4)],                  // «الـ HR» · «بيتغير» · «بسرعة…»
  flash: CH.brain,                              // the storm bursts into the AI world
  ai: CH.brain, mashi: b(10), tool: b(11), slash: b(12), tail: b(13), implode: b(15.4),
  title: CH.title, xspin: CH.title + b(1), sub: CH.title + b(2), pill: CH.title + b(4.5),
  hosts: CH.hosts, line: CH.hosts, host1: CH.hosts + b(0.5), host2: CH.hosts + b(1.5), roles: CH.hosts + b(2.5),
  flip0: CH.flip + b(1), flipStep: b(5), flipN: 6, // six areas, 2.5 s each, from one beat into the chapter
  ringIn: CH.ring, ringPush: CH.ring + b(5), headline: CH.ring + b(0.5), caption: CH.ring + b(3),
  bigger: CH.mega, than: CH.mega + b(1.5), wipe1: CH.mega + b(3), wipe2: CH.mega + b(4.5), wipe3: CH.mega + b(6),
  smash: CH.end, soon: CH.end + b(1.5), cta: CH.end + b(2.5), names: CH.end + b(3.5), hold: CH.end + b(6),
};
