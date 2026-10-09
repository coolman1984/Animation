# LEDGER — Film 20 PIXEL Plus «ريل الموشن» (20 s, 9:16 Reels, one delivery)
time → issue → severity → fix → result. Takes live in `studio/out/film20/` (not in git).

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

## Independent critique of take06 (fresh reviewer agent; frames, strips, crops of the export; audio measured, not heard)
Verdict: not ready — 1 blocker, 6 majors, 3 minors. Correction round 1 → take07–09.
| time | issue | sev | fix | result on the exported take09 |
|---|---|---|---|---|
| 0–13 | copy, number and art lifted from the reference (Generate / «motion study 02 — made in code» / same gradient tile / 84,320 + wiggly line / «Every frame is code»), same state order | blocker | new copy («حرّك فكرتك», «إعلان المنتج · لقطة ٣»), pixel-mosaic art in palette tokens, a dial instead of slider+switch, bars + «٢٫٤ مليون» instead of line + 84,320, search «حركة مرنة» → «إيقاع على الدقّة», segmented «ريلز / مربّع / عريض»; violet/coral/cyan removed | no shared string, number or art; all colours from the declared palette |
| 0–1.25 | static title-card hook; first click at 1.25 | major | title springs in from frame 0, slot-machine counter, pixel brand mark, cursor travelling, click on beat 2 (0.83 s), loader dots after the click | frames 0.0/0.4 differ in the hero area; first click 0.83 s |
| 3.55–4.1, 7.95–8.15 | slider value and counter payoff vanish as they land | major | dial value 150 px held ≥ 0.75 s (4.05–4.8); bars + number land by 7.0 and hold ≥ 1 s | sharp value visible for ≥ 20 frames in both scenes |
| 12.6–13.1, 5.8, 1.2 | cursor, ring and burst cover the payoff words | major | cursor tips offset from labels (left of the row, below the segment labels, right of the button), bursts 50–110 px, ring 14–84 px | no cursor pixels over glyphs at 1.2 / 5.4 / 12.7 |
| 8.2–8.45, 11.4, 13.2 | muddy flat-grey crossfades white→black | major | box colour changes in 1.5 frames at the morph start (content already gone), content fade-in 0.22 s after MS | no full-card mid-grey frame in a 15 fps strip |
| 13.33–14.9 | type scene late: empty black, «حركة» legible 0.3 s after the drop, «فكرة.» small, short hold | major | box expands from 12.93 (MSK), first word whips in 0.17 s and is formed on 13.33, words at 13.13/13.54/13.96/14.38, «فكرة.» up to 760 px, ≥ 0.45 s hold, no empty frames | PASS, no dark spans needed |
| 17.9–19.5 | shoes sank into the wordmark, head near the header, off-centre, weak CTA | major | character 92 px unit, centred (x 540), soles on the letter tops, CTA pill 54 px label, landed at 17.67, note at full opacity | clear of the header; CTA ≥ 520×110 |
| controls | microtext and controls small for 9:16 | minor | dial 420 px circle, caption 44 px #34353A at y 1172, curve readout 30 px, tabs and the grey pill removed | readable |
| 0–16.6 | agency identity absent until 16.7 | minor | pixel brand mark (blue + gold squares) in the header from frame 0; title sub-line «بيكسل بلس · ٢٠ ثانية بالكود» | visible in the first frame |
| 5–12 | monotone one-bar cadence; fade-out ending | minor | scene lengths ½ / 1 / 1½ bars, short riser into the curve editor, clear stinger + bell on the last upbeat (19.58) and a 0.2 s fade | three scene lengths; full stop |

## Final (take09, `make film20 --profile=final`)
All technical gates PASS: 1080×1920, 30 fps, 20.00 s, −14 LUFS, TP −2.4 dBTP, LRA 2.1 LU, 79 text lines checked every 0.1 s inside
the safe area with no overlaps, share copy 11.46 MB. Master 5.1 MB. Forward/reverse determinism test passes.
Not verified: listening (music tone, mix balance and SFX are measured only), real-time phone playback; a second fresh critique was not run
after the correction round (the reviewer's acceptance criteria were checked by the builder on the exported frames).
