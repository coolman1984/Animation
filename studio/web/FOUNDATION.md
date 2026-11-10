# The web foundation — the "Fable 5.2" level (owner order, 2026-11-10)

Owner, 2026-11-10, pointing at https://miaai-lab.github.io/Claude-Fable-5.2-HTML-Files/ :
"This is exactly the level of websites I want. Learn it well and make it the foundation of our design for the whole websites section."

This file is that foundation. **It is the taste baseline for every site, landing page, web animation and web tool we build or improve.**
It does not replace the One workflow (WEB.md): it is what stages A and C must reach, and what stage D judges against.

## What the reference is (studied 2026-11-10)
A collection of 76 single-file HTML studies, each generated from one long written brief (517–1,127 words, median 803).
Seven are landing pages for invented brands (006 Volcán Chico hot sauce, 015 Maison Ombre perfume, 028 Conservas Maré Alta cannery,
036 Kestrel bicycle frames, 047 Atelier Vesper watches, 059 Pluvia & Sons umbrellas, 071 Apiary No. 9 honey); the rest are editorial
features, scroll stories, working instruments, dashboards, data visualizations, games, CSS-only illustrations and ambient scenes.
We downloaded all 76 files and measured them, read every brief, and opened the landing pages at 1440 px and 390 px in Chromium
(no sideways scroll, no script errors on the two checked on a phone).

| Measured across the 76 files | Count |
|---|---|
| honour `prefers-reduced-motion` · style `:focus-visible` · use `aria-*` · set `<html lang>` | 76 · 76 · 76 · 76 |
| load anything from the network (CDN, library, web font, image) | **0** (one file has a local `@font-face`) |
| draw with SVG · Canvas 2D · WebGL | 71 · 52 · 8 |
| synthesise sound with Web Audio (always off until the visitor turns it on) | 38 |
| keyboard control · pointer control | 66 · 68 |
| pause when the tab is hidden · handle `devicePixelRatio` · seeded randomness | 68 · 50 · 55 |
| file size | 32–112 KB, whole site in one file |

The repository has no licence. **We study it; we never copy its code, drawings, names or text into a deliverable.** Links only.

## The twelve laws (what makes it that level)
1. **One concept, and the interface proves it.** Every page has one sentence of concept, and the page *is* the product demonstrated:
   the umbrella cursor keeps the text under it dry (059); the tin really opens (028); the blueprint re-drafts itself to your measurements (036);
   honey fills the comb as you scroll (071). A world, not a template with sections.
2. **One material and one geometry carried through everything.** Honey + hexagon; blueprint line + title block; printed tin label +
   decorative border. Section dividers, buttons, inputs, the cursor and the confirmation all come from that material.
3. **One signature moment, built on a real model.** One big interaction backed by real maths or simulation (marbling displacement formula,
   frame geometry from inseam, spring-damped liquid, rain with collision). The visitor meets it within the first three seconds or one scroll.
   Everything else on the page supports it.
4. **Drawn, not stocked.** The hero object is drawn in SVG/Canvas with the texture of its material: halftone on shadows, off-register
   outlines by 1 px, paper fibre from SVG turbulence, layered gradients for glass. No stock photos, no orbs, no generic icon sets.
   (For a real client, their real photos and products are the material — see "Our adaptation".)
5. **An exact palette from the world.** 4–6 named hex colours taken from the material ("label cream", "tomato red", "blueprint blue"),
   and one accent with one job (the umbrella's yellow is the only yellow). The ground is often a colour field of the world —
   "neither dark mode nor white".
6. **Type by role, each with a reason.** Display, text, labels and numerals each have a job and a source in the world: condensed caps
   like a tin label, engineering lettering, tabular figures for prices and dimensions, an italic note "pencilled in the margin".
   2–3 families, every one justified; tiny type is deliberate and rare.
7. **Specific copy.** Names, places, dates, numbers and small true-sounding facts ("closed on dry days", "tested in a car wash on Finch
   Street", "about a year, sorry"). Dry, confident voice; no superlatives, no marketing clichés. Every section says one concrete thing.
8. **4–6 sections, each with its own composition.** A shelf of tins, a strip of stamps, a letter from the owner, a ruled price table,
   a ring calendar, a Gantt of the work. Never the same card grid twice.
9. **Motion written as numbers, in the world's character.** The brief states the entrance (what draws first, over 2.5–3 s), the stagger
   (40 ms), the curves (`cubic-bezier(.16,1,.3,1)` for slow luxury, near-linear for a type specimen, long ease-in for honey, a springy pop
   only where the world is loud), idle life, hover and the reward. Motion explains the world; it never decorates it.
10. **Details that reward attention.** A cursor drawn from the world (desktop only), hover that reveals a real spec, a stamped confirmation,
    a revision log, a small live readout ("now falling: drizzle"), sound off by default behind a drawn toggle.
11. **The craft floor is not optional.** Reduced motion gives a complete still page where the key interaction still works; every interaction
    works from the keyboard; focus rings are styled in the world; labels and roles are set; animation pauses when hidden or off screen;
    canvas DPR capped at 2; the phone layout is re-composed (the hex grid becomes 3 columns), never shrunk; no sideways scroll.
12. **Self-contained and light.** One file or one folder, no CDN, no framework, no tracking, no web font from the network; 30–120 KB of
    code before images. It opens offline and stays fast.

## Our adaptation (Arabic, real clients, our rules)
- **Real client = real material.** The 8–12 things only this client has (DESIGN.md §A) become the material, the geometry and the signature
  moment: their product, process, place, tools, receipts, menu, machines. Never invent founders, dates, numbers, stockists or quotes for a
  real client (skill `data-honesty`). Invented worlds are for demos only, and a demo says it is fictional on the page.
- **A real action.** A real client's page ends in a real next step (WhatsApp, phone, booking link, map). The stamp or seal celebrates the real
  action; a form that only pretends to send is allowed in a fictional demo only, labelled.
- **Arabic type by role, from local files.** System fonts do not guarantee good Arabic, so roles use the vendored OFL faces
  (`studio/assets/fonts`, ASSETS.md): text in IBM Plex Sans Arabic; display chosen from Readex Pro, Alexandria or El Messiri when the world
  calls for it; Latin labels and figures in Space Mono or JetBrains Mono. Each family in DESIGN.md §B with its reason.
- **Never split Arabic into letters.** Letter-by-letter animation and `-webkit-text-stroke` break the joins. Animate whole words, lines,
  masks, clip paths or the drawn strokes around the text.
- **The world mirrors in RTL.** Sliders fill from right to left, horizontal journeys and timelines run right to left, leader lines and the
  drawn cursor mirror. Choose Western or Eastern Arabic numerals once per site and keep them.
- **Copy stays clear.** Modern Standard Arabic by default, short and specific (gallery/LESSONS.md rule 2 still holds): the reference's charm
  comes from facts, not jokes. Egyptian Arabic only when the brand already speaks it.
- **Stack.** Our sites stay static and dependency-free as WEB.md says; the technology table there still picks the minimum
  (CSS → SVG/Canvas → Three.js; GSAP only when its row truly fits). The reference shows that hand-written Canvas/SVG reaches this level
  without any library.

## How a site starts: the world brief
Before any code, write a brief at the reference's depth (500–1,100 words) with `templates/WORLD_BRIEF.md` and paste it into DESIGN.md §0.
Its order is the reference's order: concept · world and real facts · mood · palette · material and geometry · typography by role ·
numbered structure with real copy · signature moment (and its model) · motion grammar with numbers · details · reduced motion ·
responsive · performance · voice. A model that cannot write this brief cannot build the page; fix the brief first.

## The bar (stage D asks these; any "no" is a finding)
1. Can the concept be said in one sentence, and does the interface itself demonstrate it?
2. Is there one material and one geometry, and do buttons, inputs, dividers and confirmations come from them?
3. Is there one signature moment, built on a real model, reached in ≤ 3 s or one scroll, that a visitor would show someone?
4. Is the hero drawn or the client's real material — no stock, orb or generic icon?
5. Is the palette 4–6 named colours from the world, with one accent doing one job?
6. Does every typeface have a role and a reason?
7. Does every section say one specific, true thing, each in its own composition?
8. Is the motion written as numbers and in the world's character, with no effect that does not come from the concept?
9. Is there at least one detail that rewards a second look?
10. Reduced motion, keyboard, focus, labels, pause-when-hidden, DPR cap, phone recomposition: all pass in a real browser (`web check`)?
11. Self-contained: no network requests, light, opens offline?
12. Arabic: whole-word animation, mirrored world, local fonts, honest facts, a real action?

## Which studies to open for which job (links only; base URL above + file name)
| Job | Studies |
|---|---|
| Brand landing page | 006, 015, 028, 036, 047, 059, 071 |
| Editorial / print feature | 003 croissant anatomy, 017 riso zine, 040 newspaper, 052 brutalism zine, 067 fog essay |
| Scroll story | 007 ice core, 022 hotel lift, 035 eclipse, 050 river journey, 064 airmail letter |
| Working instrument / tool | 005 slide rule, 019 drum machine, 032 typewriter, 045 type specimen, 058 drawloom, 070 semaphore |
| Dashboard | 029 weather station, 039 greenhouse console, 072 power board |
| Data visualization | 014 primes, 024 village unit chart, 042 Venus, 057 daylight, 074 Collatz kelp |
| Game / toy | 004 lighthouse, 016 lander, 031 tangram, 044 labyrinth, 068 gelato stack |
| CSS only (no JavaScript) | 010 op art, 023 turntable, 038 instant film, 054 nesting dolls, 066 diner |
| Ambient scene | 009 koi, 012 murmuration, 020 aurora, 026 frost, 030 rose window, 046 woodblock snow, 062 wheat |

## What this changes
- Supersedes, where they disagree on taste: gallery/LESSONS.md rule 1 (one family → 2–3 families by role) and rule 7 ("restraint in motion"
  → one signature moment plus motion the world motivates), and the "show the product big / soft colour panels" defaults in LESSONS and
  ART_DIRECTION.md. Their measured sizes, clarity of copy and trust-row advice still apply where they fit the world.
- Agrees with the 2026-11-03 owner update ("content-first, no decorative defaults"): in the reference every effect comes from the concept,
  so a default effect is still banned and a motivated one is now expected.
- Unchanged: honesty rules, the One workflow and its DESIGN.md, `web check` gates, the testing policy, the two-round correction budget.
