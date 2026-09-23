import { useEffect, useState } from 'react';
import { EXTRACTED } from '@/data/extracted';
import type { ExtractedTender } from '@/data/extracted/types';
import type { Tender } from '@/data/types';
import { TODAY_ISO, TENDERS } from '@/data/tenders';
import type { Upload } from '@/state/store';
import { longDate } from './format';

/**
 * Mock intake service. In production the file goes to the Intake & Extraction
 * Agent; here the demo set in data/bids is recognised by file name and its
 * pre-extracted record is returned once the processing steps have run.
 */

/** Rate used only to show a non-INR document in ₹ crore on the register. */
export const USD_INR = 83;

/** Screening the agent adds on top of the document itself: fit to the bid office's profile. */
const SCREENING: Record<string, { fit: number; reason: string }> = {
  nit: { fit: 78, reason: 'Major bridge on EPC mode, inside the transport portfolio and bonding capacity' },
  'rfp-rangpo': { fit: 74, reason: 'Bridge on EPC mode for NHIDCL, a repeat client; smaller than the usual band' },
  'tor-akkar': { fit: 22, reason: 'Design consultancy for a hospital in Lebanon, outside the EPC works portfolio' },
};

const norm = (s: string) => s.toLowerCase().replace(/\.pdf$/i, '').replace(/[^a-z0-9]/g, '');

export function matchFile(name: string): ExtractedTender | null {
  const n = norm(name);
  return EXTRACTED.find((d) => d.fileNames.some((f) => norm(f) === n)) ?? null;
}

export const docFor = (u: Upload) => matchFile(u.file);

export interface Step { key: string; label: string; detail: string; ms: number }

/** The steps a document goes through. Unknown documents stop after the page read. */
export function stepsFor(doc: ExtractedTender | null, size: number): Step[] {
  const pages = doc?.pages ?? Math.max(1, Math.round(size / 40_000));
  const fields = doc ? fieldCount(doc) : 0;
  const s: Step[] = [
    { key: 'upload', label: 'Uploading', detail: `${(size / 1_048_576).toFixed(1)} MB`, ms: 1800 },
    { key: 'read', label: 'Reading pages', detail: `${pages} page${pages === 1 ? '' : 's'}`, ms: 2600 + pages * 70 },
  ];
  if (!doc) return s;
  return [
    ...s,
    { key: 'text', label: doc.scanned ? 'Running OCR' : 'Extracting text and tables', detail: doc.language, ms: 4200 + pages * 40 },
    { key: 'classify', label: 'Identifying the document', detail: doc.docType, ms: 2600 },
    { key: 'fields', label: 'Extracting fields', detail: `${fields} fields, ${doc.dates.length} dates, ${doc.clauses.length} clauses`, ms: 6500 + pages * 60 },
    { key: 'register', label: 'Checking against the register', detail: 'Duplicates, addenda and past bids', ms: 3200 },
    { key: 'screen', label: 'Screening', detail: 'Fit to the bid office profile', ms: 2600 },
  ];
}

export function fieldCount(d: ExtractedTender): number {
  return d.summary.length + d.dates.length + d.eligibility.length + d.evaluation.length + d.submission.length + d.contacts.length + d.clauses.length + d.scope.length;
}

/** Fields the agent is not sure of, in a stable order, so each can be confirmed by key. */
export function doubtful(d: ExtractedTender) {
  const all = [
    ...d.summary.map((f) => ({ ...f, group: 'Summary' })),
    ...d.eligibility.map((f) => ({ ...f, group: 'Eligibility' })),
    ...d.evaluation.map((f) => ({ ...f, group: 'Evaluation' })),
    ...d.submission.map((f) => ({ ...f, group: 'Submission' })),
  ];
  return all.map((f, i) => ({ ...f, idx: i })).filter((f) => f.confidence !== 'high');
}
export const confirmKey = (uploadId: string, idx: number) => `xf-${uploadId}-${idx}`;

export type Phase = 'processing' | 'ready' | 'unmatched' | 'duplicate';

export interface Progress {
  phase: Phase;
  steps: Step[];
  /** Index of the step running now (steps.length when finished). */
  at: number;
  /** 0 to 1 within the current step. */
  stepPct: number;
  pct: number;
  remainingMs: number;
}

export function progressOf(u: Upload, now: number, uploads: Upload[]): Progress {
  const doc = docFor(u);
  const steps = stepsFor(doc, u.size);
  const total = steps.reduce((a, s) => a + s.ms, 0);
  const elapsed = Math.max(0, now - u.startedAt);
  let at = 0, acc = 0;
  while (at < steps.length && elapsed >= acc + steps[at].ms) { acc += steps[at].ms; at++; }
  const finished = at >= steps.length;
  const stepPct = finished ? 1 : (elapsed - acc) / steps[at].ms;
  const earlier = doc && uploads.find((o) => o.id !== u.id && o.startedAt < u.startedAt && matchFile(o.file)?.key === doc.key);
  const phase: Phase = !finished ? 'processing' : !doc ? 'unmatched' : earlier ? 'duplicate' : 'ready';
  return { phase, steps, at, stepPct, pct: Math.min(1, elapsed / total), remainingMs: Math.max(0, total - elapsed) };
}

/** Re-renders every `ms` while anything is still processing. */
export function useNow(active: boolean, ms = 200): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [active, ms]);
  return active ? now : Date.now();
}

/** The submission date the register should carry: the first date that reads like a bid deadline. */
export function bidDue(d: ExtractedTender) {
  const sub = d.dates.filter((x) => /submi|due|closing|last date/i.test(x.label));
  return sub.find((x) => /end|last|closing|due|on or before/i.test(x.label)) ?? sub.filter((x) => !/start|open/i.test(x.label)).pop() ?? sub.pop() ?? null;
}

export function screeningFor(d: ExtractedTender) {
  return SCREENING[d.key] ?? { fit: 50, reason: 'Screened against the bid office profile' };
}

export function valueCrOf(d: ExtractedTender): { value: number; converted: boolean } {
  if (d.valueCr != null) return { value: d.valueCr, converted: false };
  const usd = d.currency === 'USD' && d.valueDisplay ? Number(d.valueDisplay.replace(/[^0-9.]/g, '')) : 0;
  return { value: Math.round(((usd * USD_INR) / 1e7) * 10) / 10, converted: usd > 0 };
}

/** Next free register number after the seeded tenders and anything already added. */
export function nextTenderId(uploads: Upload[]): string {
  const used = [...TENDERS.map((t) => t.id), ...uploads.map((u) => u.tenderId).filter(Boolean) as string[]];
  const max = Math.max(...used.map((id) => Number(id.slice(-3))));
  return `T-2026-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Register entry for an added upload. `open` is the count of doubtful fields
 * not yet confirmed; a passed bid date holds the tender instead of opening DG1.
 */
export function tenderFromUpload(u: Upload, d: ExtractedTender, open: number): Tender {
  const due = bidDue(d);
  const passed = !due || due.date < TODAY_ISO;
  const sc = screeningFor(d);
  const { value, converted } = valueCrOf(d);
  const lowCount = doubtful(d).filter((f) => f.confidence === 'low').length;
  const portal = d.summary.find((f) => /portal|submission mode|channel/i.test(f.label))?.value ?? 'Not stated';
  const status = !due
    ? 'Held: the document gives no submission date'
    : passed
      ? `Held: bid date ${longDate(due.date)} has passed, check for a re-issue`
      : open ? `DG1 pending with ${open} field${open === 1 ? '' : 's'} to check` : `DG1 due, fit-score ${sc.fit}%`;
  return {
    id: u.tenderId!,
    name: d.shortName,
    client: d.authority.match(/\(([A-Z][A-Za-z&]{1,12})\)/)?.[1] ?? d.authority,
    sector: d.sector,
    value,
    stage: 1,
    due: due?.date ?? TODAY_ISO,
    win: null,
    fit: sc.fit,
    confidence: lowCount > 1 ? 'low' : open ? 'medium' : 'high',
    bidManager: 'R. Iyer',
    gate: passed ? null : 'DG1',
    status,
    source: u.id,
    held: !due ? 'nodate' : passed ? 'passed' : undefined,
    detail: {
      scope: d.title,
      portal,
      bidSecurity: d.summary.find((f) => /security|emd/i.test(f.label))?.value,
      rows: [
        ['Source document', `${u.file}, ${d.pages} pages`],
        ['Reference', d.refNo ?? 'Not printed'],
        ['Estimated value', `${d.valueDisplay ?? 'Not stated'}${converted ? ` (about ₹ ${value} Cr at ₹ ${USD_INR} per US$)` : ''}`],
        ['Screening', `Fit ${sc.fit}%. ${sc.reason}`],
      ],
      events: [
        [stamp(u.startedAt), `Uploaded by ${u.by} and extracted: ${fieldCount(d)} fields from ${d.pages} pages`],
      ],
      note: d.flags[0] ? `${d.flags[0].title}. ${d.flags[0].detail}` : 'No screening flags raised.',
    },
  };
}

const stamp = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Public copy of the demo PDF, so page references can open the source. */
export const sourceUrl = (d: ExtractedTender, page?: number) => `/bids/${encodeURIComponent(d.fileNames[0])}${page ? `#page=${page}` : ''}`;

const COMMON = new Set(['construction', 'including', 'required', 'submitted', 'document', 'documents', 'through', 'between', 'provided', 'authority', 'contractor', 'national', 'project', 'bidders', 'without', 'following', 'respect', 'stated']);

/**
 * What to look for on the source page when checking a value: its figures,
 * the ways a date is usually printed, and a few distinctive words.
 */
export function termsFor(value: string, date?: string, time?: string): string[] {
  const out = new Set<string>();
  if (date) {
    const [y, m, dd] = date.split('-');
    [`${dd}/${m}/${y}`, `${dd}.${m}.${y}`, `${dd}-${m}-${y}`, `${dd}/${m}/${y.slice(2)}`].forEach((t) => out.add(t));
  }
  if (time) out.add(time.replace(':', ''));
  for (const n of value.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const plain = n.replace(/,/g, '');
    if (plain.replace('.', '').length >= 2) { out.add(n); out.add(plain); }
  }
  if (value.length <= 32 && value.length >= 3) out.add(value);
  const words = (value.match(/[A-Za-z][A-Za-z-]{6,}/g) ?? []).filter((w) => !COMMON.has(w.toLowerCase()));
  words.slice(0, 3).forEach((w) => out.add(w));
  return [...out];
}
