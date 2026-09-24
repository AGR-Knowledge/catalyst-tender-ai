/**
 * The derivation layer. Every figure shown in the product is computed here from
 * the static register (src/data) plus the actions taken in the demo (store.done).
 * Screens read these values and keep no copies of their own, so roles stay in sync.
 */
import { PROGRAMMES } from '@/data/programme';
import { CALIBRATION, EFFORT } from '@/data/impact';
import { CLASHES, RESOURCE_PLAN } from '@/data/resources';
import { PORTFOLIO } from '@/data/workspace';
import { slipFor } from './programme';
import { boqFor, type Boq } from './boq';
import { confirmKey, docFor, doubtful, tenderFromUpload } from './intake';
import type { Upload } from '@/state/store';
import { useMemo } from 'react';
import { TENDERS } from '@/data/tenders';
import { STAGES } from '@/data/stages';
import { ROLES } from '@/data/roles';
import { AGENTS } from '@/data/catalog';
import {
  COST_LINES, GAP_BASE, MANDATORY_TOTAL, PACKAGES, PROJECTS, REQUIREMENTS_TOTAL, SCENARIOS, SCORING,
  CV_SUBSTITUTION_SCORE, SECTION_TOTALS, SME_OVERDUE, TRANSFORMER_QUOTES, VALIDATIONS,
  type PackageColumn, type ScenarioKey,
} from '@/data/workspace';
import type { Gate, RoleKey, Tender, Tone } from '@/data/types';
import { useDemo } from '@/state/store';
import { daysUntil } from './format';

export const ME_BID_MANAGER = 'R. Iyer';
export const FOCUS_ID = 'T-2026-041';

export interface LiveTender extends Tender {
  closed: boolean;
  closedReason?: string;
  /** Whether the gate the tender sits at can be decided now (all inputs validated). */
  gateReady: boolean;
  owner: string;
  days: number;
  pendingValidations: number;
}

const personFor = (role: RoleKey) => ROLES.find((r) => r.key === role)!.name;

function stageOwner(t: Tender): string {
  const st = STAGES[t.stage - 1];
  if (t.stage === 4 || t.stage === 8) return t.bidManager;
  return personFor(st.role);
}

export function computeLive(done: Record<string, string>, scenarioKey: ScenarioKey, uploads: Upload[] = []) {
  const is = (k: string) => !!done[k];

  /* ── Commercial model (T-2026-041) ── */
  const cost = COST_LINES.reduce((a, l) => a + l.value, 0);
  const direct = COST_LINES.filter((l) => l.direct).reduce((a, l) => a + l.value, 0);
  const scenarios = SCENARIOS.map((s) => {
    const margin = s.price - cost;
    return { ...s, margin, marginPct: (margin / s.price) * 100, ev: (margin * s.win) / 100 };
  });
  const scenario = scenarios.find((s) => s.key === scenarioKey)!;
  const m2Frozen = is('m2');

  /* ── Coordinator validations ── */
  const validationsOpen = VALIDATIONS.filter((v) => !is(v.key));
  const openFor = (id: string) => validationsOpen.filter((v) => v.tender === id).length;

  /* ── Compliance (T-2026-041) ── */
  const gapClosed = is('gap');
  const gaps = { critical: gapClosed ? 0 : GAP_BASE.critical, major: GAP_BASE.major, minor: GAP_BASE.minor };
  const openGaps = gaps.critical + gaps.major + gaps.minor;
  const coverage = ((REQUIREMENTS_TOTAL - openGaps) / REQUIREMENTS_TOTAL) * 100;
  const mandatoryOpen = gaps.critical;
  const mandatoryCoverage = ((MANDATORY_TOTAL - mandatoryOpen) / MANDATORY_TOTAL) * 100;
  const dg3: 'blocked' | 'ready' | 'recorded' = is('dg3') ? 'recorded' : gapClosed ? 'ready' : 'blocked';

  /* ── Proposal (T-2026-041) ── */
  const smeApproved = done['sec-1'] === 'approved';
  const smeTouched = is('sec-1');
  const sections = {
    drafted: SECTION_TOTALS.drafted,
    sme: SECTION_TOTALS.sme - (smeApproved ? 1 : 0),
    review: SECTION_TOTALS.review + (smeApproved ? 1 : 0),
    approved: SECTION_TOTALS.approved,
  };
  const sectionsTotal = sections.drafted + sections.sme + sections.review + sections.approved;
  const sectionsComplete = sections.review + sections.approved;
  const smeOverdue = SME_OVERDUE - (smeTouched ? 1 : 0);
  const scoring = SCORING.map((x) => (x.key === 'kp' && is('cvs') ? { ...x, score: CV_SUBSTITUTION_SCORE } : x));
  const score = scoring.reduce((a, x) => a + x.score, 0);

  /* ── Procurement (T-2026-041) ── */
  const txChoice = done['q-tx'];
  const packages = PACKAGES.map((p) => {
    let column: PackageColumn = p.column;
    let responded = p.responded;
    let meta = p.meta;
    if (p.key === 'steel') {
      if (is('sup')) { responded = 3; meta = 'escalation resolved'; }
      meta = `${responded} of ${p.invited} responded${meta ? '. ' + meta : ''}`;
    } else if (p.column === 'issued') {
      meta = `${responded} of ${p.invited} responded`;
    }
    if (p.key === 'tx' && txChoice) {
      column = 'approved';
      meta = `Locked to BOQ with ${TRANSFORMER_QUOTES.find((q) => q.key === txChoice)?.supplier ?? ''}`;
    }
    if (p.column === 'evaluated' && is('pkg-' + p.key)) { column = 'approved'; meta = 'Locked to BOQ'; }
    return { ...p, column, responded, meta };
  });
  const withThree = packages.filter((p) => p.responded >= 3).length;
  const liveRfqs = packages.reduce((a, p) => a + p.invited, 0);
  const awaitingBuyer = packages.filter((p) => p.column !== 'approved').length;

  /* ── Tender register, with the demo's decisions applied ── */
  // Documents added through the upload flow join the register as Stage 1 tenders.
  const uploadedOpen = (u: Upload) => { const d = docFor(u); return d ? doubtful(d).filter((f) => !is(confirmKey(u.id, f.idx))).length : 0; };
  const uploaded = uploads.flatMap((u) => { const d = u.tenderId ? docFor(u) : null; return d ? [{ t: tenderFromUpload(u, d, uploadedOpen(u)), open: uploadedOpen(u) }] : []; });
  const uploadOpen = Object.fromEntries(uploaded.map((x) => [x.t.id, x.open]));
  // Documents recognised but not yet added to the register (first upload of each document only).
  const uploadsToReview = uploads.filter((u, i) => { const d = docFor(u); return d && !u.tenderId && !uploads.slice(0, i).some((o) => docFor(o)?.key === d.key); }).length;

  const tenders: LiveTender[] = [...TENDERS, ...uploaded.map((x) => x.t)].map((base) => {
    const t: LiveTender = { ...base, closed: false, gateReady: base.gate !== null, owner: '', days: daysUntil(base.due), pendingValidations: base.source ? uploadOpen[base.id] ?? 0 : openFor(base.id) };
    if (base.source) t.gateReady = t.pendingValidations === 0;
    const short = base.id.slice(-3);

    if (base.id === FOCUS_ID) {
      t.value = scenario.price;
      t.win = scenario.win;
      if (is('submitted')) { t.stage = 8; t.status = 'Submitted, portal receipt captured'; }
      else if (dg3 === 'recorded') { t.stage = 8; t.status = 'DG3 cleared and ready for portal submission'; }
      else if (!gapClosed) t.status = `Drafting ${sectionsComplete}/${sectionsTotal} sections, DG3 blocked on 1 critical gap`;
      else t.status = `Drafting ${sectionsComplete}/${sectionsTotal} sections, DG3 pack ready`;
    }
    if (base.id === 'T-2026-044' && is('win')) t.status = 'Win themes signed off, in M2 reconciliation';
    if (base.id === 'T-2026-056') {
      t.gateReady = t.pendingValidations === 0;
      t.status = t.gateReady ? 'DG1 due, fit-score 82%, fields validated' : `DG1 pending with ${t.pendingValidations} field${t.pendingValidations === 1 ? '' : 's'} in validation`;
    }
    if (base.id === 'T-2026-050' && t.pendingValidations === 0) {
      t.gate = 'DG1'; t.gateReady = true; t.status = 'DG1 due, fit-score 61%, fields validated';
    }
    if (base.id === 'T-2026-054' && is('val-v5')) t.status = 'Low fit, counterparty flag recorded';

    const dg1 = done['dg1-' + short];
    if (base.gate === 'DG1' && dg1) {
      if (dg1 === 'pursued') { t.stage = 2; t.gate = null; t.status = 'Pursued at DG1, RFQs being issued'; }
      else { t.closed = true; t.closedReason = 'Discarded at DG1'; }
    }
    const dg2 = done['dg2-' + short];
    if (base.gate === 'DG2' && dg2) {
      if (dg2 === 'approved') { t.stage = 4; t.gate = null; t.status = 'Approved at DG2, Stages 4 and 5 released'; }
      else { t.closed = true; t.closedReason = 'Declined at DG2'; }
    }
    t.owner = stageOwner(t);
    return t;
  });

  const active = tenders.filter((t) => !t.closed);
  const byId = (id: string) => tenders.find((t) => t.id === id);
  const atGate = (g: Gate) => active.filter((t) => t.gate === g);
  const gateCounts = { DG1: atGate('DG1').length, DG2: atGate('DG2').length, DG3: atGate('DG3').length };
  const totalValue = active.reduce((a, t) => a + t.value, 0);
  const weightedValue = active.reduce((a, t) => a + (t.win != null ? (t.value * t.win) / 100 : 0), 0);
  const dueSoon = active.filter((t) => !t.held && t.days >= 0 && t.days <= 14 && !(t.id === FOCUS_ID && is('submitted')));
  const unassigned = active.filter((t) => !t.bidManager).length;

  const mine = active.filter((t) => t.bidManager === ME_BID_MANAGER);
  const myDg1 = mine.filter((t) => t.gate === 'DG1');
  const myDg1Ready = myDg1.filter((t) => t.gateReady);
  const myNext = [...mine].filter((t) => !t.held && t.days >= 0 && !(t.id === FOCUS_ID && is('submitted'))).sort((a, b) => a.days - b.days)[0];

  const blockers: { key: string; label: string }[] = [];
  if (!is('sup')) blockers.push({ key: 'sup', label: 'supplier' });
  if (!gapClosed) blockers.push({ key: 'gap', label: 'compliance' });
  if (!m2Frozen) blockers.push({ key: 'm2', label: 'commercial' });

  const dg2Pending = active.filter((t) => t.gate === 'DG2');

  const buckets = [
    { label: 'Stages 1-2 · Intake', stages: [1, 2] },
    { label: 'Stage 3 · Bid/No-Bid', stages: [3] },
    { label: 'Stages 4-5 · Baselines', stages: [4, 5] },
    { label: 'Stages 6-7 · Draft & verify', stages: [6, 7] },
    { label: 'Stage 8 · Submission', stages: [8] },
  ].map((b) => ({ ...b, n: active.filter((t) => b.stages.includes(t.stage)).length }));
  const bucketMax = Math.max(...buckets.map((b) => b.n), 1);
  const draftVerify = buckets[3].n;
  const DRAFT_CEILING = 3;

  /* ── Submission (T-2026-041) ── */
  const submitted = is('submitted');
  const canSubmit = m2Frozen && dg3 === 'recorded' && !submitted;
  const submissionMissing: string[] = [];
  if (!m2Frozen) submissionMissing.push('M2 freeze');
  if (dg3 !== 'recorded') submissionMissing.push('DG3 record');

  /* ── Delivery ── */
  // Approving the Jaipur re-sequencing (dev-1) re-baselines the inverter station erection.
  const rebaselined = (key: string) => (key === 'jai' && is('dev-1') ? ['JSP-4030'] : []);
  const projects = PROJECTS.map((p) => ({
    ...p, atRisk: p.key === 'jai' && is('dev-1') ? p.atRisk - 1 : p.atRisk, delta: p.current - p.bid,
    planned: PROGRAMMES[p.key]?.planned ?? p.progress, slip: slipFor(p), rebaselined: rebaselined(p.key),
  }));
  const backlog = projects.reduce((a, p) => a + p.value, 0);
  const avgVariance = projects.reduce((a, p) => a + p.delta, 0) / projects.length;
  const milestones = projects.reduce((a, p) => a + p.milestones, 0);
  const atRisk = projects.reduce((a, p) => a + p.atRisk, 0);
  const obligations = projects.reduce((a, p) => a + p.obligations, 0);
  const solar = projects.filter((p) => p.sector === 'Renewables');
  const solarVariance = solar.reduce((a, p) => a + p.delta, 0) / solar.length;

  /* ── Agents ── */
  const agentEsc: Record<string, string> = {
    'Intake & Extraction': validationsOpen.length ? `${validationsOpen.length} field${validationsOpen.length === 1 ? '' : 's'} open` : 'None',
    'Outreach & Evaluation': txChoice ? 'None' : '1 award held',
    'Win-Probability & Recommendation': dg2Pending.length ? `${dg2Pending.length} pack${dg2Pending.length === 1 ? '' : 's'} pending` : 'None',
    Scheduling: 'None',
    'Costing & Margin': m2Frozen ? 'None' : 'Scenario set open',
    'Drafting & Section Assembly': smeOverdue ? `${smeOverdue} SME task${smeOverdue === 1 ? '' : 's'} overdue` : 'None',
    'Compliance Verification': dg3 === 'blocked' ? 'DG3 blocked' : dg3 === 'ready' ? 'DG3 pack ready' : 'None',
    'Document Assembly & e-Submission': 'None',
    'Delivery Oversight': is('dev-1') ? '1 correction open' : '2 corrections open',
    'Learning Loop': is('loop') ? 'With Governance Forum' : '1 proposal pending',
  };
  const totalRuns = AGENTS.reduce((a, x) => a + x.runs, 0);

  /* ── Alerts (header bell): each persona sees only their own ── */
  type Alert = { key: string; title: string; body: string; when: string; tone: Tone; role: RoleKey; tender?: string; anchor?: string };
  const alerts: Alert[] = [];
  myDg1Ready.forEach((t) => alerts.push({ key: 'dg1-' + t.id, title: 'DG1 decision due', body: `${t.id} ${t.name} · fit-score ${t.fit}%`, when: '24h', tone: 'red', role: 'bid', tender: t.id }));
  if (!gapClosed) alerts.push({ key: 'bid-gap', title: 'DG3 blocked on T-2026-041', body: 'ISO 45001 gap open with Compliance / Legal', when: 'Now', tone: 'red', role: 'bid', anchor: 'sec-today' });
  if (dg3 === 'recorded' && !is('submitted')) alerts.push({ key: 'bid-submit', title: 'Ready to submit', body: `${FOCUS_ID} · DG3 recorded, price frozen`, when: '4d', tone: 'green', role: 'bid', anchor: 'sec-today' });
  if (!gapClosed) alerts.push({ key: 'gap', title: 'Critical compliance gap', body: 'ISO 45001 expires 4 days before submission', when: 'Now', tone: 'red', role: 'comp', anchor: 'sec-gaps' });
  if (dg3 === 'ready') alerts.push({ key: 'dg3', title: 'DG3 pack ready', body: 'Convene the Tender Review Board', when: '48h', tone: 'orange', role: 'comp', anchor: 'sec-gaps' });
  dg2Pending.forEach((t) => alerts.push({ key: 'dg2-' + t.id, title: 'DG2 decision waiting', body: `${t.id} ${t.name} · win ${t.win}% ±${t.band}`, when: t.confidence === 'low' ? '4h' : '14h', tone: t.confidence === 'low' ? 'red' : 'orange', role: 'exec', anchor: 'sec-decisions' }));
  if (!is('sup')) alerts.push({ key: 'sup', title: 'Supplier escalation', body: `Two structural steel bidders past SLA on ${FOCUS_ID}`, when: '2h', tone: 'orange', role: 'proc', anchor: 'sec-board' });
  if (!txChoice) alerts.push({ key: 'tx', title: 'Transformer award held', body: 'Normalised comparison ready for your selection', when: '1d', tone: 'cyan', role: 'proc', anchor: 'sec-quotes' });
  if (validationsOpen.length) alerts.push({ key: 'val', title: 'Fields awaiting validation', body: `${validationsOpen.length} below the confidence threshold`, when: '1h', tone: 'orange', role: 'coord', anchor: 'sec-queue' });
  if (!m2Frozen) alerts.push({ key: 'm2', title: 'Scenario not yet frozen', body: `${FOCUS_ID} commercial volume waits on M2`, when: '1d', tone: 'orange', role: 'comm', anchor: 'sec-scenarios' });
  if (smeOverdue) alerts.push({ key: 'sme', title: `${smeOverdue} SME task${smeOverdue === 1 ? '' : 's'} overdue`, body: 'Substation protection philosophy is 2 days late', when: '2d', tone: 'red', role: 'prop', anchor: 'sec-sections' });
  if (!is('dev-1')) alerts.push({ key: 'dev', title: 'Delivery deviation', body: 'Jaipur Solar inverters 5 weeks behind plan', when: 'Now', tone: 'red', role: 'dir', anchor: 'sec-deviations' });
  if (!is('loop')) alerts.push({ key: 'loop', title: 'Learning Loop proposal', body: 'Solar BoP margin correction pending Governance Forum', when: '1d', tone: 'cyan', role: 'dir', anchor: 'sec-learning' });
  const alertsFor = (r: RoleKey) => alerts.filter((a) => a.role === r);

  const roleAttention: Record<RoleKey, boolean> = {
    exec: dg2Pending.length > 0,
    bid: myDg1Ready.length > 0,
    coord: validationsOpen.length > 0,
    proc: !is('sup'),
    comm: !m2Frozen,
    prop: smeOverdue > 0,
    comp: dg3 !== 'recorded',
    dir: !is('dev-1'),
  };

  // Effort and impact. Submissions this quarter are the same count the dashboards quote.
  const effort = EFFORT.map((e) => ({ ...e, name: STAGES[e.stage - 1].short, saved: e.before - e.now }));
  const effortBefore = effort.reduce((a, e) => a + e.before, 0);
  const effortNow = effort.reduce((a, e) => a + e.now, 0);
  const submittedQuarter = PORTFOLIO.onTime + (submitted ? 1 : 0);
  const hoursReturned = (effortBefore - effortNow) * submittedQuarter;
  const calibration = CALIBRATION.map((c) => { const actual = Math.round((c.won / c.bids) * 100); return { ...c, actual, gap: actual - c.predicted }; });
  const decidedBids = calibration.reduce((a, c) => a + c.bids, 0);
  const calibrationError = Math.round(calibration.reduce((a, c) => a + Math.abs(c.gap) * c.bids, 0) / decidedBids);

  // Resource plan for the focus bid. Approving the temporary hire lifts capacity.
  const crewHired = is('clash-crew');
  const crewCapacity = RESOURCE_PLAN.capacity + (crewHired ? RESOURCE_PLAN.hire : 0);
  const crewMonths = RESOURCE_PLAN.months.map((m) => ({ ...m, over: m.v > RESOURCE_PLAN.capacity }));
  const crewOver = crewMonths.filter((m) => m.over);
  const crewShort = Math.max(0, ...RESOURCE_PLAN.months.map((m) => m.v)) - RESOURCE_PLAN.capacity;
  const contingency = COST_LINES.find((c) => c.key === 'cont')?.value ?? 0;
  // Bills of quantities for every live bid that has one (uploads get theirs with the full RFP).
  const boqs = active.map(boqFor).filter((b): b is Boq => !!b);
  const boqOf = (id: string) => boqs.find((b) => b.tender.id === id) ?? null;
  const boqTenders = boqs.length;

  const clashesOpen = (crewOver.length && !crewHired ? 1 : 0) + CLASHES.filter((c) => !is('clash-' + c.key)).length;

  return {
    done, is,
    tenders, active, byId, gateCounts, totalValue, weightedValue, dueSoon, unassigned,
    mine, myDg1, myDg1Ready, myNext, blockers, dg2Pending, buckets, bucketMax, draftVerify, DRAFT_CEILING,
    cost, direct, scenarios, scenario, m2Frozen,
    validationsOpen, openFor,
    gaps, openGaps, coverage, mandatoryOpen, mandatoryCoverage, dg3, gapClosed,
    sections, sectionsTotal, sectionsComplete, smeOverdue, scoring, score,
    packages, withThree, liveRfqs, awaitingBuyer, txChoice,
    submitted, canSubmit, submissionMissing,
    projects, backlog, avgVariance, milestones, atRisk, obligations, solarVariance,
    agentEsc, totalRuns,
    alerts, alertsFor, roleAttention,
    uploadsToReview,
    boqs, boqOf, boqTenders,
    crewHired, crewCapacity, crewMonths, crewOver, crewShort, contingency, clashesOpen,
    effort, effortBefore, effortNow, submittedQuarter, hoursReturned, calibration, decidedBids, calibrationError,
  };
}

export type Live = ReturnType<typeof computeLive>;

export function useLive(): Live {
  const { state } = useDemo();
  return useMemo(() => computeLive(state.done, state.scenario, state.uploads), [state.done, state.scenario, state.uploads]);
}
