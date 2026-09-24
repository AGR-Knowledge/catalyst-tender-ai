import type { RoleKey } from '@/data/types';
import { WALK_ORDER, roleOf } from '@/data/roles';
import { PACKAGES, REDLINES, TRANSFORMER_QUOTES, VALIDATIONS } from '@/data/workspace';
import { cr, dayMonth, pct, plural } from './format';
import { FOCUS_ID, type Live } from './live';

/**
 * What one owner passes to the next in the walk-through. Every line is read
 * from live state, so the package shows exactly what was done at this step and
 * what is still open when it crosses over.
 */

export type HandState = 'ready' | 'open' | 'info';

export interface HandItem {
  key: string;
  label: string;
  detail: string;
  state: HandState;
  /** Where the receiver finds it: a section of their dashboard, or a page. */
  anchor?: string;
  path?: string;
}

export interface Handover {
  from: RoleKey;
  to: RoleKey;
  /** What the step produces, in one line. */
  what: string;
  items: HandItem[];
}

export const nextOf = (r: RoleKey): RoleKey => WALK_ORDER[(WALK_ORDER.indexOf(r) + 1) % WALK_ORDER.length];
export const prevOf = (r: RoleKey): RoleKey => WALK_ORDER[(WALK_ORDER.indexOf(r) + WALK_ORDER.length - 1) % WALK_ORDER.length];

export const handKey = (from: RoleKey) => `ho-${from}`;

export interface HandRecord { at: number; note: string }
export function readHand(v: string | undefined): HandRecord | null {
  if (!v) return null;
  try { const r = JSON.parse(v) as HandRecord; return typeof r.at === 'number' ? r : null; } catch { return null; }
}

const ids = (ts: { id: string }[]) => ts.map((t) => t.id).join(', ');

export function handoverFrom(from: RoleKey, l: Live): Handover {
  const to = nextOf(from);
  const focus = l.byId(FOCUS_ID)!;
  const boq = l.boqOf(FOCUS_ID);
  const items: HandItem[] = [];
  const add = (i: HandItem) => items.push(i);

  switch (from) {
    case 'coord': {
      const open = l.validationsOpen.length;
      add({ key: 'val', label: 'Validated tender records', detail: open ? `${VALIDATIONS.length - open} of ${VALIDATIONS.length} flagged fields confirmed. ${plural(open, 'field')} still with the coordinator, marked pending on their tenders` : `All ${VALIDATIONS.length} flagged fields confirmed against source and saved with provenance`, state: open ? 'open' : 'ready', anchor: 'sec-register' });
      const ready = l.myDg1Ready, waiting = l.myDg1.filter((t) => !t.gateReady);
      add({ key: 'dg1', label: 'DG1 packs', detail: ready.length ? `${ids(ready)} ready to decide, with fit-score, rationale and comparables${waiting.length ? `. ${ids(waiting)} waits on validation` : ''}` : waiting.length ? `${ids(waiting)} waiting on validation` : 'No tender waiting at DG1', state: ready.length ? 'ready' : waiting.length ? 'open' : 'info', anchor: 'sec-today' });
      const held = l.active.filter((t) => t.stage === 1 && (t.held || (t.fit ?? 100) < 45));
      if (held.length) add({ key: 'held', label: 'Held at intake', detail: `${ids(held)} held for review rather than opened at DG1`, state: 'info', anchor: 'sec-register' });
      add({ key: 'dates', label: 'Key-dates calendar', detail: `Submission dates for ${plural(l.active.filter((t) => !t.held).length, 'live tender')} on the pipeline calendar`, state: 'info', path: '/pipeline' });
      break;
    }
    case 'bid': {
      const decided = l.tenders.filter((t) => l.done['dg1-' + t.id.slice(-3)]);
      const pursued = decided.filter((t) => l.done['dg1-' + t.id.slice(-3)] === 'pursued');
      add({ key: 'dg1', label: 'DG1 decisions', detail: decided.length ? `${pursued.length ? `${ids(pursued)} pursued and released for RFQs` : 'Nothing pursued'}${decided.length > pursued.length ? `. ${ids(decided.filter((t) => !pursued.includes(t)))} discarded with rationale` : ''}` : `No DG1 decision recorded yet. ${ids(l.myDg1)} still waiting`, state: pursued.length ? 'ready' : 'open', anchor: 'sec-board' });
      const sub = boq?.lines.filter((x) => x.cls === 'sub') ?? [];
      add({ key: 'pkg', label: `${FOCUS_ID} subcontract packages`, detail: `${plural(PACKAGES.length, 'package')} from ${sub.length} BOQ lines worth ${cr(sub.reduce((a, x) => a + x.amount, 0), 1)}. ${l.awaitingBuyer} still to be locked to a quote`, state: l.awaitingBuyer ? 'open' : 'ready', anchor: 'sec-board' });
      add({ key: 'boq', label: 'Bill of quantities', detail: boq ? `${boq.fullLines} lines classified as self-performed or subcontract, so each supplier only sees the lines it was matched to` : 'Not available', state: 'info', path: `/boq?t=${FOCUS_ID}` });
      if (l.clashesOpen) add({ key: 'clash', label: 'Resource clashes', detail: `${plural(l.clashesOpen, 'clash', 'clashes')} still open on the programme, noted in the pack`, state: 'open' });
      break;
    }
    case 'proc': {
      const short = l.packages.length - l.withThree;
      add({ key: 'cov', label: 'Quote coverage', detail: `${l.withThree} of ${l.packages.length} packages have three or more normalised quotes${short ? `, ${short} short` : ''}`, state: short ? 'open' : 'ready', anchor: 'sec-decisions' });
      const tx = TRANSFORMER_QUOTES.find((q) => q.key === l.txChoice);
      add({ key: 'tx', label: 'Transformer award', detail: tx ? `Locked to ${tx.supplier} at ${cr(tx.price, 1)}` : 'Held. Three quotes normalised, selection not yet made', state: tx ? 'ready' : 'open' });
      add({ key: 'sup', label: 'Supplier escalation', detail: l.is('sup') ? 'Structural steel escalation resolved, three bidders responding' : 'Two structural steel bidders still past SLA', state: l.is('sup') ? 'ready' : 'open' });
      add({ key: 'dg2', label: 'DG2 evidence packs', detail: l.dg2Pending.length ? l.dg2Pending.map((t) => `${t.id} at ${t.win}% ±${t.band}`).join(', ') : 'No pack waiting at DG2', state: l.dg2Pending.length ? 'ready' : 'info', anchor: 'sec-decisions' });
      break;
    }
    case 'exec': {
      const gate = l.tenders.filter((t) => ['047', '052'].includes(t.id.slice(-3)));
      const dec = gate.map((t) => ({ t, v: l.done['dg2-' + t.id.slice(-3)] }));
      add({ key: 'dg2', label: 'DG2 decisions', detail: dec.map(({ t, v }) => `${t.id} ${v === 'approved' ? 'approved' : v ? 'declined' : 'undecided'}`).join(', '), state: dec.every((d) => d.v) ? 'ready' : 'open', anchor: 'sec-cost' });
      const released = dec.filter((d) => d.v === 'approved');
      if (released.length) add({ key: 'rel', label: 'Released to Stages 4 and 5', detail: `${ids(released.map((d) => d.t))} now needs a baseline programme and a cost model`, state: 'ready', anchor: 'sec-cost' });
      add({ key: 'cost', label: `${FOCUS_ID} cost inputs`, detail: `${cr(l.cost, 1)} of cost from normalised quotes and delivery norms, ${cr(l.direct, 1)} of it direct`, state: 'ready', anchor: 'sec-cost' });
      break;
    }
    case 'comm': {
      add({ key: 'price', label: 'Price scenario', detail: `${l.scenario.name}: ${cr(l.scenario.price)} at ${pct(l.scenario.marginPct, 1)} margin, win ${l.scenario.win}%`, state: l.m2Frozen ? 'ready' : 'open', anchor: 'sec-sections' });
      add({ key: 'm2', label: 'M2 freeze', detail: l.m2Frozen ? 'Cost and schedule frozen, the commercial volume can be written' : 'Not frozen yet, so the commercial volume stays in draft', state: l.m2Frozen ? 'ready' : 'open' });
      add({ key: 'boq', label: 'Priced BOQ', detail: boq ? `${cr(boq.total)} across ${boq.fullLines} lines, in the client's price schedule format` : 'Not available', state: 'info', path: `/boq?t=${FOCUS_ID}` });
      break;
    }
    case 'prop': {
      add({ key: 'sec', label: 'Drafted sections', detail: `${l.sectionsComplete} of ${l.sectionsTotal} sections in review or approved, each with its sources`, state: l.sectionsComplete === l.sectionsTotal ? 'ready' : 'open', anchor: 'sec-matrix' });
      add({ key: 'sme', label: 'SME tasks', detail: l.smeOverdue ? `${plural(l.smeOverdue, 'task')} overdue, flagged in the matrix` : 'All SME input in', state: l.smeOverdue ? 'open' : 'ready' });
      add({ key: 'score', label: 'Simulated evaluator score', detail: `${Math.round(l.score)} of 100 against the published criteria`, state: 'info' });
      break;
    }
    case 'comp': {
      add({ key: 'dg3', label: 'DG3 record', detail: l.dg3 === 'recorded' ? 'Recorded by the Tender Review Board' : l.dg3 === 'ready' ? 'Pack ready, board not yet convened' : 'Blocked by an open critical gap', state: l.dg3 === 'recorded' ? 'ready' : 'open', anchor: 'sec-projects' });
      add({ key: 'sub', label: 'Submission', detail: l.submitted ? `${FOCUS_ID} submitted, portal receipt captured` : `${FOCUS_ID} not submitted yet, due ${dayMonth(focus.due)}`, state: l.submitted ? 'ready' : 'open' });
      const openRed = REDLINES.filter((r) => r.status === 'Open' && !l.is('redline-' + r.key)).length;
      add({ key: 'red', label: 'Contract positions', detail: `${REDLINES.length} escalated redlines${openRed ? `, ${openRed} still open` : ', all settled'}. They become delivery obligations on award`, state: openRed ? 'open' : 'ready' });
      add({ key: 'obl', label: 'Obligations register', detail: `${l.obligations} obligations from won bids tracked against delivery`, state: 'info', anchor: 'sec-projects' });
      break;
    }
    case 'dir': {
      add({ key: 'loop', label: 'Learning Loop proposal', detail: l.is('loop') ? 'Solar BoP margin correction with the Governance Forum' : 'Solar BoP margin correction not yet sent to the Governance Forum', state: l.is('loop') ? 'ready' : 'open', anchor: 'sec-confidence' });
      add({ key: 'var', label: 'Delivered margin variance', detail: `Solar projects ${l.solarVariance.toFixed(1).replace('-', '−')} pts against bid, fed back into fit-scoring at intake`, state: 'info', anchor: 'sec-intake' });
      add({ key: 'dev', label: 'Deviation corrections', detail: l.is('dev-1') ? 'Jaipur re-sequencing approved and re-baselined' : 'Jaipur inverter deviation still open', state: l.is('dev-1') ? 'ready' : 'open' });
      break;
    }
  }

  const WHAT: Record<RoleKey, string> = {
    coord: 'Validated tender records and DG1 packs',
    bid: 'Pursued tenders, packaged for RFQs',
    proc: 'Normalised quotes and the DG2 evidence',
    exec: 'Bid / No-Bid decisions and released cost inputs',
    comm: 'The priced BOQ and the chosen margin scenario',
    prop: 'Drafted sections for verification',
    comp: 'Verified bid, DG3 record and contract positions',
    dir: 'Delivery lessons for the next intake',
  };
  return { from, to, what: WHAT[from], items };
}

export const handLabel = (r: RoleKey) => `${roleOf(r).name}, ${roleOf(r).short}`;
