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
