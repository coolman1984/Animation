// Film 7 shared clock: picture (film.js, browser) and sound (score.mjs, node) read the SAME moments, so every click, slam and
// chapter change lands on its sound. 80 BPM: beat 0.75 s, bar 3 s. Pure data, no DOM.
export const BPM = 80, BEAT = 0.75, BAR = 3, DUR = 180;
export const CH = {
  open: [0, 12.4], problem: [11.6, 40.4], reframe: [35.5, 48.4], brand: [47.8, 60.4], samsung: [59.0, 84.4],
  projects: [83.6, 144.6], results: [143.6, 162.4], method: [161.8, 171.4], finale: [170.8, 180],
};
// HUD chapter labels (Arabic-Indic numerals only, no mixed digits).
export const CHAPTERS = [[12, '١', 'التحدي اليومي'], [36, '٢', 'الفكرة'], [48, '٣', 'مين إحنا'], [60, '٤', 'أين طبّقنا'], [84, '٥', 'المشاريع'], [144, '٦', 'النتيجة'], [162, '٧', 'طريقة الشغل']];
export const T = {
  land: 1.2,                                   // the pixel lands
  cards: [12.6, 14.2, 16.0, 19.3, 22.6, 26.2, 29.6], // problem windows arrive
  problemLines: [15.5, 19.0, 22.5, 26.0, 29.5],
  snap: 40.0,                                  // chaos snaps into the system ring
  implode1: 46.2, burst1: 48.0,                // ring → pixel → logo
  wipe: [58.9, 60.1],                          // circle wipe from the plus into the 3D studio
  tvLabel: 66.5, phoneLabel: 68.5, ribbon: 75.0, dive: [80.8, 83.8],
  projects: [84, 99, 114, 129],                // project starts (container morph + panel swap)
  p1Type: 85.6, p1Execute: 87.0, p1Export: 92.0,
  p2Sync: 103.0, p3Filter: 121.0,
  p4Type: 130.2, p4Send: 132.4, p4Train: 136.6,
  implode2: 143.2,
  results: [144.6, 147.6, 150.6, 153.6], resultsGrid: 156.6,
  methodNodes: [163.6, 165.0, 166.4, 167.8, 169.2],
  burst2: 174.0, cta: 176.7, ctaClick: 177.3,
};
