// Film 23 — «أكاديمية أساسيات الذكاء الاصطناعي» — 30 s, YouTube 16:9. ONE clock for picture and sound.
// 120 BPM: beat 0.5 s, bar 2 s, 15 bars = 30 s. Every moment is authored in beats and converted from time (tb).
export const FPS = 30, BPM = 120, DUR = 30;
export const tb = (b) => (b * 60) / BPM;
export const BEAT = tb(1), BAR = tb(4);
export const T = {
  // BARS 1–2 (0–4) HOOK: a grey book page, two lines that name the problem; the cursor arrives and clicks on the downbeat of bar 3.
  page: tb(0), l1: tb(1), l2: tb(3), cur0: tb(5), hookOut: tb(7.2),
  // BARS 3–4 (4–8) the page wakes and becomes the academy window; units pop on the beat; four counters.
  wake: tb(8), l3: tb(9), units: [tb(9), tb(9.5), tb(10), tb(10.5), tb(11), tb(11.5)], stats: [tb(11), tb(11.5), tb(12), tb(12.5)], acOut: tb(15.6),
  // BAR 5 (8–10) four levels: the selector steps once per beat.
  lv: tb(16), lvSteps: [tb(17), tb(18), tb(19), tb(19.5)], lvOut: tb(19.6),
  // BARS 6–7 (10–14) the governing equation assembles (book p. 7); meter climbs per part.
  sc: tb(20), parts: [tb(20.5), tb(21.5), tb(22.5), tb(23.5)], result: tb(24.5), scOut: tb(27.6),
  // BAR 8 (14–16) the Excel lab: a real calculation; the cursor ticks the missing-data rule and the errors clear.
  lab: tb(28), labClick: tb(29.5), labOut: tb(31.6),
  // BARS 9–10 (16–20) dark mode: the prompt library; search, open a card, fill its brackets, copy.
  dark: tb(32), pal: tb(32.5), type0: tb(33), pick: tb(35), fill: [tb(36), tb(36.5), tb(37)], copy: tb(38), prOut: tb(39.6),
  // BAR 11 (20–22) the quiz: pick the right answer, get the reason.
  qz: tb(40), qzPick: tb(41.75), qzOut: tb(43.6),
  // BAR 12 (22–24) back to light: the window breaks into the 41 pages; every page lights; then they fly into the logo.
  light: tb(44), tiles: tb(44.25), cascade: [tb(44.75), tb(46.25)], implode: tb(47.1),
  // BARS 13–15 (24–30) PAYOFF on the drop: logo tile, name, the site's own line, one action, a breathing hold.
  drop: tb(48), name: tb(49), tag: tb(50.5), cta: tb(52), ctaClick: tb(54), end: DUR,
};
// camera hits: [time, strength]
export const HITS = [[T.page + 0.05, 0.5], [T.l1, 0.5], [T.l2, 0.6], [T.wake, 1.1], [T.lv, 0.5], [T.sc, 0.5], [T.result, 0.7], [T.labClick + 0.05, 0.6],
  [T.dark, 0.8], [T.copy, 0.5], [T.qzPick + 0.05, 0.6], [T.light, 0.7], [T.drop, 1.3], [T.ctaClick + 0.05, 0.6]];
// Chapter lines (Egyptian Arabic for the ad voice; the payoff uses the academy's own formal line).
export const LINES = [
  { id: 'l1', text: 'كتاب ٤١ صفحة..', a: T.l1, b: T.hookOut, size: 104 },
  { id: 'l2', text: 'بتقراه.. وبتنسى؟', a: T.l2, b: T.hookOut, size: 104, accent: { 1: 'blue' } },
  { id: 'l3', text: 'بقى أكاديمية حيّة.', a: T.l3, b: T.acOut, size: 104, accent: { 1: 'blue' } },
  { id: 'l4', text: 'نفس الفكرة..', a: T.lv, b: T.lvOut, size: 96 },
  { id: 'l4b', text: 'بأربع مستويات', a: T.lv + 0.25, b: T.lvOut, size: 96, accent: { 1: 'blue' } },
  { id: 'l5', text: 'شوف الفكرة', a: T.sc, b: T.scOut, size: 96 },
  { id: 'l5b', text: 'وهي بتتكوّن', a: T.sc + 0.25, b: T.scOut, size: 96, accent: { 1: 'blue' } },
  { id: 'l6', text: 'جرّب بإيدك', a: T.lab, b: T.labOut, size: 104, accent: { 1: 'blue' } },
  { id: 'l7', text: 'برومبتات جاهزة', a: T.pal, b: T.prOut, size: 96 },
  { id: 'l7b', text: 'للنسخ في ثانية', a: T.pal + 0.25, b: T.prOut, size: 96, accent: { 2: 'blue' } },
  { id: 'l8', text: 'اختبر نفسك..', a: T.qz, b: T.qzOut, size: 96 },
  { id: 'l8b', text: 'وافهم ليه', a: T.qz + 0.25, b: T.qzOut, size: 96, accent: { 1: 'blue' } },
  { id: 'l9', text: 'كل صفحة..', a: T.light - 0.05, b: T.implode - 0.25, size: 96 },
  { id: 'l9b', text: 'ليها درس', a: T.light + 0.2, b: T.implode - 0.25, size: 96, accent: { 1: 'blue' } },
];
