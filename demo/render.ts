import type { Finding } from '../src/types.js';

/** A run of the input text, with the indexes of the findings that cover it. */
export interface Segment {
  text: string;
  /** Indexes into the findings array; empty for plain text. */
  findings: number[];
}

/**
 * Cuts the input into plain and highlighted runs for display. Pure and free of
 * the DOM, so it can be tested. Findings that overlap or share a sentence are
 * shown as one highlighted run that lists all of them.
 */
export function toSegments(text: string, findings: Finding[]): Segment[] {
  const cuts = new Set<number>([0, text.length]);
  for (const f of findings) {
    cuts.add(Math.max(0, Math.min(text.length, f.start)));
    cuts.add(Math.max(0, Math.min(text.length, f.end)));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const start = points[i] as number;
    const end = points[i + 1] as number;
    if (end <= start) continue;
    const covering: number[] = [];
    findings.forEach((f, idx) => {
      if (f.start < end && f.end > start) covering.push(idx);
    });
    const last = out[out.length - 1];
    if (last && last.findings.join() === covering.join()) last.text += text.slice(start, end);
    else out.push({ text: text.slice(start, end), findings: covering });
  }
  return out;
}
