import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Lock, Upload } from 'lucide-react';
import type { Tone } from '@/data/types';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import {
  CREDENTIAL_STATE, EXPIRING_DAYS, KIND_LABEL, bidName, expiryWindow, renewRight, rowsText,
  type ExpiryWindow, type Vault, type VaultBid, type VaultRow,
} from '@/domain/gcc/company';
import type { RequestStatus } from '@/domain/gcc/requests';
import { dayMonth, dayMonthYear, profileOf, shortDate, shortWhen } from '@/domain/gcc/s1/common';
import type { TileVM } from '@/domain/gcc/viewmodels';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { Sheet } from '@/components/tender/Sheet';
import { EmptyState } from '@/components/tender/EmptyState';
import { When } from '@/components/tender/When';
import type { S1 } from '../s1/vm/useS1';
import { kpiCtxOf, registryTile, valueTile } from '../s1/vm/tiles';
import { Strip } from '../s1/parts/Strip';
import { S1Grid } from '../s1/parts/Grid';
import { FilterBar, optionsOf, type Facet } from '../s1/parts/FilterBar';
import { RenewalButton } from '../s1/parts/RenewalButton';
import { RenewalModal } from './RenewalModal';

/**
 * Company › Credentials (catalogue §D, archetype B): the strip (SCR-6, the
 * same tile as the dashboards, and what expires in 90 days or has expired),
 * the filter bar, the vault as a table with at-risk credentials first, and a
 * side panel per credential with the bids it affects, the renewal request and
 * the actions. The filters live in the URL, so each tile is a shortcut to them.
 */

const HERE = '/company';

const WINDOW_LABEL: Record<ExpiryWindow, string> = { expired: 'Expired', soon: `Within ${EXPIRING_DAYS} days`, later: 'Later', none: 'No expiry' };
const BIDS_LABEL: Record<string, string> = { affects: 'Affects live bids', none: 'No live bid affected' };
const FACET_KEYS = ['bids', 'window', 'owner'] as const;

/** The contributor-request vocabulary (ui-direction §7.3). */
const REQUEST: Record<RequestStatus, { label: string; tone: Tone }> = {
  open: { label: 'Requested', tone: 'cyan' }, late: { label: 'Late', tone: 'red' }, submitted: { label: 'Submitted', tone: 'green' }, accepted: { label: 'Submitted', tone: 'green' },
};

const CHECK_TEXT: Record<VaultBid['checkLabel'], string> = { opens: 'opens', 'is submitted': 'submission', 'stays valid': 'bid validity' };

const statePill = (r: VaultRow) => { const s = CREDENTIAL_STATE[r.state]; return <StatusPill label={s.label} tone={s.tone} icon={s.icon} />; };

/** "Water & sewage works, Grade 1", "Score 41%", or the holder entity. */
function detailOf(r: VaultRow): string | undefined {
  const c = r.cred;
  const parts = [c.field && c.grade !== undefined ? `${c.field}, Grade ${c.grade}` : c.field, c.score !== undefined ? `Score ${c.score}%` : undefined].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function BidLine({ b }: { b: VaultBid }) {
  const when = <span className="co-bid-when">must hold to {shortDate(b.checkDate)} ({CHECK_TEXT[b.checkLabel]})</span>;
  if (b.canOpen) {
    return (
      <li className="co-bid">
        <Link to={`/tenders/${encodeURIComponent(b.tenderId)}?tab=eligibility`}><span className="mono">{b.tenderId}</span> {b.shortTitle}</Link>
        {when}
      </li>
    );
  }
  return (
    <li className="co-bid">
      <span className="co-bid-hidden"><Lock size={11} aria-hidden /><span className={b.restricted ? '' : 'mono'}>{b.restricted ? 'A restricted-lane bid' : b.tenderId}</span> {b.restricted ? 'cleared people only' : 'not shared with you'}</span>
      {when}
    </li>
  );
}

function CredentialPanel({ s1, row, company, onUpload }: { s1: S1; row: VaultRow; company: string; onUpload(): void }) {
  const c = row.cred;
  const right = renewRight(c, s1.viewer, s1.viewAs);
  const whyId = `co-up-why-${c.id}`;
  const first = row.bids[0];
  const req = row.request;
  return (
    <div className="s1-sheet co-sheet">
      <div className="s1-sheet-top">
        <span className="s1-act">{statePill(row)}<span className="mono co-kind">{KIND_LABEL[c.kind]}</span></span>
      </div>
      <p className="co-why">{row.why}</p>

      <div className="s1-kv">
        {c.number && <KV k="Number" v={c.number} mono />}
        {detailOf(row) && <KV k="Field and grade" v={detailOf(row)} />}
        <KV k="Issuer" v={c.issuer} />
        <KV k="Held by" v={row.holder ?? company} />
        <KV k="Valid to" v={row.validTo ? <When date={row.validTo} countdown={row.validTo >= DEMO_TODAY} /> : 'No expiry date'} />
        <KV k="Owner" v={row.owner ? `${row.owner.name}, ${row.owner.title}` : 'No owner named'} />
        {c.note && <KV k="Note" v={c.note} />}
      </div>

      <h3 className="s1-h3">Live bids it must hold for</h3>
      {row.bids.length
        ? <ul className="co-bids">{row.bids.map((b) => <BidLine key={b.tenderId} b={b} />)}</ul>
        : <p className="s1-muted">No live bid needs it past {row.validTo ? dateOrYear(row.validTo) : 'any date'}.</p>}

      {(req || row.renewal) && <h3 className="s1-h3">Renewal</h3>}
      {req && (
        <p className="co-line">
          <StatusPill label={REQUEST[req.status].label} tone={REQUEST[req.status].tone} />
          <span>
            Requested by {req.by?.id === s1.viewer.id ? 'you' : req.by?.name ?? 'the Head of Tendering'}, {shortWhen(req.at)}{row.owner ? ` · asked of ${row.owner.id === s1.viewer.id ? 'you' : row.owner.name}` : ''}
            {row.renewal ? ` · submitted ${shortWhen(row.renewal.at)}` : req.due ? ` · due ${shortWhen(req.due)}` : ''}
          </span>
        </p>
      )}
      {row.renewal && (
        <p className="co-line co-renewed">
          Renewed by {row.renewal.by?.name ?? 'the owner'}, {shortWhen(row.renewal.at)}: valid to {dayMonthYear(row.renewal.validTo)}{row.renewal.from ? `, was ${dayMonthYear(row.renewal.from)}` : ''}. Recorded in the audit trail.
        </p>
      )}

      <div className="co-actions">
        {row.validTo === null ? <p className="s1-muted">No expiry date, so there is nothing to renew.</p> : (
          <span className="req-wrap">
            <button type="button" className="btn btn-sm btn-primary" onClick={onUpload} disabled={!right.ok} aria-describedby={right.ok ? undefined : whyId}>
              <Upload size={12} aria-hidden />Upload renewal
            </button>
            {!right.ok && <span className="req-why" id={whyId}>{right.reason}</span>}
          </span>
        )}
        {first && !req && row.validTo && (
          <RenewalButton s1={s1} tenderId={first.tenderId} credentialId={c.id} ownerId={c.ownerId} label={c.label} validTo={row.validTo} />
        )}
      </div>
    </div>
  );
}

/** "30 Apr" this year, "30 Apr 2027" beyond it. */
const dateOrYear = (iso: string) => (iso.slice(0, 4) === DEMO_TODAY.slice(0, 4) ? dayMonth(iso) : dayMonthYear(iso));

export function Credentials({ s1, vault }: { s1: S1; vault: Vault }) {
  const { tenant, done } = s1;
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [uploadId, setUploadId] = useState<string | null>(null);
  const company = profileOf(tenant).name;

  const values = useMemo(() => Object.fromEntries(FACET_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<string, string>, [params]);
  const setParam = useCallback((edit: (n: URLSearchParams) => void) => {
    setParams((p) => { const n = new URLSearchParams(p); edit(n); return n; }, { replace: true });
  }, [setParams]);

  const all = vault.rows;
  const needle = search.trim().toLowerCase();
  const rows = useMemo(() => all.filter((r) => {
    if (values.bids && (values.bids === 'affects') !== r.bids.length > 0) return false;
    if (values.window && expiryWindow(r.validTo) !== values.window) return false;
    if (values.owner && r.cred.ownerId !== values.owner) return false;
    if (!needle) return true;
    return [r.cred.label, r.cred.number, r.cred.issuer, KIND_LABEL[r.cred.kind], r.owner?.name, r.holder].some((x) => x?.toLowerCase().includes(needle));
  }), [all, values, needle]);

  const facets: Facet[] = [
    { key: 'bids', label: 'Live bids', options: optionsOf(all, (r) => (r.bids.length ? 'affects' : 'none'), (v) => BIDS_LABEL[v]) },
    { key: 'window', label: 'Expires', options: optionsOf(all, (r) => expiryWindow(r.validTo), (v) => WINDOW_LABEL[v as ExpiryWindow]) },
    { key: 'owner', label: 'Owner', options: optionsOf(all, (r) => r.cred.ownerId, (v) => all.find((r) => r.cred.ownerId === v)?.owner?.name ?? v) },
  ];

  // The open credential is the URL's `cred`. A filter that hides it is cleared, so a link always lands on it.
  const openId = params.get('cred');
  const index = openId ? rows.findIndex((r) => r.id === openId) : -1;
  useEffect(() => {
    if (!openId || index >= 0 || !all.some((r) => r.id === openId)) return;
    setSearch('');
    setParam((n) => FACET_KEYS.forEach((k) => n.delete(k)));
  }, [openId, index, all, setParam]);
  useEffect(() => {
    if (!openId) return;
    const id = requestAnimationFrame(() => {
      document.querySelector(`.co-grid [row-id="${CSS.escape(openId)}"]`)?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [openId]);
  const openAt = (i: number) => setParam((n) => { if (rows[i]) n.set('cred', rows[i].id); });
  const close = () => setParam((n) => n.delete('cred'));

  // The strip: SCR-6 read exactly as the dashboards read it, for the company as a whole.
  const ctx = kpiCtxOf({ tenant, viewer: vault.reader, viewAs: false, done }, '30d', 'company');
  const soon = all.filter((r) => expiryWindow(r.validTo) === 'soon');
  const expired = all.filter((r) => r.state === 'expired');
  const scr6 = registryTile('SCR-6', ctx, HERE);
  const tiles: TileVM[] = [
    ...(scr6 ? [{ ...scr6, drill: { kind: 'route' as const, to: `${HERE}?bids=affects`, label: 'Show the credentials that affect live bids' } }] : []),
    valueTile('company.expiring', `Expiring in ${EXPIRING_DAYS} days`, String(vault.counts.expiring), {
      kind: 'state', means: `Company credentials that expire in the next ${EXPIRING_DAYS} days, whether or not a live bid needs them yet.`,
      counted: `Credentials valid today whose expiry, after any renewal recorded, falls on or before ${dayMonthYear(addDays(DEMO_TODAY, EXPIRING_DAYS))}.`,
      target: 'None: renew ahead of the date', source: 'Credentials vault',
    }, ctx, {
      sub: soon.length ? rowsText(soon) : `Nothing expires in the next ${EXPIRING_DAYS} days`, tone: soon.length ? 'orange' : 'green',
      drill: { kind: 'route', to: `${HERE}?window=soon`, label: `Show what expires within ${EXPIRING_DAYS} days` },
    }),
    valueTile('company.expired', 'Expired', String(vault.counts.expired), {
      kind: 'state', means: 'Company credentials past their expiry date. A bid that needs one cannot be submitted until it is renewed.',
      counted: 'Credentials whose expiry, after any renewal recorded, is before today.', target: 'None', source: 'Credentials vault',
    }, ctx, {
      sub: expired.length ? rowsText(expired) : 'No credential has expired', tone: expired.length ? 'red' : 'green',
      drill: { kind: 'route', to: `${HERE}?window=expired`, label: 'Show the expired credentials' },
    }),
  ];

  const columns = useMemo<ColDef<VaultRow>[]>(() => [
    {
      colId: 'cred', headerName: 'Credential', flex: 1.6, minWidth: 220, valueGetter: (p) => p.data?.cred.label,
      cellRenderer: (p: ICellRendererParams<VaultRow>) => p.data && (
        <span className="s1-two">
          <span className="s1-main" title={p.data.cred.label}>{p.data.cred.label}</span>
          <span className="s1-sub">{KIND_LABEL[p.data.cred.kind]}{p.data.cred.number ? <> · <span className="mono">{p.data.cred.number}</span></> : ''}{p.data.holder ? ` · ${p.data.holder}` : ''}</span>
        </span>
      ),
    },
    {
      colId: 'issuer', headerName: 'Issuer', flex: 1, minWidth: 150, valueGetter: (p) => p.data?.cred.issuer,
      cellRenderer: (p: ICellRendererParams<VaultRow>) => p.data && <span className="co-clip" title={p.data.cred.issuer}>{p.data.cred.issuer}</span>,
    },
    {
      colId: 'validTo', headerName: 'Valid to', width: 142, valueGetter: (p) => p.data?.validTo ?? '9999',
      cellRenderer: (p: ICellRendererParams<VaultRow>) => p.data && (p.data.validTo
        ? <span className="s1-two"><When date={p.data.validTo} tone={p.data.state === 'expired' ? 'red' : undefined} />{p.data.renewal && <span className="s1-sub">Renewed in the demo</span>}</span>
        : <span className="tk-sub">No expiry</span>),
    },
    {
      colId: 'state', headerName: 'State', width: 112, valueGetter: (p) => (p.data ? CREDENTIAL_STATE[p.data.state].rank : 9),
      cellRenderer: (p: ICellRendererParams<VaultRow>) => p.data && statePill(p.data),
    },
    {
      colId: 'owner', headerName: 'Owner', width: 170, valueGetter: (p) => p.data?.owner?.name,
      cellRenderer: (p: ICellRendererParams<VaultRow>) => p.data && (p.data.owner
        ? <span className="s1-two"><span className="s1-main">{p.data.owner.name}</span><span className="s1-sub">{p.data.owner.title}</span></span>
        : <span className="tk-sub">No owner named</span>),
    },
    {
      colId: 'affects', headerName: 'Affects', width: 176, sortable: false,
      cellRenderer: (p: ICellRendererParams<VaultRow>) => {
        const b = p.data?.bids[0];
        if (!p.data || !b) return <span className="tk-sub">No live bid</span>;
        const more = p.data.bids.length - 1;
        return (
          <span className="s1-two">
            <span className={`s1-main ${b.canOpen || !b.restricted ? 'mono' : ''}`}>{bidName(b)}{more > 0 ? <span className="co-more"> +{more} more</span> : null}</span>
            <span className="s1-sub">must hold to {dayMonth(b.checkDate)}</span>
          </span>
        );
      },
    },
  ], []);

  const upload = all.find((r) => r.id === uploadId) ?? null;

  return (
    <>
      <Strip tiles={tiles} />
      <Card>
        <CardHead title="Credentials vault" />
        <p className="s1-lede">
          Each certificate is checked against the date a live bid needs it, not against today: the opening date, or the date the tender says it must hold. At-risk credentials come first.
        </p>
        <FilterBar
          facets={facets} values={values} onChange={(k, v) => setParam((n) => (v ? n.set(k, v) : n.delete(k)))}
          search={search} onSearch={setSearch} shown={rows.length} total={all.length} noun="credentials" placeholder="Search credentials"
        />
        <div className="co-grid">
          {rows.length
            ? <S1Grid rows={rows} columns={columns} onOpen={(id) => setParam((n) => n.set('cred', id))} label="Company credentials" rowHeight={52}
                rowClassRules={{ 'co-row-risk': (p) => p.data?.state === 'at-risk', 'co-row-expired': (p) => p.data?.state === 'expired' }} />
            : <EmptyState title="No credentials match these filters." body="Clear the filters to see the whole vault." compact />}
        </div>
        <p className="s1-foot">Profile edits and credential owners are set by the Head of Tendering. A renewed certificate is uploaded by its owner or the Head of Tendering, and every eligibility check re-runs at once.</p>
      </Card>

      <Sheet
        items={rows.map((r) => ({ id: r.id, title: r.cred.label }))} index={index >= 0 ? index : null} onIndex={openAt} onClose={close} eyebrow="Credential"
        // Opened from My requests, there is no control on this page to go back to: the credential's row takes focus (plan 026).
        returnFocus={(id) => document.querySelector<HTMLElement>(`.co-grid [row-id="${CSS.escape(id)}"] .ag-cell`)}
        render={(id) => { const r = rows.find((x) => x.id === id); return r ? <CredentialPanel s1={s1} row={r} company={company} onUpload={() => setUploadId(r.id)} /> : null; }}
      />
      <RenewalModal s1={s1} row={upload} onClose={() => setUploadId(null)} />
    </>
  );
}
