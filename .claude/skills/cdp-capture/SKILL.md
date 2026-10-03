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
Plus `Emulation.setDeviceMetricsOverride` with the same scale. Chromium: `STUDIO_CHROMIUM`, `/opt/pw-browsers/chromium` on
Linux, installed Chrome/Edge on Windows (doctor finds it via `lib/platform.mjs`). Each launch uses a throwaway headless profile,
so the owner's own Chrome windows and profile are untouched.
**Attach mode (2026-10-03):** with `STUDIO_CDP_URL=http://127.0.0.1:<port>`, `launch()` connects to a Chrome started by an approved launcher (`--remote-debugging-port`).
- It opens an isolated browser context with `Target.createBrowserContext` and `Target.createTarget`, and turns on focus emulation.
- `close()` disposes only that context. The browser and the owner's tabs are never touched (verified).
- Launch flags cannot be applied in this mode.
- Pixels differ from private mode (42 dB), so one film = one mode; the make picture cache keys on the mode. Page URLs use forward slashes (`slash()`), never Windows `\`.

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

**settleCapture:** the first screenshot after load can be torn (lower tiles from an older raster) with heavy filter layers; `settleCapture(client)` in lib/cdp.mjs captures until two consecutive shots match. Also round fractional viewports (337.5 → 338) before CDP, and avoid will-change/rest transforms (raster history changes pixels with seek order).

Capture reliability: app-capture closes its server on browser-start failure and client-close errors. cdp launch retries a transient startup failure once; never retry a verification mismatch or invent capture completion. Use the original failure evidence if the second startup fails.

**Hang-proof and crash-proof (2026-10-03):** every CDP request has a deadline (90 s, `STUDIO_CDP_TIMEOUT`), `goto` 45 s, and a
closed socket or exited browser rejects all pending calls (`client.abort`). Every launched browser is registered in
`takes/.studio-procs.json` (lib/procs.mjs); the next launch reaps orphans of dead runs, `process.on('exit')` kills this run's. Heavy
film chapters can be `lazy: true` (built on first frame) so only the worker that reaches them pays for WebGL. Render workers are
sized by `plannedWorkers()` (memory headroom), not by cores.

**Live footage pages (2026-10-03):** decode frames with `fetch` → `createImageBitmap` (a detached `<img>.decode()` can wait forever in headless capture); a film's `render()` may return a promise and the composer awaits it. Never stack many CSS `drop-shadow` filters on a full-frame layer — software capture froze `Page.captureScreenshot` for > 90 s; draw strokes on canvas. `screenshot()` in `lib/cdp.mjs` retries a rare unanswered capture.
