# What professional sites do — measured 2026-11-03

Owner verdict on the first gallery: "very bad — fonts very bad, design and copy very bad; study professional sites and learn well".
So we opened 14 real sites in Chromium at 1440 × 900 (Arabic locale), took four screens of each and measured the computed type.
Thmanyah, Salla, Zid and Aesop served a bot check (not bypassed; left out). Screens are research only and are not republished.

## Measured
| Site | Font (computed) | Hero headline | Section headline | Body |
|---|---|---|---|---|
| Tabby (ar) | Tabby Sans (custom) | 60 px / 700 / lh 1.27 | 44 px / 700 | 20 px / 400 / lh 1.6 |
| Tamara (ar) | IBM Plex Sans Arabic + GT America Arabic | 140 px / 900 / lh 1.07 | 60 px / 700 | 16 px / 600 / lh 2.0 |
| Careem (ar) | Graphik Arabic | 48 px / 700 | 48 px / 700 | 28 px / 400 |
| Foodics (ar) | **IBM Plex Sans Arabic** | 72 px / 900 / lh 1.14 | 27–40 px / 600–700 | — |
| NEOM (ar) | Brown (custom) | 37 px / 400 over full-bleed video | 28 px / 400 | 24 px / 300 |
| Equinox | Equinox Sans | 64 px / 600, uppercase, on a full-bleed photo | 32 px / 600 | 24 px / 400 |
| Linear | Inter 510 | 72 px / 510 | 48 px / 510 | 15 px |
| Stripe | Söhne 300 | 56 px / **300**, two-tone sentence | 32 px / 300 | 32 px / 300 lead |
| Apple | SF Pro 600 | 56 px / 600, product name only | — | 21 px |

## The rules we take from it
1. **One font family per site, drawn for text.** Every site above uses a single sans family in 2–3 weights. Our rejected pages mixed
   decorative display faces (Reem Kufi, Lalezar, Aref Ruqaa, Alexandria 900): that is what read as amateur. Free choice that the pros
   actually ship: **IBM Plex Sans Arabic** (Tamara, Foodics). Also good in our side-by-side sheet: Vazirmatn, Rubik, Almarai, Noto Sans Arabic.
   Serif only for a deliberately editorial brand (Noto Naskh Arabic), never as a novelty.
2. **Copy is clear Modern Standard Arabic, short and confident.** "أموالك الآن تعمل لصالحك", "حلمك بيدك مع تمارا", "نصمم مستقبل نقاط البيع
   وإدارة المطاعم". Headline = the promise; one sentence under it = what the product is; one button = the next step. No slang, no puns,
   no cute rhymes. Section headlines name a benefit the reader wants ("تحكّم بدفعاتك لتناسب جدولك").
3. **Show the product or real people, big.** Tamara: a real person with floating benefit chips. Tabby/Foodics/Stripe: the product UI as a
   crisp mock-up (Stripe builds it in HTML). Apple: the object alone on a plain ground. When our photos are only 960 px wide, build the
   product UI in code and keep photos in framed boxes ≤ ~720 px wide.
4. **One idea per section, lots of air.** Eyebrow (small label) → headline → 1–2 lines → one button, alternating sides with a media block
   on a soft colour panel (24–32 px radius). Sections are 120–160 px apart on desktop.
5. **Trust row early.** Client logos, app ratings or a real number with a source, right under the hero. In fictional examples: say so.
6. **Sizes:** hero 64–96 px (Arabic needs lh 1.2–1.3, never below 1.1), section headlines 40–56 px, body 18–20 px with lh 1.7–1.9,
   buttons 16 px / 600, pill or 12 px radius, 48–56 px tall.
7. **Restraint in motion:** one role-cast hero entrance (see Motion below), quick hover/press states, real interaction where it explains something (a calculator, a
   timetable, a product configurator). No decorative noise.

## Motion — learned from Emil Kowalski's `choreograph` (2026-11-05, `toolkit/emil-skills`)
Our six examples broke his rules: a scroll reveal on every section (holds content back on every visit), uniform timing, a stagger replayed
on every timetable tab, an endless status loop on dashboard data, and pump parts lagging behind the slider. Fixed: each page now has
**one** entrance, cast by role, and nothing else moves on its own.

| Element | Role | Starts | Duration | Motion | Relationship |
|---|---|---|---|---|---|
| Eyebrow / pill / badge | Decoration | 0 ms | 400 ms | fade only | together with the headline |
| Headline | Lead | 0 ms | 600 ms | fade + 14 px rise | — |
| Lead paragraph | Support | 80 ms | 600 ms | fade + 8 px rise | overlaps the headline |
| Product visual / booking card | Support | 100–200 ms | 600 ms | fade + 12–24 px rise | overlaps the text |
| Buttons | Support | 140 ms | 600 ms | fade + 6 px rise | overlaps the paragraph |
| Floating chips | Decoration | ≈450 ms | 400 ms | fade only | land as the visual settles, 40 ms apart |
| Background photo | Decoration | 0 ms | 800 ms | fade only | — |

Doesn't move: sections below the fold (seen once, never gated), timetable rows on a day switch (repeated), dashboard status (data being
read), pump parts while dragging (the slider is the motion). Reduced motion: one 200 ms fade, no delays. Ease-out `cubic-bezier(.23,1,.32,1)`;
buttons press to `scale(.97)`. Checked frame by frame in Chromium: reads as one wave, done in < 1 s, everything visible after.
