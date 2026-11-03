# Design gallery (web/gallery)

One page where the owner looks at many website directions, likes the ones that fit, and rates the studio's existing web work so we know what to improve first.

Open it: `node studio/studio.mjs gallery` (serves `studio/web`, prints the URL of `gallery/index.html`). It is also published as a private claude.ai artifact; there the ratings go to the artifact's shared database (`reviews/<item id>`), which Claude reads back. Locally, ratings stay in that browser (`localStorage`), and "ملخص التقييم" gives a text summary to paste in chat.

- `index.html` — the gallery. Written in the Artifact page format (no `<html>`/`<head>`; the host wraps it), so it carries its own charset line and sets `lang="ar" dir="rtl"`.
- `specimens/*.html` — one self-contained example site per direction, all fictional and labelled as such.
  - `pulse-gym.html` is the first **flagship** (owner's 2026-11-03 bar: "above the Behance level"): real CC0 photos, expanding program panels, a sticky 30-day story whose photo follows the step, a working timetable, plans, reduced-motion = still page.
  - The other 12 are quick sketches of distinct directions (editorial clinic, dark AI, clay café, Swiss architecture, luxury perfume, playful kids, bento fintech, brutalist festival, industrial blueprint with an exploded pump, Egyptian street-food menu, shop with a working cart, conference timetable). They get upgraded to the flagship level one by one, in the order the owner likes them.
- `work/*.jpg` — screenshots (desktop 1280, phone 390) of existing work: the `example` site (نور), `showcase/form-field`, the motion lab and the anatomy explainer.
- `CREDITS.json` — every photo, its StockSnap page and licence (CC0).

Adding a direction: write `specimens/<id>.html`, add one entry to `DESIGNS` in `index.html` (`tier:'flag'` for the full level). Photos: Openverse first, `license=cc0&source=stocksnap` gave usable 960 px photos; frame them (don't stretch 960 px full-bleed on desktop).
