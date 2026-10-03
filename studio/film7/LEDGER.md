# LEDGER — Film 7 SANAD «معاك سند» (25 s, 9:16 Reels, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film7/` (not in git). Final: take08.

## Tools and builder loop on stills (before any export; not counted as correction rounds)
| what | issue | sev | fix | result |
|---|---|---|---|---|
| icon trace | `tools/logo_trace.py` makes one part per outline; the icon needs colour pieces (navy / gold / green) that animate separately | tool | new `film7/icon_trace.py`: colour classes from the inpainted plate, Gaussian-smoothed masks, connected components, potrace per piece, frame curves dropped | 11 pieces; shield = 2+4 / 3+5, ribbon = 0+1+7+8+9, arrow = 6 (checked against the source on `icon-check.png`) |
| Arabic wordmark | the banner board is white-on-navy; a plain inversion left a cream background (d > 0 everywhere) and a fat trace | tool | normalise luminance to a 0–1 coverage, invert to black on white, trace at 6× | body + dot, difference overlay empty |
| shield alone | the logo's ribbon cuts the shield sides with a white halo, so the shield looked broken before the ribbon arrived | major (art) | two stroked Bézier "bridges" continue the sides until the ribbon is drawn over them; white halos (stroked piece outlines) under ribbon and arrow | shield reads as a shield; ribbon "cuts through" it |
| ribbon draw | needed a pen-of-light reveal along an infinity path | art | centre line fitted by eye on the ribbon skeleton (Catmull-Rom through 15 points), reveal = clip-path polygon offset ±66 px along the path, pen glow at the head | ribbon draws through the shield |
| 5.0 | ivory ground appeared in one frame below the line | major | ground top = lerp(bottom → line, 0.75 s) then rides the line | smooth dawn |

## Gates on the review builds (take02–take05) → fixes
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 10.8–12 | frozen span > 1 s while the light orbit ran | gate | two large soft glows (warm gold, cool emerald) orbit slowly behind the day world | PASS |
| 0–0.17 | black frames (fade from near-black) | gate | veil starts at 55 % | PASS |
| 2.2–2.4, 4–6.8 | hook words overlapped the first falling weight; chip text counted as outside the safe band while rising (the gate reads the word's own opacity, not the parent's) | gate | hook exits at 1.95; weights fade on the words, not only the box; chart line moved up 90 px so the sag clears the caption | PASS |
| 2.9, 18.8, 10.5 | caption / row 4 / descriptor outside the safe band during their entrance offset | gate | caption cy 1168, rows start 856 with 26 px offset, descriptor cy 1178 | PASS |

## Builder critique of take06 (26 phone-size samples, transition strips, 100 % crops) → correction round 1 → take07
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 7.4–7.9 | outline fragments on an empty canvas read as scratches | minor | faint full blueprint of the shield fades in first; the strong outline draws over it | reads as construction lines |
| 15.1 | «نمو» in goldD on ivory 2.9:1 | minor | #946F0E | ≥ 4:1 |
| 15.0 | the arrow moment was small | minor | gold ring from the tip, icon pulse +3.5 %, comet along a thicker trail | clear payoff |
| 6.1–7.1 | «تشيل لوحدك.» on screen 0.9 s | minor | enters at 6.1 | 1.0 s with the headline |
| lock-up | CTA small | minor | pill 560×104, 47 px | readable |

## Finish checks → correction round 2 → take08
Banding: crops of the navy gradient (t = 3.0, ×7) and the ivory gradient (t = 9.0, ×10 above 228) on the master AND the share copy — smooth, no rings (`config.dither` on).
100 % crops of icon, wordmark, tagline and CTA in the share copy — crisp, colours match the board. One finding: «BUSINESS ADVISORY» words ran together → word gap 0.95 em → fixed on take08.

Deliberate (not defects): the 4.85–5.0 breath (music cut, picture held 0.4 s) is the dramatic pause before the dawn; the shield is shown with a bridge until the ribbon arrives;
the trail leaves the frame; the final hold 24–25 is declared. Open notes left by the gates: «لوحدك؟» is one word on screen 1.1 s; the cue checker reports the 15.0 impact "−429 ms"
(the measured sound jumps +12 dB exactly at 15.00; the earlier onset it found is the groove's ghost kick).

## Close
take08: all technical gates PASS (1080×1920, 30 fps, 25.00 s, −13.9 LUFS, TP −3.4 dBTP, LRA 3.3, no frozen/black spans, 24 text lines inside the safe band with no overlaps,
share copy 11.61 MB). No blocker or major remains → scope DONE after 2 of 2 correction rounds.
Not verified: listening to the score (measured only: 95.94 BPM, C major, sections −20/−37 breath/−21…−23 groove), real-speed human viewing on a phone, a fresh reviewer, live Meta overlays and re-encode.
