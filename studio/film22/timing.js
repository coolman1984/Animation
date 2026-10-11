// Film 22 — «Claude Code» 10 s Reels. ONE clock for picture and sound. 120 BPM: beat 0.5 s, bar 2 s, 5 bars = 10 s.
// Every moment is authored in BEATS and converted from time (tb), never by adding a rounded frames-per-beat (TECHNIQUES 2026-10-11).
export const FPS = 30, BPM = 120, DUR = 10;
export const tb = (b) => (b * 60) / BPM;                 // beats → seconds
export const fr = (b) => Math.round(tb(b) * FPS);        // beats → nearest frame
export const BEAT = tb(1), BAR = tb(4);
export const T = {
  // BAR 1 (0–2) HOOK: the problem. A red failing test, the orange cursor, two slammed lines.
  h1: tb(1), h2: tb(2), hookOut: tb(4) - 0.02,
  // BAR 2 (2–4) the cursor hops into a terminal window and types the request.
  hop: tb(4), type0: tb(5.1), typeEnd: tb(7.75), enter: tb(8),
  // BAR 3 (4–6) Claude Code works: three steps (the cursor is the bullet), then the diff card; the fix is wiped in on the downbeat.
  steps: [tb(8), tb(8.5), tb(9)], diffIn: tb(9.5), strike: tb(11), fix: tb(11.25),
  // BAR 4 (6–8) the tests: the cursor visits three chips, each turns green on arrival; then the cursor becomes the cream circle wipe.
  chips: [tb(12), tb(12.5), tb(13)], passed: tb(13.25), wipe: [tb(14.5), tb(16)],
  // BAR 5 (8–10) PAYOFF on the drop: tile, name, three verbs, one action.
  tile: tb(16), name: tb(16.5), tag: tb(17.25), cta: tb(17.75), end: DUR,
};
// camera hits (seconds): [time, strength]
export const HITS = [[T.h1, 0.6], [T.h2, 0.8], [tb(3), 0.5], [T.hop + 0.22, 0.9], [T.enter, 0.8], [T.diffIn + 0.1, 0.5], [T.fix, 0.7],
  [T.chips[0] + 0.14, 0.5], [T.chips[1] + 0.14, 0.5], [T.chips[2] + 0.14, 0.9], [T.tile, 1.2]];
