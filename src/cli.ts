import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { compare, DEFAULT_MAX_TOTAL_CHARS } from './compare.js';
import { DEFAULT_MAX_CHARS, DISCLAIMER_SHORT, scan } from './scan.js';
import { COMPARE_INFO, RULE_INFO, getCompareInfo, getRuleInfo } from './rules-info.js';
import { VERSION } from './version.js';
import type { CompareFinding, CompareResult, Finding, ScanResult } from './types.js';

export interface CliIo {
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  /** Reads all of standard input as UTF-8. */
  readStdin: () => string;
}

const ALLOWED_EXT = new Set(['.md', '.markdown', '.txt', '']);

export const HELP = `proposal-guard - read-only scope-creep checker for draft proposals and SOWs

Usage:
  proposal-guard scan <file|-> [--json]   Scan a .md/.txt file, or stdin with "-"
  proposal-guard compare <client-file|-> <proposal-file|-> [--json]
                                          Mark sentences in the client's text and in your proposal
                                          (only one of the two may be "-")
  proposal-guard list-rules [--json]      List the four rules
  proposal-guard explain <RULE-ID|CMP-ID> Describe one rule or compare check
  proposal-guard --help
  proposal-guard --version

Exit codes:
  0  scanned, no findings (or list-rules/explain/help succeeded)
  1  scanned, findings present
  2  usage or input error

It never writes or edits your file, makes no network calls and stores nothing.
Input limit: ${DEFAULT_MAX_CHARS} characters per text (${DEFAULT_MAX_TOTAL_CHARS} for compare). English text only.
Compare marks are highlights, not a score. CMP-02 and CMP-03 are experimental (see docs/EVALUATION.md).

${DISCLAIMER_SHORT}
`;

class UsageError extends Error {}

function formatFinding(f: Finding): string {
  const lines = [
    `[${f.severity}] ${f.ruleId}${f.part ? ` (${f.part})` : ''}${f.category ? ` - ${f.category}` : ''}`,
    `  Sentence: ${JSON.stringify(f.sentence)}`,
    `  Why: ${f.why}`,
    `  Suggestion: ${f.suggestion}`,
    ...(f.caution ? [`  Caution: ${f.caution}`] : []),
  ];
  return lines.join('\n');
}

export function formatText(r: ScanResult): string {
  const out: string[] = [];
  if (r.findings.length === 0) out.push('No findings.');
  else out.push(`${r.findings.length} finding${r.findings.length === 1 ? '' : 's'}:`, '', r.findings.map(formatFinding).join('\n\n'));
  out.push('', 'Rule status:');
  for (const [id, s] of Object.entries(r.status)) out.push(`  ${id}: ${s}`);
  out.push('', r.disclaimer);
  return out.join('\n') + '\n';
}

const SOURCE_LABEL = { reference: "Client's text", proposal: 'Your proposal' } as const;

function formatCompareFinding(f: CompareFinding): string {
  const what = f.check === 'RULES' ? (f.ruleId ?? 'RULES') : f.ruleId ? `${f.check} (${f.ruleId})` : f.check;
  const lines = [
    `[${f.severity}] ${SOURCE_LABEL[f.source]} - ${what}${f.part ? ` (${f.part})` : ''}${f.category ? ` - ${f.category}` : ''}${f.item ? ` - ${f.item}` : ''}${f.experimental ? ' [experimental]' : ''}`,
    `  ${f.roleNote}`,
    `  Sentence: ${JSON.stringify(f.sentence)}`,
    ...(f.values ? [`  Numbers read from the texts: client's text ${f.values.reference.join(', ')}; proposal ${f.values.proposal.join(', ')} (${f.unit})`] : []),
    `  Why: ${f.why}`,
    `  Suggestion: ${f.suggestion}`,
    ...(f.caution ? [`  Caution: ${f.caution}`] : []),
  ];
  return lines.join('\n');
}

export function formatCompareText(r: CompareResult): string {
  const out: string[] = [];
  if (!r.hasReference) out.push("No client's text given: this is the plain scan of the proposal.", '');
  if (r.findings.length === 0) out.push('No findings.');
  else out.push(`${r.findings.length} mark${r.findings.length === 1 ? '' : 's'} (highlights, not a score):`, '', r.findings.map(formatCompareFinding).join('\n\n'));
  out.push('', 'Compare checks:');
  for (const [id, s] of Object.entries(r.status)) out.push(`  ${id}: ${s}`);
  out.push('Rules on the proposal:');
  for (const [id, s] of Object.entries(r.proposalStatus)) out.push(`  ${id}: ${s}`);
  out.push('', r.disclaimer);
  return out.join('\n') + '\n';
}

function readInput(arg: string, io: CliIo): string {
  if (arg === '-') return io.readStdin();
  const ext = extname(arg).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) throw new UsageError(`Unsupported file type "${ext}". Use a .md or .txt file, or "-" for stdin.`);
  let size: number;
  try {
    const st = statSync(arg);
    if (!st.isFile()) throw new UsageError(`Not a file: ${arg}`);
    size = st.size;
  } catch (e) {
    if (e instanceof UsageError) throw e;
    throw new UsageError(`Cannot read ${arg}.`);
  }
  // UTF-8 uses at least one byte per UTF-16 unit, so more than 4x the cap in bytes can never fit.
  if (size > DEFAULT_MAX_CHARS * 4) throw new UsageError(`File is too large (limit ${DEFAULT_MAX_CHARS} characters).`);
  return readFileSync(arg, 'utf8');
}

/** Runs the CLI and returns the exit code. */
export function run(argv: string[], io: CliIo): number {
  try {
    const json = argv.includes('--json');
    const args = argv.filter((a) => a !== '--json');
    if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
      io.stdout(`${VERSION}\n`);
      return 0;
    }
    const unknown = args.filter((a) => a.startsWith('-') && a !== '-' && a !== '--help' && a !== '-h');
    if (unknown.length > 0) throw new UsageError(`Unknown option: ${unknown[0]}`);
    const [cmd, ...rest] = args;
    if (cmd === undefined || cmd === '--help' || cmd === '-h' || args.includes('--help')) {
      (cmd === undefined ? io.stderr : io.stdout)(HELP);
      return cmd === undefined ? 2 : 0;
    }
    if (cmd === 'list-rules') {
      if (rest.length > 0) throw new UsageError('list-rules takes no arguments.');
      if (json) io.stdout(JSON.stringify({ rules: RULE_INFO, compareChecks: COMPARE_INFO, disclaimer: DISCLAIMER_SHORT }, null, 2) + '\n');
      else
        io.stdout(
          RULE_INFO.map((r) => `${r.id}  ${r.name}`).join('\n') +
            `\n\nCompare checks (proposal-guard compare):\n` +
            COMPARE_INFO.map((c) => `${c.id}  ${c.name}${c.maturity === 'experimental' ? ' [experimental]' : ''}`).join('\n') +
            `\n\n${DISCLAIMER_SHORT}\n`,
        );
      return 0;
    }
    if (cmd === 'explain') {
      if (rest.length !== 1) throw new UsageError('Usage: proposal-guard explain <RULE-ID|CMP-ID>');
      const cmp = getCompareInfo(rest[0] ?? '');
      if (cmp) {
        if (json) io.stdout(JSON.stringify({ check: cmp, disclaimer: DISCLAIMER_SHORT }, null, 2) + '\n');
        else io.stdout(`${cmp.id}  ${cmp.name}\n\nFlags: ${cmp.flags}\nLeaves alone: ${cmp.leavesAlone}\nStatus: ${cmp.maturity}\n\n${DISCLAIMER_SHORT}\n`);
        return 0;
      }
      const info = getRuleInfo(rest[0] ?? '');
      if (!info) throw new UsageError(`Unknown rule "${rest[0]}". Run list-rules.`);
      if (json) io.stdout(JSON.stringify({ rule: info, disclaimer: DISCLAIMER_SHORT }, null, 2) + '\n');
      else
        io.stdout(
          `${info.id}  ${info.name}\n\nFlags: ${info.flags}\nLeaves alone: ${info.leavesAlone}\nSeverity labels: ${info.severities.join(' or ')}\nSuggestion shape: ${info.suggestion}${info.caution ? `\nCaution: ${info.caution}` : ''}\n\n${DISCLAIMER_SHORT}\n`,
        );
      return 0;
    }
    if (cmd === 'scan') {
      if (rest.length !== 1) throw new UsageError('Usage: proposal-guard scan <file|-> [--json]');
      const text = readInput(rest[0] ?? '', io);
      let result: ScanResult;
      try {
        result = scan(text);
      } catch (e) {
        if (e instanceof RangeError) throw new UsageError(e.message);
        throw e;
      }
      io.stdout(json ? JSON.stringify(result, null, 2) + '\n' : formatText(result));
      return result.findings.length > 0 ? 1 : 0;
    }
    if (cmd === 'compare') {
      if (rest.length !== 2) throw new UsageError('Usage: proposal-guard compare <client-file|-> <proposal-file|-> [--json]');
      if (rest[0] === '-' && rest[1] === '-') throw new UsageError('Only one of the two inputs may be "-" (standard input).');
      const reference = readInput(rest[0] ?? '', io);
      const proposal = readInput(rest[1] ?? '', io);
      let result: CompareResult;
      try {
        result = compare(reference, proposal);
      } catch (e) {
        if (e instanceof RangeError) throw new UsageError(e.message);
        throw e;
      }
      io.stdout(json ? JSON.stringify(result, null, 2) + '\n' : formatCompareText(result));
      return result.findings.length > 0 ? 1 : 0;
    }
    throw new UsageError(`Unknown command "${cmd}". Run --help.`);
  } catch (e) {
    if (e instanceof UsageError) {
      io.stderr(`Error: ${e.message}\n`);
      return 2;
    }
    io.stderr('Error: unexpected failure.\n');
    return 2;
  }
}
