# Contributing

Thanks for looking. This is a small project with a deliberately small rule set.

## Ground rules

- Open an issue before anything bigger than a typo or a one-line fix.
- A new rule or a new lexicon term needs a crisp trigger and non-trigger that a person can classify without a model, plus synthetic examples for both. Rules are specified in `RULES_SPEC.md` (in the maintainer's planning docs) and tested in `tests/`.
- Tune rules only against the development set. The held-out set is for reporting and is not edited to make a number look better.
- Tests and examples use **synthetic text only**. Never paste a real proposal, contract, client name, price, token or key into an issue, a test or a pull request.
- The core library makes no network calls and stores nothing. Changes that break this will not be merged.
- Changes that touch the scanner's input handling or output text get extra scrutiny.

## Before you open a pull request

These are the checks that exist today. CI runs the same three:

```
npm ci
npm run typecheck
npm test
npm run build
```

There is no linter configured yet, so there is no lint gate. If one is added, this file will say so.

## Setup

Node.js 20 or newer and npm. No environment variables or API keys are needed.
