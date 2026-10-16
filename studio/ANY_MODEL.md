# Any model, one studio — how a model that is not Claude makes a film here

Added 2026-10-16 (owner challenge: "let any model make animation films like Claude"). The studio's knowledge lives in files and
commands, not in one model. Every agent reads the same door (`AGENTS.md`), the same skills (`.claude/skills/`, mirrored to
`.agents/skills/` for Codex and other Agent Skills clients) and calls the same tools (`node studio/mcp/server.mjs`, an MCP server).
What a strong model does by taste, the studio makes explicit: a fixed vocabulary (the engine catalog), one spec file per film,
checks that name the scene and the next edit, a contact sheet to look at, and delivery gates that refuse a broken export.

## The ladder: pick the rung your model can climb
| Rung | Model can… | Path | Eyes |
|---|---|---|---|
| 1 | write JSON, read error messages | Studio Engine spec: `studio-engine/films/<film>/spec.json` + one command (or the MCP tools) | text gates name every bad frame |
| 2 | also see images | rung 1 + look at `stills/sheet.png` (film_stills returns it as an image) and the final frames | the contact sheet |
| 3 | write and debug JavaScript, judge motion | bespoke `film.js` + `score.mjs` with the house method (`WORKFLOW.md`, `QUALITY_PLAYBOOK.md`, `TECHNIQUES.md`) | stills → transition strips → review player |

Start every film on rung 1 or 2 unless the brief needs motion the catalog does not have. A smaller model that stays on its rung
produces a gated, honest film; a model that jumps to rung 3 without the eyes for it produces broken frames that pass nothing.

## The director's kit — what closes the gap to a strong model (2026-10-16)
A strong model's advantage is judgment: it knows the shape of a good ad, sees its own frames and catches what breaks the owner's taste.
The kit turns each of those into a tool, so a smaller model follows the same judgment instead of guessing:
| Strong model does by instinct | Tool for every model | Command / MCP tool |
|---|---|---|
| knows the shape: hook → idea → proof → payoff, one hero, music hook, drops | **director's plan**: brief → spec skeleton in the house structure; only ‹…› lines left to write | `studio.mjs director plan` / `film_plan` (`studio-engine/lib/director.mjs`) |
| carries the owner's taste in its head | **house critic**: ~22 named rules from QUALITY_PLAYBOOK/WORKFLOW/CRAFT, each with evidence and the next edit, score /100 | `studio.mjs director review [--frames]` / `film_review` (`studio-engine/lib/critic.mjs`) |
| looks at frames and sees composition | **eyes**: every box on screen (text, shape, image) with colour, size, contrast, focal point, balance + a character map | `studio.mjs director inspect` / `film_inspect` (`lib/scenegraph.mjs`, `window.sceneGraph()` in `lib/composer.html`) |
| refuses a weak shot list before drawing | **storyboard lint**: each shot names a thing + what it does, ≤ 8 words, no 8 s+ shots, no text-card opening or ending | `studio.mjs storyboard <film>` / `film_storyboard` (`lib/storyboard.mjs`; also inside the critic and the production preflight) |
| knows a dead or slideshow-like film when it sees one | **taste gate** on the finished MP4: empty mid-film frames (red), how much really moves, sagging 10 s windows — thresholds calibrated on the owner's own accepted/rejected takes (`taste/verdicts.json` → `taste calibrate`) | `studio.mjs taste <mp4 \| film>` / `film_taste` (`lib/tastegate.mjs`; runs on every engine delivery) |
| fixes the right scene | named-scene issues with a `fix` hint | `spec_check`, `film_stills` |
| knows when it is good enough | the same gates refuse a broken delivery; the bench compares models on fixed briefs | `bench/README.md`, `bench/briefs.json` |
The eyes work for every composer film, hand-written ones too (`director inspect film22`). Skill: `any-model-director`.

## The film loop (rungs 1–2)
1. **Read** `studio/QUALITY_PLAYBOOK.md` §0 (owner taste) and `studio/AUTONOMOUS_FILM.md` (the owner asks; the agent does everything).
2. **Decide** in five lines (write them in the spec's `creative` field): viewer, the viewer's problem (the hook in the first 2 s), ONE hero
   object that carries every scene, the brand's idea as motion, one payoff with the logo whole and one action.
2b. **Plan**: `node studio/studio.mjs director plan <film> --placement=reels --duration=15 --brand=… --cta=… --problem=…` (MCP `film_plan`)
   writes the skeleton; write every ‹…› line (the engine refuses to render a placeholder). Then `director review <film>` (MCP `film_review`).
3. **Vocabulary**: `engine_catalog` (MCP) or `studio/studio-engine/catalog.json`. Worked examples: `films/aixhr`, `films/demo`, `films/form-function`.
4. **Write the spec**: times in beats (120 BPM: 4 beats = 2 s, 15 bars = 30 s); one idea per bar; ≥ 1.8 s per line; Arabic and Latin never in one line.
5. **Check** (≈ 1 s, no browser): MCP `spec_save` / `spec_check`, or `node studio/studio-engine/run.mjs <film> --stage=check`.
   Each issue names the scene and carries a `fix`. Repeat until no errors.
6. **Look** (≈ 15–60 s; a model without vision uses `director review <film> --frames` / `film_inspect` — the same frames as data): MCP `film_stills`, or `--stage=stills` → `takes/studio-engine/b-<film>-<fmt>/stills/sheet.png`.
   Fix until `text OK`. Rung 2: check every tile for one focal point, readable type, nothing cropped.
7. **Preview** one scene if unsure: `film_render stage=preview scene=<id>`.
8. **Final** once: `film_render stage=final`, then `film_job` until `delivered`. The engine refuses delivery if sync/motion/loudness gates fail.
9. **Report** in Egyptian Arabic, conclusion first, and say plainly what was not watched or listened to.

## Rules every model keeps (the house method, short form)
- One hero object, not a montage of effects. Hook names the viewer's problem → the brand's idea as motion → one payoff.
- Music: western, a real beat, one hook that returns. Logos whole (pop or blur-resolve), never assembled.
- Honesty: only the client's words, claims and numbers; real third parties as text, never their logo art; label staged data.
- One render at a time; never commit `studio/takes/` or `studio/out/`; at most two correction rounds per scope, then DONE or BLOCKED.
- Sound: search Openverse first (`node studio/studio.mjs sfx "<words>"`), commercial-safe licences, credits recorded.
- Slow test suites only while producing a real video, once; check code edits with the one relevant test file.

## Connecting a client (all point at the same server)
| Client | File in this repo |
|---|---|
| Claude Code | `.mcp.json` |
| OpenAI Codex CLI | `.codex/config.toml` |
| Gemini CLI | `.gemini/settings.json` |
| Cursor | `.cursor/mcp.json` |
| VS Code / GitHub Copilot | `.vscode/mcp.json` |
| anything else with MCP over stdio | command `node`, args `["studio/mcp/server.mjs"]`, working directory = repo root |
| no MCP at all | run the commands in the loop above in a shell; the output is the same text |

Tools: `studio_guide` (this file) · `engine_catalog` · `film_list` · `spec_read` · `film_plan` · `spec_save` · `spec_check` · `film_review` ·
`film_inspect` · `film_storyboard` · `film_stills` (image) · `film_render` · `film_job` · `film_taste`. Self-check: `node studio/studio.mjs agents` (door files, skill mirror, server handshake).

## Why it is built this way (research, 2026-10-16; details in `TECH_RADAR.md`)
- `AGENTS.md` is the cross-tool instruction file (Codex, Copilot, Cursor, Gemini CLI, Jules, Aider, Zed, Warp…; Claude Code reads it
  only when no CLAUDE.md exists, so CLAUDE.md imports it). One door, no per-model fork of the rules.
- Agent Skills (`SKILL.md` with name + description) load on demand in Claude Code, Codex (`.agents/skills/`), Gemini CLI and others.
- MCP gives every client the same tools; images in tool results let vision models see the contact sheet.
- Agent video tools that work for many models (HeyGen HyperFrames, Remotion skills) share four traits: declarative timing, a seekable
  deterministic renderer, lint/snapshot commands, and a catalogue of tested blocks. The engine already had the first two; the catalog,
  fix hints and the image-returning stills tool add the rest.
- Research on LLM animation (OmniManim, PhysicsSolutionAgent, SGA, 2026) finds layout errors are invisible in code and only show after
  rendering; repair works when diagnostics are structured and local. Hence: named-scene issues with a `fix`, a cheap stills pass before
  any render, and corrections scoped to the named scene.

## Taste gate calibration (2026-10-16)
The motion threshold starts from huashu-art-motion's fit on its own author's 13 films and can only show yellow until it is fitted on OUR
owner: `node studio/studio.mjs taste calibrate` measures every take in `taste/verdicts.json` whose export exists on the machine (the owner's
Windows PC holds `out/`), and writes `taste/calibration.json` only if every approved take moves more than every rejected one. Empty
mid-film frames are a fact, not taste: red from day one. Add a verdict row whenever the owner accepts or rejects a take.

## What is and is not proven (2026-10-16)
Proven here: every tool answers through MCP from a client with no Claude features (`test/agents.test.mjs`); a plan filled with sample copy
passes lint, the critic and the stills text gates in reels 15/30 s and YouTube 30 s; the critic scores the delivered AI × HR spec 83/100 and
names real weaknesses; the eyes read hand-written films (film 22). **Not proven:** a film made end to end by another model (no other model or
API key in this container). "Same efficiency" is measured with `bench/` once another model runs it — until then it is a design goal, not a claim.
