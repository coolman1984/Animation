# Animation repo

The shared rules for every agent live in `AGENTS.md` (one door for Claude, Codex, Gemini, Copilot, Cursor, Grok and the rest).
Claude Code loads it through the import below; edit the shared rules there, not here.

@AGENTS.md

## Claude-only notes
- **AI mailbox:** at the start of every session attach `coolman1984/Inbox` with add_repo, clone it, and read the open messages in `inbox/claude/` before other work.
- Skills: `.claude/skills/` is the source; after editing a skill run `node studio/studio.mjs agents --sync` so other agents get the same text.
- The studio MCP server (`.mcp.json`) is for other models and MCP-only clients; Claude Code can use the same files and commands directly.
