export { scan, DISCLAIMER_SHORT, DEFAULT_MAX_CHARS } from './scan.js';
export { compare, extractMentions, COMPARE_MATURITY, DEFAULT_MAX_TOTAL_CHARS, ROLE_NOTE } from './compare.js';
export { RULE_INFO, COMPARE_INFO, getRuleInfo, getCompareInfo } from './rules-info.js';
export { segment } from './segment.js';
export { RULE_IDS, COMPARE_CHECK_IDS } from './types.js';
export type {
  CompareCheckId,
  CompareFinding,
  CompareItem,
  CompareOptions,
  CompareResult,
  Finding,
  HostCategory,
  RuleId,
  RuleStatus,
  ScanOptions,
  ScanResult,
  Sentence,
  Severity,
  Source,
  Term,
} from './types.js';
