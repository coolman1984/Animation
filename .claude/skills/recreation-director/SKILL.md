---
name: recreation-director
description: Map a visually reviewed reference grammar onto native Animation primitives, render a difficult 3–8 second neutral reconstruction and compare purpose, timing and hierarchy at matched timestamps.
---
# Recreation director
Read recreation-plan.json and analysis.md; require reviewed observations before production. `--study` permits a labelled provisional neutral experiment, never an artistically certified reconstruction.
- Pick a 3–8s segment with meaningful camera/depth/transition/type; the default range straddles a candidate handoff, but an agent chooses the representative difficult interval after inspection.
- Set shot scale, normalized composition/focal point, probable layers, camera keys/timing/focus, object motions, transition, type roles/reveal times, lighting, cues and important timestamps in the reviewed blueprint. Native primitives first; justify optional engines.
- Explicitly approve each reviewed shot blueprint with approvedForReconstruction=true; prose review alone does not approve neutral defaults.
- Run `node reference.mjs reconstruct <pack> --range=a:b`. Current renderer creates original procedural neutral assets, shared-camera parallax, shadows, a spring settle, native transitions and safe text. It intentionally uses no reference photographs/brands/music. It is a grammar experiment, not full-film recreation or recovery of source code.
- Run `compare <pack> <our-video-file>`; reconstructed segments automatically supply the reference start. Other films specify --ref-start/--our-start/--duration explicitly. Inspect all matched pairs and motion curves; watch both sequences, listen if available.
- Compare framing, timing, direction/magnitude, transition time, focal/type hierarchy, depth, energy and rhythm. Record which principle creates the effect and whether ours communicates more clearly/beautifully. Different assets make pixel error the wrong goal.
- Make only actionable corrections, respect STATUS.md's total correction budget. A measured motion curve cannot certify taste, persuasion or premium quality.
- Add one concise lesson only when a genuinely reusable result was demonstrated. Preserve a counter-case and evidence. No appearance copying or lesson quota.

**Whole-film recreation (field-tested, showreel2):** beyond 3–8 s studies, a short reference can be rebuilt as a full original reel. Write a bar/beat table first, fix the recording-vs-film clock offset, use original geometry/fonts/score, run matched boards and one critique, then at most one more correction round. Never claim 'exactly'; record fidelity in structure/timing/palette/type roles. See studio/TECHNIQUES.md → Reference recreation checklist.

## Original direction from artistic DNA
For new subject-specific production, read ARTISTIC_FORENSICS.md and reviewed artistic-dna.json. Use `reference/original-direction-template.json` and `reference.mjs direct <pack> --brief=file`. Trace 1–12 principles to original execution, subject fit, difference and counter-case. Adapt emotional arc, pacing, hierarchy, light, camera and payoff to our viewer; never reproduce identifiable artwork, characters, branding or exact composition. Inspect hook/proof/payoff frames for originality. Neutral technical studies may remain artistically pending and must say so.

**Owner production policy:** read `studio/AUTONOMOUS_FILM.md` first for new films. The owner requests subject + placement/size; the Claude Code agent does ALL analysis, direction, internal JSON, review, corrections and export. No ordinary approval pauses or manual owner tasks. Deliver one finished video link. Use config.ownerRequest to enforce the single requested canvas/duration/fps.
