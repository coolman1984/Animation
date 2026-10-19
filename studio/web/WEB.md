# Web department — beautiful, complete sites, made by any model

Added 2026-10-16 (owner: "the repo should help build complete websites on the internet, beautiful in look, detail and motion").
A site is ONE `web/sites/<name>/site.json`; the studio turns it into a fast static site (no build tools, no dependencies) and checks it
in a real browser the way a top studio checks before launch. Same philosophy as the films: plan → write → check → deliver.

## The loop (new site; to improve an existing one see "The three together" below)
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
   **Taste lights** (yellow, 2026-10-19; adapted from taste-skill, MIT, and Impeccable, Apache-2.0): headlines ≤ 2 lines, ≤ 2 typefaces,
   no decorative gradients / resting shadows / glows, neutrals tinted toward the brand, no grey text on colour, no tiny tracked caps,
   body lines ≤ ~75 characters, no bounce easing, no blank stretch over half a screen (scroll scenes excepted), ≥ 8 moving elements,
   hero media ≥ 40 % of the first desktop screen. Fix each yellow or defend it to a designer in one sentence in the report.
6. **Preview:** `node studio/studio.mjs web serve <site>`. **Publish:** `dist/` is a plain folder: GitHub Pages, Netlify or any static host
   (publishing needs the owner's account; say so, never claim a site is live without the URL).

## The three together — mandatory for every site we build or improve (owner order, 2026-10-19)
The owner's order: whenever a website is built or **improved**, use taste-skill, UI UX Pro Max and Impeccable **together**, each for its job.
| Lens | Repo (licence) | Its job here | How |
|---|---|---|---|
| 1. Taste & identity | taste-skill (Leonxlnx, MIT) | a distinct direction, not a generic AI page | inventory 8–12 things only this client has → the idea sentence + competitor test → one claim per section → its banned patterns |
| 2. Design system | UI UX Pro Max (nextlevelbuilder, MIT) | colours, type and UX that fit the industry | look up the client's product type: style, palette, font pairing, key effects and **anti-patterns** for that industry; turn it into ≤ 6 colour tokens and 2 families (Arabic-capable: a vendored face from `ASSETS.md`); note the rule you followed |
| 3. Audit & polish | Impeccable (Paul Bakaus, Apache-2.0) | finish: nothing that looks AI-made, nothing broken | its audit (accessibility, performance, theming, responsive, anti-patterns) then its polish (spacing, alignment, type, states: hover, focus, empty, error, loading) |

**Where they run.** If the host has them installed (Claude Code: `/plugin marketplace add Leonxlnx/taste-skill`, `nextlevelbuilder/ui-ux-pro-max-skill`,
`pbakaus/impeccable`, then install), call them directly (taste-skill's `design-taste-frontend`; UI UX Pro Max's `--design-system` search;
`/impeccable audit` then `/impeccable polish`). If not (cloud sessions here may not install third-party code), apply the same three lenses
with the studio's adaptation: the taste pass below, the industry lookup read from the UI UX Pro Max repository as reference data, and
`web check` / `web audit`, whose taste lights carry the measurable detector rules of taste-skill and Impeccable. Say in the report which
way each lens ran. Never send the client's private content to their online services; Impeccable's design roll calls impeccable.style
(set `DO_NOT_TRACK=1` when it is installed).

**Improving an existing site (redesign):**
1. **Before:** keep the original untouched; list what must survive (pages, links, forms, data, analytics, SEO titles); `node studio/studio.mjs web audit <site>-before --dir=<built site folder>` (MCP `web_check` with `dir`) → lights + strips.
2. **Lens 1 → lens 2 → build:** keep the stack and the content; change design, structure and motion.
3. **Lens 3 + after:** `web audit <site>-after --dir=<new build> --before=<site>-before` → what got better, what got worse (worse = not done); every red fixed, every yellow fixed or defended in one sentence; look at the strips and fix the top three problems (two rounds at most).
4. **Report** (Egyptian Arabic, conclusion first): before/after lights and screenshots, what was preserved, which lens ran how, what was not verified (real devices, live hosting).
A live URL is audited from a local copy or its built output; publishing still needs the owner's hosting account.

## Taste pass (2026-10-19, lens 1 + the measurable parts of lens 3)
- **The idea sentence:** "On this site, [something only this client has] becomes [the device the style calls for]." Competitor test: if a
  rival next door could use the sentence, it is not specific enough. List 8–12 things only this client has before writing.
- **One claim per section;** a section with no claim is deleted. Headlines ≤ ~32 characters; proof never invented.
- **Look and fix:** open the strips, fix the top three problems, check again — inside the studio's two-round budget.
- Used directly only when installed in the host (see "The three together"): taste-skill's 20 dealt directions and image search,
  Impeccable's live mode and 24 commands, UI UX Pro Max's palette/font database — see `TECH_RADAR.md` 2026-10-19.

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
