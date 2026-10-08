# Film 12 — MIZAN (ميزان) · LEDGER

Owner request 2026-10-08: world-class, fast, lively motion-graphics ad for the Store program («ميزان»), 25 s, "a showreel", go all out.
One delivery: Reels 9:16 1080×1920, 30 fps, 25.0 s (no placement named → studio default). Source: `film12/` (BRIEF, production.json,
config.mjs, timing.js shared clock, film.js, score.mjs). Fonts: Alexandria + Readex Pro (the product's own; Readex vendored this scope).

## Build log
| take | profile | result |
|---|---|---|
| stills st1–st6 | stills | composition fixed on stills before video (see issues 1–9) |
| take01 | review | gates: frozen span 18.67–19.77 FAIL; text gate 264 issues FAIL; rest PASS |
| take02 | review | frozen PASS; text gate 8 transient issues (kinetic overshoot) FAIL; rest PASS; strips reviewed |
| take03 | final | 11/11 gates PASS; judging on the share copy found the payoff logo's cream bar + fulcrum blurred (issue 14) → rejected |
| take04 | final | delivered (first version): 11/11 gates PASS — 25.000 s, 1080×1920, 30 fps, −14.2 LUFS, TP −3.3 dBTP, LRA 4.2, 140 text lines in the safe band, no freeze/black, share 15.39 MB |
| take05 | final | owner revision 1: «يشتغل من غير إنترنت» removed (badge, icon, sound cue); 11/11 PASS — superseded |
| take06 | final | owner revision 2: «MIZAN» touched the dots of «ميزان» in both lock-ups → re-spaced; text gate 1 boundary-frame overlap (sub lines at 6.0) FAIL |
| take07 | final | **delivered**: 11/11 gates PASS — 25.000 s, 1080×1920, 30 fps, −14.2 LUFS, TP −3.3, LRA 4.2, 139 text lines, share 15.38 MB; both lock-ups checked at 100 % on the share copy |

## Issues (time → issue → severity → fix → result)
| # | time | issue | sev | fix | result |
|---|---|---|---|---|---|
| 1 | 4.05 | top bar + fulcrum stayed cream on the cream burst → logo looked like a lone copper bar | major | colour switch at wipe +0.015 s | fixed (st3) |
| 2 | 4.3–5.9 | logo tile drawn at 57 % size (lerp factor clamped to 1.15) | major | clamp to 1 | fixed |
| 3 | 6.6–7.8 | invoice total showed «ج.م ج.م» (counter replaced only the first word) | major | counter writes the number word only | fixed |
| 4 | 6.0–6.2 | hero morph to the laser passed through a fat "T" | minor | laser = the bar rotated 90° (rot property in the hero spring) | fixed |
| 5 | 9.3–9.5 | total → paid button travelled across the chips and the change panel | major | the paid button forms in place of the total | fixed |
| 6 | 12.0 | «نقل بضاعة» chip on top of the subtitle | major | chip moved under the shelf | fixed |
| 7 | 14.3 | instalments title icon overlapped its text | minor | text moved left | fixed |
| 8 | many | text 3–30 px outside the safe band: a 2 % global zoom + push-ins anchored mid-frame; wide lines at 136–156 px | major | no global zoom (stage colour follows the world so shakes show no edge), push-ins anchored at y 300, headline sizes 120–128, lines that leave the frame (fling, dive, blind) hidden | 264 → 8 issues |
| 9 | 18.67–19.77 | frozen span in the numbers hold | major | copper light sweep across the chart 18.55–19.7 | PASS |
| 10 | 2.3, 8.5, 14.2, 16.5 | transient overshoot/overlap while words enter | minor | slam from 1.35, wide lines 126/128 px, chip labels appear only once the chip lands, second numbers line rises instead of dropping | 0 issues |
| 11 | 4.0, 20.1 | white flash greyed the cream burst and the navy tile for 2–3 frames (strips) | major | flash removed: the burst and the gathering tile are the flash | fixed |
| 12 | 14.0–14.4 | copper world empty before the headline | minor | headline enters at 13.98 | fixed |
| 14 | 20.4–25 | payoff logo: cream bar + fulcrum kept the dive blur (10 px) forever — found only on a 100 % crop of the exported share copy | blocker | the dive blur is limited to 6.0–6.45 | take04 crop crisp |
| 13 | audio | mix almost all sub-bass; melody band −17…−21 dB of total | major | kick ×0.7, sub bus 0.8 → 0.32, lead 1.35 → 2.6, arp 1.7, hats ×1.5 → melody band −6…−14 dB | take02+ |

Note: a log-scale `showspectrumpic` mislabelled the 48–70 Hz bass band as ~1.2 kHz; an FFT band table (not the picture) is the evidence.

## Not verified
Listening (no audio playback in this host); real-speed viewing on a phone; Meta's live overlays and re-encode; a fresh independent reviewer
(the judging pass was done by the same agent on exported frames and strips).

Correction rounds used: 2 of 2 (review take01 → take02; final take03 → take04). Banding check (levels-boosted dark crop of the share copy at 12.5 s): no rings.

## Owner revisions (2026-10-08)
1. «شيل جملة بيشتغل من غير انترنت دى خالص» → the offline badge, its icon and its sound cue are gone from the payoff (take05).
2. «ميزان بالإنجليزي داخلة فى اللوجو العربى» → the Latin «MIZAN» collided with the descending dots of «ميزان» (Alexandria's dots fall ~0.3 em below the line box's centre + half size). Name lock-up: word 940→920, MIZAN 1072→1092, subs 1150/1216 at 44 px; payoff: logo centre 560→540, word 832→806, MIZAN 972→1002, tagline 1062→1072 (take06/07). Lesson: the text gate measures line boxes and missed it; a 100 % crop of the Arabic + Latin lock-up is the check.
