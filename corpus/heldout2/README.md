# heldout2

Second held-out set: 20 synthetic documents (`h2-01.md` to `h2-20.md`) and `labels.json`.

- The documents were written by one Claude session that was told not to read the rules, the code, the existing corpus or the spec.
- The labels were written by a separate Claude session that read only `RULES_SPEC.md` and the documents, never the code.
- Both sessions were the same model family as the rule author, so this is **not independent human labelling**. The project owner has not yet reviewed a sample of the labels.
- It was run once, with the rules frozen. Output: `eval/results/heldout2-2026-11-10.txt`. Report: `docs/EVALUATION.md`.
- This set is now seen. A rule change after the run needs a new held-out set before any figure is quoted.
