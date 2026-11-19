# Publishing a site — two ways, only on the owner's «انشر» (2026-11-06)

**Rule:** nothing is published, shared by a public link or put on a domain until the owner writes **«انشر»** for that site. Before that,
the site stays on the machine (`web serve`) or as a private preview. Every way below needs the owner's own account; no agent signs up,
pays, buys a domain or stores a password or token in this repo.

## 0. Ready to publish?
1. `node studio/studio.mjs web check <site>` has no red light, and the owner approved the strips (`takes/web/<site>/REVIEW.md`).
2. `node studio/studio.mjs web build <site>` prints no `not portable` note: `web/sites/<site>/dist/` is **one folder** with relative paths
   (index.html, assets/site.css, assets/motion.js, assets/fonts, photos/). That folder is what gets dropped on a host.
3. Contacts, prices and photos are the client's real ones (no placeholder-contact warning; every photo in `photos/CREDITS.json`).

## A. Quick private preview → shared link (a Claude artifact)
For showing a client a draft, not for a real business address.
- In a Claude session with the artifact tools: publish `dist/` as an artifact (all files: index.html, assets, fonts, photos). It is **private**
  to the owner when created. Report the link.
- To let someone else open it, the **owner** changes sharing in Claude (Share → "anyone with the link"). Agents cannot change who can see it,
  and do not ask the owner to make it public unless the owner asked for that.
- It lives on Claude's domain; it is a preview, not the client's website.

## B. The real site: Netlify + the client's domain
- The owner (or the client) opens **app.netlify.com**, drags the `dist/` folder onto the deploy area, and claims the site with a free
  account; Netlify gives a `*.netlify.app` address.
- Own domain: in Netlify, the site's **Domain management → Add a domain**. The domain is bought by the owner/client (Netlify or any
  registrar, e.g. GoDaddy); DNS records follow Netlify's screen. A domain costs money: never buy one for the owner.
- Other static hosts work the same way with the same folder (GitHub Pages, Cloudflare Pages).
- After publishing: write the live URL in the site's DESIGN.md "Delivery" line; never claim a site is live without the URL.

## What the report says
Conclusion first, in Egyptian Arabic: "الموقع جاهز للنشر — مستني كلمة «انشر»" or "اتنشر على ‹URL›". Plus what was not checked
(real phones, the client's domain DNS).
