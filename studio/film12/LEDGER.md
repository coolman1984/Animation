# LEDGER — film12
time → issue → severity → fix → result. Takes live in `studio/out/film12/` (not in git).

| time | issue | sev | fix | result |
|---|---|---|---|---|
| stills 0–9.6 | room labels "حمام" and "غرفة نوم" collided; flat looked washed out (hemisphere light too strong) | major | bath/WC labels dropped (areas kept for the 4 big rooms); hemisphere 1.1 → 0.55, key 2.6, exposure 0.95 | fixed on stills |
| stills 12–16 | "من الشقة.. للمصنع" wider than the frame; work-floor camera too close (containers under the chips) | major | split into two lines (100/132 px), chips moved to y 574, view offset −260 px on the work floor, camera 66–96 m, stacks 2-high | fixed on stills |
| take01 | text gate FAIL, 87 issues: Alexandria 900 at 128 px is 1012 px wide; slam entries from 1.9× crossed the safe box; chips overlapped the next headline | blocker | headlines 110–136 px (read-back widths 870–880 px), slam now pops up from 0.62× with a 0.18 bounce, width dimension label moved onto its line, chips/count exit at 9.62 | take03: 1 issue left |
| take03 | frozen span 16.80–17.87 s (app window resting); a hidden chip still counted by the text gate (word opacity 1 inside a faded box) | major | slow push + tilt on the window while the copy reads; chip words carry the box opacity | take04 (below) |
| take04 (final) | all 11 export gates PASS: 1080×1920, 30 fps, 20.000 s, −14 LUFS, TP −6 dBTP, LRA 2.8 LU, no frozen span, no black, text 77 lines every 0.1 s zero issues, share 13.59 MB | — | judged on exported 10 fps strips at every chapter change (3.6, 5.0, 9.9, 11.8, 15.8, 17.7 s) + a 25-frame contact sheet: every transition is caused by the plane or the UI; no blocker/major left | delivered `out/film12/take04/film12-reels20-share-14MB.mp4` |

Not verified: listening (the mix was measured, not heard) and real-time phone viewing. Sub-section loudness of the score: intro −17/−16, drops −13, app −15.4, logo −13 LUFS (2 s windows).
