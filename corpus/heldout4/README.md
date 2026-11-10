# heldout4

Fourth held-out set: 20 synthetic documents (`h4-01.md` to `h4-20.md`) and `labels.json`.

- Written by one Claude session told not to read the rules, code, spec or any corpus; labelled by a separate Claude session that read only the rule definitions in the spec (not the part describing the code) and the documents.
- Both are the same model family as the rule author: **not independent human labelling**; no person has reviewed a sample of the labels.
- Run once on the structural round-3 rules, before any change: `eval/results/heldout4-2026-11-11.txt` (strict) and `eval/results/heldout4-2026-11-11-lenient.txt`. Report: `docs/EVALUATION.md`.
- This set is now seen. A rule change needs a new held-out set before any new figure is quoted.
