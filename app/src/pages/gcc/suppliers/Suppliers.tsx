import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ExternalLink, Lock, Search, X } from 'lucide-react';
import type { Screening } from '@/domain/gcc/s2';
import {
  LOAD_LABEL, PREQUAL_LABEL, RESCREEN_DAYS, RFQ_STATE, SCREENING_TONE, supplierMasterFor, supplierProfileFor,
  type SupplierProfileVM, type SupplierRowVM,
} from '@/domain/gcc/suppliers/profile';
import { dayMonth, dayMonthYear, plural } from '@/domain/gcc/s1/common';
import type { TileVM } from '@/domain/gcc/viewmodels';
import { Card, CardHead, KV, Meter } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { EmptyState } from '@/components/tender/EmptyState';
import { Sheet } from '@/components/tender/Sheet';
import { whenLabel } from '@/components/tender/When';
import { useTenant } from '@/domain/tenancy';
import { useS1 } from '../s1/vm/useS1';
import { kpiCtxOf, valueTile } from '../s1/vm/tiles';
import { Strip } from '../s1/parts/Strip';
import { S2Grid } from '../s2/S2Grid';
import { usePortalPreview } from '../s2/portalLink';
import '@/components/dashboard/dashboard.css';
import '../s1/s1.css';
import '../s2/s2.css';
import '../company/company.css';
import './suppliers.css';

/**
 * Suppliers (`/suppliers`, plan 027c, catalogue §D, archetype B): the supplier
 * master. The dashboard kit's tiles, a table a procurement lead filters by
 * screening, trade and country, and a side sheet per supplier with its
 * screening, approvals, performance and the RFQs it has open with the
 * company. Counts, dates and states only: never a quoted price, a rate or a
 * package value. Filters and the open supplier live in the URL.
 */

const HERE = '/suppliers';

/** The short form a tile's reference line uses when the full country name doesn't fit. */
const SHORT_COUNTRY: Record<string, string> = { 'United Arab Emirates': 'UAE' };
type ScreenFilter = '' | Screening['state'];
const FILTER_KEYS = ['screening', 'trade', 'country'] as const;
const SCREEN_CHIPS: { id: ScreenFilter; label: string }[] = [
  { id: '', label: 'All' }, { id: 'current', label: 'Screened' }, { id: 'due', label: 'Screening due' }, { id: 'blocked', label: 'Blocked' },
];

/** "18 Nov 2025" from an ISO date or time. */
const dmy = (iso: string) => dayMonthYear(iso.slice(0, 10));
/** "Thu 26 Feb, 14:25 AST": a timestamp in the tenant's zone, without the year. */
function At({ iso }: { iso: string }) {
  const t = useTenant();
  return <span className="sp-at">{whenLabel(iso.slice(0, 10), iso.length > 10 ? iso.slice(11, 16) : undefined, t.tzLabel, true)}</span>;
}

/* ------------------------------------------------------------------ cells */

function SupplierCell(p: ICellRendererParams<SupplierRowVM>) {
  if (!p.data) return null;
  return (
    <span className="s1-two">
      <span className="s1-main" title={p.data.s.name}>{p.data.s.name}</span>
      <span className="s1-sub">{p.data.s.city}, {p.data.country}</span>
    </span>
  );
}

/** Whole chips only: up to three while they fit the column's budget of characters, then "+N". */
const TRADE_CHARS = 22;
function TradesCell(p: ICellRendererParams<SupplierRowVM>) {
  if (!p.data) return null;
  const t = p.data.trades;
  // In the master's order: stop at three, or at the first chip that would pass the budget (the first always shows).
  const chips: string[] = [];
  let used = 0;
  for (const x of t) {
    if (chips.length === 3 || (chips.length > 0 && used + x.length > TRADE_CHARS)) break;
    chips.push(x);
    used += x.length;
  }
  return (
    <span className="sp-trades" title={t.join(', ')}>
      {chips.map((x) => <span key={x} className="sp-trade">{x}</span>)}
      {t.length > chips.length && <span className="sp-more">+{t.length - chips.length}</span>}
    </span>
  );
}

function AvlCell(p: ICellRendererParams<SupplierRowVM>) {
  if (!p.data) return null;
  const a = p.data.avl;
  return a.length
    ? <span className="s1-two"><span className="num">{a.length}</span><span className="s1-sub" title={a.join(', ')}>{a.join(', ')}</span></span>
    : <span className="tk-sub">None</span>;
}

function IcvCell(p: ICellRendererParams<SupplierRowVM>) {
  const v = p.data?.s.icv;
  if (v === undefined) return <span className="tk-sub">None</span>;
  return (
    <span className="sp-icv">
      <span className="num">{v}</span>
      <span className="sp-icv-bar" aria-hidden><span style={{ width: `${v}%` }} /></span>
    </span>
  );
}

/** "Screened 18 Nov 2025": the rule's label without the weekday, so the pill fits its column. */
const screeningText = (sc: Screening) => (sc.state === 'current' ? `Screened ${dmy(sc.lastChecked)}` : sc.label);

function ScreeningCell(p: ICellRendererParams<SupplierRowVM>) {
  return p.data ? <StatusPill label={screeningText(p.data.sc)} tone={SCREENING_TONE[p.data.sc.state]} /> : null;
}

function RepliesCell(p: ICellRendererParams<SupplierRowVM>) {
  if (!p.data) return null;
  const r = p.data.s.response;
  return <span className="s1-two sp-r"><span className="num">{r.ratePct}%</span><span className="s1-sub">in {plural(r.avgDays, 'day')}</span></span>;
}

function LoadCell(p: ICellRendererParams<SupplierRowVM>) {
  if (!p.data) return null;
  const l = LOAD_LABEL[p.data.s.load];
  return <StatusPill label={l.label} tone={l.tone} />;
}

// Fixed columns never shrink below their content; the two text columns share what is left. At 1440 they fit; at 1280 the grid scrolls inside.
const fixed = (width: number) => ({ width, minWidth: width, suppressSizeToFit: true });
const COLS: ColDef<SupplierRowVM>[] = [
  { colId: 'name', headerName: 'Supplier', valueGetter: (p) => p.data?.s.name, cellRenderer: SupplierCell, flex: 1.1, minWidth: 168 },
  { colId: 'trades', headerName: 'Trades', valueGetter: (p) => p.data?.trades.join(', '), cellRenderer: TradesCell, flex: 1.5, minWidth: 214, sortable: false },
  { colId: 'avl', headerName: 'Approved by', valueGetter: (p) => p.data?.avl.length ?? 0, cellRenderer: AvlCell, ...fixed(98) },
  { colId: 'icv', headerName: 'ICV', valueGetter: (p) => p.data?.s.icv ?? -1, cellRenderer: IcvCell, ...fixed(60) },
  { colId: 'screening', headerName: 'Screening', valueGetter: (p) => (p.data ? screeningText(p.data.sc) : ''), cellRenderer: ScreeningCell, ...fixed(158) },
  { colId: 'ontime', headerName: 'On time', valueGetter: (p) => p.data?.s.performance.onTimePct, valueFormatter: (p) => `${p.value}%`, type: 'rightAligned', ...fixed(70) },
  { colId: 'ncrs', headerName: 'NCRs (12 m)', valueGetter: (p) => p.data?.s.performance.ncrs12m, type: 'rightAligned', ...fixed(90) },
  { colId: 'replies', headerName: 'Replies', valueGetter: (p) => p.data?.s.response.ratePct, cellRenderer: RepliesCell, type: 'rightAligned', ...fixed(76) },
  { colId: 'load', headerName: 'Load', valueGetter: (p) => ['low', 'medium', 'high'].indexOf(p.data?.s.load ?? 'low'), cellRenderer: LoadCell, ...fixed(76) },
  { colId: 'rfqs', headerName: 'Open RFQs', valueGetter: (p) => p.data?.openRfqs ?? 0, type: 'rightAligned', ...fixed(84) },
];

/* ------------------------------------------------------------------ the sheet */

function SupplierPanel({ vm }: { vm: SupplierProfileVM }) {
  const s = vm.s;
  const preview = usePortalPreview();
  const prequal = PREQUAL_LABEL[s.prequal];
  // The portal preview opens at an RFQ still waiting for the supplier's reply, if there is one.
  const firstRfq = vm.rfqs.find((r) => r.shortTitle !== null && (r.state === 'due' || r.state === 'overdue')) ?? vm.rfqs.find((r) => r.shortTitle !== null);
  return (
    <div className="s1-sheet sp-sheet">
      <div className="s1-sheet-top">
        <span className="s1-act">
          <StatusPill label={screeningText(vm.sc)} tone={SCREENING_TONE[vm.sc.state]} />
          <StatusPill label={prequal.label} tone={prequal.tone} />
          {s.national && <StatusPill label="National product" tone="cyan" />}
        </span>
        <span className="sp-loc">{s.city}, {vm.country}</span>
      </div>

      <h3 className="s1-h3">Screening</h3>
      {vm.sc.reason && <p className={`sp-why ${vm.sc.state === 'blocked' ? 't-red' : 't-orange'}`}>{vm.sc.reason}.</p>}
      <ul className="sp-checks">
        {vm.checks.map((c) => (
          <li key={c.key}>
            <span className="sp-check-l">{c.label}</span>
            <StatusPill label={c.state} tone={c.tone} />
            <span className="sp-check-d">checked {dmy(c.checkedAt)}</span>
          </li>
        ))}
      </ul>
      <p className={`sp-next ${vm.rescreenPassed ? 't-orange' : ''}`}>
        Next re-screen due <b>{dmy(vm.nextRescreen)}</b>{vm.rescreenPassed ? ': it has passed, so no RFQ can be sent until it is re-screened' : ''}. Every {RESCREEN_DAYS} days.
      </p>
      {vm.held.length ? (
        <>
          <p className="sp-sub-h">Held on approved shortlists</p>
          <ul className="co-bids">
            {vm.held.map((h) => (
              <li key={`${h.tenderId}:${h.pkgId}`} className="co-bid">
                {h.shortTitle !== null
                  ? <Link to={`/tenders/${encodeURIComponent(h.tenderId)}?tab=sourcing`}><span className="mono">{h.tenderId}</span> {h.shortTitle} · <span className="mono">{h.pkgId}</span></Link>
                  : <span className="co-bid-hidden"><Lock size={11} aria-hidden /><span className="mono">{h.tenderId}</span> not shared with you</span>}
                <span className="co-bid-when">{h.reason}</span>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="s1-muted">Not held on any approved shortlist.</p>}

      <h3 className="s1-h3">Approvals</h3>
      <div className="s1-kv">
        <KV k="On the approved lists of" v={s.avl.length ? s.avl.join('; ') : 'No client’s list includes it'} />
        <KV k="ICV score" v={s.icv !== undefined ? <><span className="num">{s.icv}</span> <span className="tk-sub">In-country value score, 0–100</span></> : 'No score held'} />
        <KV k="Prequalification" v={prequal.label} />
      </div>

      <h3 className="s1-h3">Performance, 12 months</h3>
      <div className="sp-meters">
        <Meter label="Delivered on time" value={<span className="num">{s.performance.onTimePct}%</span>} pct={s.performance.onTimePct} />
        <Meter label="RFQs replied to" value={<span className="num">{s.response.ratePct}%</span>} pct={s.response.ratePct} />
      </div>
      <div className="s1-kv">
        <KV k="Non-conformance reports" v={<span className="num">{s.performance.ncrs12m}</span>} />
        <KV k="Quotes and awards" v={`${plural(s.performance.quotes12m, 'quote')}, ${s.performance.awards12m} awarded`} />
        <KV k="Average reply" v={plural(s.response.avgDays, 'day')} />
        <KV k="Current load" v={LOAD_LABEL[s.load].label} />
      </div>

      <h3 className="s1-h3">Open with us</h3>
      {vm.rfqs.length ? (
        <ul className="sp-rfqs">
          {vm.rfqs.map((r) => (
            <li key={r.id}>
              <span className="sp-rfq-t">
                {r.shortTitle !== null
                  ? <Link to={`/tenders/${encodeURIComponent(r.tenderId)}?tab=sourcing`}><span className="mono">{r.tenderId}</span> {r.shortTitle}</Link>
                  : <span className="co-bid-hidden"><Lock size={11} aria-hidden /><span className="mono">{r.tenderId}</span> not shared with you</span>}
                <span className="sp-rfq-p"><span className="mono">{r.packageId}</span> {r.packageTitle}</span>
              </span>
              <span className="sp-rfq-d"><span>Sent <At iso={r.sentAt} /></span><span>Reply by <At iso={r.replyBy} /></span></span>
              <StatusPill label={RFQ_STATE[r.state].label} tone={RFQ_STATE[r.state].tone} />
            </li>
          ))}
        </ul>
      ) : <p className="s1-muted">No open RFQs with you.</p>}

      <h3 className="s1-h3">Contact</h3>
      {vm.contact ? (
        <>
          <p className="s1-muted">{vm.contact.name} answers {s.name}’s RFQs in the Supplier Portal.</p>
          {firstRfq ? (
            <div className="co-actions">
              <span className="req-wrap">
                <button type="button" className="btn btn-sm" disabled={!!preview.blocked} aria-describedby={preview.blocked ? 'sp-portal-why' : undefined}
                  onClick={() => preview.open(firstRfq.id, vm.contact!.id)}>
                  <ExternalLink size={12} aria-hidden />Open the Supplier Portal preview
                </button>
                {preview.blocked && <span className="req-why" id="sp-portal-why">{preview.blocked}</span>}
              </span>
              <span className="tk-sub">Demo control: switches to {vm.contact.name.split(' ')[0]} and opens <span className="mono">{firstRfq.packageId}</span> of {firstRfq.tenderId}.</span>
            </div>
          ) : <p className="s1-note">The portal preview opens at an RFQ, and none is open with this supplier.</p>}
        </>
      ) : <p className="s1-muted">No Supplier Portal contact on file.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ the page */

export default function Suppliers() {
  const s1 = useS1();
  const { tenant, viewer, viewAs, done } = s1;
  const id = useId();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState('');
  const vm = useMemo(() => supplierMasterFor(tenant, done), [tenant, done]);
  const all = vm.rows;

  const values = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof FILTER_KEYS)[number], string>, [params]);
  const setParam = useCallback((edit: (n: URLSearchParams) => void) => {
    setParams((p) => { const n = new URLSearchParams(p); edit(n); return n; }, { replace: true });
  }, [setParams]);
  const setFilter = (k: (typeof FILTER_KEYS)[number], v: string) => setParam((n) => (v ? n.set(k, v) : n.delete(k)));
  const clearAll = () => { setText(''); setParam((n) => FILTER_KEYS.forEach((k) => n.delete(k))); };

  // Each facet counts the rows the other filters leave, so its numbers always match the count line.
  const needle = text.trim().toLowerCase();
  const match = useCallback((r: SupplierRowVM, skip?: (typeof FILTER_KEYS)[number]) =>
    (skip === 'screening' || !values.screening || r.sc.state === values.screening)
    && (skip === 'trade' || !values.trade || (r.s.trades as string[]).includes(values.trade))
    && (skip === 'country' || !values.country || r.s.country === values.country)
    && (!needle || [r.s.name, r.s.city, r.country, ...r.trades, ...r.s.avl].some((x) => x.toLowerCase().includes(needle))), [values, needle]);
  const rows = useMemo(() => all.filter((r) => match(r)), [all, match]);

  const count = (skip: (typeof FILTER_KEYS)[number], test: (r: SupplierRowVM) => boolean) => all.filter((r) => match(r, skip) && test(r)).length;
  const tradeNames = new Map<string, string>();
  all.forEach((r) => r.s.trades.forEach((t, i) => tradeNames.set(t, r.trades[i])));
  const tradeOptions = [...tradeNames].map(([value, label]) => ({ value, label, n: count('trade', (r) => (r.s.trades as string[]).includes(value)) }))
    .filter((o) => o.n > 0 || o.value === values.trade).sort((a, b) => a.label.localeCompare(b.label));
  const countryOptions = [...new Map(all.map((r) => [r.s.country, r.country]))].map(([value, label]) => ({ value, label, n: count('country', (r) => r.s.country === value) }))
    .filter((o) => o.n > 0 || o.value === values.country).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  const active = !!needle || FILTER_KEYS.some((k) => values[k]);

  // The open supplier is the URL's `supplier`. A filter that hides it is cleared, so a link always lands on it.
  const openId = params.get('supplier');
  const index = openId ? rows.findIndex((r) => r.id === openId) : -1;
  useEffect(() => {
    if (!openId || index >= 0 || !all.some((r) => r.id === openId)) return;
    setText('');
    setParam((n) => FILTER_KEYS.forEach((k) => n.delete(k)));
  }, [openId, index, all, setParam]);
  const open = (sid: string | null) => setParam((n) => (sid ? n.set('supplier', sid) : n.delete('supplier')));

  // Tiles: the same facts as the master, each a shortcut to its screening filter.
  const ctx = kpiCtxOf({ tenant, viewer, viewAs, done }, '30d', 'suppliers');
  const c = vm.counts;
  const held = vm.held;
  const shortlists = [...new Set(held.rows.map((h) => `${h.tenderId} ${h.pkgId}`))];
  const heldTenders = [...new Set(held.rows.map((h) => h.tenderId))];
  const drill = (to: ScreenFilter, label: string) => ({ kind: 'route' as const, to: to ? `${HERE}?screening=${to}` : HERE, label });
  // A reference value is at most 20 characters (dashboards.md §3): "United Arab Emirates, 20" reads "UAE, 20".
  const largest = vm.largestCountry && `${vm.largestCountry.name}, ${vm.largestCountry.n}`.length > 20
    ? `${SHORT_COUNTRY[vm.largestCountry.name] ?? vm.largestCountry.name}, ${vm.largestCountry.n}` : vm.largestCountry && `${vm.largestCountry.name}, ${vm.largestCountry.n}`;
  const tiles: TileVM[] = [
    valueTile('suppliers.total', 'Suppliers', String(c.total), {
      kind: 'state', means: 'Suppliers and subcontractors in your supplier master, whatever their screening.', counted: 'Every supplier record for the company.', target: 'None (information)', source: 'Supplier master',
    }, ctx, {
      sub: `In your supplier master: ${plural(c.countries, 'country', 'countries')}, ${plural(c.trades, 'trade')}${vm.largestCountry ? ` · largest ${vm.largestCountry.name}, ${vm.largestCountry.n}` : ''}`,
      detail: `${plural(c.countries, 'country', 'countries')} · ${plural(c.trades, 'trade')}`,
      ref: { k: 'Largest', v: largest || 'None' },
      drill: drill('', 'Show every supplier'),
    }),
    valueTile('suppliers.current', 'Screened, current', String(c.current), {
      kind: 'state', means: `Suppliers whose sanctions and anti-bribery screening is clear and less than ${RESCREEN_DAYS} days old. Only they can be sent an RFQ.`,
      counted: `Both checks clear, the older one checked within ${RESCREEN_DAYS} days of today.`, target: 'Every supplier you send RFQs to', source: 'Supplier screening',
    }, ctx, {
      sub: `Re-screened every ${RESCREEN_DAYS} days`, detail: `${Math.round((c.current / Math.max(1, c.total)) * 100)}% of the master`,
      ref: { k: 'Cap', v: `Re-screen ${RESCREEN_DAYS} days` }, tone: 'green',
      drill: drill('current', 'Show the suppliers screened and current'),
    }),
    valueTile('suppliers.due', 'Screening due', String(c.due), {
      kind: 'state', means: `Suppliers whose screening is older than ${RESCREEN_DAYS} days or marked due. They cannot be sent an RFQ until re-screened.`,
      counted: `A check marked due, or checked more than ${RESCREEN_DAYS} days ago.`, target: 'None', source: 'Supplier screening',
    }, ctx, {
      sub: c.due ? `Re-screen before sending an RFQ${vm.oldestDue ? ` · oldest due since ${dmy(vm.oldestDue)}` : ''}` : 'Every screening is current',
      detail: c.due ? 'Re-screen before any RFQ' : 'Every screening current',
      ref: { k: 'Oldest', v: vm.oldestDue ? dayMonth(vm.oldestDue) : 'None' },
      tone: c.due ? 'orange' : 'green', ...(c.due ? { status: 'Watch' } : {}),
      drill: drill('due', 'Show the suppliers whose screening is due'),
    }),
    valueTile('suppliers.blocked', 'Blocked', String(c.blocked), {
      kind: 'state', means: 'Suppliers with a sanctions match or an anti-bribery flag. They can never be put on an approved shortlist.', counted: 'A sanctions match or an anti-bribery flag on the latest check.', target: 'None on a shortlist', source: 'Supplier screening',
    }, ctx, {
      sub: c.blocked ? `Sanctions match or anti-bribery flag: ${vm.blocked.sanctions} sanctions, ${vm.blocked.antiBribery} anti-bribery` : 'No sanctions match or anti-bribery flag',
      detail: c.blocked ? `${vm.blocked.sanctions} sanctions · ${vm.blocked.antiBribery} anti-bribery` : 'No match or flag',
      ref: { k: 'Latest', v: vm.blocked.latest ? dayMonthYear(vm.blocked.latest) : 'None' },
      tone: c.blocked ? 'red' : 'green', ...(c.blocked ? { status: 'Excluded' } : {}),
      drill: drill('blocked', 'Show the blocked suppliers'),
    }),
    valueTile('suppliers.held', 'Held by screening', String(held.count), {
      kind: 'state', means: 'Places on approved shortlists that cannot be sent an RFQ because the supplier’s screening is not current. The guardrail holds them until they are re-screened.',
      counted: 'Suppliers on approved shortlists of live tenders, not yet sent an RFQ, whose screening is due or blocked.', target: 'None', source: 'Shortlists × supplier screening',
    }, ctx, {
      sub: held.count ? `On approved shortlists: ${shortlists.join(', ')}` : 'No shortlisted supplier is held',
      detail: held.count ? `${plural(held.suppliers, 'supplier')}${held.blocked ? `, ${held.blocked} blocked` : ', screening due'}` : 'No shortlist held',
      ref: { k: 'Shortlists', v: held.count ? `${shortlists.length} on ${plural(heldTenders.length, 'tender')}` : 'None' },
      tone: held.blocked ? 'red' : held.count ? 'orange' : 'green', ...(held.count ? { status: 'Held' } : {}),
      drill: drill('due', 'Show the suppliers whose screening is due'),
    }),
  ];

  const selected = index >= 0 ? rows[index] : null;
  const profile = useMemo(() => (selected ? supplierProfileFor(tenant, selected, done, viewer, held.rows) : null), [selected, tenant, done, viewer, held.rows]);

  return (
    <div className="view s1 sp">
      <Strip tiles={tiles} />
      <Card>
        <CardHead title="Supplier master" meta={<span className="tk-sub">Select a supplier for its sheet</span>} />
        <p className="s1-lede">Screening, approvals and performance for every supplier. Nothing is sent to a supplier whose screening is not current.</p>
        <div className="sp-chips" role="group" aria-label="Screening filter">
          {SCREEN_CHIPS.map((chip) => {
            const n = count('screening', (r) => !chip.id || r.sc.state === chip.id);
            const on = values.screening === chip.id;
            return (
              <button key={chip.id || 'all'} type="button" className={`co-chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setFilter('screening', chip.id)}>
                {chip.label} <span className="num">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="s1-filters" role="search" aria-label="Filter suppliers">
          <label className="s1-search">
            <Search size={13} aria-hidden />
            <span className="sr-only">Search suppliers</span>
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, city, trade or client" />
          </label>
          <label className={`s1-facet ${values.trade ? 'on' : ''}`} htmlFor={`${id}-trade`}>
            <span className="s1-facet-l">Trade</span>
            <select id={`${id}-trade`} value={values.trade} onChange={(e) => setFilter('trade', e.target.value)}>
              <option value="">All</option>
              {tradeOptions.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.n})</option>)}
            </select>
          </label>
          <label className={`s1-facet ${values.country ? 'on' : ''}`} htmlFor={`${id}-country`}>
            <span className="s1-facet-l">Country</span>
            <select id={`${id}-country`} value={values.country} onChange={(e) => setFilter('country', e.target.value)}>
              <option value="">All</option>
              {countryOptions.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.n})</option>)}
            </select>
          </label>
          <span className="s1-count num" aria-live="polite">{rows.length} of {all.length}</span>
          {active && <button type="button" className="btn btn-sm" onClick={clearAll}><X size={12} aria-hidden />Clear</button>}
        </div>
        <div className="sp-grid">
          {rows.length
            ? <S2Grid rows={rows} columns={COLS} selectedId={selected?.id ?? null} onSelect={open} label="Supplier master" height={520} />
            : <EmptyState title="No supplier matches." body="Clear the search or a filter." compact />}
        </div>
        <p className="s1-foot">Suppliers are added, screened and re-screened by the Procurement Lead. The Outreach &amp; Evaluation agent reads this master when it recommends a shortlist.</p>
      </Card>

      <Sheet
        items={rows.map((r) => ({ id: r.id, title: r.s.name }))} index={index >= 0 ? index : null}
        onIndex={(i) => { if (rows[i]) open(rows[i].id); }} onClose={() => open(null)} eyebrow="Supplier"
        returnFocus={(sid) => document.querySelector<HTMLElement>(`.sp-grid [row-id="${CSS.escape(sid)}"] .ag-cell`)}
        render={(sid) => (profile && profile.id === sid ? <SupplierPanel vm={profile} /> : null)}
      />
    </div>
  );
}
