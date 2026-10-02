# LEDGER — Film 7 PIXEL Plus «ريل الموشن» (20 s, 9:16 Reels, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film7/` (not in git).

## Reference study (owner-supplied UI micro-interaction reel, pack `references/showreel3-ref/`, private)
`reference.mjs analyze` + `timeline` + `audio`. Visually inspected: overview + three evidence sheets. Measured: 119.95 BPM, E major/Hijaz
hint, morph windows 0.2–0.4 s (1.4–2.1, 3.6–4.1, 4.7–5.3, 6.3, 7.2–7.3, 11.5–12.0), one state per bar. Audio analysed numerically, not heard.

## Builder loop (stills + review builds; not counted as correction rounds)
| time | issue | sev | fix | result |
|---|---|---|---|---|
| 0–1.4 | calm first frame, boxes small, lower half empty | major | title + slot-machine counter, content scaled up (state table), ghost chapter numeral + bottom timeline | frame 0 has title, counter, button, timeline |
| 4 | slider knob jumped to the left edge (a comment swallowed the statements) | blocker | statements on their own line | knob follows the cursor |
| 8–9 | curve editor mapped in page coordinates inside a card (curve touched the title) | major | card-local graph mapping | curve inside the card |
| 7–8 | chart rose right→left (reads as falling) | major | left→right chart | reads as growth |
| 16.7–20 | tagline overlapped the CTA pill and the wordmark box | gate | tagline 994, CTA 1136, accent margin | PASS, 87 lines checked |
| 13.4–14.6 | black frames inside the type scene | gate | declared `darkSpans` | PASS |
| master | true peak +2.2 dBTP (hot flat mix) | gate | section automation, RMS scaling, soft-clip before the master | −2.3 dBTP |
| review tool | `rawCrop` crashed (ffmpeg ENOBUFS on a wide text box) | tool | `maxBuffer` 256 MB in `lib/review.mjs` | evidence builds |
Deterministic forward/reverse seek test for the whole film passes (`test/examples.test.mjs`).

## Independent critique
Pending at the time of this commit.
