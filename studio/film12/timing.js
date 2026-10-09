// Film 12 shared clock — picture (film.js) and sound (score.mjs) import the same numbers.
// 120 BPM: beat 0.5 s, bar 2 s, 10 bars = 20.0 s.
export const BPM = 120, BEAT = 0.5, BAR = 2, DUR = 20;
export const CH = {
  plan: 0,        // 0–4   blueprint: the pen draws the walls, rooms get their real areas
  rise: 4,        // 4–6   DROP: the cut plane lifts the walls into 3D, then slices them at 1.10 m
  furnish: 6,     // 6–10  furniture lands room by room (bedrooms, living, kitchen, bath)
  options: 10,    // 10–12 the plane sweeps two alternative finishes across the flat (3 options)
  scale: 12,      // 12–16 DROP 2: the flat dissolves, a floor of tiles flips open: offices, warehouse, line, containers
  app: 16,        // 16–18 the real app window
  logo: 18,       // 18–20 light end card: logo whole + CTA, hold
};
// Furniture landing windows per home category (each starts on a bar beat).
export const HOME = { bedroom: 6.0, living: 7.0, kitchen: 8.0, bath: 9.0 };
export const WORK = { offices: 12.75, storage: 13.5, line: 14.25, containers: 15.0 };
export const SWEEP = [[10.0, 10.6], [11.0, 11.6]];
export const EV = {
  penStart: 0.15, penEnd: 1.7, interior: 2.0, rise: 4.0, riseTop: 4.7, cut: 5.1, cutEnd: 5.8,
  sink: 12.0, tiles: 12.1, appIn: 16.0, wipe: 17.85, logo: 18.0, cta: 18.35, hold: 18.9,
};
