/**
 * Agreement between two independent labellings of one corpus folder.
 *
 *   npm run agree -- corpus/heldout4            print agreement and every disagreement
 *   npm run agree -- corpus/heldout4 --write    also write labels.consensus.json (both agree),
 *                                               labels.union.json (either labelled it) and
 *                                               labels.adjudicated.json (consensus + part (b) items, see below)
 *
 * Labels are compared after ignoring a leading clause number and trailing
 * sentence punctuation (the same "lenient" form used by eval/run.ts).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Label {
  rule: string;
  sentence?: string;
  category?: string;
  part?: 'a' | 'b';
}
interface DocLabels {
  tags?: string[];
  expected: Label[];
  note?: string;
  notes?: string;
}

const strictNorm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const lenientNorm = (s: string): string =>
  strictNorm(s).replace(/^(?:\*\*[^*]*\*\*\s*)?\d+(?:\.\d+)*[.)]?\s+/, '').replace(/[.!?]+["'’”)\]*_]*$/, '');

function key(l: Label): string {
  if (l.rule === 'HOST-02') return `HOST-02|${l.category}`;
  if (l.rule === 'REVISE-04' && l.part === 'b') return 'REVISE-04|b';
  if (l.rule === 'REVISE-04') return `REVISE-04|a|${lenientNorm(l.sentence ?? '')}`;
  return `${l.rule}|${lenientNorm(l.sentence ?? '')}`;
}

const dir = process.argv[2];
if (!dir) {
  console.error('usage: npm run agree -- <corpus-dir> [--write]');
  process.exit(2);
}
const read = (f: string): Record<string, DocLabels> => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Record<string, DocLabels>;
const A = read('labels.json');
const B = read('labels.b.json');
const docs = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();

const rules = ['SCOPE-01', 'TIME-03', 'HOST-02', 'REVISE-04'];
const tally = Object.fromEntries(rules.map((r) => [r, { both: 0, onlyA: 0, onlyB: 0 }])) as Record<string, { both: number; onlyA: number; onlyB: number }>;
const lines: string[] = [];
const consensus: Record<string, DocLabels> = {};
const union: Record<string, DocLabels> = {};
// Adjudicated: both labellers agree, plus any REVISE-04 part (b) item either of them marked. The two readings of
// part (b) differed because the first labeller kept an implementation-time refinement; the spec's own text says
// part (b) is document level and independent of part (a), so that disagreement is settled by the spec, not by a vote.
const adjudicated: Record<string, DocLabels> = {};

for (const d of docs) {
  const a = new Map((A[d]?.expected ?? []).map((l) => [key(l), l]));
  const b = new Map((B[d]?.expected ?? []).map((l) => [key(l), l]));
  const both: Label[] = [];
  const either: Label[] = [];
  for (const [k, l] of a) {
    const r = k.split('|')[0] as string;
    if (b.has(k)) {
      tally[r]!.both++;
      both.push(l);
    } else {
      tally[r]!.onlyA++;
      lines.push(`  only first labeller   ${d}  ${k}`);
    }
    either.push(l);
  }
  for (const [k, l] of b) {
    if (a.has(k)) continue;
    tally[k.split('|')[0] as string]!.onlyB++;
    lines.push(`  only second labeller  ${d}  ${k}`);
    either.push(l);
  }
  consensus[d] = { tags: A[d]?.tags ?? [], expected: both };
  adjudicated[d] = { tags: A[d]?.tags ?? [], expected: [...both, ...either.filter((l) => l.rule === 'REVISE-04' && l.part === 'b' && !both.includes(l))] };
  union[d] = { tags: A[d]?.tags ?? [], expected: either };
}

const pct = (n: number, d: number): string => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}%`);
console.log(`Agreement: ${dir}  (${docs.length} documents)\n`);
console.log('rule        both  only1  only2   agreement (2*both / (n1+n2))');
let tb = 0, t1 = 0, t2 = 0;
for (const r of rules) {
  const t = tally[r]!;
  tb += t.both; t1 += t.onlyA; t2 += t.onlyB;
  console.log(`${r.padEnd(10)} ${String(t.both).padStart(5)} ${String(t.onlyA).padStart(6)} ${String(t.onlyB).padStart(6)}   ${t.both * 2}/${t.both * 2 + t.onlyA + t.onlyB} = ${pct(t.both * 2, t.both * 2 + t.onlyA + t.onlyB)}`);
}
console.log(`${'all'.padEnd(10)} ${String(tb).padStart(5)} ${String(t1).padStart(6)} ${String(t2).padStart(6)}   ${tb * 2}/${tb * 2 + t1 + t2} = ${pct(tb * 2, tb * 2 + t1 + t2)}`);
console.log('\nDisagreements:');
console.log(lines.length ? lines.join('\n') : '  none');

if (process.argv.includes('--write')) {
  writeFileSync(join(dir, 'labels.consensus.json'), JSON.stringify(consensus, null, 2) + '\n');
  writeFileSync(join(dir, 'labels.union.json'), JSON.stringify(union, null, 2) + '\n');
  writeFileSync(join(dir, 'labels.adjudicated.json'), JSON.stringify(adjudicated, null, 2) + '\n');
  console.log('\nwrote labels.consensus.json, labels.union.json and labels.adjudicated.json');
}
