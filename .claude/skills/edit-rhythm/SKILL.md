---
name: edit-rhythm
description: Edit for meaning and musical phrasing, retaining readable holds and exact delivery timing.
---
# edit-rhythm
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


One shared shot/cue table drives picture and sound. Cuts can land on beats, phrase endings or meaningful actions.
Use lib/rhythm.mjs to expose beat/phrase timing and cut offsets. Treat it as evidence: semantic action and readability may deliberately land off-beat.
No compulsory whole-bar cuts. If a requested duration ends mid-phrase, rearrange/choose suitable music; do not speed it blindly.
Match cuts align the product; occlusion cuts hide the handoff. Avoid long dissolves that duplicate solid products.
Let key copy settle; start from ≥1.8s fully readable / ≤17 characters per second and inspect the result.
Cut-downs need a complete hook/proof/CTA, even if that requires a dedicated edit. Check every new audio/picture join.
assembleAudio uses up to 20ms EDGE FADES, not overlap crossfades; duration remains equal to picture segment lengths.
It rejects invalid/too-long source ranges. True crossfades need handles and explicit picture timing; don't silently shorten audio.
Use changed-range previews. At final, listen/watch all joins and the resolution, including the encoded share copy.

**Live-action cuts (2026-10-03):** jump cuts from speech with `keepRanges` (pad ≈ 0.12 s, bridge gaps < 0.35 s, drop slivers < 0.25 s), alternate 1.0/1.12–1.15 punch-ins so cuts read as style, J/L audio offsets 0.2–0.4 s for dialogue flow, freeze-frame intros 1.5–2 s. `studio/LIVE_ACTION.md` §3.
