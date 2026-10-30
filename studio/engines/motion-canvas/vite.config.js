import { defineConfig } from 'vite';
import motionCanvasMod from '@motion-canvas/vite-plugin';
import ffmpegMod from '@motion-canvas/ffmpeg';

// Both packages are CJS (exports.default). Vite's config loader does not unwrap that.
const motionCanvas = motionCanvasMod.default || motionCanvasMod;
const ffmpeg = ffmpegMod.default || ffmpegMod;

export default defineConfig({
  plugins: [
    motionCanvas({
      project: ['./src/landscape.js', './src/reel.js'],
    }),
    ffmpeg(),
  ],
});
