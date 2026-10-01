// Film 2 deliverables. Times are film seconds (90 BPM, bar = 8/3 s); cut-downs are whole-bar
// segments so the music stays on its grid.
const BAR = 8 / 3;
const f = (x) => x.toFixed(4);
export default {
  title: 'BALACONBAR — خُد لحظتك',
  film: 'film2/film.js',
  score: 'film2/score.mjs',
  w: 1080, h: 1350, fps: 30, lufs: -14, tp: -1.5, shareMB: 27,
  deliveries: [
    { name: 'hero60', duration: 60 },
    { name: 'cut15', duration: 15, segments: `0-${f(2 * BAR)},${f(5 * BAR)}-${f(6.25 * BAR)},${f(19 * BAR)}-57`, fadeOut: 0.6 },
    { name: 'bumper6', duration: 6, segments: `0-${f(BAR)},${f(19 * BAR)}-54`, fadeOut: 0.4 },
  ],
  thumbs: [1.6, 15.8, 53.0],
  poster: 55.5,
  // Deliberate holds where the picture may legitimately sit still (none expected: every shot moves).
  holds: [],
  en: {
    'مش أي ماتشا…': 'Not just any matcha…',
    'جوّاها إيه؟': "What's inside?",
    'ماتشا': 'Matcha',
    'لبن جوز الهند': 'Coconut milk',
    'بوبا': 'Boba',
    'جوز الهند × الماتشا': 'Coconut × Matcha',
    'ثنائي… على مزاجك': 'A duo… just your mood',
    'خُد لحظتك…': 'Take your moment…',
    'والدنيا تستنى.': 'the world can wait.',
    'كل رشفة…': 'Every sip…',
    'فيها حكاية.': 'tells a story.',
    'قعدتك الحلوة…': 'Your favourite seat…',
    'مستنياك.': 'is waiting for you.',
    'ماتشا جوز الهند بالبوبا': 'Coconut matcha with boba',
    'جرّبها النهارده': 'Try it today',
  },
};
