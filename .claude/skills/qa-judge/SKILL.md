---
name: qa-judge
description: Judge a render with numbers and eyes — automatic gates, frame extraction, 1:1 crops, independent reviewer prompt, LEDGER format. Use after every build before telling anyone it's done.
---
# qa-judge

## Automatic gates (`studio/lib/measure.mjs gates()`, run by make.mjs; build fails on any FAIL)
plays (ffprobe) · size = brief · duration ±10 % · loudness target ±1 LU · true peak ≤ −1.5 (+0.2 tol) · LRA < 8 ·
no frozen span > 1 s (blurred copy, logged holds allowed) · no black mid-film · text inside safe area, no overlaps
(DOM boxes every 0.1 s) · share copy ≤ target MB.

## Eye review (builder ≠ judge)
Give a **fresh sub-agent** only: the contact sheet, ≥ 12 full frames, 3 1:1 crops, the transition strips, the brief's
storyboard and this checklist. Ask for findings ranked by severity with timecodes. Do not give it your intentions.

Checklist for the judge: legibility at phone size (view at 25 %) · nothing important covered · Arabic shaped and
aligned · consistent margins · contrast ≥ 4.5 : 1 · motion never fights the content · first 2 s earn the next 10 ·
brand ≤ 5 s · no dead/empty frames · transitions clean (no seams/halos) · sharp at 100 % · no banding (grain on) ·
share copy not mushy · CTA clear.

## LEDGER.md format
| Round | Finding (timecode) | Change | Number after |
Keep every round; never delete.

## Extraction commands
Strip: `ffmpeg -ss A -t 1.8 -i f.mp4 -vf fps=6,scale=216:-2,tile=6x2 -frames:v 1 strip.png`
1:1 crop: `ffmpeg -ss T -i f.mp4 -vf crop=540:540:X:Y -frames:v 1 crop.png`

## Checklist
1. make.mjs green. 2. Sheet viewed. 3. Strips of every transition viewed. 4. 1:1 crops (text, product, gradient).
5. Share copy crop compared. 6. Independent pass done. 7. Findings in LEDGER. 8. Fixed + rebuilt. 9. Gates re-run. 10. Only then report.
