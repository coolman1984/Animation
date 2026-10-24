---
name: penpot-mcp
description: Read and edit Penpot design files from an AI client through Penpot's official MCP server (Penpot, MPL-2.0, open-source Figma alternative) — pull a client's real colours, type, components and screens into a site's DESIGN.md or a film's brand kit, or push a design back. Use when the client's design lives in Penpot, or the owner wants designs agents can read.
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# penpot-mcp
Penpot is not vendored (it is a whole design app); its MCP server runs from npm against the owner's own Penpot. Setup: `studio/toolkit/README.md` "Penpot".

**Hosted designs (design.penpot.app):** use Penpot's remote MCP server (help.penpot.app/mcp), signed in with the owner's account.
**Local:** `npx -y @penpot/mcp@<the version matching his Penpot>` starts the MCP server (port 4401) and the plugin server; in Penpot open
the plugin (`http://localhost:4400/manifest.json`) and connect; then add the server to the client: Claude Code
`claude mcp add --transport http penpot http://localhost:4401/mcp`; stdio-only clients via `npx -y mcp-remote http://localhost:4401/mcp --allow-http`. Owner's approval before installing.

Studio use:
- **Into a site:** read the file's colours, text styles, components and frames into `web/sites/<site>/DESIGN.md` §B (stage B of `studio/web/WEB.md`);
  the client's design is the brief — it outranks any tool's suggestion.
- **Into a film:** export the logo/marks as SVG and the tokens into `brand.json` (skill `brand-kit`); frames are references for UI shots,
  never invented data (skill `data-honesty`).
- The server runs code inside the open design file: work on a copy of a client file, never delete or overwrite without saying so first.
