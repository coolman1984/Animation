# Studio status and session handoff

Updated: 2026-10-02. This is the current handoff; historical plans are not a task queue.

**Latest scope: DONE — Studio showreel (15 s, 16:9 + 9:16), owner request 2026-10-02.**
- Source: `studio/showreel/` (BRIEF, production.json with creative block + cue sheet, film.js, score.mjs, measured music map, LEDGER).
- Final take: `studio/out/showreel/take07/` (local, not in git): masters 1920×1080 and 1080×1920 + 10 MB share copies.
- Technical gates: all PASS on both deliveries (15.00 s, 30 fps, −14 LUFS, TP −3 dBTP, LRA 4.9, text read-back clean).
- Artistic: one independent critique (SHIP WITH FIXES, 0 blockers, 5 majors) → one correction round → majors verified on
  take07 frames; the "Latin comma" finding was not reproduced (U+066B in both app and counter; typeface glyph). See LEDGER.
- Not verified: listening on headphones/phone; human real-speed viewing; live platform overlays on 9:16.
- Studio fixes made during this scope: read-back ignores hidden and mask-clipped text; counters caption their final value;
  calibrated contrast estimate; camera-whip blur profile.

**Previous scope: DONE — Generation 2 consolidation and bounded session handoff.**
Integration record: the merged Generation 2 consolidation request in the [repository pull requests](https://github.com/coolman1984/Animation/pulls).
Its merged state and final-head checks are the source of truth for publication; do not restart this scope.

## Current scope

- **Implemented:** Generation 2 motion, camera, transitions, typography, layout, particles,
  shaders, music analysis, SFX cues, review evidence, real-app capture, layer plates and engine adapters.
  See `studio/GEN2.md` for the inventory.
- **Unit verification:** `npm test`: 60 tests, 47 passed, 13 skipped, 0 failed.
  Browser checks and optional Python/librosa checks are not covered by this unit result.
- **Browser verification:** `npm run test:render`: 60 tests, 59 passed, 1 skipped, 0 failed
  in [Studio checks](https://github.com/coolman1984/Animation/actions/runs/36978596723).
  This covers the actual browser/encoder, example seek checks, four typography ratios, camera
  diagnostics and legacy-film compatibility. Only the optional Python/librosa check was skipped.
  The local checkout has no Chromium; use CI evidence instead of repeating unavailable local runs.
  The fixed integration branch's final-head checks certify the complete snapshot, including later
  review fixes and the corrected placeholder. Earlier runs cancelled by concurrent Claude pushes
  are superseded; do not resume them.
- **Films 2–4:** preserve their existing source and delivery ledgers. Film 4's previous
  delivered take is recorded in `studio/film4/LEDGER.md`; it is not a new render of Generation 2.
  Client photos, derived plates, licensed audio and exports stay outside public git.
- **Branch consolidation:** `main` is the default integration branch; the consolidation request incorporates the
  active Claude Generation 2 branch with merge history preserved. Earlier Claude branches
  were already included in `main`; the merged `main` is the source of truth for future sessions.
- **Corrections verified:** stable resting text rasterization, integer legacy-test viewport sizes,
  and a valid grey placeholder PNG (FFmpeg decode checked locally). Placeholder pixels are only
  for compatibility tests, never client film delivery.
- **Latest Claude fixes included:** clamp review crops to the exported frame, clip review evidence
  to the requested range and reject unsupported external-engine cut-downs before mismatched audio.

## Finite completion contract

1. Read this file and the owner's current request. Choose one concrete scope and acceptance checks.
   Completed or deferred work is not automatically reopened by a new session.
2. Implement the scope, run the relevant checks once, and inspect the result.
3. Fix only reproducible failures or recorded blocker/major findings. Allow at most **two
   correction rounds in total per requested scope**, with targeted verification after each.
4. If the checks pass and no blocker/major remains, mark the scope **DONE**, record the evidence
   and stop. Optional polish, new features and historical ideas belong to a deferred list.
5. If the two-round budget is exhausted, or a dependency/asset is unavailable, mark the scope
   **BLOCKED**, record the exact failure and next action, and stop dependent work. Never claim
   completion, weaken a gate, relaunch an identical failing command or start a new review loop.
   An explicit owner request can authorize a new bounded scope.
6. When the source branch is receiving concurrent pushes, take one explicit integration snapshot
   and validate that fixed branch; do not chase a moving branch or overwrite concurrent work.
7. Check a remote workflow only while its run is queued/in progress and within its configured
   time limit. A completed failed/cancelled run is a result to diagnose, not a reason to poll forever.

For film work, `studio/WORKFLOW.md` still requires final technical checks and one separate artistic
critique. A new request for a film does not require regenerating the studio or rechecking every example.

## Deferred, not active work

- Optional Python/librosa verification when those packages are available.
- New film production, client asset restoration, new external engines and additional features
  only when the owner requests them.

## Required handoff update

When a requested scope changes or closes, update this file with DONE / BLOCKED / IN PROGRESS,
the exact verification result and a concrete next action only if one is still required.
Do not keep stale “run first next session” instructions after the check has completed.
