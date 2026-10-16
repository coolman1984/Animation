# Model bench — "can this model make our films as well?"

The same three briefs (`briefs.json`) for every model, scored by the same studio checks, so "as good as Claude" is a number
and a watched film, not an opinion. Added 2026-10-16 with the director's kit (`../ANY_MODEL.md`).

1. Give the model this repo (it reads `AGENTS.md`) or the MCP server, and one brief: "make bench film `<model>-<id>` from
   `studio/bench/briefs.json` brief `<id>`". It must use only the brief's words and facts.
2. Score it: `node studio/studio.mjs director review <model>-<id> --frames` (house score + rendered-frame checks) and
   `node studio/studio-engine/run.mjs <model>-<id> --stage=stills` (text gates). Record: house score, failing rules,
   text gate OK?, number of correction rounds, whether the final render delivered (all gates PASS).
3. Watch the delivered films side by side. Numbers rank structure and finish; taste still needs eyes — say so in the row.

| date | model / host | brief | house score | fails | text gate | rounds | delivered | watched? | notes |
|---|---|---|---|---|---|---|---|---|---|
| — | (no runs yet) | | | | | | | | |
