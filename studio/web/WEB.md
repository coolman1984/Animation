# Web department — beautiful, complete sites, made by any model

Added 2026-10-16 (owner: "the repo should help build complete websites on the internet, beautiful in look, detail and motion").
A site is ONE `web/sites/<name>/site.json`; the studio turns it into a fast static site (no build tools, no dependencies) and checks it
in a real browser the way a top studio checks before launch. Same philosophy as the films: plan → write → check → deliver.

## The loop
1. **Be ambitious first** (after Felix Rieseberg's "be ambitious" prompt): before any line, answer in `ambition`:
   what would the best studio in this field build for this client · the rawest real material to start from (the client's photos, words,
   product, menu, numbers) · the specific methods and tools they would use. Then pick a style: `node studio/studio.mjs web styles`.
2. **Plan:** `node studio/studio.mjs web plan <site> --brand=… --style=paper-editorial|ink-studio|clay-3d --lang=ar|en --cta=… --problem=… --promise=…`
   (MCP `web_plan`) → the house structure: hero (promise + one action) → problem → features → sticky steps → 3D ring → FAQ → closing action.
   Remove, reorder or add sections (`hero, problem, features, steps, ring, stats, quote, marquee, faq, cta`) to fit the client.
3. **Write** every ‹…› in the client's words (Egyptian Arabic for ads, as the brand writes Latin names). The build refuses placeholders,
   numbers without a source, quotes without a real name and source, images without alt text.
4. **Build:** `node studio/studio.mjs web build <site>` → `web/sites/<site>/dist/` (index.html, assets/site.css, assets/motion.js, fonts).
5. **Check:** `node studio/studio.mjs web check <site>` (MCP `web_check`, returns the screenshot strips as images): phone 390, tablet 820,
   desktop 1440 — sideways scroll, image alt / broken images, WCAG AA contrast, type ≥ 14 px, tap targets ≥ 44 px, motion never hides
   content (after scrolling AND on the first screen), reduced motion = a still complete page, title/description/lang/dir/viewport,
   script errors, total weight. Red lights block; look at the strips too (a gate cannot judge taste).
6. **Preview:** `node studio/studio.mjs web serve <site>`. **Publish:** `dist/` is a plain folder: GitHub Pages, Netlify or any static host
   (publishing needs the owner's account; say so, never claim a site is live without the URL).

## Motion vocabulary (web/motion/motion.js + site.css, opt-in by data attributes)
`data-reveal` rise from blur on entry (native CSS scroll timeline where supported, IntersectionObserver otherwise) · `data-split` headline
words one by one (split on spaces: Arabic letters stay joined) · `data-parallax` · `data-steps` sticky scrollytelling · `data-ring` 3D card
ring (drag, wheel, arrow keys; auto-spin until touched) · `data-count` count-up for SOURCED numbers · `data-magnetic` buttons · reading
progress bar · marquee. Everything respects `prefers-reduced-motion` and stays readable without JavaScript.

## Styles (web/styles/index.json)
`paper-editorial` (calm, premium, very readable) · `ink-studio` (dark, sharp, lime signal) · `clay-3d` (warm, tactile, 3D ring).
Tokens become CSS variables; fonts are the studio's vendored OFL faces (Readex Pro, Alexandria, Space Mono; `ASSETS.md`).

## Lessons from building it (2026-10-16)
- A 3D ring whose cards poke past the screen makes a phone browser widen the page and zoom everything out; the check compares with the
  device width (`visualViewport`), not `innerWidth`, and ring sections clip their overflow.
- A scroll-driven reveal that finishes at "cover 28 %" leaves the hero's buttons half-faded on a phone's first screen; reveals end at
  `entry 100%`, and the check looks at the first screen without scrolling.
- Muted text on a coloured ground fails contrast first (clay muted had 3.97:1); the check measures every text node against its real background.

## Not built yet (honest list)
Multi-page sites with View Transitions, forms with a backend, CMS, payments, analytics, a brand kit scanned from an existing site
(needs network access), and the automatic promo film of a finished site (planned: the page-flyover style card).
