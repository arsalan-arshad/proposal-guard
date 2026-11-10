# heldout3

Third held-out set: 20 synthetic documents (`h3-01.md` to `h3-20.md`) and `labels.json`.

- Written by one Claude session told not to read the rules, code, spec or any other corpus.
- Labelled by a separate Claude session that read only the rule definitions in the spec (not the part that describes the code) and the documents.
- Both are the same model family as the rule author: **not independent human labelling**; no person has reviewed a sample of the labels.
- Run once, rules frozen, before any change: `eval/results/heldout3-2026-11-11.txt` (strict) and `eval/results/heldout3-2026-11-11-lenient.txt` (secondary figure, defined after the strict results were seen). Report: `docs/EVALUATION.md`.
- This set is now seen. A rule change needs a new held-out set before any new figure is quoted.
