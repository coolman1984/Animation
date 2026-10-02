# Studio status and session handoff

Updated: 2026-10-02. This is the current handoff; historical plans are not a task queue.

## Current scope

- **Implemented:** Generation 2 motion, camera, transitions, typography, layout, particles,
  shaders, music analysis, SFX cues, review evidence, real-app capture, layer plates and engine adapters.
  See `studio/GEN2.md` for the inventory.
- **Unit verification:** `npm test`: 60 tests, 47 passed, 13 skipped, 0 failed.
  Browser checks and optional Python/librosa checks are not covered by this unit result.
- **Browser verification:** pending the pull request's `Studio checks` workflow.
  The local checkout has no Chromium executable. Do not repeat the same local render command
  until a browser becomes available; use the CI evidence instead.
- **Films 2–4:** preserve their existing source and delivery ledgers. Film 4's previous
  delivered take is recorded in `studio/film4/LEDGER.md`; it is not a new render of Generation 2.
  Client photos, derived plates, licensed audio and exports stay outside public git.
- **Branch consolidation:** `main` already exists and is the default branch. The active Claude
  Generation 2 branch is being merged into it through a pull request. Earlier Claude branches
  have already been included in `main`.

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
6. Check a remote workflow only while its run is queued/in progress and within its configured
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
