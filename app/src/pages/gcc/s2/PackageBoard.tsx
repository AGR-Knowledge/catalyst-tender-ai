import { useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { BellRing, ExternalLink, Sparkles } from 'lucide-react';
import { countdownText } from '@/domain/calendar';
import {
  BOARD_LABEL, K, approvedShortlist, packageBoard, readDone, packagesFor, reminderPlan, reserveSuppliers, rfqStatus, rfqWrite, rfqsFor, shortlistWrite,
  supplierMatrix, supplierOf, tenantOf, type BoardColumn, type MatrixRow, type RfqStatus,
} from '@/domain/gcc/s2';
import { Card } from '@/components/ui/primitives';
import { DemoTag } from '@/components/tender/DemoTag';
import { EmptyState } from '@/components/tender/EmptyState';
import { StatusPill } from '@/components/tender/StatusPill';
import { When, whenLabel } from '@/components/tender/When';
import { S2Grid } from './S2Grid';
import { pendingReplies, scriptedCount } from './simulate';
import { usePortalPreview } from './portalLink';
import { PanelHead, Tag, Why, byLine, refusal } from './ui';
import { nudgeWrite, type DeskCtx } from './vm/desk';
import { REMINDER_DAYS_BEFORE } from '@/data/gcc/s2';

/**
 * Tracking (spec §8.5): the package board (Issued → Acknowledged → Quoted →
 * Levelled → Buyer approved), the per-supplier response matrix with its
 * status vocabulary (ui-direction §7.3), the reminder plan, the buyer's nudge
 * and reserve suppliers for non-responders. "Demo: suppliers reply now" is the
 * one demo aid: nobody replies to a demo.
 */

const COLUMNS: BoardColumn[] = ['not-issued', 'issued', 'acknowledged', 'quoted', 'levelled', 'approved'];

const short = (iso?: string) => (iso ? whenLabel(iso.slice(0, 10), iso.slice(11, 16), undefined, true) : '');

interface Row extends MatrixRow { id: string; pkgTitle: string }

function StatusCell(p: ICellRendererParams<Row, RfqStatus>) {
  return p.value ? <StatusPill label={p.value.text} tone={p.value.tone} /> : null;
}

const COLS: ColDef<Row>[] = [
  { field: 'supplierName', headerName: 'Supplier', minWidth: 190, flex: 2 },
  { field: 'packageId', headerName: 'Package', width: 100, cellClass: 'mono' },
  { headerName: 'Sent', colId: 'sent', valueGetter: (p) => short(p.data?.sentAt), width: 130 },
  { headerName: 'Opened', colId: 'opened', valueGetter: (p) => short(p.data?.openedAt) || 'Not yet', width: 130 },
  { headerName: 'Quoted', colId: 'quoted', valueGetter: (p) => short(p.data?.quotedAt) || (p.data?.declined ? 'Declined' : 'Not yet'), width: 130 },
  { headerName: 'Clarification', colId: 'clar', valueGetter: (p) => (p.data?.clarificationOpen ? 'Open' : 'None'), width: 120 },
  { field: 'status', headerName: 'Status', minWidth: 230, flex: 2, cellRenderer: StatusCell, cellDataType: false, valueFormatter: (p) => (p.value as RfqStatus | undefined)?.text ?? '', comparator: (a: RfqStatus, b: RfqStatus) => a.text.localeCompare(b.text) },
];

/** Worst first: escalated, overdue, waiting, then answered. */
const urgency = (r: MatrixRow) => (r.escalated ? 0 : r.overdue ? 1 : r.quotedAt || r.declined ? 3 : 2);

export function TrackingPanel({ desk }: { desk: DeskCtx }) {
  const { tenant, tenderId, done } = desk;
  const board = useMemo(() => packageBoard(tenant, tenderId, done), [tenant, tenderId, done]);
  const pkgs = useMemo(() => packagesFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const rows = useMemo<Row[]>(() => supplierMatrix(tenant, tenderId, done)
    .map((r) => ({ ...r, id: r.rfqId, pkgTitle: pkgs.find((p) => p.pkg.id === r.packageId)?.pkg.title ?? r.packageId }))
    .sort((a, b) => urgency(a) - urgency(b) || a.packageId.localeCompare(b.packageId) || a.supplierName.localeCompare(b.supplierName)), [tenant, tenderId, done, pkgs]);
  const pending = useMemo(() => pendingReplies(tenant, tenderId, done), [tenant, tenderId, done]);
  const scripted = scriptedCount(tenant, tenderId, pkgs.map((p) => p.pkg.id));
  const [sel, setSel] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === sel) ?? null;

  const rfqs = rfqsFor(tenant, tenderId, done);
  const agentReminders = rfqs.reduce((n, r) => n + reminderPlan(tenant, r).filter((e) => e.kind === 'reminder' && e.state === 'sent').length, 0);
  const nudges = rfqs.reduce((n, r) => n + r.nudges, 0);

  // A labelled demo control, for the person who sends RFQs (the replies answer theirs).
  const simBlock = refusal(desk, 'rfq.send')
    ?? (!rfqs.length ? 'Send RFQs first: the replies answer them.'
    : !scripted ? 'This tender has no scripted replies.'
    : !pending.length ? 'Every scripted reply has arrived.' : null);
  const simulate = () => {
    const declines = pending.filter((p) => p.reply.declines).length;
    const quotes = pending.length - declines;
    desk.applyAll(pending.map((p) => p.write),
      `Simulated: ${quotes} ${quotes === 1 ? 'quote' : 'quotes'}${declines ? ` and ${declines} ${declines === 1 ? 'decline' : 'declines'}` : ''} arrived through the Supplier Portal. Quotes are in the levelling queue`);
  };

  return (
    <div className="s2-stack">
      <Card>
        <PanelHead title="Package board" sub={`Agent reminders sent: ${agentReminders} · nudges by hand: ${nudges}. Reminders go ${REMINDER_DAYS_BEFORE} days before the reply date, then daily.`}>
          <span className="s2-sim">
            <DemoTag title="Demo control: nobody replies to a demo, so the scripted replies are submitted now" />
            <button type="button" className="btn btn-sm" disabled={!!simBlock} onClick={simulate}>
              <Sparkles size={12} aria-hidden /> Demo: suppliers reply now{pending.length ? ` (${pending.length})` : ''}
            </button>
          </span>
        </PanelHead>
        {simBlock && <div className="s2-pad-x s2-right"><Why reason={simBlock} /></div>}
        <div className="s2-board" role="list" aria-label="Packages by RFQ progress">
          {COLUMNS.map((c) => {
            const items = board.filter((b) => b.column === c);
            return (
              <section key={c} className={`s2-col c-${c}`} role="listitem" aria-label={`${BOARD_LABEL[c]}: ${items.length}`}>
                <h4>{BOARD_LABEL[c]} <span className="num">{items.length}</span></h4>
                <ul>
                  {items.map((b) => (
                    <li key={b.pkgId} className="s2-card">
                      <span className="mono s2-pid">{b.pkgId}</span> <span className="s2-card-t">{b.title}</span>
                      <span className="s2-card-m">
                        {b.rfqs ? `${b.rfqs} RFQs · ${b.quotes} ${b.quotes === 1 ? 'quote' : 'quotes'}${b.declined ? ` · ${b.declined} declined` : ''}` : 'No RFQ sent'}
                      </span>
                      {b.longLeadWeeks && <Tag tone="orange">Long lead {b.longLeadWeeks} weeks</Tag>}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Card>

      <Card>
        <PanelHead title="Supplier responses" sub={`${rows.length} RFQs. Select a row for its reminders, a nudge or reserve suppliers.`} />
        {rows.length === 0
          ? <EmptyState title="No RFQs sent on this tender yet." body="The matrix fills in as RFQs go out." compact />
          : <S2Grid rows={rows} columns={COLS} selectedId={sel} onSelect={setSel} label="Supplier response matrix" height={Math.min(420, 44 + rows.length * 40)} />}
      </Card>

      {selected && <RfqDetail key={selected.id} desk={desk} row={selected} />}
    </div>
  );
}

function RfqDetail({ desk, row }: { desk: DeskCtx; row: Row }) {
  const { tenant, tenderId, done } = desk;
  const t = tenantOf(tenant);
  const rfq = rfqsFor(tenant, tenderId, done).find((r) => r.id === row.id)!;
  const plan = reminderPlan(tenant, rfq);
  const status = rfqStatus(tenant, rfq);
  const noSend = refusal(desk, 'rfq.send');
  const nudged = readDone<{ at: string; byId: string }>(done, K.nudged(rfq.id));
  const nudgeBlock = noSend ?? (rfq.repliedAt ? 'The supplier has replied.' : nudged ? 'Nudged once already on this RFQ.' : null);
  const reserves = row.overdue ? reserveSuppliers(tenant, tenderId, rfq.packageId, done).slice(0, 3) : [];
  const contact = supplierOf(tenant, rfq.supplierId)?.contactPersonId;
  const preview = usePortalPreview();

  const sendReserve = (id: string, from: 'shortlist' | 'master') => {
    const writes = [];
    let d = done;
    if (from === 'master') {
      const list = approvedShortlist(tenant, tenderId, rfq.packageId, done);
      const w = shortlistWrite(tenant, tenderId, rfq.packageId, [...(list?.supplierIds ?? []), id],
        [...(list?.overrides ?? []), { supplierId: id, action: 'add', reason: `Reserve for ${row.supplierName}, no reply by the reply date` }], desk.viewer.id, done, desk.nextAt());
      writes.push(w);
      if ('key' in w) d = { ...done, [w.key]: w.value };
    }
    writes.push(rfqWrite(tenant, tenderId, rfq.packageId, [id], desk.viewer.id, d, desk.nextAt(writes.length)));
    desk.applyAll(writes, `RFQ for ${rfq.packageId} sent to the reserve, ${supplierOf(tenant, id)?.name ?? id}`);
  };

  return (
    <Card>
      <PanelHead title={<>{row.supplierName} · <span className="mono s2-pid">{row.packageId}</span> {row.pkgTitle}</>} sub={<StatusPill label={status.text} tone={status.tone} />}>
        {contact && (
          <button type="button" className="btn btn-sm" disabled={!!preview.blocked} title={preview.blocked ?? undefined} onClick={() => preview.open(rfq.id, contact)}>
            <ExternalLink size={12} aria-hidden /> Open as supplier (preview)
          </button>
        )}
      </PanelHead>
      <div className="s2-two s2-pad">
        <div>
          <h4 className="s2-h4">RFQ</h4>
          <ul className="s2-list">
            <li>Sent <When date={rfq.sentAt.slice(0, 10)} time={rfq.sentAt.slice(11, 16)} short /></li>
            <li>Reply by <When date={rfq.replyBy.slice(0, 10)} time={rfq.replyBy.slice(11, 16)} tz={t.tzLabel} short />
              {rfq.replyBy > desk.now && <span className="s2-muted"> · {countdownText(desk.now.slice(0, 10), rfq.replyBy.slice(0, 10), t.cc)}</span>}
            </li>
            {rfq.extendedFrom && <li className="s2-muted">Extended from {short(rfq.extendedFrom)}: {rfq.extensionReason}</li>}
            <li>{rfq.openedAt ? <>Opened {short(rfq.openedAt)}</> : 'Not opened yet'}</li>
            {rfq.declined && <li>Declined {short(rfq.declined.at)}: {rfq.declined.reason}</li>}
            {rfq.quoteId && rfq.repliedAt && <li>Quote received {short(rfq.repliedAt)}</li>}
            <li>Nudges by hand: {rfq.nudges}{nudged?.byId && nudged.at ? ` (latest by ${byLine(nudged.byId, nudged.at)})` : ''}</li>
          </ul>
          <div className="s2-actbar s2-actbar-l">
            <button type="button" className="btn btn-sm" disabled={!!nudgeBlock} onClick={() => desk.apply(nudgeWrite(tenant, rfq, desk.viewer.id, done, desk.nextAt()), `${row.supplierName} nudged. Counted on the RFQ and recorded in the audit trail`)}>
              <BellRing size={12} aria-hidden /> Nudge {row.supplierName}
            </button>
            <Why reason={nudgeBlock} />
          </div>
        </div>
        <div>
          <h4 className="s2-h4">Reminders and escalation</h4>
          <ol className="s2-plan">
            {plan.map((e) => (
              <li key={`${e.kind}${e.at}`} className={`p-${e.state.replace(' ', '-')}`}>
                <span className="s2-plan-w">{short(e.at)} · {e.state === 'sent' ? (e.kind === 'escalation' ? 'Escalated' : 'Sent') : e.state === 'planned' ? 'Planned' : 'Not needed'}</span>
                <span className="s2-plan-t">{e.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {reserves.length > 0 && (
        <div className="s2-pad">
          <h4 className="s2-h4">Reserve suppliers</h4>
          <ul className="s2-reserves">
            {reserves.map((r) => (
              <li key={r.supplierId}>
                <b>{r.name}</b> <span className="s2-muted">{r.from === 'shortlist' ? 'On the shortlist, not yet sent' : 'From the supplier master'} · {r.reason}</span>
                <button type="button" className="btn btn-sm" disabled={!!noSend} onClick={() => sendReserve(r.supplierId, r.from)}>Send the RFQ</button>
              </li>
            ))}
          </ul>
          <Why reason={noSend} />
        </div>
      )}
    </Card>
  );
}
