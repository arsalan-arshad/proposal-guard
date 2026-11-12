# Changelog

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
