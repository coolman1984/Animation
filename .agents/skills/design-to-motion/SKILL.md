---
name: design-to-motion
description: Turn a static design (a Figma frame, dashboard, app screen, bento or card set, UI on a photo) into a pixel-exact animated showcase (design-to-motion by Elaya, MIT, vendored text) — empty state → smooth load → every visual acts out what it does in a seamless loop, with fidelity, overflow, seam, empty-beat and rest checks, and MP4/GIF exports. Use when the owner says "animate this design/screenshot/dashboard", for product-UI promo shots, and for the bento/feature cards of a site (web stage C).
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# design-to-motion (vendored)

> **Hallmark is mandatory and loads first; this skill supplements it.** For any app/website/page/UI work, load `.claude/skills/hallmark/` (toolkit `studio/toolkit/hallmark/`) before this skill; Hallmark wins on conflict.
Upstream text: `studio/toolkit/design-to-motion/SKILL.md` (licence and pinned commit: `studio/toolkit/toolkit.json`). Read it whole before
building; its "Make it yours" table holds every timing. Two contexts: **showcase** (the whole frame loops, exports) and **website** (only
sections with a visual part; intro once on scroll, stories while on screen).

Studio adaptations:
- **Our engine, their numbers.** Build in the studio engine / composer (`studio/studio-engine/STUDIO.md`): its "one JS clock driven by loop
  time" is our render-at-t contract, so their `?capture` recorder is not needed; keep their choreography table (card / up / pop / wipe / donut…),
  easing tokens and story table. Existing kits that already do parts of it: `lib/uimotion.js` (typeOn, stackLines, pulseRing), `lib/uimorph.js`.
- **Story first.** Write one sentence per visual ("a new lead lands on top, the others step back") in the storyboard before building; every
  card acts every 1–2 s, cards offset in reading order, each story starts and ends on the exact design.
- **Checks they add that we keep:** reference-vs-still comparison (PSNR, blurred difference image), overflow outside containers, seam
  (frame 0 = frame one cycle later), empty-beat and rest frames. Run them with ffmpeg (skill `ffmpeg-master`) on the exported frames.
- **Frame rate and size:** the house default stays 30 fps (`STUDIO.md`); use their 60 fps X export only when the owner asks (`--fps=60`).
  GIFs (960 px loop, 800×500) are extra deliverables only when asked; the finished film is the MP4.
- **Real screens only.** A Figma token is typed by the owner into an environment variable, never into a file, chat or log. From a flat
  screenshot, say which parts cannot be separated. Fictional data in a UI is labelled (skill `data-honesty`); real apps are filmed with
  skills `screen-actor` / `cdp-capture`.
- **Arabic:** live HTML text in a website keeps `dir="rtl"`; typing reveals by word or whole glyph cluster, never splitting joined letters
  (`lib/typography.js` refuses it).
- House method (`QUALITY_PLAYBOOK.md` §0) wins on taste, music, logos and honesty; write the stories used in the film's LEDGER.
