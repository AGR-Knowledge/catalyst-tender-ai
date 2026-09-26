import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { PLATFORM_OPERATOR, personById, roleLine } from '@/data/people';
import { useDemo, type AuditEvent } from '@/state/store';
import { useCan } from '@/domain/permissions';
import { approverLine, breakGlassRevoke, isBreakGlassEvent, openBreakGlass, stampText } from '@/domain/platform/breakglass';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { AuditEntry } from '@/components/tender/AuditEntry';
import { Callout } from '@/components/tender/Callout';
import { DemoTag } from '@/components/tender/DemoTag';
import { EmptyState } from '@/components/tender/EmptyState';
import { StatusPill } from '@/components/tender/StatusPill';

/**
 * Administration › Audit log (plan 011 Phase 3, catalogue GOV-1, GOV-6): every
 * audit entry of this tenant in the demo, newest first, with who, what, the
 * target and the detail; a filter by kind; Catalyst's break-glass entries
 * tagged "Catalyst". An open request sits above the log with Revoke. Plan 010
 * builds the rest of Administration.
 */

type Kind = 'catalyst' | 'gate' | 'request' | 'viewas' | 'demo' | 'other';

const KINDS: { key: Kind; label: string }[] = [
  { key: 'catalyst', label: 'Catalyst access' },
  { key: 'gate', label: 'Gate decisions' },
  { key: 'request', label: 'Requests' },
  { key: 'viewas', label: 'View as' },
  { key: 'demo', label: 'Demo controls' },
  { key: 'other', label: 'Other' },
];

const isKind = (v: string | null): v is Kind => KINDS.some((k) => k.key === v);

function kindOf(e: AuditEvent): Kind {
  if (isBreakGlassEvent(e)) return 'catalyst';
  if (e.action.includes('(demo control)')) return 'demo';
  if (e.action.startsWith('View as')) return 'viewas';
  if (/\bDG[123]\b/.test(e.action)) return 'gate';
  if (/request|reminder|nudge|input/i.test(e.action)) return 'request';
  return 'other';
}

const TENDER_ID = /^T-\d{4}-\d{3}$/;

function Target({ id }: { id?: string }) {
  if (!id) return null;
  if (TENDER_ID.test(id)) return <Link className="mono" to={`/tenders/${encodeURIComponent(id)}`}>{id}</Link>;
  const p = personById(id);
  return <span>{p ? `${p.name}, ${roleLine(p)}` : id}</span>;
}

function Chip({ kind }: { kind: Kind }) {
  if (kind === 'catalyst') {
    return (
      <span className="status-pill tone-orange" title="An entry about Catalyst’s access to your data">
        <KeyRound size={11} aria-hidden style={{ marginRight: 4 }} />Catalyst
      </span>
    );
  }
  if (kind === 'demo') return <DemoTag title="A presenter control, logged so the trail is complete" />;
  if (kind === 'viewas') return <StatusPill label="View as" tone="grey" />;
  if (kind === 'gate') return <StatusPill label="Gate" tone="ink" />;
  return null;
}

export default function AuditLog() {
  const { state, auditTo, toast } = useDemo();
  const check = useCan();
  const [params, setParams] = useSearchParams();
  const want = params.get('kind');
  const kind: Kind | 'all' = isKind(want) ? want : 'all';

  const sees = { margin: check('see.margin').ok, positions: check('see.positions').ok, quotes: check('see.quotes').ok };
  const entries = useMemo(() => [...state.audit].reverse().map((e) => ({ e, kind: kindOf(e) })), [state.audit]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(KINDS.map((k) => [k.key, 0])) as Record<Kind, number>;
    entries.forEach((x) => { c[x.kind]++; });
    return c;
  }, [entries]);
  const shown = kind === 'all' ? entries : entries.filter((x) => x.kind === kind);

  const open = openBreakGlass(state.done);
  const revoke = check('admin.users');
  const doRevoke = (n: number) => {
    const w = breakGlassRevoke(state.done, n, state.person.id);
    if (!w) return;
    auditTo(state.tenant, w.event, w.set);
    toast('Catalyst’s access request is revoked. Their console shows it, with your name', 'green');
  };

  const pick = (k: Kind | 'all') => {
    const next = new URLSearchParams(params);
    if (k === 'all') next.delete('kind'); else next.set('kind', k);
    setParams(next, { replace: true });
  };

  return (
    <div className="view">
      {open.map((r) => (
        <div key={r.n} style={{ marginBottom: 'var(--gap)' }}>
          <Callout
            variant="route" word="Catalyst" title="Catalyst requested access to your company’s data"
            action={(
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <button type="button" className="btn btn-sm btn-danger" disabled={!revoke.ok} onClick={() => doRevoke(r.n)} aria-describedby={revoke.ok ? undefined : `bg-why-${r.n}`}>
                  Revoke access
                </button>
                {!revoke.ok && <span id={`bg-why-${r.n}`} style={{ fontSize: 11.5, color: 'var(--ink-5)' }}>{state.viewAs ? revoke.reason : 'Only the Head of Tendering can revoke Catalyst’s access'}</span>}
              </span>
            )}
          >
            Break-glass, read only, for up to {r.hours} h. Reason: “{r.reason}”. Second approver: {approverLine(r.approverId)}.
            Requested {stampText(r.at)}. Every screen Catalyst views is written to this log, and you can revoke the access at any time.
          </Callout>
        </div>
      ))}

      <Card>
        <CardHead title="Audit log" meta={<span className="num">{shown.length} {shown.length === 1 ? 'entry' : 'entries'}</span>} />
        <div style={{ padding: '2px 22px 10px' }}>
          <div className="seg" role="radiogroup" aria-label="Show entries of kind" style={{ flexWrap: 'wrap' }}>
            <button type="button" role="radio" aria-checked={kind === 'all'} className={kind === 'all' ? 'on' : ''} onClick={() => pick('all')}>
              All <span className="num t-muted">{entries.length}</span>
            </button>
            {KINDS.filter((k) => counts[k.key] > 0 || kind === k.key).map((k) => (
              <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} className={kind === k.key ? 'on' : ''} onClick={() => pick(k.key)}>
                {k.key === 'catalyst' && <KeyRound aria-hidden />}{k.label} <span className="num t-muted">{counts[k.key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 22px 8px' }}>
          {shown.length === 0 ? (
            <EmptyState
              title={kind === 'all' ? 'Nothing recorded yet.' : 'No entries of this kind yet.'}
              body="Persona switches, View as, gate decisions, requests and any Catalyst access appear here as they happen."
              compact
            />
          ) : shown.map(({ e, kind: k }) => {
            // A persona switch to or from the operator is the presenter's demo control, not Catalyst acting in the tenant.
            const presenter = k === 'demo' && e.actorId === PLATFORM_OPERATOR.id;
            const who = presenter ? undefined : personById(e.actorId);
            const masked = !!e.detail && !!e.sensitive && !sees[e.sensitive];
            const detail = masked ? `Details masked for your role (${e.sensitive === 'positions' ? 'committee positions' : e.sensitive})` : e.detail;
            return (
              <div key={e.id} style={{ borderTop: '1px solid var(--line-2)' }}>
                <AuditEntry
                  actor={{ name: presenter ? 'Presenter (demo control)' : who?.name ?? e.actorId, role: who ? roleLine(who) : null }} at={e.at} action={e.action} chip={<Chip kind={k} />}
                  tone={k === 'catalyst' ? 'orange' : undefined}
                  detail={(e.target || detail) ? <>{e.target && <span style={{ marginRight: 8 }}><Target id={e.target} /></span>}{detail}</> : undefined}
                />
              </div>
            );
          })}
        </div>
        <CardFoot>Entries from this demo session, newest first, on the demo clock. Each tender’s seeded history is on its Decisions & audit tab. Reset demo clears this log.</CardFoot>
      </Card>
    </div>
  );
}
