// Film 13 shared clock — picture (film.js) and sound (score.mjs). 120 BPM: beat 0.5 s, bar 2 s, 10 bars = 20.0 s.
export const BPM = 120, BEAT = 0.5, BAR = 2, DUR = 20;
// Chapters follow the owner's reference order: lights → tactics around the pitch → players/ball → giant screen → title.
export const EV = {
  lights: [0.0, 0.25, 0.5, 0.75, 1.0, 1.25], // six floodlight banks switch on, on eighth notes
  title: 0.5, line: 1.9, lineEnd: 2.4, // the show name slams, the chalk line sweeps it away into the board
  board: 2.3, arrows: 2.9, lift: 4.0, // 2D chalk tactics drawn top-down, then lifted into 3D on the drop
  passes: [6.0, 6.5, 7.0, 7.5], dribble: 7.5, shot: 8.25, goal: 9.0,
  replay: 10.0, freeze: 10.3, clock: [10.4, 13.4], unfreeze: 13.9,
  screen: 14.0, host: 14.4, hostEnd: 17.4, final: 17.5, hold: 18.9,
};
