# LEDGER — Film 8 Pixel Plus factory pitch (25 s, 16:9, one delivery). Takes in `studio/out/film8/` (not in git). Final: take04.

| time | issue | sev | fix | result |
|---|---|---|---|---|
| reference | needed the exact words and order | — | `tools/live.py` ingest + VAD + Whisper turbo on the recording; captions read from frames for 23–29 s | order table in BRIEF |
| stills | right-column statements ran into the left-column visuals | major | text column 1000–1800, headline sizes 64–84, visuals moved left (centre x 440) | clean split |
| take01–02 | card labels counted outside the safe band / overlapping later text (hidden card kept word opacity) | gate | cards hidden outside 15.1–17.7, slide offset 60, card 620 wide, label 36 px | PASS |
| take02 | frozen 2.6–4.0, 16.1–17.3, end | gate | blueprint glow shimmer, stronger moving blue glow, flowing dashes on the rail, card shine; end hold [23.3, 25] declared | PASS |
| take04 | all gates PASS: 1920×1080, 30 fps, 25.00 s, −15.9 LUFS, TP −3.9, LRA 2.1, 64 text lines in the safe band, share 13.5 MB | — | — | delivered |

Builder look at a 20-frame sheet of the exported share copy: one statement per station, the client cards readable, the logo assembly and lock-up clean.
Not verified: listening, real-speed viewing on the meeting-room screen, a fresh reviewer. 0 of 2 correction rounds used after the first full export.
