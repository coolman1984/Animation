---
name: film-director
description: Route a film from a concise brief through one proof clip to verified delivery; load departments only as needed.
---
# film-director
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Read studio/WORKFLOW.md first; studio/SKILLS.md routes optional departments. Do not re-read the historical prompt.

If a reference film is supplied, invoke reference-reverse-engineer via SKILLS.md before inferring its techniques. Do not load the reference lab for ordinary films.

1. Record viewer, real evidence, one promise, CTA, duration/placements and asset limitations. Owner-authorized work proceeds without repeated approval.
2. If concept is open, load creative-director. Compare at most three genuinely different directions; pick one. Three style frames: hook, proof, payoff. Fill shot craft metadata before expensive motion.
3. New films use production.json (studio/templates/production.json) referenced by config.production. Share shot times with picture and sound.
4. Prepare only needed assets/layers. Use animation-lab/camera-director when needed, not all skills.
5. Run production preflight first; creative repetition/overload findings are warnings to inspect, not taste scores. Then build one 8–12s proof with one real transition. Draft is silent; review profile is required to judge sound.
6. Expand, then fix changed ranges plus entry/exit. Final build uses `node make.mjs <film> --profile=final`.
7. One separate final critique: frames + actual motion/audio playback, brief and ledger. A fresh reviewer is preferred when available.
8. Close blocker/major findings and report verified output plus any limitation. No unbounded review loops.

Targets are starting points: clear first 2–3s, recognisable brand early, readable Arabic and one easy action.
No mandatory motion in every shot, SFX on every cut, quota of ideas or quota of revision rounds.
Report in concise Egyptian Arabic: ready/not ready, file links, meaningful changes, remaining unverified issue.
Technical gate success alone never means artistically ready. Keep client photos/plates, licensed audio and renders out of public git.

**Documentation duty (2026-10-02):** a film is not closed until STATUS.md, studio/CHANGELOG.md, CRAFT.md (0–3 lessons), TECHNIQUES.md, ASSETS.md and the film's LEDGER.md are updated in the same commit. For an owner-supplied video to match, follow WORKFLOW.md → Reference-matched reel.

**Owner production policy:** read `studio/AUTONOMOUS_FILM.md` first for new films. The owner requests subject + placement/size; the Claude Code agent does ALL analysis, direction, internal JSON, review, corrections and export. No ordinary approval pauses or manual owner tasks. Deliver one finished video link. Use config.ownerRequest to enforce the single requested canvas/duration/fps.
