# Design gallery (web/gallery)

One page where the owner looks at many website directions, likes the ones that fit, and rates the studio's existing web work so we know what to improve first.

Open it: `node studio/studio.mjs gallery` (serves `studio/web`, prints the URL of `gallery/index.html`). It is also published as a private claude.ai artifact; there the ratings go to the artifact's shared database (`reviews/<item id>`), which Claude reads back. Locally, ratings stay in that browser (`localStorage`), and "ملخص التقييم" gives a text summary to paste in chat.

- `index.html` — the gallery. Written in the Artifact page format (no `<html>`/`<head>`; the host wraps it), so it carries its own charset line and sets `lang="ar" dir="rtl"`.
- `specimens/*.html` — six complete example sites, all fictional and labelled, rebuilt 2026-11-03 after the owner rejected the first set
  ("fonts, design and copy very bad") and we measured 14 professional sites (`LESSONS.md`). One text family per site, clear Modern
  Standard Arabic, the product shown big, one idea per section, one real interaction each:
  `pulse-gym` (gym, CC0 photos, booking card in the hero, timetable), `raseed-fintech` (app screen drawn in code, savings calculator),
  `luma-clinic` (date/time booking, services, FAQ), `nabaa-industrial` (SVG pump that explodes/reassembles with a ghosted interior,
  model selector), `madar-saas` (dark product dashboard in code, bento), `odda-shop` (CC0 product photos, filters, search, working cart,
  bundle builder). The twelve first-round sketches were deleted.
- `work/*.jpg` — screenshots (desktop 1280, phone 390) of existing work: the `example` site (نور), `showcase/form-field`, the motion lab and the anatomy explainer.
- `CREDITS.json` — every photo, its StockSnap page and licence (CC0).

The [Athar shelf](specimens/athar-shelf.html) is a standalone Arabic demo with original covers, keyboard navigation and a native list for mobile and reduced motion.

Adding an example: follow `LESSONS.md`, write `specimens/<id>.html`, add one entry to `EXAMPLES` in `index.html`. Photos: Openverse first (`license=cc0&source=stocksnap`, 960 px max); both Openverse and the Wikimedia API rate-limited this cloud session after a few calls, so build product UI in code and keep photos framed.
