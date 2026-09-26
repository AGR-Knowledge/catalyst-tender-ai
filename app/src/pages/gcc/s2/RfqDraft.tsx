import { useMemo, useState } from 'react';
import { Check, ExternalLink, Send } from 'lucide-react';
import { countdownText } from '@/domain/calendar';
import {
  approvedShortlist, packagesFor, replyByFor, rfqDraft, rfqsFor, rfqWrite, screeningOf, supplierOf, tenantOf, type Done,
} from '@/domain/gcc/s2';
import { Card, KV } from '@/components/ui/primitives';
import { When } from '@/components/tender/When';
import { PageChips, PanelHead, Tag, Why, refusal } from './ui';
import { GUARDRAIL } from './Shortlists';
import { usePortalPreview } from './portalLink';
import type { DeskCtx } from './vm/desk';
import { ESCALATION_TIME, REMINDER_DAYS_BEFORE } from '@/data/gcc/s2';

/**
 * The RFQ pack per package (spec §8.4): the scope extract, only the BOQ lines
 * matched to the package (never a rate), drawings, technical requirements, the
 * commercial terms asked, the quote level, the reply date and the clarification
 * channel. Sending is guarded: only approved, screened shortlist members.
 */

export const LINES_RULE = 'Each supplier receives only the BOQ lines it was matched to, not the whole bill. No rates are sent.';

/** Who on a package's approved shortlist can be sent the RFQ now. */
function recipients(desk: DeskCtx, pkgId: string, done: Done) {
  const { tenant, tenderId } = desk;
  const list = approvedShortlist(tenant, tenderId, pkgId, done);
  const rfqs = rfqsFor(tenant, tenderId, done).filter((r) => r.packageId === pkgId);
  return (list?.supplierIds ?? []).map((id) => {
    const s = supplierOf(tenant, id);
    const sc = s ? screeningOf(s) : null;
    const rfq = rfqs.find((r) => r.supplierId === id);
    return { id, name: s?.name ?? id, rfq, sendable: !!sc?.sendable && !rfq, why: rfq ? null : sc?.reason ?? null, contact: s?.contactPersonId };
  });
}

export function RfqsPanel({ desk, onAllSent }: { desk: DeskCtx; onAllSent?: () => void }) {
  const { tenant, tenderId, done } = desk;
  const pkgs = packagesFor(tenant, tenderId, done);
  const rows = pkgs.map(({ pkg }) => {
    const rs = recipients(desk, pkg.id, done);
    const list = approvedShortlist(tenant, tenderId, pkg.id, done);
    const sent = rs.filter((r) => r.rfq).length;
    const ready = rs.filter((r) => r.sendable).length;
    return { pkg, list, sent, ready };
  });
  const firstReady = rows.find((r) => r.ready > 0)?.pkg.id ?? rows[0]?.pkg.id ?? null;
  const [sel, setSel] = useState<string | null>(firstReady);
  const current = rows.find((r) => r.pkg.id === sel) ?? rows[0];
  const noSend = refusal(desk, 'rfq.send');
  const ready = rows.filter((r) => r.ready > 0);

  const sendAll = () => {
    const writes = ready.map((r) => rfqWrite(tenant, tenderId, r.pkg.id, recipients(desk, r.pkg.id, done).filter((x) => x.sendable).map((x) => x.id), desk.viewer.id, done));
    const n = ready.reduce((s, r) => s + r.ready, 0);
    if (desk.applyAll(writes, `RFQs sent for ${ready.length} packages, to ${n} suppliers. Each received only its package's BOQ lines`)) onAllSent?.();
  };

  if (!current) return null;
  return (
    <div className="s2-md">
      <Card className="s2-md-nav">
        <PanelHead title="RFQs by package" sub={`${rows.filter((r) => r.sent > 0).length} of ${rows.length} packages issued`} />
        {ready.length > 1 && (
          <div className="s2-pad-x">
            <button type="button" className="btn btn-sm" disabled={!!noSend} onClick={sendAll}><Send size={12} aria-hidden /> Send all {ready.length} ready RFQs</button>
            <Why reason={noSend} />
          </div>
        )}
        <ul className="s2-nav" role="list">
          {rows.map((r) => (
            <li key={r.pkg.id}>
              <button type="button" className={`s2-nav-i ${r.pkg.id === current.pkg.id ? 'on' : ''}`} aria-current={r.pkg.id === current.pkg.id} onClick={() => setSel(r.pkg.id)}>
                <span className="mono s2-pid">{r.pkg.id}</span>
                <span className="s2-nav-t">{r.pkg.title}</span>
                {r.sent > 0 && r.ready === 0 ? <Tag tone="green"><Check size={11} aria-hidden /> Sent {r.sent}</Tag>
                  : r.ready > 0 ? <Tag tone="orange">Ready {r.ready}</Tag>
                  : !r.list ? <Tag tone="ink">Shortlist first</Tag> : <Tag tone="red">None sendable</Tag>}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <RfqDraftView key={current.pkg.id} desk={desk} pkgId={current.pkg.id} onSent={() => {
        const n = rows.find((r) => r.ready > 0 && r.pkg.id !== current.pkg.id);
        if (n) setSel(n.pkg.id); else onAllSent?.();
      }} />
    </div>
  );
}

export function RfqDraftView({ desk, pkgId, onSent }: { desk: DeskCtx; pkgId: string; onSent?(): void }) {
  const { tenant, tenderId, done } = desk;
  const draft = useMemo(() => rfqDraft(tenant, tenderId, pkgId, done), [tenant, tenderId, pkgId, done]);
  const rs = recipients(desk, pkgId, done);
  const [off, setOff] = useState<string[]>([]);
  const preview = usePortalPreview();
  const noSend = refusal(desk, 'rfq.send');
  const t = tenantOf(tenant);
  if (!draft) return null;
  const to = rs.filter((r) => r.sendable && !off.includes(r.id));
  const list = approvedShortlist(tenant, tenderId, pkgId, done);
  const reply = to.length ? replyByFor(tenant, desk.now) : draft.replyBy;
  const block = noSend ?? (!list ? `Approve the ${pkgId} shortlist first.` : !to.length ? (rs.some((r) => r.rfq) ? 'Every sendable supplier on the shortlist has this RFQ.' : 'No supplier on the shortlist can be sent an RFQ.') : null);

  const send = () => {
    const ok = desk.apply(
      rfqWrite(tenant, tenderId, pkgId, to.map((r) => r.id), desk.viewer.id, done),
      `RFQ for ${pkgId} sent to ${to.length} ${to.length === 1 ? 'supplier' : 'suppliers'}. Reply by ${draft.replyByText}`,
    );
    if (ok) { setOff([]); onSent?.(); }
  };
  const portal = rs.find((r) => r.rfq && r.contact);

  return (
    <Card className="s2-md-main">
      <PanelHead
        title={<>RFQ: <span className="mono s2-pid">{draft.packageId}</span> {draft.title}</>}
        sub="Drafted by the Outreach & Evaluation agent from the tender documents. Nothing is sent until you send it."
      >
        {portal && (
          <button type="button" className="btn btn-sm" disabled={!!preview.blocked} title={preview.blocked ?? undefined} onClick={() => preview.open(portal.rfq!.id, portal.contact!)}>
            <ExternalLink size={12} aria-hidden /> Open as supplier (preview)
          </button>
        )}
      </PanelHead>

      <div className="s2-rfq">
        <section aria-label="Recipients" className="s2-rfq-to">
          <h4>Send to</h4>
          {!list && <p className="s2-muted">Approve the shortlist for {pkgId} first.</p>}
          <ul>
            {rs.map((r) => (
              <li key={r.id} className={r.sendable ? '' : 'greyed'}>
                <label>
                  <input type="checkbox" checked={r.sendable && !off.includes(r.id)} disabled={!r.sendable || !!noSend}
                    onChange={(e) => setOff(e.target.checked ? off.filter((x) => x !== r.id) : [...off, r.id])} />
                  <b>{r.name}</b>
                </label>
                {r.rfq ? <span className="s2-muted">Sent <When date={r.rfq.sentAt.slice(0, 10)} time={r.rfq.sentAt.slice(11, 16)} short /></span>
                  : r.why ? <span className="s2-sl-block">{r.why}</span> : null}
              </li>
            ))}
          </ul>
          <p className="s2-rule">{GUARDRAIL}</p>
        </section>

        <section aria-label="Scope">
          <h4>Scope</h4>
          <p>{draft.scope}</p>
        </section>

        <section aria-label="BOQ lines">
          <h4>BOQ lines ({draft.lineCount} lines in this package)</h4>
          <div className="s2-tablewrap">
            <table className="s2-table">
              <thead><tr><th scope="col">Item</th><th scope="col">Description</th><th scope="col">Unit</th><th scope="col" className="r">Quantity</th></tr></thead>
              <tbody>
                {draft.lines.map((l) => (
                  <tr key={l.item}><td className="mono">{l.item}</td><td>{l.description}</td><td>{l.unit}</td><td className="r num">{l.qty.toLocaleString('en-GB')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="s2-rule">{LINES_RULE}</p>
        </section>

        <div className="s2-two">
          <section aria-label="Drawings and requirements">
            <h4>Drawings</h4>
            <p>{draft.drawings.text} <PageChips text={draft.drawings.text} doc={desk.doc} /></p>
            <p className="mono s2-muted">{draft.drawings.sheets.join(' · ')}</p>
            <h4>Technical requirements</h4>
            <ul className="s2-list">
              {draft.technical.map((x) => <li key={x}>{x} <PageChips text={x} doc={desk.doc} /></li>)}
            </ul>
          </section>
          <section aria-label="Commercial terms">
            <h4>Commercial terms asked</h4>
            <div className="s2-kv">
              <KV k="Currency" v={draft.terms.currency} />
              <KV k="Price basis" v={draft.terms.priceBasis} />
              <KV k="Delivery" v={draft.terms.delivery} />
              <KV k="Validity" v={draft.terms.validity} />
              <KV k="Payment" v={draft.terms.paymentTerms} stack />
              <KV k="Lead time" v={draft.terms.leadTime} stack />
              <KV k="Schedule" v={draft.terms.schedule} stack />
              <KV k="Quote level" v={draft.quoteLevel === 'line' ? 'Price each line' : 'One price for the package'} />
            </div>
          </section>
        </div>

        <div className="s2-two">
          <section aria-label="Reply and clarifications">
            <h4>Reply by</h4>
            <p><When date={reply.slice(0, 10)} time={reply.slice(11, 16)} tz={t.tzLabel} /> <span className="s2-muted">· {countdownText(desk.now.slice(0, 10), reply.slice(0, 10), t.cc)}</span></p>
            <p className="s2-muted">Reminders go {REMINDER_DAYS_BEFORE} days before the reply date, then daily. With no reply at the reply time the RFQ is overdue; still unanswered at {ESCALATION_TIME} on the next working day, it is escalated to the Procurement Lead with reserve suppliers.</p>
            <h4>Clarifications</h4>
            <p>{draft.clarifications}</p>
          </section>
          <section aria-label="Documents">
            <h4>Documents attached</h4>
            <ul className="s2-list">
              {draft.documents.map((d) => <li key={d.title}>{d.title} <span className="mono s2-muted">{d.ref}</span></li>)}
            </ul>
            {draft.internalNote && <p className="s2-note">Buyer note, not sent: {draft.internalNote}</p>}
          </section>
        </div>
      </div>

      <div className="s2-actbar">
        <span className="s2-grow" />
        <Why reason={block} />
        <button type="button" className="btn btn-primary" disabled={!!block} onClick={send}><Send size={13} aria-hidden /> Send RFQ to {to.length} {to.length === 1 ? 'supplier' : 'suppliers'}</button>
      </div>
    </Card>
  );
}
