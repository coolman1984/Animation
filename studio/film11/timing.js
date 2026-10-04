// Film 11 — shared clock for picture (film.js, browser) and sound (score.mjs, Node). 144 BPM: beat 25 frames at 60 fps, bar 100 frames,
// 15 bars = 25.000 s. Every chapter starts on a downbeat; every on-screen event below is a beat or half-beat.
export const BPM = 144, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 25;
const b = (n) => n * BEAT;                      // beats → seconds
export const CH = { storm: 0, brain: b(8), title: b(16), flip: b(24), ring: b(36), mega: b(44), end: b(52), out: DUR };
export const EV = {
  words1: [b(0), b(2), b(4)],                  // «الـ HR» · «بيتغير» · «بسرعة…»
  flash: CH.brain,                              // the storm bursts into the AI world
  ai: CH.brain, mashi: b(10), tool: b(11), slash: b(12), tail: b(13), implode: b(15.4),
  title: CH.title, xspin: CH.title + b(1), sub: CH.title + b(2), hosts: CH.title + b(5), pill: CH.title + b(6.5),
  flipStep: b(2), flipN: 6,                    // a new area every 2 beats from CH.flip
  ringIn: CH.ring, ringPush: b(41), headline: CH.ring + b(0.5), caption: CH.ring + b(4),
  bigger: CH.mega, than: b(46), wipe1: b(48), wipe2: b(50), wipe3: b(51),
  smash: CH.end, soon: CH.end + b(2), cta: CH.end + b(5), hold: b(58),
};
