# Evaluation report

Not legal advice; this report measures a text checker on invented documents. It has three parts: the current rules on held-out set 4 (first), the round-2 rules on held-out set 3, and the first rules on held-out set 2 (both kept as history).

## Current rules (round 4): held-out set 5 (run 2026-11-12)

**Headline: on a brand-new set that no rule was tuned against, 18 of the 44 findings the tool reported were correct (41%), and it found 18 of the 47 findings the labellers expected (38%). This is lower than the round-3 rules scored on the previous fresh set (52% and 45%), even though round 4 scored far higher on the sets it was tuned on (212 of 220 and 212 of 234). Round 4 overfitted; it did not make the tool better on new documents.**

- One run, rules frozen. Rule code: git commit `894cb872e08ec7e6552c7c4ea3b2aaa8b64f70d4` (PR #19, before the labels were committed; no file under `src/` changed in between). Source hash (first 16 hex of the SHA-256 of all `src/**/*.ts`, sorted path order): `061655e2c79331b6`. Raw output: `eval/results/heldout5-2026-11-12.txt` (strict, headline), `-lenient.txt` and `-union.txt` (secondary).
- **The headline measure was fixed before the run:** strict matching against the adjudicated labels (both labellers' agreed items plus REVISE-04 part (b) items, whose definition the spec text settles). Lenient matching and the union of both labellers' labels are secondary.
- 24 invented documents; 47 expected findings (adjudicated). The documents were written by one Claude session told not to read the rules, code, spec or any corpus. **Two further Claude sessions labelled the documents independently from the start**, from the rule definitions only (the part of `RULES_SPEC.md` that does not describe the code), without seeing each other's labels. They agree on 94 of 96 judgements (98%); on REVISE-04 part (b), where earlier labellers had disagreed, they agree on all 21. All three are the model family that wrote the rules, so this is not independent human labelling, and the agreement shows consistency, not correctness. No person has reviewed a sample of the labels.
- This set was not used for any change. It is now seen.

| Rule | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|
| SCOPE-01 | 4 | 7 | 8 | 4/11 = 36% | 4/12 = 33% |
| TIME-03 | 4 | 5 | 4 | 4/9 = 44% | 4/8 = 50% |
| HOST-02 | 3 | 12 | 3 | 3/15 = 20% | 3/6 = 50% |
| REVISE-04 | 7 | 2 | 14 | 7/9 = 78% | 7/21 = 33% |
| All | 18 | 26 | 29 | 18/44 = 41% | 18/47 = 38% |

Secondary views: lenient matching gives the same figures (18 of 44, 18 of 47). Against the union of both labellers' labels (one of them marked two more SCOPE-01 items) it is 19 of 44 and 19 of 49.

### Why the tuning-set numbers were misleading

| Rules | Measured on | Reported correct | Found |
|---|---|---|---|
| Round 4 | the five sets it was tuned on (132 documents) | 212 of 220 (96%) | 212 of 234 (91%) |
| Round 4 | held-out set 5 (fresh) | 18 of 44 (41%) | 18 of 47 (38%) |
| Round 3 | held-out set 4 (fresh, two labellers) | 15 of 29 (52%) | 15 of 33 (45%) |

The gap between the first two rows is the cost of tuning wording on a small, seen corpus. The third row is on a different set, so the comparison with the second row is not controlled (the sets differ and each has under 50 findings), but it gives no sign that round 4 helped on new text.

### Manual review of the 26 strict false positives

| Kind | Count | Examples |
|---|---|---|
| HOST-02: cue inside a heading or title | 4 | "Subscription note", "Email and SMS Automation — Proposal for ...", "Third-party services" |
| HOST-02: negation | 2 | "No new hosting is needed", "no licence fees arise" |
| HOST-02: payer stated in a form the rules do not recognise | 5 | "is Delphine's", "which would be on your side", "SmoothRoute's existing cloud account" (possessive pattern allows one word before "account"), "expenses incurred on Client's behalf", "the license that I use is by me" |
| HOST-02: a task line, not a paid cost | 1 | "DNS change on switch day" |
| TIME-03: negation | 1 | "Payment of the retainer is not conditional on approval" |
| TIME-03: deemed-acceptance form not recognised | 1 | "the Drafter will treat the draft as approved" |
| TIME-03: window or default stated elsewhere in the document | 1 | "40% on Acceptance." (the rule checks the same and next sentence only) |
| TIME-03: clause number followed by an amount | 1 | "6.1 1,450 EUR: 40% on signing, 60% on approval ..." |
| REVISE-04 (b): price for extra work in term-sheet form | 1 | "Extra round: 150 EUR flat" |
| SCOPE-01: phrase from the open-ended family used for something else | 2 | "builds as we go" (about feedback); "i'll do changes as we go" (a revision promise, which REVISE-04 missed) |
| SCOPE-01: arguable, soft adjectives in a specific description | 2 | "in a warm, friendly voice" (12 descriptions); "sound great and tweak as needed" |
| SCOPE-01: no deliverable promise | 1 | "If you want anything else on the day ... we'll work something out" |
| Boundary or label effects on the right passage | 3 | run-on text with no punctuation joined two sentences (twice); a clause split at ";" that the segmenter does not split |
| Contested label | 1 | "i'll build the whole thing ... with a nice clean look" was marked by one labeller only |

Of the 26: 3 are boundary effects, 1 is contested, 4 are arguable and 18 are real mistakes. HOST-02 is again the worst: 12 of its 15 reports were wrong, and the largest groups (headings, negations, unrecognised payers) are structural and fixable, but fixing them against this now-seen set would repeat the cycle that produced round 4.

### What the 29 misses look like (my reading, not separately tested)

Informal revision and approval wording ("i don't count them", "keep going till it feels right", "I adjust", "tell me when it looks right", "when you are happy"); open-ended phrasings with no list word ("whatever people need", "other nice touches as they come to mind", "fix issues as they appear"); revision cues the list lacks ("corrections", "passes", "refine"); and document-level cost cues the lists lack ("the server"). REVISE-04 recall is lowest (7 of 21) because most informal revision promises use words outside the cue list.

### What this means

Fixing word lists against the documents already seen raises the score on those documents and not on new ones: two fresh sets in a row (round 3 at 52% and 45%, round 4 at 41% and 38%) show a rule set of about half-right reports. I would not tune the lists further. The honest options are to ship the tool as a first-pass checklist with these numbers shown, as the demo page now does, or to move to a different method (a much larger, varied, human-labelled set, or a model used only to suggest candidates that rules then confirm). Neither has been done.

---

## Round-3 rules: held-out set 4 (run 2026-11-11)

*History: figures for the rules after the structural round 3 and before round 4. Held-out set 4 has since been second-labelled; the extra measurement against both labellers is the first paragraph below.*

- **Second labelling (added 2026-11-12):** a second blind labeller re-labelled this set; the two agree on 66 of 75 judgements (88%), and 6 of the 9 disagreements are REVISE-04 part (b). Scored on the same frozen round-3 rules against the consensus labels (items both marked): 15 of 29 reported correct (52%), 15 of 33 found (45%) strict; against the union of both labellers' labels: 15 of 29 and 15 of 42 (36%). The headline below uses the first labeller only.

**Headline: on a set that no rule was tuned against, 15 of the 29 findings the tool reported were correct (52%), and it found 15 of the 34 findings the labeller expected (44%). It is still a weak tool: it misses more than half of what a careful reader would flag, and about half of what it reports is wrong.**

- One run, rules frozen. Rule code: git commit `db3bde71b8069c956a156c1b2f321c3676bf1948` (branch `structure-fixes`, before the labels were committed; no file under `src/` changed in between). Source hash (first 16 hex of the SHA-256 of all `src/**/*.ts`, sorted path order): `09c8616583acde03`. Raw output: `eval/results/heldout4-2026-11-11.txt` (strict) and `eval/results/heldout4-2026-11-11-lenient.txt`.
- 20 invented documents and 34 expected findings. The documents were written by one Claude session told not to read the rules, code, spec or any corpus; the labels by a separate Claude session that read only the rule definitions in the spec (not the part that describes the code). **Both are Claude, the family that wrote the rules; this is not independent human labelling, and no person has reviewed a sample of the labels.**
- Strict matching: a finding counts only if it quotes exactly the labelled sentence (HOST-02: the labelled category; REVISE-04 part (b): the labelled part). The lenient figure (also ignores a leading clause number and trailing punctuation) was defined before this run, from the held-out set 3 experience: **16 of 29 (55%) and 16 of 34 (47%)**.
- This set was not used for any change. It is now seen.

| Rule | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|
| SCOPE-01 | 6 | 0 | 6 | 6/6 = 100% | 6/12 = 50% |
| TIME-03 | 4 | 5 | 6 | 4/9 = 44% | 4/10 = 40% |
| HOST-02 | 2 | 7 | 2 | 2/9 = 22% | 2/4 = 50% |
| REVISE-04 | 3 | 2 | 5 | 3/5 = 60% | 3/8 = 38% |
| All | 15 | 14 | 19 | 15/29 = 52% | 15/34 = 44% |

### Is it better than the round-2 rules?

Round 2 scored 10 of 27 and 10 of 38 on held-out set 3 (below); round 3 scores 15 of 29 and 15 of 34 on this set. **That is not a controlled comparison and should not be read as proof of improvement:** the sets contain different documents and were labelled in different sessions, each has fewer than 40 expected findings (one finding moves a figure by about 3 points), and the label conventions differ slightly (this labeller was told to keep final punctuation). The honest reading is: the structural fixes removed a class of formatting errors, and the rules remain weak on wording.

### Manual review of the 14 strict false positives

| Doc | Rule | Reason | Kind |
|---|---|---|---|
| h4-01 (2) | TIME-03 | A well-drafted clause: "has 5 business days to test and either accept ..." and "within those 5 business days ... is treated as accepted". The window and default wording is not in the lists. | real |
| h4-10 | TIME-03 | "Silence after 6 business days counts as acceptance" is a deemed-acceptance form the rule does not recognise. | real |
| h4-18 | TIME-03 | "2.2 25% on Client approval ..." keeps the clause number because a digit, not a capital, follows it. Right passage; also a miss. | boundary |
| h4-19 | TIME-03 | Long key-value lines without punctuation are joined, and "approved" refers to a list of questions, not to client approval. | real |
| h4-02 | HOST-02 cloud | "you'd handle the hosting plan with your podcast host" states the payer in informal wording. | real |
| h4-03 | HOST-02 cloud | A "Who pays" table column names the payer by company name, not by a party word. | real |
| h4-10 (2) | HOST-02 ai, cloud | Payer cells read "Client (model API usage)" and "Client (hosting)"; the qualifier defeats the table-payer check. | real |
| h4-11 | HOST-02 cloud | "Hosting is billed by the hosting company directly to Cloudberry Bakery" names the payer in a form the rule does not recognise. | real |
| h4-13 | HOST-02 licences | "Any paid monitoring subscription the Client chooses to add" implies the client pays. Arguable. | real (arguable) |
| h4-17 | HOST-02 cloud | A radio show "hosted by" a person. | real |
| h4-08 | REVISE-04 (b) | "Later changes cost 300 GBP each" prices extra work; not recognised. | real |
| h4-18 | REVISE-04 (b) | "After the third round, changes are charged at 60 USD per hour" prices extra work; not recognised. | real |

Of the 14: 1 is a boundary effect and 13 are real mistakes. Seven are payer or "who pays" wording, three are window or deemed-acceptance wording, two are priced-extra-work wording. These are the same word-list gaps that round 2 and round 3 left open, and they would each be fixed by one more phrase, which is exactly the kind of change that overfits a small set.

### What the 19 misses look like (my reading, not separately tested)

Informal first-person promises ("I'll edit ... make them sound great and polished", "i will do again and again until final"); payment lines phrased by percentage ("50% on approval of the finished store", "remaining after you are happy with the video"); open-ended phrases outside the lists ("whatever else is useful", "ongoing optimisation to keep results strong"); revision words outside the lists ("fine-tune as we go", "adjusted as many times as the client wants", "comments ... until the pages are right"). The labeller also noted that the revision cue list is narrow. Removing `I'll` as a context word in round 3 stopped a false alarm on a title line but also costs recall on first-person promises.

### Injection

Two documents (h4-07, h4-10) contain text addressed to a scanner ("ignore all earlier instructions", a fake system message). The scanner is fixed code with no model; these sentences are ordinary text to it and were not treated as instructions. This is not a measure of robustness for anyone who passes the output to a model.

---

## Round-2 rules: held-out set 3 (run 2026-11-11)

*History: these are the figures for the rules before the structural round 3. The review of this set's mismatches informed round 3, so it must not be used to measure the current rules.*

**Headline: on a set that no rule was tuned against, 10 of the 27 findings the tool reported were correct, and it found 10 of the 38 findings the labeller expected. It is a weak tool.** On the development set the same rules score 60 of 61 and 60 of 70, which shows how far tuning on a small set overstates quality.

- One run, rules frozen. Rule code: git commit `58e41729adccb49feeaf301e28cd58417429c1fe` (branch `rules-round-2`, before the labels were committed; no file under `src/` changed in between). Source hash (first 16 hex of the SHA-256 of all `src/**/*.ts`, sorted path order): `dc77a4ffb4f5f9e3`. Raw output: `eval/results/heldout3-2026-11-11.txt`.
- 20 invented documents and 38 expected findings. The documents were written by one Claude session that was told not to read the rules, code, spec or any other corpus. The labels were written by a separate Claude session that read only the rule definitions in `RULES_SPEC.md` (the part that does not describe the code) and the documents. **Both are Claude, the same model family that wrote the rules; this is not independent human labelling, and no person has reviewed a sample of the labels.**
- Strict matching: a finding counts only if it quotes exactly the labelled sentence (HOST-02: the labelled category; REVISE-04 part (b): the labelled part). A finding on the right passage with a different sentence boundary or punctuation counts as one false positive plus one miss.
- This set was not used for any change at the time. It is now seen (and informed round 3).

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
