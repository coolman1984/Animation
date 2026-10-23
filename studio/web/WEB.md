# Web department — beautiful, complete sites, made by any model

Added 2026-10-16 (owner: "the repo should help build complete websites on the internet, beautiful in look, detail and motion").
A site is ONE `web/sites/<name>/site.json`; the studio turns it into a fast static site (no build tools, no dependencies) and checks it
in a real browser the way a top studio checks before launch. Same philosophy as the films: plan → write → check → deliver.

## The loop (new site; the stages and the redesign path are in "One workflow" below)
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

## One workflow — mandatory for every site and web animation (owner orders, 2026-10-19)
Every website or web animation we build or **improve** runs four stages, each owned by one tool, recorded in `web/sites/<site>/DESIGN.md`
(written by `web plan`; template `web/templates/DESIGN.md`). `web build|check|serve` and MCP `web_check` refuse a site whose DESIGN.md
is missing, lacks a stage or still holds a ‹…›; `--draft` (MCP `draft: true`) gives a preview labelled DRAFT, never a delivery. Conflicts are settled by the client's brief and brand → DESIGN.md → the
owner's taste (`QUALITY_PLAYBOOK.md` §0) → any tool's suggestion. Existing projects keep all business logic, data, functions and brand
rules unless the owner asks otherwise. Free tools only; never a paid API without the owner's approval.

| Stage | Owner tool (licence) | Output |
|---|---|---|
| A. Creative direction | **taste-skill** (Leonxlnx, MIT) | business/audience/purpose, 8–12 things only this client has, references studied, **three genuinely different directions**, the chosen one + why, the idea sentence (competitor test), storytelling, composition, imagery, type and motion personality — DESIGN.md §A |
| B. Design architecture | **UI UX Pro Max** (nextlevelbuilder, MIT) | the industry rule followed; colour tokens (≤ 6, tinted neutrals, ≥ 4.5:1), dark mode if it fits, 2 Arabic-capable families, ≤ 5 sizes, spacing/grid, components and states, phone/tablet/desktop rules — DESIGN.md §B, then `site.json` / CSS variables |
| C. Build and animate | the animation layer (below) | pages in the project's existing technology, built from §B, moving by the **motion storyboard** (DESIGN.md §C: what moves, when, why, how it answers the user, which tech, the reduced-motion state) |
| D. Design director | **Impeccable** (Paul Bakaus, Apache-2.0) | independent critique during and after the build — hierarchy, type, spacing, contrast, animation quality and consistency, responsive, accessibility, generic or dated patterns; then polish and remove what is unnecessary — DESIGN.md §D log |

**Choosing animation technology — the minimum that does the job (never install every library):**
| Need | Use | Here |
|---|---|---|
| hover, transitions, simple reveals | CSS (transitions, keyframes, scroll timelines) | `web/motion` (built in) |
| component interactions, gestures, layout changes in a React/Vue app | Motion (motion.dev) | only when the project is already a component app |
| cinematic sequences, scroll storytelling, pinned scenes, synchronized timelines | GSAP + ScrollTrigger (free, standard licence) | add per site, pinned version, credited |
| immersive 3D objects and scenes | Three.js | vendored by `node studio/studio.mjs setup gpu` (`capabilities.json`) |
| custom 2D graphics, drawn lines, morphs, particles | SVG / Canvas (PixiJS for heavy 2D) | inline SVG; PixiJS in `setup gpu` |
Every moving thing: transform/opacity first, ease-out settles (no bounce/elastic), one lead movement with overlapping secondary ones,
a still complete page under `prefers-reduced-motion`, no layout shift.

**Where the three tools run.** In a host that has them (Claude Code: `/plugin marketplace add Leonxlnx/taste-skill` → `/plugin install taste-skill@taste-skill`;
`/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` → `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`; `/plugin marketplace add pbakaus/impeccable`),
call them directly: taste-skill `design-taste-frontend` for A, UI UX Pro Max `--design-system` search for B, `/impeccable critique|audit|animate|polish`
for D. Install each once, at user level or project level, not both (no duplicate skills); none of their names clash with `.claude/skills/`.
Set `DO_NOT_TRACK=1` for Impeccable (its design roll calls impeccable.style) and never send private client content to an online service.
Where they cannot be installed (cloud sessions here refuse third-party code), run the same stages with the studio's adaptation: the taste
pass below (A), the UI UX Pro Max repository read as reference data (B), `web check` / `web audit` taste lights for the measurable detector
rules plus a written critique (D). The report says which way each stage ran.

**Mandatory visual quality loop (every project, never "done" because it compiled):**
1. Build the complete working experience. 2. Open it in a real browser: `web check <site>` (or `web audit <label> --dir=<folder>`) at phone
390, tablet 820, desktop 1440 + reduced motion. 3. Open every strip and compare it with DESIGN.md §A/§B. 4. Play the motion: scroll the page,
use every interaction and the navigation; check each storyboard row happens when and how it says (`web serve <site>`). 5. Responsive,
performance (weight), reduced motion, accessibility (contrast, alt, tap targets, headings). 6. Log the top problems in DESIGN.md §D, fix,
check again — at most two correction rounds per scope (AGENTS.md), then DONE or BLOCKED with what remains.

**Improving an existing site (redesign):**
1. **Before:** keep the original untouched; list what must survive (pages, links, forms, data, analytics, SEO titles, brand rules);
   `node studio/studio.mjs web audit <site>-before --dir=<built site folder>` (MCP `web_check` with `dir`) → lights + strips.
2. **Stages A → B → C:** keep the stack and the content; change design, structure and motion.
3. **Stage D + after:** `web audit <site>-after --dir=<new build> --before=<site>-before` → what got better, what got worse (worse = not done). Inside the same colour the measure decides: more findings, or weight up > 10 %, is worse.
4. A live URL is audited from a local copy or its built output; publishing still needs the owner's hosting account.

**Final delivery:** the working site; implemented and tested animations; DESIGN.md (the reusable design system); before/after screenshots
for a redesign; a short quality report (responsive, accessibility, animation, performance) in Egyptian Arabic, conclusion first; the
unresolved limitations (not tested on real devices, not published, a stage that ran without its tool, …).

## Taste pass (2026-10-19, lens 1 + the measurable parts of lens 3)
- **The idea sentence:** "On this site, [something only this client has] becomes [the device the style calls for]." Competitor test: if a
  rival next door could use the sentence, it is not specific enough. List 8–12 things only this client has before writing.
- **One claim per section;** a section with no claim is deleted. Headlines ≤ ~32 characters; proof never invented.
- **Look and fix:** open the strips, fix the top three problems, check again — inside the studio's two-round budget.
- Used directly only when installed in the host (see "One workflow"): taste-skill's 20 dealt directions and image search,
  Impeccable's live mode and 24 commands, UI UX Pro Max's palette/font database — see `TECH_RADAR.md` 2026-10-19.

## Motion vocabulary (web/motion/motion.js + site.css, opt-in by data attributes)
Names and exact timings for more web effects and UI parts: Motion Prompt #049–#096 (`node studio/studio.mjs moves search <words> --library=motion-prompt`; `../library/README.md`).
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
