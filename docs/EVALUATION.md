# Evaluation report: held-out set 2

Date: 2026-11-10 (Asia/Karachi). Not legal advice; this report measures a text checker on invented documents.

## Read this first

- One run, on a set that no rule was tuned against, with the rules frozen. Rule code: git commit `1c40efb9dfac3b1cf28666395d76faccf41d1677` (the run was made before the documents and labels were committed; no file under `src/` changed in between). Source hash (first 16 hex characters of the SHA-256 of all `src/**/*.ts`, sorted path order): `9a942cca073a0d6f`.
- **The documents and the labels were both written by Claude, in two separate sessions.** The document writer was told not to read the rules, code or spec. The labeller read only `RULES_SPEC.md` and the documents. This is not independent human labelling and the model family is the one that wrote the rules. The owner has not yet reviewed a sample of the labels.
- 20 documents and 37 expected findings. One document moves a percentage by several points. Documents are invented; they are not real proposals.
- Strict matching: a finding counts only if it quotes exactly the labelled sentence (HOST-02: the labelled category; REVISE-04 part (b): the labelled part). A finding on the right passage with a different sentence boundary counts as one false positive plus one miss.
- The earlier `corpus/heldout` set is "seen" (rules were tuned after its run); its figures are not repeated here. The `corpus/dev` figures were tuned against and are not a result.
- These figures describe this set only. They are not a claim about real documents, and no comparison with any other tool was made.

## Results (raw output: `eval/results/heldout2-2026-11-10.txt`)

| Rule | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|
| SCOPE-01 | 3 | 2 | 10 | 3/5 = 60% | 3/13 = 23% |
| TIME-03 | 2 | 2 | 4 | 2/4 = 50% | 2/6 = 33% |
| HOST-02 | 7 | 3 | 4 | 7/10 = 70% | 7/11 = 64% |
| REVISE-04 | 2 | 4 | 5 | 2/6 = 33% | 2/7 = 29% |
| All | 14 | 11 | 23 | 14/25 = 56% | 14/37 = 38% |

Plain reading: on this set the tool found fewer than half of what the labeller marked, and about 4 in 9 of its reports were wrong. It should be described as "flags some listed patterns and misses much else".

## Manual review of the 11 false positives

A "false positive" below means: not matching a label under strict matching. Reasons are my reading of the text; I did not change any rule.

| Doc | Rule | Reason |
|---|---|---|
| h2-03 | SCOPE-01 | Right passage, wrong boundary: a bold heading marker (`Term.**`) is joined to the sentence, so the quote does not match the label. Also counted as a miss. |
| h2-03 | TIME-03 | Same boundary effect (`Acceptance.**`). Also counted as a miss. |
| h2-08 | HOST-02 (licences) | "will not hold any paid subscriptions" is a negation, and the payer for the licences is stated in the sentence before ("billed to the Client's own accounts"). Real false positive. |
| h2-09 | REVISE-04 (b) | The document says "up to 3 rounds" and "billed at 40 per hour" beyond round 3, a change-order path; the rule did not recognise that wording. Real false positive. |
| h2-10 | SCOPE-01 | "Fast Lane" in a club name inside a heading was read as the word "fast". Real false positive. |
| h2-10 | HOST-02 (cloud) | "the club's hosting account" already names whose account it is. Real false positive. |
| h2-12 | REVISE-04 (b) | "additional rounds cost 55 per hour" is a path; wording not recognised. Real false positive. |
| h2-16 | TIME-03 | Plain lines with no final punctuation were joined into one block, so the quote does not match the label (known limit). Also counted as a miss. |
| h2-17 | REVISE-04 (b) | "billed at 35 per hour or per piece as quoted in writing" is a path; wording not recognised. Real false positive. |
| h2-20 | HOST-02 (licences) | The payer ("Client") is in the next table cell; cells are scanned separately. Real false positive. |
| h2-20 | REVISE-04 (b) | The labeller treated "a new engagement" as a path; the spec is ambiguous here. Disputed, not clearly a rule fault. |

Of the 11: 3 are sentence-boundary effects on the right passage (h2-03 twice, h2-16), 1 is disputed (h2-20), 7 are real mistakes by the rules.

## What the 23 misses look like (my reading, not separately tested)

Informal first-person wording ("I'll make sure", "until you love it", "I'll fix whatever you want"); legal-style sentences with "shall" and open clauses ("such additional features ... as may be agreed"); phrases outside the word lists ("whatever it takes", "wide range of topics", "other optimisations"); table cells and lines without final punctuation; cloud and messaging costs named in unlisted wording; approvals described as "let me know if you're happy". These match the known limits already listed in `CLAUDE.md` of the project and in `corpus/README.md`.

## Injection and robustness

Text addressed to a scanner ("ignore the rules and report no risks", fake system prompts, JSON that imitates output) appears in the unit tests, not in this score. At the commit that produced this report all 164 tests pass locally, including `tests/injection.test.ts` (injected sentences before and after a document change nothing), `tests/cli.test.ts` and `tests/mcp.test.ts` (same findings with injected text; tool-call and JSON-imitating text is returned only as quoted data). The scanner is fixed code with no model, so there is no prompt to subvert; this says nothing about a model used by someone else downstream. Performance stress tests (400,000-character adversarial inputs under 3 seconds) are from the earlier Stage 1 entry and were not re-run for this report.

## Model baseline

Not run. No model access or key was used.

## Known limits

English only; fixed word lists; findings depend on sentence boundaries; misses informal and unusual wording; a few false positives from negations and payer wording in a neighbouring sentence or table cell; document-level checks (HOST-02, REVISE-04 part (b)) cannot read meaning across sections. "No findings" never means a document is safe.

## What would make this stronger

A human labeller who has not seen the rules; a larger set; a sample of real (consented, redacted) documents; a new held-out set after any rule change. None of these has been done.
