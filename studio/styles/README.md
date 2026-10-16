# House styles — style cards any model can follow

Added 2026-10-16 (owner: step 3). Format adapted from Lemo-Opuscar's `STYLE.md` cards (MIT, LemoLab): one card per look, written as rules
and numbers, so a model picks a proven style instead of inventing one. Every card comes from one of OUR delivered films, not from a stranger's taste.

- `index.json` — the list (slug, film it came from, best for / avoid for, route, brand tokens for the Studio Engine).
- `<slug>/STYLE.md` — the card: essence and what it is not · materials · colour logic · type · motion · camera grammar · sound palette ·
  native moves · pitfalls · how to build it here · variation space.
- Use: `node studio/studio.mjs styles` (list) · `styles <slug>` (read) · `director plan <film> --style=<slug>` (the plan carries the style's
  palette and fonts into `films/<film>/brand.json` and names the style in `creative.style`). MCP: `style_list`, `style_read`.
- **Not the demo again:** the card's source film is a benchmark, not a template. The critic's `not-the-demo` rule wants at least four of
  six things (opening, hero, transitions, structure, ending, music) to differ from the worked examples.
- Route: `engine` = the Studio Engine spec reaches the look (rungs 1–2, ANY_MODEL.md); `bespoke` = the look needs a hand-written `film.js`
  (rung 3); its engine tokens give an honest approximation only.
