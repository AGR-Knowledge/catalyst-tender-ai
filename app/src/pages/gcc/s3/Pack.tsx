import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Send, Scale } from 'lucide-react';
import { holdersOf, type CanCtx, type CanResult, type Capability } from '@/data/access';
import { committeeOf, type Person } from '@/data/people';
import { useDemo } from '@/state/store';
import { documentFor } from '@/domain/gcc/documents';
import {
  isMasked, isWriteError, issueBlockers, lensFor, MASKED_TEXT, nudgeWrite, packFor, packIssueWrite, packNoteWrite, packRerunWrite, packVersionsFor,
  stampText, type InputItem, type PackVM, type PackViewer,
} from '@/domain/gcc/s3';
import type { PackSectionId } from '@/data/gcc/s3';
import { decisionState } from '@/domain/gcc/dg2';
import { Callout } from '@/components/tender/Callout';
import { EmptyState } from '@/components/tender/EmptyState';
import { Masked } from '@/components/tender/Masked';
import { Money } from '@/components/tender/Money';
import { SlaClock } from '@/components/tender/SlaClock';
import { ThresholdBar } from '@/components/tender/ThresholdBar';
import { Card } from '@/components/ui/primitives';
import { ConfirmModal, Effects } from './Confirm';
import { sectionDomId } from './sections/Section';
import { WinSection } from './sections/Win';
import { CompetitorsSection, EligibilitySection } from './sections/Competitors';
import { CapacitySection } from './sections/Capacity';
import { FinancialSection } from './sections/Financial';
import { MarginSection, RisksSection } from './sections/Risks';
import { RecommendationSection } from './sections/Recommendation';
import { FreshnessSection, InputsSection } from './sections/Inputs';
import './s3.css';

/**
 * One Bid / No-Bid pack (spec §9): a summary, then sections 9.1–9.10, each
 * with its source and freshness. Every figure is `packFor`'s, read with the
 * viewer's sight. The Bid Manager re-runs a stale pack, issues it to the
 * committee and writes the presenter's note; a member opens it at their lens.
 *
 * - `page` (`/packs?tender=`): the summary sticks under the top bar.
 * - `tab` (the workspace's Bid / No-Bid tab): the workspace header sticks; the summary scrolls.
 * - `gate` (the DG2 screen's left column): no actions, folded sections, the lens open.
 */

export type PackMode = 'page' | 'tab' | 'gate';

/** The two checks a pack screen needs: `can()` for this tender, and whether the viewer holds a capability at all (so View as shows it disabled, with why). */
export interface PackAccess { check(cap: Capability, extra?: Partial<CanCtx>): CanResult }

const SECTION_ORDER: PackSectionId[] = ['9.1', '9.2', '9.3', '9.4', '9.5', '9.6', '9.7', '9.8', '9.9', '9.10'];
/** The gate leads with the recommendation (ui-direction §5 D); the evidence follows. */
const GATE_ORDER: PackSectionId[] = ['9.8', '9.1', '9.2', '9.3', '9.4', '9.5', '9.6', '9.7', '9.9', '9.10'];
const SHORT: Record<PackSectionId, string> = {
  '9.1': 'Win', '9.2': 'Competitors', '9.3': 'Eligibility', '9.4': 'Capacity', '9.5': 'Finance', '9.6': 'Risks', '9.7': 'Margin', '9.8': 'Recommendation', '9.9': 'Inputs', '9.10': 'Freshness',
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Where the pack opens for this person (catalogue §C.5). */
export function lensOf(person: Person): PackSectionId | 'top' {
  return person.seat ? lensFor(person.seat) : person.role === 'hot' || person.role === 'bid' ? lensFor(person.role) : 'top';
}

export function PackView({ tenant, tenderId, mode, access, sight, onOpenInputs }: {
  tenant: string;
  tenderId: string;
  mode: PackMode;
  access: PackAccess;
  sight: PackViewer;
  onOpenInputs?: () => void;
}) {
  const { state, mark, logAudit, toast, nextAt } = useDemo();
  const { person, done } = state;
  const pack = useMemo(() => packFor(tenant, tenderId, done, sight), [tenant, tenderId, done, sight]);
  const ds = useMemo(() => decisionState(tenant, tenderId, done), [tenant, tenderId, done]);
  const pv = useMemo(() => packVersionsFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const blockers = useMemo(() => issueBlockers(tenant, tenderId, done), [tenant, tenderId, done]);
  const doc = useMemo(() => {
    const d = documentFor(tenant, tenderId);
    return d ? { url: d.url, title: d.title } : null;
  }, [tenant, tenderId]);
  const lens = lensOf(person);
  const [issueOpen, setIssueOpen] = useState(false);
  const [reason, setReason] = useState('');

  // A member's pack opens at their lens (catalogue §C.5); the rest is one scroll away.
  useEffect(() => {
    if (mode === 'gate' || lens === 'top' || !pack) return;
    const t = window.setTimeout(() => document.getElementById(sectionDomId(lens))?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(t);
    // Only on opening the pack, not on every write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId, mode, lens]);

  if (!pack) {
    return (
      <Card>
        <EmptyState
          title="No Bid / No-Bid pack for this tender yet."
          body="The Win-Probability & Recommendation agent generates the pack in Stage 3, once sourcing is done and the contributors have been asked for their inputs."
        />
      </Card>
    );
  }

  const issueCheck = access.check('pack.issue');
  const holds = (cap: Capability) => access.check(cap, { viewAs: false }).ok;
  const current = pv.current!;
  const notIssued = !current.issuedAt;
  const behind = !!pv.issued && pv.issued.version < current.version;
  const stale = pack.sections['9.10'].body.freshness.stale;

  const rerun = () => {
    const w = packRerunWrite(tenant, tenderId, done, person.id, nextAt());
    if (isWriteError(w)) { toast(w.error, 'red'); return; }
    mark(w.key, `Pack v${current.version + 1} generated. v${current.version} is kept for comparison.`, 'green', w.value);
    logAudit(w.audit);
  };

  const issuePreview = packIssueWrite(tenant, tenderId, done, person.id, blockers.length ? reason || 'preview' : undefined, nextAt());
  const issue = () => {
    const w = packIssueWrite(tenant, tenderId, done, person.id, blockers.length ? reason : undefined, nextAt());
    if (isWriteError(w)) { toast(w.error, 'red'); return; }
    const members = committeeOf(tenant);
    mark(w.key, `Pack v${current.version} issued to the committee. ${members.length} members notified.`, 'green', w.value);
    logAudit(w.audit);
    logAudit({ actorId: person.id, action: 'Committee notified', target: tenderId, detail: `Pack v${current.version} sent to ${members.map((m) => `${m.name} (${m.title})`).join(', ')}` });
    setIssueOpen(false);
    setReason('');
  };

  const saveNote = (text: string): string | null => {
    const w = packNoteWrite(tenderId, text, person.id, nextAt());
    if (isWriteError(w)) return w.error;
    mark(w.key, "Presenter's note saved. The numbers are unchanged.", 'green', w.value);
    logAudit(w.audit);
    return null;
  };

  const nudge = (i: InputItem) => {
    const w = nudgeWrite(i.nudgeTarget, person.id, `${i.label} from ${i.ownerName}, for ${i.feeds}`);
    mark(w.key, `${i.ownerName} nudged about ${i.label.toLowerCase()}.`, 'green', w.value);
    // The nudge target is the input; the audit trail files it under the tender.
    logAudit({ ...w.audit, target: tenderId });
  };

  const actions = mode !== 'gate' && (
    <div className="pk-sum-acts">
      {holds('pack.issue') && (
        <Action
          label="Re-run" icon={<RefreshCw size={13} aria-hidden />} check={issueCheck} onClick={rerun}
          primary={!!stale && !behind} id={`rerun-${tenderId}`}
        />
      )}
      {holds('pack.issue') && notIssued && (
        <Action
          label="Issue pack to committee" icon={<Send size={13} aria-hidden />} primary={!stale || behind}
          check={blockers.length && issueCheck.ok ? { ok: false, reason: `${plural(blockers.length, 'input')} outstanding` } : issueCheck}
          onClick={() => setIssueOpen(true)} id={`issue-${tenderId}`}
          extra={blockers.length > 0 && issueCheck.ok ? <button type="button" className="btn-link" onClick={() => setIssueOpen(true)}>Issue anyway, with a reason</button> : null}
        />
      )}
      {mode !== 'page' || !holds('dg2.view') ? null : pv.issued && <Link className="btn btn-sm" to={`/dg2?tender=${encodeURIComponent(tenderId)}`}><Scale size={13} aria-hidden />Open DG2</Link>}
    </div>
  );

  const sectionProps = (id: PackSectionId) => ({ collapsible: mode === 'gate', open: mode !== 'gate' || id === '9.8', lens: lens === id });
  const s = pack.sections;
  const sections: Record<PackSectionId, ReactNode> = {
    '9.1': <WinSection sec={s['9.1']} {...sectionProps('9.1')} />,
    '9.2': <CompetitorsSection sec={s['9.2']} {...sectionProps('9.2')} />,
    '9.3': <EligibilitySection sec={s['9.3']} tenderId={tenderId} {...sectionProps('9.3')} />,
    '9.4': <CapacitySection sec={s['9.4']} {...sectionProps('9.4')} />,
    '9.5': (
      <FinancialSection
        sec={s['9.5']} {...sectionProps('9.5')}
        provisional={{ after: pack.facilityAfter, basis: pack.facilityAfterBasis, source: pack.facilityAfterSource, note: pack.summary.facilityAfterNote }}
      />
    ),
    '9.6': <RisksSection sec={s['9.6']} doc={doc} {...sectionProps('9.6')} />,
    '9.7': <MarginSection sec={s['9.7']} {...sectionProps('9.7')} />,
    '9.8': (
      <RecommendationSection
        sec={s['9.8']} summary={pack.summary} win={s['9.1'].body} doc={doc} {...sectionProps('9.8')}
        noteCheck={holds('pack.note') ? access.check('pack.note') : null}
        onSaveNote={saveNote}
      />
    ),
    '9.9': (
      <InputsSection
        sec={s['9.9']} {...sectionProps('9.9')} onOpenInputs={mode === 'tab' ? onOpenInputs : undefined} contacts={mode === 'gate'}
        nudgeCheck={holds('input.request') ? access.check('input.request') : null} onNudge={nudge}
      />
    ),
    '9.10': <FreshnessSection sec={s['9.10']} {...sectionProps('9.10')} />,
  };

  return (
    <div className={`pk mode-${mode}`}>
      <Summary pack={pack} mode={mode} actions={actions} slaStart={ds.slaStart} slaDue={ds.slaDue} decided={!!ds.decision} slaText={ds.slaText} />

      {stale && !behind && (
        <Callout
          variant="stale" title={`Pack is stale. ${stale.reason}.`}
          action={holds('pack.issue') && mode !== 'gate' ? <Action label="Re-run" icon={<RefreshCw size={13} aria-hidden />} check={issueCheck} onClick={rerun} id={`rerun2-${tenderId}`} /> : undefined}
        >
          Pack generated {stampText(current.generatedAt)}. Sections {stale.affected.join(', ')} are affected{stale.packages.length ? `; ${plural(stale.packages.length, 'package')} to re-quote` : ''}. A re-run keeps this version for comparison.
        </Callout>
      )}
      {behind && ds.staleAck && (
        <Callout variant="route" title={ds.staleAck.reason}>
          Issue v{current.version} so the committee decides on it. The DG2 clock keeps running from the first issue.
        </Callout>
      )}
      {notIssued && !behind && blockers.length > 0 && mode !== 'gate' && (
        <Callout variant="route" title={`Issue waits for ${plural(blockers.length, 'input')}`}>
          {blockers.map((b) => `${b.label} from ${b.ownerName} (${b.dueText.toLowerCase()})`).join('; ')}.
        </Callout>
      )}
      {lens !== 'top' && mode !== 'gate' && (
        <p className="pk-lensnote">
          Opened at <button type="button" className="btn-link" onClick={() => document.getElementById(sectionDomId(lens))?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>{lens} {s[lens].title}</button>, the {person.title}&apos;s lens. The rest of the pack is above and below.
        </p>
      )}

      <div className="pk-secs">
        {(mode === 'gate' ? GATE_ORDER : SECTION_ORDER).map((id) => <Fragment key={id}>{sections[id]}</Fragment>)}
      </div>

      <ConfirmModal
        open={issueOpen} eyebrow="Bid / No-Bid pack" title={`Issue pack v${current.version} to the committee`}
        sub={pack.title}
        confirmLabel="Issue pack"
        disabledReason={blockers.length && !reason.trim() ? `Give a reason to issue with ${plural(blockers.length, 'input')} outstanding` : null}
        onConfirm={issue} onClose={() => setIssueOpen(false)}
      >
        <Effects items={[
          ...(isWriteError(issuePreview) ? [] : (issuePreview.audit.detail ?? '').split(' · ').filter((x) => !/^v\d+$/.test(x) && !x.startsWith('Issued with'))),
          `Notifies ${committeeOf(tenant).map((m) => m.name).join(', ')}`,
          'Each member opens the pack at the section they care about',
        ]} />
        {blockers.length > 0 && (
          <>
            <Callout variant="route" compact title={`${plural(blockers.length, 'input')} still outstanding`}>
              {blockers.map((b) => `${b.label} (${b.ownerName})`).join('; ')}. The sections they feed say so in the pack.
            </Callout>
            <label className="s3-field">
              <span className="s3-l">Why issue now (required)</span>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: the committee meets at 14:00; Finance will confirm headroom in the meeting." data-autofocus />
            </label>
          </>
        )}
      </ConfirmModal>
    </div>
  );
}

/** A pack action: the button, and beside it the reason when it is disabled. */
function Action({ label, icon, check, onClick, primary = false, id, extra }: { label: string; icon?: ReactNode; check: CanResult; onClick(): void; primary?: boolean; id: string; extra?: ReactNode }) {
  const why = `${id}-why`;
  return (
    <span className="pk-act">
      <button type="button" className={`btn btn-sm ${primary ? 'btn-primary' : ''}`} onClick={onClick} disabled={!check.ok} aria-describedby={check.ok ? undefined : why}>
        {icon}{label}
      </button>
      {!check.ok && <span className="pk-why" id={why}>{check.reason}</span>}
      {extra}
    </span>
  );
}

/** The pack's first screen: the verdict and the figures the committee asks about first. */
function Summary({ pack, mode, actions, slaStart, slaDue, slaText, decided }: {
  pack: PackVM; mode: PackMode; actions: ReactNode; slaStart?: string; slaDue?: string; slaText: string; decided: boolean;
}) {
  const s = pack.summary;
  const win = pack.sections['9.1'].body;
  const rec = pack.sections['9.8'].body;
  const tone = rec.recommendation === 'bid' ? 'green' : rec.recommendation === 'no-bid' ? 'red' : 'orange';
  const fresh = pack.sections['9.10'].body.freshness;
  const nav = SECTION_ORDER.map((id) => ({ id, f: pack.sections[id].freshness }));
  return (
    <div className={`pk-summary ${mode === 'page' ? 'sticky' : ''}`} role="region" aria-label="Pack summary">
      <div className="pk-sum-top">
        <div className="pk-sum-id">
          <span className="pk-eyebrow">
            Bid / No-Bid pack · <span className="mono">v{pack.version}</span> · generated {stampText(pack.generatedAt)}
            {pack.issuedAt ? ` · issued ${stampText(pack.issuedAt)}` : ' · not issued'}
            {s.stale && <span className="pk-fresh tone-orange"><RefreshCw size={10} aria-hidden />{s.staleBadge}</span>}
          </span>
          {mode === 'page' && <h2 className="pk-sum-title"><span className="mono pk-tid">{pack.tenderId}</span>{pack.title}</h2>}
        </div>
        {actions}
      </div>
      <dl className="pk-tiles">
        <Tile k="Recommendation">
          <span className={`pk-verdict t-${tone}`}>{s.recommendation}</span>
        </Tile>
        <Tile k="Win probability">
          {s.win === null ? <span className="pk-tile-s">Not scored</span>
            : s.win === MASKED_TEXT || !win || isMasked(win) ? <Masked by={holdersOf('see.positions')} />
            : <span className="pk-tile-win"><b>{win.p}%</b><span className="pk-tile-s"> ± {win.band}</span><ThresholdBar value={win.p} band={win.band} unit="%" tone="ink" label="Win probability" /></span>}
        </Tile>
        <Tile k="Value"><Money value={pack.value} /></Tile>
        <Tile k="Margin range">
          {s.margin === null ? <span className="pk-tile-s">Waiting for Commercial</span> : s.margin === MASKED_TEXT ? <Masked by={holdersOf('see.margin')} /> : <b>{s.margin}</b>}
        </Tile>
        <Tile k="Facility after bond" sub={s.facilityAfterNote ? 'Provisional' : undefined}>
          <Money value={pack.facilityAfter} />
        </Tile>
        {mode !== 'gate' && (
          <Tile k="Committee">
            {s.positions === MASKED_TEXT ? <span className="pk-tile-s">With the committee</span> : (
              <span className="pk-tile-2"><b>{s.positions.split(' · ')[0]}</b><span className="pk-tile-s">{s.positions.split(' · ')[1]}</span></span>
            )}
          </Tile>
        )}
        {mode !== 'gate' && (
          <Tile k="DG2 clock">
            {slaStart && slaDue && !decided ? <SlaClock start={slaStart} end={slaDue} /> : <span className="pk-tile-s">{slaText}</span>}
          </Tile>
        )}
      </dl>
      {mode !== 'gate' && (
        <nav className="pk-nav" aria-label="Pack sections">
          {nav.map(({ id, f }) => (
            <a key={id} href={`#${sectionDomId(id)}`} className={`pk-navi f-${f}`} onClick={(e) => { e.preventDefault(); document.getElementById(sectionDomId(id))?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}>
              <span className="mono">{id}</span> {SHORT[id]}{f !== 'current' && <i className="pk-dot" aria-label={f === 'stale' ? ', stale' : f === 'waiting' ? ', waiting for input' : ', no input requested'} />}
            </a>
          ))}
          <span className="pk-nav-f">{fresh.stale ? 'Stale since ' + stampText(fresh.stale.since) : 'Current'}</span>
        </nav>
      )}
    </div>
  );
}

function Tile({ k, sub, children }: { k: string; sub?: string; children: ReactNode }) {
  return (
    <div className="pk-tile">
      <dt>{k}{sub && <span className="pk-tile-sub">{sub}</span>}</dt>
      <dd>{children}</dd>
    </div>
  );
}
