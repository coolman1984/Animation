# مَسار — design record (stages A–D, WEB.md "One workflow"), 2026-11-07

Fictional life-coach site, labelled as such in the hero label, the testimonial and the footer. Built from two owner references sent
the same day: (1) a phone recording of a site that is visibly built by a swarm of coloured cursors, and (2) a screenshot of a
life-coach template (blue hero with a portrait on a white shape, stepped cards, a navy story timeline with photos, a testimonial with
a photo strip, a navy footer with a newsletter). Layout grammar and motion grammar are learnt from them; name, copy, photos, colours
and code are original. Live: private artifact https://claude.ai/artifact/DksCJS9G6kHiKoTuMDJipM (owner only until shared).

## A. Direction
- Audience: managers and founders who feel busy but unclear. Idea sentence: *a coach who brings order — and a page that visibly puts
  itself in order while you read*. Competitor test: a generic coach site fades cards in; this one shows its own construction.
- References studied: the two owner files above, `LESSONS.md` (one family, MSA copy, show people big, one idea per section).
- Owner reference wins over the default bans for the small section labels ("من أنا؟", "قصتي") and the handwritten accent words:
  both are central to the screenshot he chose. Accent face = Aref Ruqaa (Arabic answer to the template's script italic).

## B. Design system
- Type: IBM Plex Sans Arabic 400/600/700 (text and headings), Aref Ruqaa 700 (accent words only). H1 40–68 px lh 1.2; H2 30–48 px;
  body 18 px lh 1.85; labels 14 px.
- Colour: blue #1F4FC9 (hero, timeline cards, photo strip), navy #14204D / card #1A2A63, paper #F3F5FA, ink #141A2E, muted #4A5370,
  script blue #2D62F0 (on light) / #9DB8FF (on dark), year gold #FFD36B. All text pairs pass AA (web audit).
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
- Round 1 (browser): first section built too slowly (~3 s) → shortened every step (element ≈ 0.7 s). A fast scroll left later sections
  empty while agents were still busy above → off-screen parts now finish instantly. Finale target moved to the footer logo.
- `web audit` (phone 390 / tablet 820 / desktop 1440 + reduced motion): no red lights; fixed 13 px notes, the 41 px logo tap target
  and a 180-character legal line. Remaining yellow, defended: the gold typing caret is a box-shadow that exists only while a line is
  being revealed (≈ 0.5 s), not a resting shadow.
- Not verified: real phones; the owner's verdict.
