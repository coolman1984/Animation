# LEDGER — Live 1 (12 s, 9:16, internal study). time → issue → severity → fix → result. Takes in `studio/out/live1/` (not in git). Final: take03.

## Toolkit build (before the film)
| where | issue | sev | fix | result |
|---|---|---|---|---|
| MediaPipe import | `libEGL.so.1` missing | blocker | `apt-get install -y libegl1` (documented in requirements-live.txt) | segmenter/landmarkers run |
| track | one man became 4 identities (face mesh drops on small/blurred faces; centre switched face↔torso) | major | pose face points fill missed frames; associate by nose; merge fragments ≤ 0.5 s apart | 1 continuous identity, frames 21–476 |
| align | snapping to the quietest frame picked dips inside words | major | anchor boundaries only on real micro-pauses (≥ 30 ms, 22 dB under speech), re-spread words between anchors | median 0.03 s (was 0.05), mean 0.07 s |
| footage.js | detached `<img>.decode()` never resolved in headless capture | blocker | `fetch` → `createImageBitmap` | frames decode off-DOM |
| capture | `Page.captureScreenshot` froze > 90 s at the freeze frame | blocker | bisected: 12 chained CSS `drop-shadow` filters on a full-frame layer; outline now drawn on canvas (hard silhouette ×12 offsets); `screenshot()` also retries a rare unanswered request | all frames capture |
| score | ducked bed ended with the voice (9.5 s) | major | `apad=whole_dur=12` on the voice before the sidechain | 12.0 s mix |

## Gates on review take01 → take02
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 9.4–11.9 | title wider than the safe band | gate | 86 → 72 px | PASS |
| 2.0, 8.5 | caption pages overlapped for one sample (0.05 s pre-roll) | gate | pages start exactly at their first word | PASS |
| 9.9–10.9 | frozen span on the card | gate | declared end hold [9.8, 12] | PASS |

## Builder look at stills/strips (one pass)
Text behind subject reads; sticker outline crisp after the hard silhouette; halo passes behind/in front of the head; head breaks the card.
Deliberate: footage is soft (768×432 source, ~3× in the 9:16 crop); the freeze burst covers most of the grey world by design.

## Close
take03: all gates PASS (1080×1920, 30 fps, 12.00 s, −14 LUFS, TP −2.3, LRA 6.2, 6 text lines in the safe band, share 7.65 MB).
Not verified: listening; real-speed human viewing; fresh reviewer. Study only — not a client deliverable.

## Music v2 (owner: "music very bad and ugly — Western, energy, beats, catchy rhythm") → take04
Replaced the soft 120 BPM bed with a 133⅓ BPM tech-pop track in `live1/score.mjs`: 909 four-on-the-floor, clap on 2/4, 16th hats,
supersaw Em–C–G–D with sidechain pump, sub bass, two-phrase hook (A answers B). Tempo chosen so one bar = 1.8 s and the cuts
(3.2 freeze, 5.0 unfreeze, 6.8 punch-in, 8.6 card) land on downbeats; freeze = tape-stop + riser + snare roll, drop on unfreeze, final stab on the title.
Measured: tempo 132.86 BPM on the mix; durations 12.00 s; voice still ducked over the bed.
take04 final: all gates PASS (12.00 s, −13.6 LUFS, TP −2.4, LRA 3, 6 text lines in safe band, share 7.65 MB).
Not verified: listening (measured only).
