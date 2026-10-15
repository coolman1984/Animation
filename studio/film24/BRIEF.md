# Film 24 — academy landing page, 3D fly-over (2026-10-15)
Owner request: the long "page on a studio floor" fly-over brief, applied to «ال landing page بتاعتنا», every open question answered by the agent.
Placement: 1440×1152, 60 fps, 14.5 s, one delivery (`flyover`).

**Inputs answered by the agent:** the page is the academy home page (`Course/AI_Academy.html`, the same file GitHub Pages serves), captured in English, light theme, sidebar/top bar hidden.
Brand «AI Essentials Academy», logo = the academy's blue tile with the white ladder + spark. Closing line «The AI handbook,» + italic tail «now a living academy.». Track: original 15 s score (`score.mjs`).

**Look:** the page lies on a #f9fbfb → #f2f3f6 studio floor with a soft wide shadow and 24 px corners; the floating pieces (hero buttons, app mockup, command palette, equation card, ladder rungs, units list, lab cards, honesty chips) are captured separately at device scale 2 and lift/stand toward the lens as the camera passes. Four logo tiles leave beside the hero button and stay to the end card.

**Camera:** one continuous shot — backwards glide down the page at a steady speed (56° tilt, focal 1880 px, distance 1360→1700), rise to overhead, dive into the hero, land it as a card under the two-line title (Geist 500 + Instrument Serif italic). Razor-thin depth of field (strong near blur, little far blur), 16 subframes over 0.7 of a frame, mipmaps + 16× anisotropy.

**Deviations from the brief (honest list):**
- The page is 5275 px tall (shorter than the brief assumes), so the cruise is ≈ 582 px/s instead of ≈ 770 to keep the 8.2 s flight.
- The page has no testimonial; the units list card plays that role. The "footer" beat is the last section (honesty chips).
- Rendered on CPU WebGL (SwiftShader) — this container has no GPU; motion blur is done inside the engine instead of with capture flags.
