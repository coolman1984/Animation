// Film 7 — shared timing for picture AND sound (one source of truth, imported by film.js in the browser and
// score.mjs in Node). 144 BPM: beat 0.41667 s, bar 1.66667 s, 12 bars = exactly 20.0 s. Everything is a bar/beat.
export const BPM = 144, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 20;
export const at = (bar, beat = 0) => bar * BAR + beat * BEAT;

// Scene starts (bar lines). One black box morphs through all of them; the morph STARTS 0.18 s early (MS) so the
// spring's overshoot peak lands on the bar line. The last scene is the brand card.
export const S = {
  button: at(0), player: at(1), slider: at(2), seg: at(3), stats: at(4), curve: at(5),
  ratio: at(6), search: at(7), kinetic: at(8), again: at(9), brand: at(10),
};
export const MS = t => t - 0.18;

// Every click / tick / hit that picture and sound must agree on.
export const E = {
  click1: at(0, 3),                                   // «ولّد إعلان»
  pause: at(1, 3),                                    // pause on the player
  dragA: at(2, 0.5), dragB: at(2, 1.9),               // slider drag
  toggleMorph: at(2, 2.0), toggle: at(2, 2.8),        // slider shrinks to a switch, switch flips on
  segA: at(3, 1), segB: at(3, 2.5),                   // «موشن» then «فيديو»
  countA: at(4, 1), countB: at(4, 3), tip: at(4, 3.2),
  handleA: at(5, 0.6), handleB: at(5, 1.3), ballA: at(5, 1.8), ballB: at(5, 3.4),
  ratio: [at(6, 0), at(6, 1), at(6, 2), at(6, 3)],   // 9:16, 1:1, 16:9, 4:5
  typeStart: at(7, 0.55), results: at(7, 1.4), pick: at(7, 2.2),
  words: [at(8, 0.5), at(8, 1.25), at(8, 2), at(8, 2.75)],
  click2: at(9, 0.9), spin: at(9, 1.1), check: at(9, 2.2), iris: at(9, 2.9),
  mark: at(10, 0), hero: at(10, 1), tag: at(10, 2), cta: at(10, 3), ctaClick: at(11, 0.6),
};
