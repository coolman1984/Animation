# Masar (مَسار) — design record (stages A–D, WEB.md "One workflow"), 2026-11-07 — round 1 correction: English

Fictional life-coach site, labelled as such in the hero label, the testimonial and the footer. Built from two owner references sent
the same day: (1) a phone recording of a site that is visibly built by a swarm of coloured cursors, and (2) a screenshot of a
life-coach template (blue hero with a portrait on a white shape, stepped cards, a navy story timeline with photos, a testimonial with
a photo strip, a navy footer with a newsletter). Layout grammar and motion grammar are learnt from them; name, copy, photos, colours
and code are original. Live: private artifact https://claude.ai/artifact/DksCJS9G6kHiKoTuMDJipM (owner only until shared).

## A. Direction
- Audience: managers and founders who feel busy but unclear. Idea sentence: *a coach who brings order — and a page that visibly puts
  itself in order while you read*. Competitor test: a generic coach site fades cards in; this one shows its own construction.
- References studied: the two owner files above, `LESSONS.md` (one family, MSA copy, show people big, one idea per section).
- Owner reference wins over the default bans for the small section labels and the handwritten-style accent words: both are
  central to the screenshot he chose. Round 1 (owner: "faster, bigger arrows, all English, professional design, colours and
  fonts — it looks very bad now"): the page is now English/LTR with a refined palette and an editorial serif accent.

## B. Design system
- Type (round 1): Manrope 400–800 (text and headings, tight −0.035em on the 82 px H1) + Instrument Serif italic for accent words,
  big numbers and the testimonial. JetBrains Mono only inside the build overlay (W × H labels, aria-hidden). H2 34–54 px lh 1.08;
  body 18 px lh 1.7; labels 14 px tracked caps.
- Colour (round 1): cobalt ink #1E3BB3 (header + hero), cobalt #2B50E0 (buttons, photo strip), navy #0D1A3A / #14244D (cards,
  story), footer #0A1430, warm paper #F7F5F0 and sand #ECE7DD instead of cold grey, ink #121829, muted #596178, ice #C9D6FF accents
  on dark. The saturated gold and the Arabic script face were dropped. All text pairs pass AA (web audit).
- Layout: 1180 px wrap; hero 2 columns (text right, portrait left in RTL); stepped cards 4 columns rising toward the reading end
  (60/120 px offsets) → 2 columns on tablet → 1 on phone; footer 4 → 2 → 1 columns. Buttons 44–52 px tall.
- Photos: 11 CC0 StockSnap images via Openverse (`../CREDITS.json`), the coach is one model across hero and story (same series).

## C. Motion storyboard (`web/motion/build-swarm.js`, opt-in by data attributes)
- What moves: six numbered agent cursors fly to each part, draw a selection box from the reading-start corner with live W × H,
  drop a red vertical guide and a blue horizontal guide, then the part appears: words are uncovered in reading order behind a gold
  caret, numbers roll to their value, photos show a grey placeholder and then uncover top-down, cards appear inside their outline.
- When: each section starts when it enters the viewport; parts the visitor already scrolled past finish instantly; long queues run
  at 55 % duration. After the last part the agents gather on the footer logo.
- Why: it is the owner's requested effect and it carries the idea sentence (order being made). Control bar: progress, pause,
  "ابنِ من جديد" (takes the visible part apart and builds it again).
- Reduced motion: complete still page; the bar says so and offers a manual "شغّل البناء". No JavaScript: complete page.
- Tech: vanilla JS + Web Animations API + IntersectionObserver, zero dependencies (CSS/GSAP not needed).

## D. Critique log
- Build tuning (browser, before delivery): first section built too slowly (~3 s) → shortened every step (element ≈ 0.7 s). A fast scroll left later sections
  empty while agents were still busy above → off-screen parts now finish instantly. Finale target moved to the footer logo.
- `web audit` (phone 390 / tablet 820 / desktop 1440 + reduced motion): no red lights; fixed 13 px notes, the 41 px logo tap target
  and a 180-character legal line. Remaining yellow, defended: the gold typing caret is a box-shadow that exists only while a line is
  being revealed (≈ 0.5 s), not a resting shadow.
- Owner round 1 (2026-11-07): faster (element ≈ 0.45 s, section of ~10 parts ≈ 1 s), agents 28 × 35 px with larger number tags,
  English copy, new palette and type above. Bar and agent labels now follow the page language (`start({ labels })` overrides).
  `web audit`: no red; remaining yellow = the transient typing caret only.
- Not verified: real phones; the owner's verdict on round 1 (correction round 1 of 2 used).
