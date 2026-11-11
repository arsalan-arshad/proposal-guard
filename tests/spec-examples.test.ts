import { describe, expect, it } from 'vitest';
import { scan } from '../src/index.js';
import type { Finding, HostCategory, RuleId } from '../src/index.js';

// The 80 synthetic examples from the rule spec (10 positive + 10 negative per rule). All text is made up.

const only = (text: string, rule: RuleId): Finding[] => scan(text).findings.filter((f) => f.ruleId === rule);
const termTexts = (f: Finding[]): string[] => f.flatMap((x) => x.terms.map((t) => t.text.toLowerCase()));

describe('SCOPE-01 positives', () => {
  const cases: Array<[string, string, string[]]> = [
    ['P1', 'The app should be fast, responsive and easily scalable.', ['fast', 'responsive', 'easily', 'scalable']],
    ['P2', 'We will deliver a seamless third-party integration.', ['seamless']],
    ['P3', 'The website will have an intuitive, user-friendly interface.', ['intuitive', 'user-friendly']],
    ['P4', 'Features include login, payments, notifications, etc.', ['etc.']],
    ['P5', 'We will provide all necessary integrations as needed.', ['all necessary', 'as needed']],
    ['P6', 'The system will be built to enterprise-grade, production-ready standards.', ['enterprise-grade', 'production-ready']],
    ['P7', 'Deliverables include the mobile app, the admin panel, and other related tasks.', ['and other related']],
    ['P8', 'We will implement the dashboard to your satisfaction.', ['to your satisfaction']],
    ['P9', 'The platform will follow best practices and industry standards.', ['best practices', 'industry standards']],
    ['P10', 'The checkout flow will be lightning-fast and pixel-perfect.', ['lightning-fast', 'pixel-perfect']],
  ];
  it.each(cases)('%s is flagged', (_id, text, expected) => {
    const f = only(text, 'SCOPE-01');
    expect(f).toHaveLength(1);
    expect(termTexts(f)).toEqual(expect.arrayContaining(expected));
  });
});

describe('SCOPE-01 negatives', () => {
  const cases: Array<[string, string]> = [
    ['N1', 'The dashboard will be fast: p95 page load under 2 seconds on a 10 Mbps connection.'],
    ['N2', 'The platform will be scalable to 5,000 concurrent users, verified by the load test in Appendix B.'],
    ['N3', 'We will schedule a quick call on Monday to confirm the plan.'],
    ['N4', 'The backend will be built with FastAPI and PostgreSQL.'],
    ['N5', 'After launch we will plan a fast-follow release for minor fixes.'],
    ['N6', 'The site will use a responsive layout with breakpoints at 480, 768 and 1280 px.'],
    ['N7', 'Our team (design, QA, etc.) works in two-week sprints.'],
    ['N8', 'The app will be intuitive: at least 90% of test users complete the five tasks in Appendix A.'],
    ['N9', 'Acceptance criteria are defined in Schedule 2; the website will be user-friendly as set out there.'],
    ['N10', 'Thank you for the opportunity; we look forward to a robust partnership.'],
  ];
  it.each(cases)('%s is not flagged', (_id, text) => {
    expect(only(text, 'SCOPE-01')).toHaveLength(0);
  });
});

describe('TIME-03 positives', () => {
  const cases: Array<[string, string]> = [
    ['P1', 'Payment for Milestone 1 is due upon client approval of the deliverables.'],
    ['P2', 'Each phase is complete once signed off by the client.'],
    ['P3', 'The final handover happens after the client accepts the build.'],
    ['P4', 'Milestone 2 will be invoiced when the client approves the design.'],
    ['P5', 'Delivery is subject to client approval at each stage.'],
    ['P6', "The release is considered complete after sign-off from the client's team."],
    ['P7', "Milestone payment is released upon the client's acceptance."],
    ['P8', 'We will deliver the prototype for client review and approval.'],
    ['P9', 'The invoice for the final deliverable is issued after the client signs off.'],
    ['P10', 'Phase 3 starts once Phase 2 has been approved by the client.'],
  ];
  it.each(cases)('%s is flagged', (_id, text) => {
    expect(only(text, 'TIME-03')).toHaveLength(1);
  });
});

describe('TIME-03 negatives', () => {
  const cases: Array<[string, string]> = [
    ['N1', 'The client reviews each milestone within 5 business days; silence counts as acceptance.'],
    ['N2', 'Milestone 1 is deemed accepted if the client does not respond within 7 days.'],
    ['N3', 'We accept credit cards and bank transfers for each milestone payment.'],
    ['N4', 'Deliverables are accepted or rejected in writing within three business days of delivery.'],
    ['N5', 'The budget approval process on the client side takes about two weeks.'],
    ['N6', 'Our review of your requirements will take two days.'],
    ['N7', 'Phase 2 begins on the first Monday after Phase 1 is delivered.'],
    ['N8', 'Milestone approval follows Schedule 3, including review periods.'],
    ['N9', 'We accept PayPal; each milestone is paid within 14 days of invoice.'],
    ['N10', 'Final handover includes source code, documentation and a 30-minute walkthrough.'],
  ];
  it.each(cases)('%s is not flagged', (_id, text) => {
    expect(only(text, 'TIME-03')).toHaveLength(0);
  });
});

describe('HOST-02 positives', () => {
  const cases: Array<[string, string, HostCategory[]]> = [
    ['P1', 'The app will be deployed on AWS.', ['cloud']],
    ['P2', 'We will integrate the OpenAI API for summaries.', ['ai']],
    ['P3', 'Order confirmations are sent by SMS through Twilio.', ['messaging']],
    ['P4', 'The site will be hosted on Vercel with a custom domain name.', ['cloud', 'domain']],
    ['P5', 'The chatbot uses GPT models; hosting is on Railway.', ['ai', 'cloud']],
    ['P6', 'Emails go out through SendGrid and push notifications through Firebase.', ['messaging', 'cloud']],
    ['P7', 'We will use the Google Maps API for the store locator.', ['api']],
    ['P8', 'The mobile app will be published to the App Store and Google Play.', ['store']],
    ['P9', 'Search is powered by an Algolia subscription.', ['licences']],
    ['P10', 'The system runs on Azure with a managed database.', ['cloud']],
  ];
  it.each(cases)('%s flags the uncovered categories', (_id, text, categories) => {
    const f = only(text, 'HOST-02');
    expect(f.map((x) => x.category).sort()).toEqual([...categories].sort());
  });
});

describe('HOST-02 negatives', () => {
  const cases: Array<[string, string]> = [
    ['N1', "The app will be deployed on AWS. All hosting and third-party service costs are billed to the client's account."],
    ['N2', 'OpenAI API usage is paid directly by the client.'],
    ['N3', 'Hosting costs are included in the monthly fee.'],
    ['N4', 'We will use domain-driven design and a clean domain model.'],
    ['N5', 'The project is released under the MIT licence.'],
    ['N6', 'We will build the backend in Node.js with server-side rendering.'],
    ['N7', 'The client provides the AWS account and pays all infrastructure costs.'],
    ['N8', 'Twilio SMS fees are passed through to the client at cost.'],
    ['N9', 'Our team uses Slack and Notion internally.'],
    ['N10', 'Cloud-native architecture will follow the twelve-factor principles.'],
  ];
  it.each(cases)('%s is not flagged', (_id, text) => {
    expect(only(text, 'HOST-02')).toHaveLength(0);
  });
});

describe('REVISE-04 positives', () => {
  const cases: Array<[string, string, 'a' | 'b', 'High' | 'Medium']> = [
    ['P1', 'Unlimited revisions are included.', 'a', 'High'],
    ['P2', 'We offer revisions until you are completely satisfied.', 'a', 'High'],
    ['P3', 'The price includes revisions to the design.', 'a', 'Medium'],
    ['P4', 'Minor changes after delivery are free of charge.', 'a', 'Medium'],
    ['P5', 'We will provide as many iterations as needed.', 'a', 'High'],
    ['P6', 'Reasonable edits are included in the fee.', 'a', 'Medium'],
    ['P7', 'Rework of the homepage is included until approval.', 'a', 'Medium'],
    ['P8', 'Includes revisions and tweaks throughout the project.', 'a', 'Medium'],
    ['P9', 'The package comes with unlimited design iterations.', 'a', 'High'],
    ['P10', 'Design is delivered in two rounds of revisions. The final price is fixed.', 'b', 'Medium'],
  ];
  it.each(cases)('%s is flagged (part %s, %s)', (_id, text, part, severity) => {
    const f = only(text, 'REVISE-04');
    // Part (b) is document level and independent of part (a): none of these examples names a change-order path, so
    // each also gets exactly one part (b) finding (RULES_SPEC.md, change 48 reverses the earlier "one finding per sentence" refinement).
    const a = f.filter((x) => x.part === 'a');
    const b = f.filter((x) => x.part === 'b');
    expect(b).toHaveLength(1);
    expect(b[0]?.severity).toBe('Medium');
    if (part === 'a') {
      expect(a).toHaveLength(1);
      expect(a[0]?.severity).toBe(severity);
    } else {
      expect(a).toHaveLength(0);
    }
  });
});

describe('REVISE-04 negatives', () => {
  const cases: Array<[string, string]> = [
    ['N1', 'The fee includes two rounds of revisions per milestone; further requests are billed as change orders.'],
    ['N2', 'Up to 3 revisions are included; additional work is quoted separately as a change request.'],
    ['N3', 'We use agile iterations of two weeks.'],
    ['N4', 'The git history shows all revisions of the document.'],
    ['N5', 'Any change to scope will be handled through a change order.'],
    ['N6', 'Revision 2 of this proposal supersedes revision 1.'],
    ['N7', 'We offer one round of revisions at no charge; extra rounds are billed hourly.'],
    ['N8', 'Client feedback is consolidated into a single revision round per milestone; later changes follow the change request process.'],
    ['N9', 'A one-time revision of the logo is included; anything further is a billable change.'],
    ['N10', 'We will provide a quote for any additional work you request after sign-off.'],
  ];
  it.each(cases)('%s is not flagged', (_id, text) => {
    expect(only(text, 'REVISE-04')).toHaveLength(0);
  });
});
