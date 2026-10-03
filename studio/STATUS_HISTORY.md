# Status history (moved verbatim from STATUS.md on 2026-10-02)

Full evidence of every closed scope. Read only when a past scope matters; `../STATUS.md` holds the current state.

(moved from STATUS.md on 2026-10-03)
**Closed scope: DONE — Project optimisation and taste guard (owner request 2026-10-02).**
- Review evidence after every review/final export now extracts frames in parallel (bounded pool of 4): 103.6 s → 71.1 s on film 5's master, all 96 evidence files and review.json byte-identical.
- STATUS.md compacted (this file is read first every session): full scope evidence moved verbatim to `studio/STATUS_HISTORY.md`.
- Taste guard added to `studio/WORKFLOW.md`: two type families, no default decorations. Guidance only, no new step or check.
- False tool alarm fixed: the onset detector skipped the first 3 analysis frames, so an opening hit at t = 0 read as "1033 ms off"; now measured from frame 0, with a test that fails on the old code.
- `npm test`: 81 tests, 67 passed, 14 optional/browser skipped, 0 failed.

**Latest scope: DONE — Film 5, BALACONBAR Beni Suef, 25 s Reels ad (owner request 2026-10-02).**
- Source: `studio/film5/` (BRIEF, production.json, film.js, score.mjs, plates.mjs, crops.sh, LEDGER). ONE delivery: 9:16, 1080×1920, 30 fps, 25 s.
- Final take: `studio/out/film5/take04/` (local, not in git): master 141 MB + 11.45 MB share copy + poster.
- Technical gates: all PASS (−14 LUFS, TP −2.4, LRA 6.2, text inside the safe area). One separate critique pass (builder, no fresh reviewer) → one of two correction rounds → fixes checked on exported frames.
- Not verified: audio listening; human real-speed viewing; platform overlays. Owner items: confirm the vintage-board menu items, supply address/phone/handle/hours.
- Recipes in `studio/TECHNIQUES.md`, lessons 29–31 in `studio/CRAFT.md`, entry in `studio/CHANGELOG.md`.
- Main (PR #12) merged into the branch: 12 stills byte-identical before/after, 80 tests / 66 passed / 0 failed, `ownerRequest` added to the film 5 config. Next film 5 build re-renders (cache keyed on shared lib).

**Previous scope: DONE — Deep artistic, directorial and viewer-experience reference forensics.**
- Base: main at 8e6f09b, including the owner's showreel2 and documentation consolidation.
- Implemented: five-layer review protocol, 20-section ARTISTIC DNA, contextual evidence records, whole-film attention/pacing maps, playback/listening/unknown gates and original-subject direction transfer.
- Compatibility: old reviews remain valid, explicitly pending artistic interpretation. No reference artwork/media imported and no new film rendered.
- Owner goal: the Claude Code host performs every production step; one requested placement → one finished video. AUTONOMOUS_FILM.md and build-options ownerRequest enforce this without routine approval stops. Host model selection remains outside repository code.
- Owner-requested simplification: automatic private draft with real timing/candidate evidence; one observation routes into multiple report topics. No manual twenty-summary workload or invented judgments.
- Integration correction: CI run 37013165448 failed Chromium startup and timed out due to an existing app-capture server leak. Fixed startup/close cleanup, added failure regression and one bounded startup retry; final corrected-head CI required.
- Validation: final full suite passed: 80 tests, 65 passed, 15 optional/browser skips, zero failures; artistic/delivery/docs checks passed; final-head CI is required before publication. Final-head CI is the publication acceptance record. The artistic protocol structures reviewer judgment, not automatic psychology or retention measurement.

**Previous scope: DONE — Documentation and skills consolidation (owner request 2026-10-02).**
- New: `studio/CHANGELOG.md` (evolution log + skill changes), `studio/TECHNIQUES.md` (recipes with numbers), `studio/test/docs.test.mjs` (docs gate).
- Updated: CLAUDE.md, PLAN.md, README, WORKFLOW, SKILLS, GEN2, CRAFT (lessons 22–28), REFERENCE_LAB, ASSETS (table repaired, showreel + reference rows) and ten skills.
- Rule now enforced: a scope closes only with docs updated in the same commit; the gate checks skills, lib modules, film ledgers, fonts and STATUS date.
- `reference/lessons.json` stays empty (learn needs inspected motion playback; not available).

**Previous scope: DONE — Showreel 2, reference recreation (15 s, 16:9, 60 fps), owner request 2026-10-02.**
- Source: `studio/showreel2/` (BRIEF, production.json, film.js, score.mjs, measured music map, LEDGER). Reference pack is private (git-ignored).
- Final take: `studio/out/showreel2/take04/` (local, not in git): master 1920×1080 + 11 MB share copy.
- Technical gates: all PASS (15.00 s, 60 fps, −14.1 LUFS, TP −3.2 dBTP, LRA 3.5). New tested gate option `darkSpans`.
- Artistic: one independent critique → one of two correction rounds → fixes checked on take04 frames. Fidelity is structural, not pixel-exact.
- Not verified: audio listening; human real-speed viewing; loop seam; share copy by the critic. Owner decisions: wordmark/burst look and the "AVAILABLE FOR NEW PROJECTS" line.
- Studio additions: variable Archivo / Instrument Serif / Space Mono (OFL), SVG text tags in `motion.js`, `darkSpans`.

**Previous scope: DONE — Showreel integration snapshot and conflict resolution.**

- Fixed source snapshot: `7d5f966`; merge preserves both reference-lab and showreel history.
- Only conflict: this handoff file; keep both completed scopes and their evidence.
- Local unit verification: 66 tests, 51 passed, 15 skipped, 0 failures.
- Publication acceptance: [PR #10](https://github.com/coolman1984/Animation/pull/10) and both final-head Studio checks jobs are the source of truth. Merge only after both jobs pass; do not reopen this completed implementation scope.
- Showreel exports remain local to its production session; this merge includes source, not delivered videos.

**Completed scope: DONE — Studio showreel (15 s, 16:9 + 9:16), owner request 2026-10-02.**
- Source: `studio/showreel/` (BRIEF, production.json with creative block + cue sheet, film.js, score.mjs, measured music map, LEDGER).
- Final take: `studio/out/showreel/take07/` (local, not in git): masters 1920×1080 and 1080×1920 + 10 MB share copies.
- Technical gates: all PASS on both deliveries (15.00 s, 30 fps, −14 LUFS, TP −3 dBTP, LRA 4.9, text read-back clean).
- Artistic: one independent critique (SHIP WITH FIXES, 0 blockers, 5 majors) → one correction round → majors verified on
  take07 frames; the "Latin comma" finding was not reproduced (U+066B in both app and counter; typeface glyph). See LEDGER.
- Not verified: listening on headphones/phone; human real-speed viewing; live platform overlays on 9:16.
- Studio fixes made during this scope: read-back ignores hidden and mask-clipped text; counters caption their final value;
  calibrated contrast estimate; camera-whip blur profile.

**Completed scope: DONE — Reference Reverse Engineering Lab implementation and local integration.**

- Implemented: bounded local/direct/browser ingest, smart evidence sampling, full shot/transition
  records with coverage limits, optional optical flow/adaptive shots/music, compact numerical summaries,
  visual-review workflow, native blueprint, neutral 3–8s reconstruction, comparison and five conditional
  project skills. See `studio/REFERENCE_LAB.md`.
- Local unit verification: 66 tests, 51 passed, 15 skipped, 0 failed. Browser/optional tests are distinct.
- Actual Chromium reference integration: 1 passed, 0 failed. Decoded browser timestamp at 2.5s,
  a 150-frame native neutral reconstruction and matched comparison were exercised, not mocked.
- Scientific CI integration: OpenCV + PySceneDetect + librosa passed together in runs 36983529292
  and 36983994131; the final-head workflow associated with [PR #9](https://github.com/coolman1984/Animation/pull/9)
  is the publication acceptance source of truth. Merge only with both final-head jobs green.
- Two correction rounds resolved test media missing HTTP byte-range support, bounded transient
  seek waits, deterministic transition visibility, exact hard-cut timing and one-cell static evidence.
  Earlier failed runs are superseded by final-head verification; do not restart them.
- Visual skill evaluation opened actual overview/transition/evidence sheets. Still-only observations
  explicitly disclosed unplayed motion/audio; no artistic reconstruction certification was claimed.
- Machine reports remain provisional until actual visual review. Prose review alone does not approve
  a shot blueprint. Neutral studies are silent and original; reference media/brands/audio stay private.
- No further implementation or optional-polish queue remains in this scope. The merged PR/final-head
  checks certify publication; subsequent films/references are separate bounded user requests.

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
