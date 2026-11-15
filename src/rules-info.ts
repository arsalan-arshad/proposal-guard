import { COMPARE_MATURITY } from './compare.js';
import type { CompareCheckId, RuleId, Severity } from './types.js';

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

export interface CompareCheckInfo {
  id: CompareCheckId;
  name: string;
  flags: string;
  leavesAlone: string;
  /** `experimental` unless the check met the shipping bar in docs/EVALUATION.md. */
  maturity: 'experimental' | 'stable';
}

/** Fixed descriptions of the three compare checks. The full definitions are in RULES_SPEC.md of the project. */
export const COMPARE_INFO: readonly CompareCheckInfo[] = [
  {
    id: 'CMP-01',
    name: "Risk in the client's own text",
    flags: "SCOPE-01, TIME-03 and REVISE-04 findings in the client's text: wording you would be accepting if you sign it.",
    leavesAlone: "HOST-02 (see CMP-02); REVISE-04 part (b) when your proposal has a change-order phrase; anything the three rules do not flag.",
    maturity: COMPARE_MATURITY['CMP-01'],
  },
  {
    id: 'CMP-02',
    name: 'Paid service named in the client\'s text, no payer in either text',
    flags: "A cost category from the HOST-02 word lists named in the client's text when no sentence in either text states who pays for it.",
    leavesAlone: 'A category only your proposal names, a negated or excluded mention, and any category with a payer stated in either text.',
    maturity: COMPARE_MATURITY['CMP-02'],
  },
  {
    id: 'CMP-03',
    name: 'Number mismatch',
    flags: 'Revision rounds, review time, payment time or delivery time stated with different numbers in the two texts (same unit only).',
    leavesAlone: 'Items only one text states, shared values, different units or scopes, "unlimited", paid extras, milestone-level deadlines, warranty or interest periods.',
    maturity: COMPARE_MATURITY['CMP-03'],
  },
];

export function getCompareInfo(id: string): CompareCheckInfo | undefined {
  return COMPARE_INFO.find((c) => c.id === id.toUpperCase());
}
