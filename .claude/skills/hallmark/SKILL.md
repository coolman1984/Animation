---
name: hallmark
description: PRIMARY mandatory design skill for every app, website, page or UI from this repo (Hallmark by Nutlope, MIT, vendored). Load and follow it FIRST for any design, web page, landing page, UI, poster/visual or motion-on-web work. Anti-AI-slop floor, theme deal, layout, macrostructures, sloplint. Other design skills only supplement; where they conflict, Hallmark wins.
---
# hallmark (PRIMARY — mandatory)

**Hard rule for this studio:** every app, website, page or UI built or redesigned from this repo MUST load and follow Hallmark first. Other design skills (`ui-ux-pro-max`, `impeccable`, `landing-page-design`, `web-director`, `creative-director`, `thumbnail-poster`, `diagram-design`, …) only supplement it. Where any of them conflict with Hallmark's Floor or gates, **Hallmark wins**. Do not skip Hallmark because another skill already ran.

The full upstream skill lives in `studio/toolkit/hallmark/` (pinned commit and licence: `studio/toolkit/toolkit.json`, `LICENSE`, `UPSTREAM.md`).
Read `studio/toolkit/hallmark/SKILL.md` and follow it, with these studio adaptations:

1. **Skill directory** = `studio/toolkit/hallmark`: every `references/…`, `agents/…`, `scripts/…` path in upstream text is relative to that folder. Scripts: `node studio/toolkit/hallmark/scripts/sloplint.mjs …`, `theme.mjs`, `capture.mjs`, etc.
2. **When it runs:** any new or improved app, website, landing page, UI screen, poster/visual for the web, or motion-on-web work — before stage A/B/C/D helpers. Upstream's "never use on an existing design unless named" does **not** apply here: the owner made Hallmark mandatory for every app and site from this repo; for a redesign still read `references/redesign.md` first.
3. **Where it sits in the web workflow** (`studio/web/WEB.md` "One workflow"): Hallmark is the mandatory floor and direction for the whole loop. Stage A (taste), B (`ui-ux-pro-max`), C (build/motion), D (`impeccable`) still run, but only as supplements under Hallmark. Log Hallmark theme/genre/stamp and sloplint results in the site's `DESIGN.md`.
4. **Authority order:** client's brief and brand → Hallmark Floor + gates → DESIGN.md → owner's taste (`studio/QUALITY_PLAYBOOK.md` §0) → other design skills. Honesty: skill `data-honesty` and Hallmark Floor rule 8 (never invent metrics, testimonials, logos or case-study counts). Arabic sites keep `dir="rtl"`, Arabic-capable fonts and joined letters.
5. **Paid / network:** never call Together AI or any paid API without the owner's approval; never put secrets in the repo. If `TOGETHER_API_KEY` is unset, skip the comp/imagegen steps and continue with local theme deal + sloplint. Company name must not appear in public-facing content.
6. Before handing back a page: run `node studio/toolkit/hallmark/scripts/sloplint.mjs <output> --render` when Node is available; fix every `FAIL`; fix or waive every `REFLEX` on the record.
