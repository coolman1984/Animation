# LEDGER — Showreel 2 "CLAUDE · motion designer" (15 s, 16:9, 60 fps)

Reference: owner's screen recording `Screen_Recording_20261002_143800_X.mp4` (private pack in `references/user-ref/`, git-ignored).
time → issue → severity → fix → result. Takes live in `studio/out/showreel2/` (not in git).

## Builder checks before the critique (take01–take03)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 0–0.7 | black-frame gate failed on the intentional dark opening | gate | new tested gate option `darkSpans` (declared dark passages, like `holds`) in `lib/measure.mjs`/`make.mjs`, unit test in `test/options-cache.test.mjs` | gate PASS, declared spans `[0,0.7] [1.7,1.95]` |
| 11.25+ | type cards invisible (size measured while `display:none`) | major | `layout6` shows all cards while measuring | cards visible |
| 0.7–1.8 | rotating text ring not drawn (`text`/`textPath` missing from the SVG tag list) | major | `lib/motion.js` `el()` tag list extended | ring renders |

## Independent critique of take03 (fresh reviewer, reference vs recreation boards)
Fidelity before round 1: ~85 % on structure/timing/HUD/palette, ~65 % on type scale, width motion and point-cloud look.
Round 1 (first of two allowed) → take04. Results were checked on frames extracted from take04's exported mp4.
| time | issue | sev | fix (round 1) | result on take04 |
|---|---|---|---|---|
| 1.1 | text ring not legible | major | ring renders, size/contrast raised | legible at 1.1 s |
| 1.9–2.1 | iris edge hard | minor | iris ramp 1.875→2.08, rim kept | soft rim, leaves by ~2.08 |
| 2.5+ | wordmark letters changed width too evenly | minor | per-letter wave on the width axis | letters land one after another |
| 3.5–5.6 | easing cards too small / equal width | major | `CARDS` widths and sizes per card (wdth 62–100, frac 0.44–0.94) | cards fill the frame, widths differ |
| 6.85 | star soft/blurry | major | spring morph without leftover blur, `p = clamp(spr(...))` | crisp star |
| 9.4–11.2 | mesh trails over the caption | major | trails from `project5(T − 0.04)`, caption moved clear | caption readable |
| 12.8–13.0 | LINEAR soft | major | `lp = clamp(t/0.07)`, reveal from 0.3, flood at 13.05–13.35 | crisp LINEAR |
| 13.4–15 | confetti kept covering the credit line | minor | confetti fades 14.25→14.7, credit fades in 14.35→14.6 | clean lock-up at 14.7 |

Deliberate (not defects): the cream/blue diagonal at the corners of the 1.93 s frame is the iris rim leaving; the 12.0 s card
is blurred on purpose (it is mid-hit at a 1/8-note cut); read-back lists 0 text lines because kinetic type is drawn as graphics.

## Close
take04: all technical gates PASS (1920×1080, 60 fps, 15.00 s, −14.1 LUFS, TP −3.2 dBTP, LRA 3.5 LU, share copy 10.54 MB,
no black/frozen spans outside the declared dark spans and the logged hold `[14.4, 15]`).
No blocker remains → scope DONE after 1 of 2 correction rounds.

Not verified: listening to the audio (no playback here: waveform/spectrogram/loudness only); the reference audio was never
listened to either; real-speed viewing by a human; the loop seam 15.0 → 0.0; the share copy was not reviewed by the critic.
Minor critic item left open: the lattice dissolves into the depth scene a little abruptly (9.37 s).
Owner decisions flagged: the wordmark "CLAUDE" with a burst glyph is close to a real brand's look (the glyph is own geometry,
fonts are OFL) and the line "AVAILABLE FOR NEW PROJECTS" is a claim — change them if the reel is used for real.
Fidelity is structural (order, timing ±~0.1 s, palette, type roles, HUD), not pixel-exact.
