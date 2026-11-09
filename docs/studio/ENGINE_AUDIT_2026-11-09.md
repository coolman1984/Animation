# Studio engine audit — 2026-11-09

**Status: proposed work, nothing in this report is implemented.** This is a review document. No code was changed. The next agent implements it.

## ملخص لصاحب الاستوديو 🧭

- ✅ الاختبارات السريعة كلها ناجحة (١٥٦ ناجح، ١٨ متخطّى، صفر فشل)، يعني الأساس سليم.
- 🔴 لقيت **٧ أخطاء متأكد منها بالتجربة أو بالحساب**، أهمها: فيلم بإيقاع معيّن بيقع وقت التصوير، وملفات الترجمة والصور المصغّرة مبتطلعش لأي فيلم جديد، وأمر المشاهدة بيفتح المجلد الغلط.
- 🟠 فيه **حلقات مقطوعة بين المراحل**: قاعدة «تصوير واحد بس في نفس الوقت» مفيش حاجة بتفرضها، وقاعدة «دوّر في مكتبة الأصوات الأول» مش ممكن تتنفّذ مع المحرك الجديد، و«استكمال التصوير بعد الوقوع» مبيشتغلش فعلياً على جهازك.
- 🟡 حاجات ناقصة للمستقبل: قفل للتصوير، تنظيف المساحة، ملف واحد للمقاسات، فحص أقوى للموقع قبل النشر.
- 📋 الترتيب المقترح للتنفيذ في آخر التقرير (٦ دفعات صغيرة، كل دفعة لها اختبارها).

---

## 0. How to use this report (for the implementing agent)

- Every finding has an ID, a priority, the exact file and line, what is wrong, why it matters, how to fix it and how to prove the fix.
- **Priority:** P0 = a real delivery fails or is wrong. P1 = a promised step silently does not happen. P2 = robustness, safety, speed. P3 = clean-up.
- **Evidence:** `RUN` = I ran it here and saw it. `MATH` = reproduced with a small calculation on the real functions. `READ` = found by reading the code; reproduce before fixing.
- Line numbers are from commit `39e9b66` (branch base). Re-locate by the quoted identifiers if lines moved.
- Repository rules still apply: check each edit with the one relevant test file, `npm test` at most, never `test:render` or `test:all` to verify a change, at most two correction rounds per scope, update `STATUS.md`, `studio/CHANGELOG.md` and touched skills in the same commit.
- Fix in the batch order of section 9. Do not start section 8 (expansions) without an owner request: the vision files say they are not an automatic queue.

### What was reviewed, and what was not

| Depth | Files |
| --- | --- |
| Read line by line | `studio/studio.mjs`, `studio/make.mjs`, `lib/render.mjs`, `lib/cdp.mjs`, `lib/procs.mjs`, `lib/build-options.mjs`, `lib/cache.mjs`, `lib/platform.mjs`, `lib/serve.mjs`, `lib/composer.html`, `lib/production.mjs`, `lib/measure.mjs`, `lib/finish.mjs`, `lib/doctor.mjs`, `lib/engines.mjs`, `lib/capabilities.mjs`, `lib/review-server.mjs`, `lib/cues.mjs`, `lib/storyboard.mjs`, `lib/tastegate.mjs`, `lib/openverse.mjs`, `studio-engine/run.mjs`, `studio-engine/fast.mjs`, `studio-engine/story.mjs`, `studio-engine/lib/{pipeline,spec,events,gates,assets,analyze,director,core,player,sound}`, `web/lib/site.mjs`, `mcp/job.mjs` |
| Read in part (searched for risk points) | `mcp/server.mjs`, `studio-engine/lib/critic.mjs`, `studio-engine/lib/modules.js`, `lib/voice.mjs`, `web/lib/check.mjs`, `web/motion/motion.js`, `web/motion/site.css`, `test/docs.test.mjs`, both CI workflows |
| **Not reviewed** | `lib/review.mjs`, `lib/whisper.mjs`, `lib/scenegraph.mjs`, `lib/triage.mjs`, `lib/covers.mjs`, `lib/physics.mjs`, `lib/musicmap.mjs`, `lib/audio.mjs`, `lib/sfx.mjs`, `lib/kinetics.js`, `lib/cinema.js`, `lib/transitions.js` and the other browser helpers, `lib/agents.mjs`, `lib/toolkit.mjs`, `lib/movelib.mjs`, `lib/transcript.mjs`, `studio-engine/lib/{brush,painted,storykit,ribbon}`, all Python tools, `reference/`, `web/lab`, `web/gallery`, the 28 film folders, `studio/toolkit` and `studio/library` (third-party) |

The implementing agent should give the "not reviewed" list the same pass before calling the engine clean. The quick suite passed here: 174 tests, 156 pass, 18 skipped, 0 fail. No render, browser job or slow suite was run.

---

## 1. Confirmed bugs (fix first)

### B1 · P0 · MATH — Engine films fail at render when the duration does not round cleanly

- **Where:** `studio-engine/run.mjs:65` (`dur = +tl.duration.toFixed(3)`), written into `config.mjs` and `production.json` (lines 76, 86–88). `studio-engine/lib/player.js:38` returns the unrounded `tl.duration`. `lib/build-options.mjs:8` rejects `t1 > duration + 1e-6`.
- **What happens:** the config asks for a delivery that is up to 0.5 ms longer than the film. `frameRange` throws `invalid range 0-16.364; duration 16.363636…`. The message says nothing about tempo.
- **Reproduced:** `timeline({ bpm: 110, scenes: [{ beats: 30 }] })` gives 16.3636 s, rounded 16.364, and `frameRange(0, 16.364, 16.3636, 30)` throws. BPM 96, 127.84 and 140 pass only because they happen to round down.
- **Who is hit:** any spec whose `beats × 60 / bpm` rounds up at the third decimal, and every film with supplied music, because `tempo()` returns a two-decimal BPM.
- **Fix:** use one number everywhere. In `run.mjs`, after the tempo is known, set the rounded duration on the generated spec itself (`timeline()` already accepts a declared duration within 1 ms of the beats), so the player, the config and the production plan read the same value. Also relax `frameRange` to accept an end up to half a frame past the duration and clamp it, so a float difference can never fail a build again.
- **Test:** add a case to `studio-engine/test/engine.test.mjs` that builds the package for BPM 110 with `--stage=check`, imports the generated config and calls `buildOptions` + `frameRange` with the film duration the player reports. Add a `frameRange` case in `test/options-cache.test.mjs`.
- **Done when:** BPM 110, 127.84, 133.33 and 96 all pass the new test.

### B2 · P1 · RUN — Captions, thumbnails, contact sheet and music-only are produced for one legacy film only

- **Where:** `make.mjs:166–182` runs only when `d.name === 'hero60'`; `make.mjs:189` only for `bumper6`.
- **Checked:** only `film2/config.mjs` names a delivery `hero60`. No other config in `studio/` or `studio/examples/` does. Those films, everything made by `studio.mjs new` (delivery `reels30` etc.) and every Studio Engine film (delivery `youtube` or `reel`) never get SRT/VTT, thumbnails, `poster.jpg`, the contact sheet or the music-only file.
- **Why it matters:** skills `subtitles-rtl`, `thumbnail-poster` and `platform-delivery` describe these as part of delivery. They are silently absent.
- **Also in this block:** it reads `cfg.shareMB`, `cfg.thumbs`, `cfg.poster` and `cfg.en` without checking them, and a `hero60` delivery that also sets `shareMB` encodes the share copy twice (lines 168 and 184).
- **Fix:** replace the name tests with data. Each delivery may declare what it wants (captions, thumbnails, sheet, music-only, animated preview). Default: the first selected delivery of a final build gets captions and the contact sheet; thumbnails only when `thumbs` is non-empty. Keep `hero60` working through the same path. Guard every optional config field.
- **Engine films:** captions should come from the spec (caption and text elements with their beat times, and the narration word times when a voice exists), not only from DOM read-back, because that is the authored text with exact timing. Write `.ar.srt/.vtt` next to the deliverable in `run.mjs` after the gates pass.
- **Test:** unit-test a pure function "which extras does this delivery get" in `test/pipeline.test.mjs`; test the spec-to-captions function in `studio-engine/test/`.

### B3 · P1 · RUN — `review <film>` and `taste <film>` open the film's source folder

- **Where:** `studio.mjs:237` and `studio.mjs:355`.
- **What happens:** from inside `studio/`, `node studio.mjs review film24` resolves `film24` as an existing directory (the source folder), then prints "has no review player". `taste film24` passes a directory to ffprobe and dies with a stack trace. Both work only when started from the repository root.
- **Fix:** look in `out/<film>` first. Accept a path as a take only if its name is `takeNN` or it contains a `review-*` folder. For `taste`, accept a path only if it is a file.
- **Related, same lines:** `reviewCmd` sorts take names as text (`studio.mjs:239`), so `take100` sorts before `take99`. `tasteCmd` already sorts numerically; share one helper (`studio-engine/lib/pipeline.mjs` has `listTakes`).
- **Test:** new `test/cli.test.mjs` with a temporary `out/` tree; no browser needed (`--no-open`, and stop before the server starts or close it).

### B4 · P1 · RUN — Help shows 12 of 27 commands; an unknown command exits 0

- **Where:** `studio.mjs:543` prints `split('\n').slice(1, 13)`.
- **What happens:** `cleanup`, `director`, `triage`, `taste`, `storyboard`, `styles`, `web`, `lab`, `gallery`, `moves`, `toolkit`, `agents` are never listed. A typo such as `node studio.mjs bulid film` prints the short help and exits 0, so a calling script believes it worked.
- **Fix:** print every leading comment line up to the first import. For an unknown command print "unknown command" to stderr and exit 2. No command, or `help`, exits 0.
- **Same family (READ):** usage errors that exit 0: `voice` (line 168), `color` (195), `director` (325). Make them exit 2.

### B5 · P1 · READ — The logo-width check assumes a 1920-wide frame

- **Where:** `studio-engine/lib/gates.mjs:46`: `(e.w ?? 800) > 0.22 * 1920`.
- **What happens:** on a reel (1080 wide) a 400 px logo is 37 % of the frame and passes. When `w` is missing the default 800 always warns, on every format.
- **Fix:** give `lint` the format (width, height, safe box) and compare with the real frame width and the module's real default size. `run.mjs`, `mcp/server.mjs` and `critic.mjs` call `lint`; update the three calls.
- **Test:** `studio-engine/test/engine.test.mjs`, one reel case and one youtube case.

### B6 · P1 · READ — Motion-blur renders use a different frame number and have no stall recovery

- **Where:** `lib/render.mjs:210–217` (the `SUB > 1` branch).
- **What is wrong:** it passes `f` (the output frame index) to `renderAt`, while the normal branch passes `Math.round(t * info.fps)`. They differ whenever the build fps is not the film fps (every draft). The branch also skips the first-frame width gate, the "capture stalled → reopen the page" recovery and the progress line.
- **Fix:** one capture helper used by both branches: same frame number rule, same recovery, same width gate, progress counted per output frame.
- **Test:** unit-test the helper's frame-number rule with a fake client; no browser.

### B7 · P1 · READ — Web build: wrong font preload, crash without `brand`, distorted logo, empty headings, unsafe links

- **Where:** `web/lib/site.mjs`.
  - Line 163: the preload tag always says `type="font/woff2"` and uses the first face of the display family. Several families are `.ttf`, and an unknown family yields `assets/fonts/undefined`.
  - Line 169 reads `site.brand.logo` and `site.brand.name`; `validate()` (line 113) only uses `site.brand?.logo`. A site with no `brand` passes validation and crashes in `build`.
  - Line 169 forces the logo to `width="120" height="34"`; line 126 defaults the hero image to 900×900; line 130 gives collection images no size. This distorts or shifts layout. The house rule is "logo shown whole, never distorted".
  - `h(s.title)` writes an empty `<h2></h2>` when a section has no title (lines 127–135). Required text is not validated per section type (hero title, problem text, item title/text, FAQ q/a, quote text).
  - `cta.href` and footer links are escaped but the scheme is not checked: `javascript:` passes.
  - The header comment says validate checks "links"; nothing checks that `#contact` or any in-page target exists.
  - `sections[0]` may be `null`: line 97 reads `.type` on it.
- **Fix:** read real image sizes at build time (PNG, JPEG, WebP and SVG headers; `lib/cdp.mjs` already has `imageWidth` for PNG/JPEG), set the correct preload type or skip preload, validate `brand.name` and `title`, validate required fields per section type, allow only `https:`, `http:`, `mailto:`, `tel:`, `#id` and relative links, and check every `#id` target exists.
- **Test:** extend `test/web.test.mjs` and `test/web-content.test.mjs` with one case per item above.

---

## 2. Processes that are not linked (the chain breaks between steps)

### L1 · P1 · READ — Nothing enforces "one render or browser job at a time"

- **Rule:** AGENTS.md says a second render or browser job kills the host session on the owner's machine.
- **Reality:** only the MCP server refuses a second job, and only for jobs it started itself (`mcp/server.mjs:197, 210`). `studio.mjs build`, `run.mjs` stills, `fast.mjs`, `web check`, `web audit`, `director inspect`, `doctor`, `cover --renderer=chromium` and `triage` can all overlap with each other and with an MCP job.
- **Fix:** one lock file under `takes/` holding pid, start time, command and film. Take it in `lib/cdp.mjs` `launch()` so every browser user is covered in one place. A child started by a lock holder inherits permission through an environment variable carrying the holder's pid. A stale lock (holder pid not alive, using `procs.alive`) is taken over with a log line. The MCP server reads the same lock instead of its own job scan. `cleanup` reports and clears a stale lock.
- **Test:** `test/platform.test.mjs` or a new `test/lock.test.mjs`: acquire, refuse second, inherit by env, take over stale.
- **Done when:** starting a second `build` while one runs prints one clear line naming the running job and exits non-zero without launching a browser.

### L2 · P1 · READ — "Resume after a crash" does not work with one worker

- **Where:** `lib/render.mjs:168–187`.
- **What is wrong:** the film is cut into as many slices as there are workers. The owner's machine plans one worker, so the whole film is one slice, and a crash at 95 % loses everything (a partial slice is deleted at line 186). The resume stamp also includes the worker count (line 170), so different free memory on the next run cancels the resume and deletes all finished slices (line 173).
- **AGENTS.md says** the build "resumes finished slices". On this machine it cannot.
- **Fix:** cut by time, not by workers: fixed slices of about 5 s of output frames, aligned to the key-frame interval. Workers take slices from a queue. The stamp holds key, fps, first, last and slice length, not the worker count. Keep the join step as is.
- **Test:** unit-test the slice planner (pure function: range + fps + slice length → slices) and the resume decision with a fake previous stamp.

### L3 · P1 · READ — "Openverse first" cannot be followed for Studio Engine films

- **Where:** `lib/openverse.mjs:43–44` accepts only a top-level film folder name (no slash). Engine films live in `studio-engine/films/<film>`.
- **Second gap:** the engine score (`studio-engine/lib/sound.mjs`) plays only its own synthesised effects plus one optional `audio.music` file. A downloaded effect or ambience has no place in a spec.
- **Third gap:** the download writes `CREDITS.json`, but nothing copies those credits into the film's production assets, so the "record owner/permission/license" check (`lib/production.mjs:37`) never sees them, and the LEDGER is not touched.
- **Fix:** let `sfx --download` target an engine film. Add an optional list of sound files to the spec (file, start in beats or seconds, gain, a role such as ambience or effect, and whether it replaces the synthesised sound of a named event). `sound.mjs` mixes them into the SFX or music bus. `run.mjs` adds each one to `production.assets` with the licence text from `CREDITS.json`, so a missing licence blocks a final build. Lint checks the files exist.
- **Test:** `test/openverse.test.mjs` (engine target with mocked fetch) and a `sound` unit test with a short generated WAV.

### L4 · P1 · READ — The narration and the supplied music are never checked against the film length or level

- **Where:** `studio-engine/lib/sound.mjs:137–147`.
- **What is wrong:**
  - A voice file longer than the film is cut off mid-word at the last sample (line 145); nothing warns.
  - Supplied music shorter than the film leaves silence at the end; nothing warns.
  - The voice is added at a fixed gain of 1.6 (line 145) whatever the recording level, then the whole mix is soft-clipped. Speech level against music is uncontrolled.
  - `lib/mixcheck.mjs` exists for this and is not called by `run.mjs`.
- **Fix:** in `run.mjs`, probe both files after analysis; error when the voice ends after the film, warn when the music ends before it. Normalise the voice to a target loudness before mixing. After the final build, run the mix check on the deliverable when a voice exists and treat a failed speech-level check as a gate failure.
- **Test:** `studio-engine/test/` with generated tones for the length checks.

### L5 · P1 · READ — Finishing gates differ between the two build doors

- The taste gate runs only in `studio-engine/run.mjs:123`. Hand-coded films built with `studio.mjs build` never get it.
- The house critic and storyboard lint run in `run.mjs` only as a side effect of `validateProduction`; the critic itself (`director review`) is never part of a build.
- Engine films get no captions (B2). Hand-coded films get no sync gate.
- **Fix:** write one "delivery checklist" function that both doors call after a final build: technical gates, text read-back, taste gate, sync where an SFX stem and events exist, captions, poster. Each line reports PASS, FAIL or NOT CHECKED with the reason. One list for both doors means a new gate is added once.

### L6 · P2 · READ — Production preflight for engine films is filled with constants

- **Where:** `studio-engine/run.mjs:76–78`. Every shot gets `scale: 'designed'`, `camera: 'rig'`, `depthLayers: 3`, `audioCue: 'groove'`, and a copy interval equal to the whole scene.
- **Effect:** `validateCraft` and `creativeIssues` always pass for engine films, and the reading-speed notes are computed on wrong intervals. The check looks like it ran.
- **Fix:** derive the real values (copy intervals from each element's `at`/`out`, camera from the scene's camera fields, layers from element types), or skip those checks for engine films and print "not applicable: covered by the house critic". Do not write placeholder values that exist only to pass a validator.

### L7 · P2 · READ — Four different lists of formats and two sets of safe areas

| Place | Formats | Safe area for 1080×1920 |
| --- | --- | --- |
| `studio.mjs:37–42` (`new`) | reels, youtube, feed, square | 65, 269, 1015, 1248 |
| `studio-engine/brand/brand.json` | reel, youtube, post, square | 60, 220, 1020, 1580 |
| `mcp/server.mjs:99` | youtube, reel only | from brand |
| `studio-engine/lib/director.mjs:20` | anything that is not `youtube` silently becomes reel | from brand |
| `run.mjs` usage, `fast.mjs`, `story.mjs` | 2, 4 and 4 formats | from brand |

- **Effect:** the same reel is checked against two different safe boxes depending on the door. `director plan --placement=square` quietly plans a reel. MCP clients cannot ask for square or post at all.
- **Fix:** one placements file (name, aliases, size, safe box, share size, note). `studio.mjs new`, the brand defaults, the MCP enum, the director plan and every usage line read it. Unknown names are an error, never a silent default. Decide with the owner which reel safe box is the current one and record the source and date beside it.

### L8 · P2 · READ — Two doors for a new film, and the old one gives no warning

- AGENTS.md: new films are made with the Studio Engine (`director plan` → `run.mjs`).
- `studio.mjs new` still scaffolds a hand-coded film for `make.mjs` and its closing line sends the agent to `make.mjs` directly, not to `studio.mjs build` (line 151), against the rendering rule.
- **Fix:** make `new` print which door it is and when to use it, and point to `studio.mjs build`. Reject non-numeric `--duration` and `--fps` (today `--duration=abc` writes `NaN` into `config.mjs`, line 98).

### L9 · P2 · READ — `fast.mjs` bypasses every safety step of a build

- **Where:** `studio-engine/fast.mjs`.
- It opens its own browser with GPU flags always on, does not reap orphans, does not plan memory, writes no build log and takes no lock. ffmpeg's stdin and `error` events have no handlers (a dead encoder crashes node with EPIPE). `--format=both` reads an undefined format. `--copy` works but is undocumented.
- **Fix:** route it through the same lock and reap (L1), add the handlers, validate flags, document `--copy` or remove it. Label its output file name as a quick look so it cannot be mistaken for a delivery.

---

## 3. Engine correctness and robustness

### R1 · P2 · READ — Typos in a spec fall back silently or crash inside the browser

- `scene.music` labels: unknown label is treated as a generic section (`sound.mjs:66`).
- `music.progression` chords: unknown chord plays A minor (`sound.mjs:71`).
- `music.hook`: unknown name uses an automatic hook (`sound.mjs:64`).
- `scene.transition`: unknown value is a cut.
- `spec.background`: unknown value calls `undefined` as a function in `player.js:47` and the build ends with "composer error".
- `out` is never compared with `at` or with the scene's beats (`gates.mjs:39` checks `at` only).
- **Fix:** validate every enumerated field in `lint` with the allowed list in the message. Export the lists from one place so `sound.mjs`, `player.js`, `gates.mjs`, `catalog.json` and the MCP hints (`mcp/server.mjs:26` lists 20 element types; lint knows 22) cannot drift. Add a test that compares the four lists.

### R2 · P2 · READ — `brand.json` is never validated

- `lint` checks only that `brand.colors` exists (`gates.mjs:16`). The player needs `colors.ink`, `text`, `accent`, `glow`, `primary`; `fonts.display`; `export.fps`, `lufs`, `tp`, and each format's `w`, `h`, `safe`, `shareMB`.
- A style card that lacks one key produces CSS such as `undefined47` or `NaN` sizes with no error.
- **Fix:** a `validateBrand` function called by `run.mjs`, the MCP server and `director plan --style`. Test it against every card in `studio/styles/`.

### R3 · P2 · READ — The composer gives up after 5 s with an empty message

- **Where:** `lib/render.mjs:43–48`. The loop waits 100 × 50 ms for `window.ready` to exist. That covers the film's module import and `init`.
- A heavy `init` (Three.js, large textures, many fonts) on a slow machine fails with "composer failed to become ready:" and nothing after the colon.
- **Fix:** wait up to the CDP timeout, and say which phase did not finish (module import, init, fonts, images, registered waits).

### R4 · P2 · READ — Missing files and missing fonts do not fail a render

- `composer.html:133` checks `<img>` only. A 404 for a font, texture, video, JSON or module chunk is invisible.
- A film that names a font family not declared in `composer.html` renders in a fallback font with no warning.
- **Fix:** listen for failed and 4xx/5xx network responses and browser log errors in `openFilm`; fail the render with the URL. After `ready`, compare the font families actually used by text lines with the loaded faces and fail on a fallback.
- **Related:** `composer.html:132` loads every declared face for every film. Fonts are hard-coded in `composer.html`, and because that file is inside `lib/`, adding one brand font invalidates the picture cache of every film. Move the face list to data (shared defaults plus per-film faces).

### R5 · P2 · READ — Non-deterministic pages are not detected

- `lib/cdp.mjs:228–236` (`settleCapture`) returns quietly when two screenshots never match. A page with a CSS animation, an autoplaying video or a free-running loop will render differently each run.
- **Fix:** when the settle loop never matches, fail with "something on the page moves without `renderAt`". Add an optional determinism check in the review and final profiles: render two or three sample times twice and compare.

### R6 · P2 · READ — `film.js` and `config.mjs` are never compared

- A film that reports 60 fps under a 30 fps config renders with mismatched frame numbers. A film longer than the delivery is cut silently (`render.mjs:164–165` only rejects a delivery longer than the film).
- **Fix:** after the first probe, compare the film's fps and duration with the config and the selected delivery. Deliveries with `segments` are exempt from the duration rule.
- **Also:** `config.mjs` has no shape check. Missing `deliveries`, `score`, `w`, `h` or `fps` gives a raw TypeError (`build-options.mjs:26`, `make.mjs:54`). Add a `validateConfig` with plain messages. `make.mjs:54` requires `cfg.score` even for a draft, which never uses it.

### R7 · P2 · READ — Doctor blocks builds for tools a build does not need

- **Where:** `lib/doctor.mjs:163`: `rows.slice(0, 9).every(...)`.
- The first nine rows include "subtitles (libass) burn-in" and "GIF/WebP preview". A machine without libass cannot build any film, although only caption burn-in needs it. The rule depends on row order, so inserting a row changes what is required.
- **Fix:** mark each row required or optional by name. Builds need Node, Chromium, the scale gate, ffmpeg/ffprobe, x264 + AAC, the loudness filters and the detect filters.
- **Also here:** `probeChromium` (lines 33–72) has no handler for a failed spawn or an early exit and duplicates the launch code of `lib/cdp.mjs`; reuse `launch`. `findChromium` accepts a directory (`existsSync` only). "Disk free" is always OK (line 157): warn below a threshold.

### R8 · P2 · READ — The cache reads too much and tracks too little

- **Too much:** `fingerprint` (`lib/cache.mjs:7–19`) reads every file of the film folder, `lib/` and `assets/` fully into memory on each call. A film folder with footage means gigabytes and long waits. All of `lib/` is a picture input (`make.mjs:87`), so editing an audio or caption module re-renders every film.
- **Too little:** files a film imports from outside those folders are not in the key: `library/motion-prompt/packs`, another film's shared module, and the versions of `vendor/node_modules` (Three.js, Pixi, Rapier). An upgrade or an edit there reuses an old picture.
- **Fix:** build the picture key from the film's real import graph (static imports starting at `film.js`) plus declared assets plus vendor package versions plus the composer and capture modules. Hash by stream, and remember hashes by size and modified time within one run.
- **Test:** `test/options-cache.test.mjs`: editing an unrelated lib file keeps the key; editing an imported pack changes it.

### R9 · P2 · READ — A failed build leaves no report

- `make.mjs:82` creates the take folder before rendering; a failure leaves an empty `takeNN`.
- An exception in the delivery loop (lines 119–214) exits with a stack trace and no `measure.json`, so `run.mjs`, the MCP job view and the owner have only a log tail.
- **Fix:** wrap the loop; always write a report with `failed: true`, the step and the message. Remove an empty take folder on failure, or create it only when the first file is ready.

### R10 · P2 · READ — Work is repeated on every engine final

- Text timeline every 0.1 s runs in `run.mjs:100` and again in `make.mjs:142–149` (a third browser start).
- `lib/render.mjs:161–163` starts a browser only to read fps and duration, closes it, then starts the workers.
- The stills gate re-renders even when the spec did not change.
- On the owner's machine each start costs seconds.
- **Fix:** store the text timeline under the same content key so the second step reads it; reuse the probe browser as worker 0; key the stills gate on the package hash.

### R11 · P2 · READ — Sharing the asset library between films causes collisions

- **Where:** `studio-engine/lib/assets.mjs:22, 29`. A supplied file with no prompt gets an id made from its kind only. Every film's `logo` therefore has the same id and the same library file name.
- **Effect:** building film A then film B overwrites the stored logo each time and rewrites `studio-engine/assets/library.json`, which is tracked in git (constant diffs). Two formats or two agents working on different films can pick up the other film's logo between the copy and the render.
- **Fix:** for supplied files, make the id from the content hash (or film name + alias). Keep the alias for the spec.

### R12 · P2 · READ — The share copy and loudness gates can fail a finished build at the last step

- `lib/finish.mjs:69–81`: the two-pass share copy is not re-encoded when it lands above the budget; the gate (`measure.mjs:93`) then fails the whole build after every other step succeeded. Retry once with a lower rate before failing. The share encode also omits the colour range tag.
- `lib/measure.mjs:79`: "LRA < 8 LU" is a hard gate. A score with a quiet opening and a loud payoff can exceed it by design. Ask the owner whether this is a rule or advice; make it a note unless they confirm.

### R13 · P3 · READ — Smaller engine items

| ID | Where | Problem | Fix |
| --- | --- | --- | --- |
| R13a | `render.mjs:80` | The stills contact sheet lists every `t*.png` in the folder, including old runs, while the grid is sized for the new times. | Clear old stills first or list only the current times. |
| R13b | `render.mjs:100` | Text spans are keyed by text. Two lines with the same words in different places merge into one box. | Key by text + position. |
| R13c | `cdp.mjs:197–202` | `goto` ignores a navigation error and waits 45 s for a load that cannot happen. | Check the navigate result. |
| R13d | `procs.mjs:13–18` | The registry is read-changed-written without a lock; two processes lose entries. A reused parent pid hides orphans. | Store the parent start time; write under the L1 lock. |
| R13e | `platform.mjs:15` | `isMain` compares URLs exactly. A different drive-letter case or a linked path makes a CLI do nothing, silently. Not verified on Windows. | Compare real paths, case-insensitive on Windows. |
| R13f | `studio.mjs:206` | `cleanup` deletes every temp folder starting with `doctor-`, including other programs' folders. | Use a studio-specific prefix. |
| R13g | `studio.mjs:213–233` | `build` creates `takes/<argument>` before checking the name, and does not pass a stop signal to the child. | Validate first; forward signals. |
| R13h | `studio.mjs:313` | `director inspect` uses `timeline(spec)`; `director review` uses `timeline(forFormat(spec, format))`. Times are wrong when a format override changes beats. | Use the format spec in both. |
| R13i | `studio.mjs:16, 303–315` | Help offers `director inspect <path/film.js>`; the code accepts only a film folder or an engine film. | Support it or remove it from the help. |
| R13j | `studio.mjs:438` | `web serve` serves an old `dist` after `site.json` changed. | Always rebuild, like `web check`. |
| R13k | `studio.mjs:469–471` | `moves show <unknown id>` throws a TypeError. | Print "not found" and suggestions. |
| R13l | `studio.mjs` main | Errors reach the owner as stack traces. | One top-level handler: message, hint, exit code; stack only with a debug variable. |
| R13m | `tastegate.mjs:31` | Decoding into one 1 GiB buffer fails for long portrait films (about 8 minutes and up). | Decode as a stream. |
| R13n | `studio.mjs:345` | `taste <film>` may pick a DRAFT file from the newest take. | Prefer the share or master of the newest final take; say which file was judged. |
| R13o | `story.mjs:37–41` | A recording is aligned by counting words. One extra or missing recognised word shifts every later line. | Align by matching words (allow a few differences per line). |
| R13p | `story.mjs:108–111` | When narration fails, the film is written without a voice and only a console note says so. | Fail unless `--voice=none`, or carry the note into `spec.json` and the delivery line. |
| R13q | `voice.mjs:103` | Cloud voice requests have no timeout. | Add a timeout and one retry. |
| R13r | `engines.mjs` + `make.mjs` | A film whose engine is Motion Canvas always exits 2 with editor steps; nothing explains this before the build starts. | Report "manual engine" in preflight with the steps. |

---

## 4. Safety

### S1 · P2 · READ — A downloaded sound can be written outside its folder

- **Where:** `lib/openverse.mjs:27, 49`. The file extension comes from the remote answer (`filetype`, or whatever follows the last dot of the URL) and is placed in the file name unchanged. A value containing path separators writes outside `assets/sfx/`.
- There is no size limit and no check that the file is audio.
- **Fix:** accept only a short alphanumeric extension from a known list, cap the download size, confirm with ffprobe that it has an audio stream, and delete it otherwise.
- **Note:** line 10 sends the repository address in the User-Agent to an outside service on every search. Ask the owner whether that is wanted; a generic client name works.

### S2 · P2 · READ — Any web page can approve a film on the review server

- **Where:** `lib/review-server.mjs:20–31`. The save-notes and approve endpoints accept any POST. A page open in the owner's browser can post to `127.0.0.1` and record an approval. The random port lowers the chance, it does not remove it.
- Line 18: a body over the size limit destroys the request and the handler never answers.
- **Fix:** require a JSON content type and an Origin that matches the server's own address; add a per-session token in the player URL. Answer 413 for oversized bodies.

### S3 · P2 · READ — Link schemes on built sites

- Covered in B7: restrict `href` schemes in `web/lib/site.mjs`.

### S4 · P3 · READ — The composer file server

- `lib/serve.mjs` has no byte-range support and no types for `.mp4`, `.webm`, `.mp3`, `.wasm`, `.woff`, `.otf`, `.glb`, `.gltf`, `.hdr`, `.ktx2`. Video seeking in live-action pages and streamed WebAssembly loading depend on these. `lib/review-server.mjs` already has range code; share it.

### S5 · P3 · READ — Generated and private files

- `studio-engine/b-*` (generated packages) is not in `studio/.gitignore`. `run.mjs:46–47` writes absolute machine paths for music and voice into the generated spec, config and production plan. Ignore the folders and keep the paths relative to the studio.
- `studio-engine/cmp-frames/*.png`, `compare-aixhr.png` and the 7 MB root `Screen_Recording_20261002_143800_X.mp4` are tracked. The root `.gitignore` does not carry the `*.mp4` rule that `studio/.gitignore` has. Ask the owner before removing anything; at least stop new ones.

---

## 5. Web department

Beyond B7:

| ID | Priority | Gap | What to build |
| --- | --- | --- | --- |
| W1 | P2 | No social card, canonical address, favicon, robots file, sitemap, structured data or 404 page. Skill `landing-page-design` asks for them. | Optional `site.json` fields; the build writes them only when the data is supplied (content-first rule, 2026-11-03). |
| W2 | P2 | Images are copied as they are: no resizing, no modern formats, no size variants. | Make variants with ffmpeg at build time and write `srcset`; keep the original when ffmpeg is missing and say so. |
| W3 | P2 | `web check` sees script errors and broken images but not a missing font or stylesheet. | Add a network-failure light in `web/lib/check.mjs`. |
| W4 | P3 | `web/motion/motion.js` still carries word splitting, parallax and counters that the 2026-11-03 owner update removed from defaults; `site.css` has an unused `slide` animation and a duplicated right-to-left marquee rule. | Keep them only if documented as opt-in with a reason in DESIGN.md; otherwise delete. Check `motion.js:14`: content must stay visible when the observer API is missing. |
| W5 | P3 | The section type is still called `ring` though it is now a plain horizontal list. | Add the name `collection`, keep `ring` as an alias, update WEB.md and the skill. |
| W6 | P3 | Single page only, no forms. Already listed as "not built" in STATUS. | Owner decision. |

---

## 6. Code health and tests

- **T1 · P2 — No test touches these modules:** `lib/doctor.mjs`, `lib/imagelab.mjs`, `lib/mixcheck.mjs`, `lib/cuesheet.js`, `lib/fx.js`, `lib/gpu.js`, `lib/particles.js`, `lib/screen.js`, `studio-engine/lib/core.js`, `studio-engine/lib/storykit.js`. There is also no test for the `studio.mjs` commands (B3 and B4 lived there unnoticed), for the extras logic in `make.mjs` (B2), for resume (L2) or for `fast.mjs`.
- **T2 · P2 — `make.mjs` cannot be tested** because it is one top-level script that reads `process.argv` and exits. Move the decisions into functions in `lib/` (which extras, which range, gate inputs, report shape) and keep `make.mjs` as the thin caller.
- **T3 · P3 — Five different flag parsers** (`studio.mjs:45`, `render.mjs:257`, `run.mjs:20`, `fast.mjs:19`, `story.mjs:91`) with different rules. `render.mjs` and `run.mjs` cut a value at its second `=`. Use one parser with a declared list of flags and types per command.
- **T4 · P3 — Repeated code:** the copy-text extractor exists in `run.mjs:74` and `critic.mjs:41` with different results; contrast is computed in `gates.mjs`, `web/lib/site.mjs` and `web/lib/check.mjs` (with two different gamma thresholds: 0.03928 and 0.04045); Chromium launch exists in `doctor.mjs` and `cdp.mjs`.
- **T5 · P3 — Circular import:** `lib/storyboard.mjs` imports `studio-engine/lib/critic.mjs`, which imports `lib/storyboard.mjs`. It works today because the shared function is only called later. Move `copyOf` to a small neutral module.
- **T6 · P3 — No static checks.** No linter, formatter or type check; several files are written without spaces and are hard to review (`build-options.mjs:24–36`, `web/lib/site.mjs:17–47`). A type check over JSDoc with no new runtime dependency would have caught B7's missing `brand` and several undefined reads. This adds a development tool: follow the technology-scout rule and ask the owner first.
- **T7 · P3 — CI** runs `test:all` then `test:render` under a 10-minute cap. As tests grow this will time out with no clear message. Split the two into separate jobs.

---

## 7. Documentation and agent cost

- **D1 · P2 — `STATUS.md` is 52 KB and every agent must read it first.** It is a history of every closed scope. Keep the current scope, the last two closed scopes and the "not verified" list there (about one screen), and move the rest to `docs/studio/HISTORY.md`. `test/docs.test.mjs` only needs the `Updated:` date, so the test stays green.
- **D2 · P3 — Statements in AGENTS.md that the code does not back today:** "resumes finished slices" (L2), "never run a second render" as a guarantee (L1), Openverse-first for every film (L3). After the fixes they become true; until then add "not enforced yet" beside them.
- **D3 · P3 — Help text and usage lines drift from the code** (B4, R13i, L7). Generate usage from the same flag declarations as T3.
- **D4 · P3 — The MCP error hints** (`mcp/server.mjs:22–40`) are a hand-kept copy of lint messages and lists. Generate them from the same exported lists as R1.

---

## 8. Missing pieces and future expansions (owner decides; not an automatic queue)

Each item says what does not exist today and the smallest useful first step.

1. **Disk housekeeping.** `takes/` and `out/` only grow; each profile keeps a silent video, mixes and a full take. First step: `studio.mjs gc` that lists sizes and removes all but the last N takes per film after confirmation, plus a low-disk warning before a render with an estimated size.
2. **One delivery record.** AUTONOMOUS_FILM asks for "one finished video link". Today a final leaves files in a take folder and lines in a log. First step: a small `delivery.json` per final (file, hash, size, gates, what was not checked, credits) that the LEDGER line and the owner message are written from.
3. **Captions as a first-class output** for engine films in Arabic and English (see B2), with burn-in as an option.
4. **Cover at delivery.** `lib/covers.mjs` makes title cards but nothing calls it at the end of a film build. First step: optional `cover` block in the spec or config, rendered once after the gates pass.
5. **3D inspection views** from `VISION_3D_AND_MOTION.md` (exploded and reassembly, ghosted interior, cutaway, working parts). The engine's element list has no 3D model element; only hand-coded films and the web gallery example do this. First step when the owner asks: one `model` element backed by the vendored Three.js with a declared part list, explode distance, ghost opacity and a clip plane, each a pure function of time, plus the text "eyes" for it. Assessed here as **deferred**: this audit is about correctness, and the vision file says it is not an implementation queue.
6. **Per-film fonts** without editing `composer.html` (see R4).
7. **Engine formats everywhere** (square and 4:5 through MCP and the director plan; see L7).
8. **Sound files in a spec** (see L3): ambience beds, recorded effects, a second music cue.
9. **Voice checks:** pronunciation lexicon coverage report, and a gate that the narration transcript matches the script within a tolerance.
10. **Brand kit from a client URL** and **multi-page sites with forms**: both already recorded in STATUS as not started.
11. **Render speed on capable machines:** hardware encoders are detected by the doctor but never used; drafts could use them. Measure first.
12. **A machine-readable capabilities-to-code check:** `capabilities.json` says what is PRODUCTION or PROVEN; a test could confirm each such entry has a passing study file and a test, so maturity labels cannot drift.

---

## 9. Suggested order of work

Each batch is one scope with its own tests and one commit. Stop and report after each.

| Batch | Contains | Why this order |
| --- | --- | --- |
| 1. Stop the bleeding | B1, B3, B4, B5, B6, R13a–c, R13h–l | Small, confirmed, low risk; adds the CLI test file used by later batches. |
| 2. One render at a time, and real resume | L1, L2, L9, R9, R13d, R13f, R13g | Protects the owner's machine; everything after needs safe renders. |
| 3. Honest inputs | R1, R2, R3, R4, R5, R6, R7, L7, L8 | Errors appear before a browser starts, with plain words. |
| 4. One delivery checklist | B2, L5, L4, L6, R12, T2 | Both doors produce the same finished set; `make.mjs` becomes testable. |
| 5. Sound and assets | L3, R11, S1, R13o–q | Makes the Openverse rule real for engine films. |
| 6. Web and safety | B7, S2, S4, S5, W1–W5 | Independent of the film pipeline. |
| Then | R8, R10, T1, T3–T7, D1–D4 | Speed and upkeep, after behaviour is correct. |

### Acceptance for the whole programme

- `npm test` stays green and grows by the tests named above.
- One Studio Engine film at BPM 110 with a supplied voice and one downloaded Openverse sound builds to a final on the owner's machine: one render at a time enforced, captions written, every gate either PASS or named NOT CHECKED, licence lines present.
- A second build started during that render is refused with one clear line.
- Killing that render half-way and starting it again reuses the finished slices.
- `node studio.mjs` lists every command; a mistyped command exits 2.

---

## 10. Open questions for the owner

1. Reel safe area: which box is current, the one in `studio.mjs` or the one in the brand file (L7)?
2. Is "loudness range under 8" a rule or advice (R12)?
3. May the search client stop sending the repository address to the sound service (S1)?
4. May the tracked recording in the repository root and the comparison frames be removed from git (S5)?
5. Is a development-only type checker acceptable (T6)?
