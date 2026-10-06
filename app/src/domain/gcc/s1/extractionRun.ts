import type { TenderRecord } from '@/domain/gcc/documents';
import { isGccRecord } from '@/domain/gcc/documents';
import type { EligibilityResult } from './eligibility';
import { fitFor, recommendationFor, type Verdict } from './fit';
import { shortWhen, tenderOf } from './common';
import type { Done } from './done';
import { dateText, whenText } from '@/domain/calendar';

/**
 * The extraction run an upload plays before it opens the tender (plan 045):
 * about 20 seconds of the Intake & Extraction agent reading the document
 * (pages, identity, key dates, scope, criteria, flags), checking it against
 * the company (eligibility, fit, recommendation) and matching the register.
 *
 * A pure function of the extraction record, the register row and the live
 * eligibility and fit, so every value it reveals is one the tender's own
 * pages show. Each item carries the time it appears, in ms from the drop;
 * the view only compares the clock with those times.
 */

export type RunStepId = 'receive' | 'pages' | 'identify' | 'dates' | 'scope' | 'criteria' | 'flags' | 'company' | 'match' | 'open';

export interface RunItem {
  key: string;
  /** The field's name; absent for a line read as a whole (scope, flags). */
  label?: string;
  /** The value as read, in English. */
  value: string;
  /** The Arabic it was read from, for an Arabic record. */
  ar?: string;
  /** 1-based page in the document. */
  page?: number;
  /** A short status word beside the value ("High", "Matched"). */
  word?: string;
  tone?: 'green' | 'orange' | 'red' | 'ink3';
  /** The eligibility verdict, for the view's own wording. */
  verdict?: EligibilityResult['verdict'];
  /** The recommendation's verdict. */
  rec?: Verdict;
  /** A counter that ticks up while its step runs: "34 of 70". */
  count?: { to: number };
  /** ms from the drop when it appears. */
  at: number;
}

export interface RunStep {
  id: RunStepId;
  /** "Reading pages". */
  label: string;
  /** What the step found, once done: "70 pages", "7 dates". */
  found?: string;
  /** The unit its running count is in: "found" for "9 found". */
  unit?: 'found' | 'pages';
  start: number;
  ms: number;
  items: RunItem[];
}

export interface ExtractionRunScript {
  tenderId: string;
  /** "T-2026-120 · Wadi Zarqa WWTP Phase 1 DBO (PQ)". */
  tenderName: string;
  file: string;
  arabic: boolean;
  steps: RunStep[];
  totalMs: number;
  /** Shown on the run, for the checks: the live fit and eligibility it read. */
  fit: number | null;
  eligibility: EligibilityResult | null;
}

export interface RunOpts {
  file: string;
  done: Done;
  /** The first upload of this file, when it is uploaded again. */
  previous?: { at: string; by?: string };
}

/** About 20 s from the drop to "Opening …" (user decision, 2026-10-06). */
export const RUN_TOTAL_MS = 20_000;

/** Each step's share of the run before scaling. Steps with nothing to reveal drop out and the rest stretch to the total. */
const BASE_MS: Record<RunStepId, number> = {
  receive: 1400, pages: 3200, identify: 2200, dates: 2400, scope: 1800, criteria: 3400, flags: 2000, company: 1800, match: 1200, open: 600,
};

/** A step's first item appears after this lead, and its last one this long before the step ends. */
const LEAD_MS = 260;
const TAIL_MS = 220;

const SCOPE_LINES = 3;

const SEVERITY: Record<'high' | 'medium' | 'low', { word: string; tone: RunItem['tone'] }> = {
  high: { word: 'High', tone: 'red' },
  medium: { word: 'Medium', tone: 'orange' },
  low: { word: 'Low', tone: 'ink3' },
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** [15, 16, 17, 20] → "pp. 15–17, 20". */
export function pagesText(pages: number[]): string {
  const s = [...new Set(pages)].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    runs.push(j > i ? `${s[i]}–${s[j]}` : `${s[i]}`);
    i = j;
  }
  return `${s.length === 1 ? 'p.' : 'pp.'} ${runs.join(', ')}`;
}

type Src = { value: string; page: number; source?: string };

/** The Arabic an item of an Arabic record was read from. */
const arOf = (x: object): string | undefined => ('source' in x && typeof x.source === 'string' ? x.source : undefined);

/** Every field item the record carries, for finding the page (and the Arabic) a top-level value was read from. */
function fieldItems(r: TenderRecord): Src[] {
  const groups = isGccRecord(r) ? Object.values(r.groups).flat() : [];
  return [...(groups as Src[]), ...(r.summary as Src[]), ...(r.submission as Src[]), ...(r.evaluation as Src[])];
}

/** Lines for the company check: the counts as the Eligibility tab words them. */
function countsText(e: EligibilityResult): string {
  const c = e.counts;
  const parts = [`${c.met} met`, c.atRisk && `${c.atRisk} at risk`, c.interpretation && `${c.interpretation} interpretation`, c.fail && `${c.fail} fail`].filter(Boolean);
  return `${plural(e.lines.length, 'line')}: ${parts.join(' · ')}`;
}

type Draft = Omit<RunItem, 'at'>;
type StepDraft = Omit<RunStep, 'start' | 'ms' | 'items'> & { items: Draft[]; keep?: boolean };

export function extractionRun(tenant: string, tenderId: string, record: TenderRecord, opts: RunOpts): ExtractionRunScript | null {
  const t = tenderOf(tenant, tenderId);
  if (!t) return null;
  const items = fieldItems(record);
  const find = (value: string | null) => (value ? items.find((x) => x.value === value) : undefined);
  const withSrc = (d: Draft, s?: { page: number }): Draft => {
    const ar = s && arOf(s);
    return s ? { ...d, page: s.page, ...(ar ? { ar } : {}) } : d;
  };
  const arabic = record.language === 'Arabic';

  // 1. The file as received.
  const ext = /\.([a-z0-9]+)$/i.exec(opts.file)?.[1]?.toUpperCase();
  const receive: StepDraft = {
    id: 'receive', label: 'Receiving the file', found: `${ext ?? 'File'} · ${record.language}`, keep: true,
    items: [
      { key: 'file', label: 'File', value: ext ? `${ext} document` : 'Document' },
      { key: 'pages', label: 'Pages', value: plural(record.pages, 'page') },
      { key: 'lang', label: 'Language', value: record.language },
    ],
  };

  // 2. The pages, with OCR on the scanned ones.
  const ocr = record.ocrPages?.length ? record.ocrPages : null;
  const pages: StepDraft = {
    id: 'pages', label: 'Reading pages', found: `${record.pages} of ${record.pages}`, unit: 'pages', keep: true,
    items: [
      { key: 'read', label: 'Pages read', value: `${record.pages} of ${record.pages}`, count: { to: record.pages } },
      ...(record.scanned ? [{ key: 'ocr', label: 'Scanned pages', value: ocr ? `${pagesText(ocr)}, read by OCR` : 'Some pages are scans, read by OCR' }] : []),
    ],
  };

  // 3. What the document is and who issued it.
  const issued = record.issued ? record.dates.find((d) => d.date === record.issued) : undefined;
  const identify: StepDraft = {
    id: 'identify', label: 'Identifying the document', keep: true,
    items: [
      { key: 'type', label: 'Document type', value: record.docType },
      withSrc({ key: 'issuer', label: 'Issued by', value: record.authority }, find(record.authority)),
      ...(record.parent ? [withSrc({ key: 'parent', label: 'Parent body', value: record.parent }, find(record.parent))] : []),
      ...(record.refNo ? [withSrc({ key: 'ref', label: 'Reference', value: record.refNo }, find(record.refNo))] : []),
      ...(record.issued ? [withSrc({ key: 'issued', label: 'Issued', value: dateText(record.issued) }, issued)] : []),
      { key: 'country', label: 'Country', value: record.country },
      { key: 'mode', label: 'Contract', value: record.mode },
    ],
  };
  identify.found = plural(identify.items.length, 'field');

  // 4. Key dates, as printed.
  const dates: StepDraft = {
    id: 'dates', label: 'Key dates', unit: 'found',
    items: record.dates.map((d, i) => withSrc({ key: `date-${i}`, label: d.label, value: whenText(d.date, d.time) }, d)),
  };
  dates.found = plural(dates.items.length, 'date');

  // 5. Scope: the first lines.
  const scope: StepDraft = {
    id: 'scope', label: 'Scope of work', unit: 'found',
    items: record.scope.slice(0, SCOPE_LINES).map((s, i) => withSrc({ key: `scope-${i}`, value: s.text }, s)),
  };
  scope.found = record.scope.length > SCOPE_LINES ? `${SCOPE_LINES} of ${plural(record.scope.length, 'line')}` : plural(scope.items.length, 'line');

  // 6. Prequalification and eligibility criteria, one by one.
  const criteria: StepDraft = {
    id: 'criteria', label: 'Prequalification criteria', unit: 'found',
    items: record.eligibility.map((e, i) => withSrc({ key: `pq-${i}`, label: e.label, value: e.value }, e)),
  };
  criteria.found = plural(criteria.items.length, 'criterion', 'criteria');

  // 7. Flags and risks.
  const flags: StepDraft = {
    id: 'flags', label: 'Flags and risks', unit: 'found',
    items: record.flags.map((f, i) => withSrc({ key: `flag-${i}`, value: f.title, word: SEVERITY[f.severity].word, tone: SEVERITY[f.severity].tone }, f)),
  };
  flags.found = plural(flags.items.length, 'flag');

  // 8. Against the company: the live eligibility, the fit and the recommendation, as the tender's pages show them.
  const fit = fitFor(tenant, tenderId, opts.done);
  const rec = recommendationFor(tenant, tenderId, opts.done);
  const elig = fit?.eligibility ?? null;
  const eligRow = fit?.rows.find((r) => r.criterion === 'eligibility');
  const company: StepDraft = {
    id: 'company', label: 'Checking against your company', keep: true,
    items: [
      ...(elig
        ? [{ key: 'elig', label: 'Eligibility', value: countsText(elig), verdict: elig.verdict }]
        : eligRow ? [{ key: 'elig', label: 'Eligibility', value: eligRow.reason }] : []),
      ...(fit ? [{ key: 'fit', label: 'Fit score', value: `${fit.weighted} · pursue at ${fit.thresholds.pursueAt}` }] : []),
      ...(rec ? [{ key: 'rec', label: 'Recommendation', value: rec.recommendation, rec: rec.verdict }] : []),
    ],
  };

  // 9. The register.
  const name = `${t.id} · ${t.shortTitle}`;
  const match: StepDraft = {
    id: 'match', label: 'Matching the register', keep: true,
    items: [
      { key: 'match', label: 'Register', value: `Matched to ${name}`, word: 'Matched', tone: 'green' },
      { key: 'source', label: 'Captured from', value: t.sourceDetail },
      opts.previous
        ? { key: 'again', label: 'This file', value: `Already uploaded ${shortWhen(opts.previous.at)}${opts.previous.by ? ` by ${opts.previous.by}` : ''}: linked, not added again` }
        : { key: 'linked', label: 'This file', value: 'Already on the register: linked, not duplicated' },
    ],
  };
  match.found = opts.previous ? 'Uploaded before' : 'Matched';

  // 10. A beat, then the tender.
  const open: StepDraft = { id: 'open', label: `Opening ${t.id}`, keep: true, items: [] };

  const drafts = [receive, pages, identify, dates, scope, criteria, flags, company, match, open].filter((s) => s.keep || s.items.length);
  const base = drafts.reduce((n, s) => n + BASE_MS[s.id], 0);
  const scale = RUN_TOTAL_MS / base;

  let start = 0;
  const steps: RunStep[] = drafts.map((s, idx) => {
    // Whole tens of ms; the last step takes up the rounding so the run ends at the total.
    const ms = idx === drafts.length - 1 ? RUN_TOTAL_MS - start : Math.round((BASE_MS[s.id] * scale) / 10) * 10;
    const gap = s.items.length ? (ms - LEAD_MS - TAIL_MS) / s.items.length : 0;
    const step: RunStep = {
      id: s.id, label: s.label, ...(s.found ? { found: s.found } : {}), ...(s.unit ? { unit: s.unit } : {}), start, ms,
      // A counter shows from the step's start; it ticks to its total by the step's end.
      items: s.items.map((d, i) => ({ ...d, at: Math.round(start + (d.count ? 0 : LEAD_MS + i * gap)) })),
    };
    start += ms;
    return step;
  });

  return {
    tenderId: t.id, tenderName: name, file: opts.file, arabic, steps, totalMs: start,
    fit: fit?.weighted ?? null, eligibility: elig,
  };
}

/** Where the run is at a moment: the running step (or null once over) and the overall share done. */
export function runAt(script: ExtractionRunScript, ms: number): { step: RunStep | null; index: number; share: number } {
  const index = script.steps.findIndex((s) => ms < s.start + s.ms);
  return { step: index < 0 ? null : script.steps[index], index: index < 0 ? script.steps.length : index, share: Math.min(1, Math.max(0, ms / script.totalMs)) };
}
