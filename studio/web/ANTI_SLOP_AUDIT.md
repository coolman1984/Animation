# Content-first web audit — 2026-11-03

Scope: first-party website generator, base CSS/JS, audit scoring, two example sites, web-director workflow. This is not a claim that every film, third-party library or every possible generated site is free of generic design.

## Findings and repairs
1. Gradient orb substituted for missing hero content → text-only layout, no invented artwork.
2. Fixed seven-section sales funnel and three-card quota → minimal hero/offerings/action; item count follows content. Other sections remain available deliberately.
3. CTA pointer magnet, default hero parallax and automatic word animation → stable targets, optional authored reveal.
4. Glass navigation, glowing pill buttons and lift on noninteractive cards → opaque navigation, plain buttons, unboxed content rows.
5. Auto-spinning 3D collection, hidden back cards and endless RAF → readable native horizontal collection, no autoplay or hidden content.
6. Looping duplicated marquee hidden from screen readers → static, single-copy visible text.
7. Mobile navigation removed → wrapping navigation retained on phone.
8. Three font families by default → labels reuse the text family, Arabic remains supported.
9. Fake booking action and formulaic pain/reassurance copy in fictional cafe → clearly disclosed menu demo, working menu/back navigation.
10. Fictional studio's vague sales claims → descriptions of actual arch/leaf studies.
11. Audit rewarded 8+ moving elements and 40% hero media → measures retained as observations, no style quota.
12. Blur on routine reveals → short transform/opacity transition only. No-JS content remains readable.

## Verification
- Web unit tests: 5 pass, 0 fail, including no decorative defaults and opt-in reveal regression.
- New real-browser regression: collections/navigation work with scripts disabled and reduced motion; no document overflow, all 6 collection items present, no running animations.
- Browser audits of showcase and Arabic example at 390/820/1440px and reduced motion: no red lights. Original rasterization fixes from PR #35 retained.
- Original illustration palette, shapes and typography remain authored choices, not automatic keyword bans. The showcase deliberately uses a multi-line display title; this remains an advisory, not an accessibility failure.
- Actual user research, independent art-direction review, real mobile hardware and full repository tests are outside these checks.
