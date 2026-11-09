# Animation section / قسم الأنيميشن

> **Hallmark is mandatory and loads first (owner order, 2026-11-09):** any app, website, page or UI work from this repo MUST load skill `hallmark` (`.claude/skills/hallmark/` → `studio/toolkit/hallmark/`) and follow it before any other design skill. Other design skills only supplement it; where they conflict, Hallmark wins. Never invent metrics/testimonials/logos; no secrets in the repo; company name must not appear in public-facing content.


## English
**What it does:** Home of animated videos and shorts. The code-driven Motion Studio (`../studio/`, agent skills in `../.agents/`) turns a prompt into a directed, rendered video (HTML/CDP renderer + FFmpeg).

**Why it exists:** This is the original core of the repo and the company's main content engine.

**Code location (not moved):** The studio code stays at `studio/` in the repo root. Moving it would break the build: the CI workflow (`.github/workflows/studio-tests.yml`), the tests, the agent configs (`AGENTS.md`, `CLAUDE.md`, `.claude`, `.codex`, `.cursor`, `.gemini`) and the skills all reference `studio/` paths. This folder documents the section and may later hold per-video project folders.

**Relations:**
- Produces videos and shorts for the content factory (`../content-factory/`) to distribute.
- Takes its look from the brand identity in `../design-canva/`.
- Shares assets/ideas with `../presentations/` (motion + decks).

## العربي
**بيعمل إيه:** هنا الفيديوهات والشورتس المتحركة. «استوديو الحركة» (فولدر `studio/` ومهارات الوكلاء في `.agents/`) بيحوّل الفكرة المكتوبة لفيديو متصمّم ومتصوّر.

**ليه موجود:** ده أصل الريبو، ومحرّك المحتوى الأساسي للشركة.

**مكان الكود (ما اتنقلش):** كود الاستوديو فضل في `studio/` في الجذر. لو اتنقل الـ CI والاختبارات وملفات إعدادات الوكلاء والمهارات هتبوظ، لأنها كلها بتشاور على `studio/`. الفولدر ده للتوثيق، وممكن بعدين يشيل فولدرات لكل فيديو.

**علاقته بالباقي:**
- بيطلّع الفيديوهات اللي «مصنع المحتوى» (`../content-factory/`) بيوزّعها.
- بياخد شكله من هوية البراند في `../design-canva/`.
- بيتشارك الأفكار مع `../presentations/` (حركة وعروض).
