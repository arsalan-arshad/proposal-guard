import { describe, expect, it } from 'vitest';
import { scan, segment } from '../src/index.js';
import type { RuleId } from '../src/index.js';

/** Regression tests for the structural round 3 (RULES_SPEC.md, items 41 to 47). All text is synthetic. */
const count = (text: string, rule: RuleId): number => scan(text).findings.filter((f) => f.ruleId === rule).length;
const sentences = (text: string): string[] => segment(text).map((s) => s.text);

describe('clause numbers', () => {
  it('are not part of the quoted sentence', () => {
    expect(sentences('1.1 The Consultant shall provide ongoing support.\n\n2.10 The Client approves the report.')).toEqual([
      'The Consultant shall provide ongoing support.',
      'The Client approves the report.',
    ]);
  });

  it('a decimal number at the start of a line stays text', () => {
    expect(sentences('1.5 million users are expected at launch.')).toEqual(['1.5 million users are expected at launch.']);
  });

  it('findings quote the sentence without its number', () => {
    const f = scan('1.2 The Client shall approve the report before the second payment is released.').findings;
    expect(f.map((x) => x.sentence)).toEqual(['The Client shall approve the report before the second payment is released.']);
  });
});

describe('lower-case chat style', () => {
  it('splits after a full stop when the writer starts sentences in lower case', () => {
    expect(sentences('thanks for the call. here is the plan.')).toEqual(['thanks for the call.', 'here is the plan.']);
  });

  it('does not split a capitalised sentence before a lower-case word', () => {
    expect(sentences('We offer approx. five rounds. Then we stop.')).toEqual(['We offer approx. five rounds.', 'Then we stop.']);
    expect(sentences('The price is 5 vs. the old 6. Done.')).toEqual(['The price is 5 vs. the old 6.', 'Done.']);
  });
});

describe('headings are titles, not approval clauses', () => {
  it('TIME-03 ignores a heading, but not the clause under it', () => {
    expect(count('## Milestones and acceptance', 'TIME-03')).toBe(0);
    expect(count('## Milestones and acceptance\n\nThe client approves each milestone.', 'TIME-03')).toBe(1);
  });
});

describe('REVISE-04 stated limits', () => {
  it.each([
    'Small edits after the first cut are free up to 3 in total.',
    'Revisions are included, limited to 2 per milestone.',
    'Edits are included with a maximum of 4 rounds.',
  ])('counts as numbered: %s', (text) => {
    expect(scan(text).findings.filter((f) => f.ruleId === 'REVISE-04' && f.part === 'a')).toHaveLength(0);
  });

  it('still flags unnumbered revisions', () => {
    expect(scan('Small edits after the first cut are free.').findings.filter((f) => f.ruleId === 'REVISE-04' && f.part === 'a')).toHaveLength(1);
  });
});

describe('SCOPE-01 and HOST-02 structural exclusions', () => {
  it('a change-order clause is not open-ended scope', () => {
    expect(count('Any other change shall be set out in a written change order stating the extra hours.', 'SCOPE-01')).toBe(0);
    expect(count('The team will handle any other change as needed.', 'SCOPE-01')).toBe(1);
  });

  it('a short title line with a contraction is not a promise', () => {
    expect(count("Quick overview of what I'll do and what it'll cost", 'SCOPE-01')).toBe(0);
  });

  it("a client's own or existing subscription is not a cost to the contractor", () => {
    expect(count('Kestrel runs a gear rental subscription for its own customers.', 'HOST-02')).toBe(0);
    expect(count("The form posts to the chain's existing subscription system.", 'HOST-02')).toBe(0);
    expect(count('The tool needs a paid analytics subscription.', 'HOST-02')).toBe(1);
  });
});
