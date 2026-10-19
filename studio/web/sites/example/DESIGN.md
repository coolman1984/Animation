# DESIGN — نور (example site, fictional café)
The site's reusable design record (web/WEB.md "One workflow"). Written after the fact for the 2026-10-16 example, so stages A–D are
recorded as they were decided then; a client site writes this file BEFORE building.
Conflicts between tools are settled by: the client's brief and brand → this file → the owner's taste (QUALITY_PLAYBOOK §0) → tool suggestions.

## A. Creative direction (owner: taste-skill)
- Business, audience, purpose, the one action: a small downtown roastery (fictional, bench brief cafe15); office workers nearby; get them to order before they arrive; action: "احجز ترابيزتك".
- Things only this client has: roasts every morning in small batches · order before you arrive · a small warm bar · staff who know your name · a menu of six drinks · downtown location · no prices or hours given yet (honesty: none shown).
- References studied: the studio's own web styles; learn warmth and tactility, never copy third-party layouts.
- Three directions: 1 paper menu (editorial, calm type) · 2 dark espresso bar (ink-studio, sharp) · 3 warm clay counter (tactile, a menu that turns like a counter display).
- Chosen + why: 3, clay counter — the place is about warmth and the drinks in front of you; a turning menu is the counter itself.
- The idea sentence: "On this site, the café's six-drink menu becomes a ring that turns in front of you like the bar." Competitor test passed: it rests on this menu and this bar, not on any café.
- Storytelling, composition, imagery, typography, motion personality: hero promise → the office-coffee problem → three differences → three ordering steps (sticky) → the turning menu → FAQ → one action; no photos exist, so type and clay surfaces carry it; motion is soft and warm, never bouncy.

## B. Design system (owner: UI UX Pro Max)
- Industry rule followed (food & beverage / café): warm palette, appetite colours, friendly rounded type, avoid cold corporate blue and stock photos of strangers.
- Colours: the `clay-3d` tokens in web/styles/index.json (warm clay ground, deep brown text, terracotta accent; contrast checked ≥ 4.5:1 after the muted fix).
- Dark mode: no (a daytime café; one warm light).
- Type: display Alexandria / text Readex Pro (Arabic-capable, vendored OFL); Space Mono for small labels — the web check flags it as a third face (kept in the example, logged in §D).
- Spacing & grid: CSS variables of the style; sections stack in one column on phone, two on desktop where the content pairs.
- Components & states: buttons with hover/focus rings and 44 px targets; ring cards draggable with keys; FAQ as details/summary.
- Breakpoints: phone 390 · tablet 820 · desktop 1440 — ring radius clamps with the width; ring sections clip their overflow.

## C. Motion storyboard (built by the animation layer)
| Moment / section | What moves | When (trigger) | Why (the story) | Responds to user how | Tech (minimum) | Reduced motion |
|---|---|---|---|---|---|---|
| hero | headline words one by one | load | the promise arrives like a fresh pour | — | CSS + motion.js `data-split` | words shown at once |
| problem, features | blocks rise from blur | scroll entry | one claim at a time | — | CSS scroll timeline / observer | shown still |
| steps | step cards pin and swap | scroll | ordering is three simple moves | scroll position | `data-steps` (sticky) | all steps listed |
| menu | 3D ring of six drinks | auto-spin until touched | the counter display | drag, wheel, arrow keys | CSS 3D transforms (`data-ring`) | flat list |
| marquee | strip of four phrases | continuous | the café's rhythm | — | CSS | static |
| CTA | magnetic button | pointer near | the one action invites | pointer | `data-magnetic` | plain button |
Shared timing: rise 0.6–0.8 s, ease-out, 0.07 s word stagger, no bounce. Libraries added: none (no GSAP, no Three.js needed).

## D. Critique & polish (owner: Impeccable) — log
| Round | Evidence (audit / strips) | Top problems | Fix | After |
|---|---|---|---|---|
| 1 (2026-10-16) | web check + strips | muted text 3.97:1; small tap targets; ring widened the phone page by 27 px; hero buttons half-faded on first screen | darker muted; 44 px targets; ring sections clip; reveals end at entry 100 % | READY |
| 2 (2026-10-19) | taste lights | three typefaces; shadows on buttons and ring cards; type-led hero (0 % media) | kept: example has no photos; shadows lift the clay cards on purpose | READY with 3 defended yellows |

## Delivery
Example only: not a client, not published. Not tested on real devices.
