# heldout5

Fifth held-out set: 24 synthetic documents (`h5-01.md` to `h5-24.md`) with labels from **two** independent labellers.

- Written by one Claude session told not to read the rules, code, spec or any corpus.
- Labelled by two further Claude sessions working at the same time from the rule definitions only (the part of the spec that does not describe the code), each told not to read the other's labels: `labels.json` and `labels.b.json`. They agree on 94 of 96 judgements. `labels.consensus.json`, `labels.union.json` and `labels.adjudicated.json` are made from the two by `npm run agree -- corpus/heldout5 --write`.
- Both labellers are the same model family as the rule author: **not independent human labelling**; no person has reviewed a sample of the labels.
- Run once on the round-4 rules, before any change: `eval/results/heldout5-2026-11-12.txt` (strict, adjudicated labels, the headline chosen before the run), `-lenient.txt` and `-union.txt`. Report: `docs/EVALUATION.md`.
- This set is now seen. A rule change needs a new held-out set before any new figure is quoted.
