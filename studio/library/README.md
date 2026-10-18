# Move library — named moves any model can look up (added 2026-10-18)

Two MIT-licensed libraries the owner shared, vendored whole so the studio works offline and every model sees the same words.
Front door: `node studio/studio.mjs moves …` · MCP `moves_search`, `moves_show`, `moves_draw` · code: `lib/movelib.mjs`, `lib/mpcard.js`.

| Library | What it gives us | Source (MIT) |
|---|---|---|
| `motion-prompt/` | 120 numbered moves #001–#120 in five packs: `motion` (motion-graphics moves), `camera` (camera moves and cuts), `ui` (interface parts), `lp` (landing-page and web effects), `photo` (lighting and photo looks). Each has a name (en/ja, plus our Arabic in `ar.json`), one-line meaning, spec of every timing and easing, a ready prompt, and Canvas 2D code that is a pure function of time. | [showheyohtaki/motion-prompt](https://github.com/showheyohtaki/motion-prompt) @ `770eefb` (2026-10-15), © 2026 Shohei Ohtaki. Gallery: https://showheyohtaki.github.io/motion-prompt/ |
| `cinetic/` | 273 measured film techniques in 14 categories (opening hooks, transitions, camera, type, UI choreography, numbers, product demo, end cards, light, finish, layout, pacing, micro-interactions, depth), each with a build recipe and 60 fps timing; the weighted random draw from its `pick.py`; seven reference chapters (craft rules, timing grid, motion tokens, transitions, camera, taste and slop, code-made sound). | [Leonxlnx/cinetic](https://github.com/Leonxlnx/cinetic) @ `ecfa660` (v1.1), © 2026 Leonxlnx |

What we changed: Motion Prompt `packs/<pack>.js` are the upstream `pack.js` wrapped as ES modules (two added lines, code unchanged);
`catalog.json`, `LICENSE`, `THIRD-PARTY-NOTICES.md` and Cinetic's `techniques.json`, `LICENSE`, `references/*.md` are copied unchanged.
`motion-prompt/ar.json` (Arabic names, meanings, pointers to our own tools) is ours. Keep every `MIT License` header line in code you port.

## Use it
- **Owner doesn't know the name of a move?** Open the gallery, let them point, then `moves show <#id>`. Or search in any language:
  `node studio/studio.mjs moves search انتقال سائل` · `moves search typewriter` · `moves search whip pan --library=motion-prompt`.
- **One move in full:** `moves show 12` (spec, Arabic name, how to place it) · `moves prompt 12` (copy-paste prompt for any AI or a video model) ·
  `moves code 12` (the Canvas cell). Cinetic: `moves show tr-velocity-handoff-cut`.
- **In a film** (classic `film.js` or any composer page; tested: all 120 cells draw in Chromium, repeatable frame to frame):
  ```js
  import motion from '../library/motion-prompt/packs/motion.js';
  import { drawCard, holdU, loopU } from '../lib/mpcard.js';
  drawCard(ctx, motion, 12, holdU(t - 2, 1.0), { x: 690, y: 436, scale: 1.5 });   // #012 shape morph
  ```
  `loopU(t, cycle)` loops, `holdU(t, uHold)` plays an entrance once and stays, `onceU` adds the element's own exit. Fit a slot by lengthening
  the hold, never by stretching the move. The cards carry the sample's palette and type: for delivery, port the move into the film's own
  layers (same numbers, our colours, Arabic type) — the card is the reference, not the final art.
- **Websites:** `ui` and `lp` moves name what `web/motion/motion.js` does (`ar.json` "studio" points to `data-reveal`, `data-parallax`,
  `data-steps`, `data-magnetic`, `data-count`, marquee, progress bar). Anything else: rebuild with CSS/JS using the spec's numbers, respect reduced motion.
- **Photo looks (#097–#120)** are words for image prompts and grading, not code to ship.
- **Plan a film's moves without repeating ourselves:** `moves draw --format=launch|feature|loop|sting|walkthrough|vertical --energy=calm --seconds=30`
  draws about one technique per 3.5 s (calm) from Cinetic, weighted toward proven moves, one signature move; the seed is printed
  (`--seed=` repeats it; seeds differ from Cinetic's Python). Build the picks the concept can carry; reroll at most twice with
  `--category=<cat> --exclude=<id>`. Write the draw in the film's LEDGER.

## Authority
The house method (`QUALITY_PLAYBOOK.md` §0, `CRAFT.md` 35–47, AGENTS.md) still decides taste, copy, music and logos. Cinetic's own hard bans
(no serif, no orange, etc.) are its house style, not ours: the draw gives their ban-safe variant by default; pass
`--brand-supplied=serif,orange…` when the brand owns that look. Engineering numbers (timings, easing, px per frame) are welcome evidence.

## Update
Clone both repos read-only into a scratch folder, read the diff (third-party data), then
`node studio/studio.mjs moves sync --motion-prompt=<clone> --cinetic=<clone>` and run `node --test test/moves.test.mjs`.
