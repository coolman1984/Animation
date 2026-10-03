# BRIEF — Film 6 «بكسل واحد» · Pixel Plus · 30 s · ONE delivery: Facebook Reels 9:16

Owner request 2026-10-03: a 30 s Facebook Reels ad like the two supplied screen recordings, about Pixel Plus (advertising, animation and
software company), in refined professional Arabic, ending with "Made by: Mohamed Fawzy Labib"; "a dynamic motion-graphics showreel that
shows what an incredible motion designer you are… go all out". Plan + craft metadata: `production.json`.
Rebuild: `python3 film6/logo_trace.py` (needs `pip install potracer pillow opencv-python-headless`) then `node make.mjs film6 --profile=final`.

## Truth
- Brand evidence: the owner's logo (`source/logo.jpg`, git-ignored). Traced faithfully into one vector outline per letter (potrace on a 4× upsample,
  checked by a difference overlay against the source); the colours are the owner's own pixels (`plates/logo-color.png`, white fringe inpainted).
  Spelling = the logo: **Pixel Plus** (the request typed "Piexl Plus").
- No clients, numbers, results, prices or contact details are claimed (none were supplied). The ad UI says «إعلانك هنا» (your ad here),
  the app card says «تطبيقك» — staged, self-evidently illustrative. CTA «ابدأ مشروعك معنا» carries no contact info.
- Credit line exactly as requested: `Made by: Mohamed Fawzy Labib`.
- References (`source/refA.mp4` 20 s, `source/refB.mp4` 15 s, X screen recordings): grammar study only, nothing copied.

## Reference grammar (measured, `reference.mjs timeline|audio` + 30 fps strips)
No hard cuts in either reference: ONE black container on a warm off-white field springs between shapes (button → spinner → check →
player card → volume pill …) in 0.2–0.27 s with motion blur; old content blurs out first, new content blurs in staggered; a cursor drives every
change; holds of 0.5–1.5 s between bursts. Music 120 BPM in both (bar 2.0 s); morphs land on beats.

## Direction
One hero: the blue pixel (the logo's i-dot). It falls onto a paper pixel-grid (ripple), becomes the full stop of the promise line, is clicked
and becomes a portal into three worlds, each with its own light: ADS on brand blue (a Reels ad, hearts stream, 9:16 → 1:1 → 16:9 morph),
ANIMATION on paper (bouncing ball with squash/stretch, onion skin, spacing dots, a graph-editor curve dragged by the cursor, heartbeat),
SOFTWARE in dark mode (dark-mode toggle wipe, button → spinner → check → code editor → live app card). Three bands slam in on three beats
(«إبداع. تقنية. أثر.»), implode into the pixel, which bursts into 1,699 pixels that build the real logo («نصنع الفرق.. بكسل ببكسل»).
Type: Alexandria (Arabic + Latin, display and text) + Space Mono (code, labels). Palette #F2F0EB · #1F2328 · #8D949E · #0A66FF · #18B6FF.

| t (s) | bar | scene | idea |
|---|---|---|---|
| 0–4 | 1–2 | hook | pixel lands (0.5), «كل فكرة عظيمة / تبدأ ببكسل واحد», hop into the full stop (2.0), click (3.5), dive |
| 4–10 | 3–5 | ads | ad pops (4.0), tap → hearts (5.0), 1:1 (6.0), 16:9 (6.5), «إعلانات تصنع الأثر» (7.1), frame → ball (9.4), circle wipe |
| 10–16 | 6–8 | anim | bounces 10.5/11.25/11.75/12.0, curve drag 12.6, «أنيميشن ينبض بالحياة» (13.3), heartbeat, dark-mode toggle (15.5) |
| 16–22 | 9–11 | soft | button, click 16.5, check 17.0, code typing, app card 18.75, «برمجيات تعمل بذكاء» (19.3) |
| 22–24 | 12 | tri | bands 22.0 / 22.5 / 23.0, implosion 23.5–23.94 |
| 24–28 | 13–14 | logo | burst + assembly (24.0–25.2), plus spins (25.0), tagline 25.55, services 26.2, CTA 26.75 clicked 27.5 |
| 28–30 | 15 | credit | Made by: Mohamed Fawzy Labib, held |

Music (original, `score.mjs`): 120 BPM, A minor; filtered intro, drop at 4.0 with a hook melody, bouncy half-time with tuned bounce plucks
and heartbeat kicks, dark filtered 16th arp with typing clicks, three stabs, a breath before 24.0, logo shimmer and final chord. Not listened to.
