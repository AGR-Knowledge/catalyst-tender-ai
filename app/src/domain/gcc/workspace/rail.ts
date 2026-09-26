import type { Tone } from '@/data/types';
import { can, holdersOf, type CanCtx } from '@/data/access';
import { personById, roleLine, type Person } from '@/data/people';
import { HERO_FILE, HERO_ID, HERO_REF } from '@/data/gcc/hero';
import type { GateRecord } from '@/data/gcc/lifecycle';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { DEFAULT_PERIOD, previousOf, windowOf } from '@/domain/gcc/period';
import { queriesFor, tenderCtx, type DemoDone } from '@/domain/gcc/lifecycle.port';
import { standingGate } from '@/domain/gcc/lifecycle';
import { fitFor, recommendationFor, type SourceRef } from '@/domain/gcc/s1/fit';
import { keyDatesFor, type KeyDateRow } from '@/domain/gcc/s1/dates';
import { blockingOpen } from '@/domain/gcc/s1/validation';
import { packFor, isMasked, type Section98 } from '@/domain/gcc/s3/pack';
import type { WinVM } from '@/domain/gcc/s3/win';
import { reasonLabel as dg1Reason } from '@/domain/gcc/dg1/decision';
import { AGAINST_MAJORITY_TEXT, reasonLabel as dg2Reason } from '@/domain/gcc/dg2/decision';
import { actionSource, type ActionSource } from '../actions';
import { dashboardSpec } from '../dashboards';
import { actionRows } from '../dashboards/build';
import { homeDashboardKey, stageDashboardKey } from '../dashboards/home';
import type { KpiCtx } from '../kpi/types';
import type { ActionVM, GateKey, TenderRowVM, TrackerVM } from '../viewmodels';

/**
 * The Tender Workspace's right rail (ui-direction §5 C2): the agent's
 * recommendation (or the gate's decision once it is made), my next actions,
 * the next key dates and the open blockers. Every block is a read of an
 * existing derivation: 007a for Stage 1, 009a's pack for Stage 3, the
 * lifecycle for decisions, the action-source registry for actions.
 */

/** 007a's source kinds, widened with the kinds Stage 2 and 3 cite (the kit's `SourceChipRef` has the same shape). */
export type RailSourceKind = SourceRef['kind'] | 'addendum' | 'quote' | 'input';
export interface RailSource { label: string; kind: RailSourceKind; page?: number; id?: string; detail?: string; terms?: string[] }
export interface RailDoc { url: string; title: string }

export interface RailRecommendationVM {
  kind: 'card';
  stage: 1 | 3;
  heading: string;
  agent: string;
  verdict: string;
  tone: Tone;
  confidence: string | null;
  confidenceWhy?: string;
  confidenceMasked?: { by: string };
  reasons: string[];
  reasonsMasked?: { by: string };
  wouldChange: string[];
  wouldChangeMasked?: { by: string };
  sources: RailSource[];
}

export interface RailDecisionVM {
  kind: 'decision';
  gate: GateKey;
  label: string;
  tone: Tone;
  byName: string;
  byRole: string | null;
  at: string;
  onTime: boolean;
  /** "Recorded 2 h 10 m after the time limit". */
  timing: string;
  reasons: string[];
  note: string | null;
  /** "Override: the agent recommended Discard", "Approval differs from majority". */
  flag: string | null;
}

export interface RailBlockerVM { variant: 'route' | 'block'; title: string; body?: string }

export interface RailVM {
  recommendation: RailRecommendationVM | RailDecisionVM | null;
  /** The document the page chips open: the hero's booklet, or the tender's own document. */
  doc: RailDoc | null;
  /** Rows that wait on the viewer. */
  actions: ActionVM[];
  /** Rows on this tender that wait on someone else (the Head of Tendering sees them). */
  waiting: ActionVM[];
  dates: { rows: KeyDateRow[]; ahead: number } | null;
  blockers: RailBlockerVM[];
}

export interface RailInput {
  tenant: string;
  viewer: Person;
  viewAs: boolean;
  done: DemoDone;
  now?: string;
  row: TenderRowVM;
  tracker: TrackerVM | null;
}

export const NOTHING_FOR_YOU = 'Nothing on this tender needs you right now.';

const DECISION: Record<GateRecord['decision'], { label: string; tone: Tone }> = {
  pursue: { label: 'Pursue', tone: 'green' }, discard: { label: 'Discard', tone: 'red' }, hold: { label: 'Hold', tone: 'orange' },
  bid: { label: 'Bid', tone: 'green' }, 'no-bid': { label: 'No-Bid', tone: 'red' }, approved: { label: 'Approved', tone: 'green' }, rejected: { label: 'Rejected', tone: 'red' },
};
const REC_WORD: Record<string, string> = { pursue: 'Pursue', conditions: 'Pursue with conditions', discard: 'Discard' };
const VERDICT_TONE: Record<string, Tone> = { pursue: 'green', conditions: 'orange', discard: 'red', bid: 'green', 'bid-with-conditions': 'orange', 'no-bid': 'red' };

const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const agentName = (a: string) => a.replace(/ agent$/i, '');
const HAS_FIGURE = /\d+(\.\d+)?\s?%|\b(SAR|AED|QAR|OMR|KWD|USD|EUR)\s?\d/;

/** Values worth highlighting on a page, from the requirement's words: amounts, counts and acronyms. */
export function termsOf(text: string): string[] {
  const nums = (text.match(/\d[\d,.]*\d/g) ?? []).filter((n) => n.replace(/\D/g, '').length >= 3);
  // Acronyms (GOSI, ZATCA, ISO), not currency codes: "SAR" would light up every money column on the page.
  const caps = (text.match(/\b[A-Z]{3,}\b/g) ?? []).filter((w) => !/^(SAR|AED|QAR|OMR|KWD|USD|EUR|GBP)$/.test(w));
  return [...new Set([...nums, ...caps])].slice(0, 4);
}

export function docFor(row: TenderRowVM): RailDoc | null {
  if (row.id === HERO_ID) return { url: HERO_FILE, title: `Tender booklet ${HERO_REF}` };
  return row.source.documentHref ? { url: row.source.documentHref, title: `Tender document ${row.source.ref}` } : null;
}

/* ------------------------------------------------------------ recommendation */

function stage1Card(tenant: string, id: string, done: DemoDone): RailRecommendationVM | null {
  const rec = recommendationFor(tenant, id, done);
  if (!rec) return null;
  const fit = fitFor(tenant, id, done);
  const lines = fit?.eligibility?.lines ?? [];
  const sources: RailSource[] = rec.sources.map((s) => {
    if (s.kind === 'page') {
      const on = lines.filter((l) => l.state !== 'pass' && l.state !== 'na' && (l.page === s.page || l.alsoOn?.includes(s.page ?? -1)));
      return { ...s, terms: [...new Set(on.flatMap((l) => termsOf(l.text)))].slice(0, 6), detail: on.map((l) => l.reqId).join(', ') || undefined };
    }
    if (s.kind === 'credential') {
      const line = lines.find((l) => l.evidence.some((e) => e.id === s.id));
      return { ...s, detail: line ? `${line.reqId}: ${line.why}` : undefined };
    }
    if (s.kind === 'calc' && fit) return { ...s, detail: `Weighted fit ${fit.weighted} of 100 · pursue at ${fit.thresholds.pursueAt}` };
    return s;
  });
  return {
    kind: 'card', stage: 1, heading: 'Recommendation for DG1', agent: agentName(rec.agent), verdict: rec.recommendation, tone: VERDICT_TONE[rec.verdict] ?? 'ink',
    confidence: `${capital(rec.confidence)} confidence`, confidenceWhy: rec.confidenceWhy,
    reasons: rec.reasons, wouldChange: rec.wouldChange, sources,
  };
}

function stage3Card(tenant: string, id: string, done: DemoDone, viewer: Person, ctx: CanCtx): RailRecommendationVM | null {
  const canSeeMargin = can(viewer, 'see.margin', ctx).ok;
  const canSeePositions = can(viewer, 'see.positions', ctx).ok;
  const pack = packFor(tenant, id, done, { canSeeMargin, canSeePositions });
  if (!pack) return null;
  const s98: Section98 = pack.sections['9.8'].body;
  const win = pack.sections['9.1'].body;
  const winVM = win && !isMasked(win) ? (win as WinVM) : null;
  const packOk = can(viewer, 'pack.view', ctx).ok;
  const sources: RailSource[] = [];
  for (const r of s98.topRisks) if (r.page && !sources.some((s) => s.page === r.page)) sources.push({ kind: 'page', page: r.page, label: `p. ${r.page}`, detail: `${r.clause}: ${r.risk}` });
  if (winVM) sources.push({ kind: 'calc', label: 'Calc: win model', detail: `${winVM.base.label}; ${winVM.comparables} comparable bids` });
  const positionsBy = { by: holdersOf('see.positions') };
  return {
    kind: 'card', stage: 3, heading: 'Bid / No-Bid recommendation', agent: agentName(s98.agent), verdict: s98.label, tone: VERDICT_TONE[s98.recommendation] ?? 'ink',
    confidence: winVM ? `Win ${winVM.p}% ± ${winVM.band}` : null,
    ...(winVM ? { confidenceWhy: winVM.lowDataText ?? winVM.calibration } : {}),
    ...(win && isMasked(win) ? { confidenceMasked: positionsBy } : {}),
    ...(packOk ? { reasons: [s98.rationale, ...s98.winThemes.map((t) => t.text)].slice(0, 3) } : { reasons: [], reasonsMasked: { by: holdersOf('pack.view') } }),
    ...(winVM ? { wouldChange: winVM.movers.map((m) => m.text) } : { wouldChange: [], wouldChangeMasked: positionsBy }),
    sources: packOk ? sources : [],
  };
}

function decisionOf(g: GateRecord, viewer: Person, ctx: CanCtx): RailDecisionVM {
  const d = DECISION[g.decision];
  const by = personById(g.byId);
  const late = !g.onTime;
  const override = g.gate === 'DG1' && g.recommendation
    && ((g.decision === 'pursue' && g.recommendation === 'discard') || (g.decision === 'discard' && g.recommendation === 'pursue'))
    ? `Override: the agent recommended ${REC_WORD[g.recommendation]}` : null;
  const flag = override ?? (g.againstMajority && can(viewer, 'see.positions', ctx).ok ? AGAINST_MAJORITY_TEXT : null);
  const maskFigures = !!g.note && g.gate !== 'DG1' && HAS_FIGURE.test(g.note) && !can(viewer, 'see.margin', ctx).ok;
  // "Approved against the majority of positions" tells a viewer how the committee voted.
  const maskPositions = !!g.note && !!g.againstMajority && !can(viewer, 'see.positions', ctx).ok;
  return {
    kind: 'decision', gate: g.gate, label: d.label, tone: d.tone, byName: by?.name ?? g.byId, byRole: by ? roleLine(by) : null, at: g.at, onTime: g.onTime,
    timing: late ? `Recorded after the ${g.slaHours} h time limit` : `Recorded within the ${g.slaHours} h time limit`,
    reasons: g.reasonCodes.map(reasonText), note: maskFigures ? 'Note masked for your role: it states margin figures' : maskPositions ? 'Note masked for your role: it refers to committee positions' : g.note ?? null, flag,
  };
}

/** A reason code in words, from DG2's list, then DG1's; a code neither knows reads as words. */
export function reasonText(code: string): string {
  const a = dg2Reason(code);
  if (a !== code) return a;
  const b = dg1Reason(code);
  return b !== code ? b : capital(code.replace(/-/g, ' '));
}

/* ------------------------------------------------------------------ actions */

/**
 * The action sources of the dashboards this viewer can open (their home and
 * the stage dashboards `stage.view` allows), through the registries (015 and
 * 013 add them). So the rail never shows a row the viewer's own dashboards
 * would not.
 */
function sourcesFor(viewer: Person): ActionSource[] {
  const keys = new Set<string>([
    ...(homeDashboardKey(viewer) ? [homeDashboardKey(viewer)!] : []),
    ...Array.from({ length: 9 }, (_, i) => i + 1).filter((n) => can(viewer, 'stage.view', { stage: n }).ok).map(stageDashboardKey),
  ]);
  const ids = new Set([...keys].flatMap((k) => dashboardSpec(k)?.actions ?? []));
  return [...ids].flatMap((id) => { const s = actionSource(id); return s ? [s] : []; });
}

function actionsFor(input: RailInput): { mine: ActionVM[]; waiting: ActionVM[] } {
  const { tenant, viewer, viewAs, done, row } = input;
  const window = windowOf(DEFAULT_PERIOD, tenant);
  const ctx: KpiCtx = {
    tenant, viewer, viewAs, window, prev: previousOf(window), done: { ...done }, scope: { kind: 'all' },
    now: input.now ?? DEMO_NOW, dashboard: homeDashboardKey(viewer) ?? 'workspace',
  };
  const rows = actionRows(sourcesFor(viewer), ctx).rows.filter((r) => r.tenderId === row.id);
  return { mine: rows.filter((r) => !r.waitingOn), waiting: rows.filter((r) => !!r.waitingOn) };
}

/* ------------------------------------------------------------------- the rail */

export function workspaceRail(input: RailInput): RailVM {
  const { tenant, viewer, done, row, tracker } = input;
  const l = queriesFor({ tenant, viewer, done }).one(row.id);
  const ctx: CanCtx = l ? tenderCtx(tenant, l) : {};
  const gates = l ? [...l.gates].sort((a, b) => a.at.localeCompare(b.at)) : [];
  // A re-opened decision no longer stands: the gate is open again, as the tracker says.
  const decided = (g: GateKey) => !!l && !!standingGate(l, g);
  const live = row.live;

  let recommendation: RailVM['recommendation'] = null;
  if (live && row.stage === 1 && !decided('DG1')) recommendation = stage1Card(tenant, row.id, done);
  else if (live && row.stage === 3 && !decided('DG2')) recommendation = stage3Card(tenant, row.id, done, viewer, ctx);
  if (!recommendation && gates.length) recommendation = decisionOf(gates[gates.length - 1], viewer, ctx);

  const { mine, waiting } = actionsFor(input);

  const ahead = keyDatesFor(tenant, row.id).filter((d) => !d.past).sort((a, b) => `${a.date}T${a.time ?? '23:59'}`.localeCompare(`${b.date}T${b.time ?? '23:59'}`));
  const dates = ahead.length ? { rows: ahead.slice(0, 3), ahead: ahead.length } : null;

  const blockers: RailBlockerVM[] = [];
  if (tracker?.now?.blocker) blockers.push({ variant: row.health === 'blocked' ? 'block' : 'route', title: tracker.now.blocker });
  if (live && row.stage === 1 && !decided('DG1')) {
    const b = blockingOpen(tenant, row.id, done);
    if (b.count) blockers.push({ variant: 'route', title: b.text, body: 'Pursue unlocks once the flagged fields are confirmed.' });
  }

  return { recommendation, doc: docFor(row), actions: mine, waiting, dates, blockers };
}

