# Film 23 — «أكاديمية أساسيات الذكاء الاصطناعي» 30 s showreel-ad (2026-10-14)
Owner request: «اعمل فيديو 30 ثانية يشرح الأكاديمية مقاس يوتيوب» + "a dynamic 30-second motion graphics video … like your showreel … go all out".
Placement: normal YouTube → 1920×1080, 16:9, 30 fps, one delivery (`youtube30`). Subject: the AI Essentials interactive academy (coolman1984/Course, `AI_Academy.html`), built from the owner's 41-page book.

**Idea (one hero):** a page of the book. It drops in grey and quiet («كتاب ٤١ صفحة.. بتقراه.. وبتنسى؟»). A click wakes it: its text lines fly out and land as the six unit badges, and the page itself becomes the academy's app window. That one window morphs through every chapter — four counters, four levels, the book's governing equation (p. 7), the Excel lab, the prompt library (dark mode via the window's own moon toggle), the quiz — then breaks into the book's 41 pages, which light up one by one and implode into the academy's logo on the drop.

**Copy:** ad voice in Egyptian Arabic, one idea per bar; the payoff uses the academy's own words: name «أكاديمية أساسيات الذكاء الاصطناعي», line «كتاب الذكاء الاصطناعي، أصبح أكاديمية حيّة.», button «ابدأ الرحلة», credit «من كتاب محمد فوزي».

**Honesty:** every count is the academy's real count (41 lessons, 35 scenes, 13 labs, 97 prompts, 83 questions, 41/41 pages). The equation, the lab table and formulas, the prompt and the quiz question are the academy's own content (UI shortened, unit names as in its sidebar). No URL or contact (none supplied). The «offline» claim is true for this product but was left out to keep the film to one promise.

**Look:** the academy's 2026-10-14 redesign — white canvas #ffffff, ink #111114, one blue #2f5fe6, signal colours (green #34a466, amber #e5a03a, violet #8b6cf6, pink #e2558f, teal #18a3a0), dark chapter #0b0b0d; hairline borders, grey app window with traffic lights, circuit lines with dots, pill buttons, square badges. Type: IBM Plex Sans Arabic 400–700 + Inter (one display/UI family pair) and JetBrains Mono (formula, chapter numbers). All OFL, vendored in `assets/fonts`.

**Motion methods:** springs by damping ratio (`motion.js zspring`, ζ 0.5–0.82); one container morph chain page → chapter rects (`winRect`); lines → badges morph with speed blur; row → card morph; blur swaps for content; feathered circle theme flips driven by the toggle; mosaic of 41 tiles + distance-staggered implosion; cursor narrator on bowed paths with click dips and rings; decaying camera hits; 180° subframe motion blur (`config.subframes: 4`).

**Named ban list:** no glow/bloom, no confetti or floating particles, no fade-and-slide-up on headlines (slams and clip reveals), no text moving while it is read, no logo assembled from pieces (the logo pops whole; the pages fly *into* it).

**Sound:** original 120 BPM score (`score.mjs`), Am–F–C–G; a low wavering warning bell for the problem; drops at 4 s (the page wakes) and 24 s (the logo); hook E G A G returns in every chapter on a new instrument (pluck, bells, keys, mallets, saw lead).
