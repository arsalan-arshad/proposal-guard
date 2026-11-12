import type { RuleId, Severity } from './types.js';

export interface RuleInfo {
  id: RuleId;
  name: string;
  /** What the rule flags, in one sentence. */
  flags: string;
  /** What it deliberately leaves alone. */
  leavesAlone: string;
  severities: Severity[];
  /** The fill-in-the-blanks shape of its suggestion. */
  suggestion: string;
  /** Set for the least reliable rule. */
  caution?: string;
}

/** Fixed descriptions of the four v1 rules. Kept short; the full definitions are in RULES_SPEC.md of the project. */
export const RULE_INFO: readonly RuleInfo[] = [
  {
    id: 'SCOPE-01',
    name: 'Vague promise or open-ended scope',
    flags:
      'A promise or deliverable sentence that uses an unmeasurable quality word, an unnamed standard, an open-ended list ("etc.", "as needed") or acceptance by the client\'s opinion.',
    leavesAlone:
      'Words that come with a measurable criterion or a pointer to written criteria, fixed names and phrases such as "fast-follow", and code, URLs and file names.',
    severities: ['High', 'Medium'],
    suggestion: '[metric] [threshold] measured by [method], or a complete list of what is in scope.',
  },
  {
    id: 'TIME-03',
    name: 'Approval or sign-off with no time window',
    flags: 'A milestone, delivery or payment that waits on approval or sign-off with no review period or deemed-acceptance default.',
    leavesAlone: 'Approvals that state a review window, a deemed-acceptance rule, or point to a named part of the document.',
    severities: ['High', 'Medium'],
    suggestion: 'The client reviews within [N] business days; with no written response, the milestone is deemed accepted.',
  },
  {
    id: 'HOST-02',
    name: 'Paid third-party cost with no stated payer',
    flags:
      'A document that mentions usage-billed third-party services (cloud, AI APIs, messaging, domains, licences, stores, other APIs) without saying who pays. One finding per uncovered category.',
    leavesAlone: 'Costs where a payer is stated (billed to the client, included in the fee, borne by a named party) or a pointer to a named part of the document.',
    severities: ['High', 'Medium'],
    suggestion: 'State who pays: billed to the client\'s account at cost, or included in the fee of [amount].',
    caution: 'The least reliable rule in our tests: most of its findings were wrong. Read the document to check who pays.',
  },
  {
    id: 'REVISE-04',
    name: 'Unnumbered or unlimited revisions, or no change-order path',
    flags:
      'Revisions with no number or with an unlimited promise, and a document that promises revisions but names no way to price extra work.',
    leavesAlone: 'Revisions with a stated number, and documents that never mention revisions.',
    severities: ['High', 'Medium'],
    suggestion: '[N] rounds per [milestone]; work beyond that is quoted and billed as a change order at [rate].',
  },
];

export function getRuleInfo(id: string): RuleInfo | undefined {
  return RULE_INFO.find((r) => r.id === id.toUpperCase());
}
