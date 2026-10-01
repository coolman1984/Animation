---
name: screen-actor
description: Write on-screen actor skills (login, create, approve…) that drive a real app and prove their result from the system of record, with look() hints for the camera. Use when filming a product UI.
---
# screen-actor

**When:** capturing a real app (film 1 type). Each action = one function in `studio/skills/<action>.mjs`.

## Shape of an actor skill
```js
export async function placeOrder(stage, { items }) {
  for (const name of items) await stage.click({ text: name });   // by visible text/label, never by index
  await stage.click({ role: 'button', text: 'اطلب' });
  stage.look('[data-testid=order-card]');                         // camera framing + dwell hint
  const id = await stage.readText('[data-testid=order-id]');
  const api = await fetch(`${API}/orders/${id}`).then((r) => r.json());
  if (api.total !== await stage.readNumber('[data-testid=total]')) throw new Error('total mismatch');
  return { id, total: api.total };                                // the proof
}
```
## Rules
- Selectors by visible text, label or test id — never nth-child/index.
- Hide the page cursor; log cursor path + clicks with timestamps; the composer redraws a crisp cursor.
- Typing and moves are time-based (chars/s, px/s), not step-based.
- Every skill returns a proof read from the API/DB; a take that cannot prove its result fails.
- Fake camera/files/permissions only when the story needs them, labelled on screen.

## Checklist
1. Visible-text selectors. 2. Cursor hidden + logged. 3. Time-based hands. 4. look() at each result.
5. Proof from API. 6. Mismatch throws. 7. Dialogs handled. 8. Timeouts with clear errors. 9. Event log written. 10. Dry run screenshots of every beat.

## Worked example
Film 1 proof list (`studio/BRIEF.md` §4): order id, totals (API = phone DOM = dashboard DOM), status history.
