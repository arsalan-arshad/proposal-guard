import { describe, expect, it } from 'vitest';
import { scan, segment } from '../src/index.js';
import type { RuleId } from '../src/index.js';

/** Regression tests for the precision round (RULES_SPEC.md, changes 61 to 68): fewer false alarms, no new word lists for recall. All text is synthetic. */
const count = (text: string, rule: RuleId): number => scan(text).findings.filter((f) => f.ruleId === rule).length;
const parts = (text: string): string[] => scan(text).findings.filter((f) => f.ruleId === 'REVISE-04').map((f) => f.part ?? '');

describe('HOST-02: titles and negations are not costs', () => {
  it.each([
    'No new hosting is needed.',
    'The Developer will use an open-source search engine and no licence fees arise.',
    'Third-party services',
    '## Hosting',
    '**Third-party services**',
    'DNS change on switch day',
  ])('does not flag: %s', (text) => {
    expect(count(text, 'HOST-02')).toBe(0);
  });

  it('still flags a real service named in a bullet or a table cell', () => {
    expect(count('- Email delivery through Mailgun', 'HOST-02')).toBe(1);
    expect(count('| Item | Detail |\n|---|---|\n| Hosting (EU region) | managed app platform |', 'HOST-02')).toBe(1);
  });
});

describe('HOST-02: payer stated in a predicate form', () => {
  it.each([
    "The audio hosting plan for the feed is Delphine's.",
    'Captions need a captioning tool subscription, which would be on your side.',
    "Hosting for the portal runs on SmoothRoute's existing cloud account.",
    "Consultant may invoice for expenses incurred on Client's behalf, including SMS credits.",
  ])('states a payer: %s', (text) => {
    expect(count(text, 'HOST-02')).toBe(0);
  });

  it('"on the Customer\'s behalf" alone does not say who pays', () => {
    expect(count("The Agency shall arrange hosting on the Customer's behalf.", 'HOST-02')).toBe(1);
  });
});

describe('TIME-03: negations, deemed acceptance and clause numbers', () => {
  it('a negated approval is not a gate', () => {
    expect(count('Payment of the retainer is not conditional on approval.', 'TIME-03')).toBe(0);
    expect(count('Payment of the retainer is conditional on approval.', 'TIME-03')).toBe(1);
  });

  it('a general deemed-acceptance default covers every approval in the document and the rule reports "passed"', () => {
    const doc = 'If the Owners do not respond within that time, the Drafter will treat the draft as approved and continue.\n\nFinal payment is released on approval of the drawings.';
    const r = scan(doc);
    expect(r.findings.filter((f) => f.ruleId === 'TIME-03')).toHaveLength(0);
    expect(r.status['TIME-03']).toBe('passed');
  });

  it('without a default the same approval is still flagged', () => {
    expect(count('Final payment is released on approval of the drawings.', 'TIME-03')).toBe(1);
  });

  it('a clause number before an amount is a list marker, a decimal quantity is not', () => {
    expect(segment('6.1 1,450 EUR: 40% on signing, 60% on delivery.').map((s) => s.text)[0]).toBe('1,450 EUR: 40% on signing, 60% on delivery.');
    expect(segment('1.5 million users are expected.').map((s) => s.text)[0]).toBe('1.5 million users are expected.');
  });
});

describe('SCOPE-01: fewer false alarms from open-ended phrases', () => {
  it.each([
    "I'll send you builds as we go and you can tell me what you think.",
    "If you want anything else on the day, an album, extra hours, just tell me and we'll work something out.",
  ])('does not flag: %s', (text) => {
    expect(count(text, 'SCOPE-01')).toBe(0);
  });

  it('"anything else" in a promise is still flagged', () => {
    expect(count('We will deliver the app and anything else you need.', 'SCOPE-01')).toBe(1);
  });
});

describe('REVISE-04: a price in term-sheet form is a change-order path', () => {
  it('"Extra round: 150 EUR flat" prices extra work', () => {
    expect(parts('Revision rounds: 2 included (rough cut, fine cut)\nExtra round: 150 EUR flat')).toEqual([]);
  });

  it('without a price part (b) still fires', () => {
    expect(parts('Revision rounds: 2 included (rough cut, fine cut)')).toEqual(['b']);
  });
});

/** Found by an adversarial review of the first version of this round: each of these was silenced by mistake and must stay flagged. */
describe('negative controls from the red-team review', () => {
  it.each([
    'Payment is not due until you approve the final design.',
    'Payment is not released until approval of the design.',
    'No payment is released without your approval of the final build.',
    'Do not release the final payment without client approval of the build.',
  ])('TIME-03 still flags a gate written with a negation: %s', (text) => {
    expect(count(text, 'TIME-03')).toBe(1);
  });

  it('a negated "treat as approved" or a conditional "deemed accepted" is not a default', () => {
    const flagged = (text: string): string[] => scan(text).findings.filter((f) => f.ruleId === 'TIME-03').map((f) => f.sentence);
    const first = 'Final payment is released after the client approves the build.';
    expect(flagged(`${first} We will not treat the draft as approved until you sign.`)).toContain(first);
    expect(flagged(`${first} Nothing shall be deemed accepted without written sign-off.`)).toContain(first);
  });

  it('a real affirmative default still covers the document', () => {
    expect(count('Final payment is released after the client approves the build. If the client does not reply within 5 days, the build is deemed accepted.', 'TIME-03')).toBe(0);
  });

  it.each([
    'We include 3 revisions. Extra rounds: 2 max.',
    'We include 3 revisions. Extra work: 3 weeks turnaround.',
    'We include 3 revisions.\nExtra changes - 5 days notice.',
  ])('a number that is not a price is not a change-order path: %s', (text) => {
    expect(parts(text)).toContain('b');
  });

  it.each([
    'Please do not forget the Mailgun subscription for this site.',
    "Hosting on AWS is Dave's idea.",
    "The site runs on AWS and the invoice will be sent on the client's behalf.",
  ])('HOST-02 still flags: %s', (text) => {
    expect(count(text, 'HOST-02')).toBeGreaterThanOrEqual(1);
  });

  it('a clause number before any three-letter currency code is a list marker', () => {
    expect(segment('1.2 100 AUD for the first stage.').map((s) => s.text)[0]).toBe('100 AUD for the first stage.');
  });

  it('the new patterns stay fast on long adversarial input', () => {
    const inputs = [
      'invoice '.repeat(40000),
      'no hosting '.repeat(40000),
      "Bob's ".repeat(80000),
      'treat the '.repeat(40000),
      'nothing '.repeat(40000),
      'is Abc'.repeat(40000),
      'expenses on the client behalf '.repeat(16000),
    ];
    for (const text of inputs) {
      const t = Date.now();
      scan(text);
      expect(Date.now() - t).toBeLessThan(5000);
    }
  });
});
