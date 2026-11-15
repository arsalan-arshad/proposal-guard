/**
 * Evaluation runner for compare mode. Runs compare() on every pair in a corpus folder and scores the three checks
 * against hand-written labels.
 *
 *   npm run eval:compare -- corpus/compare-dev [--labels labels.adjudicated.json] [--details]
 *   npm run eval:compare -- corpus/compare-dev --agree      (agreement of labels.a.json and labels.b.json)
 *
 * Folder layout: pairs/NN/reference.md, pairs/NN/proposal.md, labels.*.json.
 * What counts as the same finding (strict):
 *   CMP-01: the same rule and the same sentence of the client's text (REVISE-04 part (b): just the part);
 *   CMP-02: the same cost category;
 *   CMP-03: the same item and unit key (one mismatch = one finding, however many sentences it marks).
 * Counts first; a percentage is printed only next to the counts it comes from. No score is computed for a document.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compare } from '../src/index.js';

interface PairLabels {
  'CMP-01'?: Array<{ rule: string; part?: string; sentence?: string }>;
  'CMP-02'?: Array<{ category: string; sentence?: string }>;
  'CMP-03'?: Array<{ item: string; unit: string }>;
}
type Labels = Record<string, PairLabels>;
const CHECKS = ['CMP-01', 'CMP-02', 'CMP-03'] as const;

/** Whitespace and a leading clause number ("A.2 ", "4.1 ") are ignored: the labellers copied sentences without them. Fixed before any held-out run. */
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim().replace(/^(?:[A-Z]\.)?\d+(?:\.\d+)*[.)]?\s+/, '');
const args = process.argv.slice(2);
const flagValue = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i > -1 ? args[i + 1] : undefined;
};
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--labels');
if (!dir) {
  console.error('usage: npm run eval:compare -- <corpus-dir> [--labels <file>] [--details] [--agree]');
  process.exit(2);
}
const details = args.includes('--details');
const pairIds = readdirSync(join(dir, 'pairs')).filter((n) => /^\d+$/.test(n)).sort();

/** Labels name the unit key without its refinements (`per`, not `per:article`; `day`, not `day:deposit`). */
const coarse = (unit: string | undefined): string => (unit ?? '').split(':')[0] ?? '';

function keysOfLabels(l: PairLabels, check: (typeof CHECKS)[number]): string[] {
  if (check === 'CMP-01') return (l['CMP-01'] ?? []).map((x) => (x.rule === 'REVISE-04' && x.part === 'b' ? 'REVISE-04|b' : `${x.rule}|${norm(x.sentence ?? '')}`));
  if (check === 'CMP-02') return (l['CMP-02'] ?? []).map((x) => x.category);
  return (l['CMP-03'] ?? []).map((x) => `${x.item}|${coarse(x.unit)}`);
}

const load = (file: string): Labels => JSON.parse(readFileSync(join(dir, file), 'utf8')) as Labels;

if (args.includes('--agree')) {
  const a = load('labels.a.json');
  const b = load('labels.b.json');
  console.log(`Labeller agreement in ${dir}`);
  for (const check of CHECKS) {
    let both = 0;
    let onlyA = 0;
    let onlyB = 0;
    for (const id of pairIds) {
      const ka = new Set(keysOfLabels(a[id] ?? {}, check));
      const kb = new Set(keysOfLabels(b[id] ?? {}, check));
      for (const k of ka) (kb.has(k) ? (both++, 0) : (onlyA++, details && console.log(`  ${id} ${check} only A: ${k}`)));
      for (const k of kb) if (!ka.has(k)) (onlyB++, details && console.log(`  ${id} ${check} only B: ${k}`));
    }
    console.log(`  ${check}: both ${both}, only A ${onlyA}, only B ${onlyB}  (agree on ${both} of ${both + onlyA + onlyB} judgements)`);
  }
  process.exit(0);
}

const labels = load(flagValue('--labels') ?? 'labels.adjudicated.json');
const totals = Object.fromEntries(CHECKS.map((c) => [c, { tp: 0, fp: 0, fn: 0 }])) as Record<(typeof CHECKS)[number], { tp: number; fp: number; fn: number }>;
const fpList: string[] = [];
const fnList: string[] = [];

for (const id of pairIds) {
  const reference = readFileSync(join(dir, 'pairs', id, 'reference.md'), 'utf8');
  const proposal = readFileSync(join(dir, 'pairs', id, 'proposal.md'), 'utf8');
  const r = compare(reference, proposal);
  for (const check of CHECKS) {
    const got = new Set<string>();
    for (const f of r.findings) {
      if (f.check !== check) continue;
      if (check === 'CMP-03') {
        if (f.source === 'reference') got.add(`${f.item}|${coarse(f.unit)}`);
      } else if (check === 'CMP-02') got.add(f.category ?? '');
      else got.add(f.ruleId === 'REVISE-04' && f.part === 'b' ? 'REVISE-04|b' : `${f.ruleId}|${norm(f.sentence)}`);
    }
    const want = new Set(keysOfLabels(labels[id] ?? {}, check));
    for (const k of got) {
      if (want.has(k)) totals[check].tp++;
      else {
        totals[check].fp++;
        fpList.push(`${id} ${check} FALSE POSITIVE: ${k}`);
      }
    }
    for (const k of want)
      if (!got.has(k)) {
        totals[check].fn++;
        fnList.push(`${id} ${check} MISSED: ${k}`);
      }
  }
}

const pct = (n: number, d: number): string => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)}%`);
console.log(`Compare evaluation: ${dir} (${pairIds.length} pairs), labels ${flagValue('--labels') ?? 'labels.adjudicated.json'}`);
for (const check of CHECKS) {
  const t = totals[check];
  const reported = t.tp + t.fp;
  const expected = t.tp + t.fn;
  console.log(`${check}: reported ${reported}, correct ${t.tp} (precision ${t.tp} of ${reported}, ${pct(t.tp, reported)}); expected ${expected}, found ${t.tp} (recall ${t.tp} of ${expected}, ${pct(t.tp, expected)}); false positives ${t.fp}, misses ${t.fn}`);
}
if (details) {
  console.log('');
  for (const l of [...fpList, ...fnList]) console.log(l);
}
