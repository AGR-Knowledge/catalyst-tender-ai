import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquare } from 'lucide-react';
import { can } from '@/data/access';
import { belongsTo, personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { useTenant, useTenantKey } from '@/domain/tenancy';
import { money } from '@/domain/money';
import { dateText } from '@/domain/calendar';
import { supplierQuoteWrite, supplierRfqs, supplierView, type SupplierQuoteInput } from '@/domain/gcc/s2';
import { Toasts } from '@/components/overlays/Toasts';
import { DemoTag } from '@/components/tender/DemoTag';
import { EmptyState } from '@/components/tender/EmptyState';
import { QuoteForm } from './QuoteForm';
import './portal.css';

/**
 * The Supplier Portal preview (spec §8.10, catalogue §C.7, ui-direction §5 H):
 * a single-column, phone-first page in the inviting company's branding, with
 * its own light shell. It shows one supplier's RFQs: the package scope, only
 * its BOQ lines, the terms asked, the reply date and the documents. It never
 * shows other suppliers, other quotes, estimates or the tender's value
 * (`supplierView` carries none of them). "Back to {company}" is the
 * presenter's way out: a demo control.
 */

export default function SupplierPortal() {
  const { state, mark, logAudit, toast, setPerson, nextAt } = useDemo();
  const tenant = useTenant();
  const key = useTenantKey();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const person = state.person;
  // Seeing the portal is list-level (a View as may look); replying is the supplier's own write.
  const allowed = can(person, 'portal.rfq').ok;
  const rows = useMemo(() => (allowed ? supplierRfqs(key, person.id, state.done) : []), [allowed, key, person.id, state.done]);
  const wanted = params.get('rfq');
  const rfqId = rows.find((r) => r.rfqId === wanted)?.rfqId ?? rows.find((r) => r.status.startsWith('Reply'))?.rfqId ?? rows[0]?.rfqId ?? null;
  const view = useMemo(() => (rfqId ? supplierView(key, person.id, rfqId, state.done) : null), [key, person.id, rfqId, state.done]);
  const contact = personById(`${key}.supplier`);

  const backId = params.get('back');
  const backTo = personById(backId) && belongsTo(personById(backId)!, key) ? backId! : `${key}.proc`;
  const back = () => {
    const p = personById(backTo);
    setPerson(backTo);
    if (p) toast(`Back in ${tenant.name} as ${p.name}, ${p.title.replace(/\.$/, '')}. Demo control`, 'ink3');
    navigate(params.get('from') ?? '/sourcing');
  };

  const submit = (input: SupplierQuoteInput, what: 'quote' | 'decline') => {
    if (!view) return;
    const r = can(person, 'portal.rfq', { ownerId: person.id, viewAs: !!state.viewAs });
    if (!r.ok) { toast(r.reason ?? 'You cannot reply to this RFQ', 'red'); return; }
    const w = supplierQuoteWrite(view.rfqId, input, person.id, nextAt());
    logAudit(w.audit);
    mark(w.key, what === 'quote'
      ? `Quote sent to ${tenant.name}: ${money(input.amount, input.ccy)}. Answers to any questions come back here`
      : `You declined the RFQ. ${tenant.name} has your reason`, 'green', w.value);
  };

  return (
    <div className="sp">
      <header className="sp-top">
        <span className="sp-mark" aria-hidden>{tenant.monogram}</span>
        <div className="sp-who">
          <b>{tenant.name}</b>
          <span>Supplier Portal <span className="sp-pre">preview</span></span>
        </div>
        <span className="sp-grow" />
        <span className="sp-back">
          <DemoTag title="Demo control: back to the buyer's side of the demo" />
          <button type="button" className="btn btn-sm" onClick={back}><ArrowLeft size={13} aria-hidden /> Back to {tenant.name}</button>
        </span>
      </header>

      <main className="sp-main" id="main">
        {!allowed ? (
          <section className="sp-card">
            <EmptyState
              title="The Supplier Portal opens as a supplier."
              body={`Open it from an RFQ with "Open as supplier (preview)", or pick the supplier in the persona menu.`}
              action={contact && (
                <span className="sp-demo">
                  <DemoTag />
                  <button type="button" className="btn btn-sm" onClick={() => setPerson(contact.id)}>Open as {contact.name}, {contact.title.replace('Supplier, ', '')}</button>
                </span>
              )}
            />
          </section>
        ) : (
          <>
            <p className="sp-signed">Signed in as <b>{person.name}</b>, {person.title.replace('Supplier, ', '').replace(/\.$/, '')}. You see only the RFQs {tenant.name} sent you.</p>

            {rows.length > 1 && (
              <nav className="sp-list" aria-label="Your RFQs">
                {rows.map((r) => (
                  <button key={r.rfqId} type="button" className={`sp-rfq ${r.rfqId === rfqId ? 'on' : ''}`} aria-current={r.rfqId === rfqId} onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.set('rfq', r.rfqId); return n; }, { replace: true })}>
                    <span className="sp-rfq-t">{r.packageTitle}</span>
                    <span className="sp-rfq-m">{r.project}</span>
                    <span className="sp-rfq-s">{r.status}</span>
                  </button>
                ))}
              </nav>
            )}

            {!view ? (
              <section className="sp-card"><EmptyState title={`No RFQs from ${tenant.name} right now.`} body="An RFQ appears here once a buyer sends you one." /></section>
            ) : (
              <>
                <section className="sp-card sp-head">
                  <span className="sp-eyebrow">Request for quotation · {view.package.id}</span>
                  <h1>{view.package.title}</h1>
                  <p className="sp-proj">{view.project.title}</p>
                  <p className="sp-muted">Employer: {view.project.employer} · invited by {view.invitedBy.name}</p>
                  <div className="sp-due">
                    <span className="sp-label">Reply by</span>
                    <b>{view.replyBy.text}</b>
                    <span className="sp-muted">{view.replyBy.countdown}</span>
                  </div>
                  {!view.status.startsWith('Reply by') && <p className="sp-status">{view.status}</p>}
                </section>

                <section className="sp-card">
                  <h2>Scope</h2>
                  <p>{view.package.scope}</p>
                </section>

                <section className="sp-card">
                  <h2>Your BOQ lines</h2>
                  <p className="sp-muted">Only the lines of this package. Price them in your quote document.</p>
                  <ul className="sp-lines">
                    {view.lines.map((l) => (
                      <li key={l.item}>
                        <span className="sp-line-i">{l.item}</span>
                        <span className="sp-line-d">{l.description}</span>
                        <span className="sp-line-q">{l.qty.toLocaleString('en-GB')} {l.unit}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="sp-card">
                  <h2>Terms asked</h2>
                  <dl className="sp-terms">
                    <dt>Currency</dt><dd>{view.terms.currency}</dd>
                    <dt>Price basis</dt><dd>{view.terms.priceBasis}</dd>
                    <dt>Delivery</dt><dd>{view.terms.delivery}</dd>
                    <dt>Validity</dt><dd>{view.terms.validity}</dd>
                    <dt>Payment</dt><dd>{view.terms.paymentTerms}</dd>
                    <dt>Lead time</dt><dd>{view.terms.leadTime}</dd>
                    <dt>Schedule</dt><dd>{view.terms.schedule}</dd>
                  </dl>
                </section>

                <section className="sp-card">
                  <h2>Documents</h2>
                  <ul className="sp-docs">
                    {view.documents.map((d) => <li key={d.title}><FileText size={14} aria-hidden /> <span>{d.title}</span> <span className="sp-muted">{d.ref}</span></li>)}
                  </ul>
                </section>

                <section className="sp-card">
                  <h2>Your reply</h2>
                  {view.quoteForm.submitted ? (
                    <p className="sp-sent">
                      Quote sent {dateText(view.quoteForm.submitted.at.slice(0, 10))}, {view.quoteForm.submitted.at.slice(11, 16)}: {money(view.quoteForm.submitted.amount, view.quoteForm.submitted.ccy, { full: true })}, {view.quoteForm.submitted.fileName}. The preview does not change a sent quote.
                    </p>
                  ) : view.status.startsWith('Declined') ? (
                    <p className="sp-sent">{view.status}. {tenant.name} has your reason.</p>
                  ) : (
                    <QuoteForm key={view.rfqId} view={view} disabled={state.viewAs ? `Viewing as ${person.name}. Read only` : null} onSubmit={submit} />
                  )}
                </section>

                <section className="sp-card">
                  <h2><MessageSquare size={15} aria-hidden /> Questions</h2>
                  <p className="sp-muted">{view.clarification.channel}</p>
                  {view.clarification.mine.length === 0 && <p className="sp-muted">No questions on this RFQ yet.</p>}
                  <ul className="sp-qa">
                    {view.clarification.mine.map((c) => (
                      <li key={c.raisedAt + c.question}><p><b>You asked</b> {c.question}</p>{c.answer ? <p><b>Answer</b> {c.answer}</p> : <p className="sp-muted">Waiting for an answer.</p>}</li>
                    ))}
                  </ul>
                  <label className="sp-field">
                    <span>Ask a question</span>
                    <textarea rows={2} disabled placeholder="Your question about this RFQ" />
                    <small>Asking a new question is not part of this preview yet; the answers above come back the same way.</small>
                  </label>
                </section>
              </>
            )}
          </>
        )}
      </main>
      <footer className="sp-foot">Prototype: indicative UI, illustrative data. The Supplier Portal preview shows what a supplier sees; nothing here is sent to a real supplier.</footer>
      <Toasts />
    </div>
  );
}
