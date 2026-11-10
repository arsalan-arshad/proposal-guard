import { describe, expect, it } from 'vitest';
import { scan, segment } from '../src/index.js';
import type { RuleId } from '../src/index.js';

/** Regression tests for behaviour added while tuning on the development corpus (see RULES_SPEC.md, items 21 to 30). */
const ids = (text: string, rule: RuleId): number => scan(text).findings.filter((f) => f.ruleId === rule).length;

describe('segmentation', () => {
  it('ends a sentence after a lettered reference such as "Appendix B."', () => {
    expect(segment('Targets are in Appendix B. The client reviews them.').map((s) => s.text)).toEqual([
      'Targets are in Appendix B.',
      'The client reviews them.',
    ]);
  });
});

describe('TIME-03 window "N days to respond"', () => {
  it('counts as a window', () => {
    expect(ids('The final invoice is issued once the client approves the release candidate. The client has 10 days to respond.', 'TIME-03')).toBe(0);
  });
});

describe('REVISE-04 (b) pricing wording', () => {
  it('"billed at our hourly rate" counts as a change-order path', () => {
    expect(ids('Development includes two rounds of revisions per milestone. Anything beyond that is billed at our hourly rate.', 'REVISE-04')).toBe(0);
  });
});

describe('HOST-02 payer wording', () => {
  it('"AI usage costs are billed to the client" covers the AI category', () => {
    expect(ids('We use the OpenAI API for summaries. AI usage costs are billed to the client.', 'HOST-02')).toBe(0);
  });
  it('a pointer such as "covered in Section 6" counts as a stated payer', () => {
    expect(ids('Hosting and third-party fees are covered in Section 6.', 'HOST-02')).toBe(0);
  });
  it('"Everything else is our responsibility" covers the remaining categories', () => {
    expect(ids('Push notifications use Firebase. Everything else is our responsibility.', 'HOST-02')).toBe(0);
  });
  it('an AI usage mention with no payer is still flagged', () => {
    expect(ids('The tool bills AI usage per request.', 'HOST-02')).toBe(1);
  });
});

describe('SCOPE-01 tuning', () => {
  it('flags "to your satisfaction" without a commitment verb or deliverable noun', () => {
    expect(ids('Final delivery happens to your satisfaction.', 'SCOPE-01')).toBe(1);
    expect(ids('The work is complete when it is satisfactory to the client.', 'SCOPE-01')).toBe(1);
  });
  it('does not flag bare "satisfactory" without context', () => {
    expect(ids('That was a satisfactory lunch.', 'SCOPE-01')).toBe(0);
  });
  it('treats "responsive web app" as ordinary wording but still flags a bare "responsive"', () => {
    expect(ids('Responsive web app', 'SCOPE-01')).toBe(0);
    expect(ids('The app should be fast and responsive.', 'SCOPE-01')).toBe(1);
  });
  it('"scope" and "covers" count as deliverable context', () => {
    expect(ids('The scope covers the storefront, checkout, order emails, and other related work.', 'SCOPE-01')).toBe(1);
  });
  it('a pointer "agreed in Appendix B" suppresses', () => {
    expect(ids('We do not promise a fast app; targets will be agreed in Appendix B.', 'SCOPE-01')).toBe(0);
  });
});

describe('HOST-02 payer wording, second round (development corpus d25 to d29)', () => {
  it.each([
    ['Hosting, domain and SMS fees shall be borne by Client.', 'Hosted on AWS. '],
    ['The client holds the AWS and Twilio accounts and pays their fees directly.', ''],
    ["Mapbox fees are charged to Client's card.", 'We use Mapbox. '],
    ['Email delivery through Mailgun is paid for by the customer.', ''],
    ['All hosting costs are at the client’s expense.', 'Hosted on Vercel. '],
  ])('states a payer: %s', (sentence, lead) => {
    expect(ids(lead + sentence, 'HOST-02')).toBe(0);
  });

  it('a payer-like word in a sentence with no cue does not cover the category', () => {
    expect(ids('We use the OpenAI API for summaries. The client is happy to cover lunch. Support is provided by us.', 'HOST-02')).toBe(1);
  });

  it('a subscription sold inside the client’s own product is not a project cost', () => {
    expect(ids('Users can buy a premium subscription inside the app.', 'HOST-02')).toBe(0);
    expect(ids('Search is powered by an Algolia subscription.', 'HOST-02')).toBe(1);
  });

  it('known limit: "the client pays" about the fee is taken as a stated payer for a cue in the same sentence', () => {
    expect(ids('The client pays on delivery; we deploy on Vercel.', 'HOST-02')).toBe(0);
  });
});
