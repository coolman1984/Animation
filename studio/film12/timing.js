// Film 12 — MIZAN (ميزان) 25 s Reels ad — ONE clock for picture and sound (CRAFT 49: nothing is nudged by ear).
// 120 BPM: beat 0.5 s, bar 2 s, 12 bars + a 1 s ring-out = 25.0 s. Every story event sits on a beat or an eighth.
export const BPM = 120, BEAT = 0.5, BAR = 2, DUR = 25;
export const T = {
  // 0–4 HOOK (dark): four everyday loads land on the beam one per beat and tip it; the question.
  ctxIn: 0.12, ctxOut: 1.85,
  chips: [0.5, 1.0, 1.5, 2.0],
  headIn: 2.0, headOut: 3.72,
  fling: 3.8, arrive: 3.84, lift: 3.8, slam: 4.0,
  // 4–6 NAME: cream world wipes out of the fulcrum, then gathers into the logo tile; the name lands.
  wipe: [4.0, 4.22], zoom: 4.22, word: 4.5, sub: 4.85, nameOut: 5.86,
  // 6–10 SELL (ivory): dive into the tile; the copper bar is the scanner; three scans on the beat; payment.
  dive: 6.0, sellHeadA: 6.2, sellHeadAOut: 7.72,
  scans: [6.5, 7.0, 7.5], receipt: 6.3, toTotal: 7.8,
  payIn: 8.05, chipsIn: 8.15, tapCash: 8.75, change: 9.0, toButton: 9.3, tapDone: 9.55, blind: 9.9,
  // 10–14 STOCK (night): the button becomes the shelf; boxes land on eighths; transfer; serial; count.
  stock: 10.0, boxes: [10.25, 10.5, 10.75, 11.0, 11.25], transfer: 12.0, serial: 12.75, count: 13.25,
  // 14–16 INSTALMENTS (copper): circle wipe out of the warranty shield; four paid cells on the beat.
  copper: [13.85, 14.15], cells: [14.5, 14.75, 15.0, 15.25], due: 15.5,
  // 16–20 NUMBERS (night): navy rises like a level; the cells stand up as bars; KPI; trend line; the owner's eye.
  rise: [15.85, 16.2], bars: 16.0, kpi: 16.4, line: [17.0, 17.9], insight: 18.4, numOut: 19.72,
  // 20–25 PAYOFF (ivory): the night gathers into the navy tile — the whole logo; name, tagline, CTA.
  gather: 19.85, logo: 20.1, word2: 20.4, latin: 20.75, tag: 21.0, cta: 22.3, shine: 23.2, end: 25,
};
