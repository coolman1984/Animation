# LEDGER — Film 5 BALACONBAR Beni Suef «طعم زمان.. بمذاق النهارده» (25 s, 9:16 Reels, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film5/` (not in git). Final: take04.

## Builder loop on stills (before any export; not counted as correction rounds)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 18.0–20 | brand lock-up: huge cup covered logo and tagline | major | logo top, text middle, cup bleeds from the bottom (base 2140) | readable stack |
| 12–14 | stacked words hidden behind the cup | major | words swap one at a time above the cup | readable |
| 14–16 | portrait macro of a square photo left an empty strip | major | blurred 3.4× cover copy + faded sharp window | full frame |
| 16–18 | arch title overlapped TRY IT; arch too small | major | title y 292, TRY IT y 540, arch 880×1100, duo 0.58 | clean |
| 6–8 | product small, text over the cup's base | major | duo 0.72, Arabic line under the Latin word | readable |
| 10–12 | Beni Suef word collided with bands | minor | title/word above, bands lower | clean |
| 0–2, 8–10, 10–12 | empty bottom third | minor | marquee bands (outlined/filled) in the unsafe zone | filled with motion |

## Gates on the review build (take02) → fixes
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 18.1 | «تعالى جرّب» box top 265 < safe 269 during its exit | gate | top 292, exit rise −3, out at 17.75 | PASS (take03/04) |
| 9.8–10.3 | list line on screen 0.5 s, needs ≈1.3 s | note | line removed (cards carry the labels) | note gone |
| 0, 4, 16 | cue impacts doubled (explicit + cue sheet) | tool | explicit duplicates removed from the score | single transient |

## Separate critique pass of take03 (builder, separate pass — no fresh reviewer was spawned) → correction round 1 → take04
| time | issue | sev | fix | result on take04's exported mp4 |
|---|---|---|---|---|
| 8.9–9.7 | flying cards covered the next Arabic label («ليمون طازج», «ميلك شيك», «مخبوزات» cut) | major | label z-index above every card | labels fully readable at 8.95 / 9.35 / 9.65 |
| 0–2 | hook tag 28 px, unreadable on a phone | minor | 38 px bold, 0.28em | readable at 1.0 s |

Deliberate (not defects): the first frame shows MATCHA blurred and the cup tilted (it springs in within 0.3 s); the lime flash at 19.95 is a 2-frame punch; menu minis sit below the safe band (images, not text);
"cue open: 1033 ms off" is a detector ambiguity: the impact at t = 0 is present (peak −2.4 dB in the first 50 ms of the export) and the louder kick at 1.0 s is what it found.

## Close
take04: all technical gates PASS (1080×1920, 30 fps, 25.00 s, −14 LUFS, TP −2.4 dBTP, LRA 6.2, no frozen/black spans, text inside the safe area, share copy 11.45 MB).
No blocker or major remains → scope DONE after 1 of 2 correction rounds.
Not verified: listening (audio checked only by waveform, spectrogram and loudness); real-speed viewing by a human; fresh-reviewer critique; the 9:16 under live Facebook/Instagram overlays;
the vintage-board menu items vs the real menu; the exact brand look of the AI storyboard scenes. Missing from the film (owner to supply): address, phone, social handle, hours.
The 141 MB master (CRF 14, grain) is local; the 12 MB share copy is the file to post.
