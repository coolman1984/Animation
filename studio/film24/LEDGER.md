# Film 24 ledger — time → issue → severity → fix → result
| time | issue | severity | fix | result |
|---|---|---|---|---|
| timing | brief's cruise (≈ 770 px/s) overran the 5275 px page; the pinned bottom edge would reverse at the 8.2 s handover | major | `LY_FOOT` retimed to 4368 → cruise ≈ 582 px/s; edge blend narrowed to 8.22–8.42 | edge holds 1103–1110 px |
| stills 1 | end title words in reverse order (textLine defaulted to RTL) | blocker | `direction: 'ltr'` | fixed |
| stills 1 | end-card corner blurs too dominant | minor | smaller, pushed into the corners, alpha 0.72 | fixed |
| flow 30 fps preview | felt surge 1.5–2.5 s: the big app window stood up 42° while the camera accelerated | major | round 1: window stand 30° over 0.9–3.3 s; side chips softer | peak 17 → 13 px/frame |
| final take01 | 16 subframes × 40-tap DOF on CPU WebGL ≈ 80 s/frame; screenshot timed out | blocker (pipeline) | sum subframes first, DOF once (`sumInto`); `STUDIO_SHOT_TIMEOUT` | ≈ 23 s/frame/worker; still-for-still identical |
| final take02 9.55–9.70 | dark grey block under the card: the command palette's shadow stayed after the page faded | major | round 2: shadows below the hero fade with the page | fixed (stills) |
| final take02 9.0–9.4 | logo-tile and chip shadows were hard dark squares (alpha mips outgrew the quad) | major | round 2: soft rounded-rect SDF shadows for pieces and tiles | fixed (stills) |
| final take02 flow | page glide constant (analytic 582 px/s 1.6–7.3 s); measured band reads up to ≈ 1.5× at 1.7–2.7 s while the raised window passes (parallax, not camera); 0.4–0.6 s expansion = hero buttons lifting toward the lens | known | none — two-round budget used | logged |
| take05 | delivery | — | master 10.8 MB, share 37.5 MB, 14.500 s, −13.6 LUFS, TP −2.7; dive and tile shadows checked clean on a contact sheet | DONE |

Not verified: listening to the mix, real-speed viewing on a phone, a fresh independent reviewer.
