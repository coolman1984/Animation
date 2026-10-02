// Step 1 of a real-app film: capture REAL PRODUCT STATE from the running app (here the test fixture
// cart). Re-run whenever the app changes: node examples/app-film-study/capture.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureApp } from '../../lib/app-capture.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const state = await captureApp({
  serveDir: join(HERE, '..', '..', 'test', 'fixture', 'app'), outDir: join(HERE, 'capture'), viewport: { w: 390, h: 560, scale: 2 }, label: 'cart fixture',
  steps: [
    { goto: 'index.html' },
    { shot: 'empty', boxes: { total: '[data-testid=total]', matcha: '[data-testid=add-matcha]' } },
    { click: '[data-testid=add-matcha]' }, { click: '[data-testid=add-boba]' },
    { read: 'total', selector: '[data-testid=total]', as: 'number' }, { expect: 'total', equals: 100.5 },
    { shot: 'filled', boxes: { total: '[data-testid=total]', order: '[data-testid=order]' } },
    { click: { text: 'اطلب' } }, { waitText: { selector: '[data-testid=status]', includes: 'تم الطلب' } },
    { verify: 'sourceTotal', js: 'window.__order.total' }, { expect: 'sourceTotal', equalsRead: 'total' },
    { read: 'status', selector: '[data-testid=status]' },
    { shot: 'ordered', boxes: { status: '[data-testid=status]', total: '[data-testid=total]' } },
  ],
});
console.log(JSON.stringify(state.values));
