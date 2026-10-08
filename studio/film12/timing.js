import { hash } from '../lib/kinetics.js';
// Film 12 — the shared clock. Picture (film.js) and sound (score.mjs) read the SAME constants, so nothing is nudged by ear.
// 120 BPM: beat 0.5 s, bar 2 s. Every time below is in film seconds. No DOM here: Node imports it too.
export const BPM = 120, BEAT = 0.5, BAR = 2, DUR = 25;
export const T = {
  // hook: the dot lands on four questions, one per beat from 0.5
  hop: [0.5, 1.0, 1.5, 2.0], hookExit: 3.4,
  // A — مين حضر؟
  A: 4.0, aCard: 4.2, aType0: 4.4, aType1: 4.9, aRow: 5.0, aClick: 5.25, aWave0: 5.85, aWave1: 6.55, aLine: 6.0, aOut: 7.45,
  // B — مين دفع؟
  B: 8.0, bCard: 8.04, bAmount: 8.35, bSeg: 8.85, bClick: 9.2, bPrint1: 9.25, bRev0: 10.0, bPrint2: 10.1, bNet: 10.95, bLine: 9.95, bOut: 11.5,
  // C — مين عليه فلوس؟
  C: 12.0, cList: 11.9, cCount0: 12.35, cSort: 12.85, cLine: 13.0, cMoon: 14.55, cReveal1: 15.1,
  // D — والدرج فيه كام؟
  D: 15.0, dModal: 15.1, dTile0: 15.55, dTileStep: 0.14, dSum: 16.1, dZero: 16.85, dClick: 17.3, dLine: 17.2, dOut: 18.7,
  // payoff
  PAY: 19.0, HIT: 20.0, shift: 20.85, tag: 21.3, sub: 22.0, cta: 22.55,
  chip: [6.55, 10.15, 13.15, 17.4],
};
export const HOP_NOTES = [76, 79, 81, 84];       // E5 G5 A5 C6 — the question motif (rises, unresolved)

// the wave of chapter A: the student field is 17×7 = 119 dots, 82 of them present; picture draws it and sound plays it from the same list
export const GX = 17, GY = 7, GS = 100, GX0 = 160, GY0 = 240;
export const PRESENT = (() => { const all = []; for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) all.push({ i, j, h: hash(i, j, 3) }); all.find((d) => d.i === 8 && d.j === 3).h = -1; all.sort((a, b) => a.h - b.h); return new Set(all.slice(0, 82).map((d) => d.i + ',' + d.j)); })();
export const dotLit = (i, j) => T.aWave0 + Math.hypot(i - 8, j - 3) * GS / 1500 + 0.11 * hash(i, j, 11);
export const litList = () => [...PRESENT].map((k) => k.split(',').map(Number)).map(([i, j]) => ({ i, j, t: dotLit(i, j), x: GX0 + i * GS })).sort((a, b) => a.t - b.t);
