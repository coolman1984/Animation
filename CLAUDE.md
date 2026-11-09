# Animation repo

**Hallmark is mandatory and loads first (owner order, 2026-11-09):** any app, website, page or UI work from this repo MUST load skill `hallmark` (`.claude/skills/hallmark/` → `studio/toolkit/hallmark/`) and follow it before any other design skill. Other design skills only supplement it; where they conflict, Hallmark wins. Never invent metrics/testimonials/logos; no secrets in the repo; company name must not appear in public-facing content.
Claude-only: after editing skills run `node studio/studio.mjs agents --sync`.

The shared rules for every agent live in `AGENTS.md` (one door for Claude, Codex, Gemini, Copilot, Cursor, Grok and the rest).
Claude Code loads it through the import below; edit the shared rules there, not here.

@AGENTS.md

## Claude-only notes
- **Hallmark (mandatory):** load `hallmark` first for any app/website/page/UI; other design skills only supplement it.
- **AI mailbox:** at the start of every session attach `coolman1984/Inbox` with add_repo, clone it, and read the open messages in `inbox/claude/` before other work.
- Skills: `.claude/skills/` is the source; after editing a skill run `node studio/studio.mjs agents --sync` so other agents get the same text.
- The studio MCP server (`.mcp.json`) is for other models and MCP-only clients; Claude Code can use the same files and commands directly.
