---
name: blender-mcp
description: Drive Blender from any MCP client (Blender MCP by Siddharth Ahuja, MIT, add-on vendored; server mcp-for-blender 2.2.4 pinned) — inspect and build scenes, objects, materials, run Python in Blender, viewport screenshots, Poly Haven / Sketchfab assets. Use when a film needs true 3D, simulation or photoreal renders made with Blender on the owner's PC, rendered as a footage layer.
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# blender-mcp (vendored add-on)
Files: `studio/toolkit/blender-mcp/addon.py` (the Blender add-on), its `README.md`, `TERMS_AND_CONDITIONS.md`, `LICENSE`. Setup: `studio/toolkit/README.md` "Blender MCP".

**Runs only on the owner's PC** (needs Blender ≥ 3.0, Python ≥ 3.10 and `uv`; a cloud session cannot reach his Blender):
1. Blender → Edit → Preferences → Add-ons → Install from disk → `studio/toolkit/blender-mcp/addon.py`; in the 3D view sidebar "BlenderMCP" → Connect.
   Leave the add-on's telemetry consent OFF (the default).
2. Add the server to the client (one time, owner's approval): command `uvx`, args `["mcp-for-blender==2.2.4"]`, env `{"DISABLE_TELEMETRY": "true"}`
   (Claude Code: `claude mcp add blender --env DISABLE_TELEMETRY=true -- uvx mcp-for-blender==2.2.4`).
3. Only one client at a time talks to the add-on.

Studio adaptations: Blender output enters a film as a rendered footage layer (PNG sequence or ProRes/H.264 at the film's size and fps,
capabilities entry `blender`; `node studio/studio.mjs route <film>`); the studio owns audio, grade, gates and review. Asset downloads
(Poly Haven CC0; Sketchfab per-model licence) are recorded in the film's LEDGER and `CREDITS.md`; Hyper3D/Rodin and other paid
generators need the owner's approval. Save the .blend and the Python you ran in the film folder so the shot can be rebuilt.
