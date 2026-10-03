# Studio status and session handoff

Updated: 2026-10-03. This is the current handoff; historical plans are not a task queue.

**Latest scope: DONE — Live-action toolkit: research + offline tools for real footage of real people (owner request 2026-10-03).**
- `studio/LIVE_ACTION.md` (research with sources, techniques, roadmap, limits); `tools/live.py` (VAD, Whisper turbo, script word alignment, MediaPipe mattes, face/pose anchors, free space, 9:16 reframe, preview, scratch TTS); `lib/edl.mjs`, `lib/dialogue.mjs`, `lib/footage.js`; skill `live-action-editor`.
- Proof `studio/live1/` (12 s 9:16, CC BY 4.0 footage): all gates PASS on take03 (local); measured word timing median 0.03 s; ducking > 4 dB under speech.
- Capture robustness: async film render awaited, `screenshot()` retry, canvas outline (CSS drop-shadow stack froze capture).
- Not verified: listening, real-speed human viewing; heavy models (SAM 2, MatAnyone, CoTracker, ProPainter, RIFE, DeepFilterNet) are roadmap (hosts blocked).
- `npm test`: 109 tests, 93 passed, 16 skipped, 0 failed; `STUDIO_RENDER_TEST=1` render+examples+live: 15 passed, 1 optional skipped; `LIVE_PYTHON_TEST=1` word timing passed.

**Previous scope: DONE — Film 6 knowledge captured: QUALITY_PLAYBOOK.md, lib/uimorph.js, tools/logo_trace.py (owner request 2026-10-03).**
- Playbook linked from WORKFLOW/SKILLS/CLAUDE.md/film-director; kit extracted from film 6 with 6 unit tests; tracer validated on the owner logo (1,699 particles, check image).
- Then PR + merge to main as requested.
- `npm test`: 100 tests, 86 passed, 14 skipped, 0 failed.

**Previous scope: DONE — Film 6, Pixel Plus «بكسل واحد», 30 s Facebook Reels showreel-ad (owner request 2026-10-03).**
- Source: `studio/film6/` (BRIEF, production.json, film.js, score.mjs, logo_trace.py, LEDGER). ONE delivery: 9:16, 1080×1920, 30 fps, 30.00 s.
- Final take: `studio/out/film6/take08/` (local, not in git): delivered share copy 13.66 MiB + 29 MB master + poster.
- Technical gates: all PASS (−13.8 LUFS, TP −2.0, LRA 4.1, 16 text lines inside the safe area, end hold declared). Separate critique pass (builder; no subagent without an owner request) → 2 of 2 correction rounds → fixes checked on the exported mp4s.
- Studio changes: `lib/review.mjs` ENOBUFS fix (+ regression test), opt-in `config.dither` / `encodeFilter()` in `lib/render.mjs` (+ test), Alexandria font in `lib/composer.html`, docs gate covers woff2.
- Not verified: listening; human real-speed viewing; fresh reviewer; live Facebook overlays and re-encode. Spelling follows the logo (Pixel Plus).
- `npm test`: 94 tests, 80 passed, 14 skipped, 0 failed.

**Previous scope: DONE — Precise forensics tools: motion timing, easing curves, measured music (owner request 2026-10-02).**
- New `studio/tools/motion_curves.py`, `studio/tools/audio_deep.py`, `studio/reference/forensics.mjs`; commands `node reference.mjs timeline|strip|track|audio`.
- Validated against clips with known answers (`studio/test/forensics-tools.test.mjs`): keyframes within one frame, easing family and spring params, tempo/key/chords/drums recovered.
- Optional modules installed here (OpenCV, PySceneDetect); the doctor lists them; CI's Python job installs them. Container installs are not persistent.
- Not possible here: speech transcripts (model hosts blocked by the network policy); listening for taste.
- `npm test`: 92 tests, 78 passed, 14 skipped, 0 failed.

**Previous scope: DONE — Reverse-engineered a SaaS UI promo; product-UI motion kit added (owner request 2026-10-02).**
- New `studio/lib/uimotion.js` (12 pure functions, 8 unit tests) + `studio/examples/ui-motion-study` (passes the real-browser forward/reverse determinism test). Observed move table in `studio/TECHNIQUES.md`.
- Studio bug fixed: audio longer than picture crashed `reference.mjs analyze`; regression test added.
- Not verified: the reference's motion and audio were not played (stills + numbers only); no film produced.
- `npm test`: 90 tests, 76 passed, 14 optional skipped, 0 failed; real-browser examples test 4/4.

## Closed scopes (newest first; evidence in `studio/STATUS_HISTORY.md` and `studio/CHANGELOG.md`)
| Scope | Result |
|---|---|
| Live-action toolkit + `live1` study | DONE, PR to main |
| Film 6 knowledge: playbook, `lib/uimorph.js`, `tools/logo_trace.py` | DONE, PR #15 merged |
| Film 6 — Pixel Plus 30 s Facebook Reels showreel-ad | DONE, branch; take08 local, 2 of 2 correction rounds |
| Precise forensics tools (motion timing, easing, measured music) | DONE, branch |
| SaaS UI promo reverse-engineered, `lib/uimotion.js` | DONE, branch |
| Project optimisation and taste guard | DONE, branch commit 68bf150 |
| Film 5 — BALACONBAR Beni Suef 25 s Reels ad | DONE, PR #13; take04 local, 1 of 2 correction rounds |
| Deep artistic reference forensics + autonomous single-video policy | DONE, PR #12 (`AUTONOMOUS_FILM.md`, `ownerRequest`) |
| Documentation and skills consolidation (docs gate) | DONE, PR #11 |
| Showreel 2 — reference recreation 15 s 16:9 60 fps | DONE, PR #11 |
| Showreel 1 — 15 s, 16:9 + 9:16 | DONE, PR #10 |
| Reference Reverse Engineering Lab | DONE, PR #9 |
| Generation 2 consolidation | DONE, PR #7 |

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
