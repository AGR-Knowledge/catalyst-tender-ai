import { Check } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { stampText, type InputItem, type InputsVM, type PackSection, type Section910 } from '@/domain/gcc/s3';
import { StatusPill } from '@/components/tender/StatusPill';
import { ContactLinks } from '@/components/tender/ContactLinks';
import { personById } from '@/data/people';
import { contactSubject } from '@/domain/gcc/contact';
import { Empty, SectionFrame } from './Section';

/** A contributor input's status in the one vocabulary (ui-direction §7.3). */
export function InputState({ i }: { i: Pick<InputItem, 'state'> }) {
  return i.state === 'submitted' ? <StatusPill label="Submitted" tone="green" icon="✓" />
    : i.state === 'late' ? <StatusPill label="Late" tone="red" icon="!" />
    : <StatusPill label="Requested" tone="orange" icon="•" />;
}

/** The Nudge button for one outstanding input. */
export function NudgeButton({ i, check, onNudge }: { i: InputItem; check: CanResult | null; onNudge(i: InputItem): void }) {
  if (i.state === 'submitted') return null;
  if (i.nudged) return <span className="pk-done"><Check size={12} aria-hidden />Nudged</span>;
  // Null: the viewer never nudges, so no control is shown.
  if (!check) return null;
  const why = `nudge-why-${i.key}`;
  return (
    <span className="pk-acts inline">
      <button type="button" className="btn btn-sm" onClick={() => onNudge(i)} disabled={!check.ok} aria-describedby={check.ok ? undefined : why} aria-label={`Nudge ${i.ownerName} about ${i.label}`}>Nudge</button>
      {!check.ok && <span className="pk-why" id={why}>{check.reason}</span>}
    </span>
  );
}

/** 9.9 Inputs status: which contributor inputs are in, late or missing, with Nudge. */
export function InputsSection({ sec, nudgeCheck, onNudge, onOpenInputs, contacts, collapsible, open, lens }: {
  sec: PackSection<InputsVM>;
  nudgeCheck: CanResult | null;
  onNudge(i: InputItem): void;
  /** Opens the Inputs tab. */
  onOpenInputs?: () => void;
  /** At DG2: Calendar, Call and Teams beside each contributor (plan 044). */
  contacts?: boolean;
  collapsible?: boolean; open?: boolean; lens?: boolean;
}) {
  const v = sec.body;
  return (
    <SectionFrame sec={sec} collapsible={collapsible} open={open} lens={lens}>
      <p className="pk-lede">
        <b className="num">{v.totals.requested - v.totals.outstanding}</b> of <b className="num">{v.totals.requested}</b> inputs in
        {v.totals.outstanding > 0 && <>, <b className="num">{v.totals.outstanding}</b> outstanding{v.totals.late ? <> (<b className="num t-red">{v.totals.late}</b> late)</> : null}</>}.
        {onOpenInputs && <> <button type="button" className="btn-link" onClick={onOpenInputs}>Open the Inputs tab</button></>}
      </p>
      {v.items.length === 0 ? <Empty>No inputs requested for this pack yet.</Empty> : (
        <table className="pk-table">
          <caption className="sr-only">Contributor inputs for this pack</caption>
          <thead><tr><th scope="col">Input</th><th scope="col">For</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col">Due</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
          <tbody>
            {v.items.map((i) => (
              <tr key={i.key}>
                <th scope="row">{i.label}</th>
                <td className="mono">{i.feeds}</td>
                <td>{contacts
                  ? <span className="cl-cell">{i.ownerName}<ContactLinks person={personById(i.ownerId)} subject={contactSubject(v.tenderId, 'DG2', `your input (${i.label})`)} compact keepSpace /></span>
                  : i.ownerName}</td>
                <td><InputState i={i} /></td>
                <td className="num">{i.state === 'submitted' ? i.dueText : <>{stampText(i.due)} · <span className={i.state === 'late' ? 't-red' : ''}>{i.dueText}</span></>}</td>
                <td className="r"><NudgeButton i={i} check={nudgeCheck} onNudge={onNudge} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionFrame>
  );
}

/** 9.10 Freshness: when the pack was generated, why it is stale, every version kept, and what changed between them. */
export function FreshnessSection({ sec, collapsible, open, lens }: { sec: PackSection<Section910>; collapsible?: boolean; open?: boolean; lens?: boolean }) {
  const { freshness: f, compare } = sec.body;
  return (
    <SectionFrame sec={sec} chip={{ kind: 'calc', label: `Pack v${f.version}` }} collapsible={collapsible} open={open} lens={lens}>
      <p className={`pk-lede ${f.stale ? 't-orange' : ''}`}>{f.text}</p>
      {f.issueNote && <p className="pk-note">{f.issueNote}.</p>}
      <ol className="pk-versions">
        {[...f.versions].reverse().map((v) => (
          <li key={v.version} className={v.version === f.version ? 'cur' : ''}>
            <span className="mono">v{v.version}</span>
            <span>Generated {stampText(v.generatedAt)}{v.rerunById ? ' on a re-run' : ''}</span>
            <span className="pk-dim">{v.issuedAt ? `Issued to the committee ${stampText(v.issuedAt)}` : 'Not issued'}</span>
          </li>
        ))}
      </ol>
      {compare && (
        <>
          <div className="pk-h4">What changed from v{compare.from} to v{compare.to}</div>
          <table className="pk-table">
            <caption className="sr-only">Changes between pack versions, by section</caption>
            <thead><tr><th scope="col">Section</th><th scope="col">Change</th></tr></thead>
            <tbody>
              {compare.sections.map((s) => (
                <tr key={s.section} className={s.changed ? '' : 'muted'}>
                  <th scope="row"><span className="mono">{s.section}</span> {s.title}</th>
                  <td>{s.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </SectionFrame>
  );
}
