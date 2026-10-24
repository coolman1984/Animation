# Cover study

JSON covers through `lib/covers.mjs` (Satori 0.63.2 + `@resvg/resvg-js` 2.6.2, both MPL-2.0, used unmodified as libraries).

```
node studio/studio.mjs cover examples/cover-study/youtube.json
node studio/studio.mjs cover examples/cover-study/youtube-ar.json
```

Presets: `youtube` 1280×720, `reel` 1080×1920, `square` 1080×1080, `title-card` 1920×1080.
Output goes to `studio/out/covers/` (git-ignored) unless `--out` points inside `studio/out` or `studio/takes`.

## Arabic check

Satori’s own docs describe a simplified bidi algorithm. This study rendered `youtube-ar.json` (title `بكسل بلس`, kicker `استوديو`, subtitle `فيلم يُصنع بالكود`, font IBM Plex Sans Arabic) with `--renderer=satori` and the PNG was looked at (`studio/out/covers/youtube-ar-satori.png`, 1280×720).

The letters are joined, the lines sit on the right, the gold bar is on the right edge and the mark is bottom-right. `SATORI_ARABIC` in `lib/covers.mjs` is `ok`, so Arabic cards stay on Satori. A Chromium side-by-side was not run. `--renderer=chromium` still screenshots with headless Chromium (`lib/cdp.mjs` `launch` + `screenshot`), the same browser path composer stills use in `lib/render.mjs`. `stillAt()` in `lib/finish.mjs` only extracts a JPEG from a finished video, so it is not that path.

```
node studio/studio.mjs cover examples/cover-study/youtube-ar.json --renderer=satori --out=studio/out/covers/youtube-ar-satori.png
```
