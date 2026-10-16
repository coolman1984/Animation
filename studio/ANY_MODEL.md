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

## The film loop (rungs 1–2)
1. **Read** `studio/QUALITY_PLAYBOOK.md` §0 (owner taste) and `studio/AUTONOMOUS_FILM.md` (the owner asks; the agent does everything).
2. **Decide** in five lines (write them in the spec's `creative` field): viewer, the viewer's problem (the hook in the first 2 s), ONE hero
   object that carries every scene, the brand's idea as motion, one payoff with the logo whole and one action.
3. **Vocabulary**: `engine_catalog` (MCP) or `studio/studio-engine/catalog.json`. Worked examples: `films/aixhr`, `films/demo`, `films/form-function`.
4. **Write the spec**: times in beats (120 BPM: 4 beats = 2 s, 15 bars = 30 s); one idea per bar; ≥ 1.8 s per line; Arabic and Latin never in one line.
5. **Check** (≈ 1 s, no browser): MCP `spec_save` / `spec_check`, or `node studio/studio-engine/run.mjs <film> --stage=check`.
   Each issue names the scene and carries a `fix`. Repeat until no errors.
6. **Look** (≈ 15–60 s): MCP `film_stills`, or `--stage=stills` → `takes/studio-engine/b-<film>-<fmt>/stills/sheet.png`.
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

Tools: `studio_guide` (this file) · `engine_catalog` · `film_list` · `spec_read` · `spec_save` · `spec_check` · `film_stills` (image) ·
`film_render` · `film_job`. Self-check: `node studio/studio.mjs agents` (door files, skill mirror, server handshake).

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
