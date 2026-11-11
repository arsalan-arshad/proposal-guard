# Proposal Guard — a rule-based scope-creep checker for proposals and SOWs

> **Open-source (MIT)** | A small showcase project by [Arsalan Arshad](https://arsalandev.studio) | Early stage: not published to npm. Live demo: https://proposal-guard-production.up.railway.app/

[![CI](https://github.com/arsalan-arshad/proposal-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/arsalan-arshad/proposal-guard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hosted on Railway](https://img.shields.io/badge/demo-hosted%20on%20Railway-6d3fe0)](https://proposal-guard-production.up.railway.app/)

---

## 1. Overview & Vision

Freelancers often send a proposal or statement of work with wording that quietly invites extra work: "fast", "etc.", "unlimited revisions", an approval with no deadline, a cloud bill with no stated payer. **Proposal Guard reads a draft you paste in and lists the sentences that match a small set of fixed rules.** Each finding quotes your sentence, names the rule, says in one line why the wording is risky, and offers a fill-in-the-blanks clause such as `[N] business days`.

**Fixed code decides; no model is involved.** The checker is plain TypeScript with pattern rules. It makes no network calls, stores nothing and never edits your document. Suggestions contain blanks, never invented numbers. There is no risk score or percentage in its output: findings carry a fixed High or Medium label.

**It is not a new idea.** Several scope-creep checkers already exist, most of them model-based. What this project adds is a short, readable, open rule set, tests that treat pasted text as untrusted, and an evaluation report that publishes its misses. **It flags some listed patterns and misses much else.** See the evaluation below before relying on it.

> **Not legal advice.** Proposal Guard is open-source software that checks the wording of a draft proposal or statement of work against a small set of fixed rules (`SCOPE-01`, `TIME-03`, `HOST-02`, `REVISE-04`). It reports sentences that match, says which rule matched and why, and suggests a clause with blanks (such as `[N]`) for you to complete. It is English-only, keyword-based and has known false positives and misses, described in the evaluation report. It does not assess whether any clause is lawful, enforceable or complete, and it does not cover jurisdiction, liability, intellectual property, tax or payment amounts. "No findings" does not mean a document is safe. The optional model feature, if you turn it on with your own key, can only suggest wording for a sentence the rules already flagged; it never changes what the rules found. Nothing here creates a lawyer–client relationship. Have a qualified professional review any contract that matters.
>
> *Status note: the optional model feature mentioned above is not implemented. Nothing in this repository calls a model.*

---

## 2. Implemented Features

- **Four rules** (`src/rules/`): `SCOPE-01` vague promise or open-ended scope; `TIME-03` approval or sign-off with no time window; `HOST-02` paid third-party cost with no stated payer (document level, one finding per cost category); `REVISE-04` unnumbered or unlimited revisions, or no change-order path.
- **Sentence segmenter** (`src/segment.ts`): handles paragraphs, bullets, headings and table cells; ignores code, URLs, e-mail addresses and file names; keeps character offsets.
- **Library** (`src/scan.ts`): `scan(text)` returns findings, a per-rule status (`findings`, `passed` or `not applicable`) and the short disclaimer. Input is capped at 500,000 characters.
- **Command line** (`src/cli.ts`): `scan <file|->` with plain-text or `--json` output, `list-rules`, `explain <RULE-ID>`. Exit codes: 0 scanned with no findings, 1 findings present, 2 usage or input error. Accepts `.md` and `.txt` files or standard input.
- **Local MCP server** (`src/mcp.ts`): stdio, read-only, three tools (`scan_proposal`, `list_rules`, `explain_finding`). No file paths, no network, no shell. Quoted sentences come back inside a labelled result with a notice that they are untrusted data.
- **Browser demo** (`demo/`): the same scanner in a static page. It makes no network requests (a content-security policy forbids them), stores nothing and writes your text to the page with `textContent` only. `npm run build:demo` writes it to `demo-dist/`. Live at https://proposal-guard-production.up.railway.app/ (see section 7).
- **Evaluation tooling** (`eval/run.ts`, `corpus/`): synthetic labelled documents and a runner that prints per-rule true positives, false positives and misses with counts.

What it does **not** do: rewrite your document, send anything anywhere, read Word or PDF files, check legality or enforceability, or understand meaning beyond its word lists.

---

## 3. Architecture & Tech Stack

```
src/
  segment.ts        masks code/URLs/e-mails/file names; blocks and sentences with offsets
  patterns.ts       shared helpers: number test, pointer test, span utilities
  rules/            scope01.ts  time03.ts  host02.ts  revise04.ts
  rules-info.ts     fixed one-paragraph descriptions of the rules
  scan.ts           runs REVISE-04 first (SCOPE-01 stays silent on its phrases), then the rest
  cli.ts, bin.ts    command line
  mcp-tools.ts      MCP tool logic (no SDK import)
  mcp.ts            MCP server wiring (the only file that imports the MCP SDK)
  index.ts          public library entry (no runtime dependencies)
tests/              unit, rule-example, tuning, injection, CLI, MCP and abuse tests
corpus/             dev/, heldout/, heldout2/ : invented documents with labels
eval/               run.ts and saved run outputs
docs/EVALUATION.md  the published evaluation report
```

TypeScript (strict, ESM), Node 20 or newer, tests with Vitest. The scanning core has no runtime dependencies. The MCP entry point uses `@modelcontextprotocol/server` 2.4.0 (Apache-2.0) and `zod` 4.6.7 (MIT), pinned.

---

## 4. Output Shape

| Field | Meaning |
|---|---|
| `ruleId` | `SCOPE-01`, `TIME-03`, `HOST-02` or `REVISE-04` |
| `severity` | `High` or `Medium`, from a fixed table (not computed) |
| `sentence`, `start`, `end` | the quoted sentence and its offsets in your input |
| `terms` | the matched words with offsets |
| `why` | fixed explanation text |
| `suggestion` | fixed clause text with blanks such as `[N]` |
| `part` / `category` | `REVISE-04` part (a) or (b); `HOST-02` cost category |
| `status` (per rule) | `findings`, `passed` or `not applicable` |
| `disclaimer` | the short "not legal advice" notice, in every result |

---

## 5. Local Development Quickstart

Prerequisites: Node 20 or newer, npm, git. The package is private and not on npm, so you run it from a clone.

```bash
git clone https://github.com/arsalan-arshad/proposal-guard.git
cd proposal-guard
npm ci
npm run build
printf 'The app will be fast and seamless.\n\nUnlimited revisions are included.\n' | node dist/bin.js scan -
node dist/bin.js list-rules
node dist/bin.js explain TIME-03
```

To use the MCP server with a local MCP client, point it at the built file (use your own absolute path):

```json
{ "mcpServers": { "proposal-guard": { "command": "node", "args": ["/ABSOLUTE/PATH/TO/proposal-guard/dist/mcp.js"] } } }
```

I have tested the server by speaking the protocol over standard input and output; I have not tested it inside a specific MCP client application.

---

## 6. Verification & Test Suite

```bash
npm run typecheck
npm test                       # 284 tests at the time of writing
npm run build
npm run eval -- corpus/dev     # tuned against; not a result
```

The test suite includes the rule examples from the spec, segmenter tests, prompt-injection tests, CLI and MCP tests, and adversarial-input timing tests. CI (`.github/workflows/ci.yml`) runs typecheck, tests and build on Node 22 for pull requests into `main`; the code has been run locally on Node 24.

### Evaluation (read before trusting the tool)

The only result worth quoting is from a held-out set that no rule was tuned against, run once with the rules frozen. Copied from [`docs/EVALUATION.md`](docs/EVALUATION.md) (current rules, held-out set 5, 2026-11-12, strict matching, labels from two independent labellers):

| Rule | Reported findings that were correct | Expected findings that were found |
|---|---|---|
| SCOPE-01 | 4 of 11 | 4 of 12 |
| TIME-03 | 4 of 9 | 4 of 8 |
| HOST-02 | 3 of 15 | 3 of 6 |
| REVISE-04 | 7 of 9 | 7 of 21 |
| All | 18 of 44 | 18 of 47 |

**This is a weak result.** More than half of what the tool reports is wrong, and it misses most of what a careful reader would flag. HOST-02 is the worst: 12 of its 15 reports were wrong. On the five sets the rules were tuned on they score far higher (212 of 220 reported correct), which only shows how well they fit those documents: the previous fresh set scored 15 of 29 and 15 of 33 on the earlier rules, so tuning more has not helped on new text. Treat the tool as a first-pass checklist, not a verdict. Caveats: 24 invented documents; the documents and both sets of labels were written by Claude in separate sessions (the two labellers agree on 98% of judgements, which shows consistency, not correctness, and is not independent human labelling); one document moves a figure by several points; the rules are English-only word lists. No other tool was compared. The report lists every false positive with a reason.

---|---|---|
| SCOPE-01 | 6 of 6 | 6 of 12 |
| TIME-03 | 4 of 9 | 4 of 10 |
| HOST-02 | 2 of 9 | 2 of 4 |
| REVISE-04 | 3 of 5 | 3 of 8 |
| All | 15 of 29 | 15 of 34 |

**This is a weak result.** About half of what the tool reports is wrong, and it misses more than half of what a careful reader would flag. HOST-02 is the worst: 7 of its 9 reports were wrong. Earlier fresh sets gave 14 of 25 and 14 of 37 (first rules) and 10 of 27 and 10 of 38 (round 2); the sets differ, so these are not a controlled comparison and do not prove improvement. On the development set the same rules score far higher because they were tuned on it; do not read that as quality. Caveats: 20 invented documents; documents and labels were both written by Claude in separate sessions, which is not independent human labelling; one document moves a figure by several points; the rules are English-only word lists. No other tool was compared. The report lists every false positive with a reason.

---|---|---|
| SCOPE-01 | 2 of 9 | 2 of 14 |
| TIME-03 | 1 of 3 | 1 of 6 |
| HOST-02 | 3 of 10 | 3 of 5 |
| REVISE-04 | 4 of 5 | 4 of 13 |
| All | 10 of 27 | 10 of 38 |

**This is a weak result.** About 6 of the 17 reported errors are formatting effects (clause numbers, punctuation); a looser matching mode that ignores those reads 15 of 27 and 15 of 38, which is also in the report. On the development set the same rules score far higher (60 of 61 and 60 of 70) because they were tuned on it; do not read that as quality. Caveats: 20 invented documents; documents and labels were both written by Claude in separate sessions, which is not independent human labelling; one document moves a figure by several points; the rules are English-only word lists. No other tool was compared. The report lists every false positive with a reason, and the results of the earlier rules on held-out set 2 are kept there as history.

---|---|---|
| SCOPE-01 | 3 of 5 | 3 of 13 |
| TIME-03 | 2 of 4 | 2 of 6 |
| HOST-02 | 7 of 10 | 7 of 11 |
| REVISE-04 | 2 of 6 | 2 of 7 |
| All | 14 of 25 | 14 of 37 |

Caveats, in short: 20 invented documents; both documents and labels were written by Claude in separate sessions, which is not independent human labelling; one document moves a figure by several points; the rules are English-only word lists. No other tool was compared. The report lists every false positive with a reason.

---

## 7. Production Deployment

- **Demo:** https://proposal-guard-production.up.railway.app/ , hosted on Railway and deployed by the repository owner. It needs no environment variables and no database. On 2026-11-11 the served `index.html`, `app.js`, `style.css` and images were byte-identical (by SHA-256) to the output of `npm run build:demo` from `main` at commit `8165226`.
- **Not in this repository:** any Railway configuration or deploy automation. How and when the live site is updated after a change to `main` is not documented here and I have not verified it; check the hosted page against `npm run build:demo` before assuming it is current.
- **Not published:** the package is marked `"private": true` and is not on npm; there is no release workflow.

---

## 8. Open-Source Roadmap

- [x] Rules core, segmenter and tests
- [x] Synthetic labelled corpus and evaluation runner
- [x] Command-line scanner
- [x] Local read-only MCP server
- [x] Published evaluation on a held-out set (invented documents, model-labelled)
- [ ] Human review of a sample of the labels
- [ ] A fresh held-out set labelled by a person who has not seen the rules
- [ ] Better coverage of informal wording, table cells and lines without punctuation
- [x] Browser-only demo (hosted on Railway)
- [ ] Optional bring-your-own-key model that only suggests wording (not started)
- [ ] npm package (decision pending)

Contributions are welcome: see [`CONTRIBUTING.md`](CONTRIBUTING.md). Security reports: see [`SECURITY.md`](SECURITY.md). Licence: [MIT](LICENSE).
