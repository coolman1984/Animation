# Studio status and session handoff

Updated: 2026-10-07.

**Latest scope: DONE — Film 14 v3 (owner 2026-10-07): rebalanced score (spectrum measured), title in front of the host. take05 every gate PASS. Not verified: listening.**

**Previous scope: DONE — Film 14 v2 (owner 2026-10-07): official logos from his screenshots, recorded CC0 orchestra anthem (VSCO 2 CE), new host ending with the title behind him. take04 every gate PASS. Not verified: listening.**

**Previous scope: DONE — Film 14, «اتكلم كورة» 2D football motion showreel, 20 s Facebook Reels 1080×1920 (owner request 2026-10-07, replaces film13's rejected 3D).**
- `studio/film14/` (BRIEF with result sources, production.json, config, timing.js, film.js DOM/SVG, score.mjs, LEDGER). Final take02 (local): every export gate PASS, share 13.95 MB.
- Owner decision open: official club/league crests (none supplied; names + colours + original roundels used). Not verified: listening, real-time phone viewing.

**Previous scope: DONE (rejected by the owner: "the 3D is very bad") — Film 13, «اتكلم كورة» 3D/2D football-show showreel, 20 s Reels 1080×1920 (owner request 2026-10-07).**
- `studio/film13/` (BRIEF, production.json, config, timing.js, film.js Three.js + SVG/DOM, score.mjs, LEDGER). Final take01 (local, not in git): every export gate PASS, share 13.67 MB.
- Owner note applied: the only words are «اتكلم كورة»; host footage re-cut to a text-free span. Not verified: listening, real-time phone viewing.

**Previous scope: DONE — Film 12, «مخطط المساحات» 3D motion showreel, 20 s Reels 1080×1920 (owner request 2026-10-07).**
- `studio/film12/` (BRIEF, production.json, config, timing.js shared clock, film.js real Three.js + DOM copy, score.mjs, LEDGER). Final take04 (local, not in git): every export gate PASS, share 13.59 MB.
- One hero (the app's cut plane); plan and room areas measured from the owner's screenshot; logo shown whole; poster CTA. Two correction rounds used (take01 text gate, take03 freeze + hidden-chip label).
- Not verified: listening and real-time phone viewing.

**Previous scope: DONE — deep production-path code review and fixes (owner 2026-10-04).**
- Fixed gate propagation/stale delivery, malformed clocks/specs, silent NaN audio, asset traversal/cache handling, narration caching/Windows launcher, scene cuts/morph continuity, format overrides, music phase/media metadata, bounded workers and browser startup deadlines.
- Evidence: focused checks 37 passed/2 optional fixtures skipped; docs 5 passed; showreel check-only pipeline passes. Seven regression failures reproduced before fixes. Details: `studio/CODE_REVIEW_2026-10-04.md`.
- Existing take02 exports predate these source fixes; no new full render. Real Whisper, listening and browser failure injection remain unverified. Work stays on the isolated integrated branch; original user edits/media preserved.


**Previous scope: DONE — FORM / FUNCTION creative engineering showreel (owner 2026-10-04: understand expertly, sync main/latest branch, GO ALL OUT).**
- Isolated branch `codex/innovation-showreel` contains `origin/main` 28099b7 and latest studio branch 431dbc2. Original dirty checkout preserved; no push/publication.
- Film source: `studio/studio-engine/films/form-function/` (spec, brand, BRIEF, CASE_STUDY, LEDGER). Eight movements, one procedural ribbon, original interface concept and score; 32 seconds landscape.
- New reusable ribbon and cursor modules; optional geometric wipe and vignette suppression. Windows asset/output discovery fixes; literal-background contrast; creative metadata forwarding; failed builds cannot reuse an earlier take as the delivery.
- Mandatory Chrome helper extended with an isolated studio profile/CDP mode, source backup retained locally. Production attached through STUDIO_CDP_URL, one memory-planned worker.
- Verification: 8 targeted tests passed, 1 optional fixture skipped; 24 stills and dense text zero issues; 8-second proof every gate PASS. Final take02: 32.000 s, 1920x1080, 30 fps; -14 LUFS, TP -7.4 dBTP, LRA 2.1 LU; 11 export gates PASS; dense text zero issues.
- Separate judging pass: exported contact sheet, boundary strips and full-resolution type/material inspected. No unresolved blocker/major. Listening and real-time human playback remain unverified. Numerical synchronization summary was 0 eligible hard-hit events; no audible-onset validation claimed.

**Previous scope: DONE — Studio Engine (owner order 2026-10-04): `studio/studio-engine/` — brand kit, 18-module motion library, spec player, score engine (synth or supplied music + voice with auto tempo/word timing), gates (lint, stills, dense text, sync, motion), one command `node studio-engine/run.mjs <film>`. Proof: AI × HR rebuilt from a spec, youtube + reel, every gate PASS, motion 106 % of the hand-coded original. Not verified: Higgsfield assets (MCP not connected), listening. Guide: `studio/studio-engine/STUDIO.md`.** This is the current handoff; historical plans are not a task queue.

**Previous scope: DONE — Film 11 v2 (owner 2026-10-04: slower, readable, hosts longer, catchier music): 44 s, 120 BPM, 1080p30, take07 delivered. Gates PASS except the text gate (367 kinetic-overshoot/overlap boxes, same cause as v1). Not verified: listening.**

**Previous scope: DONE (delivered on owner's "now") — Film 11, AI × HR workshop showreel, 25 s, 1920×1080 (owner request 2026-10-04).**
- `studio/film11/` (BRIEF, production.json, config, timing.js shared clock, film.js real CSS 3D, score.mjs 144 BPM, LEDGER). Final take06 (local): 30 fps (owner asked 60, then asked for it immediately; 60 fps renders kept stalling in the heavy 3D title).
- Gates: size, fps, duration, −14.1 LUFS, TP −4.8, LRA 3.7, no frozen span, no black frames, share 38.8 MB PASS; **text gate FAIL (185 boxes, mostly slammed words measured at their entry overshoot)** — delivered anyway on the owner's order. Visible flaw: "aTraining" spacing. Delivered copy re-encoded to 24 MB for the chat upload limit.
- Render tool: a stalled capture now reopens the page and continues the slice (`lib/render.mjs`). Not verified: listening, real-speed viewing, a 60 fps export.

**Previous scope: DONE — Film 9 v3: chair scene = a low wavering warning bell (owner 2026-10-03; v2 foley rejected).** Rest unchanged. take07 all gates PASS. Not verified: listening.

**Previous scope: DONE — The SANAD/films-6–9 branch merged into main as the house method (owner order 2026-10-03).**
- `CLAUDE.md`, `QUALITY_PLAYBOOK.md` §0 "Owner taste", `film-director` and `sound-designer` now make this branch's taste, lessons and recipes authoritative for creative work.
- Merge kept main's platform work (studio.mjs, Windows port, render stability, voice department). Main's unfinished 3-min Pixel Plus presentation was renumbered `film7` → `film10` (SANAD keeps `film7`).
- `npm test` after the merge: 114 tests, 100 pass, 13 skipped, 1 fail — `platform.test.mjs` worker-planning expectation; it fails identically on main alone (machine-dependent memory/CPU), not caused by the merge.

**Previous scope: DONE — Film 9, NeuroAnara «Decode the Case», 20 s Reels, no music (owner request 2026-10-03).**
- `studio/film9/` (BRIEF, production.json, config, film.js, score.mjs = effects only, LEDGER). Final take04 (local): all gates PASS, share 9.8 MB. Lora (OFL) vendored.
- Not verified: listening, real-speed phone viewing.

**Previous scope: DONE — Film 8, Pixel Plus formal factory pitch, 25 s 16:9 (owner request 2026-10-03).**
- `studio/film8/` (BRIEF with the reference-order table, production.json, config, film.js, score.mjs, LEDGER). Final take04 (local): all gates PASS, share 13.5 MB.
- Only the owner's real client (Samsung Electronics Egypt, TV + mobile plants) named, as text; no third-party logos. Not verified: listening, real-screen viewing.

**Previous scope: DONE — Film 7 revision: logo-building section removed, 15 s (owner 2026-10-03: "the logo build is very ugly").**
- Finished logo now pops in whole at 7.5 over the service rows; lock-up 10–15. Score spliced on the bar line. Final take09 (local): all gates PASS, share 9.64 MB. Not verified: listening.

**Previous scope: DONE — Film 7, SANAD «معاك سند», 25 s Reels ad (owner request 2026-10-03).**
- Source: `studio/film7/` (BRIEF, production.json, config, film.js, score.mjs, icon_trace.py, LEDGER). ONE delivery: 9:16, 1080×1920, 30 fps, 25.00 s (no placement named → studio default).
- Final take: `studio/out/film7/take08/` (local, not in git): share copy 11.61 MB + master + poster. All technical gates PASS (−13.9 LUFS, TP −3.4, LRA 3.3, 24 text lines in the safe band); 2 of 2 correction rounds used.
- Not verified: listening to the score (measured: 95.94 BPM, C major), real-speed viewing on a phone, a fresh reviewer, live Meta overlays/re-encode. Brand conflicts (3 icons, 2 descriptors) are listed in the BRIEF for the owner.
**Parallel scope (other branch): IN PROGRESS — Film 10 (was film 7 on that branch), Pixel Plus company presentation, 3:00 YouTube 1920×1080 (owner request 2026-10-03: light theme, classy Arabic, elegant low Western music, Samsung Electronics Egypt year of work, projects focus, "GO ALL OUT").**
- Source `studio/film10/` (BRIEF, production.json, timing.js shared clock, film.js nine chapters incl. a real-3D factory chapter, score.mjs original 80 BPM piano/harp/strings at −18 LUFS, LEDGER). Logo traced from the owner's file (13 parts, 1,699 particles).
- Stills reviewed in five batches; builder fixes and an art-direction pass are in LEDGER.md. Full-length draft render: in progress through `node studio.mjs build film10 --range=0:180` (1 worker: see below). Next: watch the draft, correction round, review build with sound, final.

**Latest scope: DONE — Render stability after two renders crashed the host session (owner order 2026-10-03: "fix the problem that keeps hanging and closing this session").**
- Cause: Windows commit exhaustion (fixed 2 GB page file; ~2–3 GB commit free) with six 1080p SwiftShader Chrome workers, plus 32 orphan Chrome processes and a hung node left by each crash.
- Fixes: memory-sized workers (`plannedWorkers`), browser registry + orphan reaping (`lib/procs.mjs`, `studio.mjs cleanup`), CDP deadlines and abort-on-exit, resume from complete slices, crash-safe build logs, `studio.mjs build` as the only way to render long films, lazy 3D chapter in film7. Details: `studio/TECHNIQUES.md` → "Memory, crashes and hangs".
- On this machine today: 1 render worker. The owner can raise it to 3–4 by setting the Windows page file to system-managed (doctor row "Memory headroom").
- Verified: syntax, fast tests, cleanup, planner decision, lazy-vs-eager pixels. Not verified: a complete render through the new path (the film10 (ex-film7) draft is the first).

**Previous scope: DONE — Browser attach mode, colour management, playback review, voice & sound department (owner request 2026-10-03).**
- **Browser:** the default stays private headless Chrome. `STUDIO_CDP_URL` attaches to a launcher-started Chrome through an isolated context; verified it never closes the owner's browser or tabs. One film = one mode.
- **Colour:** `node studio.mjs color check|scopes|range`, `config.lut`, `tools/ocio_bake.py`; scopes appear in every review gallery. Export accuracy: ΔE mean 0.70 (0.54 with dither).
- **Review:** `node studio.mjs review <film>` opens the playback player: frame steps, timeline, waveform, A/B, timed notes, approval bound to the file hash.
- **Voice & sound:**
  - Department guide `studio/VOICE_STUDIO.md`, skill `voice-director`.
  - Offline speech models downloaded (Whisper turbo, Piper, Silero via PyPI, diarization models).
  - Commands: `studio.mjs voice|transcript|mixcheck|sounds`.
- **Verification:** fast tests 30/30 in 6 s, plus the targeted real runs listed in CHANGELOG.
- **Not verified:** cloud voices (need API keys), listening judgement, attach mode with the owner's actual launcher.
- **To enable a production voice:** set `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (native Egyptian), or `OPENAI_API_KEY` / `ELEVENLABS_API_KEY`, then run `node studio.mjs voice status`.

**Previous scope: DONE — Studio platform v1 + audit fixes (owner request 2026-10-03: apply the platform vision, artistic forensics and the audit report, keep it simple).**
- Front door `studio/studio.mjs` (`caps`, `new`, `route`, `setup`, `doctor`). Capability registry `studio/capabilities.json` (25 entries, maturity CORE → LEARN, setup profiles, graduation rule) via `lib/capabilities.mjs`. Architecture `studio/PLATFORM.md`. Per-shot `craft.layers` drive the engine router.
- New engines: Three.js 0.186.1 and PixiJS 8.22.0, vendored by `setup gpu` and imported by name through the composer import map. Both are EXPERIMENTAL after studies (`examples/three-study`, `examples/pixi-study`) rendered identical PNG hashes in separate runs and were inspected. OpenColorIO/OpenImageIO/OpenEXR are installed (PLANNED, no adapter yet).
- Research department: skill `technology-scout` + dated `studio/TECH_RADAR.md`. Craft and trends are kept apart.
- Artistic forensics (5 layers, 20-section Artistic DNA) was already implemented (`ARTISTIC_FORENSICS.md`); it is now linked from PLATFORM.md.
- Audit fixes (each with a test in `test/audit-fixes.test.mjs`):
  - B01/B02: preview-server traversal and malformed URLs.
  - B03/B04: validator crashes.
  - B10: an unchecked text gate now shows UNCHK and is listed in the verdict.
  - B11: `poster: 0`.
  - B12: impossible share budgets.
  - R08: safe tar extraction.
  - app-capture no longer launches `chrome --version` (it opened a window on Windows).
- Verification: fast targeted tests only (testing policy) — 25/25 in 6 s, plus study renders and `new`/`route` smoke checks. Not verified: a full slow suite or a real film with the new engines (deferred to the next real video).
- Open question for the owner: the audit (B09) mentions a Chrome-launcher policy that forbids direct Chrome/Edge launches. The studio launches a private headless Chrome per render; it was not changed, pending the owner's answer.

**Previous scope: DONE — Windows port, speed-ups and testing policy (owner request 2026-10-03: "fix and improve", "make tests shorter", "never run slow tests unless producing a real video").**
- The studio now runs on the owner's Windows machine. A real showreel draft rendered with the installed Chrome (frame checked, Arabic shaped correctly). All OS differences are in `studio/lib/platform.mjs`, guarded by `test/platform.test.mjs`. Details: `studio/TECHNIQUES.md` "Cross-platform".
- Cross-platform bugs fixed:
  - Worker joins drifted up to 1 ms each (B-frame edit lists in a 1000 timescale).
  - The last-frame still returned nothing (silent PNG failure).
  - Chromium shutdown orphaned profiles (69 folders / 746 MB removed) and stalled node ~17 s.
  - Python tools crashed on non-ASCII output.
  - `rm`/`mv`/`/dev/null`/FFmpeg glob/Fontconfig failures.
- Duration gate tightened from ±10 % to one frame + 30 ms.
- Speed: the cause was ~1 s per process launch on this machine. A fresh 4 s review build went from 61 launches / 78 s to 24 / 46 s (one-decode review evidence, one-pass measurements, reused tool check, one-process syntax check).
- Optional tools installed on this PC: forensics + live-action Python packages (one OpenCV) and the logo tracer. Live-action ML models (~1.4 GB) were NOT downloaded.
- Testing policy: written in `CLAUDE.md`, `studio/WORKFLOW.md` and `studio/README.md`. `npm test` = quick suite, `test:all` = CI unit suite, `test:render` only while producing a real video.
- Verification:
  - Last complete `test:render` run, before the speed-ups and policy: 112 tests, 108 passed, 0 failed, 2 cancelled by time-outs (evidence/pipeline builds on this slow-launch machine).
  - After the speed-ups: targeted checks only — combined measurements identical to the separate ones on a clip with black + frozen spans; review images inspected; 60/60 frames on the grid with 4 workers.
  - A further full run was stopped at the owner's order (40 passed; 2 time-outs under 3-file concurrency, which was dropped).
- Not verified: a complete slow suite after the speed-ups (deferred to the next real video production by policy); listening; GitHub CI.

**Previous scope: DONE — Deep app study on the owner's Windows checkout (owner request 2026-10-03).** Map: `studio/APP_MAP.md`; its portability findings were fixed in the scope above.

**Previous scope: DONE — film6 (Pixel Plus ad) music v2 (owner 2026-10-03: the ugly-music note meant this film).**
- `film6/score.mjs`: energetic 120 BPM dance-pop with one recurring hook, pumping chords, builds into each drop; foley unchanged.
- take09 final: all gates PASS; measured 120.0 BPM. Not verified: listening.

**Previous scope: DONE — live1 music v2 (owner 2026-10-03: "music very bad and ugly", wants energetic catchy Western beats).**
- `live1/score.mjs`: 133⅓ BPM tech-pop bed locked to the cuts (bar = 1.8 s), hook, tape-stop on the freeze, drop on unfreeze; voice still ducked.
- take04 final: all gates PASS; measured tempo 132.86 BPM. Not verified: listening.

**Earlier scope: DONE — Live-action toolkit: research + offline tools for real footage of real people (owner request 2026-10-03).**
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

**Audit report scope: DONE (2026-10-03).** Root report: `STUDIO_AUDIT_AND_TECHNOLOGY_REPORT_2026-10-03.md`.
Reviewed a 225-file code snapshot, reproduced server/validator/OTIO defects, researched studio technologies through October 3, and documented priorities, licenses and hardware limits. Snapshot tests: 112 total, 91 passed, 4 failed, 1 cancelled, 16 skipped; one failure was snapshot font setup, corrected by a 5/5 documentation check. Later current platform/documentation checks passed 7/7 and the corrected audio analyzer passed 1/1. The isolated snapshot reference test still timed out at 120 seconds. Browser rendering and advanced model workflows remain unverified. Report local links and formatting were checked. Concurrent implementation edits are outside this completed report scope.

| Scope | Result |
|---|---|
| Film 9 — NeuroAnara 20 s Reels (no music) | DONE, branch; take04 local |
| Film 8 — Pixel Plus factory pitch 25 s 16:9 | DONE, branch; take04 local |
| Film 7 — SANAD Reels ad (25 s, then cut to 15 s on owner feedback) | DONE, branch; take09 local |
| Engineering audit and October 2026 technology report | DONE; root Markdown report |
| Browser attach mode, colour, review player, voice & sound department | DONE, local commit |
| Studio platform v1 (registry, router, Three/Pixi, scout) + audit fixes | DONE, local commit |
| Windows port, speed-ups, testing policy | DONE, local commit |
| Deep app study (APP_MAP.md) | DONE, local commit |
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
