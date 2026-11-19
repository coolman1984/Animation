---
name: emil-skills
description: Emil Kowalski's design-engineering skills (MIT, vendored; 18 skills from Emil's Vercel/Linear practice) — should it animate, easing and duration numbers, building and choreographing motion, gestures and sheets, reviewing/improving/finding/removing animations, frame-drop fixes, motion vocabulary, Apple-style design, making a web page feel native on a phone, breaking UI with worst-case data, prototype pickers, UI library picks, Sonner, Expo motion and Swift. Use for the interface layer of any site or app (stage C build, stage D polish), when motion feels slow, janky or off, on phone polish, and to stress-test a screen.
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# emil-skills (vendored)
The skills live in `studio/toolkit/emil-skills/` (pinned commit and licence: `studio/toolkit/toolkit.json`, `LICENSE`). Each folder under
`skills/` is one skill; paths inside a skill are relative to its own folder. Two one-page cheatsheets: `ui-cheatsheet.md`, `performance-cheatsheet.md`.
Do not install them again with `npx skills add` (unpinned; it writes its own agent folders). Read the one skill for the job:

| Job | Read (`studio/toolkit/emil-skills/skills/…`) | Stage |
|---|---|---|
| The philosophy: should it animate (frequency table), purpose, easing, duration, springs, component rules, review table | `emil-design-eng/SKILL.md` | C, D |
| Build one animation from scratch, in decision order | `animate/SKILL.md` + `RECIPES.md` | C |
| Several elements moving together: who leads, overlap, what stays still | `choreograph/SKILL.md` + `RECIPES.md` | C (motion storyboard, DESIGN.md §C) |
| Drag, swipe, sheets, fling, hold-to-confirm that track the finger 1:1 | `gestures/SKILL.md` | C (signature interactions) |
| Strict review of motion code (flag by default) | `review-animations/SKILL.md` + `STANDARDS.md` | D |
| Audit all motion in a project → prioritised plans | `improve-animations/SKILL.md` | D, redesigns |
| Where motion would help, and where it must not | `find-animation-opportunities/SKILL.md` | A/C |
| Remove motion that slows the product | `remove-animations/SKILL.md` | D |
| Dropped frames: composite-only properties, CSS vs WAAPI vs rAF, blur cost, `will-change` | `animation-performance/SKILL.md` | C, D |
| Name an effect exactly ("what's it called when…") | `animation-vocabulary/SKILL.md` | A, briefs |
| Apple's design and fluid motion for the web: springs, momentum, materials, type | `apple-design/SKILL.md` | A, C |
| A web page that feels native on a phone: sticky hover, tap flash, 100vh, input zoom, notch, long-press | `mobile-native/SKILL.md` | C, D (every site) |
| Break a screen with worst-case data (long names, Arabic, empty, huge counts) | `break-ui/SKILL.md` + `CATALOG.md` | D |
| Several real variants behind a picker | `prototype/SKILL.md` + `PICKER.md` | A (directions) |
| Pick a UI library (only for component apps) | `pick-ui-library/SKILL.md` | B/C |
| Sonner toasts · React Native/Expo motion · modern Swift | `ask-sonner/` · `animate-expo/` · `write-swift/` | the owner's apps |

Studio adaptations:

1. **Where it sits:** the interface layer of web stages C and D (`studio/web/WEB.md` "One workflow"). The world, the concept and the signature moment come from `studio/web/FOUNDATION.md`; these skills make every control, transition and gesture inside it feel right. Findings go in DESIGN.md §D.
2. **Two budgets, both from the skills:** interface feedback stays fast (press 100–160 ms, popovers 125–200 ms, dropdowns 150–250 ms, modals ≤ 500 ms, never `ease-in` on UI, never from `scale(0)`); explanatory or world motion ("marketing / explanatory: can be longer") follows the site's motion grammar in DESIGN.md §C. A physical simulation (falling honey) is not UI easing.
3. **Static sites first.** Our sites have no framework (WEB.md): translate React/Motion/Sonner/Vaul/Base UI advice into CSS transitions, `@starting-style`, WAAPI or the site's own Canvas/SVG code. Library picks apply only when the project is already a component app; never add a dependency to a static site for a toast or a sheet.
4. **Springs and bounce:** house taste bans bounce/elastic by default. A subtle spring (bounce ≤ 0.2) is allowed for drag, fling and gesture release, or where DESIGN.md defends it for the world (FOUNDATION law 9).
5. **Arabic and RTL:** never split Arabic text into letters; mirror swipe directions, drawers, `transform-origin` and chevrons under `dir="rtl"`; run `break-ui` with long Arabic names and mixed Arabic/Latin strings.
6. **Reduced motion and testing:** `prefers-reduced-motion` keeps a complete still page (WEB.md). The skills' "test on real devices" stays an honest limit in the report when no phone was used; `web check` covers 390/820/1440 in Chromium.
7. **Authority:** the client's brief and brand → DESIGN.md → the owner's taste (`studio/QUALITY_PLAYBOOK.md` §0, `studio/web/FOUNDATION.md`) → these skills. Their numbers and checklists win over guesses; they never override honesty rules or the house's taste.
