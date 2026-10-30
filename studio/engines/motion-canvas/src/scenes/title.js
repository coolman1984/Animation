import { Circle, Txt, makeScene2D } from '@motion-canvas/2d';
import { all, waitFor } from '@motion-canvas/core';

// 1920×1080 (see ../landscape.meta). Coordinates are centred; the circle sits left, the title right.
// `ref` is applied only by the Motion Canvas JSX runtime, so the node is kept in a variable.
export default makeScene2D(function* (view) {
  const circle = new Circle({ size: 340, fill: '#1E6BFF', x: -380 });
  view.fill('#030818');
  view.add(circle);
  view.add(new Txt({ text: 'Motion Canvas', fill: '#F4EBD9', fontSize: 92, fontFamily: 'sans-serif', x: 200, y: -24 }));
  view.add(new Txt({ text: 'optional engine', fill: '#FFD21F', fontSize: 36, fontFamily: 'sans-serif', x: 200, y: 72 }));
  yield* all(circle.scale(1.12, 0.6).to(1, 0.45));
  yield* waitFor(0.4);
});
