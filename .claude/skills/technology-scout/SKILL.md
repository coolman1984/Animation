---
name: technology-scout
description: Research department — find new tools/techniques (GitHub, official docs, releases), judge them for this studio (LEARN / ADAPT / INTEGRATE) and record dated findings in TECH_RADAR.md without installing anything. Use when asked what is new, whether a tool is worth adding, or before adopting any new engine/library.
---
# technology-scout
Operating policy: `studio/WORKFLOW.md`; architecture: `studio/PLATFORM.md`; registry: `studio/capabilities.json`.

**Job:** keep the studio current without letting it become a pile of dependencies. Research, judge, record. Never auto-install.

## Method
1. Start from a need. Ask what kind of film or shot the tool would serve. Read `node studio.mjs caps` first, because the studio may already have it.
2. Use official sources only: project repository and releases, official docs, vendor announcements. Note the date and link. Treat marketing demos and blog claims as WATCH, not fact.
3. Answer for each candidate:
   - **NEW:** what changed, and when.
   - **RELEVANT:** which film or shot it serves.
   - **PROVEN:** a stable release, or only a demo?
   - **WHY IT MATTERS:** what we cannot do now.
   - **COST:** install size, GPU/CUDA needs, model weights, process launches (~1 s each on the owner's Windows PC).
   - **LICENSE:** code AND weights/assets. Watch for non-commercial terms and company licences.
   - **SHOULD WE TEST IT?**
4. Decide one outcome:
   - **LEARN:** take the idea, no dependency.
   - **ADAPT:** write our own small primitive, about 200 lines.
   - **INTEGRATE:** add a pinned version to a setup profile in `capabilities.json` as PLANNED.
5. Record the finding in `studio/TECH_RADAR.md` (dated row: decision, source). Keep trends out of `CRAFT.md`.

## Integrating (only when a film needs it, or on an owner request)
- Add the entry to `capabilities.json` as **PLANNED** with a check, a profile, what it serves, best/avoid use and its licence.
- Build a 3–8 s study in `studio/examples/<name>-study/`. It must render identically in two separate runs and look right. Then promote it to **EXPERIMENTAL** and add the `study` path. See `PLATFORM.md` → graduation rule.
- Browser engines go in the `gpu` profile (npm into `studio/vendor`, git-ignored) and the composer import map (`lib/composer.html`).
- External applications (Blender, Resolve) are never auto-downloaded. List the official link in the `pro` profile.

## Do not
- Do not clone whole repositories into the project, or install "just in case".
- Do not promote an engine without a study, or call a beta a release.
- Do not run slow test suites to "verify" research (CLAUDE.md testing policy).
