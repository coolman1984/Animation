---
name: qa-judge
description: Review actual exported evidence with targeted checks during iteration and one independent final critique.
---
# qa-judge
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Read WORKFLOW.md → Artistic acceptance. Technical gates in lib/measure.mjs cannot judge taste or persuasion.
Local edit: changed interval + entry/exit. Final: whole exported film, source-boundary review-plan.json if present,
at least 20 timestamps for a normal short ad, phone view, 100% product/type/matte crops, transitions and share copy.
These are samples, not revision rounds. Use actual motion playback and listening; stills cannot prove motion/music quality.
A separate final critique gets the brief, assets truth, exported evidence and checklist, without builder self-praise.
Use a fresh reviewer when available, otherwise a separate pass and disclose the limitation. No repeat reviewers by default.
Check hook/message; focal hierarchy; source truth; Arabic spelling/dialect/readability; matte/shadow/focus; edit rhythm;
no doubled product; music fit/ending/dialogue; correct dimensions/duration/safe layout; one clear CTA.
Ledger: time → observed defect → blocker/major/minor → smallest fix → evidence after. Do not manufacture arbitrary 9/10 scores.
Fix blocker/major issues, then verify only affected evidence. Two failed attempts require diagnosis. Mark unviewed/unheard evidence explicitly.

**Reference-matched work:** build matched boards (reference above, ours below, offset-corrected timestamps), check fixes on frames extracted from the exported mp4, and give the critic a list of deliberate non-defects. Say what fidelity means (structure, timing, palette, type roles) and what is unverified (audio heard? real-speed? loop seam? share copy?). Examples: studio/showreel2/LEDGER.md.

**Our own exports can be measured too:** `node reference.mjs timeline <our.mp4>` shows dead spans and cut rhythm; `audio` checks that hits land on the grid.

**Finish check for dark/blue gradients (film 6):** extract the frame from the exported master AND the share copy, crop the glow, boost levels (`-level 0%,18%`); rings at a 5.5× boost that are faintly visible at 1:1 are a finish defect — fix with `config.dither`, not with picture-side noise.

**Review tools (2026-10-03):** watch the export in the playback player (`node studio.mjs review <film>`: frame stepping, shot/cue timeline, waveform, A/B takes, timed notes; approval is bound to the file's SHA-256 and voids when the file changes). Colour: scopes in every review gallery, `node studio.mjs color check` (export ΔE), legal range note in make. Sound: `node studio.mjs mixcheck`.
