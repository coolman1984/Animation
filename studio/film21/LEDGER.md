# LEDGER — Film 21 living poster (15 s, 1080×1080)
time → issue → severity → fix → result. Takes in `studio/out/film21/` (not in git). Final: take05.

## Builder loop on stills
| issue | sev | fix | result |
|---|---|---|---|
| nebula too bright, "electric marble" competing with the title | major | darker density², softer ridges, centred vignette | title reads first |
| planet a flat bright disc; moon colliding with "3" | major | rim-lit dark planet; moon moved to bottom-right | clean |
| chrome read as a plain gradient | minor | diagonal reflection band layer (overlay) | reads as chrome |

## Gates
| take | issue | fix | result |
|---|---|---|---|
| take01 (review) | «قريبًا» box 4 px below the safe area | text block lifted 22 px | PASS take02+ |

## Separate critique pass (builder; no fresh reviewer) and correction rounds
| round | finding | fix | measured result |
|---|---|---|---|
| 1 (take03) | resting motion too quiet compared with the reference | faster nebula rotation/zoom, more warp drift | median frame change 0.61 → 0.62 (no real change) |
| 2 (take04) | same | nebula translate, star spin, stronger twinkle | 0.57 in the living part vs the reference 1.06 |
| 2 closure (take05) | round 1's larger push made MOTION STUDIO touch the frame edges at the finale (a regression of my own fix) | push back to 5 %, finale bump removed, title 84 px | title inside the frame at 13.6 / 14.9 s |

Deliberate: the living motion is calmer than the reference by measurement (0.57 vs 1.06 median frame change at 180 px). The
reference's bright flowing background competes with its logo; this one keeps the background dark so the chrome reads first.
Two correction rounds used; the third render only repaired a regression introduced by round 1 (disclosed).

## Close
take05: all technical gates PASS (1080×1080, 30 fps, 15.00 s, −13.7 LUFS, TP −3.4 dBTP, LRA 1.6, declared dark span 0–0.5 s,
text inside the safe area, share copy ≈ 11.4 MB). Scope DONE.
Not verified: listening; human real-speed viewing; fresh-reviewer critique.
