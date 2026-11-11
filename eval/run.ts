/**
 * Evaluation runner. Scans every document in a corpus directory and compares
 * the findings with the hand-written labels.
 *
 *   npm run eval -- corpus/dev
 *
 * A finding matches a label when the rule is the same and:
 *   - SCOPE-01, TIME-03, REVISE-04 (a): the sentence text is the same;
 *   - HOST-02: the cost category is the same;
 *   - REVISE-04 (b): both are part (b).
 * Severity is not scored. Output is counts first; percentages are shown only next to the counts they come from.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RULE_IDS, scan } from '../src/index.js';
import type { Finding, RuleId } from '../src/index.js';

interface Label {
  rule: RuleId;
  sentence?: string;
  category?: string;
  part?: 'a' | 'b';
}
interface DocLabels {
  tags: string[];
  expected: Label[];
  notes?: string;
}

const strictNorm = (s: string): string => s.replace(/\s+/g, ' ').trim();
/** Secondary, looser comparison: also ignores a leading clause number ("1.1 ") and trailing sentence punctuation. */
const lenientNorm = (s: string): string =>
  strictNorm(s).replace(/^(?:\*\*[^*]*\*\*\s*)?\d+(?:\.\d+)*[.)]?\s+/, '').replace(/[.!?]+["'’”)\]*_]*$/, '');
const lenient = process.argv.includes('--lenient');
const norm = lenient ? lenientNorm : strictNorm;

function keyOfLabel(l: Label): string {
  if (l.rule === 'HOST-02') return `HOST-02|${l.category}`;
  if (l.rule === 'REVISE-04' && l.part === 'b') return 'REVISE-04|b';
  if (l.rule === 'REVISE-04') return `REVISE-04|a|${norm(l.sentence ?? '')}`;
  return `${l.rule}|${norm(l.sentence ?? '')}`;
}

function keyOfFinding(f: Finding): string {
  if (f.ruleId === 'HOST-02') return `HOST-02|${f.category}`;
  if (f.ruleId === 'REVISE-04' && f.part === 'b') return 'REVISE-04|b';
  if (f.ruleId === 'REVISE-04') return `REVISE-04|a|${norm(f.sentence)}`;
  return `${f.ruleId}|${norm(f.sentence)}`;
}

const labelsFlag = process.argv.indexOf('--labels');
const labelsFile = labelsFlag > -1 ? (process.argv[labelsFlag + 1] ?? 'labels.json') : 'labels.json';
/** Positional arguments are corpus folders (more than one is allowed); flags and the --labels value are not. */
const dirs = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--labels');
const consensus = process.argv.includes('--consensus');
if (dirs.length === 0) {
  console.error('usage: npm run eval -- <corpus-dir> [more dirs] [--lenient] [--labels <file> | --consensus]');
  process.exit(2);
}

const counts = Object.fromEntries(RULE_IDS.map((r) => [r, { tp: 0, fp: 0, fn: 0 }])) as Record<
  RuleId,
  { tp: number; fp: number; fn: number }
>;
const lines: string[] = [];
let labelProblems = 0;
let totalDocs = 0;
const usedLabels: string[] = [];

for (const dir of dirs) {
  // --consensus: use labels.consensus.json where a folder has one (two independent labellers agreed), else labels.json.
  let file0 = labelsFile;
  // Adjudicated labels follow the settled part (b) definition. A folder labelled before that clarification has no
  // adjudicated file, so its part (b) labels are incomplete and part (b) is left out of its score (labels and findings).
  const adjudicated = consensus && existsSync(join(dir, 'labels.adjudicated.json'));
  if (adjudicated) file0 = 'labels.adjudicated.json';
  const skipPartB = consensus && !adjudicated;
  usedLabels.push(`${dir}:${file0}`);
  const labels = JSON.parse(readFileSync(join(dir, file0), 'utf8')) as Record<string, DocLabels>;
  const files = readdirSync(join(dir, 'docs')).filter((f) => f.endsWith('.md')).sort();
  totalDocs += files.length;
  const tag = dirs.length > 1 ? `${dir.split('/').pop()}/` : '';

  for (const file of files) {
    const text = readFileSync(join(dir, 'docs', file), 'utf8');
    const doc = labels[file];
    if (!doc) {
      console.error(`no labels for ${dir}/${file}`);
      labelProblems++;
      continue;
    }
    for (const l of doc.expected) {
      if (l.sentence && !norm(text).includes(norm(l.sentence))) {
        console.error(`label sentence not found in ${dir}/${file}: ${l.sentence}`);
        labelProblems++;
      }
    }
    const expected = new Set(doc.expected.map(keyOfLabel).filter((k) => !(skipPartB && k === 'REVISE-04|b')));
    const actual = new Set(scan(text).findings.map(keyOfFinding).filter((k) => !(skipPartB && k === 'REVISE-04|b')));
    for (const k of actual) {
      const rule = k.split('|')[0] as RuleId;
      if (expected.has(k)) counts[rule].tp++;
      else {
        counts[rule].fp++;
        lines.push(`  FP  ${tag}${file}  ${k}`);
      }
    }
    for (const k of expected) {
      if (!actual.has(k)) {
        counts[k.split('|')[0] as RuleId].fn++;
        lines.push(`  FN  ${tag}${file}  ${k}`);
      }
    }
  }
}

const ratio = (n: number, d: number): string => (d === 0 ? 'n/a (0 cases)' : `${n}/${d} = ${((100 * n) / d).toFixed(0)}%`);
console.log(`Corpus: ${dirs.join(' + ')}  (${totalDocs} documents)${consensus ? '  [labels: adjudicated where available; part (b) skipped for older sets]' : labelsFile !== 'labels.json' ? `  [labels: ${labelsFile}]` : ''}${lenient ? '  [LENIENT matching: ignores clause numbers and trailing punctuation; secondary figure]' : ''}\n`);
console.log('rule        TP  FP  FN   precision          recall');
let tp = 0, fp = 0, fn = 0;
for (const r of RULE_IDS) {
  const c = counts[r];
  tp += c.tp; fp += c.fp; fn += c.fn;
  console.log(
    `${r.padEnd(10)} ${String(c.tp).padStart(3)} ${String(c.fp).padStart(3)} ${String(c.fn).padStart(3)}   ${ratio(c.tp, c.tp + c.fp).padEnd(18)} ${ratio(c.tp, c.tp + c.fn)}`,
  );
}
console.log(`${'all'.padEnd(10)} ${String(tp).padStart(3)} ${String(fp).padStart(3)} ${String(fn).padStart(3)}   ${ratio(tp, tp + fp).padEnd(18)} ${ratio(tp, tp + fn)}`);
console.log('\nMismatches:');
console.log(lines.length ? lines.join('\n') : '  none');
if (labelProblems > 0) {
  console.error(`\n${labelProblems} label problem(s); fix the labels before trusting these numbers.`);
  process.exit(1);
}
