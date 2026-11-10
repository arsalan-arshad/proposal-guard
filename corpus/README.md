# Corpus

Synthetic proposals and statements of work, with hand-written labels, used to evaluate the rules.
Everything here is made up. No real proposal, contract, client name, price or person is used.

| Folder | Documents | Purpose |
|---|---|---|
| `dev/` | 45 | Rules may be tuned against these. (24 at first; d25 to d29 were added for the second HOST-02 round; d30 to d45 for the second tuning round.) |
| `heldout/` | 20 | Not used for tuning. Run once per rule version and reported as it came out. |
| `heldout2/` | 20 | Second held-out set, run once on the rules of 2026-11-10. Now seen (its mismatches informed the second tuning round). |
| `heldout3/` | 20 | Third held-out set, run once on the current rules. Now seen. |

Each folder has `docs/*.md` and `labels.json`. A label is a sentence a careful reader applying the rule definition would flag (or, for `HOST-02`, a cost category with no stated payer; for `REVISE-04` part (b), the document-level change-order gap). Labels were written from the rule definition, before running the code. Some labels are deliberately outside what the rules can find (marked `known-limit` in the tags, with a note), so that recall shows real misses.

## Read these numbers with care

- The documents, the labels and the rules were all written by the same author (an AI assistant, with the project owner's review of the spec). The corpus is not independent of the rules. Numbers from it are optimistic compared with real documents.
- Small sample: 70 expected findings in `dev/`, 45 in `heldout/`. A single document changes a percentage by several points.
- The held-out run in `eval/results/heldout-2026-11-10.txt` was made once, on rule code with source hash `40104b7890d467be` (first 16 hex characters of the SHA-256 of all `src/**/*.ts` files, concatenated in sorted path order). Any later change to the rules means this set has been seen; report it as a past run and write a new held-out set. The HOST-02 rules were changed after this run (RULES_SPEC.md items 28 to 29), so its HOST-02 result is stale.
- Strict matching: a finding counts only if it quotes exactly the labelled sentence (or the labelled cost category). A finding on the right passage with a different sentence boundary is counted as one false positive plus one miss (`h04`).

## Run

```
npm run eval -- corpus/dev
npm run eval -- corpus/heldout
```

Prompt-injection strings inside some documents (for example "ignore all previous instructions") are test data. The scanner is fixed code and does not read them as instructions.
