---
name: landing-page-design
description: Landing-page strategy, conversion copy and ship checklist (landing-page-design by Elaya, MIT, vendored text) — one offer / one audience / one action, intake in one batch, above-the-fold order, layout types A–D, copy formulas, section-by-section build, SEO/AEO, content realism, full interaction states, ship requirements and the tagline word-reveal section. Use with web-director when the site is a landing page or campaign page (feeds stages A and C, checked in D).
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# landing-page-design (vendored)
Upstream text: `studio/toolkit/landing-page-design/SKILL.md` (licence and pinned commit: `studio/toolkit/toolkit.json`).
It runs inside the one web workflow (`studio/web/WEB.md`), never instead of it.

**Take (it adds what our workflow lacked for landing pages):**
- **Part A → stage A of DESIGN.md:** the intake batch (one action, offer, audience, top three objections, traffic source, proof), the
  above-the-fold order (headline → subheadline → one CTA → one proof signal → hero visual), layout type A–D chosen with a reason, conversion
  rules (one primary CTA, proof beside its claim, a risk reversal, objections as a section), CTA = verb + what they get, build hero → benefits
  → how it works → proof → FAQ → final CTA, one section at a time.
- **B9 states and B10 ship list → stage D checks:** hover/active/focus/loading (skeletons)/empty/error, no dead links, current page marked,
  legal links, branded 404, form validation, favicon, title/meta/og, alt text, semantic landmarks, skip link.
- **B11 tagline reveal → a motion storyboard row (stage C):** a two-line benefit statement whose words light from ~30 % to full colour in
  reading order as it scrolls in, with an ease-out curve; for Arabic reveal by word (`web/motion` split words, `lib/typography.js`).

**Overridden by the house method and Impeccable (say so in DESIGN.md):**
- B1 fonts (Geist/Manrope/Poppins, Latin only) and "one typeface" → our §B uses 2 Arabic-capable families from `web system`.
- B5 gradient heading text and B7 glass pill nav / `backdrop-blur` overlays → banned by Impeccable and taste-skill; B4 flat backgrounds agree.
- B8 "use organic fake numbers (47.2 %)" → never invent numbers or testimonials (skill `data-honesty`, AGENTS.md honesty); placeholder
  copy is real draft copy, and anything not from the client is marked as such.
- Its Tailwind type/spacing tables are a reference scale, not a rule: §B's tokens decide. Its 800 ms blur fade-up reveal stays within our
  motion rules (transform/opacity first, ease-out, reduced-motion still state).
