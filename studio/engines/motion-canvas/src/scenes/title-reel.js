import { Circle, Txt, makeScene2D } from '@motion-canvas/2d';
import { all, waitFor } from '@motion-canvas/core';

// 1080×1920 (see ../reel.meta). Stacked, so the title stays inside the tall frame.
// `ref` is applied only by the Motion Canvas JSX runtime, so the node is kept in a variable.
export default makeScene2D(function* (view) {
  const circle = new Circle({ size: 420, fill: '#1E6BFF', y: -320 });
  view.fill('#030818');
  view.add(circle);
  view.add(new Txt({ text: 'Motion Canvas', fill: '#F4EBD9', fontSize: 84, fontFamily: 'sans-serif', y: 160 }));
  view.add(new Txt({ text: 'optional engine', fill: '#FFD21F', fontSize: 36, fontFamily: 'sans-serif', y: 270 }));
  yield* all(circle.scale(1.12, 0.6).to(1, 0.45));
  yield* waitFor(0.4);
});
