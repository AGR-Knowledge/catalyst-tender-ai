import { useEffect, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Clock, ExternalLink, Scale } from 'lucide-react';
import { personById } from '@/data/people';
import {
  coverageBar, isEscalated, kickoffFor, notCovered, overdue, packageCoverage, rfqClock, type KickoffItem, type RfqClock,
} from '@/domain/gcc/s2';
import { Card, Kpis, type KpiItem } from '@/components/ui/primitives';
import { AuditEntry } from '@/components/tender/AuditEntry';
import { EmptyState } from '@/components/tender/EmptyState';
import { SourceHost } from '@/components/tender/SourceHost';
import { When } from '@/components/tender/When';
import { PackagesPanel } from './Packages';
import { ShortlistsPanel } from './Shortlists';
import { RfqsPanel } from './RfqDraft';
import { TrackingPanel } from './PackageBoard';
import { ClarificationsPanel } from './Clarifications';
import { LevellingPanel } from './Levelling';
import { BestFitPanel } from './BestFit';
import { PanelHead, Tag } from './ui';
import { auditOfTender, useDesk, useLiveTenders, useParam, type DeskCtx } from './vm/desk';
import './s2.css';
import { QUOTES_TO_COVER, RFQ_CLOCK_HOURS } from '@/data/gcc/s2';

/**
 * Packages & RFQs (`/sourcing`, spec §8, archetype B/C2) and the Sourcing tab
 * of the Tender Workspace: one desk per tender. The kick-off checklist the DG1
 * pursue created leads the buyer through packaging, shortlists, RFQs (with the
 * 24-hour clock), tracking, levelling and the best-fit mix.
 */

export type Section = 'packages' | 'shortlists' | 'rfqs' | 'tracking' | 'levelling' | 'bestfit' | 'clarifications';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'packages', label: 'Packages' }, { id: 'shortlists', label: 'Shortlists' }, { id: 'rfqs', label: 'RFQs' },
  { id: 'tracking', label: 'Tracking' }, { id: 'levelling', label: 'Levelling' }, { id: 'bestfit', label: 'Best fit' },
  { id: 'clarifications', label: 'Clarifications' },
];

const isSection = (s: string | null): s is Section => !!s && SECTIONS.some((x) => x.id === s);

/** The first step still open, so the desk opens where the work is. */
function firstOpen(items: KickoffItem[] | undefined): Section {
  const open = (k: string) => items?.find((i) => i.key === k)?.state === 'open';
  return open('packaging') ? 'packages' : open('shortlists') ? 'shortlists' : open('rfqs') ? 'rfqs' : 'tracking';
}

/** "RFQs issued within 24 h of DG1": the live clock (SRC-1). */
export function ClockLine({ clock }: { clock: RfqClock | null }) {
  if (!clock) return null;
  const done = clock.sent >= clock.total;
  return (
    <span className={`s2-clock t-${clock.tone}`} role="timer" aria-live="off">
      <Clock size={13} aria-hidden />
      <b>RFQs issued within {RFQ_CLOCK_HOURS} h of DG1:</b>
      <span className="num">{done ? `all ${clock.total} packages issued` : `${clock.left}${clock.leftMin > 0 ? ' left' : ''} · ${clock.sent} of ${clock.total} packages issued`}</span>
      <span className="s2-muted">· due {clock.dueText}</span>
    </span>
  );
}

function Kickoff({ desk, section, onSection, onInputs }: { desk: DeskCtx; section: Section; onSection(s: Section): void; onInputs?(): void }) {
  const k = kickoffFor(desk.tenant, desk.tenderId, desk.done);
  if (!k) return null;
  const steps = k.items.filter((i) => !i.inputKey);
  const inputs = k.items.filter((i) => i.inputKey);
  const target: Record<string, Section> = { packaging: 'packages', shortlists: 'shortlists', rfqs: 'rfqs' };
  const by = personById(k.pursuedById)?.name ?? k.pursuedById;
  return (
    <Card>
      <PanelHead
        title="Bid workspace checklist"
        sub={<>Created by the DG1 Pursue, recorded by {by} <When date={k.pursuedAt.slice(0, 10)} time={k.pursuedAt.slice(11, 16)} short />. Each item has an owner and a due time.</>}
      />
      <ol className="s2-steps">
        {steps.map((s, i) => {
          const sec = target[s.key];
          return (
            <li key={s.key}>
              <button type="button" className={`s2-step st-${s.state} ${sec === section ? 'on' : ''}`} aria-current={sec === section ? 'step' : undefined} onClick={() => onSection(sec)}>
                <span className="s2-step-n" aria-hidden>{s.state === 'done' ? <Check size={12} /> : i + 1}</span>
                <span className="s2-step-b">
                  <span className="s2-step-l">{s.label}</span>
                  <span className="s2-step-s">{s.stateText}</span>
                  <span className="s2-step-o">{s.ownerName} · due <When date={s.due.slice(0, 10)} time={s.due.slice(11, 16)} short /></span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {steps.find((s) => s.key === 'rfqs')?.clock && <div className="s2-pad-x"><ClockLine clock={steps.find((s) => s.key === 'rfqs')!.clock!} /></div>}
      <div className="s2-inputs s2-pad-x">
        <span className="s2-label">Internal inputs for the Bid / No-Bid pack</span>
        <ul>
          {inputs.map((i) => (
            <li key={i.key}>
              <span>{i.label}</span> <span className="s2-muted">{i.ownerName} · due <When date={i.due.slice(0, 10)} short /></span>{' '}
              <Tag tone={i.state === 'submitted' ? 'green' : i.state === 'requested' ? 'ink' : 'orange'}>{i.stateText}</Tag>
            </li>
          ))}
        </ul>
        {onInputs && <button type="button" className="btn-link" onClick={onInputs}>Request them from the Inputs tab</button>}
      </div>
    </Card>
  );
}

/** The latest sourcing actions on the tender, from its audit trail: each change traced. */
function Activity({ desk }: { desk: DeskCtx }) {
  const list = auditOfTender(desk.audit, desk.tenderId).slice(-6).reverse();
  if (!list.length) return null;
  return (
    <Card>
      <PanelHead title="Latest sourcing activity" sub="From the tender's audit trail." />
      <div className="s2-pad">
        {list.map((e) => {
          const p = personById(e.actorId);
          const hide = e.sensitive === 'quotes' && !desk.seesQuotes;
          return <AuditEntry key={e.id} actor={{ name: p?.name ?? e.actorId, role: p?.title ?? 'Supplier' }} at={e.at} action={e.action} detail={hide ? 'Details masked for your role (quotes)' : e.detail} />;
        })}
      </div>
    </Card>
  );
}

export function SourcingDesk({ tenderId, check, onInputs }: { tenderId: string; check?: DeskCtx['check']; onInputs?(): void }) {
  const desk = useDesk(tenderId, { check });
  const [param, setParam] = useParam('s');
  const k = kickoffFor(desk.tenant, tenderId, desk.done);
  const section: Section = isSection(param) ? param : firstOpen(k?.items);
  const go = (s: Section) => setParam(s);

  if (!k) {
    return <Card><EmptyState title="Sourcing starts with a DG1 Pursue." body="This tender is not being sourced now. If DG1 was re-opened, sourcing resumes when Pursue is recorded again." /></Card>;
  }

  let body: ReactNode;
  switch (section) {
    case 'packages': body = <PackagesPanel desk={desk} onApproved={() => go('shortlists')} />; break;
    case 'shortlists': body = <ShortlistsPanel desk={desk} onAllApproved={() => go('rfqs')} />; break;
    case 'rfqs': body = <RfqsPanel desk={desk} onAllSent={() => go('tracking')} />; break;
    case 'tracking': body = <TrackingPanel desk={desk} />; break;
    case 'levelling': body = <LevellingPanel desk={desk} />; break;
    case 'bestfit': body = <BestFitPanel desk={desk} />; break;
    case 'clarifications': body = <ClarificationsPanel desk={desk} />; break;
  }

  return (
    <div className="s2-desk">
      <Kickoff desk={desk} section={section} onSection={go} onInputs={onInputs} />
      <nav className="seg s2-seg" aria-label="Sourcing sections">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className={s.id === section ? 'on' : ''} aria-current={s.id === section ? 'page' : undefined} onClick={() => go(s.id)}>{s.label}</button>
        ))}
      </nav>
      {body}
      <Activity desk={desk} />
    </div>
  );
}

/** The header strip for one tender (catalogue §D: SRC-1, SRC-2, SRC-4, SRC-7). */
function strip(desk: DeskCtx): KpiItem[] {
  const { tenant, tenderId, done } = desk;
  const clock = rfqClock(tenant, tenderId, done);
  const cov = packageCoverage(tenant, tenderId, done);
  const od = overdue(tenant, done).rfqs.filter((r) => r.tenderId === tenderId);
  const esc = od.filter((r) => isEscalated(tenant, r)).length;
  const nc = notCovered(tenant, tenderId);
  const cap = coverageBar(tenant, tenderId)?.subcontractCap;
  return [
    { label: 'RFQ clock', value: clock ? (clock.sent >= clock.total ? 'All issued' : clock.left) : 'Closed', tone: clock?.tone ?? 'ink', sub: clock ? `${clock.sent} of ${clock.total} packages issued` : `The ${RFQ_CLOCK_HOURS} hours from DG1 are over` },
    { label: 'Packages covered', value: `${cov.covered} of ${cov.total}`, tone: cov.covered === cov.total ? 'green' : 'ink', sub: `${QUOTES_TO_COVER} compliant, levelled quotes, or an accepted gap` },
    { label: 'Overdue RFQs', value: String(od.length), tone: esc ? 'red' : od.length ? 'orange' : 'green', sub: od.length ? `${esc} escalated to the Procurement Lead` : 'None past the reply date' },
    { label: 'Not covered', value: nc ? `${nc.pct.toFixed(1)}%` : '0%', tone: nc?.tone ?? 'green', sub: cap ? cap.text : 'Of the BOQ value' },
  ];
}

function Strip({ tenderId }: { tenderId: string }) {
  const desk = useDesk(tenderId);
  const items = useMemo(() => strip(desk), [desk]);
  return <Kpis items={items} />;
}

export default function Sourcing() {
  const tenders = useLiveTenders();
  const [t, setT] = useParam('tender');
  const navigate = useNavigate();
  const current = tenders.find((x) => x.id === t) ?? tenders[0];
  useEffect(() => { if (current && t && t !== current.id) setT(current.id); }, [current, t, setT]);

  if (!current) {
    return (
      <div className="view">
        <Card><EmptyState title="No tenders are being sourced now." body="A tender arrives here when its Bid Manager records Pursue at DG1." /></Card>
      </div>
    );
  }
  return (
    <SourceHost>
      <div className="view s2-page">
        <div className="s2-picker" role="group" aria-label="Tender being sourced">
          {tenders.map((x) => (
            <button key={x.id} type="button" className={`s2-tender ${x.id === current.id ? 'on' : ''}`} aria-pressed={x.id === current.id} onClick={() => setT(x.id)}>
              <span className="mono">{x.id}</span>
              <span className="s2-tender-t">{x.title}</span>
              {x.mine && <Tag tone="cyan">Yours</Tag>}
            </button>
          ))}
          <span className="s2-grow" />
          <Link className="btn btn-sm" to={`/levelling?tender=${encodeURIComponent(current.id)}`}><Scale size={12} aria-hidden /> Quote levelling</Link>
          <button type="button" className="btn btn-sm" onClick={() => navigate(`/tenders/${encodeURIComponent(current.id)}?tab=sourcing`)}><ExternalLink size={12} aria-hidden /> Open workspace</button>
        </div>
        <Strip key={`strip:${current.id}`} tenderId={current.id} />
        <SourcingDesk key={`desk:${current.id}`} tenderId={current.id} onInputs={() => navigate(`/tenders/${encodeURIComponent(current.id)}?tab=inputs`)} />
      </div>
    </SourceHost>
  );
}
