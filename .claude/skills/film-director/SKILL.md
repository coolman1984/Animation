---
name: film-director
description: Run the whole studio pipeline for a film — brief, gates, one-command build, judging, final report. Use when asked to make, remake or finish any video/ad/animation in this repo.
---
# film-director

**When:** any request that ends in a finished video ("make an ad", "a launch film", "re-cut it shorter").
**Inputs:** the owner's goal, viewer, one action, language, brand assets/photos, length/platforms, never-claim list.

## The pipeline (stop only at the gates)
| Phase | Output | Command / file |
|---|---|---|
| 0 Doctor + research + brief + storyboard | `studio/<film>/BRIEF.md`, `RESEARCH.md` | `node studio/lib/doctor.mjs`; skills `idea-lab`, `storyboard-writer` |
| ⛔ Gate A | owner approves storyboard — skip only when the owner already gave subject, tone and asked for the film directly (say so in BRIEF status) | |
| 1 Plates / stage | cut-outs, clean plates, logo matte (stills) or a real app on the studio clock (screens) | `node studio/<film>/plates.mjs` · skills `cdp-capture`, `studio-clock` |
| 2 Compose | `studio/<film>/film.js` (pure `render(t)`) | skill `motion-composer` |
| 3 Preview ≥ 20 times, fix, repeat | `studio/takes/<film>/previewN/sheet.png` | `node studio/lib/render.mjs stills studio/<film>/film.js --times=… --out=…` |
| 4 Sound | `studio/<film>/score.mjs` | skill `sound-designer` |
| 5 Build + measure | `studio/out/<film>/takeNN/` + `measure.json` | `cd studio && node make.mjs <film>` |
| 6 Judge (separate pass) | `studio/<film>/LEDGER.md` | skill `qa-judge` (fresh sub-agent on extracted frames) |
| 7 Report | chat message | format below → ⛔ Gate B |

## Final report format (owner is not technical; Egyptian Arabic if they wrote Arabic)
1. Ready? one line + the files. 2. What the viewer sees (5 bullets). 3. Numbers: duration, size, fps,
LUFS, true peak, frozen s, gates passed. 4. Staged / unverified / approximate. 5. Max 3 next options with
cost/benefit. 6. The one rebuild command.

## Targets
Hook in 0–3 s, brand visible ≤ 5 s, one CTA, every text line ≥ 1.8 s on screen, no shot > 8 s without a new move,
−14 LUFS social / −16 web, TP ≤ −1.5 dBTP, share copy ≤ 27 MB.

## Pitfalls seen
- Saying "done" before opening the render → always read the contact sheet + transition strips first.
- Owner-supplied concept boards may contradict the real product (film 2: "BALAKON" vs real cup "BALACONBAR") → trust the real photo, flag the conflict.
- Third-party brands inside owner photos (film 2 carton) → show as-is, claim nothing, list as an owner decision.

## Checklist
1. Doctor passes. 2. BRIEF has viewer, action, never-claim list. 3. Every source asset is listed in ASSETS.md.
4. Storyboard beats on bar lines of the music. 5. Previews looked at, ≥ 20 times. 6. make.mjs exits 0.
7. Judge pass written to LEDGER. 8. Fixes re-built and re-measured. 9. Commit code + docs, never `takes/` `out/`.
10. Report in the format above.

## Worked example — film 2 (BALACONBAR, 60 s Facebook ad)
Owner sent 3 photos + "world-class 1-minute FB ad, hero = cup + carton, elegant Egyptian, research US/EU ads".
→ `film2/RESEARCH.md` (ABCD, 3-s hook, sound-off, ASMR, slow motion) → `film2/BRIEF.md` (7 scenes on a 90 BPM grid)
→ plates → `film2/film.js` → `film2/score.mjs` → `node make.mjs film2` → hero60 + cut15 + bumper6.
