---
name: studio-clock
description: Shared fake clock for filming real apps — one offset file read by backend, browser and mock services so time can be skipped coherently. Use when a capture needs time to pass (deliveries, schedules, "2 hours later").
---
# studio-clock
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


**When:** a real-app shoot where the story spans more time than the take (film 1 plan: order → delivered).
**Not needed** for composed films from stills (film 2).

## Design
- One JSON file `takes/<film>/clock.json`: `{ "epoch": <ms real start>, "offset": <ms>, "rate": 1 }`.
- Backend: replace `Date.now()` with `clock.now()` = `epoch + offset + (real - epoch) * rate`, re-reading the file on change.
- Browser: inject before page scripts via `Page.addScriptToEvaluateOnNewDocument` a `Date` shim that reads the same
  values (sent through `Runtime.evaluate` when the offset changes).
- Mock services read the same file.
- "Skip 2 hours" = add 7 200 000 to `offset`, write file, broadcast; then label on screen "الوقت مضغوط" (time compressed).

## Rules
- Never skip during a visible action; skip between beats and show the honesty pill.
- Dates shown in the UI must come from the clock, never hard-coded.
- Log every skip in the event log (the cut uses it to place the pill).

## Checklist
1. One file. 2. Backend shim. 3. Browser shim before first script. 4. Mocks read it. 5. Skips logged.
6. Pill shown. 7. Timezone fixed (`TZ=Africa/Cairo`). 8. No real `Date.now()` left (grep). 9. Dry run passes. 10. Read-back dates match.

## Worked example
Film 1 storyboard beat 7 (courier assigned → "time compressed" pill). Not built yet — film 1 is parked.
