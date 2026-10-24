# DESIGN — ‹site name›
The site's reusable design record (web/WEB.md "One workflow"). Written before building; every later change follows it.
Conflicts between tools are settled by: the client's brief and brand → this file → the owner's taste (QUALITY_PLAYBOOK §0) → tool suggestions.

## A. Creative direction (owner: taste-skill)
- Business, audience, purpose, the one action: ‹…›
- 8–12 things only this client has: ‹…›
- References studied (what to learn, what never to copy): ‹…›
- Three genuinely different directions (one line each): 1 ‹…› · 2 ‹…› · 3 ‹…›
- Chosen + why (against the goals): ‹…›
- The idea sentence: "On this site, ‹something only this client has› becomes ‹the device›." Competitor test passed: ‹yes, because…›
- Storytelling, composition, imagery, typography, motion personality: ‹…›

## B. Design system (owner: UI UX Pro Max — `node studio/studio.mjs web system "<brief>" --site=<site>`, skill ui-ux-pro-max)
- Industry rule followed (style, palette mood, type mood, anti-patterns): ‹…›
- Colours (≤ 6 tokens, neutrals tinted; contrast ≥ 4.5:1): ‹bg, surface, text, muted, accent, accent-ink›
- Dark mode: ‹yes/no and its tokens›
- Type (2 families, Arabic-capable): display ‹…› / text ‹…›; scale ≤ 5 sizes; body 16–20 px, 45–75 characters per line
- Spacing & grid: ‹base unit, section gaps 120–240 px desktop, margins 16–32 px, columns per breakpoint›
- Components & states (hover, focus, active, disabled, empty, error, loading): ‹…›
- Breakpoints: phone 390 · tablet 820 · desktop 1440 (+ rules that change between them): ‹…›

## C. Motion storyboard (built by the animation layer)
| Moment / section | What moves | When (trigger) | Why (the story) | Responds to user how | Tech (minimum) | Reduced motion |
|---|---|---|---|---|---|---|
| ‹hero› | ‹…› | ‹load / scroll / hover› | ‹…› | ‹…› | ‹CSS / Motion / GSAP+ScrollTrigger / Three.js / SVG / Canvas› | ‹still state› |
Shared timing: ‹durations, easing (no bounce/elastic), stagger, rhythm›. Libraries added and why: ‹none unless needed›.

## D. Critique & polish (owner: Impeccable — skill impeccable: critique / audit / polish after `web check`) — log
| Round | Evidence (audit / strips) | Top problems | Fix | After |
|---|---|---|---|---|

## Delivery
Before/after screenshots (redesign) · quality report (responsive, accessibility, animation, performance) · unresolved limitations.
