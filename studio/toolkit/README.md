# Toolkit — third-party agent tools, vendored whole (added 2026-10-24)

Owner order (2026-10-24, his post "10 GitHub repos to turn you into a design/motion studio"): "add these repos with everything we can learn
from them and every tool we can take, so our web studio can win international awards and our animation studio is world-class."
Each tool here is copied from a pinned commit with its licence beside it, so every model (Claude, Codex, Gemini, Cursor…) uses the same
version offline. A thin **wrapper skill** in `.claude/skills/<name>/` (mirrored to `.agents/skills/`) points at the copy and adds the
studio's rules; the upstream text is never edited.

Front door: `node studio/studio.mjs toolkit` (list) · `toolkit check` (files, licences, wrapper skills) · `toolkit update <name> --from=<clone>`.
Manifest (repo, commit, licence, what was left out and why): `toolkit/toolkit.json`. Code: `lib/toolkit.mjs`. Tests: `test/toolkit.test.mjs`.

## What we took, and where it plugs in
| Tool (licence) | Here | Wrapper skill | Plugs into |
|---|---|---|---|
| **Impeccable** 4.7.1 (Apache-2.0) | `toolkit/impeccable/` — 24 commands with playbooks, craft floor, absolute bans, reviewer agents | `impeccable` | Web stage D (critique + polish), any UI that looks generic |
| **UI UX Pro Max** 2.15 (MIT) | `toolkit/ui-ux-pro-max/` — design-system generator + 79 styles, 192 palettes, 74 font pairs, 119 UX rules (Python stdlib, offline) | `ui-ux-pro-max` | Web stage B: `node studio/studio.mjs web system "<brief>" --site=<site>` |
| **diagram-design** 2.6 (MIT) | `toolkit/diagram-design/` — 45 diagram types as one HTML+SVG file, light/dark/full/animated, self-check | `diagram-design` | Explainer films, sites, reports |
| **img2threejs** 2.0 (Apache-2.0) | `toolkit/img2threejs/` — photo → procedural Three.js model, staged sculpt pipeline (Python stdlib) | `img2threejs` | Live 3D products/props in films (GPU route) and sites (Three.js row of stage C) |
| **HyperFrames** skills (Apache-2.0) | `toolkit/hyperframes/` — render contract, CLI, ~450 registry blocks, Figma → video, Remotion porting | `hyperframes` | External engine (`lib/engines.mjs`); registry blocks as references |
| **video-shotcraft** (Apache-2.0) | `toolkit/video-shotcraft/` — 124 shot recipe cards + pipeline, aesthetic rules, beat sync, sound design, final review | `video-shotcraft` | Product promos; `moves search <words> --library=shotcraft`, `moves show <card>` |
| **GSAP skills** (MIT) | `toolkit/gsap-skills/` — 8 official skills (core, timeline, scrolltrigger, plugins, utils, react, frameworks, performance) + `llms.txt` | `gsap-skills` | Web stage C, only for cinematic / scroll / pinned timelines. The GSAP **library** is not MIT (GreenSock standard no-charge licence) and is added per site |
| **Animation principles** (MIT) | `toolkit/animation-principles/` — Disney's 12 principles, one skill each | `animation-principles` | House critic: `principle-*` rules for what a spec can show; the rest is a manual checklist on `director review` |
| **Lemo-Opuscar** styles (MIT) | `library/lemo-styles/` — 59 film-style cards (STYLE.md + style.json) | — (any-model-director, creative-director) | `node studio/studio.mjs styles --library=lemo` · `styles lemo/<slug>` · MCP `style_list {library:"lemo"}` |
| **Blender MCP** (MIT) | `toolkit/blender-mcp/addon.py` + terms | `blender-mcp` | True 3D / simulation on the owner's PC, as a footage layer |
| **Penpot** (MPL-2.0) | not copied (a whole app) | `penpot-mcp` | Client designs → DESIGN.md §B / brand kit |
| **Remotion agent skills** | not copied: no licence file | — | Lessons rewritten in our words (`TECHNIQUES.md` 2026-10-24) |

What was deliberately left out (and why) is in each manifest row's `changed`: Impeccable's binary launcher (downloads a binary),
HyperFrames' `media-use` (HeyGen paid services) and `slideshow`, video-shotcraft's Remotion code, demos and media (linked from each card),
Lemo's demos and posters, upstream tests and CI.

## Authority (unchanged)
The house method (`AGENTS.md`, `QUALITY_PLAYBOOK.md` §0, `CRAFT.md` 35–47) decides taste, copy, music, logos and honesty. These tools bring
vocabulary, numbers, checklists and pipelines; where one disagrees with the house (fonts, colours, bans, "default" looks), the house wins and
the report says so. Arabic is never split per letter; text stays `dir="rtl"`.

## Runs on the owner's PC only (machine changes: ask once)
**Blender MCP:** Blender ≥ 3.0, Python ≥ 3.10, `uv` (`winget install --id=astral-sh.uv -e`). Install `toolkit/blender-mcp/addon.py` in Blender
(Preferences → Add-ons → Install from disk), sidebar "BlenderMCP" → Connect, leave telemetry consent off. Client config:
```json
"blender": { "command": "uvx", "args": ["mcp-for-blender==2.2.4"], "env": { "DISABLE_TELEMETRY": "true" } }
```
(Claude Code: `claude mcp add blender --env DISABLE_TELEMETRY=true -- uvx mcp-for-blender==2.2.4`; GUI clients on Windows may need the full path to `uvx.exe`.)
It is not in the repo's `.mcp.json` on purpose: every session would try to start it, and it can only work where Blender runs.

**Penpot:** hosted designs → Penpot's remote MCP server (help.penpot.app/mcp). Local → `npx -y @penpot/mcp@<version matching his Penpot>`,
open the plugin `http://localhost:4400/manifest.json` in Penpot and connect, then `claude mcp add --transport http penpot http://localhost:4401/mcp`.

**HyperFrames CLI:** `npx hyperframes@0.8.191 <command>` with `DO_NOT_TRACK=1`; local render only.

**Impeccable engine (optional):** the full plugin with its engine: `/plugin marketplace add pbakaus/impeccable` with `DO_NOT_TRACK=1`.

## Update a package
1. Clone the upstream repo into a scratch folder and read what changed (it is third-party code: look for network calls, installers, telemetry).
2. `node studio/studio.mjs toolkit update <name> --from=<clone>` (copies again by the manifest's include/exclude, records the new commit).
3. `node studio/studio.mjs toolkit check` and `node --test test/toolkit.test.mjs`; if a wrapper skill changed: `node studio/studio.mjs agents --sync`.
4. Note the update in `TECH_RADAR.md` and `CHANGELOG.md`.
