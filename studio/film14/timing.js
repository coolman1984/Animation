// Film 14 shared clock — picture (film.js) and sound (score.mjs). 150 BPM: beat 0.4 s (12 frames), bar 1.6 s, 12.5 bars = 20.0 s.
export const BPM = 150, BEAT = 0.4, BAR = 1.6, DUR = 20;
export const CH = { kick: 0, tactics: 1.6, teams: 4.8, results: 8.0, analysis: 11.2, blast: 14.4, end: 16.0 };
export const EV = {
  whistle: 0, slamA: 0.4, slamB: 0.8, bounces: [0.4, 0.8, 1.2], kickBall: 1.2,
  dots: 1.75, arrows: 2.45, morph: 3.2, passes: [3.6, 3.9, 4.2], wipe: 4.6,
  teams: [4.8, 5.6, 6.4, 7.2],                  // الأهلي · الزمالك · منتخب مصر · the two leagues
  cards: [8.0, 8.2, 8.4], cardsOut: 9.35, table: 9.6, tableOut: 11.0,
  clock: [11.4, 13.9], blast: [14.4, 14.8, 15.2, 15.6],
  end: 16.0, title: 17.25, freeze: 18.27, sweep: [18.0, 19.2], hold: 18.9,
};
