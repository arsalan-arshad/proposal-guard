import { describe, expect, it } from 'vitest';
import { scan, segment } from '../src/index.js';
import type { RuleId } from '../src/index.js';

/** Regression tests for round 4: word families tuned on the five labelled sets (RULES_SPEC.md, changes 48 to 60). All text is synthetic. */
const count = (text: string, rule: RuleId): number => scan(text).findings.filter((f) => f.ruleId === rule).length;
const parts = (text: string): string[] => scan(text).findings.filter((f) => f.ruleId === 'REVISE-04').map((f) => f.part ?? '');
const sentences = (text: string): string[] => segment(text).map((s) => s.text);

describe('segmenter', () => {
  it('a clause number before a percentage is a list marker', () => {
    expect(sentences('2.2 25% on Client approval of the design.')).toEqual(['25% on Client approval of the design.']);
  });

  it('"Key: value" lines are separate items whatever their length', () => {
    const doc = 'Build: FAQ chatbot answering from a short list of questions; handoff to a human when nothing matches\nFee: 7,500 USD; 30 / 30 / 40';
    expect(sentences(doc)).toHaveLength(2);
  });
});

describe('TIME-03 families', () => {
  it.each([
    '25% on Client approval of the design.',
    'Half up front, half when you give me the thumbs up on the final batch.',
    'Advance 50 percent, remaining after you are happy with the video.',
    'Payment is split, half now and half when you say it is done.',
    'I will send it in two batches and wait for your OK on batch one before starting batch two.',
    'Client will confirm the bot is working once the build is finished.',
    'We will make the changes needed and then you sign off.',
  ])('flags: %s', (text) => {
    expect(count(text, 'TIME-03')).toBe(1);
  });

  it.each([
    'On delivery the Client has 5 business days to test and accept in writing.',
    'If the Client sends nothing within those 5 business days, the milestone is treated as accepted.',
    'Silence after 6 business days counts as acceptance of that deliverable.',
    'Our legal team must approve this proposal before we send it.',
    'Further rounds are quoted at 45 USD per hour, and begin only after the Client approves the estimate.',
    'The bot answers from 80 approved questions.',
  ])('does not flag: %s', (text) => {
    expect(count(text, 'TIME-03')).toBe(0);
  });

  it('a revision promise is reported by REVISE-04, not also as an approval clause', () => {
    expect(count('Revisions are included until the client is happy with each flow.', 'TIME-03')).toBe(0);
  });
});

describe('REVISE-04 part (b) is independent of part (a)', () => {
  it('an unnumbered promise with no price for extra work gets both parts', () => {
    expect(parts('Unlimited revisions are included.')).toEqual(['a', 'b']);
  });

  it('a numbered promise with no price gets part (b) only', () => {
    expect(parts('The price includes 3 rounds of revisions.')).toEqual(['b']);
  });

  it.each([
    'Later changes cost 300 GBP each.',
    'After the third round, changes are charged at 60 USD per hour.',
  ])('a stated price for later changes is a change-order path: %s', (price) => {
    expect(parts(`The price includes 2 rounds of changes. ${price}`)).toEqual([]);
  });
});

describe('REVISE-04 open-ended families', () => {
  it.each([
    'I will do it again and again until final.',
    'We can go back and forth as often as you like.',
    'We can fine-tune as we go, no problem.',
    'You can leave comments and I will work through them until the pages are right for you.',
    'Flows are adjusted as many times as the client wants.',
    'We will iterate on the model until the results are satisfactory.',
  ])('flags (a): %s', (text) => {
    expect(parts(text)).toContain('a');
  });
});

describe('HOST-02 payer families', () => {
  it.each([
    'The client buys any commercial font licence it wants to use.',
    'Hosting is billed by the hosting company directly to the Bakery.',
    'The Client shall hold the Apple Developer Program account and bear its annual fees.',
    "You'd handle the hosting plan with your podcast host.",
    'You own and pay for your email sending platform.',
  ])('states a payer: %s', (text) => {
    expect(count(text, 'HOST-02')).toBe(0);
  });

  it('still flags a cost with no payer', () => {
    expect(count('The site is hosted on Vercel.', 'HOST-02')).toBe(1);
    expect(count('The chatbot calls ChatGPT for every reply.', 'HOST-02')).toBe(1);
  });

  it('a show "hosted by" a person is not hosting', () => {
    expect(count('Her evening show is hosted by Gabriel Moreau.', 'HOST-02')).toBe(0);
  });

  it('a table with a "Who pays" column states the payer on each row', () => {
    const t = '| Item | Detail | Who pays |\n|---|---|---|\n| Hosting (EU region) | managed app platform | Fastlane Freight |';
    expect(count(t, 'HOST-02')).toBe(0);
    expect(count('| Item | Detail |\n|---|---|\n| Hosting (EU region) | managed app platform |', 'HOST-02')).toBe(1);
  });

  it('a party cell with a qualifier ("Client (hosting)") states the payer', () => {
    expect(count('| Item | Owner |\n|---|---|\n| Review screen hosting | Client (hosting) |', 'HOST-02')).toBe(0);
  });
});

describe('SCOPE-01 families', () => {
  it.each([
    'The system will be secure and reliable.',
    'Reports will be easy to read.',
    'The portal will be clean, modern and easy to navigate.',
    'The bot will be accurate, helpful and engaging.',
    "I'll make it feel premium and super smooth.",
    'We will craft a comprehensive and cohesive visual identity.',
    'The site will include a blog and whatever features make sense as we go.',
    'Stock photography and typefaces are included where required.',
  ])('flags: %s', (text) => {
    expect(count(text, 'SCOPE-01')).toBe(1);
  });

  it.each([
    'Payment goes through a secure checkout provided by the bank.',
    'The client will be professional with our staff.',
    'SMS reminders would be great, I would use a texting service for that.',
    "Quick overview of what I'll do and what it costs",
    'We will fix whatever you want, as many times as it takes.',
  ])('does not flag as scope: %s', (text) => {
    expect(count(text, 'SCOPE-01')).toBe(0);
  });
});

describe('timing of the new patterns', () => {
  it('long runs of the new trigger words stay fast', () => {
    const inputs = [
      'you '.repeat(60000),
      "you'd ".repeat(40000),
      'client buys '.repeat(30000),
      'billed by the '.repeat(30000),
      'will be secure and '.repeat(20000),
      'until '.repeat(60000) + 'right for you',
      'whatever else '.repeat(30000),
    ];
    for (const text of inputs) {
      const t = Date.now();
      scan(text);
      expect(Date.now() - t).toBeLessThan(5000);
    }
  });
});
