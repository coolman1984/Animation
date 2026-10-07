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

## v2 (owner 2026-10-07: official logos, "the music is very bad", "the ending is very bad", search the web for energetic / last World Cup music)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| owner | official club/league marks wanted; he sent two standings screenshots, the PL logo photo, the trophy photo, a players poster and an Egyptian standings graphic | blocker | crests cut from his screenshots (flood-fill background removal, 4× Lanczos); EPL Egypt badge cropped from his graphic; PL shown as his photo card (keying the purple lion off grass was too damaged); Egypt shown by its flag (no crest supplied) | crests on shirts, cards, standings, end parade |
| owner | music v1 rejected; web music libraries are blocked here (pixabay, mixkit, incompetech, archive, wikimedia → 403) | blocker | recorded CC0 orchestra (VSCO 2 CE via GitHub): trumpets, trombones, horns, string spiccato, timpani, snare rolls, crash cymbals over an EDM bed; style of the 2026 World Cup anthem («DNA»: operatic/orchestral + EDM drop), no melody copied | sampler score, orchestra layer 2–3 dB under the full mix |
| owner | end card "very bad" | blocker | 2× motion-interpolated footage in a 1080² soft-edged panel; the host cut out per frame (rembg u2net_human_seg); «اتكلم كورة» flies onto the stadium screen BEHIND him like his video; crest parade below | read on strips |
| take03 | rank digits sliding in past the right edge; title words opaque while flying in | blocker | rows enter from the centre; words opaque only in the last 7 % of their spring | take04 |
| take04 (final) | all 11 export gates PASS: 20.000 s, 1080×1920, 30 fps, −14.2 LUFS, TP −3.9 dBTP, LRA 4.1 LU, 232 text lines zero issues, share 13.85 MB | — | strips at 4.7, 7.0, 9.3, 15.9, 17.0, 18.4 s | delivered `out/film14/take04/film14-reels20-share-14MB.mp4` |

Not verified: listening and real-time phone viewing. Standings are the owner's screenshots (after five rounds), read back by eye.

## v3 (owner 2026-10-07: "the music is still very bad"; «اتكلم كورة» whole, in front of him, at the bottom)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| audio | measured why v2 sounded bad: 70–85 % of the energy sat below 150 Hz (kick + sub 4–8× louder than every melodic bus; phone speakers drop that range) | blocker | kick = click + 160 Hz body + short tail; bass with 2nd–4th harmonics; hats ×3, clap ×1.9; a bright synth hook added under the brass (brass an octave lower, not shrill); bus weights drums 0.6 / bass 0.3 / chords 3.2 / lead 1.6 / orchestra 1.25 | bands now ≈ 32 % <150 Hz, 35 % 150–1k, 30 % 1–4k, 3 % >4k |
| ending | title behind him and cut off | blocker | title now in front, one line at 176 px (the Arabic line is 5.2× its font size wide — 240 px was 1250 px), y 1010–1204, extruded; light sweep painted into the letters (an overlay box printed a grey rectangle; text-shadow under clipped text printed grey); cut-out layer removed | take05 |
| take05 (final) | all 11 export gates PASS: 20.000 s, 1080×1920, 30 fps, −14.3 LUFS, TP −3.1 dBTP, LRA 4.5 LU, 232 text lines zero issues, share 13.86 MB | — | stills at 17.5, 17.9, 19.5 s | delivered `out/film14/take05/film14-reels20-share-14MB.mp4` |

Not verified: listening. The music cannot be judged by ear in this environment; the owner's own ear decides. Offer made: send a track and the film is re-timed to it.
