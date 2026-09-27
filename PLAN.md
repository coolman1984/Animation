# Motion Studio — Architecture Plan

> Status: **PROPOSAL — awaiting approval. Nothing below is installed yet.**
> Researched: 2026-09-27, from the official sources (npm registry + the official GitHub repos
> `heygen-com/hyperframes`, `remotion-dev/skills`, `remotion-dev/remotion`, `@21st-dev/cli`).
> The docs websites (hyperframes.heygen.com, remotion.dev, 21st.dev) are blocked by this
> environment's network policy, so the repos' own `docs/` and `SKILL.md` files were read instead.

---

## 0. What this repo is (and is not)

A **permanent studio**, not a video. The repo holds the *process*, the *taste*, and the *tools*;
each video is a project that runs through the same directed pipeline. The engines render pixels;
the studio layer decides **what** to render and **refuses to render until it has been directed**.

```
          ┌──────────────────────── STUDIO LAYER (ours) ───────────────────────┐
 prompt → │ reference analysis → brief → 3 directions → scene specs → QA loop │ → final
          └───────────────┬──────────────────────────────┬─────────────────────┘
                          │ router                        │ components
              ┌───────────▼──────────┐        ┌───────────▼───────────┐
              │ HyperFrames (primary)│        │ 21st.dev (UI source)  │
              │ Remotion (secondary) │        │ real product UI       │
              └───────────┬──────────┘        └───────────────────────┘
                          ▼
                 headless Chromium → FFmpeg → MP4 / WebM / ProRes / PNG
```

---

## 1. Environment inspection (what exists today)

| Item | State | Consequence |
|---|---|---|
| Repo | Empty, branch `claude/gracious-feynman-77z22v`, no commits | Clean slate |
| Node | 22.22.2 (+ npm 10.9, pnpm, bun) | Meets HyperFrames (≥22) and Remotion |
| Chromium | Pre-installed at `/opt/pw-browsers` (Playwright) | Reuse it — no browser download |
| FFmpeg | **Not installed** (only a stripped Playwright build) | Must install `ffmpeg` 6.1.1 via apt |
| Python | 3.11 | Available for small QA helpers (optional) |
| CPU / RAM / disk | 4 cores / 15 GB / ~30 GB free | Fine for 1080p; 4K renders will be slow |
| GPU | None | Software rendering (SwiftShader) — slower but *deterministic* |
| Container | **Ephemeral** — reclaimed after inactivity | Anything installed with apt must be re-installed each session → SessionStart hook |
| Network | npm, GitHub (git), apt reachable; doc sites blocked | Skills are vendored into the repo so sessions never depend on network |

---

## 2. Research summary (current official state)

### HyperFrames — `hyperframes@0.8.80` (Apache-2.0, HeyGen) — **PRIMARY ENGINE**
- A video = an **HTML file**. Timing via `data-start / data-duration / data-track-index`, elements
  with `class="clip"`, animation through **seekable adapters** (GSAP, CSS, WAAPI, Anime.js, Lottie,
  Three.js). No build step. Headless Chrome seeks every frame → FFmpeg encodes. Deterministic.
- CLI verbs we will use: `init`, `capture` (grab a real website's visuals), `add` / `catalog`
  (blocks: transitions, charts, overlays, captions), `lint`, **`check`** (runtime errors, layout
  overlaps, off-canvas, WCAG contrast, `*.motion.json` assertions; `--snapshots` gives annotated
  frames), **`snapshot --at t1,t2`**, **`keyframes`** (motion diagnostics), `compare`,
  `preview` (Studio in browser), `render` (`--quality`, `--fps`, `--format`, `--docker`), `doctor`.
- Ships **21 agent skills**: router `/hyperframes`, domain skills (`hyperframes-core`,
  `-animation`, `-keyframes`, `-creative`, `-cli`, `-registry`, `-audio`, `media-use`) and creation
  workflows (`product-launch-video`, `motion-graphics`, `faceless-explainer`, `general-video`,
  `music-to-video`, `slideshow`, …). Its own loop already includes BRIEF.md → STORYBOARD.md →
  static sketch sheet (`storyboard.html`) → build → `check` → preview → approval → render.
- Install for agents: `npx hyperframes skills update` (core set, non-interactive).
- Also `frame.md`: a brand design system re-written for the camera — exactly our `/brand` layer.

### Remotion — `remotion@4.0.529` + Agent Skills — **SECONDARY ENGINE**
- A video = **React components**, driven by `useCurrentFrame()`; typed props (zod), `calculateMetadata`,
  bundler required. Mature `<Player>`, Lambda, and Studio.
- Official skills (`npx skills add remotion-dev/skills`): `remotion-best-practices`,
  `remotion-create`, `remotion-markup`, `remotion-studio`, `remotion-render`, `remotion-maps`,
  `remotion-captions`, `remotion-multimedia`, `remotion-interactivity`, `remotion-docs`, …
- ⚠️ **License**: free for individuals, non-profits, and companies with **≤ 3 employees**; larger
  for-profit companies need a paid Company License. HyperFrames has no such limit.

### 21st.dev — `@21st-dev/cli@1.17.1` (MIT) — **UI COMPONENT SOURCE, not an engine**
- Registry of high-quality React + Tailwind (shadcn-style) components. CLI `21st`:
  `search` (free), `logo` (free SVG brand logos), `get` (component code — **metered**, needs login /
  `TWENTYFIRST_TOKEN`), `add`, `theme` (free), `review` (local UI lint), `skills install`,
  `init --client claude` (MCP config). `generate` is a paid hosted-AI feature — **not used**.
- Components are built for *interactive web pages*, so they need adaptation for video (see §4).

### FFmpeg
- Required by both engines (encode, audio mix) and by our QA tooling (frame extraction, contact
  sheets, scene-cut detection on reference videos, loudness). apt candidate: **6.1.1**.

### Claude persistent workflow
- `CLAUDE.md` at repo root is loaded automatically every session → holds the **non-negotiable
  pipeline**. Project skills in `.claude/skills/` are auto-discovered. `.claude/settings.json`
  holds permissions + a **SessionStart hook** that rebuilds the toolchain in fresh containers.

---

## 3. Key architectural decisions

1. **Don't reinvent what HyperFrames already does well.** Its skills own the *craft* (valid HTML,
   seek-safe animation, lint, render). Our studio skills own the *direction* on top: reference
   analysis, the 3-direction pitch, the per-scene spec, the director-notes QA loop, and routing.
   Where the two disagree, **our gates win** (e.g., HF allows skipping sketches — we don't).
2. **One engine per video.** Never mix engines inside a single composition. The router decides
   once, records it in the brief, and the project stays in that engine.
3. **Vendor and pin the skills** into `.claude/skills/` (committed). Sessions work offline and
   don't drift; `npm run studio:skills:update` refreshes deliberately, with a diff to review.
4. **Real over invented.** Supplied screenshots / URLs / brand files are the source of truth.
   The agent may *re-typeset* real UI for clarity but may not fabricate product screens.
5. **Everything is inspectable as images.** Every gate produces PNGs the agent reads with its own
   eyes (static frames, snapshots, contact sheets) — no "looks good" without looking.

---

## 4. The engine router

Stored in `.claude/skills/studio-router/SKILL.md`; the decision + reason is written into each
project's `brief.md`.

| Signal in the request | Engine | Why |
|---|---|---|
| Default: launch / promo / explainer / motion graphic / social / kinetic type / logo sting | **HyperFrames** | Agent-native HTML, no build, best QA tooling (`check`, `snapshot`, `keyframes`) |
| Website URL or real product screenshots | **HyperFrames** (`capture`) | Captures the real site's visuals |
| Data viz: one-off chart story, counters, maps | **HyperFrames** (catalog `data-chart`, D3/SVG + GSAP) | Seekable SVG, fewer moving parts |
| **Template × data batch**: many variants from a typed dataset (e.g. 200 personalised clips, weekly stats series) | **Remotion** | Typed props + `calculateMetadata` + batch rendering are its strength |
| Scene is fundamentally a **live React UI** (a 21st.dev / shadcn component whose *states* must animate, not just its look) | **Remotion** | Runs the real component; HF would need a re-implementation |
| Existing Remotion codebase / need `<Player>` embed in a React app / Remotion Lambda | **Remotion** | Stay where the code lives |
| Talking-head captions / overlays, music-driven cuts, decks | **HyperFrames** workflows | Dedicated official workflows |
| Remotion license not satisfied | **HyperFrames**, always | Legal gate |

**21st.dev path per engine**
- *HyperFrames*: `21st search` → `21st get` → **flatten** to static HTML + compiled Tailwind CSS in
  `/components/<name>/`, remove hover/wall-clock animation, re-animate with GSAP on the timeline.
- *Remotion*: install via `21st add`, then replace any `framer-motion`/CSS-transition/timer logic with
  `useCurrentFrame()` + `interpolate` (wall-clock animation is non-deterministic in render).
- Either way: the component must be restyled with the project's brand tokens — never ship a
  component's default look.

---

## 5. Repository structure

```
/                          
├── CLAUDE.md              ← persistent law: pipeline, gates, routing, QA rubric (auto-loaded)
├── PLAN.md                ← this file
├── README.md              ← human quick-start
├── package.json           ← studio scripts + pinned engine versions
├── .claude/
│   ├── settings.json      ← permissions + SessionStart hook
│   ├── hooks/session-start.sh   ← installs ffmpeg, npm ci, env vars (idempotent)
│   └── skills/
│       ├── studio-*/      ← OUR skills (symlinked from /skills)
│       ├── hyperframes*/…  ← vendored official HyperFrames skills (pinned)
│       └── remotion-*/…    ← vendored official Remotion skills (pinned)
├── skills/                ← source of truth for OUR studio skills (+ SKILLS.lock of vendored ones)
├── references/            ← analyzed reference library: <ref-slug>/{source, frames/, analysis.md}
├── brand/                 ← brand kits: <brand>/{frame.md, tokens.json, fonts/, logos/, ui/}
├── assets/                ← shared media: audio/, sfx/, textures/, icons/, footage/ (+ LICENSES.md)
├── components/            ← video-ready UI components (flattened 21st.dev etc.), each with preview.png
├── scenes/                ← reusable scene blueprints: hook, stat-hit, ui-zoom, logo-resolve, cta…
├── storyboards/<project>/ ← directions A/B/C, chosen direction, static frames per scene (PNG)
├── projects/<project>/    ← brief.md, scene-specs.md, engine source (hf/ or remotion/)
├── reviews/<project>/     ← round-N/{contact-sheet.png, frames/, notes.md} director notes
├── renders/<project>/     ← drafts/ + final/ (video files git-ignored; see §9)
├── scripts/               ← studio CLI (Node): new, frames, qa, contact-sheet, analyze-ref, render
└── templates/             ← brief.md, direction.md, scene-spec.md, review-notes.md templates
```

---

## 6. The production pipeline (enforced by CLAUDE.md + studio skills)

Each stage has an **output file** and a **gate**. The agent cannot start stage N+1 without stage
N's file existing. ⛔ = hard stop that waits for the user.

| # | Stage | Output | Gate |
|---|---|---|---|
| 1 | **Reference** | `references/<slug>/analysis.md` + extracted frames | — |
| 2 | **Creative brief** | `projects/<p>/brief.md` (audience, message, format, length, engine + reason) | ⛔ confirm brief |
| 3 | **3 storyboard directions** | `storyboards/<p>/direction-{A,B,C}.md` + one key frame PNG each | — |
| 4 | **User selects direction** | `storyboards/<p>/CHOSEN.md` | ⛔ user picks |
| 5 | **Static frame for every scene** | `storyboards/<p>/frames/scene-NN.png` (real fonts, colors, copy) + `scene-specs.md` | — |
| 6 | **Visual review** | contact sheet of all static frames, self-critique, then user | ⛔ user approves layouts |
| 7 | **Motion implementation** | engine source in `projects/<p>/` | `lint` / `check` clean |
| 8 | **Browser preview** | Studio / preview URL | — |
| 9 | **Frame-by-frame inspection** | `reviews/<p>/round-N/` (snapshots at every scene's in/hold/out + 4 fps contact sheet) | — |
| 10 | **Director-style notes** | `reviews/<p>/round-N/notes.md` (severity-ranked) | — |
| 11 | **Iterative refinement** | fixes; loop 9→11 until zero *blocking* notes (max ~4 rounds, then escalate) | ⛔ user approves preview |
| 12 | **Final render** | `renders/<p>/final/<p>-<format>.mp4` + ffprobe report | — |

**Before stage 7, the direction must lock:** story, visual hierarchy, typography, color system,
pacing, camera behavior, transition language, motion language (written in `CHOSEN.md`).

**Every scene spec defines:** purpose · duration · layout · elements · entrance · exit · camera ·
transition · audio cues · typography · visual emphasis.

**Reference analysis** (`studio:analyze-ref`): FFmpeg scene-cut detection → shot list with
timings → average shot length & rhythm curve → key frames per shot → the agent studies them and
writes *grammar*, not surface: pacing, composition grid, type system, transition vocabulary,
camera moves, rhythm, what makes it feel expensive — and what **not** to copy.

---

## 7. Visual QA loop (stage 9–11)

Automated evidence (`npm run studio:qa -- <project>`):
1. `hyperframes check --snapshots --strict` (overlaps, off-canvas/clipping, contrast, runtime errors)
   — Remotion projects: `remotion still` at the same timestamps + our overlap script.
2. Snapshots at each scene's **entrance midpoint, hold, exit midpoint**.
3. A **4 fps contact sheet** per scene (FFmpeg `tile`) to judge timing and rhythm at a glance.
4. `hyperframes keyframes --json` for motion diagnostics (velocity spikes, simultaneous moves).
5. Text-safety: min font size vs. output resolution, title-safe margins, words-per-second reading budget.

Then the agent **looks at every image** and scores this rubric, writing director notes:

| Check | Fails when… |
|---|---|
| Overlaps / clipping | anything collides or is cut by frame edge/safe area unintentionally |
| Spacing | inconsistent gutters, cramped edges, broken grid |
| Hierarchy | more than one thing competing to be read first |
| Typography | off-system fonts/sizes/weights, widows, bad line breaks |
| Timing | text on screen shorter than reading time; dead air; rushed holds |
| Transitions | a transition that doesn't match the chosen transition language |
| Motion restraint | >2 simultaneous primary motions; motion without purpose |
| Legibility | contrast < WCAG AA, text over busy backgrounds |
| Repetition | same entrance/layout used back-to-back without intent |
| Brand fidelity | invented UI, wrong logo, off-palette colors |

Notes are written like a director: *"Scene 3, 00:07.4 — the stat lands while the camera is still
moving; hold the camera for 6 frames before the number resolves."* Each note → a fix → re-snapshot.

---

## 8. Commands (to be created)

```bash
npm run studio:doctor                 # verify ffmpeg, chromium, engines, skills
npm run studio:new -- <project>       # scaffold folders + templates for a project
npm run studio:analyze-ref -- <file>  # scene cuts, shot list, key frames, contact sheet
npm run studio:frames -- <project>    # render static frame per scene + contact sheet
npm run studio:preview -- <project>   # engine-appropriate browser preview
npm run studio:qa -- <project>        # full QA evidence pack into reviews/<p>/round-N
npm run studio:render -- <project> --draft   # fast 720p/half-fps draft
npm run studio:render -- <project> --final   # final quality + ffprobe verification
npm run studio:skills:update          # refresh vendored skills (shows diff, doesn't auto-commit)
```

---

## 9. Exactly what will be installed, and why

### System (every session, via SessionStart hook — container is ephemeral)
| Package | Version | Why |
|---|---|---|
| `ffmpeg` (apt) | 6.1.1 | Encoding for both engines + all QA frame tooling. **Required.** |
| Fonts: `fonts-inter`, `fonts-noto-core` (apt) | distro | Deterministic text rendering; Noto covers Arabic. Brand fonts go in `/brand/<b>/fonts`. |

### Node (in `package.json`, exact pins, `npm ci`)
| Package | Version | Why |
|---|---|---|
| `hyperframes` | 0.8.80 | Primary engine CLI (preview, check, snapshot, render). |
| `remotion`, `@remotion/cli`, `@remotion/renderer`, `react`, `react-dom` | 4.0.529 / 19 | Secondary engine. Installed only inside Remotion project folders (not root) to keep root lean. |
| `@21st-dev/cli` | 1.17.1 | Component search / retrieval / logo lookup. |
| `skills` (dev) | 1.7.0 | Official installer used by `studio:skills:update`. |

Browser: **none downloaded** — both engines point at the pre-installed Chromium
(`HYPERFRAMES_BROWSER_PATH`, Remotion `browserExecutable`).

### Agent skills (vendored into `.claude/skills/`, committed, pinned)
| Source | Skills | Why |
|---|---|---|
| `heygen-com/hyperframes` | core set: `hyperframes`, `hyperframes-core`, `-animation`, `-keyframes`, `-creative`, `-cli`, `-registry`, `-audio`, `media-use` + workflows `product-launch-video`, `motion-graphics`, `faceless-explainer`, `general-video` | Engine craft knowledge |
| `remotion-dev/skills` | `remotion-best-practices`, `-create`, `-markup`, `-render`, `-studio`, `-captions`, `-multimedia` | Secondary engine craft |
| 21st.dev | `21st skills install` (verified skills, if they add value after review) | Component workflow |
| **Ours (new)** | `studio-pipeline`, `studio-router`, `studio-reference-analysis`, `studio-direction`, `studio-scene-spec`, `studio-visual-qa`, `studio-components` | The director layer |

### NOT installed (deliberately)
- HyperFrames `publish` / cloud render / AWS Lambda — uploads work to third parties.
- Remotion Lambda — needs AWS account; not needed locally.
- 21st.dev `generate` — paid hosted AI; we adapt real registry components instead.
- 21st MCP server — the CLI covers the same endpoint without another always-on server.
- Docker rendering — not available in this container; SwiftShader already gives determinism.

---

## 10. Implementation order (after approval)

1. SessionStart hook + `package.json` + install; `studio:doctor` passes.
2. Vendor HyperFrames + Remotion skills; write `SKILLS.lock`.
3. Write `CLAUDE.md` + the 7 studio skills + templates.
4. Build `scripts/` (new, analyze-ref, frames, qa, contact-sheet, render).
5. Create folder tree with READMEs; `.gitignore` for heavy media.
6. **Smoke test** (not a creative video): a 3-second test card through both engines, run the QA
   pack on it, confirm frames are inspected and ffprobe verifies the output. Then delete it.
7. Commit + push to `claude/gracious-feynman-77z22v`.

---

## 11. Decisions needed from you

1. **Remotion license** — are you an individual / ≤3-person company / non-profit? If not,
   Remotion stays disabled and HyperFrames handles everything.
2. **21st.dev account** — do you have (or want) an API key? Without it: free search + logos only;
   with it: component code retrieval. It would be added as an environment secret `TWENTYFIRST_TOKEN`.
3. **Renders in git** — video files are heavy. Default: git-ignore renders, commit only final
   metadata + poster frame. Alternative: Git LFS for finals.
4. **Default formats** — 16:9 1920×1080 @ 30fps as default, plus 9:16 and 1:1 variants for social?
5. **Language** — any Arabic (RTL) typography in videos? It changes font + layout rules in the brand layer.
