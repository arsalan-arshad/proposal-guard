# Evaluation report

Not legal advice; this report measures a text checker on invented documents. It has two parts: the current rules on held-out set 3 (first), and the earlier rules on held-out set 2 (below, kept as history).

## Current rules: held-out set 3 (run 2026-11-11)

**Headline: on a set that no rule was tuned against, 10 of the 27 findings the tool reported were correct, and it found 10 of the 38 findings the labeller expected. It is a weak tool.** On the development set the same rules score 60 of 61 and 60 of 70, which shows how far tuning on a small set overstates quality.

- One run, rules frozen. Rule code: git commit `58e41729adccb49feeaf301e28cd58417429c1fe` (branch `rules-round-2`, before the labels were committed; no file under `src/` changed in between). Source hash (first 16 hex of the SHA-256 of all `src/**/*.ts`, sorted path order): `dc77a4ffb4f5f9e3`. Raw output: `eval/results/heldout3-2026-11-11.txt`.
- 20 invented documents and 38 expected findings. The documents were written by one Claude session that was told not to read the rules, code, spec or any other corpus. The labels were written by a separate Claude session that read only the rule definitions in `RULES_SPEC.md` (the part that does not describe the code) and the documents. **Both are Claude, the same model family that wrote the rules; this is not independent human labelling, and no person has reviewed a sample of the labels.**
- Strict matching: a finding counts only if it quotes exactly the labelled sentence (HOST-02: the labelled category; REVISE-04 part (b): the labelled part). A finding on the right passage with a different sentence boundary or punctuation counts as one false positive plus one miss.
- This set was not used for any change. It is now seen: further rule changes need a new held-out set before any new figure is quoted.

### Strict results

| Rule | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|
| SCOPE-01 | 2 | 7 | 12 | 2/9 = 22% | 2/14 = 14% |
| TIME-03 | 1 | 2 | 5 | 1/3 = 33% | 1/6 = 17% |
| HOST-02 | 3 | 7 | 2 | 3/10 = 30% | 3/5 = 60% |
| REVISE-04 | 4 | 1 | 9 | 4/5 = 80% | 4/13 = 31% |
| All | 10 | 17 | 28 | 10/27 = 37% | 10/38 = 26% |

### Secondary figure (defined after the strict results were seen)

`npm run eval -- corpus/heldout3 --lenient` also ignores a leading clause number ("1.1 ") and trailing sentence punctuation. I added this option after seeing the strict mismatch list, because several mismatches were formatting only. Treat it as an upper-bound reading, not the headline: **15 of 27 reported correct (56%), 15 of 38 found (39%)**. SCOPE-01 6/9 and 6/14, TIME-03 2/3 and 2/6, HOST-02 3/10 and 3/5, REVISE-04 4/5 and 4/13. Output: `eval/results/heldout3-2026-11-11-lenient.txt`.

### Manual review of the 17 strict false positives

| Doc | Rule | Reason | Kind |
|---|---|---|---|
| h3-02 | SCOPE-01 | Informal lower-case sentences after a full stop are not split, so the quote starts with the previous sentence. Also a miss. | boundary |
| h3-04 (4 findings) | SCOPE-01 x3, TIME-03 | Numbered clauses ("1.1 The Consultant ...") keep their number in the quote. Right passages. Also misses. | boundary |
| h3-18 | SCOPE-01 | The label omits the final full stop. Right passage. Also a miss. | label format |
| h3-03 | HOST-02 licences | "client buys any commercial font licence it wants" states the payer; "buys" is not recognised. | real |
| h3-05 | REVISE-04 (a) | "free up to 3 in total": the number is too far from the cue word. | real |
| h3-08 | HOST-02 licences | "the chain's existing subscription system" is not a cost to the contractor. | real |
| h3-11 | SCOPE-01 | "Quick overview of what I'll do" (a short title line) read as a promise. | real |
| h3-11 | HOST-02 licences | "billed by the providers to Pelham & Rudd" names a payer; the wording is not recognised. | real |
| h3-13 | TIME-03 | A heading ("Milestones and acceptance") was treated as an approval clause. | real |
| h3-13 | HOST-02 store | "shall hold the ... accounts and bear their annual fees" names a payer; "bear their" is not recognised. | real |
| h3-13 | SCOPE-01 | A change-order clause ("Any other change shall be set out in a written change order ...") was flagged for "any other". | real |
| h3-17 | HOST-02 licences | A subscription the client sells to its own customers ("runs a ... rental subscription"); only "buy/sell/offer" wording is excluded. | real |
| h3-18 | HOST-02 cloud | "The hosting upgrade your host wants you to buy, that's between you and them" is informal payer wording. | real (arguable) |
| h3-20 | HOST-02 cloud | "hosted by Farah Dhillon" is a person who hosts a podcast, not hosting. | real |

Of the 17: 6 are formatting or boundary effects on the right passage, and 11 are real mistakes by the rules.

### What the 28 misses look like (my reading, not separately tested)

- **Informal first-person wording** ("I'll write copy that's compelling", "tell me when you're happy and we'll call it done", "go back and forth as often as you like").
- **Open phrases and quality words outside the lists** ("comprehensive and cohesive", "clean, modern look", "accurate, helpful and engaging", "might need going forward").
- **Approvals without the expected nouns** ("Client will confirm the bot is working", "when you say it's done").
- **REVISE-04 part (b):** 6 of the 9 REVISE-04 misses are part (b) labels. The labeller wrote part (b) for documents that promise unnumbered revisions and name no price for extra work; the code only raises part (b) when revisions are numbered. The spec is ambiguous here and the two readings disagree. This is a definition problem as much as a rule problem.
- A missed cloud or API cost category in a few documents (wording not in the lists).

### What this says about the earlier tuning round

The second tuning round (dev set only, 16 new dev documents) raised the dev scores to 60 of 61 and 60 of 70, but the fresh set shows 10 of 27 and 10 of 38. The tuning mostly fitted the wording of the documents it was tuned on, and two of its changes (HOST-02 cue words and the list-line splitting) also produced false positives on new text. The honest summary is that word lists written by one author do not generalise to other authors' phrasing. Improving this needs either a much larger and more varied set of examples or a different method; adding more patterns against a small set will keep overfitting.

## Known limits

English only; fixed word lists; findings depend on sentence boundaries (clause numbers, informal lower-case text and short unpunctuated lines are weak spots); misses informal and unusual wording; false positives from payer wording the lists lack, from product subscriptions and names, and from headings; document-level checks (HOST-02, REVISE-04 part (b)) cannot read meaning across sections. "No findings" never means a document is safe. No comparison with any other tool and no model baseline was run.

## What would make this stronger

A human labeller who has not seen the rules; a larger and more varied set; a sample of real (consented, redacted) documents; a new held-out set after any rule change. None of these has been done.

---

# Earlier rules: held-out set 2 (run 2026-11-10)

Date: 2026-11-10 (Asia/Karachi). Not legal advice; this report measures a text checker on invented documents.

## Read this first

- **Status after publication:** the rules were changed in a second tuning round after this run (`RULES_SPEC.md` items 32 to 40 in the project's private notes; summarised in the repository history). The figures below describe the rules at commit `1c40efb` only. This set is now contaminated for the new rules, because its mismatch list informed the changes; do not use it again to measure them.

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
