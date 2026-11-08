---
name: emil-skills
description: Emil Kowalski's design-engineering skills (MIT, vendored text) — choreograph several elements that animate together (lead / support / decoration / static, together / overlap / sequence / carry, stagger budgets, interruption, reduced motion), build one animation right (curve, duration, origin), review, improve, remove or find animations, fix dropped frames, name motion precisely, Apple's fluid-motion principles, native feel on phones, break a UI with worst-case data, prototype variants. Use for any web or UI motion, a hero or list entrance, a stagger, a view swap or multi-step flow, an animation audit ("feels slow", "feels robotic", "too much going on"), and when timing a group of moving parts in a film shot.
---
# emil-skills (vendored)
Upstream text: `studio/toolkit/emil-skills/skills/<skill>/SKILL.md` (+ RECIPES / STANDARDS / AUDIT / CATALOG beside it), cheatsheets
`ui-cheatsheet.md` and `performance-cheatsheet.md`. Licence and pinned commit: `studio/toolkit/toolkit.json`. Read the one skill the
job needs, whole, before writing motion. Skip each upstream "Initial Response" line: answer the owner directly.

| Job | Upstream skill |
|---|---|
| Several things move on one event (hero, list, view swap, steps, morph) | `choreograph` (+ `RECIPES.md`) |
| One animation from scratch: curve, duration, origin, properties | `animate` (+ `RECIPES.md`) |
| Strict review / codebase audit with plans | `review-animations` (`STANDARDS.md`) · `improve-animations` (`AUDIT.md`) |
| Should it move at all? | `find-animation-opportunities` · `remove-animations` |
| Dropped frames | `animation-performance`, `performance-cheatsheet.md` |
| Words for asking for motion | `animation-vocabulary` |
| Principles behind it | `emil-design-eng`, `apple-design` |
| Site feels like a website on a phone | `mobile-native` · worst-case data: `break-ui` · several variants to compare: `prototype` |

Studio adaptations:
- **Right-to-left.** His directions assume left-to-right. In our Arabic pages "forward" moves content to the **right** and new content
  enters from the **left**; a stagger across a row runs right → left; top → bottom is unchanged. Arabic is never split per letter.
- **Our stack.** Sites are plain HTML/CSS (`web/WEB.md`), so translate his Motion recipes to the CSS role pattern used in
  `web/gallery/specimens/*`: `.in` with `--d` (delay) and `--y` (distance) per element, `animation-fill-mode: both`, ease-out
  `cubic-bezier(.23,1,.32,1)`, decoration `.in.f` fades only; reduced motion collapses to one short fade with no delays. GSAP or Motion
  only when the `web/WEB.md` table says so.
- **Write the timeline first** (his Required Output Format) into the site's `DESIGN.md` §C motion storyboard: one row per moving element
  with role, start, duration, motion and relationship, then what does not move and why, then the moment to scrub.
- **His budgets, our pages.** Marketing heroes: lead first, support overlapping at shrinking gaps (≈80 → 140 ms), whole entrance < 1 s.
  Product UI groups < 300 ms. No scroll reveal on every section, no stagger on tabs/menus/rows the visitor repeats, no motion on data
  being read, no `transition` lag on a slider or drag (the pointer is the animation).
- **Films too.** In a studio-engine shot, cast each beat (one lead, support, decoration, static) and choose together / overlap / sequence
  before keyframing; it agrees with `animation-principles` (staging, timing) and `edit-rhythm`.
- **Verify like he says:** step the entrance frame by frame (pause `document.getAnimations()` and set `currentTime`, or film it with
  `cdp-capture`), check it reads as one wave, then the interruption checks and the 50th-use test.
- House method (`QUALITY_PLAYBOOK.md` §0, `web/gallery/LESSONS.md`, owner update 2026-11-03 in `AGENTS.md`) wins on taste, copy and honesty.
