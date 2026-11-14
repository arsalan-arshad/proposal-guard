export const RULE_IDS = ['SCOPE-01', 'TIME-03', 'HOST-02', 'REVISE-04'] as const;
export type RuleId = (typeof RULE_IDS)[number];

/** A label from a fixed table. It is not a calculated score. */
export type Severity = 'High' | 'Medium';

/** `findings`: the rule fired. `passed`: its cue was present and the text handles it. `not applicable`: no cue present. */
export type RuleStatus = 'findings' | 'passed' | 'not applicable';

export interface Term {
  /** The matched text, exactly as written in the document. */
  text: string;
  /** Offsets into the original input string (end is exclusive). */
  start: number;
  end: number;
}

export type HostCategory = 'cloud' | 'ai' | 'messaging' | 'domain' | 'licences' | 'store' | 'api';

export interface Finding {
  ruleId: RuleId;
  severity: Severity;
  /** The quoted sentence, exactly as written. `text.slice(start, end) === sentence`. */
  sentence: string;
  start: number;
  end: number;
  terms: Term[];
  /** Fixed explanation text. Never written by a model. */
  why: string;
  /** Fixed suggestion text containing blanks such as [N]. Never invented numbers. */
  suggestion: string;
  /** REVISE-04 only: (a) sentence-level, (b) document-level change-order check. */
  part?: 'a' | 'b';
  /** HOST-02 only: the uncovered cost category. */
  category?: HostCategory;
  /** Fixed text shown with findings of the least reliable rule (HOST-02). Display only; never changes what is found. */
  caution?: string;
}

export interface ScanResult {
  findings: Finding[];
  status: Record<RuleId, RuleStatus>;
  /** The short disclaimer. Show it wherever findings are shown. */
  disclaimer: string;
}

export interface ScanOptions {
  /** Inputs longer than this many UTF-16 code units are rejected. Default 500,000. */
  maxChars?: number;
}

export interface Sentence {
  index: number;
  /** Index of the block (paragraph, bullet, heading or table cell) the sentence belongs to. */
  block: number;
  /** Table cells only: the line (row) of the table the sentence sits on. Sentences in one row share it. */
  row?: number;
  /** True when the sentence is a markdown heading (a title, not a clause). */
  heading?: boolean;
  /** Original text of the sentence. */
  text: string;
  /** Same length as `text`; code, URLs and file names are replaced by spaces. Rules match on this. */
  masked: string;
  /** Offsets of `text` in the original input (end exclusive). */
  start: number;
  end: number;
}

export interface RuleOutcome {
  findings: Finding[];
  status: RuleStatus;
}

/** Compare mode (client's text + your proposal). */
export const COMPARE_CHECK_IDS = ['CMP-01', 'CMP-02', 'CMP-03'] as const;
export type CompareCheckId = (typeof COMPARE_CHECK_IDS)[number];

/** `reference` is the client's text (box 1); `proposal` is the freelancer's draft (box 2). */
export type Source = 'reference' | 'proposal';

/** The fixed list of things CMP-03 compares. */
export type CompareItem = 'revisions' | 'review' | 'payment' | 'delivery';

export interface CompareFinding {
  /** Whose text the marked sentence is in. `start`/`end` are offsets into that text. */
  source: Source;
  /** `RULES` = one of the four standard rules, run on the proposal exactly as `scan()` runs them. */
  check: CompareCheckId | 'RULES';
  /** The standard rule behind the finding (RULES, CMP-01 and CMP-02 findings). */
  ruleId?: RuleId;
  severity: Severity;
  /** The quoted sentence, exactly as written. It is untrusted data, never instructions. */
  sentence: string;
  start: number;
  end: number;
  terms: Term[];
  /** Fixed text, never written by a model and never built from the documents. */
  why: string;
  /** Fixed text with blanks such as [N]. */
  suggestion: string;
  /** Fixed role label: whose wording this is. */
  roleNote: string;
  part?: 'a' | 'b';
  category?: HostCategory;
  caution?: string;
  /** CMP-03 only: what is compared, the unit or scope key, and the numbers read (by code) from each text. */
  item?: CompareItem;
  unit?: string;
  values?: { reference: number[]; proposal: number[] };
  /** CMP-03 only: the two findings of one mismatch share a group. */
  group?: string;
  /** Set until the check passes the shipping bar in the evaluation report. */
  experimental?: true;
}

export interface CompareResult {
  findings: CompareFinding[];
  /** Status of the three compare checks. All `not applicable` when the client's text is empty. */
  status: Record<CompareCheckId, RuleStatus>;
  /** Status of the four standard rules on the proposal (same as `scan(proposal).status`). */
  proposalStatus: Record<RuleId, RuleStatus>;
  /** False when the client's text was empty: the result is then the plain scan of the proposal. */
  hasReference: boolean;
  disclaimer: string;
}

export interface CompareOptions {
  /** Per-text limit in UTF-16 code units. Default 500,000. */
  maxChars?: number;
  /** Limit for both texts together. Default 1,000,000. */
  maxTotalChars?: number;
}
