# Studio status and session handoff

Updated: 2026-10-02. This is the current handoff; historical plans are not a task queue.

**Latest scope: DONE — Reverse-engineered a SaaS UI promo; product-UI motion kit added (owner request 2026-10-02).**
- New `studio/lib/uimotion.js` (12 pure functions, 8 unit tests) + `studio/examples/ui-motion-study` (passes the real-browser forward/reverse determinism test). Observed move table in `studio/TECHNIQUES.md`.
- Studio bug fixed: audio longer than picture crashed `reference.mjs analyze`; regression test added.
- Not verified: the reference's motion and audio were not played (stills + numbers only); no film produced.
- `npm test`: 90 tests, 76 passed, 14 optional skipped, 0 failed; real-browser examples test 4/4.

**Previous scope: DONE — Project optimisation and taste guard (owner request 2026-10-02).**
- Review evidence after every review/final export now extracts frames in parallel (bounded pool of 4): 103.6 s → 71.1 s on film 5's master, all 96 evidence files and review.json byte-identical.
- STATUS.md compacted (this file is read first every session): full scope evidence moved verbatim to `studio/STATUS_HISTORY.md`.
- Taste guard added to `studio/WORKFLOW.md`: two type families, no default decorations. Guidance only, no new step or check.
- False tool alarm fixed: the onset detector skipped the first 3 analysis frames, so an opening hit at t = 0 read as "1033 ms off"; now measured from frame 0, with a test that fails on the old code.
- `npm test`: 81 tests, 67 passed, 14 optional/browser skipped, 0 failed.

## Closed scopes (newest first; evidence in `studio/STATUS_HISTORY.md` and `studio/CHANGELOG.md`)
| Scope | Result |
|---|---|
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
