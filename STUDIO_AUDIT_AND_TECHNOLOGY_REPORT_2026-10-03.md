# Animation Studio: engineering audit, missing capabilities, and technology roadmap

**Research cutoff: October 3, 2026. Repository: `coolman1984/Animation`. Base commit: `eb2a6c4`.**

## 1. Decisions to make first

The project already has a useful foundation: deterministic animation code, shared picture/sound cues, automated rendering, delivery profiles, reference analysis, and evidence-based review. Its largest opportunity is to turn these pieces into a dependable production pipeline with editable timelines and specialist tool adapters.

The first investment should be reliability, timeline correctness, media management, and review. These unlock more work than installing many AI models. The next investments should be dependable Arabic captions, tracking/matting, color management, and reusable 3D/motion assets.

| Order | Decision | Reason |
| --- | --- | --- |
| 1 | Fix the confirmed server, validation, Windows, and export defects | Existing functions can fail or produce misleading results before new features matter |
| 2 | Build one job runner and one timeline model | Rendering, editing, audio, captions, cut-downs, and export need the same timing and failure rules |
| 3 | Create reproducible Python environments and a tool/model registry | Packages, model weights, GPU requirements, and licenses currently need stronger control |
| 4 | Build a playback review console and explicit approval records | Stills and technical measurements cannot establish motion, dialogue, pacing, or artistic quality |
| 5 | Pilot Blender, OTIO, CPU transcription, and a Vulkan interpolation tool | These address actual gaps and have plausible paths on this Windows workstation |
| 6 | Evaluate advanced segmentation, matting, depth, and generative video in isolated pilots | Several require CUDA hardware or have restrictive model licenses |

**Recommended product direction:** keep the native JavaScript composer as the default for product explainers, Arabic typography, UI films, and controlled graphics. Add Blender/Resolve/specialist rendering through adapters. Make footage editing and review first-class workflows. Do not begin with a wholesale renderer rewrite.

## 2. Scope, evidence, and limits

This is a broad audit, not a guarantee that every possible defect has been found. Findings are separated into reproduced defects, source-inspected risks, observed test failures, and missing capabilities. No production code was changed by this audit and no third-party tool/model was installed as part of it.

The working tree contained ongoing Windows fixes and changed further during the review. A SHA-256 manifest and a text-code snapshot were captured at **2026-10-03 07:03:57 UTC**. Findings below refer to that snapshot unless explicitly marked as a later working-tree observation. Read the current source before applying a fix.

Local evidence, intentionally under the ignored `studio/takes` directory:

- [Snapshot manifest](studio/takes/audit-20261003-0702/manifest.json): reviewed paths and hashes.
- [Full test transcript](studio/takes/audit-20261003-0702/test-suite.txt).
- [Isolated probes](studio/takes/audit-20261003-0702/probes.mjs) and [results](studio/takes/audit-20261003-0702/probe-results.json).
- [Isolated reference-test transcript](studio/takes/audit-20261003-0702/reference-isolated.txt).
- [Application map](studio/APP_MAP.md): architecture and entry points from the preceding study.

These ignored evidence files are available locally but will not accompany a normal Git clone. The important results are reproduced in this report. Private input videos and client assets were not published. The server probe used generated harmless fixtures only.

Browser rendering was not executed in this audit. The current renderer directly starts a browser process, which conflicts with the owner's mandatory Chrome launcher policy. Thus pixel determinism, real motion playback, GPU performance, and end-to-end final delivery remain unverified here. Browser-specific skips must not be interpreted as passing checks.

### 2.1 What the app is today

The main workflow is `studio/make.mjs`: load a film config and production plan; preflight; generate/cache score; render silent picture; read DOM text; assemble/master audio; mux; measure; generate review evidence; write a delivery report. Films are JavaScript modules exposing a seekable `renderAt(t)` through `lib/composer.html`.

`lib/edl.mjs` provides speech ranges, transcript cuts, source-time mapping, punch-ins, caption pages, and an OTIO writer. `tools/live.py` is a separate Python footage preparation/analysis route. `studio/reference` analyzes reference media with bounded subprocesses and optional scientific tools. `lib/engines.mjs` already permits an external silent-picture renderer.

The app is primarily an agent-operated code studio. It does not yet provide the complete interactive timeline, media bin, correction tools, collaboration, and finishing controls of a general NLE.

### 2.2 Workstation and dependency observations

| Item | Observed | Meaning |
| --- | --- | --- |
| OS | Windows; project path contains spaces | Windows and Unicode paths need real integration coverage |
| Node | 25.2.1 locally; CI specifies Node 22 | Test both the supported baseline and a pinned local runtime |
| Python | 3.12.10 | Defaults for text encoding and archive extraction matter |
| FFmpeg | 9.0.1 full build observed | Available capabilities still need filter/encoder probes; version alone is insufficient |
| GPU exposed by Windows | Intel Iris Xe Graphics | CUDA-only project requirements cannot be satisfied by this adapter |
| GPU memory | Windows reported `AdapterRAM` near 2 GiB | This field is not a reliable dedicated VRAM capacity for integrated graphics; do not use it as a purchase/performance estimate |
| Git and uv | Available | Use uv to produce repeatable environment profiles |
| Blender / ImageMagick | Not found on PATH in the inventory | This does not establish that no GUI installation exists elsewhere |
| Optional Python modules | NumPy, ONNX Runtime, SciPy, cv2, librosa, MediaPipe, sherpa-onnx, soundfile, scenedetect, OTIO became discoverable during the audit | Module discovery is weaker than successful imports, compatible versions, available models, or a completed workflow |
| PyTorch | Not discoverable in the inspected interpreter | Do not treat PyTorch/CUDA model pipelines as ready |

The environment was changing: an earlier probe lacked many optional packages. Accordingly, **installing every item in the old missing-package list is not a justified next step**. First record versions, execute capability probes, and lock a working combination.

The current `gpu:true` render option selects **SwiftShader software WebGL** through `GPU_ARGS`; it is not evidence that Iris Xe hardware acceleration is being used. Keep deterministic software rendering as a declared mode and benchmark a separate hardware mode before promising WebGPU/GPU speed improvements.

## 3. Test results

The snapshot's default `npm test` run reported:

| Result | Count |
| --- | ---: |
| Tests | 112 |
| Passed | 91 |
| Failed | 4 |
| Cancelled | 1 |
| Skipped | 16 |
| Runtime | 274.14 seconds |

One of the four failures was an **audit setup error**: binary font assets were copied after the documentation test had already inspected the snapshot. After copying the font folder, all five documentation tests passed. That missing-font result is not counted as an application defect.

The other three failures were:

1. Audio deep analysis: `UnicodeEncodeError` writing a Markdown approximation symbol through Windows cp1252.
2. Platform helper test: `browserCandidates({})` returned an empty array on Windows, contradicting the test's assertion.
3. Portability scan test: the scanner flagged the intentional `python3` fallback inside `platform.mjs` itself.

The cancelled test was the local reference integration test, which exceeded its 120-second deadline. An isolated run was started to distinguish a persistent pipeline timeout from full-suite contention; see the final evidence note below. Do not classify a timeout as an algorithm error without that distinction.

Earlier, before newer Windows changes, the live repo's suite had 109 tests, 87 passes, 3 failures, and 19 skips. Those three failures concerned FFmpeg Fontconfig contact-sheet generation. The reviewed snapshot supplies a bundled font and explicit working directory, so those older errors should not simply be carried forward as unfixed.

## 4. Findings: reproduced defects and visible contract problems

Priority definitions: **P1** blocks trustworthy production, exposes unintended local files, or corrupts a handoff; **P2** causes avoidable failure or incorrect workflow behavior; **P3** is lower-impact usability or maintainability work. No P0 remote exploit or universal data-loss event was established.

### B01 — P1 — Preview server permits a sibling-directory escape

**Evidence:** [serve.mjs](studio/lib/serve.mjs), path construction and `startsWith(root)` check. A generated root named `root` and sibling `root-private` were created under the audit fixture. Requesting `/%2e%2e%2froot-private%2fprobe.txt` returned HTTP 200 and `AUDIT-FIXTURE-ONLY` from the sibling.

**Cause:** a string-prefix check accepts paths sharing the root's textual prefix. It does not establish containment.

**Fix:** resolve the root; validate `path.relative(root, candidate)` using path components; validate the real path against the real root to address symlinks/junctions; return 403 outside it. Catch decoding errors. Keep the loopback binding.

**Acceptance:** normal nested files work; encoded traversal, shared-prefix siblings, Windows drive changes, and junction escapes are rejected. The current server is bound to `127.0.0.1`; this audit does not claim Internet exposure.

### B02 — P2 — Malformed URL decoding can escape server error handling

**Evidence:** `decodeURIComponent(...)` executes before the callback's `try` block in [serve.mjs](studio/lib/serve.mjs). A malformed percent escape throws a URI error. This is a source-inspected error path; the live app process was not deliberately crashed.

**Fix:** place URL parsing/decoding/containment in the protected block and respond with 400 for malformed input. Register server startup/error handling so a failed listener rejects startup.

**Acceptance:** malformed URLs cannot terminate or leave an unhandled rejection in the server.

### B03 — P2 — Null typography crashes the creative validator

**Reproduced:** `validateCreative({duration:10, creative:{typography:null}})` throws `TypeError: Cannot read properties of null (reading 'display')`. [creative.mjs](studio/lib/creative.mjs) tests `typeof` but does not reject null first.

**Fix:** validate a non-null, non-array typography object before its fields. Return diagnostics for malformed data.

**Acceptance:** null, arrays, strings, and empty objects yield useful validation errors, never unexpected exceptions.

### B04 — P2 — Invalid shots crash cue validation after production validation already detects them

**Reproduced:** `validateProduction({shots:[null], cues:[]})` throws while reading `s.id`; `{shots:{}, cues:[]}` throws because `.map` is unavailable. [cues.mjs](studio/lib/cues.mjs) reconstructs the shot map without guarding the input.

**Fix:** share validated shape checks and only build maps from valid shot objects. A malformed plan should produce a list of diagnostics.

**Acceptance:** invalid shot structures, duplicate IDs, null cues, and unrelated valid fields are processed without crashing.

### B05 — P1 — OTIO export changes the edit's meaning

**Reproduced:** two 2-second source ranges, laid at film time 3 seconds and played at 2× speed with a -0.2-second audio lead, become two consecutive 2-second clips on both exported tracks. There is no leading gap, no time effect, and no independent audio positioning. [edl.mjs](studio/lib/edl.mjs), `toOTIO`, uses source in/out for both tracks and emits empty effects.

**Impact:** an exported file can parse successfully while producing the wrong duration, timing, and sound edit. Claims that all target editors import it correctly need adapter/version-specific verification.

**Fix:** define a canonical frame/rational-time edit; emit Gap objects, supported time effects, and independent audio tracks/ranges. Reject unsupported constructs rather than silently dropping them. Use official OTIO to deserialize and calculate semantic durations.

**Acceptance:** source/edit mapping, gaps, speed, J/L overlaps, frame rates, and media references survive a round trip and a real Resolve or other chosen editor import. OTIO is editorial metadata, not packaged media. [Official OTIO overview](https://github.com/AcademySoftwareFoundation/OpenTimelineIO).

### B06 — P2 — Review generation still depends on Unix executables

**Evidence:** [review.mjs](studio/lib/review.mjs) uses `execFileSync('rm', ...)` and `execFileSync('mv', ...)` for cleanup and a single-row output. A child-process probe for `rm --version` returned `ENOENT` on this workstation. PowerShell aliases do not satisfy `execFileSync`.

**Fix:** use Node filesystem operations with explicit overwrite behavior. Verify actual review outputs under Windows paths containing spaces and Arabic characters.

**Status:** the working-tree file changed after this snapshot; inspect the later-status note before implementing.

### B07 — P2 — Python analysis output depends on the machine's default encoding

**Observed failure:** [audio_deep.py](studio/tools/audio_deep.py), the report writer around snapshot line 212, uses `write_text(markdown(r))` without `encoding='utf-8'`; a generated report containing `≈` failed on cp1252.

**Fix:** explicitly write/read UTF-8 in every persisted JSON, Markdown, transcript, and caption artifact. Avoid relying solely on a process-wide environment toggle. Inspect all Python scripts, not only this one.

**Acceptance:** Arabic, punctuation, musical notation, and paths work under a non-UTF-8 Windows locale. The live file changed during this audit; recheck its current writer.

### B08 — P2 — New platform tests contain incorrect assumptions

**Observed failures:** [platform.test.mjs](studio/test/platform.test.mjs) expects a nonempty browser candidate list for an empty environment; Windows candidates are derived from environment roots. Its text scanner then reports the deliberate centralized `python3` Unix fallback as a violation.

**Fix:** test explicit Windows environment fixtures and expected platform branches; exclude the portability helper from the consumer rule or inspect actual child-process calls. Include `rm`/`mv` in the portability coverage.

**Acceptance:** a test fails when a consumer hard-codes a nonportable invocation, and passes for the helper that intentionally implements platform differences.

### B09 — P1 — Browser startup does not meet this workstation's execution policy

**Evidence:** [cdp.mjs](studio/lib/cdp.mjs) directly spawns the browser; [platform.mjs](studio/lib/platform.mjs) lists Chromium and Edge fallbacks; [app-capture.mjs](studio/lib/app-capture.mjs) still starts the executable with `--version`. The owner requires Google Chrome through the dedicated desktop launcher, and forbids Edge/direct Chrome execution.

**Fix:** introduce a browser-session provider. On this machine it must use the approved helper or a supported extension of that helper that returns an isolated Chrome CDP session. Use `Browser.getVersion` after connection. Fail clearly if a compliant session is unavailable. Do not attach film rendering to a personal/corporate browsing tab without a deliberate session contract.

**Acceptance:** every browser consumer uses the provider; only Chrome is chosen; no direct process launch remains in the workstation route; a compliant render smoke test succeeds. A Linux CI provider can remain separate.

### B10 — P2 — Unchecked text can be recorded as a successful gate

**Evidence:** [measure.mjs](studio/lib/measure.mjs), snapshot line 66, records `ok:true` for `text.unavailable`, while describing it as “NOT CHECKED”. A native composer with zero observed lines can also pass the overlap gate without establishing that expected copy exists.

**Fix:** use `pass`, `fail`, `unchecked`, and `not-applicable`, with required checks per delivery. Compare expected copy to observed copy. For external renders, require OCR/manual text evidence or an engine-provided text manifest before final approval.

**Acceptance:** an unavailable check remains visible and cannot silently count as a passed required check. An intentional no-text film can declare text not applicable.

### B11 — P3 — A delivery poster requested at time zero is skipped

**Evidence:** [make.mjs](studio/make.mjs) uses `if (profile === 'final' && d.poster)`, so a valid `poster:0` is falsy. The separate legacy `cfg.poster` route does not have the same guard.

**Fix:** test `d.poster !== undefined` and validate a finite time inside the delivery.

**Acceptance:** 0, a valid later frame, and an omitted poster behave distinctly.

### B12 — P2 — Share-file size inputs can produce an invalid video bitrate

**Evidence:** [finish.mjs](studio/lib/finish.mjs), `shareCopy`, subtracts the audio bitrate from the total target bitrate without validating positive duration, sufficient file budget, or positive resulting video bitrate.

**Fix:** validate inputs and fail before encoding when a requested budget cannot hold audio plus a minimum usable picture stream. Make size units explicit: the implementation uses powers of 1024 while naming them MB.

**Acceptance:** zero duration, negative budget, and an impossible tiny budget produce actionable errors; a valid budget produces an output that satisfies the chosen MiB/MB contract.

## 5. Source-inspected reliability and security risks

These findings are supported by code paths, but their full failure modes were not all forced in live browser/media sessions. They are implementation tasks, not claims that every render already fails.

| ID / priority | Evidence and consequence | Recommended change and verification |
| --- | --- | --- |
| R01 / P1 | `cdp.mjs`: pending requests have no general deadline, and socket closure does not reject them; `goto` waits indefinitely for the page load event | Deadline/cancellation for commands and events; reject pending operations on close; force-close a mock connection and confirm a bounded failure |
| R02 / P2 | `cdp.mjs`: cleanup protects initial discovery but not subsequent target fetch, WebSocket connect, or enable failures | Enclose the entire session lifecycle in cleanup; inject failures at each startup stage and verify no owned process/profile remains |
| R03 / P2 | `screenshot` races a timeout without cancelling the underlying pending request; `settleCapture` returns exhaustion as an integer | Remove abandoned requests, clear timers, return an explicit stable result, fail when stability was required; use a mock that never answers or never stabilizes |
| R04 / P2 | `dialogue.mjs`: the FFmpeg child has a close handler but no error handler | Reject missing executables and spawn failures through the Promise; use a nonexistent controlled executable fixture |
| R05 / P1 | `render.mjs` has a general subprocess helper that accumulates output and lacks the reference helper's timeout/output budgets | Consolidate on one bounded runner with cancellation, stderr tail, progress, and process-tree cleanup; test a hanging/log-flooding fixture |
| R06 / P2 | `make.mjs` selects the next take number from a directory listing; shared score/video paths and `cache.mjs`'s common `.tmp` filename are unsafe for concurrent builds | Atomic take reservation, per-job scratch paths, per-artifact locks and unique temporary names; run two same-film jobs and compare manifests |
| R07 / P2 | `tools/live.py` downloads weights using `urlretrieve`; a displayed SHA prefix is calculated after download, not checked against a trusted expected hash | Pin model revision, expected full hash, size budget and license; stream/resume into a temporary file and rename only after verification |
| R08 / P1 | `tools/live.py` uses `tarfile.extractall` without an explicit safe filter in the Python 3.12 route | Validate archive destinations and link members; use a data-safe extraction policy; reject traversal/symlink archives in a generated test |
| R09 / P2 | Live requirements request `opencv-contrib-python`; reference requirements request `opencv-python-headless`; both write the `cv2` namespace | Separate environments or choose one compatible OpenCV distribution per profile; validate imports and MediaPipe after a clean lockfile restore |
| R10 / P2 | Live dependencies are unpinned; optional reference dependencies specify broad ranges | Produce exact locked environments and a machine-readable tested-version record; restore from scratch in CI |
| R11 / P2 | `reference/ingest.mjs` bounds downloaded bytes and duration, but decoded evidence and local input expansion need separate disk budgets | Enforce total job disk allowance, decoded pixel/frame limits and a deadline shared across stages; test high-resolution/long-GOP/oversized fixtures |
| R12 / P2 | `make.mjs` passes no production plan for segmented deliveries and omits several original-timeline review inputs | Remap shots, cues, copy, holds, and source time through the delivery edit; inspect every new cut join with picture and sound |
| R13 / P2 | `engines.mjs` rejects segments/fade-out and has no external text manifest | Make supported features explicit and implement timeline-driven composition around full external renders; no implied parity with native output |
| R14 / P2 | `captions` falls back to Arabic when an English translation entry is missing | Return translation coverage and language status; fail a required English delivery with missing translations or label it incomplete |
| R15 / P2 | Final auxiliaries depend on special delivery names `hero60`/`bumper6` in `make.mjs` | Declare per-delivery artifacts in config; verify a newly named final gets its required captions/poster/share/review outputs |
| R16 / P2 | `.github/workflows/studio-tests.yml` tests Ubuntu and Node 22; Windows problems remain outside CI coverage | Add Windows unit/media tests and isolated UTF-8/path fixtures; keep approved browser-provider tests separate from ordinary media tests |
| R17 / P2 | Existing documentation checks mostly establish that files are mentioned and required docs exist | Add schema validation and semantic contract coverage; prioritize timing/export/gate behavior over tests that repeat implementation strings |
| R18 / P2 | `--no-sandbox` and permissive browser flags are applied broadly in `cdp.mjs` | Use capability-specific profiles; retain browser sandboxing where supported; minimize privileges for external pages. Browser capture deserves a different trust policy from local trusted films |
| R19 / P2 | No root `LICENSE` or `LICENSE.md` was found in the inspected checkout | The owner should declare intended project reuse/distribution terms and preserve third-party notices; a public GitHub URL alone does not establish a permissive code license |

Other concerns to investigate: async runtime exceptions raised after initial page setup; browser context loss and GPU recovery; source-video rotation and variable frame rate across all footage paths; cache invalidation when model binaries or external tool versions change; per-frame image bitmap/cache disposal; and duplicate/missing frame detection at worker chunk joins. These need controlled end-to-end tests before being called confirmed defects.

## 6. Improvements already present in the reviewed Windows snapshot

Avoid reopening these as if no work exists:

- Central OS helpers for Python, null device, path slashes, and entry-point detection.
- FFmpeg contact sheets with an explicitly bundled font and controlled cwd.
- Explicit still-image lists in place of a platform-dependent glob route.
- Render test environment supplied through Node's environment-file support.
- Final duration tolerance tightened to approximately one frame plus 30 ms, replacing the older ±10% check.
- Doctor's Chrome version lookup shifted toward DevTools rather than a Windows `--version` probe.

These changes improve portability, but they do not establish that every consumer was migrated. The reproduced review subprocess problem and remaining app-capture version probe demonstrate that follow-through is needed.

## 7. What is missing from a professional studio workflow

| Capability | Existing foundation | Missing work and value |
| --- | --- | --- |
| Canonical timeline | EDL pure functions; production shot times; separate delivery segments | One frame/rational-time schema for video/audio/captions/transitions/speed; reliable import/export |
| Media intake and relinking | Paths in production plans; reference ingest; live preparation | Asset IDs, content hashes, source metadata, rotation/VFR handling, proxies, relinking and missing-media UI |
| Interactive editing | Code modules and transcript range helpers | Media bin, scrubber, trim/ripple tools, split audio tracks, transcript correction, undo/redo |
| Review and approval | Contact sheets, sampled strips, gates, review gallery | Synchronized video/audio playback, frame stepping, A/B takes, comments tied to time, approval tied to exact export hash |
| Captions/localization | Arabic copy checks, timed pages, SRT/VTT writers | Human transcript/timing correction, bilingual coverage, speaker labels, RTL mixed-number checks, styled ASS/burn-in preview |
| Tracking and roto | MediaPipe/ONNX live tools and footage overlays | Persistent tracks with confidence/occlusion, planar solve, correction keyframes, quality alpha edges and temporally stable mattes |
| Color and mastering | sRGB browser profile, BT.709 tagging, SDR H.264 | Explicit source/working/output transforms, scopes, alpha convention, high-bit-depth intermediates, managed EXR/3D route |
| Audio finishing | Original score, cues, synthesis, mastering, loudness | Dialogue cleanup, editable stems/buses, sidechain ducking, room tone, speaker overlap editing, separate dialogue review |
| Reusable motion language | Motion/typography/transition/cinema libraries and studies | Versioned rigs/templates, parameter UI, transitions with source/target contracts, motion blur/performance tests |
| 3D production | Browser depth/WebGL utilities and external-engine entry point | Product models, materials, lighting presets, render passes, compositing and Blender asset handoff |
| Operations | Numbered takes, cache manifests and doctor | Queue/cancellation/resume, budgets, dependency locks, artifact registry, backup/restore, capability status |
| Learning loop | Reference forensics, craft descriptions, ledgers | Searchable approved examples; structured lessons; “measured/estimated/unknown” labels; objective shot-quality fixtures |

A missing customer video, licensed music file, or model weight is an input/setup requirement rather than an application defect. Rights metadata already exists in production validation; the missing piece is consistent enforcement and an asset-level record that accompanies exports.

## 8. Technologies and trends verified by the October 3, 2026 cutoff

This section describes verified releases and current public capabilities. It does not predict the rest of October or treat announced/beta features as stable products.

| Development | Verified status | What to apply here |
| --- | --- | --- |
| Blender 5.2 LTS | Official releases list 5.2.0 on July 14, 2026 and 5.2.2 on September 15 | Pilot product 3D and procedural motion; the release's sound-frequency Geometry Nodes work is useful for music-driven designs. [Official release](https://www.blender.org/releases/5-2/) |
| DaVinci Resolve 21.1 | September 8, 2026 official announcement; AI assistant integration and expanded Fusion Krokodove tools | Prototype a controlled project/media/render bridge for finishing and human review. Feature/edition entitlements still need checking before relying on scripting or AI features. This source verifies 21.1, not every subsequent patch. [Official announcement](https://www.blackmagicdesign.com/media/partial/release/20260908-03) |
| Premiere 26.5 / After Effects 26.5 | September 2026 stable-release pages | Reference modern masking and motion workflow ergonomics; buy only if a real Adobe exchange requirement exists. [Premiere](https://helpx.adobe.com/premiere/desktop/whats-new/whats-new.html), [After Effects](https://helpx.adobe.com/after-effects/desktop/what-s-new/whats-new.html) |
| AI assistance inside editors | Adobe September 8 announcement includes AE assistant public beta; audio separation/crosstalk/ducking and color work include beta features | Learn the editable-operation approach: organize, label, create expressions, and prepare edits with reviewable results. Store decisions and maintain undo. [Adobe announcement](https://blog.adobe.com/en/publish/2026/09/08/generate-create-directly-in-your-timeline-with-new-ai-powered-innovations-in-premiere-after-effects) |
| Promptable segmentation/tracking | SAM 3.1 Object Multiplex dated March 27, 2026 | Replace “person only” ambitions with a pluggable object/track interface. It is a CUDA pilot, not a local Iris Xe-ready default. [Official repository](https://github.com/facebookresearch/sam3) |
| Higher-quality video matting | MatAnyone 2 is a CVPR 2026 Highlight project | Learn temporal consistency and quality evaluation; its noncommercial license prevents treating it as a default commercial studio dependency. [Project](https://github.com/pq-yang/MatAnyone2), [license](https://github.com/pq-yang/MatAnyone2/blob/main/LICENSE.txt) |
| Geometry from ordinary footage | Depth Anything 3 has pose/depth variants; small/base have different licenses from large/giant | Pilot depth-assisted parallax and tracked callouts, retaining confidence and acknowledging uncertain scale. [Model table](https://github.com/ByteDance-Seed/Depth-Anything-3) |
| Agent-authored browser video | HyperFrames explicitly supports seekable animation adapters; Remotion offers React video workflows | Borrow frame-clock adapters, reusable components, player/editor patterns, and render scheduling. Keep native composition as default. [HyperFrames](https://github.com/heygen-com/hyperframes), [Remotion](https://github.com/remotion-dev/remotion) |
| Browser media pipelines | WebCodecs plus Mediabunny offer timestamped decoding/encoding and media containers | Benchmark direct Canvas/video export and source-frame decoding; DOM films still need a compatible capture path. [W3C WebCodecs](https://www.w3.org/TR/webcodecs/), [Mediabunny](https://github.com/Vanilagy/mediabunny) |
| Improved scene analysis | PySceneDetect repository lists 0.7.1, July 21, 2026 | Evaluate adaptive detection for handheld footage and thresholds for fades; retain measured timestamps and confidence. [Official project](https://github.com/Breakthrough/PySceneDetect) |
| ML-assisted expert tracking | Mocha Pro 2026.5 announcement dated June 11, 2026: automatic point tracking, matte refinement, cleanup and export improvements | Benchmark a difficult moving-screen/product replacement against our baseline before buying a specialist tracker. [Boris FX announcement](https://blog.borisfx.com/press/ai-point-tracking-speeds-up-complex-vfx-tracks-in-mocha-pro) |
| Faster generative iteration | Runway September 10, 2026 publication describes real-time model research based on causal/autoregressive generation and distillation | Track this as research; do not assume the demonstrated real-time capability is a generally available production endpoint. Our adapter should support async jobs and previews independently. [Runway research](https://runway.com/news/research/towards-instant-video-generation) |
| Controlled cloud generation | Google's January 13, 2026 Veo 3.1 API update describes stronger reference-image control, native vertical video and higher-resolution options | Optional cloud storyboard/background route when local hardware is insufficient; verify endpoint availability, terms and budget at integration time. [Google announcement](https://blog.google/innovation-and-ai/technology/developers-tools/veo-3-1-gemini-api/) |
| Audio/video generation | LTX-2 provides joint generation; Wan2.2 and HunyuanVideo-1.5 offer video-generation routes | Generate optional storyboard/background candidates. Import approved media as assets with provenance; preserve real product evidence and editable typography. These are candidates, not proof of an October launch or local performance. [LTX-2](https://github.com/Lightricks/LTX-2), [Wan2.2](https://github.com/Wan-Video/Wan2.2), [HunyuanVideo](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5) |

**Inference from these sources:** the useful direction is controllable AI within editable workflows: segmentation, tracking, cleanup, search, rough-cut preparation, and assistant operations. Our design should preserve source media and record decisions so a human can correct them. Generating a flattened clip alone does not provide the editing and review capabilities this app lacks.

## 9. GitHub projects to learn from and adopt selectively

“Adopt” means evaluate a pinned release/commit through an adapter, not copy an entire repository into our code. Licenses below refer to inspected code/project terms; model weights, datasets, fonts, plugins and packaged binaries can carry additional terms. No benchmark from another machine is a promise for this workstation.

### 9.1 Highest-value foundations

| Project / source | Problem addressed | Integration / lesson | License and deployment consideration | Decision |
| --- | --- | --- | --- | --- |
| [OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) | Incorrect edit handoff | Use its API to validate actual ranges, gaps and effects; build `tools/otio_bridge.py` around the canonical timeline | Apache-2.0; validate the chosen NLE adapter and import version | Adopt first |
| [OpenColorIO](https://github.com/AcademySoftwareFoundation/OpenColorIO) | Unspecified color transforms | Pin a color config; use consistent transforms for Blender/EXR/offline finishing | BSD-3-Clause; browser CSS blending is not automatically scene-linear because OCIO is installed | Pilot early |
| [OpenImageIO](https://github.com/AcademySoftwareFoundation/OpenImageIO) | Professional image/EXR input and metadata | Use image inspection/conversion tooling for plates and render passes | Apache-2.0; choose tested Windows packaging rather than start with a source build | Pilot with 3D |
| [OpenRV](https://github.com/AcademySoftwareFoundation/OpenRV) | Review beyond sampled stills | Learn frame stepping, A/B, sequence playback and pipeline integration | Review repository and third-party licenses; Windows source build has substantial prerequisites | Study; packaged pilot later |
| [Mediabunny](https://github.com/Vanilagy/mediabunny) | Expensive frame extraction/capture and container handling | Timestamp-aware decode, mux, conversion; optional Canvas renderer path | MPL-2.0, with file-level source obligations when distributing covered modifications; not MIT | Benchmark early |
| [HyperFrames](https://github.com/heygen-com/hyperframes) | HTML animation integration and component reuse | Seekable adapters for GSAP/Lottie/Three/WAAPI; reusable blocks and specialist engine | Apache-2.0 project; dependencies have their own licenses; browser startup must follow our provider | Study + one-shot pilot |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) | Explainers, precise diagram/story motion | Learn signals, timeline authoring, reusable visual primitives; adapt a rendered shot rather than assume its generator clock equals `renderAt` | MIT; integration must prove random-access determinism | Pilot for educational shots |
| [Remotion](https://github.com/remotion-dev/remotion) | Large batches of data-driven variants | React component reuse, preview player and rendering infrastructure | Custom license: free eligibility includes individuals and for-profit organizations up to 3 employees; larger for-profit use requires a company license. [Terms](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) | Optional; no default migration |
| [Three.js](https://github.com/mrdoob/three.js) | Browser 3D product/camera motion | glTF scene adapter, physically motivated lights/materials, WebGL/WebGPU benchmarking | MIT; shaders and GPU frame stability require real capability tests | Pilot after provider fix |
| [LosslessCut](https://github.com/mifi/lossless-cut) | Efficient source trimming and stream inspection | Learn packet/keyframe-aware cuts and media stream handling | GPL-2.0 code; standalone app is preferable to copying UI code; arbitrary frame cuts may require re-encoding | Useful operator tool |
| [Auto-Editor](https://github.com/WyattBlue/auto-editor) | Speech/pause rough cuts | Learn analysis-to-edit-decision separation; compare its decisions with our `keepRanges` | Unlicense project; inspect dependencies and current timeline export contract | Pilot CLI, preserve manual overrides |
| [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | Cut/fade boundaries for references and footage | Adaptive scene detection with stored timestamps; already an optional dependency | BSD-3-Clause; reuse existing environment rather than duplicate it | Validate and extend |
| [Lottie Web](https://github.com/airbnb/lottie-web) | Reusing designed vector motion from After Effects | Use `goToAndStop` through the frame clock; test supported effects/fonts/assets and subframe behavior | MIT runtime; supplied animations and authoring plugins have separate rights | Small deterministic import pilot |
| [Rive runtime](https://github.com/rive-app/rive-runtime) | Reusable rigs and interactive animation assets | Learn animation/state-machine contracts; map inputs to deterministic film time; use its render/golden-test approach | MIT runtime; editor/service and asset terms are separate; a state machine requires reset/seek handling | Study and optional asset pilot |

GSAP is another optional seekable-timeline adapter, rather than a reason to replace existing motion primitives. Inspect its current [standard license](https://gsap.com/community/standard-license/) for the actual product/distribution use case; do not assume a generic MIT license. Select one imported animation workflow and prove random seeking, font loading and frame consistency before expanding the catalog.

### 9.2 Speech, captions, and audio

| Project / source | Problem addressed | Integration / lesson | License / hardware | Decision |
| --- | --- | --- | --- | --- |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Offline multilingual transcription without a large Python stack | CPU/quantized backend, optional OpenVINO; produce a normalized transcript artifact | MIT code; choose multilingual weights for Arabic, not `.en` models | Best local ASR alternative to benchmark |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Efficient transcription in Python | INT8 CPU benchmark against sherpa-onnx; preserve source timings and confidence | MIT; CUDA path requires NVIDIA libraries, while CPU is supported | Benchmark one backend, avoid maintaining all by default |
| [WhisperX](https://github.com/m-bain/whisperX) | Word-level alignment and speaker separation workflow | Forced alignment and diarization after corrected transcription; validate Arabic model coverage and code-switching | BSD-2-Clause code; alignment/diarization models have separate terms/access; CPU possible but measure runtime | Caption-quality pilot |
| [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | Existing offline speech toolkit | Finish the current integration and add model/version manifests before replacing it | Project supports ONNX speech, VAD, diarization and enhancement; verify each selected model's language/license | Validate current backend first |
| [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet) | Dialogue noise suppression | Adapter returns cleaned WAV plus processing manifest; compare consonants and room tone before/after | MIT or Apache-2.0 code; inspect model terms and available Windows builds | Practical cleanup pilot |
| [SAM-Audio](https://github.com/facebookresearch/sam-audio) | Isolating a selected sound from mixtures | Prompted source separation with original/processed A/B review | Custom SAM license, gated checkpoints, CUDA recommended; not a ready local default | Separate GPU research pilot |

**Arabic acceptance pack:** Egyptian Arabic, formal Arabic, English brand names inside Arabic, numbers/prices, silence, music under speech, two speakers, reverberation and low volume. Measure word error rate and manually annotated word-boundary error. Expose uncertain words to correction. Automatic translation and a `.en.srt` filename are not evidence of an English-language deliverable.

### 9.3 Tracking, matting, depth, cleanup, and restoration

| Project / source | Problem addressed | Integration / lesson | License / hardware | Decision |
| --- | --- | --- | --- | --- |
| [SAM 3 / 3.1](https://github.com/facebookresearch/sam3) | Arbitrary object masks and persistent object tracks | Text/visual prompts into versioned mask/track packs; store confidence and prompts | Custom SAM terms, gated models; documented CUDA prerequisite | GPU pilot after hardware and license review |
| [MatAnyone 2](https://github.com/pq-yang/MatAnyone2) | Hair/edge alpha quality and temporal matting | Study alpha quality evaluation and propagation; benchmark against present segmentation | NTU S-Lab 1.0 permits noncommercial use; commercial permission needed. [License](https://github.com/pq-yang/MatAnyone2/blob/main/LICENSE.txt) | Research only by default |
| [MatAnyone](https://github.com/pq-yang/MatAnyone) | Earlier video matting approach | Useful predecessor for comparisons; avoid duplicate integration with version 2 | Check its own license and weights before use; no inferred clearance from the newer project | Study predecessor |
| [CoTracker](https://github.com/facebookresearch/co-tracker) | Persistent point tracks for callouts | Track IDs, visibility, occlusion and re-detection as output data | Majority CC-BY-NC; exceptions for components do not make the whole tracker commercially permissive | Research comparator |
| [TAP / TAPIR / TAPNext](https://github.com/google-deepmind/tapnet) | Alternative point tracking | Compare tracking through occlusion, correction anchors and re-detection | Apache-2.0 repository; verify the selected checkpoint and data terms; GPU pilots likely needed | Preferred commercial-track candidate to evaluate |
| [Depth Anything 3](https://github.com/ByteDance-Seed/Depth-Anything-3) | Depth, camera pose and reconstruction | Depth/confidence packs for parallax, screen-space occlusion and callout placement | Code Apache-2.0; small/base and some monocular models Apache; large/giant/nested any-view models CC-BY-NC. Prefer refreshed `-1.1` where applicable | Start with a permitted small/base model |
| [depth-anything.cpp](https://github.com/localai-org/depth-anything.cpp) | Depth without PyTorch/CUDA inference overhead | C++/GGUF CLI behind `tools/depth_adapter`; test CPU first | MIT code; converted weights keep upstream licenses; Windows build/parity and temporal quality need our tests | Strong local-depth pilot |
| [ViPE](https://github.com/nv-tlabs/vipe/blob/main/README.md) | Camera pose and dense scene geometry | Learn combined pose/depth output schema and longer-video processing | Mostly Apache-2.0 source; Unik3D component BY-NC-SA; additional model terms; CUDA-oriented deployment | Specialist GPU research |
| [ProPainter](https://github.com/sczhou/ProPainter) | Removing unwanted moving objects | Study mask propagation and temporally consistent fill | Noncommercial S-Lab terms; verify permission before commercial production | Research only by default |
| [RIFE ncnn Vulkan](https://github.com/nihui/rife-ncnn-vulkan) | Slow motion/intermediate frames without CUDA | Portable binary adapter; scene-cut-aware interpolation with frame/time mapping | MIT wrapper; inspect upstream model terms. Windows package supports Intel/AMD/NVIDIA without a CUDA runtime | Best interpolation candidate for this machine |
| [SeedVR / SeedVR2](https://github.com/ByteDance-Seed/SeedVR) | Temporally consistent restoration/upscaling | Offline restoration experiment with comparison crops and original retention | Apache-2.0 project; official setup is heavy GPU-oriented and warns of overgenerated details | GPU research; no automatic product-label enhancement |

For real product advertising, reconstruction, cleanup, interpolation and super-resolution need visual review. Generated detail can alter logos, controls, packaging text, hands, reflections or product geometry. Keep the original and list the transformation in provenance. On the current workstation, simple optical flow/planar tracking and CPU segmentation remain useful baselines.

### 9.4 Optional generation orchestration

| Project / source | Useful idea | Constraints | Decision |
| --- | --- | --- | --- |
| [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | Versioned node workflows, parameterized jobs, artifact-producing API | GPL-3.0 project; custom nodes execute code and have independent dependencies/licenses; pin and allowlist | Isolated GPU service pilot, not a dependency added to the main Python environment |
| [LTX-2](https://github.com/Lightricks/LTX-2) | Joint audio/video generation and LoRA workflow | Multiple custom license files/model terms; substantial weights/hardware; exact model/version needs review | Optional story/background generation experiment |
| [Wan2.2](https://github.com/Wan-Video/Wan2.2) | Controlled text/image-to-video generation | Apache-2.0 repository; verify selected model card and all components; reference consumer-GPU claims concern much stronger hardware than Iris Xe | GPU pilot for approved non-evidence shots |
| [HunyuanVideo-1.5](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5) | Distilled generation and an integrated ComfyUI route | Custom license and model terms; GPU requirement; do not label it Apache/MIT | Alternative evaluation, not an immediate install |

We should support one generation service contract and compare providers through it. Downloading three enormous model families before selecting a use case would consume storage and integration effort without completing the missing editor/review workflow.

For release dating, Lightricks' own [January 5, 2026 announcement](https://ltx.io/newsroom/ltx-2-is-now-open-source-full-model-weights-released) establishes the full-weight LTX-2 release. A repository's changing README or newest model name alone is insufficient to establish an October release date.

### 9.5 Drawn and character animation

If the studio expands into character animation, it needs rigging, drawing substitutions, exposure sheets, lip-sync correction and an animatic workflow. These are substantial authoring capabilities absent from the current code-driven film workflow. Blender's 2D/3D route is a reasonable first evaluation; use a short character shot to determine whether it fits our artists.

Toon Boom's [Harmony 27 overview](https://helpcentre.toonboom.com/hc/en-ca/articles/45250943700115-What-s-new-in-Harmony-27), updated July 30, 2026, is a relevant professional benchmark. Its [Storyboard Pro-to-Harmony workflow](https://learn.toonboom.com/modules/exporting-from-storyboard-pro-to-toon-boom-harmony/topic/exporting-harmony-scenes) is useful to study for scene handoff and timing. Evaluate this paid ecosystem only if drawn/rigged character work becomes a concrete requirement; it is not a missing dependency for ordinary product explainers.

### 9.6 Specialist desktop and cloud tools

| Tool | Relevant gap | Evaluation decision |
| --- | --- | --- |
| Resolve / Fusion | Editable finishing, color/audio tools, node compositing, review | First NLE/finishing pilot; confirm edition, hardware and bridge support using the official release material above |
| After Effects / Premiere | Designer-led motion projects and Adobe client handoffs | Optional existing-project route; do not depend on beta assistant/audio features for unattended production |
| Mocha Pro | Planar/point tracking, roto and screen replacement | Paid pilot only for shots where baseline tools fail; compare manual correction time. [Official product](https://borisfx.com/products/mocha-pro/) |
| Houdini | Procedural effects, simulation, reusable rig/geometry systems | Specialist later-stage route; reviewed [Houdini 21 documentation](https://www.sidefx.com/docs/houdini/news/21/index.html) covers modeling, rendering and APEX/KineFX animation. A trained operator and actual procedural-effects requirement should precede purchase |
| Harmony / Storyboard Pro | Drawn character animation, rigs, scene/animatic handoff | Evaluate when character production is in scope; use the sources in section 9.5 |
| Runway / Veo | Generation without buying a local CUDA workstation | Optional service adapter for approved material; compare reference fidelity, correction work, latency, export formats and per-job cost. Do not infer that a marketing research demo is available in the API |

Keep these tools outside the core dependency stack. The project should exchange versioned media/timeline/analysis manifests with them so their outputs can still be checked, relinked, reviewed and regenerated.

## 10. What to download, what to reuse, and what to defer

### 10.1 Practical first acquisition list

| Item | Download/source | Why / prerequisites |
| --- | --- | --- |
| Blender 5.2 LTS Windows package | [Official Blender release](https://www.blender.org/releases/5-2/) | 3D product rendering, geometry/procedural animation; use a small scene benchmark before adopting heavy rendering |
| OTIO package in a locked environment | [Official OTIO repository](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) | Semantic export tests and edit bridge; already discoverable here, so verify version/import before installing again |
| whisper.cpp Windows build and one multilingual model | [Official project](https://github.com/ggml-org/whisper.cpp) | Local CPU transcription comparison; start small and validate Arabic accuracy |
| RIFE Vulkan Windows release | [Official releases](https://github.com/nihui/rife-ncnn-vulkan/releases) | Controlled interpolation pilot on integrated graphics; verify binary/model terms and driver capability |
| LosslessCut packaged app | [Official project/download guidance](https://github.com/mifi/lossless-cut) | Operator source preparation and packet-aware trimming; keep it a separate tool |
| DaVinci Resolve installer, if not already installed | [Official product](https://www.blackmagicdesign.com/products/davinciresolve) | Human editing/color/audio finish; test compatibility and the required edition before purchasing Studio or planning automation |
| Mediabunny package in an experimental branch | [Official project](https://github.com/Vanilagy/mediabunny) | Decode/mux/direct-render benchmark; requires package lock and MPL compliance |
| CPU depth pilot | [depth-anything.cpp](https://github.com/localai-org/depth-anything.cpp) | Build/test one small or base model; no expectation of turnkey speed until measured |

Use existing FFmpeg, Node, Python, uv, MediaPipe, sherpa-onnx and scientific packages after capability verification. This audit does not justify reinstalling them wholesale. Clone sources only when developing an adapter or studying implementation; prefer official packaged releases for operator tools.

### 10.2 Defer until the enabling conditions exist

- SAM 3.1, SAM-Audio, ViPE and substantial video-generation/restoration models: separate compatible GPU environment, storage budget and benchmark plan.
- MatAnyone, CoTracker and ProPainter in commercial delivery: explicit permitted terms for the intended use or a different licensed alternative.
- Remotion company deployment: confirm entity eligibility and any paid-license requirement.
- Adobe, Mocha, Nuke, Houdini or other paid specialist purchases: first identify a client format, required skill, or tested capability the chosen free/open route cannot provide. No blanket purchasing list is justified.
- Large shared dependency stack: keep native rendering, scientific analysis and GPU inference in separate locked profiles.

Suggested storage layout is `studio/vendor-src/<project>` for ignored experimental clones, `studio/models/<family>/<revision>` for ignored weights, and `studio/takes/<job>` for outputs. A committed registry records URL, release/commit, hash, license, model ID, environment, expected hardware and test fixture. Keep source, models and generated client media out of ordinary app commits.

## 11. Tools we should build in this project

Names below are proposals; they are not existing files or implemented capabilities.

| Tool / proposed location | Responsibilities | First useful acceptance criterion |
| --- | --- | --- |
| `lib/job-runner.mjs` | Shared subprocess deadlines, cancellation, bounded logs, progress, owned-process cleanup | Missing executable, hang, log flood and user cancellation produce a persisted diagnostic without orphaned children |
| `lib/browser-session.mjs` | Chrome-only approved workstation launch/connection; separate CI provider; version/capability reporting | A compliant local render fixture captures the right dimensions and closes its own session |
| `lib/timeline.mjs` + schema | Rational time/frame indexes, independent tracks, source mapping, speed, gaps, transitions and segment remapping | Picture, audio, captions and OTIO resolve the same edit times |
| `lib/media-ingest.mjs` | Probe, source hash, orientation, VFR/timebase, audio streams, proxy presets, relink records | A phone recording, screen capture and Unicode path import/relink without timing changes |
| `lib/tool-registry.mjs` + `tools.lock.json` | Versions, capability tests, license status, model expected hashes, CPU/GPU modes | Doctor explains ready/missing/incompatible/unverified per capability rather than just “package present” |
| `lib/artifacts.mjs` | Immutable job/take IDs, atomic cache publication, output hashes and provenance | Two simultaneous builds cannot publish the same take/cache path |
| `lib/qa-manifest.mjs` | Required/optional checks; pass/fail/unchecked/not-applicable; human evidence and export hash | An unchecked required test cannot produce an approved final |
| `review/` player console | Playback with audio, frame stepping, waveform/caption view, A/B takes, time comments, approval | A reviewer can identify and annotate a cut/audio error that a still sheet misses |
| `tools/transcribe.py` + `tools/align.py` | Pluggable sherpa/whisper backend and corrected word alignment | Arabic validation pack produces editable words with provenance and uncertainty |
| `tools/track.py` + `tools/matte.py` | Baseline optical flow/planar solve, optional AI adapters, track/mask correction | A callout follows a moving target, stops on uncertainty, and survives a manual correction |
| `lib/color.mjs` + color config | Input/working/display/output transforms; metadata and alpha conventions | A known color chart matches across renderer, exported file and finishing viewer within a stated tolerance |
| `tools/blender_render.py` | Scene parameters, deterministic shot render, render passes and manifest | One approved product shot integrates through the existing external renderer and matches timing/dimensions |
| `tools/resolve_bridge.py` | Asset import, edit transfer, named renders and report collection | One canonical timeline imports with correct gaps, audio and duration; unsupported operations fail visibly |
| `tools/benchmark.mjs` | Fixture matrix; elapsed time, peak memory, output hash/quality and dependency versions | Compare one candidate with the current baseline using identical inputs and settings |
| `lib/assets.mjs` + asset manifest | Ownership/permission, source hashes, fonts/models and derivative lineage | A delivery package can identify the rights/source of every used asset |

### 11.1 Proposed common contracts

An edit should identify sources by stable asset ID and describe time using frames/rational rates. It should not mix source seconds and exported-delivery seconds without an explicit mapping.

```text
Project
  assets: id -> hash, path, probe, rights, proxies
  timeline: tracks -> clips/gaps/transitions -> source ranges + effects
  copy: text, language, start/end, safe region, expected asset/shot
  cues: event id, picture time, audio offset, sound asset
  deliveries: dimensions, rate, edit selection, color/audio targets, artifacts
  job: dependency versions, model hashes, budgets, output hashes, check states
```

Analysis packs should include schema version, source hash/timebase, coordinate convention, sampled timestamps, masks/depth/tracks/transcript paths, confidence/visibility, tool/model revision and license status. A browser consumer should never have to guess whether a track is normalized, in source pixels, or in cropped delivery coordinates.

The external engine contract should return a manifest alongside picture: dimensions, frame count, rate, color/alpha, timeline mapping, text/caption evidence, dependency hashes and declared unsupported features. A video file alone cannot establish these.

## 12. Professional techniques to adopt

These are workflow recommendations tailored to this app, not claims that a technique was invented in October 2026.

1. **Offline/online editing:** use light proxies for decisions; retain original hashes and time mappings; relink for finishing. Validate rotation, VFR and audio offsets at intake.
2. **Animatic before polish:** approve story order, copy, voice and rough timings before expensive visual rendering. The existing draft/review/final profiles can support this.
3. **Style frames and a proof segment:** keep the existing hook/proof/payoff frame approach; approve one difficult transition with real sound and source material before expanding the film.
4. **Motivated cuts and independent sound:** cut on action or meaning; use J/L audio where it improves continuity; protect dialogue and room tone. Represent these choices in the timeline, not comments alone.
5. **Tracked graphics with correction:** track position plus visibility/confidence; expose correction anchors; make callouts disappear gracefully when tracking is unreliable.
6. **Alpha-aware compositing:** distinguish segmentation masks from fractional mattes; document premultiplied versus straight alpha; inspect hair, blur, spill and edges over multiple backgrounds.
7. **Scene-aware interpolation:** do not interpolate across hard cuts; compare occlusions, fast motion and text. Map inserted frames to an explicit delivery timebase.
8. **Color discipline:** start with a tested SDR Rec.709 contract for browser work; add an explicit OCIO/EXR route for high-end 3D. Assigning output tags is not equivalent to transforming pixels. [OCIO](https://github.com/AcademySoftwareFoundation/OpenColorIO).
9. **Audio by stems:** retain dialogue, music, ambience and SFX separately; audition cleanup; use measured loudness and true peak, then listen. Existing loudness gates are valuable but cannot detect every intelligibility/mix problem.
10. **Measured encoding:** choose frame rate, resolution, bit depth, chroma, codec and loudness for a declared delivery target; make social safe areas configurable and versioned. Use actual codec/filter capability checks. [FFmpeg filter documentation](https://ffmpeg.org/ffmpeg-filters.html).
11. **Shot review in motion:** play every changed shot with adjacent context and audio; inspect worker joins, captions and final cut-downs. Keep technical checks and human acceptance as separate records.
12. **Generative provenance:** retain prompt/model/seed/input/result lineage and original assets; mark synthetic footage; select and correct results. Never substitute an invented product outcome for observed evidence.
13. **Reusable direction:** organize approved easing, typography, lighting, material and transition studies into named, versioned templates. Reuse engineering while deliberately varying creative direction.
14. **Benchmark before adopting:** compare the new tool against a baseline on our material. Measure output quality, failure rate, memory, runtime and manual correction time; marketing demos are insufficient.

## 13. Ordered implementation plan

Effort estimates are planning ranges for a focused engineer with accessible test assets. They are not measured completion promises; adapter licensing/hardware and browser-session access can change them.

### Phase A — Stabilize production foundations

**Expected effort: approximately 3–6 working days, depending on browser provider support.**

- Fix B01–B04, B06–B09 and B11–B12; reconcile any fixes already made after the snapshot.
- Add Windows path/locale tests and correct the two platform tests.
- Implement the bounded runner and browser provider; migrate all consumers.
- Add isolated tests for subprocess/connection failure and take/cache concurrency.
- Lock a CPU/scientific environment, resolving the OpenCV conflict.

**Exit:** fresh Windows restore runs the supported unit/media suite; an approved Chrome fixture renders and cleans up; invalid plans produce diagnostics; no required check silently passes while unavailable.

### Phase B — Make editing and delivery truthful

**Expected effort: approximately 1–2 weeks.**

- Define the canonical timeline; repair OTIO semantics and add round-trip fixtures.
- Remap all review/caption/audio metadata for delivery segments.
- Declare delivery artifacts without special names.
- Add asset/proxy intake and immutable artifact manifests.
- Build basic review playback, A/B and approval tied to a file hash.

**Exit:** one footage edit with a gap, speed change, audio lead, captions and two aspect deliveries matches in native export and the chosen finishing editor; missing text evidence blocks approval; reviewers can annotate an audio/motion issue.

### Phase C — Complete speech and footage craft

**Expected effort: approximately 2–3 weeks, driven by correction UI and footage variety.**

- Validate existing sherpa-onnx; benchmark whisper.cpp or faster-whisper on the Arabic pack.
- Add alignment and correction; separate translation coverage from transcription.
- Implement basic tracking/matte correction and a stable coordinate pack.
- Pilot RIFE Vulkan on slow-motion shots and CPU depth on selected clips.
- Add dialogue cleanup, stem preview and restrained ducking.

**Exit:** a corrected talking-head/product film has readable bilingual captions, reliable callouts, acceptable matte edges and preserved audio timing. Report the measured runtime and correction work on this machine.

### Phase D — Add specialist 3D and finishing

**Expected effort: approximately 1–2 weeks for a narrow first adapter, followed by asset production.**

- Blender shot template with parameterized product/light/camera settings.
- OCIO/EXR workflow only where needed; color-chart comparison.
- Resolve handoff/render bridge for a tested edition/version.
- Optional HyperFrames/Motion Canvas/Mediabunny comparison against native rendering.

**Exit:** one external shot and one complete mixed-media film pass timing/color/audio review and can be regenerated from pinned inputs.

### Phase E — Advanced AI research

Run after a compatible GPU service and licensed use case exist. Pilot SAM 3.1/TAP tracking, a permitted matting route, SAM-Audio, and one generation family. Choose one bounded task per pilot; publish its accuracy, failure cases, cost and hardware requirements. Promote only winners through the shared analysis/asset contracts.

## 14. Verification matrix and measurable success

| Area | Required fixture / check | Success definition |
| --- | --- | --- |
| Rendering | Same frame after forward/backward/random seeks; multiple workers; GPU/software modes where supported | Agreed pixel tolerance, no missing/duplicate boundary frames; declared backend differences |
| Timeline | 24, 25, 30 and rational 29.97/59.94 where supported; gap/speed/audio overlap | Frame-accurate durations and source mapping; unsupported rates rejected explicitly |
| Inputs | Arabic/space paths, portrait rotation, VFR screen capture, missing/corrupt asset | Correct orientation/timing or actionable preflight failure |
| Exports | OTIO semantic round trip and actual selected-NLE import | Correct video/audio positions and known unsupported effects |
| Captions | Arabic/code-switch/numbers/manual boundary annotations | Report WER and boundary error; target chosen from the project brief; correction remains possible |
| Audio | Silence, clipping, dialogue under music, cleanup A/B, J/L edit | Numeric targets met and human intelligibility/mix acceptance recorded |
| Matte/track | Hair, fast movement, occlusion, exits/re-entry | Quality measured across time; uncertainty visible; manual correction path |
| Color | Color chart, gradients, source/display/output comparison | Declared transform and tolerances; no tag-only assumption |
| Operations | Two same-film jobs; cancellation; expired download; full scratch budget | No overwritten takes, unbounded waits or orphaned owned workers |
| Rights | Each source/model/font/plugin associated with a selected release/hash | Complete manifest and no noncommercial component silently promoted to commercial output |
| Review | A/B exported takes with audio and frame comments | Approval tied to the reviewed artifact hash; modification invalidates approval |

Performance targets should be set after a baseline run: seconds per rendered second, peak process memory, cache hit ratio, tool cold-start time, failed-job rate, and manual correction minutes per finished minute. There is no credible numeric speed guarantee for new GPU tools from this audit.

## 15. Immediate implementation backlog

1. Reconcile the snapshot findings against current changes and mark fixed/remaining with evidence.
2. Close the preview-server boundary and malformed-input paths.
3. Make validators total over malformed JSON-shaped input.
4. Finish Windows filesystem/encoding migration and repair platform tests.
5. Establish the approved Chrome provider and bounded process/CDP lifecycle.
6. Replace boolean-only QA with explicit unchecked/required handling.
7. Repair OTIO timing/audio and validate it through the official library and chosen editor.
8. Lock Python environments and register models/tools/hashes/licenses.
9. Make take/cache publication safe under concurrency.
10. Add media/proxy intake and segment-aware review metadata.
11. Build playback review and editable transcript correction.
12. Pilot Blender, local ASR, RIFE Vulkan and CPU depth with measured fixtures.

The first complete milestone should be **one reproducible, editable, reviewed mixed-media film**, covering Arabic copy, live footage, designed sound, correct cut-downs and a finishing handoff. That milestone will expose integration issues more effectively than a large collection of unconnected downloads.

## 16. Final evidence reconciliation

### 16.1 Later working-tree observations

A second hash comparison found 20 of the snapshot's recorded text files changed during the audit. [Drift record](studio/takes/audit-20261003-0702/drift.json). These changes were preserved.

| Finding | Status after later source inspection |
| --- | --- |
| B06 Unix review cleanup | Current `review.mjs` uses Node `rmSync` and `renameSync`; the reproduced snapshot defect is addressed in source. Full browser/media review output was not re-certified here |
| B07 cp1252 audio report | Current `audio_deep.py` explicitly writes UTF-8; several other Python writers/streams also changed. A targeted audio verification was run; result recorded below |
| B08 platform tests | Current test uses an array-shape assertion, excludes `platform.mjs`, and detects shell file commands; a targeted verification was run |
| R02 / browser cleanup | `cdp.mjs` gained graceful browser shutdown and profile-delete retries. This improves normal shutdown, but the later connect/enable startup stages still need enclosing cleanup and pending-request deadlines |
| B01, B03, B04, B11 | The vulnerable server prefix check, null typography access, unguarded shot-map construction, and truthy poster guard were still present at the final source check |
| R07/R08 | UTF-8 changes in `live.py` do not by themselves fix expected model hash verification or safe archive extraction |

### 16.2 Isolated reference-test outcome

The isolated snapshot reference suite completed in **218.17 seconds**, with **3 passes, 0 failures, 1 cancellation and 2 skips**. The same local reference integration test exceeded **120 seconds** again. Direct media URL handling and the static silent reference test passed. Browser and optional Python cases were skipped in this invocation.

This reproduces the timeout outside full-suite parallelism. It does not identify the precise bottleneck. Instrument per-stage time and process startup/FFmpeg extraction cost before deciding whether to optimize batching, adjust bounded concurrency, or revise a justified deadline. Keep the existing safety budgets; do not simply disable timeouts to obtain a green result.

### 16.3 Targeted verification after current fixes

- Current platform + documentation checks: **7/7 passed**, 0 failures/skips/cancellations; approximately 0.37 seconds. [Transcript](studio/takes/audit-20261003-0702/current-platform-docs.txt).
- Current synthetic audio deep-analysis check: **1/1 passed**, 0 failures/skips/cancellations; approximately 43.31 seconds including runner overhead. This confirms the previously failing report writer works on the tested Windows fixture. [Transcript](studio/takes/audit-20261003-0702/current-audio.txt).
- B07 and B08 therefore have targeted passing evidence after the newer fixes. B06 has source-level remediation evidence only.

This is not a second complete-suite certification; untested browser renders and advanced model workflows remain outside the evidence. No full green-suite claim is made.
