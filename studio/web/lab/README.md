# Motion lab

A teaching page for three jobs that come up on every film: the shape of an ease, where that ease sits on a frame ruler, and the export command this studio will actually accept.

It is original work for this repo. It does not copy the code or the design of any other site.

## What it teaches

- A cubic Bezier (the CSS keywords, plus a cubic picture of each function in `studio/lib/motion.js`) and a spring. The spring is sampled into CSS `linear()` and the last sample is rest, at 1.
- Copyable snippets for a CSS `transition`, the Web Animations API, GSAP (nearest core ease; CustomEase is a plugin), and `ease` / `prog` / `track` from `studio/lib/motion.js`.
- A frame ruler: frame, seconds, SMPTE timecode, and the eased value of the curve at that frame.
- Two export blocks, each with its own Copy. "Studio Engine film (spec.json)" is `run.mjs` plus the build that command spawns. "Hand-coded film (film.js)" is `new` plus `build`. 1:1 is not an engine format; that engine block is an ffmpeg reframe of the delivered master and says so.

## Open it

From the repo root:

```
node studio/studio.mjs lab
```

That serves `studio/web/lab` on 127.0.0.1 and prints the URL. The page has no dependencies and does not call the network.

Chrome will not load the ES modules from a `file://` URL (same limit as the studio's other module pages). Use the command above, or any static server, including offline. Firefox can open `index.html` directly.
