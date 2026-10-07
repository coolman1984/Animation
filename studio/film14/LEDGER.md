# LEDGER — film14
time → issue → severity → fix → result. Takes live in `studio/out/film14/` (not in git).

| time | issue | sev | fix | result |
|---|---|---|---|---|
| owner note | film13's 3D look rejected; wants 2D, teams, results, leagues, shirts, faster catchy music, host + title ending | blocker | new film: pure DOM/SVG, 150 BPM chant score, real sourced results, colour roundels/shirts, host footage up to the title | stills OK |
| stills | blurred-photo background showed a giant blurred face under the end card | major | floodlight-bloom gradient background | fixed |
| stills | slot digits printed long strings (hash() returns 0–1, `% 10` kept the fraction) | blocker | `floor(hash × 10)` | fixed |
| stills | «سيراميكا كليوباترا» overflowed its card | major | 36 px in a 320 px box | fixed |
| take01 | text gate 37 (name lines touching, league names past the safe edge, result cards sliding in from 900 px already opaque); frozen 9.93–11.03 (all cards landed) | blocker | «كورة» 32 px lower; league names resized/re-centred; cards slide 200 px and their words turn opaque only in the last 15 % of the spring, exit by scale/fade; LED drift, card bob and shine sweeps | take02 |
| take02 (final) | all 11 export gates PASS: 1080×1920, 30 fps, 20.000 s, −14.1 LUFS, TP −5.9 dBTP, LRA 2.6 LU, no frozen span, no black, 122 text lines zero issues, share 13.95 MB | — | exported 10 fps strips at 1.2, 4.5, 7.0, 7.9, 11.0, 14.3, 15.8 s: ball-through-lens, wipes, LED/circle reveals, blast and flash into the host all read; no blocker/major | delivered `out/film14/take02/film14-reels20-share-14MB.mp4` |

Not verified: listening (1.6 s windows: intro −16.0, tactics −15.1, teams −14.1, results −14.2, analysis −15.5, blast −13.0, host −12.6/−13.1 LUFS) and real-time phone viewing. Official crests not used (no files supplied).
