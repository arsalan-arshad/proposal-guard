import { describe, expect, it } from 'vitest';
import { DISCLAIMER_SHORT, scan } from '../src/index.js';

describe('output shape', () => {
  const doc = [
    'The app will be fast and seamless, etc.',
    'Payment is due on client approval of each milestone.',
    'The site is hosted on Vercel.',
    'Unlimited revisions are included.',
  ].join('\n\n');

  it('quotes each sentence exactly and keeps term offsets inside it', () => {
    const result = scan(doc);
    expect(result.findings.length).toBeGreaterThanOrEqual(4);
    for (const f of result.findings) {
      expect(doc.slice(f.start, f.end)).toBe(f.sentence);
      for (const t of f.terms) {
        expect(doc.slice(t.start, t.end)).toBe(t.text);
        expect(t.start).toBeGreaterThanOrEqual(f.start);
        expect(t.end).toBeLessThanOrEqual(f.end);
      }
    }
  });

  it('carries the short disclaimer and a status for every rule', () => {
    const result = scan(doc);
    expect(result.disclaimer).toBe(DISCLAIMER_SHORT);
    expect(Object.keys(result.status).sort()).toEqual(['HOST-02', 'REVISE-04', 'SCOPE-01', 'TIME-03']);
  });

  it('suggestions contain blanks and no invented numbers', () => {
    const result = scan(doc);
    for (const f of result.findings) {
      expect(f.suggestion).toMatch(/\[[^\]]+\]/);
      expect(f.suggestion.replace(/\[[^\]]*\]/g, '')).not.toMatch(/\d/);
    }
  });

  it('findings are ordered by position', () => {
    const starts = scan(doc).findings.map((f) => f.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

describe('per-rule status', () => {
  it('reports not applicable when no rule has a cue', () => {
    const r = scan('We will meet on Tuesday.');
    expect(Object.values(r.status)).toEqual(['not applicable', 'not applicable', 'not applicable', 'not applicable']);
  });

  it('reports passed when the cue is present and handled', () => {
    const r = scan(
      [
        'The client reviews each milestone within 5 business days; silence counts as acceptance.',
        'Hosting is on Vercel and all hosting costs are billed to the client.',
        'Two rounds of revisions are included; extra rounds are billed as change orders.',
        'The app will load in under 2 seconds and be fast.',
      ].join('\n\n'),
    );
    expect(r.findings).toEqual([]);
    expect(r.status).toEqual({
      'SCOPE-01': 'passed',
      'TIME-03': 'passed',
      'HOST-02': 'passed',
      'REVISE-04': 'passed',
    });
  });

  it('reports findings when a rule fires', () => {
    expect(scan('Unlimited revisions are included.').status['REVISE-04']).toBe('findings');
  });
});

describe('precedence', () => {
  it('REVISE-04 claims "as needed" in "as many iterations as needed", so SCOPE-01 stays silent', () => {
    const r = scan('We will provide as many iterations as needed.');
    expect(r.findings.filter((f) => f.ruleId === 'SCOPE-01')).toHaveLength(0);
    expect(r.findings.filter((f) => f.ruleId === 'REVISE-04').map((f) => f.part)).toEqual(['a', 'b']);
  });

  it('SCOPE-01 still reports other terms in a sentence REVISE-04 flagged', () => {
    const r = scan('We will deliver a seamless app with unlimited revisions.');
    expect(r.findings.map((f) => f.ruleId).sort()).toEqual(['REVISE-04', 'REVISE-04', 'SCOPE-01']);
  });
});

describe('TIME-03 window in the next sentence', () => {
  it('a window in the next sentence of the same paragraph suppresses', () => {
    const r = scan('Payment is due on client approval of the milestone. The client approves within 5 business days.');
    expect(r.findings.filter((f) => f.ruleId === 'TIME-03')).toHaveLength(0);
  });

  it('a window in a different paragraph does not suppress', () => {
    const r = scan('Payment is due on client approval of the milestone.\n\nInvoices are paid within 5 business days.');
    expect(r.findings.filter((f) => f.ruleId === 'TIME-03')).toHaveLength(1);
  });

  it('an unfilled placeholder is not a window', () => {
    const r = scan('Payment is due on client approval of the milestone within [N] business days.');
    expect(r.findings.filter((f) => f.ruleId === 'TIME-03')).toHaveLength(1);
  });

  it('is High when payment is tied to the approval and Medium otherwise', () => {
    const high = scan('Payment is due on client approval of the milestone.').findings[0];
    const medium = scan('Phase 3 starts once Phase 2 has been approved by the client.').findings[0];
    expect(high?.severity).toBe('High');
    expect(medium?.severity).toBe('Medium');
  });
});

describe('HOST-02 document level behaviour', () => {
  it('a payer statement anywhere covers its category', () => {
    const r = scan('The app is hosted on AWS.\n\nHosting costs are billed to the client.');
    expect(r.findings.filter((f) => f.ruleId === 'HOST-02')).toHaveLength(0);
  });

  it('a payer statement for one category does not cover another', () => {
    const r = scan('The app is hosted on AWS and sends SMS through Twilio.\n\nHosting costs are billed to the client.');
    expect(r.findings.filter((f) => f.ruleId === 'HOST-02').map((f) => f.category)).toEqual(['messaging']);
  });

  it('quotes the first sentence that mentions the category', () => {
    const doc = 'Intro text.\n\nWe use AWS for the API.\n\nBackups also live on AWS.';
    const f = scan(doc).findings.find((x) => x.ruleId === 'HOST-02');
    expect(f?.sentence).toBe('We use AWS for the API.');
  });
});

describe('REVISE-04 part (b)', () => {
  it('fires once, at the first numbered revision sentence, when no change-order path exists', () => {
    const r = scan('Two rounds of revisions are included.\n\nThree rounds of revisions are included for phase two.');
    const b = r.findings.filter((f) => f.ruleId === 'REVISE-04');
    expect(b).toHaveLength(1);
    expect(b[0]?.part).toBe('b');
    expect(b[0]?.sentence).toBe('Two rounds of revisions are included.');
  });

  it('is silent when a change-order phrase appears anywhere', () => {
    const r = scan('Two rounds of revisions are included.\n\nExtra work is handled as a change request.');
    expect(r.findings.filter((f) => f.ruleId === 'REVISE-04')).toHaveLength(0);
  });

  it('is silent when the document never mentions revisions', () => {
    expect(scan('We will build the site in six weeks.').status['REVISE-04']).toBe('not applicable');
  });
});

describe('limits and input checks', () => {
  it('rejects non-string input', () => {
    expect(() => scan(42 as unknown as string)).toThrow(TypeError);
  });

  it('rejects input over the size limit', () => {
    expect(() => scan('a'.repeat(101), { maxChars: 100 })).toThrow(RangeError);
  });

  it('handles empty input', () => {
    const r = scan('');
    expect(r.findings).toEqual([]);
  });

  it('stays fast on large adversarial input (no regex blow-up)', () => {
    const nasty = [
      'a '.repeat(100_000),
      'etc. '.repeat(40_000),
      ('as ' + 'as '.repeat(50)).repeat(2_000),
      '['.repeat(100_000),
      'within '.repeat(60_000),
      ('revisions ' + 'unlimited '.repeat(20)).repeat(3_000),
      'Etc. '.repeat(80_000),
      'will fast seamless robust etc. '.repeat(13_000),
      'milestone approval '.repeat(21_000),
      'AWS hosting '.repeat(33_000),
      'revisions free '.repeat(26_000),
      '- fast\n'.repeat(50_000),
      '| a | b |\n'.repeat(40_000),
      'fast-follow '.repeat(33_000),
      '`'.repeat(100_000) + 'x',
      'https://'.repeat(50_000),
    ];
    for (const input of nasty) {
      const t0 = Date.now();
      scan(input.slice(0, 400_000));
      expect(Date.now() - t0).toBeLessThan(3_000);
    }
  });
});
