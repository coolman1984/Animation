---
name: diagram-design
description: Editorial diagrams as one self-contained HTML+SVG file (diagram-design 2.6 by Cathryn Lavery, MIT, vendored) — 45 types (architecture, flowchart, sequence, state, ER, timeline, swimlane, quadrant, Sankey, Wardley, journey, service blueprint, axonometric, org chart, charts…), light/dark/full/animated variants, brand onboarding, Mermaid/draw.io/Excalidraw import. Use when a site, explainer film or report needs a diagram, or a process/system must be shown as a picture.
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# diagram-design (vendored)
The full upstream skill lives in `studio/toolkit/diagram-design/` (licence, third-party notices and pinned commit: `studio/toolkit/toolkit.json`).
Read `studio/toolkit/diagram-design/SKILL.md` and follow it; every `references/…`, `assets/…`, `scripts/…` path is relative to that folder
(`python studio/toolkit/diagram-design/scripts/self_check.py <file>` is its check).

Studio adaptations:
- **Style gate (its §0):** for a client, onboard from the client's brand (their site, `brand.json`, or a film's brand kit, skill `brand-kit`)
  instead of asking the owner; for studio material, the house look. Save a profile next to the work, never edit the vendored files.
- **Arabic diagrams:** `dir="rtl"`, Arabic-capable font, labels never split per letter; check every label fits its box at the delivered size.
- **In a film:** an animated variant (`assets/template-motion.html`) can be captured by the composer like any page, or rebuilt as film layers;
  keep the numbers truthful (skill `data-honesty`), hold each label long enough to read (letters ÷ 15 + 1.5 s).
- **On a site:** inline the SVG (no external fonts or scripts), give it a text alternative, and check it in `web check` at phone width.
