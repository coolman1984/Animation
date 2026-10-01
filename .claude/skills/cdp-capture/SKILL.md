---
name: cdp-capture
description: Drive headless Chromium over the DevTools Protocol with zero packages — launch flags, device-scale gate, screenshots/screencast, one browser per device. Use for rendering composer pages or filming a real app.
---
# cdp-capture
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


**When:** rendering frames (`lib/render.mjs`), image lab jobs (`lib/imagelab.mjs`), or filming a real product UI.
**Code:** `studio/lib/cdp.mjs` (`launch`, `connect`, `client.eval`, `client.png`, `imageWidth`), `studio/lib/serve.mjs`.

## Launch flags that matter
`--headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-color-profile=srgb --font-render-hinting=none`
`--force-device-scale-factor=N --window-size=W,H --disable-background-timer-throttling --disable-renderer-backgrounding`
Plus `Emulation.setDeviceMetricsOverride` with the same scale. Chromium: `/opt/pw-browsers/chromium` (doctor finds it).

## Device-scale gate (mandatory)
Read the first frame's width from the PNG/JPEG header (`imageWidth`) and **refuse to continue** unless
`width === cssWidth × scale`. Doctor proves it at start (css 500 → png 1000 at 2×).

## Rules
- One Chromium per device / per render worker — background tabs get no frames.
- ES-module pages can't load from `file://` → serve the studio folder with `lib/serve.mjs`.
- Canvas reads of `file://` images taint → pass images as data URLs (imagelab does).
- Wait for `document.fonts.ready` **and** every `img.decode()` before frame 0 (composer's `window.ready`).
- `Page.captureScreenshot {format:'png', optimizeForSpeed:true}` ≈ 5 fps/worker at 1080×1350 with 4 workers on 4 cores.
- Time-based hands when filming a live app: a slow page drops steps, never slows the hand.

## Pitfalls seen
- Screencast silently returned CSS-size frames at "1.5×" → soft film. Gate on width.
- 2×/3× scale doubled render time → pick the smallest scale the max zoom needs.

## Checklist
1. Doctor OK. 2. One browser per device. 3. Scale flag + metrics override. 4. Width gate. 5. Fonts ready.
6. Images decoded. 7. Exceptions listened (`Runtime.exceptionThrown`). 8. Server for modules. 9. Kill Chromium in `finally`. 10. Temp profile removed.

## Worked example
`node studio/lib/render.mjs stills studio/film2/film.js --times=0,3,7 --out=studio/takes/film2/p` → PNGs + `sheet.png` + `boxes.json`.
