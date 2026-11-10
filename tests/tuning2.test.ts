import { describe, expect, it } from 'vitest';
import { scan, segment } from '../src/index.js';
import type { RuleId } from '../src/index.js';

/** Regression tests for the second tuning round on the development corpus (RULES_SPEC.md, items 32 to 40). All text is synthetic. */
const count = (text: string, rule: RuleId): number => scan(text).findings.filter((f) => f.ruleId === rule).length;
const sentences = (text: string): string[] => segment(text).map((s) => s.text);

describe('segmentation', () => {
  it('ends a sentence after a closing markdown marker ("**Term.** This ...")', () => {
    expect(sentences('**Term.** This Agreement starts on 4 March.')).toEqual(['**Term.**', 'This Agreement starts on 4 March.']);
  });

  it('treats short unpunctuated lines that start with a capital as separate lines', () => {
    expect(sentences('Project: Sales dashboard\nClient sends the exports by Monday\nPrice 1,800')).toEqual([
      'Project: Sales dashboard',
      'Client sends the exports by Monday',
      'Price 1,800',
    ]);
  });

  it('keeps a hard-wrapped paragraph together', () => {
    const wrapped = 'We will build the booking app for the club and its members and\nmake sure it is documented. A second sentence follows here.';
    expect(sentences(wrapped)).toEqual([
      'We will build the booking app for the club and its members and\nmake sure it is documented.',
      'A second sentence follows here.',
    ]);
    const wrapped2 = 'The Consultant shall provide the services described below\nWith the care of a professional and shall report weekly.';
    expect(sentences(wrapped2)).toHaveLength(1);
  });

  it('gives table cells of one row the same row index', () => {
    const rows = segment('| Item | Paid by |\n|---|---|\n| SaaS tool | Client |').map((s) => [s.text, s.row]);
    expect(rows).toEqual([['Item', 0], ['Paid by', 0], ['SaaS tool', 2], ['Client', 2]]);
  });
});

describe('SCOPE-01 additions', () => {
  it.each([
    "I'll make sure the booking flow is the best possible experience.",
    'We will do whatever it takes to get the shop live.',
    'The site will include a blog and anything else that comes up.',
    'The assistant will give answers across a wide range of topics.',
    'Copy is written to a high standard and the build is fully optimised.',
    'The Consultant shall provide the services and such tasks as the Client may reasonably require.',
    'Support and bug fixes ongoing',
  ])('flags: %s', (text) => {
    expect(count(text, 'SCOPE-01')).toBe(1);
  });

  it('does not flag a cue word inside a proper noun, or when a measurable criterion is given', () => {
    expect(count('We will deliver the app to Fast Lane Couriers by the agreed date.', 'SCOPE-01')).toBe(0);
    expect(count('The build will be fully optimised, with pages loading in under 2 seconds.', 'SCOPE-01')).toBe(0);
  });

  it('does not treat "works" alone as a commitment verb', () => {
    expect(count('Our team (design, QA, etc.) works in two-week sprints.', 'SCOPE-01')).toBe(0);
  });
});

describe('TIME-03 additions', () => {
  it.each([
    "Once I send the first build, tell me if you're happy and we'll call it done.",
    'The Deliverables are accepted once the Client confirms in writing that they conform.',
    'Each draft is sent to the client for approval before it goes live.',
    'Client to approve the wireframes by email',
  ])('flags: %s', (text) => {
    expect(count(text, 'TIME-03')).toBe(1);
  });

  it('a revision promise is not an approval', () => {
    expect(count('Revisions are included until the client is happy with each flow.', 'TIME-03')).toBe(0);
  });

  it('a stated window still silences it', () => {
    expect(count('The client approves each design within 3 business days of delivery.', 'TIME-03')).toBe(0);
  });
});

describe('REVISE-04 additions', () => {
  it.each([
    "I'm glad to keep refining things until you love how it looks.",
    "I'll fix whatever you want, as many times as it takes.",
    'If you want changes after delivery, tell me and I will make them.',
    'We will adjust the layout until the customer is fully satisfied.',
    'The Agency shall make amendments to the website until the Customer is satisfied.',
  ])('flags (a): %s', (text) => {
    expect(count(text, 'REVISE-04')).toBe(1);
  });

  it.each([
    'The first design stage includes 2 rounds of changes. Additional rounds cost 60 per hour.',
    'One round of edits per article is included. Further edits are billed at 25 per article.',
    'We include 3 rounds of revisions per milestone. Anything beyond that is treated as a new project.',
  ])('a stated price for extra work counts as a change-order path: %s', (text) => {
    expect(count(text, 'REVISE-04')).toBe(0);
  });

  it('numbered revisions with no pricing still get part (b)', () => {
    const f = scan('We include 3 rounds of revisions per milestone.').findings.filter((x) => x.ruleId === 'REVISE-04');
    expect(f.map((x) => x.part)).toEqual(['b']);
  });
});

describe('HOST-02 additions', () => {
  it.each([
    ['The chatbot calls ChatGPT for every reply.'],
    ['Order confirmations go out by WhatsApp.'],
    ['The app runs on a small VPS.'],
    ['Premium plugins and font licences are used in the theme.'],
  ])('flags: %s', (text) => {
    expect(count(text, 'HOST-02')).toBe(1);
  });

  it('a negated cost ("will not hold any paid subscriptions") is not a cost', () => {
    expect(count('I will not hold any paid subscriptions for this project.', 'HOST-02')).toBe(0);
  });

  it("a possessive account (\"the club's hosting account\") and 'you pay' state the payer", () => {
    expect(count("The prototype is deployed to the club's hosting account.", 'HOST-02')).toBe(0);
    expect(count('You own and pay for your email sending platform.', 'HOST-02')).toBe(0);
  });

  it('a party named in the same table row states the payer', () => {
    const covered = '| Item | Paid by |\n|---|---|\n| SaaS analytics subscription | Client |';
    const open = '| Item | Notes |\n|---|---|\n| SaaS analytics subscription | monthly |';
    expect(count(covered, 'HOST-02')).toBe(0);
    expect(count(open, 'HOST-02')).toBe(1);
  });
});
