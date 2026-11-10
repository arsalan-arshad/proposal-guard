import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { DEFAULT_MAX_CHARS, DISCLAIMER_SHORT, scan } from './scan.js';
import { RULE_INFO, getRuleInfo } from './rules-info.js';
import type { Finding, ScanResult } from './types.js';

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
  proposal-guard list-rules [--json]      List the four rules
  proposal-guard explain <RULE-ID>        Describe one rule
  proposal-guard --help

Exit codes:
  0  scanned, no findings (or list-rules/explain/help succeeded)
  1  scanned, findings present
  2  usage or input error

It never writes or edits your file, makes no network calls and stores nothing.
Input limit: ${DEFAULT_MAX_CHARS} characters. English text only.

${DISCLAIMER_SHORT}
`;

class UsageError extends Error {}

function formatFinding(f: Finding): string {
  const lines = [
    `[${f.severity}] ${f.ruleId}${f.part ? ` (${f.part})` : ''}${f.category ? ` - ${f.category}` : ''}`,
    `  Sentence: ${JSON.stringify(f.sentence)}`,
    `  Why: ${f.why}`,
    `  Suggestion: ${f.suggestion}`,
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
    const unknown = args.filter((a) => a.startsWith('-') && a !== '-' && a !== '--help' && a !== '-h');
    if (unknown.length > 0) throw new UsageError(`Unknown option: ${unknown[0]}`);
    const [cmd, ...rest] = args;
    if (cmd === undefined || cmd === '--help' || cmd === '-h' || args.includes('--help')) {
      (cmd === undefined ? io.stderr : io.stdout)(HELP);
      return cmd === undefined ? 2 : 0;
    }
    if (cmd === 'list-rules') {
      if (rest.length > 0) throw new UsageError('list-rules takes no arguments.');
      if (json) io.stdout(JSON.stringify({ rules: RULE_INFO, disclaimer: DISCLAIMER_SHORT }, null, 2) + '\n');
      else io.stdout(RULE_INFO.map((r) => `${r.id}  ${r.name}`).join('\n') + `\n\n${DISCLAIMER_SHORT}\n`);
      return 0;
    }
    if (cmd === 'explain') {
      if (rest.length !== 1) throw new UsageError('Usage: proposal-guard explain <RULE-ID>');
      const info = getRuleInfo(rest[0] ?? '');
      if (!info) throw new UsageError(`Unknown rule "${rest[0]}". Run list-rules.`);
      if (json) io.stdout(JSON.stringify({ rule: info, disclaimer: DISCLAIMER_SHORT }, null, 2) + '\n');
      else
        io.stdout(
          `${info.id}  ${info.name}\n\nFlags: ${info.flags}\nLeaves alone: ${info.leavesAlone}\nSeverity labels: ${info.severities.join(' or ')}\nSuggestion shape: ${info.suggestion}\n\n${DISCLAIMER_SHORT}\n`,
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
