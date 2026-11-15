# Changelog

## 0.4.0 (prepared, not published; builds on 0.3.0, which is also not published)

Three demo tabs and optional model suggestions with your own key.

- Demo: three pages with a tab bar. **Scan** is the 0.2.0 page, byte for byte plus the tab bar (its script is identical to 0.2.0). **Compare** is the 0.3.0 page. **Suggest** is new: rules first, the exact request shown, then one request to Google's Gemini API with the user's own key, only after a tick box and a click. Scan and Compare keep a policy that forbids all connections; only Suggest allows `https://generativelanguage.googleapis.com`. `serve.json` now sets the policy per page.
- Library (`src/suggest.ts`, no network): `buildSuggestionRequest`, `numbersNotInTexts`, `geminiRequestBody`, `geminiUrl`, `parseGeminiResponse`.
- Command line: `suggest-prompt <client|-> <proposal|->` prints the request for any model; sends nothing.
- MCP server: `prepare_suggestion` and `check_suggestion_numbers` (still read-only, still no network, still never calls a model; the host's own model writes the suggestions).
- Not evaluated: model output has no accuracy figure. Only the deterministic parts are tested (request shape, number check, reply reader, one request to one address). A successful live reply was not tested (no key).
- Note: Google's terms say content sent on a free key may be used to improve its products and read by reviewers; the page says so before sending.

## 0.3.0 (prepared, not published)

Compare mode: the client's job post or contract next to your proposal. Marks are highlights on sentences, never a score.

- New `compare(reference, proposal)` (library), `proposal-guard compare <client|-> <proposal|->` (CLI, `--json`, same exit codes), MCP tool `compare_documents` (read-only), and an optional second box in the demo (empty box = the old behaviour).
- Three checks. `CMP-01`: SCOPE-01, TIME-03 and REVISE-04 on the client's text. `CMP-02`: a paid service named in the client's text with no payer in either text (HOST-02 word lists). `CMP-03`: a number that differs between the two texts for revision rounds, review time, payment time or delivery time.
- Measured once on 20 invented pairs (agents wrote and labelled them): CMP-01 16 of 19 reported correct (met the pre-declared bar, `stable`); CMP-02 6 of 11 and CMP-03 7 of 7 with only 7 reported (below the bar: `experimental`, marked as such in every output). See `docs/EVALUATION.md`.
- The four existing rules are unchanged: `npm run eval` output was byte-identical on all seven corpora before and after.
- Internals: HOST-02 analysis and the REVISE-04 change-order pattern are exported for reuse; `scanSentences` split out of `scan`. A 500,000-character cap per text and 1,000,000 together.
- Found by an adversarial review and fixed before measurement: duration read by its anchor event, warranty/interest/offer senses, phase and round numbers read as revision counts, table rows, "(N)" forms, a quadratic path.

## 0.2.0 (not yet published to npm when this file was written)

Precision release: fewer false alarms, no new word lists for recall. Measured on a fresh 30-document set against 0.1.0 on the same documents and labels: reported findings correct 18 of 38 (0.1.0: 18 of 43), found 18 of 37 (unchanged). A small cleanup, not a breakthrough; see `docs/EVALUATION.md`.

- HOST-02: headings and very short title lines are not cost cues; a negation directly on the cue is not a cost ("No new hosting is needed"); `DNS` is no longer a cue; more "who pays" forms are recognised; every finding carries a fixed caution that this is the least reliable rule.
- TIME-03: a negation that scopes over the approval is not a gate; an affirmative deemed-acceptance clause anywhere in the document covers every approval; "treat X as approved" is recognised.
- SCOPE-01: `as we go` no longer counts; `anything else` needs promise context.
- REVISE-04: a price for extra work in term-sheet form is a change-order path (a bare number is not).
- Segmenter: a clause number before an amount or a percentage is a list marker.
- README: the evaluation section had accumulated stale tables from earlier rounds; rewritten, with a test that allows one results table. Credits added.
- Found and fixed before release by an adversarial review: a negation that silenced "payment is not released until approval", a negated "treat as approved" that became a document-wide default, a bare number read as a price, and two performance regressions.

## 0.1.0

First public version: four rules, command line, local read-only MCP server, browser demo, published evaluation (weak: see the report).
