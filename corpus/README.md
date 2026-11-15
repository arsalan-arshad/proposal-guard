# Corpus

Synthetic proposals and statements of work, with hand-written labels, used to evaluate the rules.
Everything here is made up. No real proposal, contract, client name, price or person is used.

| Folder | Documents | Purpose |
|---|---|---|
| `dev/` | 52 | Rules may be tuned against these. (24 at first; d25 to d29 were added for the second HOST-02 round; d30 to d45 for the second tuning round; d46 to d52 for the structural third round.) |
| `heldout/` | 20 | Not used for tuning. Run once per rule version and reported as it came out. |
| `heldout2/` | 20 | Second held-out set, run once on the rules of 2026-11-10. Now seen (its mismatches informed the second tuning round). |
| `heldout3/` | 20 | Third held-out set, run once on the round-2 rules. Now seen (its review informed the structural round 3). |
| `heldout4/` | 20 | Fourth held-out set, run once on the round-3 rules. Now seen (second-labelled afterwards and used to tune round 4). |
| `heldout5/` | 24 | Fifth held-out set, labelled by two independent labellers from the start, run once on the round-4 rules. Now seen. |
| `compare-dev/` | 16 pairs | Compare mode (client's text + proposal). The number check was tuned against these. |
| `compare-heldout/` | 20 pairs | Compare mode held-out set, run once on 2026-11-15 (source hash `2c05d396dd0131a1`). Now seen. |
| `heldout6/` | 30 | Sixth held-out set, two labellers; the published rules and the precision-round rules were compared on it once. Now seen. |

Each folder has `docs/*.md` and `labels.json`. A label is a sentence a careful reader applying the rule definition would flag (or, for `HOST-02`, a cost category with no stated payer; for `REVISE-04` part (b), the document-level change-order gap). Labels were written from the rule definition, before running the code. Some labels are deliberately outside what the rules can find (marked `known-limit` in the tags, with a note), so that recall shows real misses.

## Read these numbers with care

- The documents, the labels and the rules were all written by the same author (an AI assistant, with the project owner's review of the spec). The corpus is not independent of the rules. Numbers from it are optimistic compared with real documents.
- Small sample: 74 expected findings in `dev/`, 45 in `heldout/`. A single document changes a percentage by several points.
- The held-out run in `eval/results/heldout-2026-11-10.txt` was made once, on rule code with source hash `40104b7890d467be` (first 16 hex characters of the SHA-256 of all `src/**/*.ts` files, concatenated in sorted path order). Any later change to the rules means this set has been seen; report it as a past run and write a new held-out set. The HOST-02 rules were changed after this run (RULES_SPEC.md items 28 to 29), so its HOST-02 result is stale.
- Strict matching: a finding counts only if it quotes exactly the labelled sentence (or the labelled cost category). A finding on the right passage with a different sentence boundary is counted as one false positive plus one miss (`h04`).

## Run

```
npm run eval -- corpus/dev
npm run eval -- corpus/heldout
```

Prompt-injection strings inside some documents (for example "ignore all previous instructions") are test data. The scanner is fixed code and does not read them as instructions.

## Label files

- `labels.json`: the first labeller's labels for every folder.
- `heldout2`, `heldout3`, `heldout4` also have `labels.b.json` (an independent second labeller, blind to the first, working only from the rule definitions), and files made from the two: `labels.consensus.json` (both marked it), `labels.union.json` (either did) and `labels.adjudicated.json` (consensus plus REVISE-04 part (b) items; the spec text settles that definition, so the two readings are not both valid). Run `npm run agree -- corpus/heldout4` for agreement and every disagreement.
- Both labellers are Claude sessions, not people. Agreement across the three sets is 208 of 230 judgements (90%); the figure shows the labels are consistent, not that they are right.
- `npm run eval -- corpus/heldout4 --consensus` scores against the adjudicated labels (part (b) is left out for folders labelled before the part (b) definition was settled: `dev` and `heldout`).


## Compare corpora (`compare-dev/`, `compare-heldout/`)

Each pair is `pairs/NN/reference.md` (the client's text) and `pairs/NN/proposal.md`. All text is invented. Written by one writer agent per set and labelled by two labeller agents (`labels.a.json`, `labels.b.json`), none of which saw the code; `labels.adjudicated.json` is what both agreed on plus the calls below. No person has reviewed any of it. Run `npm run eval:compare -- corpus/compare-heldout --details` or add `--agree` for labeller agreement.

Calls made on the disagreements (from the definitions and the texts, before the tool was run on the pairs):
- dev 11, TIME-03 "deemed accepted when the Customer gives written approval": included (acceptance depends on approval, so it is not an affirmative default).
- dev 01, payment "30 days after we receive them": excluded (a duration must be introduced before the number to count).
- held-out 17, SCOPE-01 on "reviewed to our satisfaction ... until we are completely happy": included for the tool (acceptance by the client's opinion; contested, since REVISE-04 also fires on the sentence).
- held-out 06 SCOPE-01 (client reply speed), held-out 11 cloud ("the Client's existing hosting plan"), held-out 14 licences (an existing subscription, and a demand that bidders explain who pays): excluded.
A leading clause number ("A.2") is ignored when sentences are matched, because the labellers copied sentences without it.
