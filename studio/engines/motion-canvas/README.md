# Motion Canvas (optional, isolated)

Not part of the main studio. Nothing under `studio/lib` imports these packages. A film names it with `config.engine` from `lib/engines.mjs` (`motionCanvasEngine()`). That command runs `render-manual.mjs`, which prints the steps below and exits 2. It does not write a video.

## Packages

Pinned in this folder's `package.json` and installed here only (`node_modules` and `output` are git-ignored):

| Package | Version | Licence on the installed package |
|---|---|---|
| `@motion-canvas/core` | 3.17.2 | MIT (`package.json` and `LICENSE`) |
| `@motion-canvas/2d` | 3.17.2 | MIT |
| `@motion-canvas/vite-plugin` | 3.17.2 | MIT |
| `@motion-canvas/ffmpeg` | 3.17.2 | MIT (`package.json` and `LICENSE`). The read-only clone's `packages/ffmpeg/package.json` at 7b91435 says GPLv3, and that file's version string is also 3.17.2. This folder uses the npm package, whose shipped LICENSE is MIT. |
| `@motion-canvas/ui` | 3.17.2 | MIT. Extra pin: the editor's default import is `@motion-canvas/ui`. |
| `vite` | 5.4.21 | MIT. The vite-plugin peer range is Vite 4 or 5. |

None of those packages has a `bin`. There is no headless render command to call.

Keep this exact pin. Before any upgrade, read the licence of each package. Upstream main (`motion-canvas/motion-canvas` @ 7b91435) sets `packages/ffmpeg` to GPLv3. A GPLv3 encoder is unusable for client work without a licence review. The npm 3.17.2 packages installed here are MIT. Do not replace them with a checkout of that commit.

## What actually renders

`@motion-canvas/core`'s `Renderer` runs in the editor page. `@motion-canvas/ffmpeg` is a Vite plugin: the browser sends frames over a websocket and the plugin writes `output/<project name>.mp4`. The official end-to-end test opens the editor and clicks `#render`. That is their test harness, not a public CLI.

The plugins are CommonJS. `vite.config.js` unwraps `.default` or Vite reports `motionCanvas is not a function`.

Two projects. `/` is a picker. The editor URLs are `/src/landscape` (1920×1080) and `/src/reel` (1080×1920). `ref` is applied only by Motion Canvas's JSX runtime, so the scenes keep the circle in a variable.

## Tried once (2026-10-24)

`npm install` in this folder added 78 packages. `npx vite --port 9017 --host 127.0.0.1` started. A headless Chromium (software WebGL2) opened `http://127.0.0.1:9017/src/landscape` and pressed Render.

Result: `output/landscape.mp4`, H.264, 1920×1080, 30 fps, 1.47 s. A frame at 0.8 s shows the blue circle, "Motion Canvas" and "optional engine". The reel variant was not rendered.

Manual steps (also what `config.engine` prints):

1. `cd studio/engines/motion-canvas`
2. `npm install` (once)
3. `npm run start` (Vite prints a local URL; default port 5173)
4. Open `/src/landscape` or `/src/reel`
5. Video Settings already uses Video (FFmpeg). Press Render.
6. Copy `output/landscape.mp4` or `output/reel.mp4` onto the path the film is waiting for.
