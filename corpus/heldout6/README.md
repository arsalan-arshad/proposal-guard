# heldout6

Sixth held-out set: 30 synthetic documents (`h6-01.md` to `h6-30.md`) with labels from **two** independent labellers.

- Written by one Claude session told not to read the rules, code, spec or any corpus.
- Labelled by two further Claude sessions working at the same time from the rule definitions only (the part of the spec that does not describe the code), each told not to read the other's labels: `labels.json` and `labels.b.json`. They agree on 70 of 79 judgements. `labels.consensus.json`, `labels.union.json` and `labels.adjudicated.json` are made from the two by `npm run agree -- corpus/heldout6 --write`. Labellers were told that a semicolon does not end a sentence.
- Both labellers are the same model family as the rule author: **not independent human labelling**; no person has reviewed a sample of the labels.
- Used for a controlled comparison: the published rules and the precision-round rules were each run once on these documents with the adjudicated labels (`eval/results/heldout6-old-2026-11-12.txt`, `heldout6-new-2026-11-12.txt`). Report: `docs/EVALUATION.md`.
- This set is now seen. A rule change needs a new held-out set before any new figure is quoted.
