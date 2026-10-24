---
name: gsap-skills
description: Official GSAP skills (GreenSock, MIT, vendored) for web stage C — core tweens, timelines, ScrollTrigger, plugins, utils, React, Vue/Svelte, performance. Use when a site needs cinematic sequences, scroll storytelling, pinned scenes or synchronized timelines. The GSAP library itself is GreenSock's standard no-charge licence, not MIT.
---
# gsap-skills (vendored)
The official skills live in `studio/toolkit/gsap-skills/` (pinned commit and licence: `studio/toolkit/toolkit.json`, `LICENSE`).
Start at `studio/toolkit/gsap-skills/llms.txt`, then read the one skill for the job. Paths inside a skill are relative to its own folder.

| Job | Read |
|---|---|
| core tweens, easing, stagger, `gsap.matchMedia()`, reduced motion | `gsap-core/SKILL.md` |
| timelines, labels, sequencing | `gsap-timeline/SKILL.md` |
| scroll, pin, scrub | `gsap-scrolltrigger/SKILL.md` |
| Flip, Draggable, SplitText, MorphSVG, DrawSVG, CustomEase, the rest | `gsap-plugins/SKILL.md` |
| clamp, mapRange, snap, wrap | `gsap-utils/SKILL.md` |
| React / Next (`useGSAP`, cleanup) | `gsap-react/SKILL.md` |
| Vue, Svelte, Nuxt, SvelteKit | `gsap-frameworks/SKILL.md` |
| jank, transforms, batching | `gsap-performance/SKILL.md` |

Studio adaptations:

1. **Where it sits:** web workflow stage C (`studio/web/WEB.md` "One workflow") — build and animate from the motion storyboard in `DESIGN.md` §C.
2. **Minimum tech first.** Do not install GSAP for a hover. CSS (`web/motion`) for hover, transitions and simple reveals. Motion (motion.dev) only when the project is already a component app. GSAP + ScrollTrigger only for cinematic sequences, scroll storytelling, pinned scenes or synchronized timelines. Three.js and SVG/Canvas stay on their own rows of that table.
3. **Reduced motion.** Use `gsap.matchMedia()` for `prefers-reduced-motion`. The page stays complete and still (WEB.md): content is not hidden when motion is off.
4. **Pin and credit.** Each site pins its own GSAP version (package.json, or the version written in DESIGN.md §C) and credits GreenSock there. Do not float to "latest".
5. **Licence.** These skill files are MIT. The GSAP **library** is not MIT and is not in this repo: it is GreenSock's standard no-charge licence (https://gsap.com/standard-license/, terms posted 2025-05-30). Commercial sites are covered at no charge, plugins included, with no token. The limit is a product that lets people build animations in a visual editor the way Webflow does — that use is not allowed. Check the page for this client before adding the library. Never tell a client the library is MIT.
6. **Authority:** the client's brief and brand → DESIGN.md → the owner's taste (`studio/QUALITY_PLAYBOOK.md` §0) → these skills. House taste lights still ban bounce and elastic easing unless DESIGN.md defends them. Arabic sites keep `dir="rtl"` and joined letters.
