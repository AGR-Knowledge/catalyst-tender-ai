import { MIN_N } from '@/data/gcc/targets';
import type { FlowPartVM, GateKey } from '../viewmodels';

/** What each gate decides: the gate column's sub-line on every funnel. */
export const GATE_SUB: Record<GateKey, string> = { DG1: 'Pursue or discard', DG2: 'Bid or no-bid', DG3: 'Final approval' };

/**
 * A funnel column's rate line (plan 027d, dashboards.md §1 Z3). The first part
 * is what went on, and the total is every part of the column:
 * - nothing counted: "None in this period";
 * - fewer than `MIN_N`, the tiles' small-sample rule: the counts only, "2 pursued of 3 decided";
 * - otherwise the share, rounded: "33% pursued of 46 decided".
 * `noun` says what the total counts: "decided", "results", "received", "submitted", "entered", "left".
 */
export function splitNote(parts: Pick<FlowPartVM, 'count' | 'label'>[], noun: string): string {
  const total = parts.reduce((n, p) => n + p.count, 0);
  if (!total || !parts.length) return 'None in this period';
  const first = parts[0];
  const n = (v: number) => v.toLocaleString('en-GB');
  if (total < MIN_N) return `${n(first.count)} ${first.label} of ${n(total)} ${noun}`;
  return `${Math.round((first.count / total) * 100)}% ${first.label} of ${n(total)} ${noun}`;
}
