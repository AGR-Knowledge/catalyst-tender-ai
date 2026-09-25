import type { RoleKey } from '@/data/types';
import { WALK_ORDER, WALK_STEP, roleOf } from '@/data/roles';
import { PORTFOLIO, REPRICE_LOG, FX_EXPOSURE, REDLINES, VALIDATIONS, INTAKE_TODAY } from '@/data/workspace';
import { useLive, FOCUS_ID, type Live } from '@/domain/live';
import { cr, dayMonth, int, pct, plural, pts } from '@/domain/format';
import { useGo } from '@/state/nav';
import { useDemo } from '@/state/store';
import { canSee } from '@/data/access';
import { handKey, handoverFrom, prevOf, readHand } from '@/domain/handover';
import { HAND_MARK } from '@/components/overlays/FlowModals';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { Kpis, Pill, type KpiItem } from '@/components/ui/primitives';
import { ExecDashboard } from './roles/Exec';
import { BidDashboard } from './roles/Bid';
import { CoordDashboard } from './roles/Coord';
import { ProcDashboard } from './roles/Proc';
import { CommDashboard } from './roles/Comm';
import { PropDashboard } from './roles/Prop';
import { CompDashboard } from './roles/Comp';
import { DirDashboard } from './roles/Dir';

function kpisFor(role: RoleKey, l: Live): KpiItem[] {
  const focus = l.byId(FOCUS_ID)!;
  switch (role) {
    case 'exec': {
      const onTime = PORTFOLIO.onTime + (l.submitted ? 1 : 0);
      return [
        { label: 'Active pursuits', value: String(l.active.length), sub: `${cr(Math.round(l.weightedValue))} weighted value` },
        { label: 'Awaiting your decision', value: String(l.dg2Pending.length), sub: l.dg2Pending.length ? 'DG2 packs, SLA 24h' : 'all DG2 packs decided', tone: l.dg2Pending.length ? 'orange' : 'green', subTone: l.dg2Pending.length ? 'orange' : 'green' },
        { label: 'Win rate (trailing 12)', value: pct(PORTFOLIO.winRate, 1), sub: `▲ ${PORTFOLIO.winRateDelta} pts vs prior year`, subTone: 'green' },
        { label: 'Avg. bid margin (base)', value: pct(PORTFOLIO.avgMargin, 1), sub: `▼ ${Math.abs(PORTFOLIO.avgMarginDelta)} pts vs prior year`, subTone: 'red' },
        { label: 'On-time submission', value: '100%', sub: `${onTime} of ${onTime} this quarter`, tone: 'green' },
      ];
    }
    case 'bid': {
      const ready = l.myDg1Ready;
      const waiting = l.myDg1.length - ready.length;
      const atGate = l.mine.filter((t) => t.gate).length;
      return [
        { label: 'My live pursuits', value: String(l.mine.length), sub: `${atGate} at a gate this week` },
        { label: 'DG1 decisions due', value: String(ready.length), sub: ready.length ? `${ready.map((t) => t.id).join(', ')}, SLA 24h` : waiting ? `${waiting} waiting on validation` : 'cleared today', tone: ready.length ? 'red' : 'green', subTone: ready.length ? 'red' : waiting ? 'orange' : 'green' },
        { label: 'Next submission', value: l.myNext ? dayMonth(l.myNext.due) : 'None', sub: l.myNext ? `${l.myNext.id} · ${plural(l.myNext.days, 'day')}` : 'none scheduled' },
        { label: 'Open blockers', value: String(l.blockers.length), sub: l.blockers.length ? l.blockers.map((b) => `1 ${b.label}`).join(', ') : 'nothing blocking', tone: l.blockers.length ? 'orange' : 'green', subTone: l.blockers.length ? 'orange' : 'green' },
        { label: 'Bid coverage', value: `${l.withThree} / ${l.packages.length}`, sub: `${FOCUS_ID} packages with ≥3 quotes` },
      ];
    }
    case 'coord': {
      const open = l.validationsOpen.length;
      const cleared = VALIDATIONS.length - open;
      return [
        { label: 'Captured since 18:00', value: '14', sub: `9 portals, 2 mailboxes, 2 scanned; ${INTAKE_TODAY.length} this morning` },
        { label: 'Awaiting validation', value: String(open), sub: cleared ? `${cleared} cleared this session` : 'fields below confidence threshold', tone: open ? 'orange' : 'green', subTone: open ? 'orange' : 'green' },
        { label: 'Avg. intake to logged', value: '9 min', sub: 'target ≤ 15 min', subTone: 'green' },
        { label: 'Duplicates resolved', value: '3', sub: 'linked to parent tender' },
        { label: 'Missed tenders', value: '0', sub: 'daily reconciliation clean', tone: 'green' },
      ];
    }
    case 'proc': {
      const short = l.packages.length - l.withThree;
      return [
        { label: 'Live RFQs', value: String(l.liveRfqs), sub: `across ${l.packages.length} packages on ${FOCUS_ID}` },
        { label: 'Response rate', value: '79%', sub: '▲ 22 pts since go-live', subTone: 'green' },
        { label: 'Packages with ≥3 quotes', value: `${l.withThree} / ${l.packages.length}`, sub: short ? `${short} needs intervention` : 'full coverage', subTone: short ? 'orange' : 'green' },
        { label: 'Awaiting selection', value: String(l.awaitingBuyer), sub: 'packages not yet locked to BOQ', tone: l.awaitingBuyer ? 'ink' : 'green' },
        { label: 'Nudges sent by agent', value: '118', sub: 'across all live RFQs' },
      ];
    }
    case 'comm': {
      const s = l.scenario;
      return [
        { label: 'Priced BOQ', value: cr(s.price), sub: `${FOCUS_ID} · ${l.m2Frozen ? 'frozen at M2' : s.name.toLowerCase() + ' scenario'}`, subTone: l.m2Frozen ? 'green' : undefined },
        { label: `${s.name} margin`, value: pct(s.marginPct, 1), sub: cr(s.margin, 1) },
        { label: 'Break-even price', value: cr(Math.round(l.cost)), sub: `${pct(s.marginPct, 1)} headroom` },
        { label: 'Re-price events', value: String(REPRICE_LOG.length), sub: 'auto-triggered by input change' },
        { label: 'FX exposure', value: cr(FX_EXPOSURE), sub: 'EUR/USD content' },
      ];
    }
    case 'prop':
      return [
        { label: 'Sections complete', value: `${l.sectionsComplete} / ${l.sectionsTotal}`, sub: pct((l.sectionsComplete / l.sectionsTotal) * 100) },
        { label: 'SME tasks open', value: String(l.sections.sme), sub: `${l.smeOverdue} overdue`, tone: 'orange', subTone: 'orange' },
        { label: 'Simulated score', value: `${Math.round(l.score)} / 100`, sub: `▲ ${Math.round(l.score) - 72} since red-team`, subTone: 'green' },
        { label: 'Reused content', value: '64%', sub: 'from past-bid library' },
        { label: 'Days to submission', value: String(focus.days), sub: dayMonth(focus.due), tone: l.submitted ? 'green' : 'orange' },
      ];
    case 'comp':
      return [
        { label: 'Mandatory coverage', value: pct(l.mandatoryCoverage, l.mandatoryOpen ? 1 : 0), sub: l.mandatoryOpen ? `${plural(l.mandatoryOpen, 'item')} open` : '0 items open', tone: l.mandatoryOpen ? 'ink' : 'green' },
        { label: 'Critical gaps', value: String(l.gaps.critical), sub: l.gaps.critical ? 'blocks DG3' : l.dg3 === 'recorded' ? 'DG3 recorded' : 'DG3 clear to proceed', tone: l.gaps.critical ? 'red' : 'green', subTone: l.gaps.critical ? 'red' : 'green' },
        { label: 'Redlines applied', value: '23', sub: `19 standard, ${REDLINES.length} escalated` },
        { label: 'Risks with owners', value: '17 / 17', sub: '100% assigned', tone: 'green' },
        { label: 'Audit entries', value: int(1842), sub: 'agent and user actions' },
      ];
    case 'dir':
      return [
        { label: 'Live projects', value: String(l.projects.length), sub: `${cr(l.backlog)} backlog` },
        { label: 'Milestones at risk', value: String(l.atRisk), sub: `of ${l.milestones} tracked`, tone: 'orange', subTone: 'orange' },
        { label: 'Margin variance', value: `${pts(l.avgVariance)} pts`, sub: 'avg. vs bid commitment', tone: 'red', subTone: 'red' },
        { label: 'Obligations tracked', value: String(l.obligations), sub: 'imported from the bid' },
        { label: 'Agent alerts (30d)', value: '23', sub: '18 actioned early' },
      ];
    // The GCC role keys (plan 003) have no legacy dashboard.
    default:
      return [];
  }
}

const NO_BODY = () => <></>;

const BODIES: Record<RoleKey, () => JSX.Element> = {
  exec: ExecDashboard, bid: BidDashboard, coord: CoordDashboard, proc: ProcDashboard,
  comm: CommDashboard, prop: PropDashboard, comp: CompDashboard, dir: DirDashboard,
  // GCC role keys (plan 003) never open a legacy dashboard.
  hot: NO_BODY, member: NO_BODY, plan: NO_BODY, fin: NO_BODY, hr: NO_BODY, supplier: NO_BODY, platform: NO_BODY,
};

export function Dashboard({ role }: { role: RoleKey }) {
  const live = useLive();
  const r = roleOf(role);
  const Body = BODIES[role];
  return (
    <div className="view" key={role}>
      <div className="role-intro">
        <Pill>{r.scope}</Pill>
        <p>{r.blurb}</p>
      </div>
      <Received role={role} />
      <Kpis items={kpisFor(role, live)} />
      <Body />
      <WalkBar role={role} />
    </div>
  );
}

/** The package the previous owner handed over, shown until the next hand-over replaces it. */
function Received({ role }: { role: RoleKey }) {
  const live = useLive();
  const { goSection, goPage } = useGo();
  const from = prevOf(role);
  const rec = readHand(live.done[handKey(from)]);
  if (!rec) return null;
  const h = handoverFrom(from, live);
  const who = roleOf(from);
  const at = new Date(rec.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const open = h.items.filter((i) => i.state === 'open').length;
  return (
    <Card className="recv" style={{ marginBottom: 'var(--gap)' }}>
      <CardHead title={`Received from ${who.name}, ${who.short}`} meta={`${at}, ${open ? `${open} open` : 'all ready'}`} />
      {rec.note && <p className="note recv-note">“{rec.note}”</p>}
      {h.items.map((i) => {
        const target = i.anchor ? () => goSection(i.anchor!) : i.path && canSee(role, i.path.slice(1).split(/[/?]/)[0] as never) ? () => goPage(i.path!) : null;
        return (
          <div className={`ho-item s-${i.state}`} key={i.key}>
            <span className="ho-dot" aria-hidden />
            <span className="ho-body"><b>{i.label}</b><span>{i.detail}</span></span>
            <span className={`ho-state ${HAND_MARK[i.state].cls}`}>{HAND_MARK[i.state].t}</span>
            {target && <button type="button" className="btn btn-sm ho-go" onClick={target}>Open</button>}
          </div>
        );
      })}
      <CardFoot>{h.what}. Figures update as the work moves on, so this reflects where things stand now.</CardFoot>
    </Card>
  );
}

function WalkBar({ role }: { role: RoleKey }) {
  const { goRole } = useGo();
  const { openModal } = useDemo();
  const i = WALK_ORDER.indexOf(role);
  const prev = i > 0 ? WALK_ORDER[i - 1] : null;
  const next = i < WALK_ORDER.length - 1 ? WALK_ORDER[i + 1] : null;
  return (
    <div className="walk">
      <div className="steps" aria-hidden>{WALK_ORDER.map((k, n) => <i key={k} className={n <= i ? 'on' : ''} />)}</div>
      <span className="p"><span className="demo-chip">Demo walk-through</span> Step {i + 1} of {WALK_ORDER.length}: {WALK_STEP[role]}. Act here, then sign in as the next owner.</span>
      <div className="btns">
        {prev && <button type="button" className="btn" onClick={() => goRole(prev)}>← {roleOf(prev).short}</button>}
        {next
          ? <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'handover', from: role })}>Hand over to {roleOf(next).short} →</button>
          : <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'handover', from: role })}>Loop back to Stage 1 ↻</button>}
      </div>
    </div>
  );
}
